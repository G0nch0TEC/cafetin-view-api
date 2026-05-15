// ══════════════════════════════════════════════════════
//  auth.js — Sistema de autenticación por QR
//  Maneja: generar QR, polling, sesión en localStorage
// ══════════════════════════════════════════════════════

const API_BASE      = 'https://cafetin-view-api-production.up.railway.app/index.php';
const SESION_KEY    = 'cafetin_sesion';
const POLL_INTERVAL = 2000;   // ms entre cada verificación
const TOKEN_TTL     = 300;    // segundos (debe coincidir con PHP)

let tokenActual  = null;
let pollingTimer = null;
let timerBar     = null;
let timerSegundo = TOKEN_TTL;

// ── DOM ───────────────────────────────────────────────

const canvas           = document.getElementById('qr-canvas');
const overlaysCargando = document.getElementById('overlay-cargando');
const overlayExpirado  = document.getElementById('overlay-expirado');
const overlayConfirm   = document.getElementById('overlay-confirmado');
const barEl            = document.getElementById('timer-bar');
const btnRenovar       = document.getElementById('btn-renovar');

btnRenovar.addEventListener('click', iniciar);


// ── Sesión ────────────────────────────────────────────

/**
 * Guarda la sesión en localStorage.
 * @param {string} sesion   - clave de sesión
 * @param {number} expires  - timestamp Unix (segundos)
 */
function guardarSesion(sesion, expires) {
    localStorage.setItem(SESION_KEY, JSON.stringify({
        sesion,
        expiresAt: expires * 1000  // convertir a ms
    }));
}

/**
 * Verifica si hay sesión activa.
 * Llamada desde init.js en cada página del dashboard.
 */
function sesionActiva() {
    const raw = localStorage.getItem(SESION_KEY);
    if (!raw) return false;
    try {
        const { expiresAt } = JSON.parse(raw);
        return Date.now() < expiresAt;
    } catch {
        return false;
    }
}

/**
 * Cierra la sesión (botón de salir en el dashboard).
 */
function cerrarSesion() {
    localStorage.removeItem(SESION_KEY);
    window.location.href = '/Public/login.html';
}

// Exponer para init.js y sidebar
window.sesionActiva  = sesionActiva;
window.cerrarSesion  = cerrarSesion;


// ── QR ────────────────────────────────────────────────

function mostrarOverlay(nombre) {
    ['overlay-cargando', 'overlay-expirado', 'overlay-confirmado'].forEach(id => {
        document.getElementById(id).classList.add('oculto');
    });
    if (nombre) document.getElementById(nombre).classList.remove('oculto');
}

function dibujarQR(token) {
    const SIZE = 172;

    // Limpiar canvas anterior
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Contenedor temporal fuera de pantalla
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:172px;height:172px;';
    document.body.appendChild(tmp);

    new QRCode(tmp, {
        text:         token,
        width:        SIZE,
        height:       SIZE,
        colorDark:    '#1a1a2e',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.L,
    });

    // Intentar obtener el canvas/img generado, con reintentos
    let intentos = 0;
    function intentarDibujar() {
        const qrCanvas = tmp.querySelector('canvas');
        const qrImg    = tmp.querySelector('img');

        if (qrCanvas) {
            // QRCode generó un canvas — copiar directo
            ctx.drawImage(qrCanvas, 0, 0, SIZE, SIZE);
            mostrarOverlay(null);
            document.body.removeChild(tmp);
            return;
        }

        if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
            ctx.drawImage(qrImg, 0, 0, SIZE, SIZE);
            mostrarOverlay(null);
            document.body.removeChild(tmp);
            return;
        }

        if (qrImg && !qrImg.complete) {
            qrImg.onload = () => {
                ctx.drawImage(qrImg, 0, 0, SIZE, SIZE);
                mostrarOverlay(null);
                document.body.removeChild(tmp);
            };
            return;
        }

        // Reintentar hasta 20 veces (1 segundo total)
        if (++intentos < 20) {
            setTimeout(intentarDibujar, 50);
        } else {
            mostrarOverlay('overlay-expirado');
            document.body.removeChild(tmp);
        }
    }

    setTimeout(intentarDibujar, 50);
}

// ── Timer bar ─────────────────────────────────────────

function iniciarTimerBar() {
    timerSegundo = TOKEN_TTL;
    barEl.style.width = '100%';

    clearInterval(timerBar);
    timerBar = setInterval(() => {
        timerSegundo--;
        const pct = (timerSegundo / TOKEN_TTL) * 100;
        barEl.style.width = Math.max(pct, 0) + '%';
        if (timerSegundo <= 0) clearInterval(timerBar);
    }, 1000);
}


// ── Polling ───────────────────────────────────────────

function detenerPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

function iniciarPolling(token) {
    detenerPolling();
    pollingTimer = setInterval(async () => {
        try {
            const res  = await fetch(`${API_BASE}?_route=auth/verificar&token=${token}`);
            const data = await res.json();

            if (data.status === 'confirmado') {
                detenerPolling();
                clearInterval(timerBar);
                mostrarOverlay('overlay-confirmado');

                guardarSesion(data.sesion, data.sesion_expires);

                // Redirigir al dashboard tras 1 segundo
                setTimeout(() => {
                    window.location.href = '/Public/index.html';
                }, 1000);

            } else if (data.status === 'expirado' || data.status === 'invalido') {
                detenerPolling();
                clearInterval(timerBar);
                mostrarOverlay('overlay-expirado');
            }
            // Si es "pendiente" simplemente seguimos esperando

        } catch (err) {
            console.warn('[auth] Error en polling:', err.message);
        }
    }, POLL_INTERVAL);
}


// ── Flujo principal ───────────────────────────────────

async function iniciar() {
    mostrarOverlay('overlay-cargando');
    detenerPolling();
    tokenActual = null;

    try {
        const res  = await fetch(`${API_BASE}?_route=auth/generar`);
        const data = await res.json();

        if (!data.token) throw new Error('No se recibió token');

        tokenActual = data.token;
        dibujarQR(tokenActual);
        iniciarTimerBar();
        iniciarPolling(tokenActual);

        // Auto-expirar en el cliente también
        setTimeout(() => {
            if (tokenActual === data.token) {
                detenerPolling();
                mostrarOverlay('overlay-expirado');
            }
        }, TOKEN_TTL * 1000);

    } catch (err) {
        mostrarOverlay('overlay-expirado');
        console.error('[auth] Error generando token:', err.message);
    }
}

// Arrancar al cargar la página — esperar que QRCode.js esté listo
function arrancar() {
    if (typeof QRCode !== 'undefined') {
        iniciar();
    } else {
        setTimeout(arrancar, 50);
    }
}
arrancar();