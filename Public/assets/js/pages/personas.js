// ══════════════════════════════════════════════════════
//  PERSONAS — personas.js
//  Public/assets/js/pages/personas.js
//
//  Cambios respecto al original:
//    · withLoader()          reemplaza el patrón manual
//    · mostrarError()        viene de utils.js
//    · mostrarMensajeVacio() viene de utils.js
//    · tiempoRelativo()      viene de utils.js
//    · esReciente()          viene de utils.js
//    · pluralizar()          reemplaza concatenaciones inline
//    · avatar avatar-lg      reemplaza .persona-avatar inline
//    · badge badge--         convención BEM del nuevo badges.css
// ══════════════════════════════════════════════════════

let _personasConMeta = [];
let _filtroActivo    = 'todos';
let _ordenActivo     = 'nombre';


// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    await withLoader(
        async () => {
            const [personas, todosMovs] = await Promise.all([
                getPersonas(),
                getTodosLosMovimientos()
            ]);

            if (!personas.length) {
                mostrarMensajeVacio('persona-lista', 'No hay clientes registrados todavía.');
                return;
            }

            _personasConMeta = enriquecerPersonas(personas, todosMovs);

            renderResumen(_personasConMeta);
            renderPersonas(_personasConMeta);

            // Buscador
            document.getElementById('buscador').addEventListener('input', (e) => {
                renderPersonas(_personasConMeta, e.target.value.toLowerCase());
            });

            // Filtros
            document.querySelectorAll('.filtro-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
                    btn.classList.add('activo');
                    _filtroActivo = btn.dataset.filtro;
                    renderPersonas(_personasConMeta, document.getElementById('buscador').value.toLowerCase());
                });
            });

            // Orden
            document.getElementById('orden-select').addEventListener('change', (e) => {
                _ordenActivo = e.target.value;
                renderPersonas(_personasConMeta, document.getElementById('buscador').value.toLowerCase());
            });
        },
        (err) => mostrarError('#persona-lista', 'No se pudieron cargar las personas', err.message)
    );

    // ── Polling silencioso — se actualizan los datos sin recargar ─────────────────
    iniciarPolling({
        fetchFn: async () => {
            const [personas, todosMovs] = await Promise.all([
                getPersonas(),
                getTodosLosMovimientos()
            ]);
            return { personas, todosMovs };
        },
        firmaFn: ({ personas }) => {
            const deuda = personas.reduce((s, p) => s + Number(p.saldo), 0);
            return `${personas.length}:${deuda}`;
        },
        renderFn: ({ personas, todosMovs }) => {
            _personasConMeta = enriquecerPersonas(personas, todosMovs);
            renderResumen(_personasConMeta);
            // Respetar búsqueda y filtros activos del usuario
            const busqueda = document.getElementById('buscador')?.value.toLowerCase() ?? '';
            renderPersonas(_personasConMeta, busqueda);
        },
        intervalo: 30_000
    });
});


// ── Enriquecer personas con último movimiento ─────────
function enriquecerPersonas(personas, movimientos) {
    return personas.map(p => {
        const movsPersona = movimientos.filter(m => String(m.personaId) === String(p.id));
        const ultimoMov   = movsPersona.length
            ? Math.max(...movsPersona.map(m => m.fecha))
            : null;

        return {
            ...p,
            saldo:     Number(p.saldo),
            ultimoMov,
            totalMovs: movsPersona.length
        };
    });
}


// ── Header resumen ────────────────────────────────────
function renderResumen(personas) {
    const conDeuda   = personas.filter(p => p.saldo > 0);
    const totalDeuda = conDeuda.reduce((s, p) => s + p.saldo, 0);
    const sinMov     = personas.filter(p => !p.ultimoMov).length;

    const el = document.getElementById('header-resumen');
    if (el) {
        // pluralizar() de utils — antes era inline
        let partes = [`${conDeuda.length} con deuda · ${formatearMonto(totalDeuda)} pendiente`];
        if (sinMov > 0) partes.push(pluralizar(sinMov, 'sin actividad'));
        el.textContent = partes.join('  ·  ');
    }

    const badge = document.getElementById('total-badge');
    if (badge) badge.textContent = pluralizar(personas.length, 'cliente');
}


// ── Render lista ──────────────────────────────────────
function renderPersonas(personas, busqueda = '') {
    const lista = document.getElementById('persona-lista');
    if (!lista) return;

    const maxSaldo = Math.max(...personas.filter(p => p.saldo > 0).map(p => p.saldo), 1);

    // Filtrar por búsqueda
    let resultado = personas.filter(p => p.nombre.toLowerCase().includes(busqueda));

    // Filtrar por estado
    if (_filtroActivo === 'deuda')   resultado = resultado.filter(p => p.saldo > 0);
    if (_filtroActivo === 'al-dia')  resultado = resultado.filter(p => p.saldo <= 0);
    if (_filtroActivo === 'sin-mov') resultado = resultado.filter(p => !p.ultimoMov);

    // Ordenar
    if (_ordenActivo === 'nombre')      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (_ordenActivo === 'mayor-deuda') resultado.sort((a, b) => b.saldo - a.saldo);
    if (_ordenActivo === 'reciente')    resultado.sort((a, b) => (b.ultimoMov || 0) - (a.ultimoMov || 0));
    if (_ordenActivo === 'inactivo')    resultado.sort((a, b) => (a.ultimoMov || 0) - (b.ultimoMov || 0));

    if (!resultado.length) {
        lista.innerHTML = '<p class="sin-resultados">No se encontraron personas</p>';
        return;
    }

    lista.innerHTML = resultado.map(p => {
        const { clase, chip } = estadoSaldo(p.saldo);
        const pct             = p.saldo > 0 ? Math.round((p.saldo / maxSaldo) * 100) : 0;

        // tiempoRelativo() y esReciente() vienen de utils.js
        const ultimoLabel = tiempoRelativo(p.ultimoMov);
        const ultimoClase = esReciente(p.ultimoMov) ? 'reciente' : (p.ultimoMov ? '' : 'inactivo');

        return `
        <a href="detalle.html?id=${p.id}" class="persona-row ${clase}">
            <div class="avatar avatar-lg">${iniciales(p.nombre)}</div>
            <div class="persona-datos">
                <span class="persona-nombre">${p.nombre}</span>
                <span class="persona-ultimo ${ultimoClase}">
                    <span class="ultimo-dot"></span>${ultimoLabel}
                </span>
                ${p.saldo > 0 ? `
                <div class="deuda-barra-wrap">
                    <div class="deuda-barra" style="width:${pct}%"></div>
                </div>` : ''}
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
    if (saldo > 0) return { clase: 'deuda',          chip: formatearMonto(saldo) };
    if (saldo < 0) return { clase: 'al-dia',          chip: 'A favor' };
                   return { clase: 'sin-movimientos', chip: 'Sin mov.' };
}
