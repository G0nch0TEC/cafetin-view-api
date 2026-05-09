// ══════════════════════════════════════════════════════
//  INICIO / DASHBOARD — main.js  (mejorado)
//  Mejoras:
//   1. Gráfico barras 7 días (cobrado vs fiado)
//   2. Mini-sparklines en métricas
//   3. Barra proporcional en deudores
//   4. Indicador de frescura de datos
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

    renderSaludo();

    await new Promise(r => setTimeout(r, 50));
    mostrarLoader();

    try {
        const [todos, personas] = await Promise.all([
            getTodosLosMovimientos(),
            getPersonas()
        ]);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const movimientosHoy = todos.filter(m => {
            const fecha = new Date(m.fecha);
            fecha.setHours(0, 0, 0, 0);
            return fecha.getTime() === hoy.getTime();
        });

        // ── Datos de los últimos 7 días ────────────────
        const datosSemana = calcularDatosSemana(todos);

        // ── Métricas ───────────────────────────────────
        const deudaTotal    = personas.reduce((acc, p) => acc + Math.max(0, Number(p.saldo)), 0);
        const cobradoHoy    = movimientosHoy.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
        const fiadoHoy      = movimientosHoy.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
        const totalPersonas = personas.length;

        renderMetricas({ deudaTotal, cobradoHoy, fiadoHoy, totalPersonas, movimientosHoy });
        renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal });
        renderUltimosMovimientos(movimientosHoy.slice(0, 5));
        renderRanking(movimientosHoy);

        // Sparklines
        renderSparklines(datosSemana, movimientosHoy, personas);

        // Gráfico 7 días
        renderGrafico7Dias(datosSemana);

        // Top deudores con barra proporcional
        const deudores = [...personas]
            .filter(p => Number(p.saldo) > 0)
            .sort((a, b) => Number(b.saldo) - Number(a.saldo))
            .slice(0, 4);
        renderDeudores(deudores);

        // Frescura de datos
        renderFrescura();

    } catch (err) {
        console.error('Error cargando el dashboard:', err.message);
        document.getElementById('mov-lista').innerHTML =
            '<p class="mov-nota" style="padding:1rem">No se pudo conectar con la API</p>';
        document.getElementById('deudores-lista').innerHTML =
            '<p class="mov-nota" style="padding:1rem">Sin datos disponibles</p>';
    } finally {
        ocultarLoader();
    }
});


// ── Saludo dinámico ───────────────────────────────────
function renderSaludo() {
    const hora = new Date().getHours();
    let saludo = 'Buenas noches';
    if (hora >= 5  && hora < 12) saludo = 'Buenos días';
    else if (hora >= 12 && hora < 19) saludo = 'Buenas tardes';

    const titulo    = document.querySelector('.page-title');
    const subtitulo = document.querySelector('.page-subtitle');
    if (titulo)    titulo.textContent    = saludo + ' 👋';
    if (subtitulo) subtitulo.textContent = 'Resumen del ' + formatearFechaLarga(Date.now());
}


