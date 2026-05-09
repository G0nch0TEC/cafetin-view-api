// ══════════════════════════════════════════════════════
//  INICIO / DASHBOARD — main.js
//  Public/assets/js/main.js
//
//  Depende de:  api.js  → getPersonas(), getTodosLosMovimientos()
//               utils.js → formatearMonto(), formatearHora(), iniciales()
// ══════════════════════════════════════════════════════

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    renderSaludo();

    await new Promise(r => setTimeout(r, 50)); // esperar que init.js inyecte el loader
    mostrarLoader();

    try {
        // Carga en paralelo para mayor velocidad
        const [todos, personas] = await Promise.all([
            getTodosLosMovimientos(),
            getPersonas()
        ]);

        // Filtrar movimientos del día de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const movimientosHoy = todos.filter(m => {
            const fecha = new Date(m.fecha);
            fecha.setHours(0, 0, 0, 0);
            return fecha.getTime() === hoy.getTime();
        });

        // Calcular métricas
        const deudaTotal    = personas.reduce((acc, p) => acc + Math.max(0, Number(p.saldo)), 0);
        const cobradoHoy    = movimientosHoy.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
        const fiadoHoy      = movimientosHoy.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
        const totalPersonas = personas.length;

        renderMetricas({ deudaTotal, cobradoHoy, fiadoHoy, totalPersonas, movimientosHoy });
        renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal });
        renderUltimosMovimientos(movimientosHoy.slice(0, 5));
        renderRanking(movimientosHoy);

        // Top deudores: los 4 con mayor saldo positivo
        const deudores = [...personas]
            .filter(p => Number(p.saldo) > 0)
            .sort((a, b) => Number(b.saldo) - Number(a.saldo))
            .slice(0, 4);

        renderDeudores(deudores);

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

    // Deuda total
    const tDeuda = tarjetas[0];
    if (tDeuda) {
        tDeuda.querySelector('.metrica-valor').textContent = formatearMonto(deudaTotal);
        tDeuda.querySelector('.metrica-sub').textContent   =
            movimientosHoy.length + ' mov. hoy';
    }

    // Cobrado hoy
    const tPago = tarjetas[1];
    if (tPago) {
        const pagos = movimientosHoy.filter(m => m.tipo === 'PAGO').length;
        tPago.querySelector('.metrica-valor').textContent = formatearMonto(cobradoHoy);
        tPago.querySelector('.metrica-sub').textContent   =
            pagos + ' pago' + (pagos !== 1 ? 's' : '') + ' recibido' + (pagos !== 1 ? 's' : '');
    }

    // Fiado hoy
    const tFiado = tarjetas[2];
    if (tFiado) {
        const fiados = movimientosHoy.filter(m => m.tipo === 'FIADO').length;
        tFiado.querySelector('.metrica-valor').textContent = formatearMonto(fiadoHoy);
        tFiado.querySelector('.metrica-sub').textContent   =
            fiados + ' fiado' + (fiados !== 1 ? 's' : '') + ' registrado' + (fiados !== 1 ? 's' : '');
    }

    // Total personas
    const tPersonas = tarjetas[3];
    if (tPersonas) {
        tPersonas.querySelector('.metrica-valor').textContent = totalPersonas;
        tPersonas.querySelector('.metrica-sub').textContent   =
            'cliente' + (totalPersonas !== 1 ? 's' : '') + ' registrado' + (totalPersonas !== 1 ? 's' : '');
    }
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
                '<span class="mov-monto ' + m.tipo.toLowerCase() + '">' +
                    formatearMonto(Number(m.monto)) +
                '</span>' +
                '<span class="mov-hora">' + formatearHora(m.fecha) + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}


// ── Top deudores ──────────────────────────────────────
function renderDeudores(personas) {
    const lista = document.getElementById('deudores-lista');
    if (!lista) return;

    if (!personas.length) {
        lista.innerHTML = '<p class="mov-nota" style="padding:1rem;color:#b89fcc;">Sin deudas pendientes 🎉</p>';
        return;
    }

    lista.innerHTML = personas.map(function(p) {
        return '<a href="pages/detalle.html?id=' + p.id + '" class="deudor-row">' +
            '<div class="mini-avatar">' + iniciales(p.nombre) + '</div>' +
            '<div class="mov-datos">' +
                '<span class="deudor-nombre">' + p.nombre + '</span>' +
            '</div>' +
            '<div class="mov-right">' +
                '<span class="deudor-monto">' + formatearMonto(Number(p.saldo)) + '</span>' +
            '</div>' +
        '</a>';
    }).join('');

    lucide.createIcons();
}


