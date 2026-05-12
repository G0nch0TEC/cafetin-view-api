// ══════════════════════════════════════════════════════
//  CATÁLOGO — catalogo.js
//  Public/assets/js/pages/catalogo.js
//
//  Cambios respecto al original:
//    · withLoader()          reemplaza el patrón manual
//    · calcularRangoSemanas() reemplaza el cálculo inline
//    · mostrarError()        viene de utils.js
//    · mostrarMensajeVacio() viene de utils.js
//    · pluralizar()          reemplaza concatenaciones inline
// ══════════════════════════════════════════════════════

let categorias  = [];
let tabActivo   = null;
let ordenActual = 'default';
let _ventasPorProducto = {};   // { "Refresco": { semActual: 5, semAnterior: 3 } }


// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    inyectarControles();

    await withLoader(
        async () => {
            const [catData, movimientos] = await Promise.all([
                getCatalogo(),
                getTodosLosMovimientos()
            ]);

            categorias = catData;

            if (!categorias.length) {
                mostrarMensajeVacio('productos-grid', 'No hay productos en el catálogo todavía.');
                return;
            }

            // Usar calcularRangoSemanas() de utils en vez del cálculo inline
            _ventasPorProducto = calcularVentasPorProducto(movimientos);

            tabActivo = categorias[0].id;
            renderTabs();
            renderProductos();
        },
        (err) => mostrarError('#productos-grid', 'No se pudieron cargar los productos', err.message)
    );
});


// ── Ventas por producto (sem. actual vs anterior) ─────
function calcularVentasPorProducto(movimientos) {
    // Usa calcularRangoSemanas() de utils — antes era cálculo inline duplicado
    const { inicioActual, inicioAnterior } = calcularRangoSemanas();
    const ventas = {};

    movimientos
        .filter(m => m.tipo === 'FIADO' && m.nota)
        .forEach(m => {
            const match = m.nota.trim().match(/^(.+?)\s+x(\d+)$/i);
            if (!match) return;

            const nombre   = match[1].trim();
            const cantidad = parseInt(match[2], 10);

            if (!ventas[nombre]) ventas[nombre] = { semActual: 0, semAnterior: 0, total: 0 };

            ventas[nombre].total += cantidad;

            if (m.fecha >= inicioActual) {
                ventas[nombre].semActual += cantidad;
            } else if (m.fecha >= inicioAnterior) {
                ventas[nombre].semAnterior += cantidad;
            }
        });

    return ventas;
}


// ── Controles (search + orden) ────────────────────────
function inyectarControles() {
    const wrapper = document.querySelector('.catalogo-wrapper');
    if (!wrapper || wrapper.querySelector('.controles-bar')) return;

    const searchBox = wrapper.querySelector('.search-box');
    const bar = document.createElement('div');
    bar.className = 'controles-bar';
    if (searchBox) bar.appendChild(searchBox);

    const select = document.createElement('select');
    select.className = 'select-glass';
    select.id = 'filtro-orden';
    select.innerHTML = `
        <option value="default">🔀 Por defecto</option>
        <option value="popularidad">🔥 Más vendido</option>
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
        case 'popularidad': return lista.sort((a, b) => {
            const vA = (_ventasPorProducto[a.nombre] || {}).total || 0;
            const vB = (_ventasPorProducto[b.nombre] || {}).total || 0;
            return vB - vA;
        });
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

    container.innerHTML = categorias.map(cat => {
        const ventasSem = cat.productos.reduce((sum, p) => {
            return sum + ((_ventasPorProducto[p.nombre] || {}).semActual || 0);
        }, 0);

        const hotBadge = ventasSem > 0
            ? `<span class="tab-hot" title="${ventasSem} ventas esta semana">🔥</span>`
            : '';

        return `<button class="tab ${cat.id === tabActivo ? 'active' : ''}" data-id="${cat.id}">
            <span class="tab-emoji">${cat.emoji}</span>
            ${cat.nombre}
            <span class="tab-count">${cat.productos.length}</span>
            ${hotBadge}
        </button>`;
    }).join('');

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
        grid.innerHTML = '<p class="sin-resultados">No se encontraron productos</p>';
        return;
    }

    const maxVentas      = Math.max(...productos.map(p => (_ventasPorProducto[p.nombre] || {}).total || 0), 1);
    const modoOrdenPrecio = ordenActual === 'precio-asc' || ordenActual === 'precio-desc';

    grid.innerHTML = productos.map((p, i) => {
        const datos  = _ventasPorProducto[p.nombre] || {};
        const semAct = datos.semActual   || 0;
        const semAnt = datos.semAnterior || 0;
        const total  = datos.total       || 0;
        const pct    = Math.round((total / maxVentas) * 100);

        let tendencia = '';
        if (semAct > semAnt)      tendencia = `<span class="tend-up">↑${semAct}</span>`;
        else if (semAct < semAnt) tendencia = `<span class="tend-down">↓${semAct}</span>`;
        else if (semAct > 0)      tendencia = `<span class="tend-flat">=${semAct}</span>`;

        const esTop    = i === 0 && ordenActual === 'popularidad' && total > 0;
        const topBadge = esTop ? '<span class="top-badge">🏆 Top</span>' : '';

        // Mini historial de ventas
        const historial = total > 0 ? `
            <div class="venta-hist">
                <div class="venta-barra-wrap">
                    <div class="venta-barra" style="width:${pct}%"></div>
                </div>
                <div class="venta-meta">
                    <span class="venta-total">${pluralizar(total, 'vendido', 'vendidos')}</span>
                    ${tendencia}
                </div>
            </div>` : `<div class="venta-hist vacio"><span class="venta-sin">Sin ventas aún</span></div>`;

        return `<div class="producto-card${modoOrdenPrecio ? ' modo-precio' : ''}" style="animation-delay:${i * 0.04}s">
            ${topBadge}
            <span class="producto-emoji">${cat.emoji}</span>
            <p class="producto-nombre">${p.nombre}</p>
            <p class="producto-precio">${formatearMonto(p.montoCentavos)}</p>
            ${historial}
        </div>`;
    }).join('');
}


// ── Buscador ──────────────────────────────────────────
document.querySelector('.catalogo-wrapper').addEventListener('input', (e) => {
    if (e.target.id === 'buscador') renderProductos(e.target.value);
});