// ── Métricas ──────────────────────────────────────────
function renderMetricas({ deudaTotal, cobradoHoy, fiadoHoy, totalPersonas, movimientosHoy }) {
    const tarjetas = document.querySelectorAll('.metrica-card');

    const tDeuda = tarjetas[0];
    if (tDeuda) {
        tDeuda.querySelector('.metrica-valor').textContent = formatearMonto(deudaTotal);
        tDeuda.querySelector('.metrica-sub').textContent   = movimientosHoy.length + ' mov. hoy';
    }

    const tPago = tarjetas[1];
    if (tPago) {
        const pagos = movimientosHoy.filter(m => m.tipo === 'PAGO').length;
        tPago.querySelector('.metrica-valor').textContent = formatearMonto(cobradoHoy);
        tPago.querySelector('.metrica-sub').textContent   = pagos + ' pago' + (pagos !== 1 ? 's' : '') + ' recibido' + (pagos !== 1 ? 's' : '');
    }

    const tFiado = tarjetas[2];
    if (tFiado) {
        const fiados = movimientosHoy.filter(m => m.tipo === 'FIADO').length;
        tFiado.querySelector('.metrica-valor').textContent = formatearMonto(fiadoHoy);
        tFiado.querySelector('.metrica-sub').textContent   = fiados + ' fiado' + (fiados !== 1 ? 's' : '') + ' registrado' + (fiados !== 1 ? 's' : '');
    }

    const tPersonas = tarjetas[3];
    if (tPersonas) {
        tPersonas.querySelector('.metrica-valor').textContent = totalPersonas;
        tPersonas.querySelector('.metrica-sub').textContent   = 'cliente' + (totalPersonas !== 1 ? 's' : '') + ' registrado' + (totalPersonas !== 1 ? 's' : '');
    }
}


// ── Calcular datos de los últimos 7 días ─────────────
function calcularDatosSemana(todos) {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const siguiente = new Date(d);
        siguiente.setDate(d.getDate() + 1);

        const movsDia = todos.filter(m => m.fecha >= d.getTime() && m.fecha < siguiente.getTime());
        dias.push({
            fecha: d,
            label: d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
            cobrado: movsDia.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0),
            fiado:   movsDia.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0),
            movs:    movsDia.length
        });
    }
    return dias;
}


// ── Sparklines en tarjetas métricas ──────────────────
function renderSparklines(datosSemana, movimientosHoy, personas) {
    // Spark Cobrado (últimos 7 días de cobros)
    dibujarSpark('spark-cobrado', datosSemana.map(d => d.cobrado), '#27ae60');

    // Spark Fiado (últimos 7 días de fiados)
    dibujarSpark('spark-fiado', datosSemana.map(d => d.fiado), '#e67e22');

    // Spark Deuda: usar movimientos de semana como tendencia
    dibujarSpark('spark-deuda', datosSemana.map(d => d.cobrado + d.fiado), '#c0392b');

    // Spark Personas: actividad diaria por personas únicas
    dibujarSpark('spark-personas', datosSemana.map(d => d.movs), '#7c3aed');
}

