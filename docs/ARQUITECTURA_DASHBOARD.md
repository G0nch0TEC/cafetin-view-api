# ☕ Cafetín Dashboard — Arquitectura

> Documento de diseño técnico de la carpeta `Public/` dentro de `cafetin-view-api`.
> Describe la estructura de archivos, la responsabilidad de cada uno y cómo se comunica con la API.

---

## Ubicación dentro del proyecto

El dashboard vive dentro de la carpeta `Public/` del mismo repositorio que la API:

```
cafetin-view-api/
│
├── (archivos de la API...)
│
└── Public/                ← Aquí vive el dashboard
    ├── login.html
    ├── index.html
    ├── pages/
    │   ├── personas.html
    │   ├── detalle.html
    │   ├── historial.html
    │   └── catalogo.html
    ├── components/
    │   ├── sidebar.html
    │   └── loader.html
    └── assets/
```

La API responde JSON en `https://cafetin-view-api-production.up.railway.app`.
El dashboard se sirve desde la misma URL (FrankenPHP sirve los HTML como estáticos).

---

## Estructura completa

```
Public/
│
├── login.html                               ← Pantalla de autenticación por QR
├── index.html                               ← Resumen general del negocio
│
├── pages/
│   ├── personas.html                        ← Lista de personas con saldo
│   ├── detalle.html                         ← Movimientos de una persona
│   ├── historial.html                       ← Historial filtrado por fecha
│   └── catalogo.html                        ← Categorías y productos
│
├── components/
│   ├── sidebar.html                         ← Barra lateral de navegación (inyectada por init.js)
│   └── loader.html                          ← Spinner de carga global (inyectado por init.js)
│
└── assets/
    │
    ├── css/
    │   ├── main.css                         ← Estilos globales y variables CSS
    │   ├── base/
    │   │   ├── variables.css                ← Tokens de diseño (colores, tipografía, espaciado)
    │   │   ├── reset.css                    ← Reset y box-sizing
    │   │   ├── layout.css                   ← Estructura de página (sidebar + contenido)
    │   │   └── responsive.css               ← Media queries globales
    │   ├── components/
    │   │   ├── sidebar.css                  ← Barra lateral
    │   │   ├── tabla.css                    ← Tablas de datos
    │   │   ├── badges.css                   ← Badges FIADO / PAGO
    │   │   ├── glass.css                    ← Tarjetas con efecto glassmorphism
    │   │   ├── forms.css                    ← Inputs y selects
    │   │   ├── avatar.css                   ← Avatares de persona
    │   │   └── loader.css                   ← Spinner de carga
    │   └── pages/
    │       ├── login.css                    ← Pantalla de login / QR
    │       ├── personas.css                 ← Lista de personas
    │       ├── detalle.css                  ← Vista de detalle
    │       ├── historial.css                ← Historial por fecha
    │       ├── catalogo.css                 ← Tarjetas de catálogo
    │       └── dona-chart.css               ← Gráfico de dona en el inicio
    │
    └── js/
        ├── service/
        │   └── api.js                       ← Todas las llamadas fetch centralizadas
        ├── helper/
        │   ├── init.js                      ← Guard de sesión + carga de componentes globales
        │   ├── live-poll.js                 ← Polling silencioso de cambios en datos
        │   ├── utils.js                     ← Funciones de formato y utilidades
        │   └── sidebar-mobile.js            ← Comportamiento del sidebar en móvil
        └── pages/
            ├── auth.js                      ← Generación QR, polling de confirmación, sesión
            ├── main.js                      ← Resumen general (index.html)
            ├── personas.js                  ← Lista de personas
            ├── detalle.js                   ← Movimientos de una persona
            ├── historial.js                 ← Historial por fecha
            ├── catalogo.js                  ← Catálogo de productos
            └── dona-chart.js                ← Gráfico circular de deudas
```

---

## Páginas HTML

### `login.html`

Pantalla de autenticación por QR. No requiere sesión activa.

