/* ══════════════════════════════════════════════════════
   SIDEBAR MÓVIL — hamburguesa, overlay, cierre
   Public/assets/js/helper/sidebar-mobile.js
══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    function initMobileSidebar() {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) return;

        /* ── Crear overlay ── */
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        /* ── Crear botón hamburguesa ── */
        let toggle = document.querySelector('.menu-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.className = 'menu-toggle';
            toggle.setAttribute('aria-label', 'Abrir menú');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i data-lucide="menu"></i>';
            document.body.appendChild(toggle);
            if (window.lucide) window.lucide.createIcons();
        }

        /* ── Abrir sidebar ── */
        function openSidebar() {
            sidebarContainer.classList.add('open');
            overlay.classList.add('visible');
            toggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }

        /* ── Cerrar sidebar ── */
        function closeSidebar() {
            sidebarContainer.classList.remove('open');
            overlay.classList.remove('visible');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }

        toggle.addEventListener('click', function () {
            if (sidebarContainer.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        overlay.addEventListener('click', closeSidebar);

        /* ── Cerrar con Escape ── */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSidebar();
        });

        /* ── Cerrar al hacer click en un enlace del sidebar (navegación) ── */
        sidebarContainer.addEventListener('click', function (e) {
            const link = e.target.closest('a');
            if (link) closeSidebar();
        });

        /* ── Cuando la pantalla se agranda, resetear estado ── */
        const mq = window.matchMedia('(min-width: 1025px)');
        mq.addEventListener('change', function (e) {
            if (e.matches) {
                closeSidebar();
            }
        });
    }

    /* Esperar a que el sidebar esté cargado en el DOM
       (init.js lo inyecta via fetch/innerHTML) */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initMobileSidebar, 120);
        });
    } else {
        setTimeout(initMobileSidebar, 120);
    }
})();
