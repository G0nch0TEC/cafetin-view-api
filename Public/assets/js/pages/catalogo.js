// ══════════════════════════════════════════════════════
//  CATÁLOGO — con fetch real
//  Public/assets/js/pages/catalogo.js
//
//  Depende de:  api.js → getCatalogo()
//               utils.js → formatearMonto()
// ══════════════════════════════════════════════════════

// ── Estado ────────────────────────────────────────────
let categorias   = [];   // datos que llegan del servidor
let tabActivo    = null; // id de la categoría activa
let ordenActual  = 'default';

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    inyectarControles();
    mostrarLoader();

    try {
        categorias = await getCatalogo();

        if (!categorias.length) {
            mostrarMensajeVacio('No hay productos en el catálogo todavía.');
            return;
        }

        tabActivo = categorias[0].id;
        renderTabs();
        renderProductos();

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
});

// ── Controles (search + orden) ────────────────────────
function inyectarControles() {
    const wrapper  = document.querySelector('.catalogo-wrapper');
    if (!wrapper || wrapper.querySelector('.controles-bar')) return;

    const searchBox = wrapper.querySelector('.search-box');
    const bar = document.createElement('div');
    bar.className = 'controles-bar';

    if (searchBox) bar.appendChild(searchBox);

    const select = document.createElement('select');
    select.className = 'filtro-orden';
    select.id = 'filtro-orden';
    select.innerHTML = `
        <option value="default">🔀 Por defecto</option>
        <option value="precio-asc">💸 Menor precio</option>
        <option value="precio-desc">💎 Mayor precio</option>
        <option value="nombre-az">🔤 A → Z</option>
        <option value="nombre-za">🔤 Z → A</option>
    `;
    bar.appendChild(select);

    const tabs = wrapper.querySelector('.tabs-container');
    wrapper.insertBefore(bar, tabs);

    select.addEventListener('change', (e) => {
        ordenActual = e.target.value;
        renderProductos(document.getElementById('buscador')?.value || '');
    });
}

// ── Ordenar ───────────────────────────────────────────
function ordenarProductos(productos) {
    const lista = [...productos];
    switch (ordenActual) {
        case 'precio-asc':  return lista.sort((a, b) => a.montoCentavos - b.montoCentavos);
        case 'precio-desc': return lista.sort((a, b) => b.montoCentavos - a.montoCentavos);
        case 'nombre-az':   return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        case 'nombre-za':   return lista.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
        default:            return lista;
    }
}

// ── Tabs ──────────────────────────────────────────────
function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = categorias.map(cat => `
        <button class="tab ${cat.id === tabActivo ? 'active' : ''}" data-id="${cat.id}">
            <span class="tab-emoji">${cat.emoji}</span>
            ${cat.nombre}
            <span class="tab-count">${cat.productos.length}</span>
        </button>
    `).join('');

    container.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabActivo = Number(btn.dataset.id);
            document.getElementById('buscador').value = '';
            renderTabs();
            renderProductos();
        });
    });
}

// ── Productos ─────────────────────────────────────────
function renderProductos(filtro = '') {
    const grid = document.getElementById('productos-grid');
    const cat  = categorias.find(c => c.id === tabActivo);
    if (!cat) return;

    let productos = cat.productos.filter(p =>
        p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );
    productos = ordenarProductos(productos);

    if (!productos.length) {
        grid.innerHTML = `<p class="sin-resultados">No se encontraron productos</p>`;
        return;
    }

    grid.innerHTML = productos.map((p, i) => `
        <div class="producto-card" style="animation-delay: ${i * 0.05}s">
            <span class="producto-emoji">${cat.emoji}</span>
            <p class="producto-nombre">${p.nombre}</p>
            <p class="producto-precio">${formatearMonto(p.montoCentavos)}</p>
        </div>
    `).join('');
}

// ── Buscador ──────────────────────────────────────────
document.querySelector('.catalogo-wrapper').addEventListener('input', (e) => {
    if (e.target.id === 'buscador') renderProductos(e.target.value);
});

// ── Estados vacío / error ─────────────────────────────
function mostrarMensajeVacio(msg) {
    document.getElementById('productos-grid').innerHTML =
        `<p class="sin-resultados">${msg}</p>`;
}

function mostrarError(msg) {
    document.getElementById('productos-grid').innerHTML = `
        <div class="error-estado">
            <p class="error-titulo">No se pudieron cargar los productos</p>
            <p class="error-detalle">${msg}</p>
            <button onclick="location.reload()">Reintentar</button>
        </div>
    `;
}