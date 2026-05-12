// ══════════════════════════════════════════════════════
//  API — Todas las llamadas fetch centralizadas
//  Public/assets/js/api.js
// ══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  CONFIGURACIÓN
//  Cambia solo esta línea cuando el servidor cambie.
// ─────────────────────────────────────────────────────
const API_BASE = 'http://localhost/cafetin-view-api';


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
    if (data && data.error) throw new Error(data.error);
    return data;
}

async function getPersonas() {
    return _get('/personas');
}

async function getMovimientosPorPersona(personaId) {
    return _get(`/movimientos?personaId=${personaId}`);
}

async function getTodosLosMovimientos() {
    return _get('/movimientos');
}

async function getCatalogo() {
    return _get('/catalogo');
}