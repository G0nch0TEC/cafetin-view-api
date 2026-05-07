// ══════════════════════════════════════════════
//  HISTORIAL — placeholder sin fetch
//  Public/assets/js/pages/historial.js
// ══════════════════════════════════════════════

// Cuando se conecte el backend, aquí irá:
//   1. leer fecha del selector
//   2. llamar api.getMovimientosPorFecha(fecha)
//   3. renderizar tabla y actualizar resumen
// Por ahora los datos están hardcodeados en el HTML.

const selector = document.getElementById('fecha-selector');

selector.addEventListener('change', () => {
    // placeholder — aquí se disparará el fetch
    console.log('Fecha seleccionada:', selector.value);
});