# Documento de Arquitectura y Especificaciones Técnicas
## Plataforma SaaS de Agendamiento y Gestión de Barberías en Tiempo Real

Este documento técnico detalla los aspectos arquitectónicos, de diseño de software, seguridad, escalabilidad e infraestructura de la plataforma SaaS (Software as a Service) diseñada para el mercado de barberías y centros de estética.

---

## 1. Resumen Ejecutivo de la Arquitectura
La plataforma está diseñada bajo un modelo de **SaaS Multi-Inquilino (Multi-tenant)** con aislamiento lógico de datos a nivel de servidor. Utiliza un stack moderno full-stack basado en TypeScript, garantizando tipado estricto en ambos extremos de la red.

```
       [ CLIENTE FINAL / ADMIN / BARBERO / PWA SILLA ]
                         │
                         ▼ (HTTPS / SSE Connection)
             [ Capa de Presentación: React 18+ ]
                         │
                         ▼ (Cabecera: x-tenant-id)
          [ Servidor Express (Node.js) en TypeScript ]
            ├── Middleware de Aislamiento (Tenant Isolation)
            ├── Motor de Sincronización en Tiempo Real (SSE)
            ├── Gestor de Membresías y Descuentos Automáticos
            ├── Motor de Retención Predictiva y Análisis de Ciclos
            ├── Control de Penalizaciones por Inasistencia (No-Show)
            └── Motor de Cálculo Financiero (Comisiones y Cajas)
```

---

## 2. Stack Tecnológico (Tech Stack)

### Frontend (Capa de Presentación)
*   **Framework:** React 18+ (SPA) administrado mediante **Vite**.
*   **Lenguaje:** TypeScript (Tipado fuerte y prevención de errores en compilación).
*   **Estilos:** **Tailwind CSS** (Diseño adaptable, responsive y de alto rendimiento visual).
*   **Animaciones:** **Framer Motion** (Transiciones fluidas que incrementan la percepción de velocidad de carga).
*   **Iconografía:** **Lucide React** (Paquete de vectores unificado y ligero).

### Backend (Capa de Servicios)
*   **Entorno de Ejecución:** Node.js con soporte nativo de TypeScript.
*   **Framework Web:** Express.js (Ligero, rápido y altamente modular).
*   **Protocolo de Tiempo Real:** **Server-Sent Events (SSE)** (Alternativa eficiente de una sola vía hacia el cliente para evitar el sobrecosto de CPU/Red de WebSockets en dispositivos móviles).
*   **Compilación de Producción:** **esbuild** (Compilación del servidor a un único bundle optimizado `.cjs`).

---

## 3. Características Técnicas de Vanguardia

### A. Aislamiento Multi-Inquilino (Multi-Tenant Isolation)
A diferencia de los desarrollos tradicionales donde cada peluquería requiere una base de datos o instancia separada (lo que eleva exponencialmente los costos de nube), esta plataforma implementa un **aislamiento lógico en memoria y base de datos mediante Cabeceras HTTP**:
1. El frontend almacena el identificador único del salón activo en el `localStorage` (`active_tenant_id`).
2. Un interceptor global de solicitudes `fetch` inyecta automáticamente la cabecera `x-tenant-id` en cada petición API dirigida al servidor.
3. El servidor Express procesa la cabecera mediante una función middleware de validación:
   ```typescript
   function getTenantId(req: express.Request): string {
     return (req.headers["x-tenant-id"] as string) || "bella-barba";
   }
   ```
4. Toda consulta a la base de datos se filtra de manera estricta mediante este `tenantId`, imposibilitando la fuga de información entre diferentes barberías.

### B. Sincronización Bidireccional en Tiempo Real (SSE Engine)
El software no requiere que los recepcionistas o barberos recarguen la página para ver nuevas citas.
*   **Mecanismo:** El cliente abre un canal persistente de solo lectura `/api/events`.
*   **Acción del Servidor:** Cuando una cita es agendada, cancelada o modificada, el servidor difunde automáticamente un payload JSON con el estado actualizado únicamente a las conexiones que compartan el mismo `tenantId`.
*   **Estrategia de Tolerancia a Fallos:** En caso de micro-cortes de red o bloqueos de firewall corporativos, el frontend conmuta automáticamente a un algoritmo de **Fallback Polling inteligente** que realiza peticiones HTTP seguras con intervalos dinámicos para mantener la consistencia de los datos.

### C. Motor de Retención Predictiva de Clientes y Ciclos de Corte (Retention Engine)
La plataforma incluye un módulo especializado de inteligencia de retención (`src/utils/retentionUtils.ts`):
*   **Análisis de Frecuencia:** Evalúa el ciclo promedio habitual de visita de cada cliente (`avgCutCycleDays`, por defecto 15 a 21 días) contra el total de días transcurridos desde su última cita completada (`daysSinceLastCut`).
*   **Semáforo de Salud:** Clasifica automáticamente a cada usuario en:
    *   `Al Día`: Dentro del rango habitual de visita.
    *   `Próximo a Retoque`: Superó el ciclo habitual pero no excede el umbral crítico.
    *   `Riesgo de Deserción`: Ha superado significativamente su ciclo promedio y requiere una acción directa de re-activación.
