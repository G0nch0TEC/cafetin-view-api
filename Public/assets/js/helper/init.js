// ══════════════════════════════════════════════════════
//  INIT — Carga de componentes globales
//  Public/assets/js/components/init.js
//
//  Añade withLoader() que elimina el patrón:
//    await new Promise(r => setTimeout(r, 50));
//    mostrarLoader();
//    try { ... } finally { ocultarLoader(); }
//  copiado en main.js, catalogo.js, detalle.js
//  e historial.js.
// ══════════════════════════════════════════════════════

const components = [
    { id: 'sidebar-container', path: '/cafetin-view-api/Public/components/sidebar.html' },
    { id: 'loader-container',  path: '/cafetin-view-api/Public/components/loader.html'  },
];

components.forEach(async ({ id, path }) => {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(path);
    el.innerHTML = await res.text();

    lucide.createIcons();

    if (id === 'sidebar-container') {
        marcarLinkActivo(el);

        const toggle = el.querySelector('.sidebar-toggle');
        if (toggle) toggle.addEventListener('click', () => {
            window.location.href = '/cafetin-view-api/Public/index.html';
        });
    }
});


// ── Loader global ─────────────────────────────────────

function mostrarLoader() {
    const el = document.getElementById('loader-overlay');
    if (el) {
        el.classList.remove('oculto');
        el.setAttribute('aria-hidden', 'false');
    }
}

function ocultarLoader() {
    const el = document.getElementById('loader-overlay');
    if (el) {
        el.classList.add('oculto');
        el.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Envuelve una función async con el ciclo completo del loader:
 * delay visual → mostrar loader → ejecutar → ocultar loader.
 *
 * Reemplaza este patrón copiado en 4 archivos de página:
 *
 *   await new Promise(r => setTimeout(r, 50));
 *   mostrarLoader();
 *   try {
 *       await fn();
 *   } finally {
 *       ocultarLoader();
 *   }
 *
 * Uso:
 *   await withLoader(async () => {
 *       const data = await getPersonas();
 *       renderLista(data);
 *   });
 *
 * Opcionalmente acepta un callback onError para manejar
 * el error dentro de la página sin perder el ocultarLoader.
 *
 * @param {Function} fn        — función async a ejecutar
 * @param {Function} [onError] — callback(err) opcional
 */
async function withLoader(fn, onError) {
    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();
    try {
        await fn();
    } catch (err) {
        if (onError) {
            onError(err);
        } else {
            console.error('[withLoader]', err.message);
        }
    } finally {
        ocultarLoader();
    }
}


// ── Link activo en sidebar ────────────────────────────

function marcarLinkActivo(sidebar) {
    const pathname = window.location.pathname;

    // Páginas hijas → sección padre del sidebar
    const padres = {
        'detalle.html': 'personas.html'
    };

    const archivo  = pathname.split('/').pop() || 'index.html';
    const objetivo = padres[archivo] || archivo;

    sidebar.querySelectorAll('.Group-a a').forEach(link => {
        link.classList.remove('active');
        const href      = link.getAttribute('href') || '';
        const nombreLink = href.split('/').pop();
        if (nombreLink === objetivo) link.classList.add('active');
    });
}
