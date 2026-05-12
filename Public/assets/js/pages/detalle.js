// ══════════════════════════════════════════════════════
//  DETALLE DE PERSONA — detalle.js
//  Public/assets/js/pages/detalle.js
//
//  Cambios respecto al original:
//    · withLoader()   reemplaza el patrón manual
//    · renderDonut()  viene de utils.js (era copia exacta)
//    · mostrarError() viene de utils.js
//    · pluralizar()   reemplaza concatenaciones inline
//    · avatar avatar-xl reemplaza .persona-avatar inline
// ══════════════════════════════════════════════════════

var _todosMovimientos = [];
var _filtroActivo     = 'todos';


// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const personaId = obtenerParamUrl('id');

    configurarBtnVolver();

    if (!personaId) {
        mostrarError('main', 'Sin persona', 'No se especificó ninguna persona.', 'Volver', 'history.back()');
        return;
    }

    await withLoader(
        async () => {
            const [personas, movimientos] = await Promise.all([
                getPersonas(),
                getMovimientosPorPersona(personaId)
            ]);

            const persona = personas.find(p => String(p.id) === String(personaId));
            if (!persona) throw new Error('Persona no encontrada.');

            _todosMovimientos = movimientos;

            renderCabecera(persona);
            renderResumen(movimientos);
            renderActividadSemanal(movimientos);
            renderTabla(movimientos);

            // Filtros de tabla
            document.querySelectorAll('.mov-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.mov-chip').forEach(c => c.classList.remove('activo'));
                    chip.classList.add('activo');
                    _filtroActivo = chip.dataset.tipo;
                    aplicarFiltro();
                });
            });
        },
        (err) => mostrarError('main', 'No se pudo cargar el detalle', err.message, 'Volver', 'history.back()')
    );
});


// ── Botón volver inteligente ──────────────────────────
function configurarBtnVolver() {
    const btn   = document.getElementById('btn-volver');
    const label = document.getElementById('volver-label');
    if (!btn) return;

    const from = obtenerParamUrl('from');

    if (from === 'index' || document.referrer.includes('index.html') || document.referrer.endsWith('/')) {
        btn.href = '../index.html';
        if (label) label.textContent = 'Volver al inicio';
    } else {
        btn.href = 'personas.html';
        if (label) label.textContent = 'Volver';
    }
}


// ── Aplicar filtro activo ─────────────────────────────
function aplicarFiltro() {
    const resultado = _filtroActivo === 'todos'
        ? _todosMovimientos
        : _todosMovimientos.filter(m => m.tipo === _filtroActivo);
    renderTabla(resultado);
}


// ── Cabecera ──────────────────────────────────────────
function renderCabecera(persona) {
    const saldo = Number(persona.saldo);

    const avatarEl   = document.querySelector('.persona-header .persona-avatar');
    const nombreEl   = document.querySelector('.persona-header .persona-nombre');
    const saldoBadge = document.querySelector('.saldo-badge');

    // Usa clases del nuevo avatar.css
    if (avatarEl) {
        avatarEl.className  = 'avatar avatar-xl';
        avatarEl.textContent = iniciales(persona.nombre);
    }
    if (nombreEl) nombreEl.textContent = persona.nombre;

    if (saldoBadge) {
        const montoEl = saldoBadge.querySelector('.saldo-monto');
        if (saldo > 0) {
            saldoBadge.className = 'saldo-badge deuda';
            if (montoEl) montoEl.textContent = formatearMonto(saldo);
        } else if (saldo < 0) {
            saldoBadge.className = 'saldo-badge al-dia';
            if (montoEl) montoEl.textContent = 'A favor ' + formatearMonto(Math.abs(saldo));
        } else {
            saldoBadge.className = 'saldo-badge al-dia';
            if (montoEl) montoEl.textContent = 'Al día';
        }
    }

    document.title = 'Detalle — ' + persona.nombre;
}