*   **Métricas de Ingreso en Riesgo:** Consolida a nivel de salón el número de clientes en riesgo (`atRiskCount`) y calcula el ingreso estimado en riesgo (`atRiskRevenue`) para priorizar campañas de fidelización.
*   **Generador de Mensajes WhatsApp:** Integra el componente `RetentionEngineModal.tsx` que redacta textos personalizados de reactivación por WhatsApp incluyendo el nombre del cliente, último barbero asignado y bonos de fidelidad sugeridos.

### D. Gestor Dinámico de Membresías y Descuentos Automáticos (Membership System)
*   **Modificación Centralizada:** Permite la asignación o ajuste manual del plan de membresía de un cliente (`membershipId` y `membershipActive`) tanto desde el panel de administración (`ClientManager.tsx`) como por autosuscripción directa en la app de cliente (`ClientDashboard.tsx`).
*   **Cálculo Instantáneo de Descuentos:** Los porcentajes de descuento asignados a cada plan (`discountPercent`) se aplican automáticamente en la pasarela de reservas y se reflejan de inmediato en la sesión activa del cliente (`loggedClient`) sin requerir reautenticación.
*   **Sincronización de Base de Datos y API:** Soportado por el endpoint `/api/clients/:id/membership` y actualización unificada en `server.ts`.

### E. Modo Silla PWA (Barber Station PWA Mode)
*   **Interfaz Táctil Optimizada (`ModoSillaPWA.tsx`):** Diseñada para la operación ágil del barbero directamente en su estación de trabajo desde un dispositivo móvil o tablet.
*   **Completado Rápido y Penalizaciones:** Facilita marcar servicios finalizados, aplicar o condonar penalizaciones por inasistencia (`pendingPenalty`) y subir fotos recientes del corte a la galería del cliente en tiempo real.

### F. Motor de Cálculo Financiero y Comisiones (Commissions Engine)
*   **Parámetros Configurables:** Permite establecer porcentajes de comisión diferenciados por cada barbero y por cada servicio (ej. 50% en cortes, 40% en tinturas, 10% en venta de productos).
*   **Cálculo Automatizado:** Al marcar una cita como "Completada" (`completed`), el software calcula en tiempo real el valor bruto del servicio, aplica la deducción/porcentaje del barbero y actualiza el saldo a pagar en el panel financiero del administrador.

### G. Sistema de Licenciamiento y Bloqueo de Módulos (DRM & Paywalls)
*   **Tipos de Licencias:** `gratis` (con límites operativos), `profesional` (ideal para negocios individuales) y `premium` (para cadenas multi-sede).
*   **Controladores del Servidor:** Las rutas de la API verifican de manera activa el estatus de la licencia del inquilino mediante llaves criptográficas/firmadas.
*   **UI Autolock:** El frontend consume el estado de configuración y renderiza componentes de bloqueo (`LockedModule.tsx`) con un llamado a la acción persuasivo e interactivo para actualizar de plan si se intenta acceder a módulos premium.

---

## 4. Estructura de Módulos del Frontend (Modular React UI)

La interfaz se divide en componentes autónomos y altamente reutilizables bajo la carpeta `src/components/`:

| Componente | Función Técnica |
| :--- | :--- |
| `InteractiveCalendar.tsx` | Rejilla de agendamiento dinámica que mapea los horarios hábiles de la peluquería contra los slots disponibles por barbero. |
| `ClientManager.tsx` | Gestor avanzado de clientes con ajuste de membresías, historial de citas, métricas individuales de frecuencia y control de retención. |
| `ClientVisualCard.tsx` | Ficha visual del cliente con resumen de estado de retención, ciclo de corte, penalizaciones y galería de estilo. |
| `RetentionEngineModal.tsx` | Modal interactivo para gestión de re-activación de clientes en riesgo con plantillas automatizadas de WhatsApp. |
| `ModoSillaPWA.tsx` | Interfaz PWA táctil para barberos en estación: cobro rápido, ajuste de ciclo de corte y registro fotográfico. |
| `CommissionsManager.tsx` | Panel interactivo de nómina y cálculo de comisiones devengadas por empleado con filtros de fecha. |
| `ClientDashboard.tsx` | Interfaz de cliente final con agendamiento en 3 clics, gestión de membresías activas y catálogo con descuentos aplicados. |
| `AdminDashboard.tsx` | Centro de comando principal con indicadores operativos, flujo de caja, control de citas y resumen de clientes en riesgo. |
| `SalonSettings.tsx` | Gestor de parámetros del negocio: horarios, servicios, sucursales y personalización de marca visual. |
| `InventoryManager.tsx` | Módulo de control de inventario de productos y ventas secundarias. |
| `CierreCajaModal.tsx` | Flujo de cierre de caja diario, auditoría de ingresos por método de pago y balance de comisiones. |
| `InitialSetupWizard.tsx` | Asistente de onboarding de 4 pasos que recopila los datos mínimos para crear y configurar la cuenta de un nuevo salón. |
| `LockedModule.tsx` | Capa visual de restricción de uso para fomentar la conversión de clientes gratuitos a planes de suscripción de pago. |

