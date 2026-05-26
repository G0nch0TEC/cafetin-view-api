# ☕ Cafetín View API — Arquitectura

> Documento de diseño técnico del proyecto `cafetin-view-api`.
> Describe la estructura de carpetas, la responsabilidad de cada archivo y el flujo completo de datos.

---

## Estructura de carpetas

```
cafetin-view-api/
│
├── index.php                        ← Punto de entrada único (router)
│
├── auth/
│   └── AuthController.php           ← Lógica de tokens QR y sesiones
│
├── config/
│   └── database.php                 ← Conexión PDO al SQLite del dispositivo
│
├── controller/
│   ├── PersonasController.php       ← GET /personas y GET /movimientos?personaId=
│   ├── MovimientosController.php    ← GET /movimientos?fecha=
│   └── CatalogoController.php       ← GET /catalogo
│
├── helpers/
│   └── response.php                 ← Función reutilizable para responder JSON
│
├── middleware/
│   └── auth.php                     ← Guard: valida el header Authorization
│
├── upload/
│   └── UploadController.php         ← POST /upload: recibe JSON y reconstruye SQLite
│
└── data/
    ├── cafetin_db_{deviceId}        ← SQLite por dispositivo (lo reconstruye /upload)
    ├── auth_tokens.json             ← Tokens QR activos (runtime, en /tmp en Railway)
    └── .gitignore                   ← Excluye los .db del control de versiones
```

---

## Responsabilidad de cada archivo

### `index.php`

El único punto de entrada de la API. No contiene lógica de negocio.

Lee la ruta desde `?_route=` (estrategia compatible con FrankenPHP en Railway, sin mod_rewrite), identifica el recurso pedido y delega al controller correspondiente. También sirve los archivos estáticos del dashboard (CSS, JS, HTML, imágenes) sin pasar por autenticación.

```
GET  /auth/generar               → AuthController::generar()
POST /auth/confirmar             → AuthController::confirmar()   ← llamado por la app
GET  /auth/verificar             → AuthController::verificar()   ← polling del dashboard
POST /upload                     → UploadController::recibir()   ← protegido por X-Api-Key
GET  /personas                   → PersonasController::listar()  ← requiere sesión
GET  /movimientos                → MovimientosController::listar() ← requiere sesión
GET  /catalogo                   → CatalogoController::listar()  ← requiere sesión
```

Las rutas de datos pasan primero por `require_auth()` en `middleware/auth.php`. Las rutas de auth y upload tienen su propio control de acceso y no usan el middleware de sesión.

---

### `auth/AuthController.php`

Implementa el flujo completo de autenticación sin contraseña mediante QR.

Los tokens se almacenan en `/tmp/auth_tokens.json` (en Railway el filesystem es efímero; esto es intencional — las sesiones son cortas).

**Flujo:**

```
[Dashboard] GET /auth/generar
    → genera token aleatorio (bin2hex 16 bytes)
    → lo guarda con status: "pendiente", TTL 5 min
    → devuelve { token, expires_in: 300 }

[Dashboard] dibuja QR con el token

[App Android] POST /auth/confirmar  { token, deviceId }
    → valida que el token exista y no haya expirado
    → genera sesion = bin2hex(24 bytes)
    → guarda status: "confirmado", sesion, sesion_expires (+24h), device_id
    → responde { ok: true }

[Dashboard] GET /auth/verificar?token=...  (polling cada 2s)
    → si status == "confirmado" → devuelve { status, sesion, sesion_expires }
    → si pendiente → devuelve { status: "pendiente" }
    → si expirado  → devuelve { status: "expirado" }
    → ventana de gracia de 10s después de consumir para evitar condiciones de carrera
```

TTLs:
- Token QR: **5 minutos**
- Sesión web: **24 horas**

---

### `middleware/auth.php`

Guard de autenticación para los endpoints de datos. Valida el header `Authorization` contra las sesiones activas en `auth_tokens.json`. Si la sesión no existe o está expirada, responde `401` y corta la ejecución.

```php
function require_auth(): void {
    $sesion = getallheaders()['Authorization'] ?? '';
    // busca la sesion en los tokens activos y verifica expiración
}
```

---

### `config/database.php`

Abre la conexión PDO al SQLite del dispositivo activo. El archivo se llama `cafetin_db_{deviceId}`, donde el `deviceId` lo indica el header `X-Device-Id` de la petición (o la sesión web, según el contexto). Si el archivo no existe todavía, devuelve `null` y los controllers responden con un error claro.

---

### `helpers/response.php`

Función de utilidad compartida por todos los controllers:

```php
function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
```

---

### `controller/PersonasController.php`

**`GET /personas`** — Lista completa de personas con saldo calculado en SQL:

```sql
SELECT p.id, p.nombre, p.descripcion,
  COALESCE(SUM(CASE WHEN m.tipo = 'FIADO' THEN m.monto ELSE -m.monto END), 0) AS saldo
FROM personas p
LEFT JOIN movimientos m ON m.personaId = p.id
GROUP BY p.id
ORDER BY p.nombre ASC
```

**`GET /movimientos?personaId={id}`** — Movimientos de una persona ordenados del más reciente al más antiguo.

---

### `controller/MovimientosController.php`

