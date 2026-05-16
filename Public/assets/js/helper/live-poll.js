// ══════════════════════════════════════════════════════
//  LIVE POLL — Polling silencioso sin recargar la página
//  Public/assets/js/helper/live-poll.js
//
//  Uso:
//    iniciarPolling({
//      fetchFn:   async () => datos,          // qué pedir a la API
//      firmaFn:   (datos) => string,           // huella para detectar cambios
//      renderFn:  (datos) => void,             // cómo pintar los datos nuevos
//      intervalo: 30_000,                      // cada cuántos ms (default 30s)
//      indicadorId: 'data-freshness'           // elemento a pulsar al cambiar
//    });
// ══════════════════════════════════════════════════════

function iniciarPolling({ fetchFn, firmaFn, renderFn, intervalo = 30_000, indicadorId = 'data-freshness' }) {
    let firmaAnterior = null;

    async function tick() {
        try {
            const datos       = await fetchFn();
            const firmaActual = firmaFn(datos);

            // Primera carga — solo guardar firma, no re-renderizar
            if (firmaAnterior === null) {
                firmaAnterior = firmaActual;
                return;
            }

            if (firmaActual !== firmaAnterior) {
                firmaAnterior = firmaActual;
                renderFn(datos);
                _pulsarSincronizado(indicadorId);
            }

        } catch (_) {
            // El polling nunca interrumpe la UI — falla silenciosamente
        }
    }

    // Primer tick ligeramente demorado para no competir con la carga inicial
    setTimeout(() => {
        tick();
        setInterval(tick, intervalo);
    }, 5_000);
}


// ── Animación del indicador ───────────────────────────

function _pulsarSincronizado(indicadorId) {
    const contenedor = document.getElementById(indicadorId);
    const texto      = document.getElementById('freshness-text');
    if (!contenedor || !texto) return;

    // 1. Actualizar el texto de hora
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, '0');
    const m = String(ahora.getMinutes()).padStart(2, '0');

    // 2. Mostrar brevemente "Sincronizado" con color verde
    texto.textContent = `Sincronizado a las ${h}:${m} ✓`;

    contenedor.classList.remove('sync-pulso');
    void contenedor.offsetWidth; // reflow para reiniciar la animación
    contenedor.classList.add('sync-pulso');

    // 3. Volver al texto normal al completarse la animación
    setTimeout(() => {
        texto.textContent = `Datos actualizados hoy a las ${h}:${m}`;
        contenedor.classList.remove('sync-pulso');
    }, 2_500);
}
