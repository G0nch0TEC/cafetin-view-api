// ══════════════════════════════════════════════════════
//  PERSONAS — mejorado
//  Mejoras:
//   1. Barra de deuda proporcional (intensidad de rojo)
//   2. Filtros: todos / con deuda / al día / sin mov
//   3. Orden: nombre / mayor deuda / reciente / inactivo
//   4. Último movimiento visible en cada fila
//   5. Header-resumen útil: "8 con deuda · S/ 230 total"
// ══════════════════════════════════════════════════════

let _personasConMeta = [];   // cache enriquecido con última actividad
let _filtroActivo    = 'todos';
let _ordenActivo     = 'nombre';

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        const [personas, todosMovs] = await Promise.all([
            getPersonas(),
            getTodosLosMovimientos()
        ]);

        if (!personas.length) {
            mostrarMensajeVacio('No hay clientes registrados todavía.');
            return;
        }

        // Enriquecer cada persona con datos de actividad
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

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
});


// ── Enriquecer personas con último movimiento ─────────
function enriquecerPersonas(personas, movimientos) {
    return personas.map(p => {
        const movsPersona = movimientos.filter(m =>
            String(m.personaId) === String(p.id)
        );

        const ultimoMov = movsPersona.length
            ? Math.max(...movsPersona.map(m => m.fecha))
            : null;

        return {
            ...p,
            saldo:    Number(p.saldo),
            ultimoMov,
            totalMovs: movsPersona.length
        };
    });
}


// ── Header resumen ────────────────────────────────────
function renderResumen(personas) {
    const conDeuda = personas.filter(p => p.saldo > 0);
    const totalDeuda = conDeuda.reduce((s, p) => s + p.saldo, 0);
    const sinMov = personas.filter(p => !p.ultimoMov).length;

    const el = document.getElementById('header-resumen');
    if (el) {
        let partes = [`${conDeuda.length} con deuda · ${formatearMonto(totalDeuda)} pendiente`];
        if (sinMov > 0) partes.push(`${sinMov} sin actividad`);
        el.textContent = partes.join('  ·  ');
    }

    const badge = document.getElementById('total-badge');
    if (badge) badge.textContent = `${personas.length} cliente${personas.length !== 1 ? 's' : ''}`;
}


// ── Render lista ──────────────────────────────────────
function renderPersonas(personas, busqueda = '') {
    const lista = document.getElementById('persona-lista');
    if (!lista) return;

    // Máxima deuda para calcular proporción de barra
    const maxSaldo = Math.max(...personas.filter(p => p.saldo > 0).map(p => p.saldo), 1);

    // Filtrar por búsqueda
    let resultado = personas.filter(p =>
        p.nombre.toLowerCase().includes(busqueda)
    );

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
        const pct = p.saldo > 0 ? Math.round((p.saldo / maxSaldo) * 100) : 0;
        const ultimoLabel = p.ultimoMov ? tiempoRelativo(p.ultimoMov) : 'Sin actividad';
        const ultimoClase = esReciente(p.ultimoMov) ? 'reciente' : (p.ultimoMov ? '' : 'inactivo');

        return `
        <a href="detalle.html?id=${p.id}" class="persona-row ${clase}">
            <div class="persona-avatar">${iniciales(p.nombre)}</div>
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
    if (saldo > 0) return { clase: 'deuda',         chip: formatearMonto(saldo) };
    if (saldo < 0) return { clase: 'al-dia',         chip: 'A favor' };
                   return { clase: 'sin-movimientos', chip: 'Sin mov.' };
}

function tiempoRelativo(ts) {
    if (!ts) return 'Sin actividad';
    const diff = Date.now() - ts;
    const min  = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (min < 2)   return 'Ahora mismo';
    if (min < 60)  return `Hace ${min} min`;
    if (h < 24)    return `Hace ${h} h`;
    if (d === 1)   return 'Ayer';
    if (d < 7)     return `Hace ${d} días`;
    if (d < 30)    return `Hace ${Math.floor(d/7)} sem.`;
    if (d < 365)   return `Hace ${Math.floor(d/30)} mes${Math.floor(d/30) !== 1 ? 'es' : ''}`;
    return `Hace ${Math.floor(d/365)} año${Math.floor(d/365) !== 1 ? 's' : ''}`;
}

function esReciente(ts) {
    if (!ts) return false;
    return (Date.now() - ts) < 86400000; // menos de 24h
}

function mostrarMensajeVacio(msg) {
    document.getElementById('persona-lista').innerHTML =
        `<p class="sin-resultados">${msg}</p>`;
}

function mostrarError(msg) {
    document.getElementById('persona-lista').innerHTML = `
        <div class="error-estado">
            <p class="error-titulo">No se pudieron cargar las personas</p>
            <p class="error-detalle">${msg}</p>
            <button onclick="location.reload()">Reintentar</button>
        </div>`;
}