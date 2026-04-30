# 🍽️ SelvaPos

> SelvaPOS es una solución moderna para restaurantes que optimiza la atención, agiliza los pedidos y simplifica la gestión de ventas,     todo desde una sola plataforma intuitiva.
---

## 1. Descripción del Negocio

Un restaurante es un establecimiento comercial donde se preparan y sirven alimentos y bebidas a los clientes. Su operación diaria involucra la atención de mesas, toma de pedidos, preparación en cocina, cobro y cierre de caja.

Actualmente, muchos restaurantes medianos gestionan estos procesos de forma manual o con herramientas no integradas, lo que genera errores en pedidos, demoras en la atención y dificultad para llevar un control real de las ventas.

---

## 2. Identificar el Problema y Solución

### Problema

- Los mozos anotan los pedidos en papel, lo que genera errores y confusiones en cocina.
- No existe un control claro de qué mesas están ocupadas o libres.
- El cierre de caja se hace manualmente, sin reportes confiables.
- No se lleva un registro de los platos más vendidos ni de los ingresos diarios.

### Solución Propuesta

Desarrollar un **sistema de gestión integral para restaurante** que digitalice el flujo completo: desde la llegada del cliente hasta el cierre de caja, integrando los módulos de mesas, pedidos, menú, caja y reportes en una sola plataforma.

---

## 3. Preanálisis

### Necesidades

- Registrar y visualizar el estado de las mesas (libre, ocupada, reservada).
- Gestionar pedidos por mesa de forma rápida y clara.
- Administrar la carta del restaurante (platos, precios, categorías).
- Generar la cuenta por mesa y registrar el pago.
- Obtener reportes de ventas al cierre del día.

### Estudio de Viabilidad

| Aspecto | Evaluación |
|---|---|
| Técnica | Viable. Se utilizarán tecnologías web estándar accesibles. |
| Operativa | Viable. El flujo del sistema sigue el proceso real del negocio. |
| Económica | Viable. Es un proyecto académico sin costo de infraestructura inicial. |
| Tiempo | Viable. El alcance está ajustado a 8 semanas de desarrollo. |

### Alcance del Sistema

**Incluye:**
- Gestión de mesas y reservas
- Registro de pedidos por mesa
- Administración del menú/carta
- Módulo de caja y pagos
- Reportes de ventas diarias

**No incluye (por ahora):**
- App móvil para clientes
- Integración con sistemas de delivery
- Control de inventario de ingredientes

---

## 4. Análisis

### Definición de Requisitos

#### Requisitos Funcionales

| ID | Descripción |
|---|---|
| RF01 | El sistema debe mostrar el estado de cada mesa (libre / ocupada / reservada). |
| RF02 | El mozo debe poder registrar un pedido asociado a una mesa. |
| RF03 | El sistema debe enviar los pedidos al área de cocina. |
| RF04 | El administrador debe poder agregar, editar y eliminar platos del menú. |
| RF05 | El sistema debe generar la cuenta detallada de una mesa. |
| RF06 | El cajero debe poder registrar el pago (efectivo / tarjeta). |
| RF07 | El sistema debe generar un reporte de ventas del día. |
| RF08 | El sistema debe permitir registrar reservas con nombre y hora. |

#### Requisitos No Funcionales

| ID | Descripción |
|---|---|
| RNF01 | La interfaz debe ser intuitiva y de fácil uso para el personal. |
| RNF02 | El sistema debe responder en menos de 2 segundos por acción. |
| RNF03 | Los datos deben persistir correctamente en base de datos. |
| RNF04 | El sistema debe funcionar en navegadores modernos. |
| RNF05 | El acceso debe estar protegido con usuario y contraseña. |

### Análisis de Requisitos

El flujo principal del sistema es el siguiente:

```
Cliente llega
    → Se asigna / reserva una mesa
    → Mozo registra el pedido
    → Pedido llega a cocina
    → Platos preparados y servidos
    → Se genera la cuenta de la mesa
    → Cajero registra el pago
    → Se actualiza el reporte del día
```

Los actores del sistema son:
- **Administrador:** gestiona el menú, usuarios y reportes.
- **Mozo:** registra pedidos y gestiona mesas.
- **Cajero:** genera cuentas y registra pagos.
- **Cocina:** visualiza los pedidos pendientes.

---

## 5. Imágenes del Problema

> *(Próximamente — fotos reales del negocio mostrando el problema actual)*

---

## 6. Imágenes del Negocio

> *(Próximamente — fotos reales del restaurante o contexto del negocio)*

---

## Tecnologías (Por definir)

- Frontend: por definir
- Backend: por definir
- Base de datos: por definir

---

## Estado del Proyecto

🟡 En desarrollo — Semana 1 de 8

---

*Proyecto académico — 2026*