**`GET /movimientos`** — Todos los movimientos. Si se pasa `?fecha=YYYY-MM-DD`, filtra por ese día convirtiendo la fecha a timestamps en milisegundos (porque la app guarda timestamps en ms). Si se pasa `?personaId=`, filtra por persona. Incluye el nombre de la persona en cada fila.

> Los timestamps en la app están en milisegundos (Java/Kotlin). En PHP se multiplican por 1000 para comparar correctamente.

---

### `controller/CatalogoController.php`

**`GET /catalogo`** — Dos queries: categorías ordenadas por `orden`, luego productos. Se construye en PHP un array de categorías con los productos anidados:

```json
[
  {
    "id": 1, "nombre": "Bebidas", "emoji": "🥤",
    "productos": [
      { "id": 1, "nombre": "Agua", "montoCentavos": 100 }
    ]
  }
]
```

---

### `upload/UploadController.php`

**`POST /upload`** — Recibe el payload JSON enviado por la app Android con las cuatro tablas completas y reconstruye el SQLite del dispositivo desde cero en una transacción atómica.

Proceso:
1. Lee `X-Device-Id` del header y lo sanitiza (solo alfanumérico).
2. Parsea el body JSON: `personas`, `movimientos`, `categorias`, `productos`.
3. Abre (o crea) `data/cafetin_db_{deviceId}` con PDO SQLite.
4. Crea las tablas si no existen (`CREATE TABLE IF NOT EXISTS`).
5. Dentro de una transacción: borra todos los registros y reinserta los recibidos.
6. Responde con el conteo de registros guardados por tabla.

La autenticación la hace `index.php` antes de llegar aquí: verifica que `X-Api-Key` coincida con la variable de entorno `UPLOAD_API_KEY`.

---

### `data/cafetin_db_{deviceId}`

El SQLite reconstruido por cada sincronización de la app. Contiene las cuatro tablas del modelo de datos de la app:

| Tabla | Descripción |
|---|---|
| `personas` | Clientes registrados en el cafetín |
| `movimientos` | Fiados y pagos por persona |
| `catalogo_categorias` | Categorías de productos |
| `catalogo_productos` | Productos con precio en centavos |

> Este archivo **no se sube al repositorio**. El `.gitignore` dentro de `data/` lo excluye. Cada sincronización lo reemplaza completamente.

---

## Endpoints de la API

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/auth/generar` | — | Genera un token QR temporal (5 min) |
| `POST` | `/auth/confirmar` | — | La app confirma el token y crea una sesión |
| `GET` | `/auth/verificar?token=` | — | El dashboard verifica si el token fue confirmado |
| `POST` | `/upload` | `X-Api-Key` | La app sube todos los datos en JSON |
| `GET` | `/personas` | Sesión | Lista de personas con saldo calculado |
| `GET` | `/movimientos` | Sesión | Movimientos (filtrables por `personaId` o `fecha`) |
| `GET` | `/catalogo` | Sesión | Categorías con productos anidados |

Todos los endpoints devuelven `application/json; charset=utf-8`.

---

## Flujo completo de datos

```
[App Android]
     │
     │  POST /upload  (X-Api-Key + X-Device-Id + JSON)
     ▼
[UploadController]
     │
     │  reconstruye cafetin_db_{deviceId} (SQLite, transacción atómica)
     ▼
[data/cafetin_db_{deviceId}]  ←────────────────────────────┐
     │                                                       │
     │  PDO SQLite                                           │
     ▼                                                       │
[database.php]                                               │
     │                                                       │
     ▼                                                       │
[Controllers]  ←── index.php (router) ←── GET + Authorization
     │
     │  JSON
     ▼
[Dashboard HTML/JS]  (solo lectura)


[Dashboard] ──→ GET /auth/generar ──→ token + QR dibujado en canvas
[App Android] ──→ POST /auth/confirmar ──→ sesión creada
[Dashboard] ──→ GET /auth/verificar (polling 2s) ──→ obtiene sesión ──→ redirige
```

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Lenguaje | PHP 8.x |
| Base de datos | SQLite por dispositivo (PDO) |
| Servidor | Railway + FrankenPHP |
| Enrutamiento | Query param `?_route=` (sin mod_rewrite) |
| Autenticación upload | Header `X-Api-Key` + variable de entorno |
| Autenticación dashboard | Tokens QR efímeros → sesión 24 h en `/tmp` |
| Formato de respuesta | JSON UTF-8 |

---

## Notas importantes

- **La API nunca escribe datos de negocio desde el dashboard.** Solo `UploadController` modifica los SQLite, y únicamente al recibir un sync de la app.
- **Base de datos por dispositivo.** Cada `deviceId` tiene su propio archivo SQLite. El dashboard siempre trabaja con el del dispositivo cuya sesión está activa.
- **Los timestamps están en milisegundos** porque así los guarda Kotlin/Room. Al filtrar por fecha en PHP hay que multiplicar por 1000.
- **`montoCentavos`** son centavos enteros (`150` = S/ 1.50). El dashboard formatea antes de mostrar.
- **CORS** está habilitado en `index.php` para que el dashboard pueda consumir la API desde el navegador.
- **FrankenPHP** enruta todo por `index.php`; los archivos estáticos (CSS, JS, imágenes) se sirven directamente desde el mismo handler gracias al bypass por extensión.

---

*`cafetin-view-api` — parte del ecosistema Cafetín — 2026*
