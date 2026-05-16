// ══════════════════════════════════════════════════════
//  DASHBOARD — main.js
//  Public/assets/js/pages/main.js
//
//  Cambios respecto al original:
//    · withLoader()        reemplaza el patrón manual
//    · calcularDatosDias() reemplaza calcularDatosSemana()
//    · calcularRangoSemanas() reemplaza el cálculo inline
//    · pluralizar()        reemplaza concatenaciones inline
//    · formatearFechaLarga eliminada (ya está en utils.js)
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

    renderSaludo();

    await withLoader(
        async () => {
            const [todos, personas] = await Promise.all([
                getTodosLosMovimientos(),
                getPersonas()
            ]);
            _renderDashboard(todos, personas);
            renderFrescura();
        },
        (err) => {
            console.error('Error cargando el dashboard:', err.message);
            const movLista      = document.getElementById('mov-lista');
            const deudoresLista = document.getElementById('deudores-lista');
            if (movLista)       movLista.innerHTML      = '<p class="mov-nota" style="padding:1rem">No se pudo conectar con la API</p>';
            if (deudoresLista)  deudoresLista.innerHTML = '<p class="mov-nota" style="padding:1rem">Sin datos disponibles</p>';
        }
    );

    // ── Polling silencioso — detecta cambios y re-renderiza sin recargar ──
    iniciarPolling({
        fetchFn:  async () => {
            const [todos, personas] = await Promise.all([
                getTodosLosMovimientos(),
                getPersonas()
            ]);
            return { todos, personas };
        },
        firmaFn:  ({ todos, personas }) => {
            // La firma cambia si hay nuevos movimientos o cambia la deuda total
            const deuda = personas.reduce((s, p) => s + Number(p.saldo), 0);
            return `${todos.length}:${deuda}`;
        },
        renderFn: ({ todos, personas }) => _renderDashboard(todos, personas),
        intervalo:   30_000,
        indicadorId: 'data-freshness'
    });
});


// ── Render completo del dashboard (carga inicial + polling) ─────────────────────
function _renderDashboard(todos, personas) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyInicio = hoy.getTime();
    const hoyFin    = hoyInicio + 86399999; // 23:59:59.999

    const movimientosHoy = todos.filter(m => m.fecha >= hoyInicio && m.fecha <= hoyFin);

    const datosSemana   = calcularDatosDias(todos, 7);
    const deudaTotal    = personas.reduce((acc, p) => acc + Math.max(0, Number(p.saldo)), 0);
    const cobradoHoy    = movimientosHoy.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const fiadoHoy      = movimientosHoy.filter(m => m.tipo === 'FIADO').reduce((s, m) => s + Number(m.monto), 0);
    const totalPersonas = personas.length;

    renderMetricas({ deudaTotal, cobradoHoy, fiadoHoy, totalPersonas, movimientosHoy });
    renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal });
    renderUltimosMovimientos(movimientosHoy);
    renderRanking(movimientosHoy);
    renderSparklines(datosSemana, movimientosHoy, personas);
    renderGrafico7Dias(datosSemana);

    const deudores = [...personas]
        .filter(p => Number(p.saldo) > 0)
        .sort((a, b) => Number(b.saldo) - Number(a.saldo))
        .slice(0, 4);
    renderDeudores(deudores);
    renderDonaDeuda(personas);

    const totalEl = document.getElementById('dona-total');
    if (totalEl) totalEl.textContent = formatearMonto(deudaTotal);
}


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
        tDeuda.querySelector('.metrica-sub').textContent   = pluralizar(movimientosHoy.length, 'mov. hoy');
    }

    const tPago = tarjetas[1];
    if (tPago) {
        const pagos = movimientosHoy.filter(m => m.tipo === 'PAGO').length;
        tPago.querySelector('.metrica-valor').textContent = formatearMonto(cobradoHoy);
        tPago.querySelector('.metrica-sub').textContent   = pluralizar(pagos, 'pago recibido', 'pagos recibidos');
    }

    const tFiado = tarjetas[2];
    if (tFiado) {
        const fiados = movimientosHoy.filter(m => m.tipo === 'FIADO').length;
        tFiado.querySelector('.metrica-valor').textContent = formatearMonto(fiadoHoy);
        tFiado.querySelector('.metrica-sub').textContent   = pluralizar(fiados, 'fiado registrado', 'fiados registrados');
    }

    const tPersonas = tarjetas[3];
    if (tPersonas) {
        tPersonas.querySelector('.metrica-valor').textContent = totalPersonas;
        tPersonas.querySelector('.metrica-sub').textContent   = pluralizar(totalPersonas, 'cliente registrado', 'clientes registrados');
    }
}


