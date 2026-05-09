// ══════════════════════════════════════════════════════
//  INIT — carga de componentes globales
//  Public/assets/js/init.js
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

        // Logo lleva al inicio
        const toggle = el.querySelector('.sidebar-toggle');
        if (toggle) toggle.addEventListener('click', () => {
            window.location.href = '/cafetin-view-api/Public/index.html';
        });
    }
});

// ── Loader global ─────────────────────────────────────
// Llamar desde cualquier pages/*.js antes/después del fetch

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


// ── Link activo en sidebar ────────────────────────────
function marcarLinkActivo(sidebar) {
    const pathname = window.location.pathname;

    // Mapa de páginas hijas → sección padre del sidebar
    // detalle.html pertenece a "personas"
    const padres = {
        'detalle.html': 'personas.html'
    };

    // Nombre de archivo de la página actual
    const archivo = pathname.split('/').pop() || 'index.html';

    // Si es una página hija, apuntar al padre
    const objetivo = padres[archivo] || archivo;

    sidebar.querySelectorAll('.Group-a a').forEach(link => {
        link.classList.remove('active');

        const href = link.getAttribute('href') || '';
        const nombreLink = href.split('/').pop();

        // Match: el link termina en el mismo archivo que el objetivo
        if (nombreLink === objetivo) {
            link.classList.add('active');
        }
    });
}