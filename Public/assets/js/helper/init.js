// ══════════════════════════════════════════════════════
//  INIT — Carga de componentes globales
//  Public/assets/js/components/init.js
// ══════════════════════════════════════════════════════

// ── Guard de sesión ───────────────────────────────────
// Redirige a login si no hay sesión activa.
// Se ejecuta antes que todo lo demás.

(function checkAuth() {
    const SESION_KEY = 'cafetin_sesion';
    const paginaActual = window.location.pathname;

    // No proteger la página de login
    if (paginaActual.includes('login.html')) return;

    const raw = localStorage.getItem(SESION_KEY);
    if (!raw) {
        window.location.replace('/cafetin-view-api/Public/login.html');
        return;
    }
    try {
        const { expiresAt } = JSON.parse(raw);
        if (Date.now() >= expiresAt) {
            localStorage.removeItem(SESION_KEY);
            window.location.replace('/cafetin-view-api/Public/login.html');
        }
    } catch {
        localStorage.removeItem(SESION_KEY);
        window.location.replace('/cafetin-view-api/Public/login.html');
    }
})();


// ── Componentes globales ──────────────────────────────

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

        // Botón cerrar sesión en el sidebar
        const btnSalir = el.querySelector('#btn-cerrar-sesion');
        if (btnSalir) {
            btnSalir.addEventListener('click', () => {
                localStorage.removeItem('cafetin_sesion');
                window.location.href = '/cafetin-view-api/Public/login.html';
            });
        }
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

    const padres = {
        'detalle.html': 'personas.html'
    };

    const archivo  = pathname.split('/').pop() || 'index.html';
    const objetivo = padres[archivo] || archivo;

    sidebar.querySelectorAll('.Group-a a').forEach(link => {
        link.classList.remove('active');
        const href       = link.getAttribute('href') || '';
        const nombreLink = href.split('/').pop();
        if (nombreLink === objetivo) link.classList.add('active');
    });
}
