// ══════════════════════════════════════════════════════
//  INIT — carga de componentes globales
//  Public/assets/js/init.js
// ══════════════════════════════════════════════════════

const components = [
    { id: 'sidebar-container', path: '/Public/components/sidebar.html' },
    { id: 'loader-container',  path: '/Public/components/loader.html'  },
];

components.forEach(async ({ id, path }) => {
    const el = document.getElementById(id);
    if (!el) return;

    const res = await fetch(path);
    el.innerHTML = await res.text();

    lucide.createIcons();

    if (id === 'sidebar-container') {
        const currentPath = window.location.pathname;
        el.querySelectorAll('a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
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