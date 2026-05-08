// ══════════════════════════════════════════════════════
//  PERSONAS — con fetch real
//  Public/assets/js/pages/personas.js
//
//  Depende de:  api.js → getPersonas()
//               utils.js → Iniciales(), formatearMonto()
// ══════════════════════════════════════════════════════

// ── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async() =>{
    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        const personas = await getPersonas()

        if(!personas.length){
            mostrarMensajeVacio('No hay clientes registrados todavia.');
            return;
        }

        renderPersonas(personas);
        actualizarBadge(personas.length);

        //Buscador
        document.getElementById('buscador').addEventListener('input', (e) => {
            const filtro = e.target.value.toLowerCase();
            renderPersonas(personas.filter(p =>
                p.nombre.toLowerCase().include(filtro) 
             ));
        });
    } catch (err) {
        mostrarError(err.message);
    } finally{
        ocultarLoader();
    }
});

// ── Render ────────────────────────────────────────────
function renderPersonas(personas) {
    const lista = document.getElementById('persona-lista');

    if (!personas.length){
        lista.innerHTML = `<p class="sin-resultados">No se encontraron personas</p>`;
        return;
    }
    
    lista.innerHTML = personas.map(p => {
        const saldo = Number(p.saldo);
        const { clase, chip } = estadoSaldo(saldo);
        
        return `
        <a href="detalle.html?id=${p.id}" class="persona-row ${clase}">
            <div class="persona-avatar">${iniciales(p.nombre)}</div>
            <div class="persona-datos">
                <span class="persona-nombre">${p.nombre}</span>
            </div>
            <div class="persona-saldo-area">
                <span class="saldo-chip ${clase}">${chip}</span>
                <i data-lucide="chevron-right" class="chevron"></i>
            </div>
        </a>`;
    }).join('');

    lucide.createIcons();
}

// ── Helpers ───────────────────────────────────────────
function estadoSaldo(saldo) {
    if (saldo > 0)  return { clase: 'deuda',            chip: formatearMonto(saldo)}
    if (saldo < 0)  return { clase: 'al-dia',           chip: 'A favor' };
                    return { clase: 'sin-movimientos',  chip: 'Sin mov.' };
}

function actualizarBadge(total) {
    const badge = document.querySelector('.total-badge');
    if (badge) badge.textContent = `${total} persona${total !== 1 ? 's' : ''}`;
}
 
function mostrarMensajeVacio(msg) {
    document.getElementById('personas-lista').innerHTML =
        `<p class="sin-resultados">${msg}</p>`;
}
 
function mostrarError(msg) {
    document.getElementById('personas-lista').innerHTML = `
        <div class="error-estado">
            <p class="error-titulo">No se pudieron cargar las personas</p>
            <p class="error-detalle">${msg}</p>
            <button onclick="location.reload()">Reintentar</button>
        </div>`;
}