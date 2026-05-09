// ══════════════════════════════════════════════════════
//  HISTORIAL — con filtros, buscador y exportar CSV
//  Public/assets/js/pages/historial.js
//
//  Depende de:  api.js  → getTodosLosMovimientos()
//               utils.js → formatearMonto(), formatearHora(),
//                          fechaInputARango(), fechaInputALarga(),
//                          iniciales()
// ══════════════════════════════════════════════════════

// ── Estado de filtros (módulo) ────────────────────────
var _movimientosDia = [];   // todos los del día seleccionado
var _filtroTipo    = 'todos';
var _filtroOrden   = null;
var _filtroBuscar  = '';

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const selector = document.getElementById('fecha-selector');

    const hoy = new Date();
    selector.value = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    await cargarHistorial(selector.value);

    selector.addEventListener('change', () => {
        _filtroTipo   = 'todos';
        _filtroOrden  = null;
        _filtroBuscar = '';
        sincronizarChips();
        document.getElementById('buscador-hist').value = '';
        cargarHistorial(selector.value);
    });

    // Chips de filtro
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

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
}

// ── Aplicar filtros sobre _movimientosDia ─────────────
function aplicarFiltros() {
    var resultado = _movimientosDia.slice();

    // Filtro tipo
    if (_filtroTipo !== 'todos') {
        resultado = resultado.filter(m => m.tipo === _filtroTipo);
    }

    // Filtro búsqueda
    if (_filtroBuscar) {
        resultado = resultado.filter(m =>
            m.persona.toLowerCase().includes(_filtroBuscar)
        );
    }

    // Ordenar
    if (_filtroOrden === 'monto-desc') {
        resultado.sort((a, b) => Number(b.monto) - Number(a.monto));
    } else if (_filtroOrden === 'monto-asc') {
        resultado.sort((a, b) => Number(a.monto) - Number(b.monto));
    }

    renderTabla(resultado, document.getElementById('fecha-selector').value);
}

// ── Sincronizar estado visual de chips ────────────────
function sincronizarChips() {
    document.querySelectorAll('.filtro-chip').forEach(chip => {
        var esActivo = false;
        if (chip.dataset.tipo !== undefined) {
            esActivo = chip.dataset.tipo === _filtroTipo && !_filtroOrden;
        } else if (chip.dataset.orden !== undefined) {
            esActivo = chip.dataset.orden === _filtroOrden;
        }
        chip.classList.toggle('activo', esActivo);
    });
}

// ── Resumen del día (siempre sobre todos, sin filtros) ─
function renderResumen(movimientos) {
    const totalFiado  = movimientos.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
    const totalPagado = movimientos.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const diferencia  = totalFiado - totalPagado;

    const tarjetas = document.querySelectorAll('.resumen-card .resumen-valor');
    if (tarjetas.length < 4) return;

    tarjetas[0].textContent = formatearMonto(totalFiado);
    tarjetas[1].textContent = formatearMonto(totalPagado);

    const difEl = tarjetas[2];
    if (diferencia > 0) {
        difEl.textContent = '- ' + formatearMonto(diferencia);
        difEl.className = 'resumen-valor deuda';
    } else if (diferencia < 0) {
        difEl.textContent = '+ ' + formatearMonto(Math.abs(diferencia));
        difEl.className = 'resumen-valor pago';
    } else {
        difEl.textContent = formatearMonto(0);
        difEl.className = 'resumen-valor neutro';
    }

    tarjetas[3].textContent = movimientos.length;
}

// ── Tabla ─────────────────────────────────────────────
function renderTabla(movimientos, fechaStr) {
    const tituloEl = document.querySelector('.movimientos-titulo');
    const countEl  = document.querySelector('.movimientos-count');
    const tbody    = document.querySelector('.tabla-movimientos tbody');

    if (tituloEl) tituloEl.textContent = fechaInputALarga(fechaStr);
    if (countEl)  countEl.textContent  =
        movimientos.length + ' registro' + (movimientos.length !== 1 ? 's' : '');

    if (!tbody) return;

    if (!movimientos.length) {
        const msg = _filtroBuscar || _filtroTipo !== 'todos' || _filtroOrden
            ? 'Sin resultados para este filtro'
            : 'Sin movimientos en este día';
        tbody.innerHTML = '<tr><td colspan="5" class="sin-resultados">' + msg + '</td></tr>';
        return;
    }

    tbody.innerHTML = movimientos.map(m => {
        const highlight = _filtroBuscar ? ' class="match-highlight"' : '';
        return '<tr' + highlight + '>' +
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
}

// ── Exportar CSV ──────────────────────────────────────
function exportarCSV() {
    var movimientos = _movimientosDia;
    if (!movimientos.length) return;

    var fechaStr = document.getElementById('fecha-selector').value;
    var filas = [['Persona', 'Tipo', 'Monto (S/)', 'Hora', 'Nota']];

    movimientos.forEach(m => {
        filas.push([
            '"' + m.persona + '"',
            m.tipo,
            (Number(m.monto) / 100).toFixed(2),
            formatearHora(m.fecha),
            '"' + (m.nota || '') + '"'
        ]);
    });

    var csv = filas.map(f => f.join(',')).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'historial-' + fechaStr + '.csv';
    a.click();
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