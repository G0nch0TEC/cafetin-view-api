# ☕ Cafetín — API Web

> **Cafetín API** es una interfaz web en PHP que permite consultar los datos registrados por la app Android de Cafetín: clientes, fiados, pagos e historial — sin necesidad de tener el dispositivo a mano.

---

## 1. Descripción del Negocio

**Cafetín escolar** es un negocio de pequeña escala que gestiona fiados entre alumnos y la persona encargada de la tienda. El registro de deudas, pagos y movimientos se realiza desde la app Android **Cafetín**, que opera 100% offline en el dispositivo.

Esta API complementa la app ofreciendo una vista de solo lectura accesible desde cualquier navegador, útil para revisar el estado de los fiados sin depender del teléfono.

---

## 2. Identificar el Problema y Solución

### Problema

- Los datos de la app solo son visibles desde el dispositivo Android donde está instalada.
- No existe forma de consultar el estado de los fiados desde una computadora u otro dispositivo.
- Revisar el historial o los saldos fuera del teléfono requiere acceso físico al mismo.

### Solución Propuesta

Desarrollar una **API web en PHP** que lea la base de datos exportada por la app y exponga los datos en endpoints de consulta, permitiendo al encargado revisar clientes, fiados e historial desde cualquier navegador — sin modificar ni registrar nada desde la web.

> **Regla de oro:** Los datos solo se registran desde la app Android. La API es de solo lectura.

---

## 3. Preanálisis

### Necesidades

- Consultar la lista de clientes y su saldo actual de fiado.
- Ver el detalle de movimientos (fiados y pagos) por cliente.
- Revisar el historial de movimientos por fecha.
- Consultar el catálogo de productos y categorías disponibles.

### Estudio de Viabilidad

| Aspecto | Evaluación |
|---|---|
| Técnica | Viable. PHP con acceso a SQLite no requiere infraestructura compleja. |
| Operativa | Viable. La API sigue la estructura de datos ya definida por la app. |
| Económica | Viable. Sin costo adicional; reutiliza la base de datos existente de la app. |
| Tiempo | Viable. El alcance está ajustado a las entidades ya modeladas en la app. |

### Alcance del Sistema

**Incluye:**
- Consulta de clientes y sus saldos
- Consulta de movimientos por cliente
- Consulta del historial por fecha
- Consulta del catálogo (categorías y productos)

**No incluye:**
- Registro, edición ni eliminación de datos (eso lo hace la app)
- Autenticación de usuarios por ahora
- App móvil propia

---

## 4. Análisis

### Definición de Requisitos

#### Requisitos Funcionales

| ID | Descripción |
|---|---|
| RF01 | La API debe retornar la lista de clientes con su saldo de fiado actual. |
| RF02 | La API debe retornar los movimientos (fiados y pagos) de un cliente dado su ID. |
| RF03 | La API debe retornar todos los movimientos de un día específico. |
| RF04 | La API debe retornar las categorías del catálogo con sus productos. |
| RF05 | Todos los endpoints son de solo lectura (GET). No se exponen endpoints de escritura. |

#### Requisitos No Funcionales

| ID | Descripción |
|---|---|
| RNF01 | Las respuestas deben estar en formato JSON. |
| RNF02 | La API debe responder en menos de 2 segundos por consulta. |
| RNF03 | La API debe leer la base de datos SQLite generada por la app Android. |
| RNF04 | Debe funcionar en cualquier servidor con PHP y soporte para SQLite. |

### Análisis de Requisitos

El flujo de uso de la API es el siguiente:

```
Encargado abre el navegador
    → Consulta la lista de clientes y saldos
    → Selecciona un cliente para ver sus movimientos
    → O bien, consulta el historial por fecha
    → O bien, revisa el catálogo de productos
    ← API devuelve los datos en JSON
```

Los actores del sistema son:

| Actor | Rol en el sistema |
|---|---|
| **Encargado** | Consulta datos de clientes, fiados e historial desde la web. |
| **App Android** | Única fuente de escritura; registra todos los datos en la base SQLite. |

---

## 5. Imágenes del Negocio

> *(Por agregar)*

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend / API | PHP |
| Base de datos | SQLite (generada por la app Android) |
| Formato de respuesta | JSON |

---

## Estado del Proyecto

🟡 **En desarrollo** — Semana 1

| Fase | Estado |
|---|---|
| Preanálisis | ✅ Completado |
| Análisis | ✅ Completado |
| Diseño | 🔲 Pendiente |
| Desarrollo | 🔲 Pendiente |
| Pruebas | 🔲 Pendiente |
| Implantación | 🔲 Pendiente |
| Mantenimiento | 🔲 Pendiente |

---

*Proyecto complementario a [Cafetín App Android](README__app_.md) — 2026*