function dibujarSpark(id, valores, color) {
    const svg = document.getElementById(id);
    if (!svg) return;

    const W = 60, H = 20, PAD = 2;
    const max = Math.max(...valores, 1);
    const n = valores.length;
    const stepX = (W - PAD * 2) / (n - 1);

    const puntos = valores.map((v, i) => {
        const x = PAD + i * stepX;
        const y = H - PAD - ((v / max) * (H - PAD * 2));
        return `${x},${y}`;
    });

    // Área rellena
    const areaPath = `M${puntos[0]} L${puntos.join(' L')} L${PAD + (n-1)*stepX},${H-PAD} L${PAD},${H-PAD} Z`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="grad-${id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="${color}" stop-opacity="0.03"/>
            </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#grad-${id})"/>
        <polyline points="${puntos.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${puntos[n-1].split(',')[0]}" cy="${puntos[n-1].split(',')[1]}" r="2" fill="${color}"/>
    `;
}


// ── Gráfico de barras 7 días ──────────────────────────
function renderGrafico7Dias(datosSemana) {
    const contenedor = document.getElementById('semana-chart');
    if (!contenedor) return;

    const maxVal = Math.max(...datosSemana.map(d => Math.max(d.cobrado, d.fiado)), 1);

    contenedor.innerHTML = datosSemana.map(function(dia, i) {
        const pctCobrado = Math.round((dia.cobrado / maxVal) * 100);
        const pctFiado   = Math.round((dia.fiado   / maxVal) * 100);
        const esHoy = i === 6;

        return '<div class="chart-col' + (esHoy ? ' hoy' : '') + '">' +
            '<div class="chart-bars">' +
                '<div class="chart-bar-wrap">' +
                    '<div class="chart-bar cobrado" style="height:' + pctCobrado + '%" title="Cobrado: ' + formatearMonto(dia.cobrado) + '"></div>' +
                '</div>' +
                '<div class="chart-bar-wrap">' +
                    '<div class="chart-bar fiado" style="height:' + pctFiado + '%" title="Fiado: ' + formatearMonto(dia.fiado) + '"></div>' +
                '</div>' +
            '</div>' +
            '<span class="chart-label">' + (esHoy ? 'Hoy' : dia.label) + '</span>' +
        '</div>';
    }).join('');
}


// ── Frescura de datos ─────────────────────────────────
function renderFrescura() {
    const el = document.getElementById('freshness-text');
    const container = document.getElementById('data-freshness');
    if (!el) return;

    const ahora = new Date();
    const hora  = String(ahora.getHours()).padStart(2, '0');
    const min   = String(ahora.getMinutes()).padStart(2, '0');
    el.textContent = 'Datos actualizados hoy a las ' + hora + ':' + min;
    if (container) container.classList.add('loaded');
    lucide.createIcons();
}


// ── Movimientos recientes ─────────────────────────────
function renderUltimosMovimientos(movimientos) {
    const contenedor = document.getElementById('mov-lista');
    if (!contenedor) return;

    if (!movimientos.length) {
        contenedor.innerHTML = '<p class="mov-nota" style="padding:1rem;color:#b89fcc;">Sin movimientos hoy</p>';
        return;
    }

    contenedor.innerHTML = movimientos.map(function(m) {
        return '<div class="mov-item">' +
            '<div class="mini-avatar">' + iniciales(m.persona) + '</div>' +
            '<div class="mov-datos">' +
                '<span class="mov-nombre">' + m.persona + '</span>' +
                '<span class="mov-nota">' + (m.nota || '—') + '</span>' +
            '</div>' +
            '<div class="mov-right">' +
                '<span class="mov-monto ' + m.tipo.toLowerCase() + '">' + formatearMonto(Number(m.monto)) + '</span>' +
                '<span class="mov-hora">' + formatearHora(m.fecha) + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}


// ── Top deudores con barra proporcional ──────────────
function renderDeudores(personas) {
    const lista = document.getElementById('deudores-lista');
    if (!lista) return;

    if (!personas.length) {
        lista.innerHTML = '<p class="mov-nota" style="padding:1rem;color:#b89fcc;">Sin deudas pendientes 🎉</p>';
        return;
    }

    const maxSaldo = Math.max(...personas.map(p => Number(p.saldo)), 1);

    lista.innerHTML = personas.map(function(p) {
        const pct = Math.round((Number(p.saldo) / maxSaldo) * 100);
        return '<a href="pages/detalle.html?id=' + p.id + '&from=index" class="deudor-row">' +
            '<div class="mini-avatar">' + iniciales(p.nombre) + '</div>' +
            '<div class="deudor-datos">' +
                '<div class="deudor-top">' +
                    '<span class="deudor-nombre">' + p.nombre + '</span>' +
                    '<span class="deudor-monto">' + formatearMonto(Number(p.saldo)) + '</span>' +
                '</div>' +
                '<div class="deudor-barra-wrap">' +
                    '<div class="deudor-barra" style="width:' + pct + '%"></div>' +
                '</div>' +
            '</div>' +
        '</a>';
    }).join('');

    lucide.createIcons();
}


// ── Helpers ───────────────────────────────────────────
function formatearFechaLarga(timestampMs) {
    return new Date(timestampMs).toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}


// ── Insights slider ───────────────────────────────────
function renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal }) {
    const track = document.getElementById('insights-track');
    const dotsEl = document.getElementById('insights-dots');
    if (!track || !dotsEl) return;

    const ahora = new Date();
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - 6);
    inicioSemana.setHours(0, 0, 0, 0);

    const movsSemana = todos.filter(m => m.fecha >= inicioSemana.getTime());
    const cobradoSemana = movsSemana.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);

    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
    const movsSemanaAnterior = todos.filter(m =>
        m.fecha >= inicioSemanaAnterior.getTime() && m.fecha < inicioSemana.getTime()
    );
    const cobradoSemanaAnterior = movsSemanaAnterior.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const difSemana = cobradoSemanaAnterior > 0
        ? Math.round(((cobradoSemana - cobradoSemanaAnterior) / cobradoSemanaAnterior) * 100)
        : null;

    const notasHoy = movimientosHoy.filter(m => m.tipo === 'FIADO' && m.nota && m.nota.trim()).map(m => m.nota.trim().toLowerCase());
    let topProducto = null, topCount = 0;
    if (notasHoy.length) {
        const conteo = {};
        notasHoy.forEach(n => { conteo[n] = (conteo[n] || 0) + 1; });
        const entrada = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
        if (entrada) { topProducto = entrada[0].charAt(0).toUpperCase() + entrada[0].slice(1); topCount = entrada[1]; }
    }

    const activosIds = new Set(movsSemana.map(m => m.personaId));
    const inactivos = personas.filter(p => !activosIds.has(p.id) && !activosIds.has(String(p.id)));

    const balance = cobradoHoy - fiadoHoy;
    const tendenciaPositiva = balance >= 0;

    const tarjetas = [];

    const badgeSemana = difSemana !== null
        ? { texto: (difSemana >= 0 ? '+' : '') + difSemana + '%', clase: difSemana >= 0 ? 'positivo' : 'negativo' }
        : { texto: 'Esta semana', clase: 'neutro' };

    tarjetas.push({ clase: 'semana', icono: 'bar-chart-2', label: 'Recaudado esta semana', valor: formatearMonto(cobradoSemana), sub: movsSemana.length + ' movimientos en 7 días', badge: badgeSemana });

    if (topProducto) {
        tarjetas.push({ clase: 'top', icono: 'star', label: 'Más pedido hoy', valor: topProducto, sub: topCount + (topCount === 1 ? ' vez registrada' : ' veces registrado'), badge: { texto: '🔥 Top', clase: 'alerta' } });
    }

    tarjetas.push({ clase: 'tendencia', icono: tendenciaPositiva ? 'trending-up' : 'trending-down', label: 'Balance de hoy', valor: formatearMonto(Math.abs(balance)), sub: tendenciaPositiva ? 'cobrado > fiado' : 'fiado > cobrado', badge: { texto: tendenciaPositiva ? 'A favor' : 'En rojo', clase: tendenciaPositiva ? 'positivo' : 'negativo' } });

    if (inactivos.length > 0) {
        tarjetas.push({ clase: 'alerta', icono: 'user-x', label: 'Sin movimiento esta semana', valor: inactivos.length + (inactivos.length === 1 ? ' persona' : ' personas'), sub: inactivos.slice(0, 2).map(p => p.nombre.split(' ')[0]).join(', ') + (inactivos.length > 2 ? '…' : ''), badge: { texto: 'Inactivos', clase: 'negativo' } });
    }

    tarjetas.push({ clase: 'semana', icono: 'credit-card', label: 'Deuda total acumulada', valor: formatearMonto(deudaTotal), sub: personas.filter(p => Number(p.saldo) > 0).length + ' clientes con saldo', badge: { texto: 'Pendiente', clase: 'neutro' } });

    track.innerHTML = tarjetas.map(function(t) {
        return '<div class="insight-card ' + t.clase + '">' +
            '<div class="insight-icon"><i data-lucide="' + t.icono + '"></i></div>' +
            '<div class="insight-body">' +
                '<span class="insight-label">' + t.label + '</span>' +
                '<span class="insight-valor">' + t.valor + '</span>' +
                '<span class="insight-sub">' + t.sub + '</span>' +
            '</div>' +
            '<span class="insight-badge ' + t.badge.clase + '">' + t.badge.texto + '</span>' +
        '</div>';
    }).join('');

    lucide.createIcons();
    iniciarSlider(tarjetas.length);
}


// ── Slider ────────────────────────────────────────────
function iniciarSlider(total) {
    const track  = document.getElementById('insights-track');
    const dotsEl = document.getElementById('insights-dots');
    if (!track || !dotsEl || total <= 3) { dotsEl.style.display = 'none'; return; }

    const visibles = 3, maxSlide = total - visibles;
    let current = 0;

    dotsEl.innerHTML = '';
    for (let i = 0; i <= maxSlide; i++) {
        const dot = document.createElement('button');
        dot.className = 'insight-dot' + (i === 0 ? ' activo' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', function() { irA(i); });
        dotsEl.appendChild(dot);
    }

    function irA(idx) {
        current = Math.max(0, Math.min(idx, maxSlide));
        const cardW = track.querySelector('.insight-card').offsetWidth + 12;
        track.style.transform = 'translateX(-' + (current * cardW) + 'px)';
        dotsEl.querySelectorAll('.insight-dot').forEach(function(d, i) { d.classList.toggle('activo', i === current); });
    }

    let startX = 0, startScroll = 0, dragging = false;

    function onDown(e) { dragging = true; startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX; startScroll = current; track.classList.add('grabbing'); }
    function onMove(e) {
        if (!dragging) return;
        const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const cardW = track.querySelector('.insight-card').offsetWidth + 12;
        const diff = startX - x;
        const rawIdx = startScroll + diff / cardW;
        track.style.transform = 'translateX(-' + (Math.max(0, Math.min(rawIdx, maxSlide)) * cardW) + 'px)';
    }
    function onUp(e) {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('grabbing');
        const x = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const diff = startX - x;
        irA(Math.abs(diff) > 40 ? (diff > 0 ? current + 1 : current - 1) : current);
    }

    track.addEventListener('mousedown',  onDown);
    track.addEventListener('mousemove',  onMove);
    track.addEventListener('mouseup',    onUp);
    track.addEventListener('mouseleave', onUp);
    track.addEventListener('touchstart', onDown, { passive: true });
    track.addEventListener('touchmove',  onMove, { passive: true });
    track.addEventListener('touchend',   onUp);

    setInterval(function() { if (!dragging) irA(current < maxSlide ? current + 1 : 0); }, 6000);
}


// ── Ranking ───────────────────────────────────────────
function renderRanking(movimientosHoy) {
    var lista = document.getElementById('ranking-lista');
    if (!lista) return;

    var conNota = movimientosHoy.filter(function(m) { return m.tipo === 'FIADO' && m.nota && m.nota.trim(); });

    if (!conNota.length) { lista.innerHTML = '<p class="ranking-vacio">Sin productos registrados hoy</p>'; return; }

    var conteo = {};
    conNota.forEach(function(m) { var c = m.nota.trim().toLowerCase(); conteo[c] = (conteo[c] || 0) + 1; });

    var ranking = Object.entries(conteo).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
    var maxCount = ranking[0][1];
    var medallas = ['🥇', '🥈', '🥉'];

    lista.innerHTML = ranking.map(function(entrada, i) {
        var nombre = entrada[0], count = entrada[1];
        var pct = Math.round((count / maxCount) * 100);
        var pos = medallas[i] || (i + 1) + '.';
        var label = nombre.charAt(0).toUpperCase() + nombre.slice(1);

        return '<div class="ranking-row">' +
            '<span class="ranking-pos">' + pos + '</span>' +
            '<span class="ranking-nombre">' + label + '</span>' +
            '<div class="ranking-barra-wrap">' +
                '<div class="ranking-barra" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="ranking-count">' + count + 'x</span>' +
        '</div>';
    }).join('');
}