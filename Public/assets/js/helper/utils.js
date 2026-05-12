// ══════════════════════════════════════════════════════
//  UTILS — Funciones reutilizables
//  Public/assets/js/components/utils.js
//
//  Consolida helpers duplicados de todas las páginas:
//    · formatearFechaLarga (redefinida en main.js)
//    · mostrarError        (4 versiones distintas)
//    · mostrarMensajeVacio (catalogo.js + personas.js)
//    · renderDonut         (detalle.js + historial.js)
//    · calcularRangoSemana (main.js + catalogo.js)
//    · pluralizar          (inline en detalle + historial)
// ══════════════════════════════════════════════════════


// ── Montos ────────────────────────────────────────────

/**
 * Convierte centavos a texto legible.
 * formatearMonto(150)  → "S/ 1.50"
 */
function formatearMonto(centavos) {
    return 'S/ ' + (centavos / 100).toFixed(2);
}

/**
 * Calcula el saldo neto de un array de movimientos.
 * FIADO suma, PAGO resta. Devuelve centavos.
 * Positivo = debe, Negativo = a favor.
 */
function calcularSaldo(movimientos) {
    return movimientos.reduce((acc, m) => {
        return m.tipo === 'FIADO' ? acc + m.monto : acc - m.monto;
    }, 0);
}


// ── Fechas ────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/**
 * Convierte timestamp en ms a fecha corta.
 * formatearFecha(1746316440000)  → "03 may 2026"
 */
