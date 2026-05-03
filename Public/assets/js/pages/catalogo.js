// Datos de prueba — reemplazar por fetch cuando el backend esté listo
const categorias = [
    {
        id: 1,
        nombre: "Bebidas",
        emoji: "☕",
        productos: [
            { id: 1, nombre: "Café", montoCentavos: 150 },
            { id: 2, nombre: "Agua", montoCentavos: 100 },
            { id: 3, nombre: "Jugo de naranja", montoCentavos: 200 },
            { id: 4, nombre: "Gaseosa", montoCentavos: 150 },
        ]
    },
    {
        id: 2,
        nombre: "Snacks",
        emoji: "🍪",
        productos: [
            { id: 5, nombre: "Galletas", montoCentavos: 50 },
            { id: 6, nombre: "Chifles", montoCentavos: 100 },
            { id: 7, nombre: "Maní", montoCentavos: 50 },
        ]
    },
    {
        id: 3,
        nombre: "Almuerzo",
        emoji: "🍱",
        productos: [
            { id: 8, nombre: "Menú del día", montoCentavos: 800 },
            { id: 9, nombre: "Arroz con pollo", montoCentavos: 700 },
        ]
    }
];

// ── Estado
let tabActivo = categorias[0].id;

// ── Formatear precio
function formatPrecio(centavos) {
    return `S/ ${(centavos / 100).toFixed(2)}`;
}

// ── Renderizar tabs
function renderTabs() {
    const container = document.getElementById("tabs-container");
    container.innerHTML = categorias.map(cat => `
        <button class="tab ${cat.id === tabActivo ? 'active' : ''}" data-id="${cat.id}">
            <span class="tab-emoji">${cat.emoji}</span>
            ${cat.nombre}
            <span class="tab-count">${cat.productos.length}</span>
        </button>
    `).join("");

    container.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", () => {
            tabActivo = Number(btn.dataset.id);
            document.getElementById("buscador").value = "";
            renderTabs();
            renderProductos();
        });
    });
}

// ── Renderizar productos
function renderProductos(filtro = "") {
    const grid = document.getElementById("productos-grid");
    const cat = categorias.find(c => c.id === tabActivo);
    const productos = cat.productos.filter(p =>
        p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    if (productos.length === 0) {
        grid.innerHTML = `<p class="sin-resultados">No se encontraron productos</p>`;
        return;
    }

    grid.innerHTML = productos.map(p => `
        <div class="producto-card">
            <p class="producto-nombre">${p.nombre}</p>
            <p class="producto-precio">${formatPrecio(p.montoCentavos)}</p>
        </div>
    `).join("");
}

// ── Buscador
document.getElementById("buscador").addEventListener("input", (e) => {
    renderProductos(e.target.value);
});

// ── Init
renderTabs();
renderProductos();