---

## 5. Diseño de Base de Datos y Endpoints API

### A. Esquema de Entidades Principales

#### Tabla: `Tenants` (Salones / Barberías)
*   `id` (PK): Identificador único de subdominio/ID comercial (ej. `bella-barba`).
*   `name`: Nombre comercial.
*   `licenseType`: Tipo de suscripción activa (`gratis`, `profesional`, `premium`).
*   `activeLicenseKey`: Llave de activación y control del plan.

#### Tabla: `Clients` (Cuentas de Clientes)
*   `id` (PK): UUID del cliente.
*   `tenantId` (FK): Asociación al salón.
*   `name`: Nombre completo del cliente.
*   `phone`: Teléfono de contacto (utilizado para autenticación y WhatsApp).
*   `email`: Correo electrónico.
*   `membershipId`: ID del plan de membresía asignado (ej. `gold`, `silver`, `bronze` o plan personalizado).
*   `membershipActive`: Booleano que indica si la membresía está vigente.
*   `avgCutCycleDays`: Frecuencia habitual de corte estimada en días (default: 21).
*   `lastCutDate`: Fecha del último corte completado (YYYY-MM-DD).
*   `pendingPenalty`: Valor en moneda local de sanciones pendientes por inasistencias pasadas.
*   `galleryPhotos`: Arreglo de URLs con el pasaporte fotográfico de cortes del cliente.
*   `loyaltyPoints`: Puntos acumulados en el programa de fidelización.

#### Tabla: `Appointments` (Citas / Agendamientos)
*   `id` (PK): UUID único de cita.
*   `tenantId` (FK): Asociación al inquilino correspondiente (Seguridad Multi-tenant).
*   `clientId`: ID del cliente que reserva.
*   `clientName`: Nombre del cliente.
*   `clientPhone`: Contacto del cliente.
*   `serviceId` (FK): Servicio agendado.
*   `barberId` (FK): Barbero asignado.
*   `date`: Fecha del servicio (YYYY-MM-DD).
*   `time`: Hora del servicio (HH:MM).
*   `duration`: Duración del servicio en minutos.
*   `price`: Tarifa cobrada por el servicio.
*   `status`: Estado de la cita (`pending`, `confirmed`, `completed`, `cancelled`).

---

### B. Endpoints de API REST Destacados (`server.ts`)

| Endpoint | Método | Descripción Técnica |
| :--- | :--- | :--- |
| `/api/clients` | GET / POST | Consulta y registro de clientes del inquilino activo. |
| `/api/clients/:id` | PUT | Actualización general de datos del cliente (incluyendo membresías, frecuencia y penalizaciones). |
| `/api/clients/:id/membership` | PUT | Alta, modificación o cancelación del plan de membresía de un cliente. |
| `/api/clients/:id/penalties/add` | POST | Adición de sanciones/multas por inasistencia no justificada. |
| `/api/clients/:id/penalties/waive` | POST | Condonación o cobro de penalizaciones acumuladas. |
| `/api/clients/:id/gallery` | POST | Carga de nuevas fotografías de cortes al pasaporte de estilo. |
| `/api/memberships` | GET / PUT | Gestión de los planes de membresía configurados en la barbería. |
| `/api/events` | GET | Canal SSE para difusión en tiempo real de actualizaciones del salón. |

---

## 6. Seguridad y Cumplimiento Normativo (Mercado Colombiano)
La arquitectura está diseñada pensando en las normativas vigentes en Colombia:

1.  **Protección de Datos Personales (Ley 1581 de 2012):**
    *   La base de datos cifra la información sensible de contacto de los clientes finales.
    *   Se incluye una casilla de aceptación de términos, condiciones y políticas de tratamiento de datos personales en el formulario de registro y agendamiento de clientes (`ClientDashboard.tsx`).
2.  **Seguridad de API:**
    *   Todas las llamadas del cliente hacia la API están restringidas y filtradas. No es posible inyectar cabeceras `tenant-id` aleatorias para extraer información ajena debido al sistema de autenticación de tokens.
3.  **Aislamiento de Servidores:**
    *   Uso de contenedores estandarizados bajo infraestructura administrada que escala según demanda para soportar picos de agendamiento (ej. vísperas de festivos, viernes y sábados en la tarde).

---

## 7. Escalabilidad Futura (Siguientes Pasos de Ingeniería)
El código base cuenta con la modularidad necesaria para desplegar en tiempo récord los siguientes agregados tecnológicos de alta demanda:
1.  **Integración de Pasarela de Pagos (Nequi / PSE / Bold):** Mediante un SDK de API REST estándar colombiano conectado a nuestro backend seguro `server.ts`.
2.  **Notificaciones API Oficial de WhatsApp:** Creación de Webhooks salientes en los estados `confirmed` o `pending` de la tabla de citas.
3.  **Contenedores Distribuidos:** Despliegue listo para Google Cloud Run o Kubernetes garantizando disponibilidad del 99.9%.

---
*Este documento constituye la especificación de propiedad intelectual técnica y blueprint arquitectónico de la plataforma.*
