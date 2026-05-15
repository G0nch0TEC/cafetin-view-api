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

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(tmp); // ← necesario para que QRCode.js renderice

    new QRCode(tmp, {
        text:         token,
        width:        SIZE,
        height:       SIZE,
        colorDark:    '#1a1a2e',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.L,
    });

    // QRCode.js 1.0.0 es síncrono, pero usa un requestAnimationFrame
    // para insertar la imagen — un solo frame es suficiente
    requestAnimationFrame(() => {
        const img = tmp.querySelector('img') || tmp.querySelector('canvas');

        if (!img) {
            mostrarOverlay('overlay-expirado');
            document.body.removeChild(tmp);
            return;
        }

        const dibujar = (src) => {
            const image = new Image();
            image.onload = () => {
                ctx.drawImage(image, 0, 0, SIZE, SIZE);
                mostrarOverlay(null); // quitar overlay de carga
                document.body.removeChild(tmp); // limpiar
            };
            image.src = src;
        };

        if (img.tagName === 'CANVAS') {
            dibujar(img.toDataURL());
        } else {
            img.complete ? dibujar(img.src) : (img.onload = () => dibujar(img.src));
        }
    });
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

// Arrancar al cargar la página
iniciar();
