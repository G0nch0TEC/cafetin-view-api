// ══════════════════════════════════════════════════════
//  API — Todas las llamadas fetch centralizadas
//  Public/assets/js/api.js
// ══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  CONFIGURACIÓN
//  Cambia solo esta línea cuando el servidor cambie.
// ─────────────────────────────────────────────────────
const API_BASE = 'https://TU-SERVIDOR.com/cafetin-view-api';


// ── Fetch base ────────────────────────────────────────

/**
 * Wrapper interno. Lanza un Error con mensaje legible
 * si la respuesta no es 2xx o si el JSON trae { error }.
 */
async function _get(endpoint) {
    const res = await fetch(API_BASE + endpoint);

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status} en ${endpoint}`);
    }

    const data = await res.json();

    // El PHP puede devolver 200 con { error: "..." } si la DB no existe aún
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
}


// ── Endpoints ─────────────────────────────────────────

/**
 * Devuelve todas las personas con su saldo neto.
 *
 * Respuesta: [{ id, nombre, saldo }, ...]
 *   - saldo: entero en centavos. Positivo = debe, 0 = al día.
 */
async function getPersonas() {
    return _get('/personas');
}

/**
 * Devuelve todos los movimientos de una persona.
 *
 * @param {number} personaId
 * Respuesta: [{ id, personaId, persona, tipo, monto, fecha, nota }, ...]
 *   - tipo:  'FIADO' | 'PAGO'
 *   - monto: centavos
 *   - fecha: timestamp en milisegundos
 */
async function getMovimientosPorPersona(personaId) {
    return _get(`/movimientos?personaId=${personaId}`);
}

/**
 * Devuelve todos los movimientos (sin filtro de persona).
 * Útil para el historial — el filtrado por fecha se hace en JS
 * usando fechaInputARango() de utils.js.
 *
 * Respuesta: [{ id, personaId, persona, tipo, monto, fecha, nota }, ...]
 */
async function getTodosLosMovimientos() {
    return _get('/movimientos');
}

/**
 * Devuelve el catálogo completo con categorías y productos anidados.
 *
 * Respuesta: [{ id, nombre, emoji, orden, productos: [{ id, categoriaId, nombre, montoCentavos, orden }] }, ...]
 */
async function getCatalogo() {
    return _get('/catalogo');
}