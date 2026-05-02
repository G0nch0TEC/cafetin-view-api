# ☕ Cafetín Dashboard — Arquitectura

> Documento de diseño técnico de la carpeta `public/` dentro de `cafetin-view-api`.
> Describe la estructura de archivos, la responsabilidad de cada uno y cómo se comunica con la API.

---

## Ubicación dentro del proyecto

El dashboard vive dentro de la carpeta `public/` del mismo repositorio que la API:

```
cafetin-view-api/
│
├── (archivos de la API...)
│
└── public/                ← Aquí vive el dashboard
    ├── index.html
    ├── personas.html
    ├── detalle.html
    ├── historial.html
    ├── catalogo.html
    └── assets/
```

La API responde JSON en `http://localhost/cafetin-view-api/`.
El dashboard se abre en `http://localhost/cafetin-view-api/public/`.

---

## Estructura completa

```
public/
│
├── index.html                        ← Resumen general del negocio
├── personas.html                     ← Lista de personas con saldo
├── detalle.html                      ← Movimientos de una persona
├── historial.html                    ← Historial filtrado por fecha
├── catalogo.html                     ← Categorías y productos
│
└── assets/
    │
    ├── css/
    │   ├── main.css                  ← Estilos globales
    │   ├── components.css            ← Componentes reutilizables
    │   └── pages/
    │       ├── personas.css
    │       ├── detalle.css
    │       ├── historial.css
    │       └── catalogo.css
    │
    ├── js/
    │   ├── api.js                    ← Todas las llamadas fetch() centralizadas
    │   ├── utils.js                  ← Funciones reutilizables
    │   └── pages/
    │       ├── personas.js
    │       ├── detalle.js
    │       ├── historial.js
    │       └── catalogo.js
    │
    └── img/
        └── logo.png
```

---

## Páginas HTML

### `index.html`

Página de inicio del dashboard. Muestra un resumen general del negocio al encargado de un vistazo.

Contenido:
- Tarjeta con el total de personas registradas.
- Tarjeta con el total de deuda acumulada (suma de todos los saldos positivos).
- Tarjeta con el total recaudado en pagos.
- Accesos directos a las demás secciones.
- Barra de navegación hacia las otras páginas.

Consume: `GET /personas` (para calcular los totales en JS).

---

### `personas.html`

Lista completa de todas las personas registradas en el cafetín con su saldo actual.

Contenido:
- Tabla o lista de personas con nombre, descripción y saldo.
- Indicador visual de saldo (verde si no debe, rojo si tiene deuda).
- Buscador para filtrar por nombre.
- Al hacer clic en una persona, navega a `detalle.html?id={id}`.

Consume: `GET /personas`.

---

### `detalle.html`

Vista detallada de una persona específica. Recibe el `id` por parámetro en la URL (`?id=1`).

Contenido:
- Nombre y descripción de la persona.
- Saldo actual destacado.
- Tabla de movimientos (tipo, monto, fecha, nota) ordenados del más reciente al más antiguo.
- Indicador visual por tipo de movimiento (FIADO en rojo, PAGO en verde).
- Botón para volver a `personas.html`.

Consume: `GET /personas/{id}/movimientos`.

---

### `historial.html`

Historial de movimientos filtrado por fecha.

Contenido:
- Selector de fecha (input type="date").
- Tabla de movimientos del día seleccionado con nombre de persona, tipo, monto y nota.
- Resumen del día: total fiado y total pagado.
- Por defecto muestra el día actual al cargar la página.

Consume: `GET /movimientos?fecha=YYYY-MM-DD`.

---

### `catalogo.html`

Vista del catálogo de productos organizados por categoría.

Contenido:
- Lista de categorías con su emoji y nombre.
- Dentro de cada categoría, los productos con nombre y precio formateado.
- Diseño en tarjetas o acordeón para expandir/colapsar cada categoría.

Consume: `GET /catalogo`.

---

## Archivos CSS

### `assets/css/main.css`

Estilos base que aplican a todo el dashboard.

Contiene:
- Variables CSS (colores, tipografía, espaciados, bordes).
- Reset básico (`box-sizing`, márgenes, paddings).
- Estilos del `body` y contenedor principal.
- Estilos de la barra de navegación.
- Estilos del footer si lo hay.

```css
/* Ejemplo de variables que irán aquí */
:root {
    --color-primario: ...;
    --color-fiado: ...;      /* rojo para deudas */
    --color-pago: ...;       /* verde para pagos */
    --color-fondo: ...;
    --color-texto: ...;
    --fuente-principal: ...;
    --radio-borde: ...;
}
```

