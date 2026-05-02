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
├── config/
│   └── database.php                 ← Conexión PDO a SQLite
│
├── controller/
│   ├── PersonasController.php       ← Endpoints de personas y sus movimientos
│   ├── MovimientosController.php    ← Endpoint de historial por fecha
│   └── CatalogoController.php       ← Endpoint de categorías y productos
│
├── helpers/
│   └── response.php                 ← Función reutilizable para responder JSON
│
├── upload/
│   └── UploadController.php         ← Recibe el archivo .db enviado por la app
│
└── data/
    ├── cafetin_db                   ← Archivo SQLite (lo sube la app Android)
    └── .gitignore                   ← Excluye el .db del control de versiones
```

---

## Responsabilidad de cada archivo

### `index.php`

El único punto de entrada de la API. No contiene lógica de negocio.

Su trabajo es leer la URL de la petición, identificar qué recurso se está pidiendo y delegar al controller correspondiente. También maneja los headers CORS para que el dashboard pueda consumir la API desde el navegador.

```
GET  /personas                    → PersonasController::listar()
GET  /personas/{id}/movimientos   → PersonasController::movimientos($id)
GET  /movimientos?fecha=...       → MovimientosController::porFecha($fecha)
GET  /catalogo                    → CatalogoController::listar()
POST /upload                      → UploadController::recibir()
```

---

### `config/database.php`

Abre la conexión al archivo SQLite usando PDO y la devuelve lista para usar. Si el archivo `data/cafetin_db` no existe todavía (porque la app aún no ha hecho el primer upload), devuelve `null` y los controllers responden con un error claro.

```php
// Lo que hace internamente:
$pdo = new PDO('sqlite:' . __DIR__ . '/../data/cafetin_db');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
return $pdo;
```

---

### `helpers/response.php`

Una sola función que todos los controllers usan para no repetir los mismos headers en cada archivo.

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

Maneja dos endpoints relacionados con personas.

**`GET /personas`** — Devuelve la lista completa de personas con su saldo calculado. El saldo se obtiene sumando todos los FIADOS y restando todos los PAGOS de cada persona directamente en SQL.

```sql
SELECT
  p.id,
  p.nombre,
  p.descripcion,
  COALESCE(SUM(
    CASE WHEN m.tipo = 'FIADO' THEN m.monto ELSE -m.monto END
  ), 0) AS saldo
FROM personas p
LEFT JOIN movimientos m ON m.personaId = p.id
GROUP BY p.id
ORDER BY p.nombre ASC
```

**`GET /personas/{id}/movimientos`** — Devuelve todos los movimientos de una persona específica, ordenados del más reciente al más antiguo.

```sql
SELECT id, tipo, monto, fecha, nota
FROM movimientos
WHERE personaId = :id
ORDER BY fecha DESC
```

---

### `controller/MovimientosController.php`

Maneja el historial de movimientos filtrado por fecha.

**`GET /movimientos?fecha=YYYY-MM-DD`** — Recibe una fecha como parámetro, la convierte a timestamps de inicio y fin del día, y devuelve todos los movimientos de ese día con el nombre de la persona incluido.

```sql
SELECT
  m.id,
  m.tipo,
  m.monto,
  m.fecha,
  m.nota,
  p.nombre AS persona
FROM movimientos m
JOIN personas p ON p.id = m.personaId
WHERE m.fecha BETWEEN :inicio AND :fin
ORDER BY m.fecha DESC
```

> Los timestamps en la app están en milisegundos (Java/Kotlin), así que en PHP se multiplica por 1000 para comparar correctamente.

---

### `controller/CatalogoController.php`

Maneja la consulta del catálogo de productos.

**`GET /catalogo`** — Devuelve todas las categorías con sus productos anidados. Los datos se obtienen en dos queries simples y se construye la estructura en PHP.

```sql
-- Query 1: categorías
SELECT id, nombre, emoji, orden
FROM catalogo_categorias
ORDER BY orden ASC

