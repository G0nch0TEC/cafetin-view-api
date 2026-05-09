// ══════════════════════════════════════════════════════
//  HISTORIAL — mejorado
//  Mejoras:
//   1. Mini donut chart (proporción fiado/pagado)
//   2. Flechas anterior / siguiente día
//   3. Total al pie de la tabla (subtotal filtrado)
// ══════════════════════════════════════════════════════

var _movimientosDia = [];
var _filtroTipo    = 'todos';
var _filtroOrden   = null;
var _filtroBuscar  = '';

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const selector = document.getElementById('fecha-selector');

    // Setear hoy
    const hoy = new Date();
    selector.value = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    await cargarHistorial(selector.value);

    // Cambio de fecha manual
    selector.addEventListener('change', () => resetYCargar(selector.value));

    // ── Flechas navegación ────────────────────────────
    document.getElementById('btn-anterior').addEventListener('click', () => {
        selector.value = offsetFecha(selector.value, -1);
        resetYCargar(selector.value);
    });

    document.getElementById('btn-siguiente').addEventListener('click', () => {
        const nueva = offsetFecha(selector.value, +1);
        // No avanzar más allá de hoy
        const hoyStr = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
        if (nueva <= hoyStr) {
            selector.value = nueva;
            resetYCargar(selector.value);
        }
    });

    // Chips
    document.querySelectorAll('.filtro-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.dataset.tipo !== undefined) {
                _filtroTipo  = chip.dataset.tipo;
                _filtroOrden = null;
            } else if (chip.dataset.orden !== undefined) {
                _filtroOrden = chip.dataset.orden;
                _filtroTipo  = 'todos';
            }
            sincronizarChips();
            aplicarFiltros();
        });
    });

    // Buscador
    document.getElementById('buscador-hist').addEventListener('input', e => {
        _filtroBuscar = e.target.value.toLowerCase().trim();
        aplicarFiltros();
    });

    // Exportar CSV
    document.getElementById('btn-exportar').addEventListener('click', exportarCSV);

    lucide.createIcons();
});


