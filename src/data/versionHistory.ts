export interface VersionRelease {
  version: string;
  name: string;
  releaseDate: string;
  isCurrent?: boolean;
  type: 'major' | 'minor' | 'patch';
  highlights: string[];
  details: {
    category: string;
    items: string[];
  }[];
}

export const CURRENT_APP_VERSION = "v2.6.3";
export const CURRENT_APP_BUILD = "2026.09.21-Enterprise";
export const CURRENT_APP_TAGLINE = "SaaS Multi-Tenant Edition • Portal Unificado & Catálogo en Selección de Servicio";

export const APP_VERSION_HISTORY: VersionRelease[] = [
  {
    version: "v2.6.3",
    name: "Unificación de Portal de Cliente & Catálogo de Estilos en Paso 3",
    releaseDate: "2026-09-21",
    isCurrent: true,
    type: "patch",
    highlights: [
      "Unificación de Membresías & Beneficios dentro de la vista 'Mi Portal' (reducción a 2 pestañas principales)",
      "Reubicación del Catálogo de Cortes '¿Indeciso?' al Paso 3 (Selecciona el Servicio o Corte)",
      "Optimización de la barra de submódulos y cuadrícula de métricas en pantallas de escritorio del Administrador",
      "Soporte dinámico para exploración de planes de fidelidad y membresía para clientes e invitados"
    ],
    details: [
      {
        category: "Experiencia de Cliente & Agendamiento",
        items: [
          "Navegación simplificada en 2 pestañas: 'Agendar Turno' y 'Mi Portal'.",
          "Catálogo visual de cortes y fotos de referencia integrado en el momento de selección del servicio.",
          "Sub-navegación dentro de Mi Portal para alternar entre Citas, Membresía Activa y Puntos de Fidelidad."
        ]
      },
      {
        category: "Panel de Administración",
        items: [
          "Diseño horizontal fluido en la barra de submódulos de administración en pantallas normales.",
          "Alineación visual consistente en las tarjetas métricas de ingresos, citas y multas."
        ]
      }
    ]
  },
  {
    version: "v2.6.2",
    name: "Consolidación de Avisos & Optimización Visual de Cabecera",
    releaseDate: "2026-09-20",
    isCurrent: false,
    type: "patch",
    highlights: [
      "Avisos y Comunicados Oficiales Compactos con persistencia en memoria local",
      "Indicador de Conexión en Tiempo Real (SSE) no invasivo integrado en barra de navegación",
      "Reducción del espacio vertical ocupado por alertas para mayor visibilidad de la agenda",
      "Sincronización y despliegue oficial de la versión v2.6.2 en toda la plataforma"
    ],
    details: [
      {
        category: "Interfaz y Experiencia de Usuario (UI/UX)",
        items: [
          "Reorganización de los banners de cabecera en paneles administrativos y modo silla.",
          "Persistencia permanente al descartar comunicados para evitar apariciones repetitivas.",
          "Diseño optimizado para maximizar el área visible de turnos y clientes en pantallas móviles y de escritorio."
        ]
      }
    ]
  },
  {
    version: "v2.6.1",
    name: "Optimización de Flujo de Agendamiento (UX) & Catálogo en Paso 1",
    releaseDate: "2026-09-15",
    isCurrent: false,
    type: "patch",
    highlights: [
      "Reorganización Estructural del Agendamiento (Barbero ➔ Agenda ➔ Corte ➔ Datos)",
      "Integración del Catálogo Visual de Estilos ¿Indeciso? en el Paso 1 de Elección de Barbero",
      "Selección Dinámica de Horarios Disponibles previo a la selección del Corte",
      "Persistencia de la foto de referencia adjunta durante toda la reserva"
    ],
    details: [
      {
        category: "Experiencia de Cliente (UX)",
        items: [
          "Nuevo flujo intuitivo en 4 pasos: Barbero -> Fecha/Hora -> Servicio -> Confirmación.",
          "Ubicación estratégica del banner de catálogo en el Paso 1 para clientes indecisos.",
          "Carga fluida de fotos de referencia y sincronización con el pedido de reserva."
        ]
      }
    ]
  },
  {
    version: "v2.6.0",
    name: "Formato de Horas 12H AM/PM & Autogestión de Clientes",
    releaseDate: "2026-09-04",
    isCurrent: false,
    type: "minor",
    highlights: [
      "Configuración Global de Formato de Horas (12 Horas AM/PM vs 24 Horas Militar)",
      "Recuperación y Restablecimiento de Contraseña para Clientes Finales",
      "Gestión y Edición de Fichas de Clientes en el Panel Administrativo",
      "Envío de Credenciales y Restablecimiento Directo por WhatsApp"
    ],
    details: [
      {
        category: "Configuración & Horarios",
        items: [
          "Soporte para formato de horas 12H AM/PM en Asistente de Configuración Inicial y Parámetros del Salón.",
          "Visualización amigable de horas (ej. 8:00 AM, 2:30 PM, 6:00 PM) en botones de reserva, confirmaciones y agenda.",
          "Mantenimiento interno de horas estandarizadas con conversión dinámica para clientes y barberos."
        ]
      },
      {
        category: "Gestión de Clientes & Seguridad",
        items: [
          "Flujo de recuperación de contraseña autónomo para clientes con verificación de datos.",
          "Herramienta administrativa de generación y actualización de contraseñas de clientes.",
          "Envío instantáneo de nuevas credenciales a clientes vía enlace directo a WhatsApp."
        ]
      }
    ]
  },
  {
    version: "v2.5.0",
    name: "Edición Enterprise & Gestión de Cupos Negociados",
    releaseDate: "2026-08-19",
    isCurrent: false,
    type: "minor",
    highlights: [
      "Gestión de Barberos Directa desde el Área de Desarrollo",
      "Cupos Negociados Especiales por Barbería (Override de Licencia)",
      "Generador de Banners Promocionales QR para Salón y Barberos",
      "Contrato Digital de Licenciamiento SaaS en PDF / WhatsApp",
      "Exclusión de Barberías de Cortesía ($0) en Métricas de Facturación"
    ],
    details: [
      {
        category: "Administración & Permisos Dev",
        items: [
          "Nuevo módulo 'Barberos & Cupos' en la consola Multi-Inquilino.",
          "Alta directa de barberos con bypass de permisos administrativos.",
          "Restablecimiento y visualización segura de contraseñas de personal.",
          "Soporte para auto-expansión de cupos cuando se negocia un barbero extra."
        ]
      },
      {
        category: "Métricas & Comercial SaaS",
        items: [
          "Filtro estricto de cuentas de cortesía/obsequio en el cálculo de MRR y ARPU.",
          "Control automático de fecha de inactivación y notificaciones de vencimiento.",
          "Emisión instantánea de contratos de servicio SaaS con código de verificación."
        ]
      }
    ]
  },
  {
    version: "v2.0.0",
    name: "Arquitectura Multi-Inquilino & Biorritmo SaaS",
    releaseDate: "2026-08-01",
    type: "major",
    highlights: [
      "Lanzamiento de plataforma Multi-Tenant por URL Slug",
      "Persistencia aislada en Google Firebase Firestore REST API",
      "Motor de Licenciamiento Básica, Profesional y Premium",
      "Modo de Mantenimiento y Bloqueo por Suspensión de Pago"
    ],
    details: [
      {
        category: "Infraestructura & Base de Datos",
        items: [
          "Aislamiento lógico por `salon_id` en colecciones de Firestore.",
          "Sincronización en tiempo real vía Server-Sent Events (SSE).",
          "Ajustes de branding personalizado por salón (Colores, Logos, Eslogans)."
        ]
      }
    ]
  },
  {
    version: "v1.0.0",
    name: "Plataforma Base de Gestión de Barbería",
    releaseDate: "2026-07-01",
    type: "major",
    highlights: [
      "Agenda de Citas Interactiva y Bloques de Descanso",
      "Catálogo de Servicios y Gestión de Productos e Inventario",
      "Mapeo de Clientes con Historial Técnico y Galería de Cortes",
      "Cierre de Caja Diario y Liquidación de Comisiones de Barberos"
    ],
    details: [
      {
        category: "Core Operativo",
        items: [
          "Módulo completo de agendamiento para clientes finales y barberos.",
          "Cierre diario de caja con desglose de medios de pago.",
          "Liquidación automatizada de comisiones y anticipos."
        ]
      }
    ]
  }
];