-- Query 2: productos
SELECT id, categoriaId, nombre, montoCentavos, orden
FROM catalogo_productos
ORDER BY categoriaId, orden ASC
```

La respuesta queda así:

```json
[
  {
    "id": 1,
    "nombre": "Bebidas",
    "emoji": "🥤",
    "productos": [
      { "id": 1, "nombre": "Agua", "montoCentavos": 100 },
      { "id": 2, "nombre": "Jugo",  "montoCentavos": 200 }
    ]
  }
]
```

---

### `upload/UploadController.php`

Maneja la sincronización del archivo SQLite enviado por la app Android.

**`POST /upload`** — Recibe el archivo `.db` como `multipart/form-data`, valida que sea un SQLite válido (revisa los primeros bytes del archivo) y lo guarda en `data/cafetin_db`, reemplazando el anterior.

Validaciones que hace antes de guardar:
- Que llegue un archivo en la petición.
- Que el archivo no esté vacío.
- Que los primeros 16 bytes correspondan a la firma de SQLite (`SQLite format 3`).

Si pasa las validaciones, guarda el archivo y responde `200 OK`. Si falla, responde con el error correspondiente.

---

### `data/cafetin_db`

El archivo SQLite generado por la app Android. Contiene las cuatro tablas que define la app:

| Tabla | Descripción |
|---|---|
| `personas` | Clientes registrados en el cafetín |
| `movimientos` | Fiados y pagos por persona |
| `catalogo_categorias` | Categorías de productos |
| `catalogo_productos` | Productos con precio en centavos |

> Este archivo **no se sube al repositorio**. El `.gitignore` dentro de `data/` lo excluye. Cada vez que la app sincroniza, este archivo se reemplaza con la versión más reciente.

---

## Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/personas` | Lista de personas con saldo calculado |
| `GET` | `/personas/{id}/movimientos` | Movimientos de una persona |
| `GET` | `/movimientos?fecha=YYYY-MM-DD` | Historial de un día específico |
| `GET` | `/catalogo` | Categorías con sus productos anidados |
| `POST` | `/upload` | Recibe y guarda el archivo `.db` |

Todos los endpoints devuelven `application/json`. Los endpoints GET son de solo lectura — no modifican ningún dato.

---

## Flujo completo de datos

```
[App Android]
     │
     │  POST /upload  (multipart, archivo cafetin_db)
     ▼
[UploadController]
     │
     │  valida y guarda en data/cafetin_db
     ▼
[data/cafetin_db]  ←──────────────────────────────┐
     │                                              │
     │  PDO SQLite                                  │
     ▼                                              │
[database.php]                                      │
     │                                              │
     │  instancia de conexión                       │
     ▼                                              │
[Controllers]  ←── index.php (router) ──── GET     │
     │                                              │
     │  JSON                                        │
     ▼                                              │
[cafetin-dashboard]  (solo lectura, nunca escribe) ─┘
```

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Lenguaje | PHP 8.x |
| Base de datos | SQLite (PDO) |
| Servidor local | XAMPP (Apache) |
| Formato de respuesta | JSON (`UTF-8`) |
| Autenticación | Ninguna por ahora |

---

## Notas importantes

- **La API nunca escribe en la base de datos.** Solo `UploadController` toca el archivo `.db`, y únicamente para reemplazarlo, no para modificar su contenido.
- **Los timestamps están en milisegundos** porque así los guarda Kotlin/Room. Al filtrar por fecha en PHP hay que convertir correctamente.
- **El `montoCentavos`** en los productos son centavos enteros (ej. `150` = S/ 1.50). El dashboard se encarga de formatearlo.
- **CORS** está habilitado en `index.php` para que el dashboard pueda consumir la API desde el navegador sin bloqueos.

---

*`cafetin-view-api` — parte del ecosistema Cafetín — 2026*