Flujo:
1. Al cargar, llama a `GET /auth/generar` para obtener un token.
2. `auth.js` dibuja el token como código QR en un `<canvas>` usando `qrcode.js`.
3. El encargado escanea el QR con la app Android.
4. `auth.js` hace polling a `GET /auth/verificar?token=` cada 2 segundos.
5. Cuando el servidor responde `{ status: "confirmado", sesion }`, guarda la sesión en `localStorage` y redirige a `index.html`.
6. Una barra de progreso muestra el tiempo restante del token (5 min). Al expirar, muestra el overlay de expirado con botón para renovar.

---

### `index.html`

Página de inicio del dashboard. Muestra un resumen general del negocio al encargado de un vistazo.

Contenido:
- Tarjetas con el total de personas registradas, deuda acumulada y pagos del mes.
- Gráfico de dona con la distribución de deudas entre clientes.
- Accesos directos a las demás secciones.
- Indicador de frescura de datos con live-poll cada 30 s.

Consume: `GET /personas` + `GET /movimientos`.

---

### `pages/personas.html`

Lista completa de todas las personas registradas con su saldo actual.

Contenido:
- Tabla de personas con nombre, descripción y saldo.
- Badge de color según deuda (verde si no debe, rojo si tiene deuda).
- Buscador en tiempo real para filtrar por nombre.
- Al hacer clic en una persona, navega a `detalle.html?id={id}`.
- Live-poll que actualiza la lista cada 30 s sin recargar la página.

Consume: `GET /personas`.

---

### `pages/detalle.html`

Vista detallada de una persona específica. Recibe el `id` por parámetro en la URL (`?id=1`).

Contenido:
- Nombre, descripción y saldo actual destacado.
- Tabla de movimientos (tipo, monto, fecha, nota) ordenados del más reciente al más antiguo.
- Badge visual por tipo (FIADO en rojo, PAGO en verde).
- Botón para volver a personas.

Consume: `GET /personas` (para el saldo) + `GET /movimientos?personaId={id}`.

---

### `pages/historial.html`

Historial de movimientos filtrado por fecha.

Contenido:
- Selector de fecha (muestra hoy por defecto).
- Tabla de movimientos del día con nombre de persona, tipo, monto y nota.
- Resumen del día: total fiado y total pagado.
- Live-poll para refrescar si llegan nuevas sincronizaciones.

Consume: `GET /movimientos?fecha=YYYY-MM-DD`.

---

### `pages/catalogo.html`

Vista del catálogo de productos organizados por categoría.

Contenido:
- Tarjetas por categoría con emoji, nombre y lista de productos.
- Cada producto muestra nombre y precio formateado (S/ X.XX).

Consume: `GET /catalogo`.

---

## Archivos JS clave

### `assets/js/service/api.js`

Centraliza todas las llamadas `fetch()` a la API. Ninguna otra página llama a la API directamente.

Incluye automáticamente el header `Authorization` con la sesión activa en cada petición. Si el servidor responde `401`, borra la sesión de `localStorage` y redirige a `login.html`.

```javascript
const API_BASE = 'https://cafetin-view-api-production.up.railway.app';

async function getPersonas() { ... }
async function getMovimientosPorPersona(personaId) { ... }
async function getTodosLosMovimientos() { ... }
async function getCatalogo() { ... }
```

Ventaja: si cambia la URL de la API, solo se edita `API_BASE` aquí.

---

### `assets/js/helper/init.js`

Se carga en todas las páginas del dashboard (excepto `login.html`). Hace dos cosas:

**Guard de sesión** — antes de cualquier otra lógica, verifica que `cafetin_sesion` en `localStorage` exista y no haya expirado. Si no hay sesión válida, redirige a `login.html` inmediatamente.

**Carga de componentes globales** — inyecta `sidebar.html` y `loader.html` en sus contenedores mediante `fetch()`, inicializa los iconos Lucide, marca el link activo en el sidebar según la página actual, y enlaza el botón de cerrar sesión.

También expone las funciones `mostrarLoader()`, `ocultarLoader()` y `withLoader(fn)` para que las páginas muestren un spinner mientras cargan datos.

---

### `assets/js/helper/live-poll.js`

