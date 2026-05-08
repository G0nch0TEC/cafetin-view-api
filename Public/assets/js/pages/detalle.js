// ══════════════════════════════════════════════════════
//  DETALLE — con fetch real
//  Public/assets/js/pages/detalle.js
//
//  Depende de:  api.js  → getPersonas(), getMovimientosPorPersona()
//               utils.js → iniciales(), formatearMonto(),
//                          formatearFechaHora(), obtenerParamUrl()
// ══════════════════════════════════════════════════════

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const personaId = obtenerParamUrl('id');

    if (!personaId) {
        mostrarError('No se especificó ninguna persona.');
        return;
    }

    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        // Carga en paralelo persona (desde lista) y sus movimientos
        const [personas, movimientos] = await Promise.all([
            getPersonas(),
            getMovimientosPorPersona(personaId)
        ]);

        const persona = personas.find(p => String(p.id) === String(personaId));
        if (!persona) throw new Error('Persona no encontrada.');

        renderCabecera(persona);
        renderResumen(movimientos);
        renderTabla(movimientos);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        ocultarLoader();
    }
});

// ── Cabecera ──────────────────────────────────────────
function renderCabecera(persona) {
    const saldo = Number(persona.saldo);

    const avatarEl = document.querySelector('.persona-header .persona-avatar');
    const nombreEl = document.querySelector('.persona-header .persona-nombre');
    const saldoBadge = document.querySelector('.saldo-badge');

    if (avatarEl) avatarEl.textContent = iniciales(persona.nombre);
    if (nombreEl) nombreEl.textContent  = persona.nombre;

    if (saldoBadge) {
        const montoEl = saldoBadge.querySelector('.saldo-monto');
        if (saldo > 0) {
            saldoBadge.className = 'saldo-badge deuda';
            if (montoEl) montoEl.textContent = formatearMonto(saldo);
        } else if (saldo < 0) {
            saldoBadge.className = 'saldo-badge al-dia';
            if (montoEl) montoEl.textContent = `A favor ${formatearMonto(Math.abs(saldo))}`;
        } else {
            saldoBadge.className = 'saldo-badge al-dia';
            if (montoEl) montoEl.textContent = 'Al día';
        }
    }

    // Título de pestaña
    document.title = `Detalle — ${persona.nombre}`;
}

// ── Resumen ───────────────────────────────────────────
function renderResumen(movimientos) {
    const totalFiado  = movimientos.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
    const totalPagado = movimientos.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);

    const tarjetas = document.querySelectorAll('.resumen-grid .resumen-valor');
    if (tarjetas.length < 3) return;

    tarjetas[0].textContent = formatearMonto(totalFiado);
    tarjetas[1].textContent = formatearMonto(totalPagado);
    tarjetas[2].textContent = movimientos.length;
}

// ── Tabla ─────────────────────────────────────────────
function renderTabla(movimientos) {
    const countEl = document.querySelector('.movimientos-count');
    const tbody    = document.querySelector('.tabla-movimientos tbody');

    if (countEl) countEl.textContent = `${movimientos.length} registro${movimientos.length !== 1 ? 's' : ''}`;
    if (!tbody) return;

    if (!movimientos.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="sin-resultados">Sin movimientos registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = movimientos.map(m => `
        <tr>
            <td><span class="badge ${m.tipo.toLowerCase()}">${m.tipo}</span></td>
            <td class="monto ${m.tipo.toLowerCase()}">${formatearMonto(Number(m.monto))}</td>
            <td class="fecha">${formatearFechaHora(m.fecha)}</td>
            <td class="nota">${m.nota || '—'}</td>
        </tr>
    `).join('');
}

// ── Error ─────────────────────────────────────────────
function mostrarError(msg) {
    document.querySelector('main').innerHTML += `
        <div class="error-estado">
            <p class="error-titulo">No se pudo cargar el detalle</p>
            <p class="error-detalle">${msg}</p>
            <button onclick="history.back()">Volver</button>
        </div>`;
}