---

### `assets/css/components.css`

Estilos de componentes visuales que se repiten en varias páginas.

Contiene:
- Tarjetas (`card`).
- Tablas (`table`).
- Badges de tipo (FIADO / PAGO).
- Indicadores de saldo (positivo / negativo).
- Botones.
- Spinner de carga.
- Mensajes de error o sin datos.

---

### `assets/css/pages/`

Un archivo CSS por página, solo para estilos específicos que no aplican en ningún otro lado.

| Archivo | Qué contiene |
|---|---|
| `personas.css` | Layout de la lista, buscador |
| `detalle.css` | Cabecera de persona, tabla de movimientos |
| `historial.css` | Selector de fecha, resumen del día |
| `catalogo.css` | Tarjetas de categoría, lista de productos |

---

## Archivos JS

### `assets/js/api.js`

Centraliza todas las llamadas `fetch()` a la API. Ningún otro archivo JS llama a la API directamente — siempre pasan por aquí.

Contiene una función por endpoint:

```javascript
const API_BASE = 'http://localhost/cafetin-view-api';

async function getPersonas() { ... }
async function getMovimientosPorPersona(id) { ... }
async function getMovimientosPorFecha(fecha) { ... }
async function getCatalogo() { ... }
```

Ventaja: si cambia la URL de la API, solo se edita este archivo.

---

### `assets/js/utils.js`

Funciones reutilizables que no dependen de ninguna página específica.

Contiene:
- `formatearMonto(centavos)` — convierte `150` a `S/ 1.50`.
- `formatearFecha(timestamp)` — convierte timestamp en milisegundos a fecha legible.
- `formatearFechaHora(timestamp)` — igual pero con hora incluida.
- `calcularSaldo(movimientos)` — suma fiados y resta pagos.
- `obtenerParamUrl(nombre)` — lee un parámetro de la URL (ej. `?id=1`).

---

### `assets/js/pages/`

Un archivo JS por página. Cada uno se encarga de:
1. Llamar a `api.js` para obtener los datos.
2. Construir el HTML dinámicamente con esos datos.
3. Insertar el HTML en el DOM.
4. Manejar eventos de la página (búsqueda, clic en persona, cambio de fecha).

| Archivo | Responsabilidad |
|---|---|
| `personas.js` | Carga y renderiza la lista de personas, maneja el buscador |
| `detalle.js` | Lee el `?id` de la URL, carga y renderiza los movimientos de esa persona |
| `historial.js` | Carga el historial del día actual, actualiza al cambiar la fecha |
| `catalogo.js` | Carga y renderiza las categorías con sus productos anidados |

---

## Flujo de una página típica

Tomando `personas.html` como ejemplo:

```
1. El navegador carga personas.html
2. personas.html enlaza main.css + components.css + personas.css
3. personas.html enlaza api.js + utils.js + personas.js
4. personas.js se ejecuta al cargar la página
5. personas.js llama a api.js → getPersonas()
6. api.js hace fetch('http://localhost/cafetin-view-api/personas')
7. La API PHP consulta el SQLite y devuelve JSON
8. personas.js recibe el JSON y construye el HTML de la tabla
9. personas.js inserta el HTML en el DOM
10. El encargado ve la lista de personas con sus saldos
```

---

## Comunicación con la API

Todas las peticiones son `GET` (excepto el upload que lo hace la app, no el dashboard).
El dashboard nunca escribe datos — solo los lee y los muestra.

```
public/personas.html
    └── personas.js  →  api.js  →  GET /personas  →  PHP  →  SQLite
                                        ↓
                                     JSON
                                        ↓
                    personas.js renderiza en el DOM
```

---

## Notas importantes

- **El dashboard no tiene backend propio.** Son archivos HTML/CSS/JS estáticos que se sirven directamente desde XAMPP.
- **`api.js` es el único archivo que conoce la URL de la API.** Si se despliega en otro servidor, solo se cambia `API_BASE` en ese archivo.
- **Los montos vienen en centavos** desde la API (`montoCentavos`). `utils.js` se encarga de formatearlos antes de mostrarlos.
- **Las fechas vienen en milisegundos** (timestamps de Kotlin). `utils.js` se encarga de convertirlas a texto legible.
- **`detalle.html` es una sola página** que sirve para cualquier persona — lee el `?id=` de la URL para saber cuál cargar.

---

*`public/` — parte del ecosistema Cafetín — 2026*