Motor de polling silencioso que detecta cambios en los datos sin recargar la página.

```javascript
iniciarPolling({
  fetchFn:     async () => datos,      // qué pedir a la API
  firmaFn:     (datos) => string,       // huella para detectar cambios
  renderFn:    (datos) => void,         // cómo repintar cuando hay cambios
  intervalo:   30_000,                  // cada 30 s
  indicadorId: 'data-freshness'         // elemento a animar al sincronizar
});
```

Solo llama a `renderFn` cuando la firma cambia — evita rerenders innecesarios. El primer tick ocurre 5 s después de la carga inicial para no competir con el render principal. Los errores de red se tragan silenciosamente para no interrumpir la UI. Al detectar cambios, anima el indicador de frescura con la hora de la última sincronización.

---

### `assets/js/pages/auth.js`

Implementa toda la lógica del login por QR en el cliente:

- Llama a `GET /auth/generar` y dibuja el token como QR en un `<canvas>` (usando `qrcode.js`).
- Inicia un polling de verificación cada 2 s (`GET /auth/verificar?token=`).
- Muestra overlays según el estado: cargando, QR listo, confirmado, expirado.
- Anima una barra de progreso que cuenta los 5 min de vida del token.
- Al confirmar: guarda `{ sesion, expiresAt }` en `localStorage` y redirige.
- Al expirar: muestra botón para generar un nuevo QR.

---

### `assets/js/helper/utils.js`

Funciones de utilidad compartidas por todas las páginas:

- `formatearMonto(centavos)` — convierte `150` a `S/ 1.50`.
- `formatearFecha(timestamp)` — timestamp en ms → fecha legible en español.
- `formatearFechaHora(timestamp)` — igual pero con hora incluida.
- `calcularSaldo(movimientos)` — suma fiados y resta pagos.
- `obtenerParamUrl(nombre)` — lee un parámetro de la URL (`?id=1`).

---

## Flujo de una página típica

Tomando `personas.html` como ejemplo:

```
1. El navegador carga personas.html
2. personas.html enlaza los CSS: main, components, personas
3. personas.html enlaza: api.js, utils.js, init.js, live-poll.js, personas.js
4. init.js se ejecuta primero — verifica sesión, inyecta sidebar y loader
5. personas.js llama withLoader() → muestra spinner → llama getPersonas()
6. api.js hace fetch('…/personas') con Authorization: <sesion>
7. La API PHP consulta el SQLite y devuelve JSON
8. personas.js renderiza la tabla en el DOM
9. init.js oculta el spinner
10. live-poll.js inicia el ciclo de 30 s para detectar cambios futuros
```

---

## Comunicación con la API

```
Public/login.html
    └── auth.js  →  GET /auth/generar  →  dibuja QR
                 ←  App escanea y confirma
                 →  GET /auth/verificar (polling 2s)  →  obtiene sesión

Public/pages/personas.html
    └── personas.js  →  api.js  →  GET /personas  →  PHP  →  SQLite
                                       ↓
                                     JSON
                                       ↓
                       personas.js renderiza + live-poll.js observa cambios
```

---

## Notas importantes

- **El dashboard no tiene backend propio.** Son archivos HTML/CSS/JS estáticos servidos por FrankenPHP desde `index.php`.
- **`api.js` es el único archivo que conoce la URL de la API.** Cambiar `API_BASE` allí actualiza todo el dashboard.
- **La sesión se guarda en `localStorage`** como `cafetin_sesion: { sesion, expiresAt }`. `init.js` la verifica en cada página antes de cargar nada.
- **Los montos vienen en centavos** (`montoCentavos`). `utils.js` los formatea antes de mostrarlos.
- **Las fechas vienen en milisegundos** (timestamps de Kotlin). `utils.js` los convierte a texto legible.
- **`detalle.html` es una sola página** que sirve para cualquier persona — lee `?id=` de la URL para saber cuál cargar.
- **Live-poll es opt-in** — cada página que quiera actualizaciones en background llama a `iniciarPolling()` con su propia firma y función de render.

---

*`Public/` — parte del ecosistema Cafetín — 2026*