// ── Helpers ───────────────────────────────────────────
function formatearFechaLarga(timestampMs) {
    return new Date(timestampMs).toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}


// ── Insights slider ───────────────────────────────────
function renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal }) {
    const track = document.getElementById('insights-track');
    const dotsEl = document.getElementById('insights-dots');
    if (!track || !dotsEl) return;

    // ── Calcular datos de la semana ───────────────────
    const ahora = new Date();
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - 6);
    inicioSemana.setHours(0, 0, 0, 0);

    const movsSemana = todos.filter(m => m.fecha >= inicioSemana.getTime());
    const cobradoSemana = movsSemana.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);

    // Semana pasada para comparar
    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
    const movsSemanaAnterior = todos.filter(m =>
        m.fecha >= inicioSemanaAnterior.getTime() && m.fecha < inicioSemana.getTime()
    );
    const cobradoSemanaAnterior = movsSemanaAnterior.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const difSemana = cobradoSemanaAnterior > 0
        ? Math.round(((cobradoSemana - cobradoSemanaAnterior) / cobradoSemanaAnterior) * 100)
        : null;

    // ── Producto más pedido hoy (por nota del movimiento) ─
    const notasHoy = movimientosHoy
        .filter(m => m.tipo === 'FIADO' && m.nota && m.nota.trim())
        .map(m => m.nota.trim().toLowerCase());

    let topProducto = null;
    let topCount = 0;
    if (notasHoy.length) {
        const conteo = {};
        notasHoy.forEach(n => { conteo[n] = (conteo[n] || 0) + 1; });
        const entrada = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
        if (entrada) {
            topProducto = entrada[0].charAt(0).toUpperCase() + entrada[0].slice(1);
            topCount = entrada[1];
        }
    }

    // ── Personas inactivas esta semana ────────────────
    const activosIds = new Set(movsSemana.map(m => m.personaId));
    const inactivos = personas.filter(p => !activosIds.has(p.id) && !activosIds.has(String(p.id)));

    // ── Tendencia hoy: fiado vs cobrado ───────────────
    const balance = cobradoHoy - fiadoHoy;
    const tendenciaPositiva = balance >= 0;

    // ── Construir tarjetas ────────────────────────────
    const tarjetas = [];

    // 1. Recaudado esta semana
    const badgeSemana = difSemana !== null
        ? { texto: (difSemana >= 0 ? '+' : '') + difSemana + '%', clase: difSemana >= 0 ? 'positivo' : 'negativo' }
        : { texto: 'Esta semana', clase: 'neutro' };

    tarjetas.push({
        clase: 'semana',
        icono: 'bar-chart-2',
        label: 'Recaudado esta semana',
        valor: formatearMonto(cobradoSemana),
        sub: movsSemana.length + ' movimientos en 7 días',
        badge: badgeSemana
    });

    // 2. Producto más pedido hoy (si hay notas)
    if (topProducto) {
        tarjetas.push({
            clase: 'top',
            icono: 'star',
            label: 'Más pedido hoy',
            valor: topProducto,
            sub: topCount + (topCount === 1 ? ' vez registrada' : ' veces registrado'),
            badge: { texto: '🔥 Top', clase: 'alerta' }
        });
    }

    // 3. Balance del día
    tarjetas.push({
        clase: 'tendencia',
        icono: tendenciaPositiva ? 'trending-up' : 'trending-down',
        label: 'Balance de hoy',
        valor: formatearMonto(Math.abs(balance)),
        sub: tendenciaPositiva ? 'cobrado > fiado' : 'fiado > cobrado',
        badge: { texto: tendenciaPositiva ? 'A favor' : 'En rojo', clase: tendenciaPositiva ? 'positivo' : 'negativo' }
    });

    // 4. Personas inactivas (si hay)
    if (inactivos.length > 0) {
        tarjetas.push({
            clase: 'alerta',
            icono: 'user-x',
            label: 'Sin movimiento esta semana',
            valor: inactivos.length + (inactivos.length === 1 ? ' persona' : ' personas'),
            sub: inactivos.slice(0, 2).map(p => p.nombre.split(' ')[0]).join(', ') + (inactivos.length > 2 ? '…' : ''),
            badge: { texto: 'Inactivos', clase: 'negativo' }
        });
    }

    // 5. Deuda total acumulada
    tarjetas.push({
        clase: 'semana',
        icono: 'credit-card',
        label: 'Deuda total acumulada',
        valor: formatearMonto(deudaTotal),
        sub: personas.filter(p => Number(p.saldo) > 0).length + ' clientes con saldo',
        badge: { texto: 'Pendiente', clase: 'neutro' }
    });

    // ── Render HTML ───────────────────────────────────
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


