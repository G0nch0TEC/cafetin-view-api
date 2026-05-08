// ══════════════════════════════════════════════════════
//  UTILS — Funciones reutilizables
//  Public/assets/js/utils.js
// ══════════════════════════════════════════════════════


// ── Montos ────────────────────────────────────────────

/**
 * Convierte centavos a texto legible.
 * formatearMonto(150)  → "S/ 1.50"
 * formatearMonto(800)  → "S/ 8.00"
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

// Meses en español para formatear fechas
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
 * Útil para filtrar movimientos por fecha.
 */
function fechaInputARango(fechaStr) {
    const inicio = new Date(fechaStr + 'T00:00:00').getTime();
    const fin    = new Date(fechaStr + 'T23:59:59').getTime();
    return { inicio, fin };
}

/**
 * Nombre largo de un timestamp para el título del historial.
 * formatearFechaLarga(1746316440000) → "Sábado, 3 de mayo 2026"
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
    // Forzar mediodía para evitar problemas de timezone
    return formatearFechaLarga(new Date(fechaStr + 'T12:00:00').getTime());
}


// ── Navegación ────────────────────────────────────────

/**
 * Lee un parámetro de la URL actual.
 * obtenerParamUrl('id')    → "5"  (desde ?id=5)
 * obtenerParamUrl('fecha') → null (si no existe)
 */
function obtenerParamUrl(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}


// ── DOM helpers ───────────────────────────────────────

/**
 * Genera las iniciales de un nombre para el avatar.
 * iniciales("Juan Ríos")    → "JR"
 * iniciales("María Castro") → "MC"
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
function mostrar(id)  { const el = document.getElementById(id); if (el) el.style.display = ''; }
function ocultar(id)  { const el = document.getElementById(id); if (el) el.style.display = 'none'; }