// ── Resumen ───────────────────────────────────────────
function renderResumen(movimientos) {
    const totalFiado  = movimientos.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
    const totalPagado = movimientos.filter(m => m.tipo === 'PAGO').reduce((s, m)  => s + Number(m.monto), 0);

    const vF = document.getElementById('rv-fiado');
    const vP = document.getElementById('rv-pago');
    const vM = document.getElementById('rv-movs');
    if (vF) vF.textContent = formatearMonto(totalFiado);
    if (vP) vP.textContent = formatearMonto(totalPagado);
    if (vM) vM.textContent = movimientos.length;

    // renderDonut() viene de utils.js — antes era copia exacta aquí
    renderDonut('donut-fiado', 'donut-pago', 'donut-label', totalFiado, totalPagado);
}


// ── Actividad semanal (12 semanas) ────────────────────
function renderActividadSemanal(movimientos) {
    const contenedor = document.getElementById('spark-actividad');
    if (!contenedor) return;

    const semanas = [];
    const ahora   = new Date();

    for (let i = 11; i >= 0; i--) {
        const fin = new Date(ahora);
        fin.setDate(ahora.getDate() - i * 7);
        fin.setHours(23, 59, 59, 999);

        const ini = new Date(fin);
        ini.setDate(fin.getDate() - 6);
        ini.setHours(0, 0, 0, 0);

        const movsSem = movimientos.filter(m => m.fecha >= ini.getTime() && m.fecha <= fin.getTime());
        const fiado   = movsSem.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
        const pago    = movsSem.filter(m => m.tipo === 'PAGO').reduce((s, m)  => s + Number(m.monto), 0);
        semanas.push({ fiado, pago, total: movsSem.length, esActual: i === 0 });
    }

    const maxTotal = Math.max(...semanas.map(s => s.fiado + s.pago), 1);

    contenedor.innerHTML = semanas.map(s => {
        const pctFiado       = Math.round((s.fiado / maxTotal) * 100);
        const pctPago        = Math.round((s.pago  / maxTotal) * 100);
        const tieneActividad = s.fiado > 0 || s.pago > 0;
        const tooltip        = tieneActividad
            ? `${s.total} mov. · F:${formatearMonto(s.fiado)} P:${formatearMonto(s.pago)}`
            : 'Sin actividad';

        return `<div class="spark-col${s.esActual ? ' actual' : ''}" title="${tooltip}">
            <div class="spark-stack">
                ${pctFiado > 0 ? `<div class="spark-bar fiado" style="height:${pctFiado}%"></div>` : ''}
                ${pctPago  > 0 ? `<div class="spark-bar pago"  style="height:${pctPago}%"></div>`  : ''}
                ${!tieneActividad ? '<div class="spark-bar vacio" style="height:8%"></div>' : ''}
            </div>
        </div>`;
    }).join('');
}


// ── Tabla ─────────────────────────────────────────────
function renderTabla(movimientos) {
    const countEl = document.getElementById('movimientos-count');
    const tbody   = document.querySelector('.tabla-movimientos tbody');

    // pluralizar() de utils — antes era inline
    if (countEl) countEl.textContent = pluralizar(movimientos.length, 'registro');
    if (!tbody) return;

    if (!movimientos.length) {
        const msg = _filtroActivo !== 'todos'
            ? `Sin ${_filtroActivo === 'FIADO' ? 'fiados' : 'pagos'} registrados`
            : 'Sin movimientos registrados';
        tbody.innerHTML = `<tr><td colspan="4" class="sin-resultados">${msg}</td></tr>`;
        return;
    }

    tbody.innerHTML = movimientos.map(m => `
        <tr>
            <td><span class="badge badge--${m.tipo.toLowerCase()}">${m.tipo}</span></td>
            <td class="monto ${m.tipo.toLowerCase()}">${formatearMonto(Number(m.monto))}</td>
            <td class="fecha">${formatearFechaHora(m.fecha)}</td>
            <td class="nota">${m.nota || '—'}</td>
        </tr>
    `).join('');
}
