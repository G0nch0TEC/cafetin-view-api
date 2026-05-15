// ══════════════════════════════════════════════════════
//  dona-chart.js — Gráfico de dona: distribución de deuda
//  Renderiza un <canvas> con Chart.js (CDN)
// ══════════════════════════════════════════════════════

/**
 * Dibuja la dona con los top deudores.
 * Llamar después de tener las personas cargadas.
 * @param {Array} personas  — lista completa de personas con .nombre y .saldo
 */
function renderDonaDeuda(personas) {
    const canvas = document.getElementById('dona-deuda');
    if (!canvas) return;

    const conDeuda = personas
        .filter(p => Number(p.saldo) > 0)
        .sort((a, b) => Number(b.saldo) - Number(a.saldo));

    if (!conDeuda.length) {
        const wrap = document.getElementById('dona-wrap');
        if (wrap) wrap.innerHTML = '<p class="dona-vacio">Sin deudas pendientes 🎉</p>';
        return;
    }

    // Top 5 + "Otros" si hay más
    const TOP = 5;
    const top    = conDeuda.slice(0, TOP);
    const otros  = conDeuda.slice(TOP);
    const totalOtros = otros.reduce((s, p) => s + Number(p.saldo), 0);

    const labels  = top.map(p => p.nombre.split(' ')[0]);   // solo primer nombre
    const valores = top.map(p => Number(p.saldo));

    if (totalOtros > 0) {
        labels.push('Otros');
        valores.push(totalOtros);
    }

    const PALETA = [
        '#a855f7', '#e879f9', '#f97316',
        '#ef4444', '#eab308', '#64748b'
    ];

    // Destruir instancia previa si existe (por si se recarga)
    if (window._donaChart) {
        window._donaChart.destroy();
    }

    window._donaChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: PALETA.slice(0, labels.length),
                borderColor: 'rgba(255,255,255,0.15)',
                borderWidth: 2,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = Math.round((ctx.parsed / total) * 100);
                            return ` ${formatearMonto(ctx.parsed)}  (${pct}%)`;
                        }
                    },
                    backgroundColor: 'rgba(30,15,50,0.92)',
                    titleColor:      '#e9d5ff',
                    bodyColor:       '#f3e8ff',
                    borderColor:     'rgba(168,85,247,0.3)',
                    borderWidth:     1,
                    padding:         10,
                }
            },
            animation: { duration: 600, easing: 'easeOutQuart' }
        }
    });

    // Leyenda manual
    const leyendaEl = document.getElementById('dona-leyenda');
    if (!leyendaEl) return;

    const total = valores.reduce((a, b) => a + b, 0);
    leyendaEl.innerHTML = labels.map((lbl, i) => {
        const pct = Math.round((valores[i] / total) * 100);
        return `<div class="dona-leyenda-item">
            <span class="dona-leyenda-dot" style="background:${PALETA[i]}"></span>
            <span class="dona-leyenda-nombre">${lbl}</span>
            <span class="dona-leyenda-pct">${pct}%</span>
        </div>`;
    }).join('');
}
