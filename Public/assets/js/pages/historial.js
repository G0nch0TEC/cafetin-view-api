// ══════════════════════════════════════════════════════
//  HISTORIAL — con fetch real
//  Public/assets/js/pages/historial.js
//
//  Depende de:  api.js  → getTodosLosMovimientos()
//               utils.js → formatearMonto(), formatearHora(),
//                          fechaInputARango(), fechaInputALarga()
// ══════════════════════════════════════════════════════

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const selector = document.getElementById('fecha-selector');

    // Fecha de hoy por defecto
    const hoy = new Date();
    selector.value = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

    await cargarHistorial(selector.value);

    selector.addEventListener('change', () => cargarHistorial(selector.value));
});

// ── Carga principal ───────────────────────────────────
async function cargarHistorial(fechaStr) {
    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        const todos = await getTodosLosMovimientos();

        const { inicio, fin } = fechaInputARango(fechaStr);
        const movimientos = todos.filter(m => m.fecha >= inicio && m.fecha <= fin);

        renderResumen(movimientos);
        renderTabla(movimientos, fechaStr);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
}

// ── Resumen del día ───────────────────────────────────
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
        difEl.textContent = `- ${formatearMonto(diferencia)}`;
        difEl.className = 'resumen-valor deuda';
    } else if (diferencia < 0) {
        difEl.textContent = `+ ${formatearMonto(Math.abs(diferencia))}`;
        difEl.className = 'resumen-valor pago';
    } else {
        difEl.textContent = formatearMonto(0);
        difEl.className = 'resumen-valor neutro';
    }

    tarjetas[3].textContent = movimientos.length;
}

// ── Tabla de movimientos ──────────────────────────────
function renderTabla(movimientos, fechaStr) {
    const tituloEl = document.querySelector('.movimientos-titulo');
    const countEl  = document.querySelector('.movimientos-count');
    const tbody     = document.querySelector('.tabla-movimientos tbody');

    if (tituloEl) tituloEl.textContent = fechaInputALarga(fechaStr);
    if (countEl)  countEl.textContent  = `${movimientos.length} registro${movimientos.length !== 1 ? 's' : ''}`;

    if (!tbody) return;

    if (!movimientos.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="sin-resultados">Sin movimientos en este día</td></tr>`;
        return;
    }

    tbody.innerHTML = movimientos.map(m => `
        <tr>
            <td class="persona-cell">
                <span class="mini-avatar">${iniciales(m.persona)}</span>
                ${m.persona}
            </td>
            <td><span class="badge ${m.tipo.toLowerCase()}">${m.tipo}</span></td>
            <td class="monto ${m.tipo.toLowerCase()}">${formatearMonto(Number(m.monto))}</td>
            <td class="hora">${formatearHora(m.fecha)}</td>
            <td class="nota">${m.nota || '—'}</td>
        </tr>
    `).join('');
}

// ── Error ─────────────────────────────────────────────
function mostrarError(msg) {
    const tbody = document.querySelector('.tabla-movimientos tbody');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="5">
            <div class="error-estado">
                <p class="error-titulo">No se pudo cargar el historial</p>
                <p class="error-detalle">${msg}</p>
                <button onclick="location.reload()">Reintentar</button>
            </div>
        </td></tr>`;
}