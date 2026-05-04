// ══════════════════════════════════════════════
//  PERSONAS — filtrado local (sin fetch)
//  Public/assets/js/pages/personas.js
// ══════════════════════════════════════════════

const buscador = document.getElementById('buscador');
const lista    = document.getElementById('personas-lista');
const filas    = () => lista.querySelectorAll('.persona-row');

buscador.addEventListener('input', () => {
    const q = buscador.value.toLowerCase().trim();
    let visibles = 0;

    filas().forEach(row => {
        const nombre = row.querySelector('.persona-nombre').textContent.toLowerCase();
        const desc   = row.querySelector('.persona-desc').textContent.toLowerCase();
        const match  = nombre.includes(q) || desc.includes(q);
        row.style.display = match ? '' : 'none';
        if (match) visibles++;
    });

    // Mostrar/ocultar mensaje vacío
    let vacio = lista.querySelector('.sin-resultados');
    if (visibles === 0) {
        if (!vacio) {
            vacio = document.createElement('p');
            vacio.className = 'sin-resultados';
            vacio.textContent = 'No se encontraron personas';
            lista.appendChild(vacio);
        }
        vacio.style.display = '';
    } else if (vacio) {
        vacio.style.display = 'none';
    }
});