// ── Sparklines ────────────────────────────────────────
function renderSparklines(datosSemana, movimientosHoy, personas) {
    dibujarSpark('spark-cobrado',  datosSemana.map(d => d.cobrado),           '#27ae60');
    dibujarSpark('spark-fiado',    datosSemana.map(d => d.fiado),             '#e67e22');
    dibujarSpark('spark-deuda',    datosSemana.map(d => d.cobrado + d.fiado), '#c0392b');
    dibujarSpark('spark-personas', datosSemana.map(d => d.movs),              '#7c3aed');
}

function dibujarSpark(id, valores, color) {
    const svg = document.getElementById(id);
    if (!svg) return;

    const W = 60, H = 20, PAD = 2;
    const max    = Math.max(...valores, 1);
    const n      = valores.length;
    const stepX  = (W - PAD * 2) / (n - 1);

    const puntos = valores.map((v, i) => {
        const x = PAD + i * stepX;
        const y = H - PAD - ((v / max) * (H - PAD * 2));
        return `${x},${y}`;
    });

    const areaPath = `M${puntos[0]} L${puntos.join(' L')} L${PAD + (n-1)*stepX},${H-PAD} L${PAD},${H-PAD} Z`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="grad-${id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="${color}" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="${color}" stop-opacity="0.03"/>
            </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#grad-${id})"/>
        <polyline points="${puntos.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${puntos[n-1].split(',')[0]}" cy="${puntos[n-1].split(',')[1]}" r="2" fill="${color}"/>
    `;
}


// ── Gráfico 7 días ────────────────────────────────────
function renderGrafico7Dias(datosSemana) {
    const contenedor = document.getElementById('semana-chart');
    if (!contenedor) return;

    const maxVal = Math.max(...datosSemana.map(d => Math.max(d.cobrado, d.fiado)), 1);

    contenedor.innerHTML = datosSemana.map((dia, i) => {
        const pctCobrado = Math.round((dia.cobrado / maxVal) * 100);
        const pctFiado   = Math.round((dia.fiado   / maxVal) * 100);
        const esHoy      = i === datosSemana.length - 1;

        return `<div class="chart-col${esHoy ? ' hoy' : ''}">
            <div class="chart-bars">
                <div class="chart-bar-wrap">
                    <div class="chart-bar cobrado" style="height:${pctCobrado}%" title="Cobrado: ${formatearMonto(dia.cobrado)}"></div>
                </div>
                <div class="chart-bar-wrap">
                    <div class="chart-bar fiado" style="height:${pctFiado}%" title="Fiado: ${formatearMonto(dia.fiado)}"></div>
                </div>
            </div>
            <span class="chart-label">${esHoy ? 'Hoy' : dia.label}</span>
        </div>`;
    }).join('');
}


// ── Frescura de datos ─────────────────────────────────
function renderFrescura() {
    const el        = document.getElementById('freshness-text');
    const container = document.getElementById('data-freshness');
    if (!el) return;

    const ahora = new Date();
    const hora  = String(ahora.getHours()).padStart(2, '0');
    const min   = String(ahora.getMinutes()).padStart(2, '0');
    el.textContent = `Datos actualizados hoy a las ${hora}:${min}`;
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

    contenedor.innerHTML = movimientos.map(m => `
        <div class="mov-item">
            <div class="avatar avatar-md">${iniciales(m.persona)}</div>
            <div class="mov-datos">
                <span class="mov-nombre">${m.persona}</span>
                <span class="mov-nota">${m.nota || '—'}</span>
            </div>
            <div class="mov-right">
                <span class="mov-monto ${m.tipo.toLowerCase()}">${formatearMonto(Number(m.monto))}</span>
                <span class="mov-hora">${formatearHora(m.fecha)}</span>
            </div>
        </div>
    `).join('');
}


// ── Top deudores ──────────────────────────────────────
function renderDeudores(personas) {
    const lista = document.getElementById('deudores-lista');
    if (!lista) return;

    if (!personas.length) {
        lista.innerHTML = '<p class="mov-nota" style="padding:1rem;color:#b89fcc;">Sin deudas pendientes 🎉</p>';
        return;
    }

    const maxSaldo = Math.max(...personas.map(p => Number(p.saldo)), 1);

    lista.innerHTML = personas.map(p => {
        const pct = Math.round((Number(p.saldo) / maxSaldo) * 100);
        return `<a href="pages/detalle.html?id=${p.id}&from=index" class="deudor-row">
            <div class="avatar avatar-md">${iniciales(p.nombre)}</div>
            <div class="deudor-datos">
                <div class="deudor-top">
                    <span class="deudor-nombre">${p.nombre}</span>
                    <span class="deudor-monto">${formatearMonto(Number(p.saldo))}</span>
                </div>
                <div class="deudor-barra-wrap">
                    <div class="deudor-barra" style="width:${pct}%"></div>
                </div>
            </div>
        </a>`;
    }).join('');

    lucide.createIcons();
}


// ── Insights slider ───────────────────────────────────
function renderInsights({ todos, personas, movimientosHoy, cobradoHoy, fiadoHoy, deudaTotal }) {
    const track  = document.getElementById('insights-track');
    const dotsEl = document.getElementById('insights-dots');
    if (!track || !dotsEl) return;

    // Semana actual vs anterior — usa calcularRangoSemanas() de utils
    const { inicioActual, inicioAnterior } = calcularRangoSemanas();

    const movsSemana         = todos.filter(m => m.fecha >= inicioActual);
    const cobradoSemana      = movsSemana.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);
    const movsSemanaAnterior = todos.filter(m => m.fecha >= inicioAnterior && m.fecha < inicioActual);
    const cobradoSemAnt      = movsSemanaAnterior.filter(m => m.tipo === 'PAGO').reduce((s, m) => s + Number(m.monto), 0);

    const difSemana = cobradoSemAnt > 0
        ? Math.round(((cobradoSemana - cobradoSemAnt) / cobradoSemAnt) * 100)
        : null;

    // Top producto del día — mismo regex que catalogo.js para sumar cantidades
    const _regexProd = /^(.+?)\s+x(\d+)$/i;
    let topProducto = null, topCount = 0;
    const _movsFiadoHoy = movimientosHoy.filter(m => m.tipo === 'FIADO' && m.nota && m.nota.trim());
    if (_movsFiadoHoy.length) {
        const conteo = {};
        _movsFiadoHoy.forEach(m => {
            const match    = m.nota.trim().match(_regexProd);
            const clave    = match ? match[1].trim().toLowerCase() : m.nota.trim().toLowerCase();
            const cantidad = match ? parseInt(match[2], 10) : 1;
            conteo[clave]  = (conteo[clave] || 0) + cantidad;
        });
        const entrada = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
        if (entrada) { topProducto = entrada[0].charAt(0).toUpperCase() + entrada[0].slice(1); topCount = entrada[1]; }
    }

    const activosIds       = new Set(movsSemana.map(m => m.personaId));
    const inactivos        = personas.filter(p => !activosIds.has(p.id) && !activosIds.has(String(p.id)));
    const balance          = cobradoHoy - fiadoHoy;
    const tendenciaPositiva = balance >= 0;

    const tarjetas = [];

    const badgeSemana = difSemana !== null
        ? { texto: (difSemana >= 0 ? '+' : '') + difSemana + '%', clase: difSemana >= 0 ? 'positivo' : 'negativo' }
        : { texto: 'Esta semana', clase: 'neutro' };

    tarjetas.push({ clase: 'semana', icono: 'bar-chart-2', label: 'Recaudado esta semana', valor: formatearMonto(cobradoSemana), sub: pluralizar(movsSemana.length, 'movimiento', 'movimientos') + ' en 7 días', badge: badgeSemana });

    if (topProducto) {
        tarjetas.push({ clase: 'top', icono: 'star', label: 'Más pedido hoy', valor: topProducto, sub: pluralizar(topCount, 'vez registrada', 'veces registrado'), badge: { texto: '🔥 Top', clase: 'alerta' } });
    }

    tarjetas.push({ clase: 'tendencia', icono: tendenciaPositiva ? 'trending-up' : 'trending-down', label: 'Balance de hoy', valor: formatearMonto(Math.abs(balance)), sub: tendenciaPositiva ? 'cobrado > fiado' : 'fiado > cobrado', badge: { texto: tendenciaPositiva ? 'A favor' : 'En rojo', clase: tendenciaPositiva ? 'positivo' : 'negativo' } });

    if (inactivos.length > 0) {
        tarjetas.push({ clase: 'alerta', icono: 'user-x', label: 'Sin movimiento esta semana', valor: pluralizar(inactivos.length, 'persona'), sub: inactivos.slice(0, 2).map(p => p.nombre.split(' ')[0]).join(', ') + (inactivos.length > 2 ? '…' : ''), badge: { texto: 'Inactivos', clase: 'negativo' } });
    }

    tarjetas.push({ clase: 'semana', icono: 'credit-card', label: 'Deuda total acumulada', valor: formatearMonto(deudaTotal), sub: pluralizar(personas.filter(p => Number(p.saldo) > 0).length, 'cliente con saldo', 'clientes con saldo'), badge: { texto: 'Pendiente', clase: 'neutro' } });

    track.innerHTML = tarjetas.map(t => `
        <div class="insight-card ${t.clase}">
            <div class="insight-icon"><i data-lucide="${t.icono}"></i></div>
            <div class="insight-body">
                <span class="insight-label">${t.label}</span>
                <span class="insight-valor">${t.valor}</span>
                <span class="insight-sub">${t.sub}</span>
            </div>
            <span class="insight-badge ${t.badge.clase}">${t.badge.texto}</span>
        </div>
    `).join('');

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
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => irA(i));
        dotsEl.appendChild(dot);
    }

    function irA(idx) {
        current = Math.max(0, Math.min(idx, maxSlide));
        const cardW = track.querySelector('.insight-card').offsetWidth + 12;
        track.style.transform = `translateX(-${current * cardW}px)`;
        dotsEl.querySelectorAll('.insight-dot').forEach((d, i) => d.classList.toggle('activo', i === current));
    }

    let startX = 0, startScroll = 0, dragging = false;

    function onDown(e)  { dragging = true; startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX; startScroll = current; track.classList.add('grabbing'); }
    function onMove(e)  {
        if (!dragging) return;
        const x    = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const cardW = track.querySelector('.insight-card').offsetWidth + 12;
        const diff  = startX - x;
        track.style.transform = `translateX(-${Math.max(0, Math.min(startScroll + diff / cardW, maxSlide)) * cardW}px)`;
    }
    function onUp(e) {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('grabbing');
        const x    = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
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

    setInterval(() => { if (!dragging) irA(current < maxSlide ? current + 1 : 0); }, 6000);
}


// ── Ranking ───────────────────────────────────────────
function renderRanking(movimientosHoy) {
    const lista = document.getElementById('ranking-lista');
    if (!lista) return;

    const conNota  = movimientosHoy.filter(m => m.tipo === 'FIADO' && m.nota && m.nota.trim());
    if (!conNota.length) { lista.innerHTML = '<p class="ranking-vacio">Sin productos registrados hoy</p>'; return; }

    const _rx     = /^(.+?)\s+x(\d+)$/i;
    const conteo  = {};
    conNota.forEach(m => {
        const match    = m.nota.trim().match(_rx);
        const clave    = match ? match[1].trim().toLowerCase() : m.nota.trim().toLowerCase();
        const cantidad = match ? parseInt(match[2], 10) : 1;
        conteo[clave]  = (conteo[clave] || 0) + cantidad;
    });

    const ranking  = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCount = ranking[0][1];
    const medallas = ['🥇', '🥈', '🥉'];

    lista.innerHTML = ranking.map(([nombre, count], i) => {
        const pct   = Math.round((count / maxCount) * 100);
        const pos   = medallas[i] || `${i + 1}.`;
        const label = nombre.charAt(0).toUpperCase() + nombre.slice(1);
        return `<div class="ranking-row">
            <span class="ranking-pos">${pos}</span>
            <span class="ranking-nombre">${label}</span>
            <div class="ranking-barra-wrap">
                <div class="ranking-barra" style="width:${pct}%"></div>
            </div>
            <span class="ranking-count">${count}x</span>
        </div>`;
    }).join('');
}