// ── Helpers de fecha ──────────────────────────────────
function offsetFecha(fechaStr, dias) {
    const d = new Date(fechaStr + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function resetYCargar(fechaStr) {
    _filtroTipo   = 'todos';
    _filtroOrden  = null;
    _filtroBuscar = '';
    sincronizarChips();
    document.getElementById('buscador-hist').value = '';
    cargarHistorial(fechaStr);
}


// ── Carga principal ───────────────────────────────────
async function cargarHistorial(fechaStr) {
    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        const todos = await getTodosLosMovimientos();
        const { inicio, fin } = fechaInputARango(fechaStr);
        _movimientosDia = todos.filter(m => m.fecha >= inicio && m.fecha <= fin);

        renderResumen(_movimientosDia);
        aplicarFiltros();

        // Deshabilitar botón "siguiente" si ya es hoy
        actualizarBtnSiguiente(fechaStr);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
}

function actualizarBtnSiguiente(fechaStr) {
    const btn = document.getElementById('btn-siguiente');
    if (!btn) return;
    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');
    btn.disabled = fechaStr >= hoyStr;
}


// ── Aplicar filtros ───────────────────────────────────
function aplicarFiltros() {
    var resultado = _movimientosDia.slice();

    if (_filtroTipo !== 'todos') resultado = resultado.filter(m => m.tipo === _filtroTipo);
    if (_filtroBuscar) resultado = resultado.filter(m => m.persona.toLowerCase().includes(_filtroBuscar));
    if (_filtroOrden === 'monto-desc') resultado.sort((a, b) => Number(b.monto) - Number(a.monto));
    else if (_filtroOrden === 'monto-asc') resultado.sort((a, b) => Number(a.monto) - Number(b.monto));

    renderTabla(resultado, document.getElementById('fecha-selector').value);
}


// ── Sincronizar chips ─────────────────────────────────
function sincronizarChips() {
    document.querySelectorAll('.filtro-chip').forEach(chip => {
        var esActivo = false;
        if (chip.dataset.tipo !== undefined)   esActivo = chip.dataset.tipo === _filtroTipo && !_filtroOrden;
        else if (chip.dataset.orden !== undefined) esActivo = chip.dataset.orden === _filtroOrden;
        chip.classList.toggle('activo', esActivo);
    });
}


// ── Resumen + Donut ───────────────────────────────────
function renderResumen(movimientos) {
    const totalFiado  = movimientos.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
    const totalPagado = movimientos.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const diferencia  = totalFiado - totalPagado;

    // Valores de texto
    const vFiado = document.getElementById('val-fiado');
    const vPago  = document.getElementById('val-pago');
    const vDif   = document.getElementById('val-diferencia');

    if (vFiado) vFiado.textContent = formatearMonto(totalFiado);
    if (vPago)  vPago.textContent  = formatearMonto(totalPagado);

    if (vDif) {
        if (diferencia > 0)      { vDif.textContent = '- ' + formatearMonto(diferencia);         vDif.className = 'resumen-valor deuda'; }
        else if (diferencia < 0) { vDif.textContent = '+ ' + formatearMonto(Math.abs(diferencia)); vDif.className = 'resumen-valor pago'; }
        else                     { vDif.textContent = formatearMonto(0);                           vDif.className = 'resumen-valor neutro'; }
    }

    // Donut
    renderDonut(totalFiado, totalPagado);
}

function renderDonut(fiado, pago) {
    const total = fiado + pago;
    const C = 2 * Math.PI * 15; // circunferencia r=15 → ≈ 94.25

    const elFiado  = document.getElementById('donut-fiado');
    const elPago   = document.getElementById('donut-pago');
    const elLabel  = document.getElementById('donut-label');
    if (!elFiado || !elPago || !elLabel) return;

    if (total === 0) {
        elFiado.setAttribute('stroke-dasharray', '0 ' + C);
        elPago.setAttribute('stroke-dasharray',  '0 ' + C);
        elLabel.textContent = '—';
        return;
    }

    const pctFiado = fiado / total;
    const pctPago  = pago  / total;

    const arcFiado = pctFiado * C;
    const arcPago  = pctPago  * C;

    // Fiado arranca en la posición 12 en punto (offset = C/4 desde el inicio SVG)
    // Pago arranca justo después del arco fiado
    const offsetFiado = C / 4;                          // 12 en punto
    const offsetPago  = C / 4 - arcFiado;               // continúa tras fiado

    elFiado.setAttribute('stroke-dasharray',  arcFiado  + ' ' + (C - arcFiado));
    elFiado.setAttribute('stroke-dashoffset', offsetFiado);

    elPago.setAttribute('stroke-dasharray',  arcPago  + ' ' + (C - arcPago));
    elPago.setAttribute('stroke-dashoffset', offsetPago);

    // Label: porcentaje del tipo dominante
    if (fiado >= pago) {
        elLabel.textContent = Math.round(pctFiado * 100) + '% F';
        elLabel.style.color = '#c0392b';
    } else {
        elLabel.textContent = Math.round(pctPago * 100) + '% P';
        elLabel.style.color = '#27ae60';
    }
}


// ── Tabla + Total al pie ──────────────────────────────
function renderTabla(movimientos, fechaStr) {
    const tituloEl = document.querySelector('.movimientos-titulo');
    const countEl  = document.querySelector('.movimientos-count');
    const tbody    = document.querySelector('.tabla-movimientos tbody');
    const tfoot    = document.getElementById('tabla-tfoot');

    if (tituloEl) tituloEl.textContent = fechaInputALarga(fechaStr);
    if (countEl)  countEl.textContent  = movimientos.length + ' registro' + (movimientos.length !== 1 ? 's' : '');

    if (!tbody) return;

    if (!movimientos.length) {
        const msg = _filtroBuscar || _filtroTipo !== 'todos' || _filtroOrden
            ? 'Sin resultados para este filtro'
            : 'Sin movimientos en este día';
        tbody.innerHTML = '<tr><td colspan="5" class="sin-resultados">' + msg + '</td></tr>';
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    tbody.innerHTML = movimientos.map(m => {
        return '<tr>' +
            '<td class="persona-cell">' +
                '<span class="mini-avatar">' + iniciales(m.persona) + '</span>' +
                m.persona +
            '</td>' +
            '<td><span class="badge ' + m.tipo.toLowerCase() + '">' + m.tipo + '</span></td>' +
            '<td class="monto ' + m.tipo.toLowerCase() + '">' + formatearMonto(Number(m.monto)) + '</td>' +
            '<td class="hora">' + formatearHora(m.fecha) + '</td>' +
            '<td class="nota">' + (m.nota || '—') + '</td>' +
        '</tr>';
    }).join('');

    // ── Total al pie (subtotal del filtro activo) ─────
    if (tfoot) {
        const subtotalFiado  = movimientos.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
        const subtotalPago   = movimientos.filter(m => m.tipo === 'PAGO').reduce((s, m)  => s + Number(m.monto), 0);

        const hayFiltro = _filtroTipo !== 'todos' || _filtroBuscar || _filtroOrden;
        const labelPie  = hayFiltro ? 'Subtotal filtrado' : 'Total del día';

        // Mostrar uno o dos renglones según si hay ambos tipos
        const filas = [];
        if (subtotalFiado > 0) {
            filas.push('<tr class="tfoot-row">' +
                '<td colspan="2" class="tfoot-label">' + labelPie + '</td>' +
                '<td class="tfoot-valor fiado">' + formatearMonto(subtotalFiado) + '</td>' +
                '<td colspan="2" class="tfoot-tipo"><span class="badge fiado">FIADO</span></td>' +
            '</tr>');
        }
        if (subtotalPago > 0) {
            filas.push('<tr class="tfoot-row">' +
                '<td colspan="2" class="tfoot-label">' + (filas.length ? '' : labelPie) + '</td>' +
                '<td class="tfoot-valor pago">' + formatearMonto(subtotalPago) + '</td>' +
                '<td colspan="2" class="tfoot-tipo"><span class="badge pago">PAGO</span></td>' +
            '</tr>');
        }
        tfoot.innerHTML = filas.join('');
    }
}


// ── Exportar CSV ──────────────────────────────────────
function exportarCSV() {
    var movimientos = _movimientosDia;
    if (!movimientos.length) return;

    var fechaStr = document.getElementById('fecha-selector').value;
    var filas = [['Persona', 'Tipo', 'Monto (S/)', 'Hora', 'Nota']];
    movimientos.forEach(m => {
        filas.push([
            '"' + m.persona + '"', m.tipo,
            (Number(m.monto) / 100).toFixed(2),
            formatearHora(m.fecha),
            '"' + (m.nota || '') + '"'
        ]);
    });

    var csv  = filas.map(f => f.join(',')).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'historial-' + fechaStr + '.csv'; a.click();
    URL.revokeObjectURL(url);
}


// ── Error ─────────────────────────────────────────────
function mostrarError(msg) {
    const tbody = document.querySelector('.tabla-movimientos tbody');
    if (tbody) tbody.innerHTML =
        '<tr><td colspan="5">' +
            '<div class="error-estado">' +
                '<p class="error-titulo">No se pudo cargar el historial</p>' +
                '<p class="error-detalle">' + msg + '</p>' +
                '<button onclick="location.reload()">Reintentar</button>' +
            '</div>' +
        '</td></tr>';
}