function formatearFecha(timestampMs) {
    const d = new Date(timestampMs);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = MESES[d.getMonth()];
    const anio = d.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

/**
 * Convierte timestamp en ms a fecha con hora.
 * formatearFechaHora(1746316440000)  → "03 may 2026, 12:14"
 */
function formatearFechaHora(timestampMs) {
    const d = new Date(timestampMs);
    const hora = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${formatearFecha(timestampMs)}, ${hora}:${min}`;
}

/**
 * Solo la hora de un timestamp.
 * formatearHora(1746316440000)  → "12:14"
 */
function formatearHora(timestampMs) {
    const d = new Date(timestampMs);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/**
 * Convierte un timestamp ms al formato YYYY-MM-DD
 * que espera el input[type="date"].
 */
function timestampAFechaInput(timestampMs) {
    const d = new Date(timestampMs);
    const anio = d.getFullYear();
    const mes  = String(d.getMonth() + 1).padStart(2, '0');
    const dia  = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * Convierte "2026-05-03" (del input date) al inicio
 * y fin del día como timestamps en ms.
 */
function fechaInputARango(fechaStr) {
    const inicio = new Date(fechaStr + 'T00:00:00').getTime();
    const fin    = new Date(fechaStr + 'T23:59:59').getTime();
    return { inicio, fin };
}

/**
 * Nombre largo de un timestamp para títulos.
 * formatearFechaLarga(1746316440000) → "Sábado, 3 de mayo 2026"
 *
 * NOTA: estaba redefinida en main.js — esa copia fue eliminada.
 */
function formatearFechaLarga(timestampMs) {
    const d = new Date(timestampMs);
    return d.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Fecha larga desde string YYYY-MM-DD.
 * fechaInputALarga("2026-05-03") → "Sábado, 3 de mayo 2026"
 */
function fechaInputALarga(fechaStr) {
    return formatearFechaLarga(new Date(fechaStr + 'T12:00:00').getTime());
}


// ── Semanas ───────────────────────────────────────────

/**
 * Devuelve { inicioActual, inicioAnterior } como timestamps ms.
 * Usado en main.js (insights) y catalogo.js (ventas por producto).
 * Antes cada archivo calculaba su propio lunes de semana.
 */
function calcularRangoSemanas() {
    const ahora = new Date();
    const dow   = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1; // lunes = 0

    const inicioActual = new Date(ahora);
    inicioActual.setDate(ahora.getDate() - dow);
    inicioActual.setHours(0, 0, 0, 0);

    const inicioAnterior = new Date(inicioActual);
    inicioAnterior.setDate(inicioActual.getDate() - 7);

    return {
        inicioActual:   inicioActual.getTime(),
        inicioAnterior: inicioAnterior.getTime()
    };
}

/**
 * Construye un array de N días hacia atrás desde hoy,
 * cada uno con { fecha, label, cobrado, fiado, movs }.
 * Usado en main.js para el gráfico de 7 días y sparklines.
 */
function calcularDatosDias(movimientos, n = 7) {
    const dias = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const siguiente = new Date(d);
        siguiente.setDate(d.getDate() + 1);

        const movsDia = movimientos.filter(m => m.fecha >= d.getTime() && m.fecha < siguiente.getTime());
        dias.push({
            fecha:   d,
            label:   d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
            cobrado: movsDia.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0),
            fiado:   movsDia.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0),
            movs:    movsDia.length
        });
    }
    return dias;
}


// ── Navegación ────────────────────────────────────────

/**
 * Lee un parámetro de la URL actual.
 * obtenerParamUrl('id')    → "5"
 * obtenerParamUrl('fecha') → null
 */
function obtenerParamUrl(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}


// ── DOM helpers ───────────────────────────────────────

/**
 * Genera las iniciales de un nombre para el avatar.
 * iniciales("Juan Ríos") → "JR"
 */
function iniciales(nombre) {
    return nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
}

/**
 * Muestra u oculta un elemento por id.
 */
function mostrar(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function ocultar(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

/**
 * Pluraliza una palabra según cantidad.
 * pluralizar(1, 'registro')     → "1 registro"
 * pluralizar(3, 'registro')     → "3 registros"
 * pluralizar(2, 'vez', 'veces') → "2 veces"
 *
 * Antes estaba inline como n + ' registro' + (n !== 1 ? 's' : '')
 * en detalle.js, historial.js y main.js.
 */
function pluralizar(n, singular, plural) {
    const forma = plural || (singular + 's');
    return `${n} ${n !== 1 ? forma : singular}`;
}

/**
 * Tiempo relativo desde un timestamp.
 * tiempoRelativo(ts) → "Hace 3 días"
 * Consolidado desde personas.js donde vivía solo.
 */
function tiempoRelativo(ts) {
    if (!ts) return 'Sin actividad';
    const diff = Date.now() - ts;
    const min  = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (min < 2)  return 'Ahora mismo';
    if (min < 60) return `Hace ${min} min`;
    if (h < 24)   return `Hace ${h} h`;
    if (d === 1)  return 'Ayer';
    if (d < 7)    return `Hace ${d} días`;
    if (d < 30)   return `Hace ${Math.floor(d / 7)} sem.`;
    if (d < 365)  return `Hace ${Math.floor(d / 30)} ${pluralizar(Math.floor(d / 30), 'mes', 'meses')}`;
    return `Hace ${pluralizar(Math.floor(d / 365), 'año')}`;
}

/**
 * Devuelve true si el timestamp es de las últimas 24h.
 */
function esReciente(ts) {
    if (!ts) return false;
    return (Date.now() - ts) < 86400000;
}


// ── Componentes UI reutilizables ──────────────────────

/**
 * Renderiza un donut SVG de proporción fiado/pago.
 * Usado en detalle.js e historial.js — antes copiado exacto.
 *
 * @param {string} idFiado  — id del <circle> de fiado
 * @param {string} idPago   — id del <circle> de pago
 * @param {string} idLabel  — id del elemento de texto central
 * @param {number} fiado    — total fiado en centavos
 * @param {number} pago     — total pago en centavos
 */
function renderDonut(idFiado, idPago, idLabel, fiado, pago) {
    const elFiado = document.getElementById(idFiado);
    const elPago  = document.getElementById(idPago);
    const elLabel = document.getElementById(idLabel);
    if (!elFiado || !elPago || !elLabel) return;

    const C     = 2 * Math.PI * 15; // circunferencia r=15 → ≈ 94.25
    const total = fiado + pago;

    if (total === 0) {
        elFiado.setAttribute('stroke-dasharray', `0 ${C}`);
        elPago.setAttribute('stroke-dasharray',  `0 ${C}`);
        elLabel.textContent = '—';
        return;
    }

    const arcFiado    = (fiado / total) * C;
    const arcPago     = (pago  / total) * C;
    const offsetFiado = C / 4;
    const offsetPago  = C / 4 - arcFiado;

    elFiado.setAttribute('stroke-dasharray',  `${arcFiado} ${C - arcFiado}`);
    elFiado.setAttribute('stroke-dashoffset', offsetFiado);
    elPago.setAttribute('stroke-dasharray',   `${arcPago} ${C - arcPago}`);
    elPago.setAttribute('stroke-dashoffset',  offsetPago);

    if (fiado >= pago) {
        elLabel.textContent  = `${Math.round((fiado / total) * 100)}% F`;
        elLabel.style.color  = 'var(--color-danger)';
    } else {
        elLabel.textContent  = `${Math.round((pago / total) * 100)}% P`;
        elLabel.style.color  = 'var(--color-success)';
    }
}

/**
 * Muestra un mensaje de error estándar dentro de un contenedor.
 * Antes había 4 versiones distintas en catalogo, detalle,
 * historial y personas con HTML ligeramente diferente.
 *
 * @param {string} contenedorSelector — selector CSS del contenedor
 * @param {string} titulo             — título del error
 * @param {string} detalle            — mensaje técnico
 * @param {string} [accion]           — texto del botón ('Reintentar' por defecto)
 * @param {string} [onClickJS]        — JS del onclick ('location.reload()' por defecto)
 */
function mostrarError(contenedorSelector, titulo, detalle, accion = 'Reintentar', onClickJS = 'location.reload()') {
    const el = typeof contenedorSelector === 'string'
        ? document.querySelector(contenedorSelector)
        : contenedorSelector;
    if (!el) return;

    el.innerHTML = `
        <div class="error-estado">
            <p class="error-titulo">${titulo}</p>
            <p class="error-detalle">${detalle}</p>
            <button onclick="${onClickJS}">${accion}</button>
        </div>`;
}

/**
 * Muestra un mensaje de lista vacía estándar.
 * Antes duplicado en catalogo.js y personas.js.
 *
 * @param {string} contenedorId — id del elemento contenedor
 * @param {string} mensaje      — texto a mostrar
 */
function mostrarMensajeVacio(contenedorId, mensaje) {
    const el = document.getElementById(contenedorId);
    if (el) el.innerHTML = `<p class="sin-resultados">${mensaje}</p>`;
}
