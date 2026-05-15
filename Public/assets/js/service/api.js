// ══════════════════════════════════════════════════════
//  API — Todas las llamadas fetch centralizadas
//  Public/assets/js/api.js
// ══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  CONFIGURACIÓN
//  Cambia solo esta línea cuando el servidor cambie.
// ─────────────────────────────────────────────────────
const API_BASE = 'https://cafetin-view-api-production.up.railway.app';


// ── Sesión ────────────────────────────────────────────

/**
 * Devuelve la clave de sesión guardada en localStorage,
 * o null si no hay sesión activa.
 */
function _getSesion() {
    try {
        const raw = localStorage.getItem('cafetin_sesion');
        if (!raw) return null;
        const { sesion, expiresAt } = JSON.parse(raw);
        return Date.now() < expiresAt ? sesion : null;
    } catch {
        return null;
    }
}


// ── Fetch base ────────────────────────────────────────

/**
 * Wrapper interno. Lanza un Error con mensaje legible
 * si la respuesta no es 2xx o si el JSON trae { error }.
 * Incluye automáticamente el header Authorization.
 */
async function _get(endpoint) {
    const sesion = _getSesion();
    const res = await fetch(API_BASE + endpoint, {
        headers: sesion ? { 'Authorization': sesion } : {}
    });

    if (res.status === 401) {
        // Sesión expirada o inválida — redirigir al login
        localStorage.removeItem('cafetin_sesion');
        window.location.replace('/Public/login.html');
        return;
    }

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
