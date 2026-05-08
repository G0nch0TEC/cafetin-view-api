// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const todos = await getTodosLosMovimientos();

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const movimientosHoy = todos.filter(m => {
        const fecha = new Date(m.fecha);
        fecha.setHours(0,0,0,0);
        return fecha.getTime() === hoy.getTime();
    });

    renderUltimosMovimientos(movimientosHoy.slice(0, 5));
});


//Mostrar los movimientos del dia
function renderUltimosMovimientos(movimientos) {
    const contenedor = document.getElementById('mov-lista');
        if (!movimientos.length) {
            contenedor.innerHTML = `<p class="mov-datos">Sin movimientos hoy</p>`
            return;
        }
        
        contenedor.innerHTML = movimientos.map(m => `
        <div class="mov-item">

            <div class="mini-avatar">
                ${iniciales(m.persona)}
            </div>

            <div class="mov-datos">
                <span class="mov-nombre">${m.persona}</span>
                <span class="mov-nota">${m.nota || '—'}</span>
            </div>

            <div class="mov-right">
                <span class="mov-monto ${m.tipo.toLowerCase()}">
                    ${formatearMonto(m.monto)}
                </span>
                <span class="mov-hora">${formatearHora(m.fecha)}</span>
            </div>

        </div>
    `).join('');
}

//Deudores
function renderPersonas(personas) {
    const lista = document.getElementById('deudores-lista');

    if (!personas.length) {
        lista.innerHTML = `<p>Aun no hay deudores</p>`;
        return;
    }

    lista.innerHTML = personas.map(p =>{
        const saldo = Number(p.saldo);
        const { clase, chip } = estadoSaldo(saldo);
        
        return `
        <div class="deudor-row">

            <div class="mini-avatar">
                ${iniciales(p.persona)}
            </div>

            <div class="mov-datos">
                <span class="deudor-nombre">${p.persona}</span>
            </div>

            <div class="mov-right">
                <span class="deudor-monto ${p.tipo.toLowerCase()}">
                    ${formatearMonto(p.monto)}
                </span>
                <span class="mov-hora">${formatearHora(p.fecha)}</span>
            </div>

        </div>`;
    }).join('');

    lucide.createIcons();
}


// ── Helpers ───────────────────────────────────────────
function estadoSaldo(saldo) {
    if (saldo > 0)  return { clase: 'deuda',            chip: formatearMonto(saldo)}
    if (saldo < 0)  return { clase: 'al-dia',           chip: 'A favor' };
                    return { clase: 'sin-movimientos',  chip: 'Sin mov.' };
}