// ── Slider: drag + dots ───────────────────────────────
function iniciarSlider(total) {
    const track   = document.getElementById('insights-track');
    const dotsEl  = document.getElementById('insights-dots');
    if (!track || !dotsEl || total <= 3) {
        // Si caben todas, no hacen falta dots ni drag
        dotsEl.style.display = 'none';
        return;
    }

    // Cuántas tarjetas se ven a la vez (3 en desktop)
    const visibles = 3;
    const maxSlide = total - visibles;
    let current = 0;

    // Crear dots
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
        const cardW = track.querySelector('.insight-card').offsetWidth + 12; // gap 12px
        track.style.transform = 'translateX(-' + (current * cardW) + 'px)';
        dotsEl.querySelectorAll('.insight-dot').forEach(function(d, i) {
            d.classList.toggle('activo', i === current);
        });
    }

    // Drag / swipe
    let startX = 0, startScroll = 0, dragging = false;

    function onDown(e) {
        dragging = true;
        startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        startScroll = current;
        track.classList.add('grabbing');
    }

    function onMove(e) {
        if (!dragging) return;
        const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const cardW = track.querySelector('.insight-card').offsetWidth + 12;
        const diff = startX - x;
        const rawIdx = startScroll + diff / cardW;
        const clamped = Math.max(0, Math.min(rawIdx, maxSlide));
        track.style.transform = 'translateX(-' + (clamped * cardW) + 'px)';
    }

    function onUp(e) {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('grabbing');
        const x = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const diff = startX - x;
        if (Math.abs(diff) > 40) {
            irA(diff > 0 ? current + 1 : current - 1);
        } else {
            irA(current); // snap de vuelta
        }
    }

    track.addEventListener('mousedown',  onDown);
    track.addEventListener('mousemove',  onMove);
    track.addEventListener('mouseup',    onUp);
    track.addEventListener('mouseleave', onUp);
    track.addEventListener('touchstart', onDown, { passive: true });
    track.addEventListener('touchmove',  onMove, { passive: true });
    track.addEventListener('touchend',   onUp);

    // Auto-avance cada 6 segundos
    setInterval(function() {
        if (!dragging) irA(current < maxSlide ? current + 1 : 0);
    }, 6000);
}


// ── Ranking de productos más pedidos hoy ──────────────
function renderRanking(movimientosHoy) {
    var lista = document.getElementById('ranking-lista');
    if (!lista) return;

    // Solo fiados con nota — la nota es el producto pedido
    var conNota = movimientosHoy.filter(function(m) {
        return m.tipo === 'FIADO' && m.nota && m.nota.trim();
    });

    if (!conNota.length) {
        lista.innerHTML = '<p class="ranking-vacio">Sin productos registrados hoy</p>';
        return;
    }

    // Contar apariciones por nota (normalizado a minúsculas)
    var conteo = {};
    conNota.forEach(function(m) {
        var clave = m.nota.trim().toLowerCase();
        conteo[clave] = (conteo[clave] || 0) + 1;
    });

    // Ordenar de mayor a menor y tomar top 5
    var ranking = Object.entries(conteo)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, 5);

    var maxCount = ranking[0][1];
    var medallas = ['🥇', '🥈', '🥉'];

    lista.innerHTML = ranking.map(function(entrada, i) {
        var nombre = entrada[0];
        var count  = entrada[1];
        var pct    = Math.round((count / maxCount) * 100);
        var pos    = medallas[i] || (i + 1) + '.';
        // Capitalizar primera letra
        var label  = nombre.charAt(0).toUpperCase() + nombre.slice(1);

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