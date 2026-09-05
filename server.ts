import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, SalonConfig, Barber, MembershipPlan, ClientAccount, DailyClosure, CatalogStyle } from "./src/types";
import { DEFAULT_CATALOG_STYLES } from "./src/data/defaultCatalogStyles";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- FIREBASE FIRESTORE REST PERSISTENCE & LOCAL BACKUP SETUP ---
interface FirebaseAppConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

let firebaseConfig: FirebaseAppConfig | null = null;
let firestoreBaseUrl = "";
let isFirestoreLoaded = false;

// Local JSON Database Persistence Configuration
const DATA_DIR = path.resolve(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "syncbarber_db.json");
const ROOT_DB_PATH = path.resolve(process.cwd(), "syncbarber_db.json");

// Environment separation: Development uses dev_ prefix to isolate test data from real production data
const envMode = (process.env.FIRESTORE_ENV || (process.env.NODE_ENV === "production" ? "prod" : "dev")).toLowerCase();
const isProduction = envMode === "prod" || envMode === "production";
const SYSTEM_COLLECTION = isProduction ? "salon_system" : "dev_salon_system";
const TENANTS_COLLECTION = isProduction ? "salon_tenants" : "dev_salon_tenants";

console.log(`[Firebase] Entorno BD activo: ${isProduction ? "🟢 PRODUCCIÓN" : "🟡 DESARROLLO"} (Colecciones: ${SYSTEM_COLLECTION} / ${TENANTS_COLLECTION})`);

// Find and load firebase-applet-config.json across multiple possible runtime paths
const configCandidates = [
  path.resolve(process.cwd(), "firebase-applet-config.json"),
  path.resolve(__dirname, "firebase-applet-config.json"),
  path.resolve(__dirname, "../firebase-applet-config.json"),
  "./firebase-applet-config.json"
];

for (const cfgPath of configCandidates) {
  try {
    if (fs.existsSync(cfgPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
      if (firebaseConfig && firebaseConfig.projectId && firebaseConfig.firestoreDatabaseId) {
        firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
        console.log(`[Firebase] Conectado a Firestore vía ${cfgPath}. Base de datos ID: ${firebaseConfig.firestoreDatabaseId}`);
        break;
      }
    }
  } catch (err: any) {
    // try next candidate
  }
}

if (!firebaseConfig) {
  console.warn("[Firebase] Nota: firebase-applet-config.json no detectado. Se utilizará la persistencia local en disco.");
}

// Helpers to serialize and deserialize between JS objects and Firestore REST API documents
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in val) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

// In-memory data structures
interface TenantData {
  config: SalonConfig;
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  clients: ClientAccount[];
  reviews: any[];
  memberships?: MembershipPlan[];
  inventory?: any[];
  sales?: any[];
  cashClosures?: DailyClosure[];
  catalogStyles?: CatalogStyle[];
}

// Seed membership plans
let memberships: MembershipPlan[] = [
  {
    id: "bronze",
    name: "Plan Bronce",
    monthlyPrice: 12000,
    discountPercent: 10,
    description: "Ahorra un 10% en todos tus cortes y arreglos.",
    benefits: [
      "10% de descuento en todos los servicios de barbería",
      "Prioridad de agendamiento en horas pico",
      "Bebida sencilla gratis en cada visita (agua o café)"
    ]
  },
  {
    id: "silver",
    name: "Plan Plata",
    monthlyPrice: 20000,
    discountPercent: 15,
    description: "Ahorra un 15% y accede a lavados hidratantes de regalo.",
    benefits: [
      "15% de descuento en todos los servicios",
      "1 lavado capilar hidratante gratuito al mes",
      "Prioridad de agendamiento garantizada",
      "Bebida premium de cortesía (gaseosa o té frío)"
    ]
  },
  {
    id: "gold",
    name: "Plan VIP Oro",
    monthlyPrice: 35000,
    discountPercent: 25,
    description: "El plan definitivo para una experiencia de barbería de lujo, ahorrando un 25%.",
    benefits: [
      "25% de descuento en todos los servicios del salón",
      "Shampoo especial y toalla caliente gratis en cada sesión",
      "Acceso directo y prioritario 24/7 con tu barbero estrella",
      "Bebidas premium libres durante tu atención (cerveza o espresso)"
    ]
  }
];

let tenantData: Record<string, TenantData> = {
  "bella-barba": {
    config: {
      name: "Barberia Demo",
      openTime: "09:00",
      closeTime: "20:00",
      workingDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      intervalMinutes: 30,
      licenseType: "premium",
      activeLicenseKey: "LIC-PREM-V98X2-2026",
      isComplimentary: true,
      billingExempt: true,
      accentColor: "gold",
      textColor: "#FFFFFF",
      backgroundColor: "#060A13",
      cardColor: "#0E1524",
      subCardColor: "#162237",
      borderColor: "#1F314D",
      tagline: "Arte, Precisión & Estilo Masculino",
      noShowPenaltyAmount: 10000,
      timeFormat: "12h",
    },
    services: [
      {
        id: "s1",
        name: "Corte de Autor (Fade / Degradado)",
        price: 20000,
        duration: 30,
        category: "cabello",
        description: "Corte moderno personalizado con lavado premium, degradado milimétrico y peinado con cera de alta gama.",
      },
      {
        id: "s2",
        name: "Ritual de Barba a Navaja y Vapor",
        price: 15000,
        duration: 30,
        category: "barba",
        description: "Afeitado o perfilado con toalla caliente aromática, vapor de ozono para abrir poros y aceites hidratantes.",
      },
      {
        id: "s3",
        name: "Combo Imperial (Corte + Ritual de Barba)",
        price: 32000,
        duration: 60,
        category: "cabello",
        description: "Nuestra experiencia definitiva. Corte de cabello de autor, ritual completo de barba con toalla caliente y bebida premium de cortesía.",
      },
      {
        id: "s4",
        name: "Tinte y Camuflaje de Canas",
        price: 35000,
        duration: 60,
        category: "color",
        description: "Coloración sutil para barba o cabello, disimulando canas de forma natural con productos premium sin amoníaco.",
      },
      {
        id: "s5",
        name: "Limpieza Facial & Mascarilla de Carbón",
        price: 15000,
        duration: 30,
        category: "tratamiento",
        description: "Tratamiento purificante para eliminar impurezas, exfoliación suave y mascarilla negra hidratante.",
      },
    ],
    barbers: [
      { id: "b1", name: "Mateo Gómez (Fade Master)", username: "mateo", password: "123", isActive: true, specialties: ["cabello", "barba"] },
      { id: "b2", name: "Santiago Mendoza (Ritual & Afeitado)", username: "santiago", password: "123", isActive: true, specialties: ["cabello", "barba"] },
      { id: "b3", name: "Andrés Castro (Classic & Scissors)", username: "andres", password: "123", isActive: true, specialties: ["cabello", "tratamiento"] },
    ],
    clients: [
      {
        id: "c_1",
        name: "Juan David Castro",
        phone: "+57 300 111 2233",
        email: "juand@example.com",
        password: "123",
        membershipId: "silver",
        membershipActive: true,
        createdAt: new Date().toISOString(),
        loyaltyPoints: 5,
        internalNotes: "Le gusta la toalla muy caliente antes de perfilar la barba. Piel sensible en cuello.",
        avgCutCycleDays: 18,
        lastCutDate: "2026-07-01",
        technicalPreferences: {
          fadeType: "Bajo (Low Fade)",
          topStyle: "Tijera Texturizado",
          beardStyle: "Ritual Toalla Caliente & Navaja",
          skinSensitivity: "Piel Sensible / Usar Bálsamo",
          favoriteProducts: ["Cera Efecto Mate", "Aceite Nutritivo para Barba"]
        },
        galleryPhotos: [
          {
            id: "p1",
            url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
            date: "2026-07-01",
            styleTag: "Low Fade + Ritual Barba",
            barberName: "Santiago Mendoza",
            notes: "Excelente acabado con navaja y bálsamo hidratante."
          }
        ]
      },
      {
        id: "c_2",
        name: "Carlos Andrés Gómez",
        phone: "+57 312 456 7890",
        email: "carlos@example.com",
        password: "123",
        createdAt: new Date().toISOString(),
        loyaltyPoints: 3,
        internalNotes: "Aplica cera mate al finalizar. Prefiere raya marcada a la izquierda.",
        avgCutCycleDays: 21,
        lastCutDate: "2026-07-16",
        technicalPreferences: {
          fadeType: "Medio (Mid Fade)",
          topStyle: "Pompadour",
          beardStyle: "Delineado Navaja Suave",
          skinSensitivity: "Normal",
          favoriteProducts: ["Polvo Texturizador de Volumen", "Cera Efecto Mate"]
        },
        galleryPhotos: [
          {
            id: "p2",
            url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600",
            date: "2026-07-16",
            styleTag: "Mid Fade Navaja + Pompadour",
            barberName: "Mateo Gómez"
          }
        ]
      },
      {
        id: "c_3",
        name: "Santiago Pérez",
        phone: "+57 321 333 4444",
        email: "santiago@example.com",
        password: "123",
        createdAt: new Date().toISOString(),
        loyaltyPoints: 1,
        internalNotes: "Usa tijera en la parte superior. Cuidado con irritaciones detrás de las orejas.",
        avgCutCycleDays: 15,
        lastCutDate: "2026-07-08",
        technicalPreferences: {
          fadeType: "Taper Fade",
          topStyle: "Buzz Cut",
          beardStyle: "Sin Barba",
          skinSensitivity: "Propenso a Irritación con Navaja",
          favoriteProducts: ["Shampoo Hydratante"]
        },
        galleryPhotos: [
          {
            id: "p3",
            url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=600",
            date: "2026-07-08",
            styleTag: "Taper Fade + Tijera Classic",
            barberName: "Andrés Castro"
          }
        ]
      }
    ],
    reviews: [
      {
        id: "r1",
        clientName: "Juan David Castro",
        barberId: "b2",
        rating: 5,
        comment: "El ritual de barba con vapor de ozono y toallas calientes es de otro mundo. ¡Recomendado 100%!",
        date: "2026-07-10"
      },
      {
        id: "r2",
        clientName: "Carlos Andrés Gómez",
        barberId: "b1",
        rating: 5,
        comment: "Mateo hace los mejores degradados de la ciudad. El corte fade quedó impecable y muy detallado.",
        date: "2026-07-12"
      },
      {
        id: "r3",
        clientName: "Santiago Pérez",
        barberId: "b3",
        rating: 5,
        comment: "Andrés tiene una técnica increíble con la tijera clásica. Excelente conversación y asesoría.",
        date: "2026-07-14"
      }
    ],
    appointments: [
      {
        id: "a1",
        clientName: "Carlos Andrés Gómez",
        clientPhone: "+57 312 456 7890",
        clientEmail: "carlos@example.com",
        serviceId: "s1",
        serviceName: "Corte de Autor (Fade / Degradado)",
        price: 20000,
        date: "2026-07-16",
        time: "10:30",
        duration: 30,
        status: "completed",
        notes: "Prefiere fade medio.",
        hairdresserNotes: "Corte realizado con éxito. Se aplicó pomada mate.",
        barberId: "b1",
        barberName: "Mateo Gómez (Fade Master)",
        createdAt: "2026-07-15T14:20:00.000Z",
      },
      {
        id: "a2",
        clientName: "Juan David Castro",
        clientPhone: "+57 300 111 2233",
        clientEmail: "juand@example.com",
        serviceId: "s2",
        serviceName: "Ritual de Barba a Navaja y Vapor",
        price: 15000,
        date: "2026-07-16",
        time: "12:00",
        duration: 30,
        status: "confirmed",
        notes: "Piel sensible.",
        barberId: "b2",
        barberName: "Santiago Mendoza (Ritual & Afeitado)",
        createdAt: "2026-07-15T16:45:00.000Z",
      },
      {
        id: "a3",
        clientName: "Santiago Pérez",
        clientPhone: "+57 321 333 4444",
        clientEmail: "santiago@example.com",
        serviceId: "s3",
        serviceName: "Combo Imperial (Corte + Ritual de Barba)",
        price: 32000,
        date: "2026-07-17",
        time: "11:00",
        duration: 60,
        status: "confirmed",
        notes: "Quiere probar la toalla caliente por primera vez.",
        barberId: "b3",
        barberName: "Andrés Castro (Classic & Scissors)",
        createdAt: "2026-07-16T08:00:00.000Z",
      }
    ],
    catalogStyles: JSON.parse(JSON.stringify(DEFAULT_CATALOG_STYLES))
  }
};

// Legacy fallback references (backed by "bella-barba" tenant)
let salonConfig = tenantData["bella-barba"].config;
let services = tenantData["bella-barba"].services;
let barbers = tenantData["bella-barba"].barbers;
let clientAccounts = tenantData["bella-barba"].clients;
let reviews = tenantData["bella-barba"].reviews;
let appointments = tenantData["bella-barba"].appointments;

// Active SSE client connections
let sseClients: { id: string; tenantId: string; res: express.Response }[] = [];

// Helper function to resolve tenant memberships with default fallback
function getTenantMemberships(tenant: TenantData): MembershipPlan[] {
  if (!tenant.memberships || !Array.isArray(tenant.memberships) || tenant.memberships.length === 0) {
    tenant.memberships = JSON.parse(JSON.stringify(memberships));
  }
  return tenant.memberships;
}

// Helper function to resolve tenant inventory
function getTenantInventory(tenant: TenantData, isDemoFallback: boolean = false): any[] {
  if (!tenant.inventory || !Array.isArray(tenant.inventory)) {
    if (isDemoFallback) {
      tenant.inventory = [
        { id: "inv_1", name: "Cerveza Club Colombia Dorada 330ml", category: "nevera", price: 7000, cost: 3500, stock: 24, minStock: 6, barcode: "7702001001", allowBarberCommission: false, commissionPercent: 0 },
        { id: "inv_2", name: "Cerveza Corona Extra 355ml", category: "nevera", price: 9000, cost: 4800, stock: 18, minStock: 5, barcode: "7702001002", allowBarberCommission: false, commissionPercent: 0 },
        { id: "inv_3", name: "Soda Aromatizada Frutos Rojos 300ml", category: "nevera", price: 6000, cost: 2500, stock: 15, minStock: 5, barcode: "7702001003", allowBarberCommission: false, commissionPercent: 0 },
        { id: "inv_4", name: "Agua Manantial con Gas 500ml", category: "nevera", price: 4000, cost: 1800, stock: 30, minStock: 10, barcode: "7702001004", allowBarberCommission: false, commissionPercent: 0 },
        { id: "inv_5", name: "Cera Moldeadora Efekto Mate 100g", category: "estilizado", price: 35000, cost: 18000, stock: 12, minStock: 3, barcode: "7702002001", allowBarberCommission: true, commissionPercent: 10 },
        { id: "inv_6", name: "Aceite Hidratante para Barba 30ml", category: "barba", price: 28000, cost: 14000, stock: 8, minStock: 2, barcode: "7702002002", allowBarberCommission: true, commissionPercent: 10 },
        { id: "inv_7", name: "Polvo Texturizador Volumétrico 20g", category: "estilizado", price: 40000, cost: 20000, stock: 10, minStock: 3, barcode: "7702002003", allowBarberCommission: true, commissionPercent: 12 },
        { id: "inv_8", name: "Shampoo Anticaída & Carbón Activado 250ml", category: "cabello", price: 32000, cost: 16000, stock: 6, minStock: 2, barcode: "7702002004", allowBarberCommission: true, commissionPercent: 10 }
      ];
    } else {
      tenant.inventory = [];
    }
  }
  return tenant.inventory;
}

// Helper function to resolve tenant sales
function getTenantSales(tenant: TenantData): any[] {
  if (!tenant.sales || !Array.isArray(tenant.sales)) {
    tenant.sales = [];
  }
  return tenant.sales;
}

// Helper function to resolve tenant catalog styles
function getTenantCatalogStyles(tenant: TenantData): CatalogStyle[] {
  if (!tenant.catalogStyles || !Array.isArray(tenant.catalogStyles)) {
    tenant.catalogStyles = [];
  }
  return tenant.catalogStyles;
}

// Helper function to extract Tenant ID cleanly
function getTenantId(req: express.Request): string {
  const sanitize = (val: any): string | null => {
    if (val && typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed && trimmed !== "undefined" && trimmed !== "null") {
        return trimmed;
      }
    }
    return null;
  };

  const headerTenant = sanitize(req.headers["x-tenant-id"]) || sanitize(req.headers["x-tenant-slug"]);
  if (headerTenant) {
    return headerTenant;
  }
  const queryTenant = sanitize(req.query.salonId) || sanitize(req.query.tenantId);
  if (queryTenant) {
    return queryTenant;
  }
  return "bella-barba";
}

// --- AUTO-SAVE MIDDLEWARE ---
app.use((req, res, next) => {
  const previousTenantIds = Object.keys(tenantData);
  
  res.on("finish", () => {
    if (["POST", "PUT", "DELETE"].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      const currentTenantIds = Object.keys(tenantData);
      
      // Save any newly created tenants
      currentTenantIds.forEach(tId => {
        if (!previousTenantIds.includes(tId)) {
          saveTenantToFirestore(tId);
        }
      });

      // Save active tenant
      const tenantId = getTenantId(req);
      if (tenantId && tenantData[tenantId]) {
        saveTenantToFirestore(tenantId);
      }

      // Save global arrays
      saveGlobalsToFirestore();
    }
  });

  next();
});

// Helper function to broadcast state changes to connected SSE clients
function broadcastChange(type: string, data: any, tenantId?: string) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    // If tenantId is specified, only send to clients of that tenant. Else send to all.
    if (!tenantId || client.tenantId === tenantId) {
      try {
        client.res.write(`data: ${payload}\n\n`);
        if (typeof (client.res as any).flush === "function") {
          (client.res as any).flush();
        }
      } catch (err) {
        console.error("[SSE Broadcast Error] Error writing to client:", err);
      }
    }
  });
}

// 1. Real-time events connection (SSE)
app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];

  // Send initial data snapshot
  const initialPayload = JSON.stringify({
    type: "init",
    data: {
      appointments: tenant.appointments,
      services: tenant.services,
      config: tenant.config,
      barbers: tenant.barbers,
      memberships,
      reviews: tenant.reviews,
      clients: tenant.clients,
      announcements: globalAnnouncements || [],
      inventory: getTenantInventory(tenant),
      sales: getTenantSales(tenant),
    },
  });
  res.write(`data: ${initialPayload}\n\n`);
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  const clientId = Date.now().toString();
  const newClient = { id: clientId, tenantId, res };
  sseClients.push(newClient);

  // Keep connection alive with a ping comment every 15s
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch (err) {
      console.error("[SSE Keepalive Error] Failed to write keepalive:", err);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAliveInterval);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Consolidated state snapshot endpoint (prevents rate limits from parallel requests)
app.get("/api/state", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json({
    appointments: tenant.appointments || [],
    services: tenant.services || [],
    config: tenant.config,
    barbers: tenant.barbers || [],
    memberships: memberships || [],
    reviews: tenant.reviews || [],
    clients: tenant.clients || [],
    announcements: globalAnnouncements || [],
    inventory: getTenantInventory(tenant),
    sales: getTenantSales(tenant),
  });
});

// 2. Salon Config Routes
app.get("/api/config", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.config);
});

app.put("/api/config", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { 
    name, 
    openTime, 
    closeTime, 
    workingDays, 
    intervalMinutes, 
    licenseType, 
    activeLicenseKey, 
    serviceCategories, 
    customLogoUrl, 
    accentColor, 
    textColor, 
    tagline, 
    backgroundColor, 
    cardColor, 
    subCardColor, 
    borderColor, 
    noShowPenaltyAmount 
  } = req.body;

  // Validation: Hours / Schedule
  const effectiveOpen = openTime || tenant.config.openTime || "08:00";
  const effectiveClose = closeTime || tenant.config.closeTime || "20:00";

  const timeToMinutes = (timeStr: string) => {
    const parts = (timeStr || "").split(":").map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts[0] * 60 + parts[1];
  };

  const openMins = timeToMinutes(effectiveOpen);
  const closeMins = timeToMinutes(effectiveClose);

  if (openMins === null || closeMins === null) {
    return res.status(400).json({ error: "Formato de horario inválido (debe ser HH:MM en formato 24 horas)." });
  }

  if (openMins >= closeMins) {
    return res.status(400).json({ 
      error: `La hora de apertura (${effectiveOpen}) no puede ser igual o posterior a la hora de cierre (${effectiveClose}).` 
    });
  }

  // Validation: Working Days
  if (workingDays !== undefined) {
    if (!Array.isArray(workingDays) || workingDays.length === 0) {
      return res.status(400).json({ error: "Debes seleccionar al menos un día laboral válido." });
    }
    const cleanDays = workingDays
      .map(Number)
      .filter((d) => !isNaN(d) && d >= 0 && d <= 6);
    if (cleanDays.length === 0) {
      return res.status(400).json({ error: "No se enviaron días laborales válidos (valores 0 a 6)." });
    }
    tenant.config.workingDays = Array.from(new Set(cleanDays)).sort((a, b) => a - b);
  }

  if (name && typeof name === "string" && name.trim()) {
    tenant.config.name = name.trim();
    // Also keep developer tenants array synced
    const devTenant = tenants.find(t => t.id === tenantId);
    if (devTenant) devTenant.name = name.trim();
  }

  if (openTime) tenant.config.openTime = openTime;
  if (closeTime) tenant.config.closeTime = closeTime;
  if (intervalMinutes) tenant.config.intervalMinutes = Number(intervalMinutes);
  if (licenseType) tenant.config.licenseType = licenseType;
  if (activeLicenseKey !== undefined) tenant.config.activeLicenseKey = activeLicenseKey;
  if (serviceCategories !== undefined) tenant.config.serviceCategories = serviceCategories;
  if (customLogoUrl !== undefined) tenant.config.customLogoUrl = customLogoUrl;
  if (accentColor !== undefined) tenant.config.accentColor = accentColor;
  if (textColor !== undefined) tenant.config.textColor = textColor;
  if (tagline !== undefined) tenant.config.tagline = typeof tagline === "string" ? tagline.trim() : "";
  if (backgroundColor !== undefined) tenant.config.backgroundColor = backgroundColor;
  if (cardColor !== undefined) tenant.config.cardColor = cardColor;
  if (subCardColor !== undefined) tenant.config.subCardColor = subCardColor;
  if (borderColor !== undefined) tenant.config.borderColor = borderColor;
  if (noShowPenaltyAmount !== undefined) tenant.config.noShowPenaltyAmount = Number(noShowPenaltyAmount);
  if (req.body.phone !== undefined) tenant.config.phone = req.body.phone;
  if (req.body.whatsapp !== undefined) tenant.config.whatsapp = req.body.whatsapp;
  if (req.body.timeFormat !== undefined) tenant.config.timeFormat = req.body.timeFormat;

  // Broadcast in real-time
  broadcastChange("config_update", tenant.config, tenantId);

  // Persist immediately in Firestore and in memory
  saveTenantToFirestore(tenantId);
  saveGlobalsToFirestore();

  res.json({ message: "Configuración actualizada con éxito", config: tenant.config });
});

app.post("/api/setup/complete", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado" });
  }

  const { config: updatedConfig, services: updatedServices, barbers: updatedBarbers } = req.body;

  if (updatedConfig) {
    tenant.config = {
      ...tenant.config,
      ...updatedConfig,
      needsSetup: false
    };

    if (updatedConfig.name) {
      const devTenant = tenants.find(t => t.id === tenantId);
      if (devTenant) devTenant.name = updatedConfig.name;
    }
  }

  if (updatedServices && Array.isArray(updatedServices)) {
    tenant.services = updatedServices.map((s: any, idx: number) => ({
      id: s.id && !s.id.startsWith("s_setup_") ? s.id : `s_${Date.now()}_${idx}`,
      name: s.name,
      price: Number(s.price),
      duration: Number(s.duration || 30),
      category: s.category || "cabello",
      description: s.description || ""
    }));
  }

  if (updatedBarbers && Array.isArray(updatedBarbers)) {
    tenant.barbers = updatedBarbers.map((b: any, idx: number) => ({
      id: b.id && !b.id.startsWith("b_setup_") ? b.id : `b_${Date.now()}_${idx}`,
      name: b.name,
      username: b.username,
      password: b.password || "123",
      isActive: b.isActive !== undefined ? b.isActive : true,
      specialties: b.specialties || ["cabello", "barba"]
    }));
  }

  broadcastChange("config_update", tenant.config, tenantId);
  broadcastChange("services_update", tenant.services, tenantId);
  broadcastChange("barbers_update", tenant.barbers, tenantId);

  // Persist to Firestore
  saveTenantToFirestore(tenantId);
  saveGlobalsToFirestore();

  res.json({ success: true, config: tenant.config, services: tenant.services, barbers: tenant.barbers });
});

// --- Developer Tenants & Administrators System ---
let tenants: any[] = [
  { id: "bella-barba", name: "Barberia Demo", licenseType: "premium", activeLicenseKey: "LIC-PREM-V98X2-2026", isComplimentary: true, billingExempt: true }
];

let salonAdmins: any[] = [
  { id: "adm_default", name: "Administrador General", username: "admin", password: "admin", salonId: "bella-barba" }
];

app.get("/api/developer/tenants", (req, res) => {
  const tenantsWithConfig = tenants.map(t => {
    const tenant = tenantData[t.id] || tenantData["bella-barba"];
    const isComplimentary = t.isComplimentary !== undefined 
      ? t.isComplimentary 
      : (tenant?.config?.isComplimentary !== undefined ? tenant.config.isComplimentary : (t.id === "bella-barba"));

    return {
      ...t,
      isComplimentary: Boolean(isComplimentary),
      billingExempt: Boolean(isComplimentary),
      config: tenant?.config ? {
        ...tenant.config,
        isComplimentary: Boolean(isComplimentary),
        billingExempt: Boolean(isComplimentary)
      } : null,
      barbers: tenant.barbers || [],
      services: tenant.services || [],
      memberships: getTenantMemberships(tenant)
    };
  });
  res.json({ tenants: tenantsWithConfig });
});

// Endpoint to toggle or change complimentary (Cortesía / Obsequio $0) status for any tenant
app.put("/api/developer/tenants/:id/complimentary", (req, res) => {
  const { id } = req.params;
  const { isComplimentary } = req.body;

  const tenant = tenants.find(t => t.id === id);
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  const complimentaryValue = Boolean(isComplimentary);
  tenant.isComplimentary = complimentaryValue;
  tenant.billingExempt = complimentaryValue;

  // Update tenant configuration in tenantData
  if (tenantData[id]) {
    tenantData[id].config.isComplimentary = complimentaryValue;
    tenantData[id].config.billingExempt = complimentaryValue;
    broadcastChange("config_update", tenantData[id].config, id);
  }

  // Also update corresponding active license if present
  if (tenant.activeLicenseKey) {
    const lic = generatedLicenses.find(l => l.key.toUpperCase() === tenant.activeLicenseKey.toUpperCase());
    if (lic) {
      lic.isComplimentary = complimentaryValue;
      lic.billingExempt = complimentaryValue;
    }
  }

  // Also update any generatedLicenses that match this tenant
  generatedLicenses.forEach(l => {
    if (l.tenantId === id || l.salonName === tenant.name) {
      l.isComplimentary = complimentaryValue;
      l.billingExempt = complimentaryValue;
    }
  });

  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  res.json({
    message: complimentaryValue 
      ? `La barbería '${tenant.name}' ha sido configurada como Licencia de Cortesía ($0 Facturación).`
      : `La barbería '${tenant.name}' ha sido configurada como Licencia Regular de Pago.`,
    isComplimentary: complimentaryValue,
    billingExempt: complimentaryValue,
    tenant,
    currentConfig: tenantData[id]?.config
  });
});

app.put("/api/developer/tenants/:id/license", (req, res) => {
  const { id } = req.params;
  const { licenseType, isComplimentary } = req.body;
  
  if (!licenseType || !["basica", "profesional", "premium"].includes(licenseType)) {
    return res.status(400).json({ error: "Tipo de licencia no válido." });
  }

  const tenant = tenants.find(t => t.id === id);
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  tenant.licenseType = licenseType;
  if (isComplimentary !== undefined) {
    tenant.isComplimentary = Boolean(isComplimentary);
    tenant.billingExempt = Boolean(isComplimentary);
  }

  // Also update corresponding license key status/type if matches
  if (tenant.activeLicenseKey) {
    const lic = generatedLicenses.find(l => l.key === tenant.activeLicenseKey);
    if (lic) {
      lic.licenseType = licenseType;
      if (isComplimentary !== undefined) {
        lic.isComplimentary = Boolean(isComplimentary);
        lic.billingExempt = Boolean(isComplimentary);
      }
    }
  }

  // Update in tenantData if exists
  if (tenantData[id]) {
    tenantData[id].config.licenseType = licenseType;
    if (isComplimentary !== undefined) {
      tenantData[id].config.isComplimentary = Boolean(isComplimentary);
      tenantData[id].config.billingExempt = Boolean(isComplimentary);
    }
    broadcastChange("config_update", tenantData[id].config, id);
  }

  // Persist directly to Firestore
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  res.json({ message: "Licencia de inquilino actualizada con éxito", tenant, currentConfig: tenantData[id]?.config });
});

app.put("/api/developer/tenants/:id/config", (req, res) => {
  const { id } = req.params;
  const { name, customLogoUrl, accentColor, textColor, tagline, backgroundColor, cardColor, subCardColor, borderColor } = req.body;
  
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  if (name) tenant.name = name;

  if (tenantData[id]) {
    if (name) tenantData[id].config.name = name;
    if (customLogoUrl !== undefined) tenantData[id].config.customLogoUrl = customLogoUrl;
    if (accentColor !== undefined) tenantData[id].config.accentColor = accentColor;
    if (textColor !== undefined) tenantData[id].config.textColor = textColor;
    if (tagline !== undefined) tenantData[id].config.tagline = tagline;
    if (backgroundColor !== undefined) tenantData[id].config.backgroundColor = backgroundColor;
    if (cardColor !== undefined) tenantData[id].config.cardColor = cardColor;
    if (subCardColor !== undefined) tenantData[id].config.subCardColor = subCardColor;
    if (borderColor !== undefined) tenantData[id].config.borderColor = borderColor;
    
    broadcastChange("config_update", tenantData[id].config, id);
  }

  // Persist directly to Firestore
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  res.json({ message: "Estándares del inquilino actualizados", tenant, config: tenantData[id]?.config });
});

// Update Feature Flags & Maintenance Lockdown
app.put("/api/developer/tenants/:id/flags", (req, res) => {
  const { id } = req.params;
  const { featureFlags, maintenanceMode, maintenanceMessage, maintenanceAllowAdmins } = req.body;

  const tenant = tenantData[id];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  if (featureFlags && typeof featureFlags === "object") {
    tenant.config.featureFlags = {
      ...tenant.config.featureFlags,
      ...featureFlags
    };
  }

  if (maintenanceMode !== undefined) tenant.config.maintenanceMode = Boolean(maintenanceMode);
  if (maintenanceMessage !== undefined) tenant.config.maintenanceMessage = String(maintenanceMessage);
  if (maintenanceAllowAdmins !== undefined) tenant.config.maintenanceAllowAdmins = Boolean(maintenanceAllowAdmins);

  broadcastChange("config_update", tenant.config, id);
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  res.json({
    message: "Configuración de Feature Flags y Mantenimiento actualizada correctamente",
    config: tenant.config
  });
});

// Update SaaS Billing, Due Date & Suspension Lock
app.put("/api/developer/tenants/:id/billing", (req, res) => {
  const { id } = req.params;
  const { 
    billingStatus, 
    billingDueDate, 
    billingAmountDue, 
    billingGraceDays, 
    billingCustomMessage, 
    billingPaymentLink, 
    billingAccountInfo 
  } = req.body;

  const tenant = tenantData[id];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  if (billingStatus !== undefined) tenant.config.billingStatus = billingStatus;
  if (billingDueDate !== undefined) tenant.config.billingDueDate = billingDueDate;
  if (billingAmountDue !== undefined) tenant.config.billingAmountDue = Number(billingAmountDue);
  if (billingGraceDays !== undefined) tenant.config.billingGraceDays = Number(billingGraceDays);
  if (billingCustomMessage !== undefined) tenant.config.billingCustomMessage = String(billingCustomMessage);
  if (billingPaymentLink !== undefined) tenant.config.billingPaymentLink = String(billingPaymentLink);
  if (billingAccountInfo !== undefined) tenant.config.billingAccountInfo = String(billingAccountInfo);

  broadcastChange("config_update", tenant.config, id);
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  res.json({
    message: "Estado de facturación y cobro del inquilino actualizado",
    config: tenant.config
  });
});

// Selective Data Purge & Factory Reset Endpoint
app.post("/api/developer/tenants/:id/purge", (req, res) => {
  const { id } = req.params;
  const { purgeAppointments, purgeCashClosures, purgeSales, purgeClients, factoryReset } = req.body;

  const tenant = tenantData[id];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  let purgedCount = 0;

  if (req.body.wipeAllToBlank) {
    tenant.services = [];
    tenant.barbers = [];
    tenant.memberships = [];
    tenant.appointments = [];
    tenant.clients = [];
    tenant.inventory = [];
    tenant.sales = [];
    tenant.cashClosures = [];
    tenant.reviews = [];
    tenant.catalogStyles = [];
    tenant.config.needsSetup = true;
    saveTenantToFirestore(id);
    saveGlobalsToFirestore();
    broadcastChange("data_purge", { tenantId: id, wipeAllToBlank: true }, id);
    return res.json({ message: `La barbería '${tenant.config.name}' ha sido reiniciada completamente en blanco para ser llenada desde cero.` });
  }

  if (factoryReset) {
    tenant.appointments = [];
    tenant.sales = [];
    tenant.cashClosures = [];
    tenant.reviews = [];
    saveTenantToFirestore(id);
    saveGlobalsToFirestore();
    broadcastChange("data_purge", { tenantId: id, factoryReset: true }, id);
    return res.json({ message: `Restablecimiento de fábrica completado para la barbería '${tenant.config.name}'` });
  }

  if (purgeAppointments) {
    purgedCount += tenant.appointments.length;
    tenant.appointments = [];
  }

  if (purgeCashClosures && tenant.cashClosures) {
    purgedCount += tenant.cashClosures.length;
    tenant.cashClosures = [];
  }

  if (purgeSales && tenant.sales) {
    purgedCount += tenant.sales.length;
    tenant.sales = [];
  }

  if (purgeClients) {
    purgedCount += tenant.clients.length;
    tenant.clients = [];
  }

  saveTenantToFirestore(id);
  saveGlobalsToFirestore();
  broadcastChange("data_purge", { tenantId: id, purgedCount }, id);

  res.json({ message: `Purga de datos completada con éxito. Se eliminaron ${purgedCount} registros.` });
});

app.put("/api/developer/tenants/:id/memberships", (req, res) => {
  const { id } = req.params;
  const { memberships: newMemberships } = req.body;

  if (!newMemberships || !Array.isArray(newMemberships)) {
    return res.status(400).json({ error: "Arreglo de membresías no válido." });
  }

  const tenant = tenantData[id];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  // Validate memberships structure
  for (const m of newMemberships) {
    if (!m.id || !m.name || typeof m.monthlyPrice !== "number" || typeof m.discountPercent !== "number") {
      return res.status(400).json({ error: "Estructura de plan de membresía no válida. Cada plan debe tener id, name, monthlyPrice (número) y discountPercent (número)." });
    }
  }

  tenant.memberships = newMemberships;

  // Persist directly to Firestore
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  // Broadcast change
  broadcastChange("memberships_update", tenant.memberships, id);

  res.json({ message: "Planes de membresías del inquilino actualizados con éxito", memberships: tenant.memberships });
});

app.get("/api/developer/admins", (req, res) => {
  res.json({ admins: salonAdmins });
});

app.post("/api/developer/admins", (req, res) => {
  const { name, username, password, salonId } = req.body;
  if (!name || !username || !password || !salonId) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }

  // Check duplicate usernames across admins and barbers of the target tenant
  const adminExists = salonAdmins.some(a => a.username.toLowerCase() === username.toLowerCase());
  const targetTenant = tenantData[salonId] || tenantData["bella-barba"];
  const barberExists = targetTenant.barbers.some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";

  if (adminExists || barberExists) {
    return res.status(409).json({ error: "El nombre de usuario del administrador ya existe." });
  }

  // Check admin license limit (Plan Básica allows only 1 administrator)
  const targetLicType = targetTenant.config?.licenseType || "basica";
  if (targetLicType === "basica") {
    const existingSalonAdmins = salonAdmins.filter(a => a.salonId === salonId);
    if (existingSalonAdmins.length >= 1) {
      return res.status(403).json({
        error: "Límite de administradores alcanzado: El Plan Básica solo permite 1 usuario Administrador. Actualiza al Plan Profesional o Premium Enterprise para habilitar acceso multiusuario administrativo."
      });
    }
  }

  const newAdmin = {
    id: "adm_" + Date.now().toString(),
    name,
    username,
    password,
    salonId
  };

  salonAdmins.push(newAdmin);
  res.status(201).json({ message: "Administrador de barbería creado con éxito", admin: newAdmin });
});

// --- Developer Barber Management & Negotiated Quota Endpoints ---
app.get("/api/developer/tenants/:id/barbers", (req, res) => {
  const { id } = req.params;
  const tenant = tenantData[id] || tenantData["bella-barba"];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  const licType = (tenant.config?.licenseType || "basica") as keyof typeof saasPricingPlans;
  const plan = saasPricingPlans[licType] || saasPricingPlans.basica;
  const defaultMaxBarbers = plan.maxBarbers || (licType === "basica" ? 2 : licType === "profesional" ? 5 : 99);
  const customMaxBarbers = tenant.config?.customMaxBarbers ? Number(tenant.config.customMaxBarbers) : null;
  const effectiveMaxBarbers = customMaxBarbers || defaultMaxBarbers;
  const activeCount = (tenant.barbers || []).filter(b => b.isActive !== false).length;

  res.json({
    tenantId: id,
    salonName: tenant.config?.name || id,
    licenseType: licType,
    planName: plan.name || licType,
    defaultMaxBarbers,
    customMaxBarbers,
    effectiveMaxBarbers,
    activeCount,
    isCustomQuota: Boolean(customMaxBarbers && customMaxBarbers !== defaultMaxBarbers),
    barbers: tenant.barbers || []
  });
});

app.put("/api/developer/tenants/:id/custom-barber-limit", (req, res) => {
  const { id } = req.params;
  const { customMaxBarbers, reason } = req.body;
  const tenant = tenantData[id];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  if (customMaxBarbers === null || customMaxBarbers === undefined || customMaxBarbers === "") {
    delete tenant.config.customMaxBarbers;
  } else {
    const val = Number(customMaxBarbers);
    if (isNaN(val) || val < 1) {
      return res.status(400).json({ error: "El cupo personalizado debe ser un número entero mayor a 0." });
    }
    tenant.config.customMaxBarbers = val;
  }

  // Update in tenants list as well
  const tObj = tenants.find(t => t.id === id);
  if (tObj) {
    if (!tObj.config) tObj.config = {};
    if (tenant.config.customMaxBarbers) {
      tObj.config.customMaxBarbers = tenant.config.customMaxBarbers;
    } else {
      delete tObj.config.customMaxBarbers;
    }
  }

  // Save to Firestore
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  broadcastChange("config_update", tenant.config, id);
  broadcastChange("barbers_update", tenant.barbers, id);

  res.json({
    success: true,
    message: tenant.config.customMaxBarbers 
      ? `Cupo especial negociado configurado en ${tenant.config.customMaxBarbers} barberos para '${tenant.config.name}'`
      : `Cupo de barberos restablecido a los valores por defecto del plan para '${tenant.config.name}'`,
    customMaxBarbers: tenant.config.customMaxBarbers || null
  });
});

app.post("/api/developer/tenants/:id/barbers", (req, res) => {
  const { id } = req.params;
  const tenant = tenantData[id] || tenantData["bella-barba"];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  const { name, username, password, specialties, avatarUrl, photoUrl, commissionPercent, autoExpandQuota } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: "Nombre, usuario y contraseña son requeridos." });
  }

  const exists = (tenant.barbers || []).some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";
  if (exists) {
    return res.status(409).json({ error: "El nombre de usuario ya existe en esta barbería." });
  }

  const licType = (tenant.config?.licenseType || "basica") as keyof typeof saasPricingPlans;
  const plan = saasPricingPlans[licType] || saasPricingPlans.basica;
  const defaultMax = plan.maxBarbers || (licType === "basica" ? 2 : licType === "profesional" ? 5 : 99);
  const currentCustom = tenant.config?.customMaxBarbers ? Number(tenant.config.customMaxBarbers) : null;
  const currentMaxAllowed = currentCustom || defaultMax;
  const activeCount = (tenant.barbers || []).filter(b => b.isActive !== false).length;

  // If the new barber exceeds the current limit, automatically expand the negotiated quota if requested (or by default in Dev Panel)
  let quotaExpanded = false;
  if (activeCount + 1 > currentMaxAllowed) {
    const newNegotiatedQuota = activeCount + 1;
    tenant.config.customMaxBarbers = newNegotiatedQuota;
    quotaExpanded = true;

    const tObj = tenants.find(t => t.id === id);
    if (tObj) {
      if (!tObj.config) tObj.config = {};
      tObj.config.customMaxBarbers = newNegotiatedQuota;
    }
  }

  const newBarber: Barber = {
    id: "b_dev_" + Date.now().toString(),
    name,
    username,
    password,
    isActive: true,
    specialties: specialties || ["cabello"],
    avatarUrl: avatarUrl || photoUrl || "",
    photoUrl: photoUrl || avatarUrl || "",
    commissionPercent: commissionPercent !== undefined ? Number(commissionPercent) : 50
  };

  if (!tenant.barbers) tenant.barbers = [];
  tenant.barbers.push(newBarber);

  // Persist directly to Firestore
  saveTenantToFirestore(id);
  saveGlobalsToFirestore();

  broadcastChange("barbers_update", tenant.barbers, id);
  broadcastChange("config_update", tenant.config, id);

  res.status(201).json({
    success: true,
    message: quotaExpanded
      ? `Barbero '${name}' creado exitosamente. Se expandió automáticamente el cupo negociado a ${tenant.config.customMaxBarbers} barberos.`
      : `Barbero '${name}' creado exitosamente desde el Panel de Desarrollo.`,
    barber: newBarber,
    customMaxBarbers: tenant.config.customMaxBarbers || null,
    quotaExpanded
  });
});

app.put("/api/developer/tenants/:tenantId/barbers/:barberId", (req, res) => {
  const { tenantId, barberId } = req.params;
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  const index = (tenant.barbers || []).findIndex(b => b.id === barberId);
  if (index === -1) {
    return res.status(404).json({ error: "Barbero no encontrado en este inquilino." });
  }

  const { name, username, password, isActive, specialties, commissionPercent, avatarUrl, photoUrl } = req.body;

  if (username && username.toLowerCase() !== tenant.barbers[index].username.toLowerCase()) {
    const exists = tenant.barbers.some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";
    if (exists) {
      return res.status(409).json({ error: "El nombre de usuario ya está en uso." });
    }
  }

  // If reactivating and it would exceed limit, auto-expand customMaxBarbers
  if (isActive === true && tenant.barbers[index].isActive === false) {
    const licType = (tenant.config?.licenseType || "basica") as keyof typeof saasPricingPlans;
    const plan = saasPricingPlans[licType] || saasPricingPlans.basica;
    const defaultMax = plan.maxBarbers || (licType === "basica" ? 2 : licType === "profesional" ? 5 : 99);
    const currentMax = tenant.config?.customMaxBarbers ? Number(tenant.config.customMaxBarbers) : defaultMax;
    const activeCount = (tenant.barbers || []).filter(b => b.isActive !== false).length;

    if (activeCount + 1 > currentMax) {
      tenant.config.customMaxBarbers = activeCount + 1;
    }
  }

  tenant.barbers[index] = {
    ...tenant.barbers[index],
    name: name || tenant.barbers[index].name,
    username: username || tenant.barbers[index].username,
    password: password || tenant.barbers[index].password,
    isActive: isActive !== undefined ? Boolean(isActive) : tenant.barbers[index].isActive,
    specialties: specialties || tenant.barbers[index].specialties,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : (photoUrl !== undefined ? photoUrl : tenant.barbers[index].avatarUrl),
    photoUrl: photoUrl !== undefined ? photoUrl : (avatarUrl !== undefined ? avatarUrl : tenant.barbers[index].photoUrl),
    commissionPercent: commissionPercent !== undefined ? Number(commissionPercent) : tenant.barbers[index].commissionPercent
  };

  saveTenantToFirestore(tenantId);
  saveGlobalsToFirestore();

  broadcastChange("barbers_update", tenant.barbers, tenantId);
  res.json({ success: true, message: "Barbero actualizado con éxito.", barber: tenant.barbers[index] });
});

app.delete("/api/developer/tenants/:tenantId/barbers/:barberId", (req, res) => {
  const { tenantId, barberId } = req.params;
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  const index = (tenant.barbers || []).findIndex(b => b.id === barberId);
  if (index === -1) {
    return res.status(404).json({ error: "Barbero no encontrado." });
  }

  const deleted = tenant.barbers.splice(index, 1)[0];
  saveTenantToFirestore(tenantId);
  saveGlobalsToFirestore();

  broadcastChange("barbers_update", tenant.barbers, tenantId);
  res.json({ success: true, message: `Barbero '${deleted.name}' eliminado con éxito.`, deleted });
});

// --- Support Technical Tickets Console (Helpdesk) ---
interface Ticket {
  id: string;
  tenantId: string;
  salonName: string;
  title: string;
  description: string;
  severity: "baja" | "media" | "alta" | "critica";
  status: "abierto" | "en_progreso" | "resuelto";
  createdAt: string;
  updatedAt: string;
  replies: {
    id: string;
    sender: "soporte" | "inquilino";
    message: string;
    createdAt: string;
  }[];
}

let helpdeskTickets: Ticket[] = [
  {
    id: "tk_001",
    tenantId: "bella-barba",
    salonName: "Barberia Demo",
    title: "Error al imprimir el banner del código QR de promoción",
    description: "Al descargar o imprimir el banner diseñado en formato A5, las letras en el cuadro de pasos a seguir se recortan un poco en la impresora Epson L3110. Necesitamos ajustar el margen.",
    severity: "media",
    status: "abierto",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    replies: [
      {
        id: "rep_1",
        sender: "inquilino",
        message: "Hola equipo, hemos intentado con varias configuraciones de papel y sigue sin centrarse perfecto en A5.",
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: "tk_002",
    tenantId: "bella-barba",
    salonName: "Barberia Demo",
    title: "Problema con la sincronización del calendario de Mateo Gómez",
    description: "Los clientes agendan y en su portal sale confirmado, pero en el panel de Mateo Gómez no aparece la cita reflejada de inmediato, requiere recargar la página.",
    severity: "alta",
    status: "en_progreso",
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    replies: [
      {
        id: "rep_2",
        sender: "inquilino",
        message: "Esto nos está causando algunos cruces de citas hoy. Por favor revisar si es un tema del SSE.",
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "rep_3",
        sender: "soporte",
        message: "Hola Mateo, estamos verificando el flujo de eventos en tiempo real. ¿Tienen buena conectividad a Internet en el salón? El SSE mantiene el canal vivo con pings cada 15s.",
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: "tk_003",
    tenantId: "bella-barba",
    salonName: "Barberia Demo",
    title: "Solicitud de asistencia para migración de base de datos Excel",
    description: "Tenemos una lista de 400 clientes frecuentes en Excel y quisiéramos cargarlos de forma masiva para no registrarlos uno por uno. ¿Tienen alguna herramienta de importación?",
    severity: "baja",
    status: "resuelto",
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    replies: [
      {
        id: "rep_4",
        sender: "inquilino",
        message: "Enviamos el archivo de clientes adjunto si es necesario que lo importen directo.",
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "rep_5",
        sender: "soporte",
        message: "¡Hola! Hemos procesado su archivo de clientes de manera exitosa en su inquilino. Ya pueden ver todos sus clientes desde el módulo de clientes.",
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "rep_6",
        sender: "inquilino",
        message: "¡Excelente servicio! Muchas gracias, ya los vemos todos en pantalla.",
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ]
  }
];

// --- DUAL PERSISTENCE: LOCAL JSON DISK BACKUP & FIREBASE FIRESTORE SYNC ---

function saveToLocalDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const backup = {
      version: "3.5",
      updatedAt: new Date().toISOString(),
      tenants,
      salonAdmins,
      generatedLicenses,
      helpdeskTickets,
      tenantData,
      globalAnnouncements,
      saasPricingPlans,
      memberships
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(backup, null, 2), "utf-8");
    fs.writeFileSync(ROOT_DB_PATH, JSON.stringify(backup, null, 2), "utf-8");
    // console.log("[Local DB] 💾 Estado guardado en disco.");
  } catch (err: any) {
    console.error("[Local DB] Error al guardar base de datos local:", err?.message);
  }
}

function loadFromLocalDisk(): boolean {
  try {
    let filePath = "";
    if (fs.existsSync(LOCAL_DB_PATH)) {
      filePath = LOCAL_DB_PATH;
    } else if (fs.existsSync(ROOT_DB_PATH)) {
      filePath = ROOT_DB_PATH;
    }

    if (filePath) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.tenants) && parsed.tenants.length > 0) tenants = parsed.tenants;
        if (Array.isArray(parsed.salonAdmins) && parsed.salonAdmins.length > 0) salonAdmins = parsed.salonAdmins;
        if (Array.isArray(parsed.generatedLicenses) && parsed.generatedLicenses.length > 0) generatedLicenses = parsed.generatedLicenses;
        if (Array.isArray(parsed.helpdeskTickets) && parsed.helpdeskTickets.length > 0) helpdeskTickets = parsed.helpdeskTickets;
        if (parsed.tenantData && typeof parsed.tenantData === "object" && Object.keys(parsed.tenantData).length > 0) {
          Object.assign(tenantData, parsed.tenantData);
        }
        if (Array.isArray(parsed.globalAnnouncements)) globalAnnouncements = parsed.globalAnnouncements;
        if (parsed.saasPricingPlans && typeof parsed.saasPricingPlans === "object") saasPricingPlans = parsed.saasPricingPlans;
        if (Array.isArray(parsed.memberships)) memberships = parsed.memberships;

        console.log(`[Local DB] 💾 Recuperados ${tenants.length} inquilinos desde almacenamiento local (${filePath}).`);
        return true;
      }
    }
  } catch (err: any) {
    console.error("[Local DB] Error al leer base de datos local:", err?.message);
  }
  return false;
}

async function saveTenantToFirestore(tenantId: string) {
  // Always persist instantly to local disk first
  saveToLocalDisk();

  if (!firestoreBaseUrl || !firebaseConfig) return;
  try {
    const data = tenantData[tenantId];
    if (data) {
      const url = `${firestoreBaseUrl}/${TENANTS_COLLECTION}/${tenantId}?key=${firebaseConfig.apiKey}`;
      const body = { fields: toFirestoreValue(data).mapValue.fields };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        console.log(`[Firebase] [${TENANTS_COLLECTION}] Inquilino '${tenantId}' persistido con éxito en Firestore.`);
      } else {
        const errText = await res.text();
        console.warn(`[Firebase] Nota: Error guardando inquilino '${tenantId}' (${res.status}):`, errText);
      }
    }
  } catch (err: any) {
    console.warn(`[Firebase] Error en saveTenantToFirestore ('${tenantId}'):`, err?.message);
  }
}

async function saveGlobalsToFirestore() {
  // Always persist instantly to local disk first
  saveToLocalDisk();

  if (!firestoreBaseUrl || !firebaseConfig || !isFirestoreLoaded) return;
  try {
    const url = `${firestoreBaseUrl}/${SYSTEM_COLLECTION}/globals?key=${firebaseConfig.apiKey}`;
    const payload = {
      tenants,
      salonAdmins,
      generatedLicenses,
      helpdeskTickets,
      saasPricingPlans,
      memberships,
      globalAnnouncements
    };
    const body = { fields: toFirestoreValue(payload).mapValue.fields };
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      console.log(`[Firebase] [${SYSTEM_COLLECTION}] Variables globales persistidas con éxito en Firestore.`);
    } else {
      const errText = await res.text();
      console.warn(`[Firebase] Nota: Error guardando variables globales (${res.status}):`, errText);
    }
  } catch (err: any) {
    console.warn("[Firebase] Error en saveGlobalsToFirestore:", err?.message);
  }
}

async function loadFromFirestore() {
  // Step 1: Preload from local disk backup immediately
  loadFromLocalDisk();

  if (!firestoreBaseUrl || !firebaseConfig) {
    isFirestoreLoaded = true;
    console.log(`[Persistence] 📁 Operando con persistencia local en disco (${LOCAL_DB_PATH}).`);
    return;
  }

  try {
    console.log(`[Firebase] Cargando datos (${SYSTEM_COLLECTION} / ${TENANTS_COLLECTION}) desde Firestore...`);
    
    // Step 2: Load globals (check primary collection first, fallback to dev if empty)
    let globalsUrl = `${firestoreBaseUrl}/${SYSTEM_COLLECTION}/globals?key=${firebaseConfig.apiKey}`;
    let globalsRes = await fetch(globalsUrl);
    
    // If production collection is empty, check dev_salon_system for automatic migration
    if (!globalsRes.ok && isProduction) {
      const devGlobalsUrl = `${firestoreBaseUrl}/dev_salon_system/globals?key=${firebaseConfig.apiKey}`;
      const devRes = await fetch(devGlobalsUrl);
      if (devRes.ok) {
        console.log("[Firebase] 🔄 Migrando datos existentes desde 'dev_salon_system' hacia 'salon_system'...");
        globalsRes = devRes;
      }
    }

    if (globalsRes.ok) {
      const rawGlobals = await globalsRes.json();
      const data = fromFirestoreValue({ mapValue: rawGlobals }) || {};
      let needsGlobalsUpdate = false;

      // Load tenants list
      if (data.tenants && Array.isArray(data.tenants) && data.tenants.length > 0) {
        // Merge with existing local tenants so none are lost
        for (const remoteT of data.tenants) {
          if (remoteT && remoteT.id && !tenants.some(lt => lt.id === remoteT.id)) {
            tenants.push(remoteT);
          }
        }
      }

      // Load salon admins
      if (data.salonAdmins && Array.isArray(data.salonAdmins) && data.salonAdmins.length > 0) {
        for (const adm of data.salonAdmins) {
          if (adm && adm.username && !salonAdmins.some(la => la.username.toLowerCase() === adm.username.toLowerCase())) {
            salonAdmins.push(adm);
          }
        }
      }

      // Load licenses
      if (data.generatedLicenses && Array.isArray(data.generatedLicenses) && data.generatedLicenses.length > 0) {
        for (const lic of data.generatedLicenses) {
          if (lic && lic.key && !generatedLicenses.some(ll => ll.key.toUpperCase() === lic.key.toUpperCase())) {
            generatedLicenses.push(lic);
          }
        }
      }

      // Helpdesk tickets
      if (data.helpdeskTickets && Array.isArray(data.helpdeskTickets)) {
        helpdeskTickets = data.helpdeskTickets;
      }

      // Global Announcements (broadcasts)
      if (Array.isArray(data.globalAnnouncements)) {
        globalAnnouncements = data.globalAnnouncements;
      }

      // SaaS Pricing Plans
      if (data.saasPricingPlans && typeof data.saasPricingPlans === "object") {
        saasPricingPlans = data.saasPricingPlans;
      }

      // Memberships
      if (Array.isArray(data.memberships)) {
        memberships = data.memberships;
      }

      isFirestoreLoaded = true;
    } else {
      isFirestoreLoaded = true;
      console.log(`[Firebase] Variables globales no encontradas en Firestore. Se inicializan desde memoria/disco.`);
    }

    // Step 3: Discover all tenant documents directly via Firestore Collection List endpoint
    const collectionsToQuery = [TENANTS_COLLECTION];
    if (isProduction) collectionsToQuery.push("dev_salon_tenants");

    for (const col of collectionsToQuery) {
      try {
        const listUrl = `${firestoreBaseUrl}/${col}?key=${firebaseConfig.apiKey}`;
        const listRes = await fetch(listUrl);
        if (listRes.ok) {
          const listJson = await listRes.json();
          if (listJson.documents && Array.isArray(listJson.documents)) {
            for (const doc of listJson.documents) {
              const docId = doc.name ? doc.name.split("/").pop() : null;
              if (docId) {
                const parsed = fromFirestoreValue({ mapValue: doc });
                if (parsed && typeof parsed === "object") {
                  tenantData[docId] = parsed;
                  if (!tenants.some(t => t.id === docId)) {
                    tenants.push({
                      id: docId,
                      name: parsed.config?.name || docId,
                      licenseType: parsed.config?.licenseType || "basica",
                      activeLicenseKey: parsed.config?.activeLicenseKey || "",
                      isComplimentary: Boolean(parsed.config?.isComplimentary),
                      billingExempt: Boolean(parsed.config?.billingExempt)
                    });
                  }
                  console.log(`[Firebase] Inquilino descubierto en colección '${col}': '${docId}' (${parsed.config?.name || docId})`);
                }
              }
            }
          }
        }
      } catch (listErr: any) {
        console.warn(`[Firebase] Nota al listar colección '${col}':`, listErr?.message);
      }
    }

    // Step 4: Ensure all known tenants in our list have their full data loaded
    console.log(`[Firebase] Verificando ${tenants.length} inquilinos registrados...`);
    for (const t of tenants) {
      if (!t || !t.id) continue;
      if (!tenantData[t.id]) {
        try {
          const tenantUrl = `${firestoreBaseUrl}/${TENANTS_COLLECTION}/${t.id}?key=${firebaseConfig.apiKey}`;
          const tenantRes = await fetch(tenantUrl);
          if (tenantRes.ok) {
            const rawTenant = await tenantRes.json();
            const parsed = fromFirestoreValue({ mapValue: rawTenant });
            if (parsed && typeof parsed === "object") {
              tenantData[t.id] = parsed;
              console.log(`[Firebase] Inquilino '${t.id}' recuperado desde Firestore.`);
            }
          }
        } catch (tErr: any) {
          console.warn(`[Firebase] Error cargando inquilino '${t.id}':`, tErr?.message);
        }
      }
    }

    // Step 5: Guarantee default demo tenant exists
    if (!tenantData["bella-barba"]) {
      tenantData["bella-barba"] = {
        config: {
          name: "Barberia Demo",
          openTime: "09:00",
          closeTime: "20:00",
          workingDays: [1, 2, 3, 4, 5, 6],
          intervalMinutes: 30,
          licenseType: "premium",
          activeLicenseKey: "LIC-PREM-V98X2-2026",
          accentColor: "gold",
          textColor: "#FFFFFF",
          backgroundColor: "#060A13",
          cardColor: "#0E1524",
          subCardColor: "#162237",
          borderColor: "#1F314D",
          tagline: "Arte, Precisión & Estilo Masculino",
          isComplimentary: true,
          billingExempt: true
        },
        services: [
          { id: "s1", name: "Corte de Cabello Básico", price: 15000, duration: 30, category: "cabello", description: "Corte tradicional." },
          { id: "s2", name: "Perfilado de Barba", price: 10000, duration: 30, category: "barba", description: "Arreglo completo de barba con navaja y toalla caliente." }
        ],
        barbers: [
          { id: "b1", name: "Barbero Principal", username: "barbero1", password: "123", isActive: true, specialties: ["cabello", "barba"] }
        ],
        appointments: [],
        clients: [],
        reviews: [],
        catalogStyles: DEFAULT_CATALOG_STYLES
      };
      await saveTenantToFirestore("bella-barba");
    }

    // Save final synchronized state to local disk and Firestore
    saveToLocalDisk();
    await saveGlobalsToFirestore();

    console.log(`[Persistence] ✅ Sincronización exitosa: ${tenants.length} barberías/inquilinos activos.`);
  } catch (err: any) {
    isFirestoreLoaded = true;
    console.warn("[Firebase] Nota: No se pudieron cargar datos desde Firestore, operando con copia local:", err?.message || err);
    saveToLocalDisk();
  }
}

// Technical Support Tickets API Routes
app.get("/api/developer/tickets", (req, res) => {
  res.json({ tickets: helpdeskTickets });
});

app.post("/api/developer/tickets", (req, res) => {
  const { title, description, severity, tenantId } = req.body;
  if (!title || !description || !severity) {
    return res.status(400).json({ error: "Faltan campos obligatorios para el ticket." });
  }

  const tid = tenantId || "bella-barba";
  const tenantName = tenantData[tid]?.config?.name || "Inquilino Desconocido";

  const newTicket: Ticket = {
    id: "tk_" + Date.now().toString().slice(-6),
    tenantId: tid,
    salonName: tenantName,
    title,
    description,
    severity,
    status: "abierto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: []
  };

  helpdeskTickets.unshift(newTicket);
  res.status(201).json({ success: true, ticket: newTicket });
});

app.post("/api/developer/tickets/:id/replies", (req, res) => {
  const { id } = req.params;
  const { message, sender } = req.body; // sender: 'soporte' | 'inquilino'
  if (!message || !sender) {
    return res.status(400).json({ error: "Mensaje y remitente obligatorios." });
  }

  const ticket = helpdeskTickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket no encontrado." });
  }

  const newReply = {
    id: "rep_" + Date.now().toString().slice(-6),
    sender,
    message,
    createdAt: new Date().toISOString()
  };

  ticket.replies.push(newReply);
  ticket.updatedAt = new Date().toISOString();
  
  // Auto action: if support replies, set status to 'en_progreso' if was 'abierto'
  if (sender === "soporte" && ticket.status === "abierto") {
    ticket.status = "en_progreso";
  }

  res.status(201).json({ success: true, reply: newReply, ticket });
});

app.put("/api/developer/tickets/:id", (req, res) => {
  const { id } = req.params;
  const { status, severity } = req.body;

  const ticket = helpdeskTickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket no encontrado." });
  }

  if (status) ticket.status = status;
  if (severity) ticket.severity = severity;
  ticket.updatedAt = new Date().toISOString();

  res.json({ success: true, ticket });
});


// --- Business Intelligence Global Dashboard API ---
app.get("/api/developer/analytics", (req, res) => {
  const tenantKeys = Object.keys(tenantData);
  let activeCount = 0;
  let complimentaryCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;

  // Track counts by type
  let licenseCounts = {
    premium: 0,
    profesional: 0,
    basica: 0
  };

  // Build metrics for each tenant showing strictly SaaS & licensing details
  let salonMetrics: any[] = [];
  
  tenantKeys.forEach(tId => {
    const data = tenantData[tId];
    const config: any = data.config || {};
    const tenantMeta = tenants.find(t => t.id === tId);
    const licenseType = config.licenseType || tenantMeta?.licenseType || "basica";
    
    // Check if complimentary / billing exempt
    const isComplimentary = Boolean(
      config.isComplimentary || 
      config.billingExempt || 
      tenantMeta?.isComplimentary || 
      tenantMeta?.billingExempt || 
      (tId === "bella-barba" && config.isComplimentary !== false && tenantMeta?.isComplimentary !== false)
    );
    
    let licenseCost = isComplimentary ? 0 : (saasPricingPlans[licenseType as keyof typeof saasPricingPlans]?.price || saasPricingPlans.basica.price);
    
    // Count active licenses
    activeCount++;
    if (isComplimentary) {
      complimentaryCount++;
    } else {
      if (licenseType === "premium") licenseCounts.premium++;
      else if (licenseType === "profesional") licenseCounts.profesional++;
      else licenseCounts.basica++;
    }

    salonMetrics.push({
      id: tId,
      name: config.name || tenantMeta?.name || tId,
      licenseType: licenseType,
      activeLicenseKey: config.activeLicenseKey || tenantMeta?.activeLicenseKey || "N/A",
      licenseSubscriptionRevenue: licenseCost,
      isComplimentary: isComplimentary,
      billingExempt: isComplimentary,
      status: "activo",
      activationDate: config.activationDate || new Date(Date.now() - 15 * 24 * 3600 * 1000).toLocaleDateString()
    });
  });

  // Include generated licenses that are pending activation
  generatedLicenses.forEach(lic => {
    if (lic.status === "pending") {
      pendingCount++;
    } else if (lic.status === "expired") {
      expiredCount++;
    }
  });

  // Calculate MRR (Monthly Recurring Revenue) - Excludes complimentary / gift licenses ($0)
  const mrr = (licenseCounts.premium * saasPricingPlans.premium.price) + 
              (licenseCounts.profesional * saasPricingPlans.profesional.price) + 
              (licenseCounts.basica * saasPricingPlans.basica.price);
  const paidSalonsCount = activeCount - complimentaryCount;
  const arpu = paidSalonsCount > 0 ? (mrr / paidSalonsCount) : 0;

  // Real Growth Trend (MRR Progression)
  const growthTrend = [
    { period: "Abril", mrr: 0, activeSalons: 1 },
    { period: "Mayo", mrr: 0, activeSalons: 1 },
    { period: "Junio", mrr: 0, activeSalons: 1 },
    { period: "Julio (Actual)", mrr: mrr, activeSalons: tenantKeys.length }
  ];

  res.json({
    summary: {
      totalRevenue: mrr, // SaaS MRR is the developer revenue
      licenseRevenue: mrr,
      activeLicensesCount: activeCount,
      paidLicensesCount: paidSalonsCount,
      complimentaryLicensesCount: complimentaryCount,
      pendingLicensesCount: pendingCount,
      expiredLicensesCount: expiredCount,
      totalLicensesCount: activeCount + pendingCount + expiredCount,
      mrr: mrr,
      arpu: arpu,
      activeSalonsCount: tenantKeys.length,
      environment: isProduction ? "production" : "development",
      environmentLabel: isProduction ? "🟢 Producción (Real)" : "🟡 Desarrollo / Sandbox (Pruebas)",
      collections: {
        system: SYSTEM_COLLECTION,
        tenants: TENANTS_COLLECTION
      }
    },
    salonMetrics,
    licenseCounts: {
      ...licenseCounts,
      complimentary: complimentaryCount
    },
    growthTrend
  });
});

// --- Developer Licenses System ---
// Helper to calculate expiration date from activation date and duration in months
const calculateExpirationDate = (startDateISO: string, months: number = 1): string => {
  const date = new Date(startDateISO);
  date.setDate(date.getDate() + Math.round(months * 30));
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

// Helper to determine status and days remaining
const computeLicenseStatus = (expirationDateStr: string) => {
  const expTime = new Date(expirationDateStr).getTime();
  const nowTime = Date.now();
  const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { status: "expired", daysRemaining: diffDays };
  if (diffDays <= 1) return { status: "warning_1", daysRemaining: diffDays };
  if (diffDays <= 8) return { status: "warning_8", daysRemaining: diffDays };
  if (diffDays <= 15) return { status: "warning_15", daysRemaining: diffDays };
  return { status: "active", daysRemaining: diffDays };
};

const nowISO = new Date().toISOString();
const defaultExpISO = calculateExpirationDate(nowISO, 12); // Default 1 year for demo

let generatedLicenses: any[] = [
  {
    key: "LIC-PREM-V98X2-2026",
    salonName: "Barberia Demo",
    tenantId: "bella-barba",
    licenseType: "premium",
    isComplimentary: true,
    billingExempt: true,
    createdAt: nowISO, // Fecha de activación
    expirationDate: defaultExpISO, // Fecha de inactivación (1 año)
    durationMonths: 12,
    ownerEmail: "admin@barberiademo.com",
    status: "active",
    lastNotificationSent: null,
    activatedAt: nowISO
  },
];

app.get("/api/licenses", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];

  // Update statuses dynamically based on current date
  const updatedLicenses = generatedLicenses.map(lic => {
    const { status, daysRemaining } = computeLicenseStatus(lic.expirationDate || defaultExpISO);
    return {
      ...lic,
      calculatedStatus: status,
      daysRemaining
    };
  });

  res.json({ licenses: updatedLicenses, currentConfig: tenant.config });
});

// Helper to sanitize and generate a unique tenant ID from salon name
const generateTenantId = (name: string): string => {
  let id = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "-")      // replace non-alphanumeric with hyphen
    .replace(/-+/g, "-")            // collapse multiple hyphens
    .replace(/^-|-$/g, "");         // trim hyphens
  
  let finalId = id || "barberia";
  let counter = 1;
  while (tenants.some(t => t.id === finalId) || tenantData[finalId]) {
    finalId = `${id}-${counter}`;
    counter++;
  }
  return finalId;
};

// Helper to initialize custom tenant data.
// NOTE: When a new tenant is created, everything starts 100% in BLANK ([]) so the owner can fill it in with their real data.
const createTenant = (
  id: string,
  name: string,
  licenseType: string,
  licenseKey: string,
  templateType: string = "gold",
  activationDate?: string,
  expirationDate?: string,
  extraDetails: {
    ownerName?: string;
    ownerEmail?: string;
    phone?: string;
    city?: string;
    address?: string;
    tagline?: string;
    openTime?: string;
    closeTime?: string;
    initialBarbersCount?: number;
    customAdminPassword?: string;
    customMaxBarbers?: number;
    isComplimentary?: boolean;
    timeFormat?: '12h' | '24h';
  } = {}
) => {
  const isDefaultTenant = id === "bella-barba";

  const accentColor = templateType === "urban" ? "cyan" : templateType === "traditional" ? "amber" : "gold";

  const actDate = activationDate || new Date().toISOString().split("T")[0];
  const expDate = expirationDate || calculateExpirationDate(actDate, 12);
  const email = extraDetails.ownerEmail || `contacto@${id}.com`;
  const isComp = Boolean(extraDetails.isComplimentary);

  tenantData[id] = {
    config: {
      name: name,
      openTime: extraDetails.openTime || "08:00",
      closeTime: extraDetails.closeTime || "20:00",
      workingDays: [1, 2, 3, 4, 5, 6],
      intervalMinutes: 30,
      timeFormat: extraDetails.timeFormat || "12h",
      licenseType: licenseType as any,
      activeLicenseKey: licenseKey,
      activationDate: actDate,
      expirationDate: expDate,
      isComplimentary: isComp,
      billingExempt: isComp,
      ownerName: extraDetails.ownerName || "",
      ownerEmail: email,
      phone: extraDetails.phone || "",
      whatsapp: extraDetails.phone || "",
      city: extraDetails.city || "",
      address: extraDetails.address || "",
      needsSetup: !isDefaultTenant, // New tenant is in blank mode and will be guided to fill everything
      accentColor: accentColor,
      textColor: "#FFFFFF",
      backgroundColor: "#0B0C10",
      cardColor: "#141414",
      subCardColor: "#1A1A1A",
      borderColor: "#262626",
      tagline: extraDetails.tagline || "",
      customMaxBarbers: extraDetails.customMaxBarbers ? Number(extraDetails.customMaxBarbers) : undefined,
    },
    // For new tenants, everything is completely blank so the owner configures all items from scratch with their client
    services: isDefaultTenant && tenantData["bella-barba"] ? tenantData["bella-barba"].services : [],
    barbers: isDefaultTenant && tenantData["bella-barba"] ? tenantData["bella-barba"].barbers : [],
    memberships: isDefaultTenant && tenantData["bella-barba"] ? tenantData["bella-barba"].memberships : [],
    appointments: [],
    clients: [],
    reviews: [],
    inventory: [],
    sales: [],
    cashClosures: [],
    catalogStyles: []
  };

  // If it's a new tenant, automatically create a default administrator account
  if (!isDefaultTenant) {
    const adminUsername = `admin-${id}`;
    if (!salonAdmins.some(a => a.username === adminUsername)) {
      salonAdmins.push({
        id: "adm_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
        name: extraDetails.ownerName ? `Admin ${extraDetails.ownerName}` : `Admin ${name}`,
        username: adminUsername,
        password: extraDetails.customAdminPassword || "admin", // custom or default password
        salonId: id
      });
    }
  }
};

app.post("/api/licenses/generate", (req, res) => {
  const {
    salonName,
    licenseType,
    templateType,
    durationMonths,
    ownerName,
    ownerEmail,
    phone,
    city,
    address,
    tagline,
    openTime,
    closeTime,
    initialBarbersCount,
    customAdminPassword,
    customExpirationDate,
    customMaxBarbers,
    isComplimentary
  } = req.body;

  if (!salonName || !licenseType) {
    return res.status(400).json({ error: "Nombre del salón y tipo de licencia requeridos." });
  }

  const isComp = Boolean(isComplimentary);

  // Generate a high-fidelity cryptographic-style key
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseTypePrefix = licenseType === "premium" ? "PREM" : licenseType === "profesional" ? "PROF" : "BSIC";
  const key = `LIC-${licenseTypePrefix}-${randStr}${randNum}-2026`;

  const createdAtISO = new Date().toISOString();
  const months = durationMonths ? Number(durationMonths) : 1; // default 1 month if not specified
  const expirationDate = customExpirationDate || calculateExpirationDate(createdAtISO, months);
  const email = ownerEmail || `admin@${generateTenantId(salonName)}.com`;

  const { status } = computeLicenseStatus(expirationDate);

  const newLicense = {
    key,
    salonName,
    licenseType,
    isComplimentary: isComp,
    billingExempt: isComp,
    createdAt: createdAtISO, // Fecha de activación
    expirationDate: expirationDate, // Fecha de inactivación
    durationMonths: months,
    ownerName: ownerName || "",
    ownerEmail: email,
    phone: phone || "",
    city: city || "",
    address: address || "",
    status: status,
    lastNotificationSent: null,
    activatedAt: createdAtISO
  };

  // Generate unique tenant and create its data structures immediately
  const newTenantId = generateTenantId(salonName);
  
  // Register in developers tenants list
  tenants.push({
    id: newTenantId,
    name: salonName,
    licenseType: licenseType,
    activeLicenseKey: key,
    isComplimentary: isComp,
    billingExempt: isComp
  });

  // Register in memory store
  createTenant(
    newTenantId,
    salonName,
    licenseType,
    key,
    templateType || "gold",
    createdAtISO.split("T")[0],
    expirationDate,
    {
      ownerName: ownerName || "",
      ownerEmail: email,
      phone: phone || "",
      city: city || "",
      address: address || "",
      tagline: tagline || "",
      openTime: openTime || "08:00",
      closeTime: closeTime || "20:00",
      initialBarbersCount: initialBarbersCount ? Number(initialBarbersCount) : 2,
      customAdminPassword: customAdminPassword || "admin",
      customMaxBarbers: customMaxBarbers ? Number(customMaxBarbers) : undefined,
      isComplimentary: isComp
    }
  );

  generatedLicenses.push(newLicense);

  // Instantly persist to Firestore
  saveTenantToFirestore(newTenantId);
  saveGlobalsToFirestore();

  res.status(201).json({
    message: "Licencia generada con fecha de inactivación programada",
    license: newLicense,
    tenantId: newTenantId
  });
});

app.post("/api/licenses/activate", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Llave de licencia requerida." });
  }

  const licIndex = generatedLicenses.findIndex(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (licIndex === -1) {
    return res.status(404).json({ error: "La llave de licencia no es válida o no existe." });
  }

  const lic = generatedLicenses[licIndex];
  
  // Update status of key
  lic.status = "active";
  lic.activatedAt = new Date().toISOString();
  
  // Find which tenant is associated with this license key in the global list
  const devTenant = tenants.find(t => t.activeLicenseKey === lic.key);
  const tenantId = devTenant ? devTenant.id : getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];

  // Apply changes to tenant config
  tenant.config.licenseType = lic.licenseType;
  tenant.config.activeLicenseKey = lic.key;
  tenant.config.activationDate = lic.createdAt.split("T")[0];
  tenant.config.expirationDate = lic.expirationDate;
  if (lic.ownerEmail) {
    tenant.config.ownerEmail = lic.ownerEmail;
  }
  if (lic.salonName) {
    tenant.config.name = lic.salonName;
  }

  // Update in tenants developer list
  if (devTenant) {
    devTenant.licenseType = lic.licenseType;
    devTenant.activeLicenseKey = lic.key;
    if (lic.salonName) {
      devTenant.name = lic.salonName;
    }
  }

  // Save the modified tenant and global lists immediately to Firestore
  saveTenantToFirestore(tenantId);
  saveGlobalsToFirestore();

  broadcastChange("config_update", tenant.config, tenantId);
  res.json({ message: "¡Licencia activada con éxito!", config: tenant.config, license: lic });
});

// Endpoint to renew or extend license expiration date
app.post("/api/licenses/renew", (req, res) => {
  const { key, extensionMonths, customNewExpiration } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Clave de licencia requerida para renovación." });
  }

  const licIndex = generatedLicenses.findIndex(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (licIndex === -1) {
    return res.status(404).json({ error: "Licencia no encontrada." });
  }

  const lic = generatedLicenses[licIndex];
  const months = extensionMonths ? Number(extensionMonths) : 1;

  // Compute new expiration date from max of current date or current expiration
  const baseDateISO = (new Date(lic.expirationDate).getTime() > Date.now()) 
    ? lic.expirationDate 
    : new Date().toISOString();

  const newExpirationDate = customNewExpiration || calculateExpirationDate(baseDateISO, months);

  lic.expirationDate = newExpirationDate;
  lic.durationMonths = (lic.durationMonths || 0) + months;
  lic.status = "active";
  lic.lastNotificationSent = null;

  // Update associated tenant if exists
  for (const tenantId of Object.keys(tenantData)) {
    const tenant = tenantData[tenantId];
    if (tenant.config.activeLicenseKey === key) {
      tenant.config.expirationDate = newExpirationDate;
      saveTenantToFirestore(tenantId);
      broadcastChange("config_update", tenant.config, tenantId);
    }
  }

  saveGlobalsToFirestore();

  res.json({
    message: `Licencia renovada exitosamente hasta el ${newExpirationDate}`,
    license: lic
  });
});

// Endpoint to simulate automated notification emails (15d, 8d, 1d, expired)
app.post("/api/licenses/send-reminder", (req, res) => {
  const { key, alertType } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Clave de licencia requerida." });
  }

  const lic = generatedLicenses.find(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (!lic) {
    return res.status(404).json({ error: "Licencia no encontrada." });
  }

  const { daysRemaining } = computeLicenseStatus(lic.expirationDate);
  const type = alertType || (daysRemaining <= 0 ? "expired" : daysRemaining <= 1 ? "1_day" : daysRemaining <= 8 ? "8_days" : "15_days");

  const emailSubject = 
    type === "15_days" ? `[Recordatorio 15 Días] Renovación Licencia SyncBarber - ${lic.salonName}` :
    type === "8_days" ? `[ALERTA 8 DÍAS] Tu Licencia SyncBarber Vence Pronto - ${lic.salonName}` :
    type === "1_day" ? `[¡ÚLTIMO DÍA!] Tu Licencia SyncBarber Vence Hoy - ${lic.salonName}` :
    `[LICENCIA SUSPENDIDA] Realiza tu Pago para Reactivar - ${lic.salonName}`;

  const planPrice = saasPricingPlans[lic.licenseType as keyof typeof saasPricingPlans]?.price || saasPricingPlans.basica.price;
  const priceFormatted = `$${planPrice.toLocaleString("es-CO")} COP`;

  const emailPayload = {
    to: lic.ownerEmail || `admin@${lic.salonName.toLowerCase().replace(/\s+/g,'')}.com`,
    subject: emailSubject,
    sentAt: new Date().toISOString(),
    alertType: type,
    daysRemaining: daysRemaining,
    expirationDate: lic.expirationDate,
    salonName: lic.salonName,
    licenseKey: lic.key,
    licenseType: lic.licenseType,
    renewalPrice: priceFormatted,
    paymentLink: `https://syncbarber.co/renovar?key=${lic.key}&amount=${encodeURIComponent(priceFormatted)}`,
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0B0C10; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #262626;">
        <h2 style="color: #D4AF37; margin-top: 0;">💈 SyncBarber Enterprise - Notificación de Renovación</h2>
        <p>Hola estimado Administrador de <strong>${lic.salonName}</strong>,</p>
        <p>Le informamos que su suscripción <strong>${lic.licenseType.toUpperCase()}</strong> asociada a la llave <code style="background: #1A1A1A; padding: 4px 8px; border-radius: 6px; color: #38BDF8;">${lic.key}</code> tiene la siguiente fecha límite:</p>
        
        <div style="background: #141414; border-left: 4px solid ${type === 'expired' ? '#EF4444' : type === '1_day' ? '#F97316' : '#F59E0B'}; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #A3A3A3;">Fecha de Inactivación / Vencimiento:</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #FFFFFF;">${lic.expirationDate}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: ${type === 'expired' ? '#F87171' : '#FBBF24'};">
            ${type === 'expired' ? '⛔ La licencia ha expirado.' : `⏳ Faltan ${daysRemaining} día(s) para la suspensión automática del servicio.`}
          </p>
        </div>

        <p>Para garantizar que sus barberos y clientes mantengan el servicio de agenda, avisos por WhatsApp y cobro en vivo sin interrupción, realice el pago correspondiente:</p>
        
        <p style="font-size: 18px; font-weight: bold; color: #10B981;">Monto de Renovación: ${priceFormatted} / mes</p>

        <a href="https://syncbarber.co/renovar?key=${lic.key}" style="display: inline-block; background: #D4AF37; color: #000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; margin-top: 12px;">
          💳 Realizar Pago de Renovación en Línea (PSE / Tarjeta)
        </a>

        <hr style="border: 0; border-top: 1px solid #262626; margin: 24px 0;" />
        <p style="font-size: 11px; color: #737373;">SyncBarber SaaS Platform - Sistema de Administración Automatizada de Barberías.</p>
      </div>
    `
  };

  lic.lastNotificationSent = type;

  console.log(`[Correo Notificación Enviado] A: ${emailPayload.to} | Asunto: ${emailPayload.subject}`);

  res.json({
    message: `Correo de cobranza/recordatorio (${type}) simulado con éxito`,
    email: emailPayload
  });
});

// Endpoint to manually edit expiration date, contact email or complimentary status
app.put("/api/licenses/update-dates", (req, res) => {
  const { key, expirationDate, ownerEmail, isComplimentary } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Clave de licencia requerida." });
  }

  const lic = generatedLicenses.find(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (!lic) {
    return res.status(404).json({ error: "Licencia no encontrada." });
  }

  if (expirationDate) lic.expirationDate = expirationDate;
  if (ownerEmail !== undefined) lic.ownerEmail = ownerEmail;
  if (isComplimentary !== undefined) {
    lic.isComplimentary = Boolean(isComplimentary);
    lic.billingExempt = Boolean(isComplimentary);
  }

  // Sync to active tenant
  for (const tenantId of Object.keys(tenantData)) {
    const tenant = tenantData[tenantId];
    if (tenant.config.activeLicenseKey === key) {
      if (expirationDate) tenant.config.expirationDate = expirationDate;
      if (ownerEmail !== undefined) tenant.config.ownerEmail = ownerEmail;
      if (isComplimentary !== undefined) {
        tenant.config.isComplimentary = Boolean(isComplimentary);
        tenant.config.billingExempt = Boolean(isComplimentary);
      }
      saveTenantToFirestore(tenantId);
      broadcastChange("config_update", tenant.config, tenantId);
    }
  }

  // Sync to tenants array
  tenants.forEach(t => {
    if (t.activeLicenseKey === key || t.id === lic.tenantId) {
      if (isComplimentary !== undefined) {
        t.isComplimentary = Boolean(isComplimentary);
        t.billingExempt = Boolean(isComplimentary);
      }
    }
  });

  saveGlobalsToFirestore();

  res.json({ message: "Licencia actualizada correctamente", license: lic });
});

app.post("/api/licenses/revoke", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Llave de licencia requerida." });
  }

  const licIndex = generatedLicenses.findIndex(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (licIndex === -1) {
    return res.status(404).json({ error: "Licencia no encontrada." });
  }

  generatedLicenses[licIndex].status = "expired";
  
  // If active is revoked, revert to "basica"
  for (const tenantId of Object.keys(tenantData)) {
    const tenant = tenantData[tenantId];
    if (tenant.config.activeLicenseKey === key) {
      tenant.config.licenseType = "basica";
      tenant.config.activeLicenseKey = undefined;

      const devTenant = tenants.find(t => t.id === tenantId);
      if (devTenant) {
        devTenant.licenseType = "basica";
        devTenant.activeLicenseKey = undefined;
      }

      broadcastChange("config_update", tenant.config, tenantId);
    }
  }

  res.json({ message: "Licencia revocada con éxito", licenses: generatedLicenses });
});

// --- NEW SaaS Developer Global Management Endpoints ---

// Global Broadcast Announcements State
let globalAnnouncements: any[] = [
  {
    id: "ann_1",
    title: "🚀 Actualización Plataforma SyncBarber v3.5",
    message: "Hemos habilitado el envío automático de alertas de cobro por correo electrónico y el módulo de barberías mejorado.",
    type: "info",
    createdAt: new Date().toISOString(),
    active: true
  }
];

// Global SaaS Pricing Plans
let saasPricingPlans = {
  basica: { price: 35000, name: "Plan Básica", maxBarbers: 2, whatsappBot: false, analytics: false, customDomain: false },
  profesional: { price: 75000, name: "Plan Profesional", maxBarbers: 5, whatsappBot: true, analytics: true, customDomain: false },
  premium: { price: 139000, name: "Plan Premium Enterprise", maxBarbers: 99, whatsappBot: true, analytics: true, customDomain: true }
};

// 1. Announcements API
app.get("/api/announcements", (req, res) => {
  const now = Date.now();
  const activeAnnouncements = (globalAnnouncements || []).filter(a => {
    if (a.active === false) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) return false;
    return true;
  });
  res.json({ announcements: activeAnnouncements });
});

app.get("/api/developer/announcements", (req, res) => {
  res.json({ announcements: globalAnnouncements || [] });
});

app.post("/api/developer/announcements", (req, res) => {
  const { title, message, type, expiresAt } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Título y mensaje requeridos" });
  }

  const newAnn = {
    id: "ann_" + Date.now(),
    title,
    message,
    type: type || "info", // "info" | "warning" | "alert" | "success"
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || null, // ISO string or null
    active: true
  };

  globalAnnouncements.unshift(newAnn);
  
  // Save & Broadcast announcement to all tenants
  saveGlobalsToFirestore();
  broadcastChange("announcement_new", newAnn);

  res.status(201).json({ message: "Anuncio global publicado a todos los inquilinos", announcement: newAnn });
});

app.patch("/api/developer/announcements/:id/toggle", (req, res) => {
  const { id } = req.params;
  const ann = globalAnnouncements.find(a => a.id === id);
  if (!ann) {
    return res.status(404).json({ error: "Anuncio no encontrado" });
  }

  if (typeof req.body.active === "boolean") {
    ann.active = req.body.active;
  } else {
    ann.active = !ann.active;
  }

  saveGlobalsToFirestore();
  broadcastChange("announcements_list", globalAnnouncements);
  res.json({ message: `Estado del anuncio actualizado a ${ann.active ? "Activo" : "Inactivo"}`, announcement: ann });
});

app.patch("/api/developer/announcements/:id", (req, res) => {
  const { id } = req.params;
  const ann = globalAnnouncements.find(a => a.id === id);
  if (!ann) {
    return res.status(404).json({ error: "Anuncio no encontrado" });
  }

  const { title, message, type, active, expiresAt } = req.body;
  if (title !== undefined) ann.title = title;
  if (message !== undefined) ann.message = message;
  if (type !== undefined) ann.type = type;
  if (active !== undefined) ann.active = Boolean(active);
  if (expiresAt !== undefined) ann.expiresAt = expiresAt;

  saveGlobalsToFirestore();
  broadcastChange("announcements_list", globalAnnouncements);
  res.json({ message: "Anuncio actualizado correctamente", announcement: ann });
});

app.delete("/api/developer/announcements/:id", (req, res) => {
  const { id } = req.params;
  globalAnnouncements = globalAnnouncements.filter(a => a.id !== id);
  saveGlobalsToFirestore();
  broadcastChange("announcements_list", globalAnnouncements);
  res.json({ message: "Anuncio eliminado correctamente" });
});

// 2. Pricing Plans Configurator API
app.get("/api/developer/pricing", (req, res) => {
  res.json({ pricing: saasPricingPlans });
});

app.post("/api/developer/pricing", (req, res) => {
  const { basicaPrice, profesionalPrice, premiumPrice } = req.body;
  if (basicaPrice) saasPricingPlans.basica.price = Number(basicaPrice);
  if (profesionalPrice) saasPricingPlans.profesional.price = Number(profesionalPrice);
  if (premiumPrice) saasPricingPlans.premium.price = Number(premiumPrice);

  saveGlobalsToFirestore();
  res.json({ message: "Precios y configuraciones de planes SaaS actualizados con éxito", pricing: saasPricingPlans });
});

// 3. Complete Database Backup & Export API
app.get("/api/developer/backup-export", (req, res) => {
  const backupData = {
    version: "3.5",
    timestamp: new Date().toISOString(),
    tenantsCount: tenants.length,
    licensesCount: generatedLicenses.length,
    tenants,
    generatedLicenses,
    tenantData,
    globalAnnouncements,
    saasPricingPlans
  };

  res.setHeader("Content-Disposition", `attachment; filename=syncbarber_backup_${Date.now()}.json`);
  res.setHeader("Content-Type", "application/json");
  res.json(backupData);
});

// Restore / Reset DB Endpoint
app.post("/api/developer/backup-import", (req, res) => {
  const { licenses, tenantsDataImport, tenants: importedTenants, salonAdmins: importedAdmins, helpdeskTickets: importedTickets } = req.body;
  try {
    if (Array.isArray(licenses)) {
      generatedLicenses = licenses;
    }
    if (Array.isArray(importedTenants)) {
      tenants = importedTenants;
    }
    if (Array.isArray(importedAdmins)) {
      salonAdmins = importedAdmins;
    }
    if (Array.isArray(importedTickets)) {
      helpdeskTickets = importedTickets;
    }
    if (tenantsDataImport && typeof tenantsDataImport === "object") {
      Object.assign(tenantData, tenantsDataImport);
      for (const tId of Object.keys(tenantsDataImport)) {
        saveTenantToFirestore(tId);
      }
    }
    saveGlobalsToFirestore();
    saveToLocalDisk();
    res.json({ message: "Copia de seguridad restaurada correctamente y persistida en disco y nube." });
  } catch (err) {
    res.status(500).json({ error: "Error al restaurar la base de datos" });
  }
});

// 4. Server Diagnostic & Health Inspector API
app.get("/api/developer/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  res.json({
    status: "HEALTHY",
    environment: process.env.NODE_ENV || "development",
    uptime: `${Math.floor(uptimeSeconds / 60)} min ${Math.floor(uptimeSeconds % 60)} sec`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    },
    tenantsCount: tenants.length,
    activeLicensesCount: generatedLicenses.filter(l => l.status !== "expired").length,
    firestoreSyncStatus: firestoreBaseUrl && firebaseConfig ? "CONNECTED_CLOUD_FIRESTORE" : "LOCAL_FILE_PERSISTENCE",
    localDbFile: fs.existsSync(LOCAL_DB_PATH) ? LOCAL_DB_PATH : (fs.existsSync(ROOT_DB_PATH) ? ROOT_DB_PATH : "NOT_CREATED_YET"),
    firestoreEnvironment: isProduction ? "PRODUCCIÓN" : "DESARROLLO",
    firestoreCollections: { system: SYSTEM_COLLECTION, tenants: TENANTS_COLLECTION },
    webSocketsActiveClients: 1,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/developer/health/clear-cache", (req, res) => {
  broadcastChange("system_clear_cache", { timestamp: new Date().toISOString() });
  saveGlobalsToFirestore();
  res.json({ message: "Caché de servidor purgado y estado sincronizado en caliente." });
});
app.get("/api/services", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.services);
});

app.post("/api/services", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, price, duration, category, description, allowRewardRedemption } = req.body;
  if (!name || !price || !duration || !category) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const newService: Service = {
    id: "s_" + Date.now().toString(),
    name,
    price: Number(price),
    duration: Number(duration),
    category,
    description: description || "",
    allowRewardRedemption: allowRewardRedemption !== undefined ? Boolean(allowRewardRedemption) : true,
  };

  tenant.services.push(newService);
  broadcastChange("services_update", tenant.services, tenantId);
  res.status(201).json(newService);
});

app.put("/api/services/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { name, price, duration, category, description, allowRewardRedemption } = req.body;
  
  const index = tenant.services.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Servicio no encontrado" });
  }

  tenant.services[index] = {
    ...tenant.services[index],
    name: name || tenant.services[index].name,
    price: price !== undefined ? Number(price) : tenant.services[index].price,
    duration: duration !== undefined ? Number(duration) : tenant.services[index].duration,
    category: category || tenant.services[index].category,
    description: description !== undefined ? description : tenant.services[index].description,
    allowRewardRedemption: allowRewardRedemption !== undefined ? Boolean(allowRewardRedemption) : tenant.services[index].allowRewardRedemption,
  };

  broadcastChange("services_update", tenant.services, tenantId);
  res.json(tenant.services[index]);
});

app.delete("/api/services/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const index = tenant.services.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Servicio no encontrado" });
  }

  tenant.services = tenant.services.filter((s) => s.id !== id);
  broadcastChange("services_update", tenant.services, tenantId);
  res.json({ message: "Servicio eliminado con éxito" });
});

// Helper function to compare phone numbers in a format-agnostic way
const phonesMatch = (phone1: string, phone2: string): boolean => {
  if (!phone1 || !phone2) return false;
  const p1 = phone1.replace(/\D/g, "");
  const p2 = phone2.replace(/\D/g, "");
  if (p1 === p2) return true;
  // Compare the last 9 digits if both have at least 9 digits
  if (p1.length >= 9 && p2.length >= 9) {
    return p1.slice(-9) === p2.slice(-9);
  }
  // Compare the last 7 digits if shorter
  if (p1.length >= 7 && p2.length >= 7) {
    return p1.slice(-7) === p2.slice(-7);
  }
  return false;
};

// 3.5. Barbers & Auth Routes
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  // Check our dynamic list of salon admins
  const customAdmin = salonAdmins.find(
    adm => adm.username.toLowerCase() === username.toLowerCase() && adm.password === password
  );

  if (customAdmin) {
    return res.json({
      success: true,
      role: "admin",
      user: { id: customAdmin.id, name: customAdmin.name, username: customAdmin.username, salonId: customAdmin.salonId }
    });
  }

  // Check if general admin (for fallback/safety)
  if (username.toLowerCase() === "admin" && password === "admin") {
    const targetTenantId = getTenantId(req);
    return res.json({
      success: true,
      role: "admin",
      user: { id: "admin", name: "Administrador del Salón", username: "admin", salonId: targetTenantId }
    });
  }

  // Check barbers: first check the requested tenant, then fallback to searching all tenants
  const tenantId = getTenantId(req);
  let targetTenant = tenantData[tenantId];
  let foundBarber = targetTenant ? targetTenant.barbers.find(b => b.username.toLowerCase() === username.toLowerCase() && b.password === password) : null;
  let matchedTenantId = tenantId;

  if (!foundBarber) {
    for (const [tId, tData] of Object.entries(tenantData)) {
      if (tData && Array.isArray(tData.barbers)) {
        const b = tData.barbers.find(item => item.username.toLowerCase() === username.toLowerCase() && item.password === password);
        if (b) {
          foundBarber = b;
          matchedTenantId = tId;
          break;
        }
      }
    }
  }

  if (foundBarber) {
    if (!foundBarber.isActive) {
      return res.status(403).json({ error: "Este usuario de barbero está inactivo" });
    }
    return res.json({
      success: true,
      role: "barber",
      barberId: foundBarber.id,
      user: { id: foundBarber.id, name: foundBarber.name, username: foundBarber.username, salonId: matchedTenantId }
    });
  }

  return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
});

// 3.6. Memberships & Client Portal Routes
app.get("/api/memberships", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(getTenantMemberships(tenant));
});

// --- 3.6.1. Lookbook & Haircut Catalog Styles API ---
app.get("/api/catalog-styles", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const styles = getTenantCatalogStyles(tenant);
  res.json({ success: true, styles });
});

app.post("/api/catalog-styles", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { title, category, photoUrl, description, recommendedFace, recommendedHair, serviceId, tags } = req.body;

  if (!title || !category || !photoUrl) {
    return res.status(400).json({ error: "Título, categoría y foto son obligatorios para el corte del catálogo." });
  }

  const categoryLabels: Record<string, string> = {
    fade: "Degradados & Fades",
    clasico: "Cortes Clásicos",
    barba: "Barba & Afeitado",
    tendencias: "Tendencias & Moda",
    diseno: "Diseños & Freestyle",
    general: "Estilo General"
  };

  let linkedServiceName = "";
  if (serviceId) {
    const s = tenant.services.find(srv => srv.id === serviceId);
    if (s) linkedServiceName = s.name;
  }

  const newStyle: CatalogStyle = {
    id: "style_" + Date.now().toString(),
    title: title.trim(),
    category: category,
    categoryLabel: categoryLabels[category] || "General",
    photoUrl: photoUrl.trim(),
    description: description ? description.trim() : "",
    recommendedFace: recommendedFace ? recommendedFace.trim() : "",
    recommendedHair: recommendedHair ? recommendedHair.trim() : "",
    serviceId: serviceId || undefined,
    serviceName: linkedServiceName || undefined,
    isActive: true,
    tags: Array.isArray(tags) ? tags : (title.split(" ").filter((w: string) => w.length > 2)),
    createdAt: new Date().toISOString()
  };

  const currentStyles = getTenantCatalogStyles(tenant);
  currentStyles.unshift(newStyle);
  tenant.catalogStyles = currentStyles;

  broadcastChange("catalog_styles_update", currentStyles, tenantId);
  saveTenantToFirestore(tenantId);

  res.status(201).json({ success: true, style: newStyle, styles: currentStyles });
});

app.put("/api/catalog-styles/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { title, category, photoUrl, description, recommendedFace, recommendedHair, serviceId, isActive, tags } = req.body;

  const currentStyles = getTenantCatalogStyles(tenant);
  const index = currentStyles.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Estilo del catálogo no encontrado." });
  }

  const categoryLabels: Record<string, string> = {
    fade: "Degradados & Fades",
    clasico: "Cortes Clásicos",
    barba: "Barba & Afeitado",
    tendencias: "Tendencias & Moda",
    diseno: "Diseños & Freestyle",
    general: "Estilo General"
  };

  const existing = currentStyles[index];
  const targetCategory = category || existing.category;
  
  let linkedServiceName = existing.serviceName;
  if (serviceId !== undefined) {
    if (serviceId) {
      const s = tenant.services.find(srv => srv.id === serviceId);
      linkedServiceName = s ? s.name : "";
    } else {
      linkedServiceName = "";
    }
  }

  currentStyles[index] = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    category: targetCategory,
    categoryLabel: categoryLabels[targetCategory] || existing.categoryLabel,
    photoUrl: photoUrl !== undefined ? photoUrl.trim() : existing.photoUrl,
    description: description !== undefined ? description.trim() : existing.description,
    recommendedFace: recommendedFace !== undefined ? recommendedFace.trim() : existing.recommendedFace,
    recommendedHair: recommendedHair !== undefined ? recommendedHair.trim() : existing.recommendedHair,
    serviceId: serviceId !== undefined ? (serviceId || undefined) : existing.serviceId,
    serviceName: linkedServiceName || undefined,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    tags: tags !== undefined ? (Array.isArray(tags) ? tags : existing.tags) : existing.tags
  };

  tenant.catalogStyles = currentStyles;
  broadcastChange("catalog_styles_update", currentStyles, tenantId);
  saveTenantToFirestore(tenantId);

  res.json({ success: true, style: currentStyles[index], styles: currentStyles });
});

app.delete("/api/catalog-styles/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;

  const currentStyles = getTenantCatalogStyles(tenant);
  const filtered = currentStyles.filter(s => s.id !== id);

  tenant.catalogStyles = filtered;
  broadcastChange("catalog_styles_update", filtered, tenantId);
  saveTenantToFirestore(tenantId);

  res.json({ success: true, message: "Estilo eliminado con éxito", styles: filtered });
});

app.post("/api/catalog-styles/reset-defaults", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];

  tenant.catalogStyles = JSON.parse(JSON.stringify(DEFAULT_CATALOG_STYLES));
  broadcastChange("catalog_styles_update", tenant.catalogStyles, tenantId);
  saveTenantToFirestore(tenantId);

  res.json({ success: true, message: "Catálogo restaurado a los estilos profesionales de fábrica", styles: tenant.catalogStyles });
});

app.get("/api/clients", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.clients);
});

app.post("/api/clients/register", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, phone, email, password, membershipId, loyaltyPoints, birthDate } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const phoneExists = tenant.clients.some(c => c.phone === phone);
  const emailExists = tenant.clients.some(c => c.email.toLowerCase() === email.toLowerCase());

  if (phoneExists) {
    return res.status(400).json({ error: "Este número de celular ya está registrado" });
  }
  if (emailExists) {
    return res.status(400).json({ error: "Este correo electrónico ya está registrado" });
  }

  let membershipIdVal = undefined;
  let membershipActiveVal = false;
  if (membershipId) {
    const plan = getTenantMemberships(tenant).find(m => m.id === membershipId);
    if (plan) {
      membershipIdVal = membershipId;
      membershipActiveVal = true;
    }
  }

  const newClient: ClientAccount = {
    id: "c_" + Date.now().toString(),
    name,
    phone,
    email,
    password,
    birthDate: birthDate || undefined,
    createdAt: new Date().toISOString(),
    loyaltyPoints: loyaltyPoints !== undefined ? Number(loyaltyPoints) : 1,
    avgCutCycleDays: 15,
    membershipId: membershipIdVal,
    membershipActive: membershipActiveVal
  };

  tenant.clients.push(newClient);
  broadcastChange("clients_list_update", tenant.clients, tenantId);
  res.status(201).json({ success: true, client: newClient });
});

app.get("/api/clients/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const phoneQuery = (req.query.phone as string) || "";
  const emailQuery = (req.query.email as string) || "";
  
  const cleanIdDigits = id ? id.replace(/\D/g, "") : "";
  const cleanPhoneDigits = phoneQuery ? phoneQuery.replace(/\D/g, "") : "";

  // Helper to find client in a client list
  const findClient = (clientList: typeof tenant.clients) => {
    // 1. By ID
    let found = clientList.find(c => c.id === id);
    if (found) return found;

    // 2. By phone query or ID as phone
    if (cleanPhoneDigits && cleanPhoneDigits.length >= 7) {
      found = clientList.find(c => c.phone && c.phone.replace(/\D/g, "").includes(cleanPhoneDigits.slice(-7)));
      if (found) return found;
    }
    if (cleanIdDigits && cleanIdDigits.length >= 7) {
      found = clientList.find(c => c.phone && c.phone.replace(/\D/g, "").includes(cleanIdDigits.slice(-7)));
      if (found) return found;
    }

    // 3. By email query or ID as email
    if (emailQuery) {
      found = clientList.find(c => c.email && c.email.toLowerCase() === emailQuery.toLowerCase());
      if (found) return found;
    }
    if (id && id.includes("@")) {
      found = clientList.find(c => c.email && c.email.toLowerCase() === id.toLowerCase());
      if (found) return found;
    }

    return null;
  };

  // Find in current tenant first
  let client = findClient(tenant.clients);
  
  // If not found in current, look across all tenants
  if (!client) {
    for (const tId of Object.keys(tenantData)) {
      client = findClient(tenantData[tId].clients);
      if (client) break;
    }
  }

  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }
  res.json({ success: true, client });
});

// --- INVENTORY & PRODUCT SALES / NEVERA ENDPOINTS ---
app.get("/api/inventory", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(getTenantInventory(tenant));
});

app.post("/api/inventory", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, category, price, cost, stock, minStock, barcode, allowBarberCommission, commissionPercent, imageUrl } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "Nombre y precio de venta requeridos." });
  }

  const newItem = {
    id: "inv_" + Date.now().toString(),
    name: name.trim(),
    category: category || "nevera",
    price: Number(price),
    cost: Number(cost || 0),
    stock: Number(stock || 0),
    minStock: Number(minStock || 3),
    barcode: barcode || "",
    imageUrl: imageUrl || "",
    allowBarberCommission: !!allowBarberCommission,
    commissionPercent: Number(commissionPercent || 0)
  };

  const inventory = getTenantInventory(tenant);
  inventory.push(newItem);
  broadcastChange("inventory_update", inventory, tenantId);
  res.status(201).json({ success: true, item: newItem, inventory });
});

app.put("/api/inventory/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const updates = req.body;

  const inventory = getTenantInventory(tenant);
  const itemIndex = inventory.findIndex(i => i.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Producto de inventario no encontrado" });
  }

  inventory[itemIndex] = {
    ...inventory[itemIndex],
    ...updates,
    price: updates.price !== undefined ? Number(updates.price) : inventory[itemIndex].price,
    cost: updates.cost !== undefined ? Number(updates.cost) : inventory[itemIndex].cost,
    stock: updates.stock !== undefined ? Number(updates.stock) : inventory[itemIndex].stock,
    minStock: updates.minStock !== undefined ? Number(updates.minStock) : inventory[itemIndex].minStock,
  };

  broadcastChange("inventory_update", inventory, tenantId);
  res.json({ success: true, item: inventory[itemIndex], inventory });
});

app.delete("/api/inventory/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;

  const inventory = getTenantInventory(tenant);
  tenant.inventory = inventory.filter(i => i.id !== id);
  broadcastChange("inventory_update", tenant.inventory, tenantId);
  res.json({ success: true, inventory: tenant.inventory });
});

// Sales & POS API
app.get("/api/sales", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(getTenantSales(tenant));
});

app.post("/api/sales", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { items, clientName, clientId, barberId, barberName, paymentMethod, appointmentId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debes seleccionar al menos un producto o bebida." });
  }

  const inventory = getTenantInventory(tenant);
  let totalAmount = 0;
  const processedItems = [];

  for (const saleItem of items) {
    const invItem = inventory.find(i => i.id === saleItem.productId);
    if (invItem) {
      const qty = Math.max(1, Number(saleItem.quantity || 1));
      invItem.stock = Math.max(0, invItem.stock - qty);
      const subtotal = invItem.price * qty;
      totalAmount += subtotal;

      processedItems.push({
        productId: invItem.id,
        name: invItem.name,
        category: invItem.category,
        price: invItem.price,
        cost: invItem.cost,
        quantity: qty,
        subtotal
      });
    }
  }

  const newSale = {
    id: "sale_" + Date.now().toString(),
    appointmentId,
    clientId,
    clientName: clientName || "Cliente Mostrador",
    barberId,
    barberName: barberName || "General / Mostrador",
    items: processedItems,
    totalAmount,
    paymentMethod: paymentMethod || "efectivo",
    createdAt: new Date().toISOString()
  };

  const sales = getTenantSales(tenant);
  sales.unshift(newSale);

  broadcastChange("inventory_update", inventory, tenantId);
  broadcastChange("sales_update", sales, tenantId);

  res.status(201).json({ success: true, sale: newSale, sales, inventory });
});

app.post("/api/appointments/:id/add-consumption", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const productId = req.body.productId || req.body.inventoryItemId;
  const quantity = Number(req.body.quantity || 1);

  const appt = tenant.appointments.find(a => a.id === id);
  if (!appt) {
    return res.status(404).json({ error: "Cita no encontrada" });
  }

  const inventory = getTenantInventory(tenant);
  const item = inventory.find(i => i.id === productId);

  if (!item) {
    return res.status(404).json({ error: "Producto/Bebida no encontrada en inventario" });
  }

  if (item.stock < quantity) {
    return res.status(400).json({ error: `Stock insuficiente. Solo quedan ${item.stock} unidades de ${item.name}.` });
  }

  item.stock = item.stock - Number(quantity);

  if (!appt.consumptions) {
    appt.consumptions = [];
  }

  appt.consumptions.push({
    productId: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    quantity: Number(quantity),
    addedAt: new Date().toISOString()
  });

  appt.consumptionsTotal = appt.consumptions.reduce((sum, c) => sum + (c.price * c.quantity), 0);

  // Register in sales history for POS / Reports
  const sales = getTenantSales(tenant);
  const newSale = {
    id: "sale_c_" + Date.now().toString(),
    appointmentId: appt.id,
    clientId: appt.serviceId, // reference or client
    clientName: appt.clientName || "Cliente Cita",
    barberId: appt.barberId,
    barberName: appt.barberName || "General",
    items: [{
      productId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      cost: item.cost,
      quantity: Number(quantity),
      subtotal: item.price * Number(quantity)
    }],
    totalAmount: item.price * Number(quantity),
    paymentMethod: "incluido_en_cita" as const,
    createdAt: new Date().toISOString()
  };
  sales.unshift(newSale);

  broadcastChange("inventory_update", inventory, tenantId);
  broadcastChange("sales_update", sales, tenantId);
  broadcastChange("appointment_updated", { appointment: appt, appointments: tenant.appointments }, tenantId);

  res.json({ success: true, appointment: appt, inventory, sales });
});

app.post("/api/appointments/:id/remove-consumption", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { consumptionIndex, productId } = req.body;

  const appt = tenant.appointments.find(a => a.id === id);
  if (!appt || !appt.consumptions || appt.consumptions.length === 0) {
    return res.status(404).json({ error: "Cita o consumos no encontrados" });
  }

  let targetIndex = -1;
  if (typeof consumptionIndex === "number" && consumptionIndex >= 0 && consumptionIndex < appt.consumptions.length) {
    targetIndex = consumptionIndex;
  } else if (productId) {
    targetIndex = appt.consumptions.findIndex(c => c.productId === productId);
  }

  if (targetIndex === -1) {
    return res.status(400).json({ error: "Consumo a eliminar no encontrado" });
  }

  const removedItem = appt.consumptions.splice(targetIndex, 1)[0];

  // Return stock to inventory
  const inventory = getTenantInventory(tenant);
  const invItem = inventory.find(i => i.id === removedItem.productId || i.name === removedItem.name);
  if (invItem) {
    invItem.stock = invItem.stock + Number(removedItem.quantity || 1);
  }

  appt.consumptionsTotal = appt.consumptions.reduce((sum, c) => sum + (c.price * c.quantity), 0);

  // Sync / remove corresponding sale in tenant.sales
  const sales = getTenantSales(tenant);
  const saleIdx = sales.findIndex(s => s.appointmentId === id && s.items.some(i => i.productId === removedItem.productId || i.name === removedItem.name));
  if (saleIdx !== -1) {
    sales.splice(saleIdx, 1);
  }

  broadcastChange("inventory_update", inventory, tenantId);
  broadcastChange("sales_update", sales, tenantId);
  broadcastChange("appointment_updated", { appointment: appt, appointments: tenant.appointments }, tenantId);

  res.json({ success: true, appointment: appt, inventory, sales });
});

app.post("/api/clients/login", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan correo o contraseña" });
  }

  // Find in current tenant first
  let client = tenant.clients.find(
    c => c.email.toLowerCase() === email.toLowerCase() && c.password === password
  );

  // If not found in current, look across all tenants
  if (!client) {
    for (const tId of Object.keys(tenantData)) {
      const otherClient = tenantData[tId].clients.find(
        c => c.email.toLowerCase() === email.toLowerCase() && c.password === password
      );
      if (otherClient) {
        client = otherClient;
        break;
      }
    }
  }

  if (!client) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }

  res.json({ success: true, client });
});

app.post("/api/clients/reset-password", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { email, phone, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Faltan datos obligatorios (correo electrónico y nueva contraseña)." });
  }

  const targetEmail = email.toLowerCase().trim();
  let client: any = null;
  let clientTenantId = tenantId;

  for (const tId of Object.keys(tenantData)) {
    const found = tenantData[tId].clients.find(
      c => c.email.toLowerCase() === targetEmail
    );
    if (found) {
      client = found;
      clientTenantId = tId;
      break;
    }
  }

  if (!client) {
    return res.status(404).json({ error: "No se encontró ninguna cuenta registrada con este correo electrónico." });
  }

  // Si proporciona celular para validación de seguridad
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanClientPhone = (client.phone || "").replace(/\D/g, "");
    if (cleanPhone && cleanClientPhone && !cleanClientPhone.includes(cleanPhone.slice(-7))) {
      return res.status(400).json({ error: "El número de celular ingresado no coincide con el registrado en esta cuenta." });
    }
  }

  client.password = newPassword.trim();
  broadcastChange("clients_update", tenantData[clientTenantId].clients, clientTenantId);

  res.json({
    success: true,
    message: "¡Tu contraseña ha sido restablecida con éxito! Ya puedes ingresar con tu nueva clave.",
    client
  });
});

// Reviews API Routes (Propuesta A)
app.get("/api/reviews", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.reviews);
});

app.post("/api/reviews", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { clientName, barberId, rating, comment } = req.body;
  if (!barberId || !rating) {
    return res.status(400).json({ error: "El barbero y la calificación son obligatorios." });
  }

  const newReview = {
    id: "r_" + Date.now().toString(),
    clientName: clientName || "Cliente Invitado",
    barberId,
    rating: Number(rating),
    comment: comment || "",
    date: new Date().toISOString().split("T")[0]
  };

  tenant.reviews.push(newReview);
  broadcastChange("reviews_update", tenant.reviews, tenantId);
  res.status(201).json({ success: true, review: newReview, reviews: tenant.reviews });
});


app.put("/api/clients/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { name, phone, email, password, membershipId, loyaltyPoints } = req.body;

  let client = tenant.clients.find(c => c.id === id);
  let targetTenant = tenant;
  let targetTenantId = tenantId;

  if (!client) {
    for (const tId of Object.keys(tenantData)) {
      const otherClient = tenantData[tId].clients.find(c => c.id === id);
      if (otherClient) {
        client = otherClient;
        targetTenant = tenantData[tId];
        targetTenantId = tId;
        break;
      }
    }
  }

  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  if (name !== undefined) client.name = name;
  if (phone !== undefined) client.phone = phone;
  if (email !== undefined) client.email = email;
  if (password !== undefined) client.password = password;
  if (req.body.birthDate !== undefined) client.birthDate = req.body.birthDate;
  if (loyaltyPoints !== undefined) client.loyaltyPoints = Number(loyaltyPoints);
  if (req.body.internalNotes !== undefined) client.internalNotes = req.body.internalNotes;
  if (req.body.technicalPreferences !== undefined) client.technicalPreferences = req.body.technicalPreferences;
  if (req.body.galleryPhotos !== undefined) client.galleryPhotos = req.body.galleryPhotos;
  if (req.body.avgCutCycleDays !== undefined) client.avgCutCycleDays = Number(req.body.avgCutCycleDays);
  if (req.body.lastCutDate !== undefined) client.lastCutDate = req.body.lastCutDate;

  if (req.body.membershipActive !== undefined) {
    client.membershipActive = Boolean(req.body.membershipActive);
  }

  if (membershipId !== undefined) {
    if (membershipId === null || membershipId === "" || membershipId === undefined) {
      client.membershipId = undefined;
      client.membershipActive = false;
    } else {
      client.membershipId = membershipId;
      client.membershipActive = true;
    }
  }

  broadcastChange("client_updated", client, targetTenantId);
  broadcastChange("clients_list_update", targetTenant.clients, targetTenantId);

  res.json({ success: true, client });
});

// AI Motor de Re-Corte & Retención Route
app.post("/api/ai/generate-recut-message", async (req, res) => {
  try {
    const { 
      clientName, 
      daysSinceLastCut, 
      avgCutCycleDays, 
      barberName, 
      serviceName, 
      technicalPreferences, 
      loyaltyPoints, 
      tone,
      salonName
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Local smart fallback generator if no key is set
      const styleSummary = technicalPreferences?.fadeType || "tu estilo habitual";
      const bonusText = (loyaltyPoints && loyaltyPoints >= 4) 
        ? ` Además, con tu próximo sello completas tu tarjeta de beneficios.` 
        : "";

      let fallbackText = `Hola ${clientName || 'amigo'}, te saludamos de ${salonName || 'la barbería'}. Han pasado ${daysSinceLastCut || 20} días desde tu último corte. Es el momento perfecto para retocar tu ${styleSummary}.${bonusText} ¿Te agendamos cita para esta semana?`;
      
      return res.json({ message: fallbackText });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Eres el asistente oficial de IA de la barbería "${salonName || 'Nuestra Barbería'}". 
Genera un mensaje de WhatsApp amigable, altamente personalizado, persuasivo y muy profesional para contactar a un cliente que ya necesita retocar su corte.

Datos del Cliente:
- Nombre: ${clientName}
- Días desde su último corte: ${daysSinceLastCut} días (frecuencia habitual: cada ${avgCutCycleDays || 15} días)
- Barbero preferido: ${barberName || 'su barbero estrella'}
- Servicio/Estilo anterior: ${serviceName || 'Corte Fade'}
- Preferencias técnicas de estilo: ${JSON.stringify(technicalPreferences || {})}
- Sellos de fidelidad acumulados: ${loyaltyPoints || 0} de 5
- Tono solicitado: ${tone || 'cercano y profesional'}

Requisitos del mensaje:
1. Saluda con entusiasmo y su nombre.
2. Menciona sutilmente cuántos días han transcurrido o que ya es momento de renovar su estilo.
3. Menciona su estilo de fade/corte si está disponible en sus preferencias.
4. Si tiene 4 o 5 sellos de fidelización, recuérdale que su próximo sello le dará una recompensa o beneficio exclusivo.
5. Incluye una llamada a la acción clara para reservar cita este fin de semana o esta semana.
6. Usa emojis elegantes con excelente formato para WhatsApp (negritas con *, saltos de línea legibles).
7. Devuelve ÚNICAMENTE el texto final del mensaje, sin comillas adicionales ni introducciones.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const generatedText = response.text?.trim() || "";
    res.json({ message: generatedText });
  } catch (error: any) {
    console.error("[Gemini AI Error]", error);
    // Fallback response on error
    const { clientName, daysSinceLastCut, technicalPreferences, salonName } = req.body;
    const styleSummary = technicalPreferences?.fadeType || "tu corte favorito";
    const fallbackMessage = `Hola ${clientName || 'estimado cliente'} 👋. En ${salonName || 'nuestro salón'} recordamos que han pasado ${daysSinceLastCut || 20} días desde tu última visita. Es el momento ideal para renovar tu ${styleSummary}. ¿A qué hora te gustaría agendar tu cita esta semana?`;
    res.json({ message: fallbackMessage });
  }
});

app.put("/api/clients/:id/membership", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { membershipId } = req.body;

  let client = tenant.clients.find(c => c.id === id);
  let targetTenant = tenant;
  let targetTenantId = tenantId;

  if (!client) {
    for (const tId of Object.keys(tenantData)) {
      const otherClient = tenantData[tId].clients.find(c => c.id === id);
      if (otherClient) {
        client = otherClient;
        targetTenant = tenantData[tId];
        targetTenantId = tId;
        break;
      }
    }
  }

  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  if (membershipId === null || membershipId === "" || membershipId === undefined) {
    client.membershipId = undefined;
    client.membershipActive = false;
  } else {
    const plan = getTenantMemberships(targetTenant).find(m => m.id === membershipId);
    if (!plan) {
      return res.status(400).json({ error: "Plan de membresía no válido" });
    }
    client.membershipId = membershipId;
    client.membershipActive = true;
  }

  broadcastChange("client_updated", client, targetTenantId);
  broadcastChange("clients_list_update", targetTenant.clients, targetTenantId);

  res.json({ success: true, client });
});

app.get("/api/barbers", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.barbers);
});

app.post("/api/barbers", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, username, password, specialties, avatarUrl, photoUrl, phone, whatsapp } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const exists = tenant.barbers.some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";
  if (exists) {
    return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
  }

  // Check license limit for active barbers (including custom negotiated quotas)
  const licType = (tenant.config?.licenseType || "basica") as keyof typeof saasPricingPlans;
  const plan = saasPricingPlans[licType] || saasPricingPlans.basica;
  const defaultMax = plan.maxBarbers || (licType === "basica" ? 2 : licType === "profesional" ? 5 : 99);
  const customMax = tenant.config?.customMaxBarbers ? Number(tenant.config.customMaxBarbers) : undefined;
  const maxAllowed = customMax || defaultMax;
  const activeCount = (tenant.barbers || []).filter(b => b.isActive !== false).length;

  if (activeCount >= maxAllowed) {
    const quotaTypeMsg = customMax ? `(Cupo negociado: ${customMax} barberos)` : `(Plan ${plan.name || licType}: ${defaultMax} barberos)`;
    return res.status(403).json({
      error: `Límite de barberos alcanzado: Tu salón permite hasta ${maxAllowed} barberos activos ${quotaTypeMsg}. Para registrar más profesionales, contacta al soporte técnico o actualiza tu suscripción en el menú de Licencias.`
    });
  }

  const newBarber: Barber = {
    id: "b_" + Date.now().toString(),
    name,
    username,
    password,
    phone: phone || whatsapp || "",
    whatsapp: whatsapp || phone || "",
    isActive: true,
    specialties: specialties || ["cabello"],
    avatarUrl: avatarUrl || photoUrl || "",
    photoUrl: photoUrl || avatarUrl || ""
  };

  tenant.barbers.push(newBarber);
  saveGlobalsToFirestore();
  broadcastChange("barbers_update", tenant.barbers, tenantId);
  res.status(201).json(newBarber);
});

app.put("/api/barbers/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { name, username, password, isActive, specialties, commissionPercent, avatarUrl, photoUrl, phone, whatsapp } = req.body;

  const index = tenant.barbers.findIndex(b => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Barbero no encontrado" });
  }

  if (username && username.toLowerCase() !== tenant.barbers[index].username.toLowerCase()) {
    const exists = tenant.barbers.some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";
    if (exists) {
      return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    }
  }

  // If attempting to reactivate an inactive barber, check license limit (including custom negotiated quotas)
  if (isActive === true && tenant.barbers[index].isActive === false) {
    const licType = (tenant.config?.licenseType || "basica") as keyof typeof saasPricingPlans;
    const plan = saasPricingPlans[licType] || saasPricingPlans.basica;
    const defaultMax = plan.maxBarbers || (licType === "basica" ? 2 : licType === "profesional" ? 5 : 99);
    const customMax = tenant.config?.customMaxBarbers ? Number(tenant.config.customMaxBarbers) : undefined;
    const maxAllowed = customMax || defaultMax;
    const activeCount = (tenant.barbers || []).filter(b => b.isActive !== false).length;

    if (activeCount >= maxAllowed) {
      return res.status(403).json({
        error: `Límite de barberos alcanzado: No puedes reactivar a este barbero porque el cupo configurado para tu salón es de ${maxAllowed} barberos activos.`
      });
    }
  }

  tenant.barbers[index] = {
    ...tenant.barbers[index],
    name: name || tenant.barbers[index].name,
    username: username || tenant.barbers[index].username,
    password: password || tenant.barbers[index].password,
    phone: phone !== undefined ? phone : tenant.barbers[index].phone,
    whatsapp: whatsapp !== undefined ? whatsapp : (phone !== undefined ? phone : tenant.barbers[index].whatsapp),
    isActive: isActive !== undefined ? isActive : tenant.barbers[index].isActive,
    specialties: specialties || tenant.barbers[index].specialties,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : (photoUrl !== undefined ? photoUrl : tenant.barbers[index].avatarUrl),
    photoUrl: photoUrl !== undefined ? photoUrl : (avatarUrl !== undefined ? avatarUrl : tenant.barbers[index].photoUrl),
    commissionPercent: commissionPercent !== undefined ? Number(commissionPercent) : tenant.barbers[index].commissionPercent,
    blockedDates: req.body.blockedDates !== undefined ? req.body.blockedDates : tenant.barbers[index].blockedDates,
    timeBlocks: req.body.timeBlocks !== undefined ? req.body.timeBlocks : tenant.barbers[index].timeBlocks,
    advances: req.body.advances !== undefined ? req.body.advances : tenant.barbers[index].advances,
    payrollSettlements: req.body.payrollSettlements !== undefined ? req.body.payrollSettlements : tenant.barbers[index].payrollSettlements
  };

  // Update barber name in their appointments
  tenant.appointments.forEach((app, i) => {
    if (app.barberId === id) {
      tenant.appointments[i].barberName = tenant.barbers[index].name;
    }
  });

  saveGlobalsToFirestore();
  broadcastChange("barbers_update", tenant.barbers, tenantId);
  broadcastChange("appointment_updated", { appointment: {}, appointments: tenant.appointments }, tenantId); // force update list
  res.json(tenant.barbers[index]);
});

app.delete("/api/barbers/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const index = tenant.barbers.findIndex(b => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Barbero no encontrado" });
  }

  const deleted = tenant.barbers[index];
  tenant.barbers = tenant.barbers.filter(b => b.id !== id);

  tenant.appointments.forEach((app, i) => {
    if (app.barberId === id) {
      tenant.appointments[i].barberId = undefined;
      tenant.appointments[i].barberName = "Barbero No Asignado";
    }
  });

  saveGlobalsToFirestore();
  broadcastChange("barbers_update", tenant.barbers, tenantId);
  broadcastChange("appointment_updated", { appointment: {}, appointments: tenant.appointments }, tenantId); // force update list
  res.json({ message: "Barbero eliminado con éxito", barber: deleted });
});

// 4. Appointments Routes
app.get("/api/appointments", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.appointments);
});

// Check if a slot is busy (overlapping check taking barber into account)
function isSlotOverlapping(tenantId: string, date: string, time: string, duration: number, barberId?: string, excludeId?: string) {
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const startToMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const startA = startToMin(time);
  const endA = startA + duration;

  if (barberId && barberId !== "any") {
    // Check if barber is blocked on this date (sick/resting)
    const targetBarber = tenant.barbers.find(b => b.id === barberId);
    if (targetBarber && targetBarber.blockedDates && targetBarber.blockedDates.includes(date)) {
      return true; // Overlapping/unavailable
    }

    // Check if barber has a time block (lunch/rest) on this date & time
    if (targetBarber && targetBarber.timeBlocks) {
      const hasBlock = targetBarber.timeBlocks.some((block: any) => {
        if (block.date !== date) return false;
        const blockStart = startToMin(block.startTime);
        const blockEnd = startToMin(block.endTime);
        return startA < blockEnd && blockStart < endA;
      });
      if (hasBlock) return true;
    }

    // If a specific barber is selected, they must be free
    return tenant.appointments.some((app) => {
      if (app.id === excludeId) return false;
      if (app.date !== date) return false;
      if (app.status === "canceled") return false;
      if (app.barberId !== barberId) return false;

      const startB = startToMin(app.time);
      const endB = startB + app.duration;

      return startA < endB && startB < endA;
    });
  } else {
    // If "any" (or undefined), check if ALL active, non-blocked barbers are busy
    const activeBarbers = tenant.barbers.filter(b => b.isActive && !(b.blockedDates && b.blockedDates.includes(date)));
    if (activeBarbers.length === 0) return true; // if no barbers, no overlap possible/no slot available

    const freeBarbers = activeBarbers.filter(barber => {
      // Check if this barber has any time block on this date & time
      if (barber.timeBlocks) {
        const hasBlock = barber.timeBlocks.some((block: any) => {
          if (block.date !== date) return false;
          const blockStart = startToMin(block.startTime);
          const blockEnd = startToMin(block.endTime);
          return startA < blockEnd && blockStart < endA;
        });
        if (hasBlock) return false; // not free
      }

      const isBusy = tenant.appointments.some((app) => {
        if (app.id === excludeId) return false;
        if (app.date !== date) return false;
        if (app.status === "canceled") return false;
        if (app.barberId !== barber.id) return false;

        const startB = startToMin(app.time);
        const endB = startB + app.duration;

        return startA < endB && startB < endA;
      });
      return !isBusy;
    });

    return freeBarbers.length === 0; // overlapping/busy if no barbers are free
  }
}

app.post("/api/appointments", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { 
    clientName, 
    clientPhone, 
    clientEmail, 
    serviceId, 
    date, 
    time, 
    notes, 
    barberId,
    birthDate,
    isBirthdayBenefit,
    selectedStyleId,
    selectedStyleName,
    selectedStylePhotoUrl,
    selectedStyleCategory,
    selectedStyleNotes
  } = req.body;

  if (!clientName || !clientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: "Faltan campos obligatorios para agendar" });
  }

  const selectedService = tenant.services.find((s) => s.id === serviceId);
  if (!selectedService) {
    return res.status(404).json({ error: "Servicio no encontrado" });
  }

  // Check for slot conflicts
  if (isSlotOverlapping(tenantId, date, time, selectedService.duration, barberId)) {
    return res.status(409).json({ 
      error: "Conflicto de horario", 
      message: "Este horario ya está reservado o el barbero seleccionado no está disponible. Por favor selecciona otro momento." 
    });
  }

  // Determine assigned barber
  let assignedBarberId = barberId;
  let assignedBarberName = "Cualquier Barbero";

  const activeBarbers = tenant.barbers.filter(b => b.isActive && !(b.blockedDates && b.blockedDates.includes(date)));
  if (barberId && barberId !== "any") {
    const bObj = activeBarbers.find(b => b.id === barberId);
    if (bObj) {
      assignedBarberId = bObj.id;
      assignedBarberName = bObj.name;
    }
  } else {
    // Find first free active barber for this slot
    const freeBarber = activeBarbers.find(barber => {
      const isBusy = tenant.appointments.some(app => {
        if (app.date !== date) return false;
        if (app.status === "canceled") return false;
        if (app.barberId !== barber.id) return false;

        const startToMin = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        const startA = startToMin(time);
        const endA = startA + selectedService.duration;
        const startB = startToMin(app.time);
        const endB = startB + app.duration;

        return startA < endB && startB < endA;
      });
      return !isBusy;
    });

    if (freeBarber) {
      assignedBarberId = freeBarber.id;
      assignedBarberName = freeBarber.name;
    } else if (activeBarbers.length > 0) {
      assignedBarberId = activeBarbers[0].id;
      assignedBarberName = activeBarbers[0].name;
    }
  }

  let calculatedPrice = selectedService.price;
  let appointmentMembershipId: string | undefined = undefined;
  let appointmentDiscountPercent: number | undefined = undefined;

  let clientMatch = tenant.clients.find(
    c => phonesMatch(c.phone, clientPhone) || 
         (clientEmail && c.email && c.email.toLowerCase() === clientEmail.toLowerCase()) ||
         (c.name && clientName && c.name.toLowerCase().trim() === clientName.toLowerCase().trim())
  );

  // If no existing client found, create client record to track loyalty and future penalties
  if (!clientMatch) {
    clientMatch = {
      id: "c_" + Date.now().toString(),
      name: clientName,
      phone: clientPhone,
      email: clientEmail || "",
      createdAt: new Date().toISOString(),
      loyaltyPoints: 0,
      avgCutCycleDays: 15,
      pendingPenalty: 0,
      penaltyHistory: []
    };
    tenant.clients.push(clientMatch);
    broadcastChange("clients_list_update", tenant.clients, tenantId);
  }
  
  // If birthDate is provided, update client record
  if (birthDate && clientMatch) {
    clientMatch.birthDate = birthDate;
  }

  let isBirthdayBenefitApplied = false;

  if (isBirthdayBenefit) {
    // Verify birthday month match
    const apptMonth = date.substring(5, 7); // "09" from "2026-09-04"
    const clientBdayMonth = (clientMatch?.birthDate || birthDate || "").includes("-")
      ? (clientMatch?.birthDate || birthDate || "").split("-").slice(-2, -1)[0] || (clientMatch?.birthDate || birthDate || "").substring(0, 2)
      : "";
    
    const apptYear = date.substring(0, 4);
    const usedYears = clientMatch?.birthdayBenefitUsedYears || [];

    if (!usedYears.includes(apptYear)) {
      calculatedPrice = 0;
      isBirthdayBenefitApplied = true;
      if (clientMatch) {
        clientMatch.birthdayBenefitUsedYears = [...usedYears, apptYear];
      }
    }
  } else if (req.body.redeemReward && clientMatch && (clientMatch.loyaltyPoints || 0) >= 5) {
    calculatedPrice = 0;
    clientMatch.loyaltyPoints = (clientMatch.loyaltyPoints || 0) - 5;
    setTimeout(() => {
      broadcastChange("client_updated", clientMatch, tenantId);
      broadcastChange("clients_list_update", tenant.clients, tenantId);
    }, 100);
  } else if (clientMatch && clientMatch.membershipActive && clientMatch.membershipId) {
    const plan = getTenantMemberships(tenant).find(m => m.id === clientMatch.membershipId);
    if (plan) {
      calculatedPrice = Math.round(selectedService.price * (1 - plan.discountPercent / 100));
      appointmentMembershipId = clientMatch.membershipId;
      appointmentDiscountPercent = plan.discountPercent;
    }
  }

  // Check and apply pending penalty for missed previous appointment
  let penaltyApplied = 0;
  if (clientMatch && (clientMatch.pendingPenalty || 0) > 0) {
    penaltyApplied = clientMatch.pendingPenalty;
    calculatedPrice += penaltyApplied;
    clientMatch.pendingPenalty = 0;
    if (clientMatch.penaltyHistory) {
      clientMatch.penaltyHistory.forEach(p => {
        if (p.status === "pending") {
          p.status = "paid";
        }
      });
    }
    setTimeout(() => {
      broadcastChange("client_updated", clientMatch, tenantId);
      broadcastChange("clients_list_update", tenant.clients, tenantId);
    }, 100);
  }

  const appointmentNotes = (notes || "") + (penaltyApplied > 0 ? ` [Incluye recaudo de multa por inasistencia previa de $${penaltyApplied.toLocaleString()} COP]` : "");

  const newAppointment: Appointment = {
    id: "a_" + Date.now().toString(),
    clientName,
    clientPhone,
    clientEmail: clientEmail || "",
    serviceId,
    serviceName: selectedService.name,
    price: calculatedPrice,
    date,
    time,
    duration: selectedService.duration,
    status: req.body.status || "confirmed", 
    notes: appointmentNotes,
    barberId: assignedBarberId,
    barberName: assignedBarberName,
    createdAt: new Date().toISOString(),
    membershipId: appointmentMembershipId,
    membershipDiscountPercent: appointmentDiscountPercent,
    isBirthdayBenefit: isBirthdayBenefitApplied,
    birthDate: birthDate || clientMatch?.birthDate || undefined,
    selectedStyleId: selectedStyleId || undefined,
    selectedStyleName: selectedStyleName || undefined,
    selectedStylePhotoUrl: selectedStylePhotoUrl || undefined,
    selectedStyleCategory: selectedStyleCategory || undefined,
    selectedStyleNotes: selectedStyleNotes || undefined
  };

  tenant.appointments.push(newAppointment);
  broadcastChange("appointment_created", { appointment: newAppointment, appointments: tenant.appointments }, tenantId);
  res.status(201).json(newAppointment);
});

app.put("/api/appointments/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { status, date, time, hairdresserNotes, notes, clientName, clientPhone, clientEmail, serviceId, barberId, tip, paymentMethod } = req.body;

  const index = tenant.appointments.findIndex((app) => app.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cita no encontrada" });
  }

  const appToUpdate = tenant.appointments[index];

  const nextBarberId = barberId !== undefined ? barberId : appToUpdate.barberId;
  const nextDate = date || appToUpdate.date;
  const nextTime = time || appToUpdate.time;
  const currentService = tenant.services.find((s) => s.id === (serviceId || appToUpdate.serviceId)) || { duration: appToUpdate.duration, name: appToUpdate.serviceName, price: appToUpdate.price };
  
  if (
    (date && date !== appToUpdate.date) || 
    (time && time !== appToUpdate.time) || 
    (serviceId && serviceId !== appToUpdate.serviceId) ||
    (barberId !== undefined && barberId !== appToUpdate.barberId)
  ) {
    if (status !== "canceled" && isSlotOverlapping(tenantId, nextDate, nextTime, currentService.duration, nextBarberId, id)) {
      return res.status(409).json({ 
        error: "Conflicto de horario", 
        message: "El nuevo horario seleccionado ya está reservado o el barbero no está disponible." 
      });
    }
  }

  let updatedBarberName = appToUpdate.barberName;
  if (barberId !== undefined) {
    const bObj = tenant.barbers.find(b => b.id === barberId);
    updatedBarberName = bObj ? bObj.name : "Cualquier Barbero";
  }

  let finalPrice = req.body.price !== undefined ? Number(req.body.price) : appToUpdate.price;
  let appointmentMembershipId = appToUpdate.membershipId;
  let appointmentDiscountPercent = appToUpdate.membershipDiscountPercent;

  if (serviceId !== undefined && req.body.price === undefined) {
    finalPrice = (currentService as any).price;
    const phoneToCheck = clientPhone !== undefined ? clientPhone : appToUpdate.clientPhone;
    const emailToCheck = clientEmail !== undefined ? clientEmail : appToUpdate.clientEmail;
    
    const clientMatch = tenant.clients.find(
      c => phonesMatch(c.phone, phoneToCheck) || 
           (emailToCheck && c.email && c.email.toLowerCase() === emailToCheck.toLowerCase())
    );
    if (clientMatch && clientMatch.membershipActive && clientMatch.membershipId) {
      const plan = getTenantMemberships(tenant).find(m => m.id === clientMatch.membershipId);
      if (plan) {
        finalPrice = Math.round((currentService as any).price * (1 - plan.discountPercent / 100));
        appointmentMembershipId = clientMatch.membershipId;
        appointmentDiscountPercent = plan.discountPercent;
      } else {
        appointmentMembershipId = undefined;
        appointmentDiscountPercent = undefined;
      }
    } else {
      appointmentMembershipId = undefined;
      appointmentDiscountPercent = undefined;
    }
  }

  // If transition to completed, award loyalty points (Propuesta B)
  if (status === "completed" && appToUpdate.status !== "completed") {
    const phoneToCheck = clientPhone !== undefined ? clientPhone : appToUpdate.clientPhone;
    const emailToCheck = clientEmail !== undefined ? clientEmail : appToUpdate.clientEmail;
    
    const clientMatch = tenant.clients.find(
      c => phonesMatch(c.phone, phoneToCheck) || 
           (emailToCheck && c.email && c.email.toLowerCase() === emailToCheck.toLowerCase())
    );
    if (clientMatch) {
      clientMatch.loyaltyPoints = (clientMatch.loyaltyPoints || 0) + 1;
      setTimeout(() => {
        broadcastChange("client_updated", clientMatch, tenantId);
      }, 100);
    }
  }

  tenant.appointments[index] = {
    ...appToUpdate,
    clientName: clientName !== undefined ? clientName : appToUpdate.clientName,
    clientPhone: clientPhone !== undefined ? clientPhone : appToUpdate.clientPhone,
    clientEmail: clientEmail !== undefined ? clientEmail : appToUpdate.clientEmail,
    serviceId: serviceId !== undefined ? serviceId : appToUpdate.serviceId,
    serviceName: serviceId !== undefined ? currentService.name : appToUpdate.serviceName,
    price: finalPrice,
    duration: serviceId !== undefined ? (currentService as any).duration : appToUpdate.duration,
    status: status !== undefined ? status : appToUpdate.status,
    date: nextDate,
    time: nextTime,
    notes: notes !== undefined ? notes : appToUpdate.notes,
    hairdresserNotes: hairdresserNotes !== undefined ? hairdresserNotes : appToUpdate.hairdresserNotes,
    barberId: nextBarberId,
    barberName: updatedBarberName,
    membershipId: appointmentMembershipId,
    membershipDiscountPercent: appointmentDiscountPercent,
    tip: tip !== undefined ? Number(tip) : appToUpdate.tip,
    paymentMethod: paymentMethod !== undefined ? paymentMethod : appToUpdate.paymentMethod
  };

  broadcastChange("appointment_updated", { appointment: tenant.appointments[index], appointments: tenant.appointments }, tenantId);
  res.json(tenant.appointments[index]);
});

app.delete("/api/appointments/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const index = tenant.appointments.findIndex((app) => app.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cita no encontrada" });
  }

  const deletedApp = tenant.appointments[index];
  tenant.appointments = tenant.appointments.filter((app) => app.id !== id);
  broadcastChange("appointment_deleted", { id, appointments: tenant.appointments }, tenantId);
  res.json({ message: "Cita eliminada con éxito", appointment: deletedApp });
});

// --- KIOSK CHECK-IN ENDPOINT ---
app.post("/api/kiosk/checkin", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { phone, appointmentId } = req.body;

  let appt = null;
  const today = new Date().toISOString().split("T")[0];

  if (appointmentId) {
    appt = tenant.appointments.find(a => a.id === appointmentId);
  } else if (phone) {
    // Find today's non-canceled appointment matching phone
    appt = tenant.appointments.find(a => 
      phonesMatch(a.clientPhone, phone) && 
      a.date === today && 
      a.status !== "canceled" && 
      a.status !== "completed"
    );
  }

  if (!appt) {
    return res.status(404).json({ error: "No se encontró una cita programada para hoy con este número." });
  }

  appt.checkedIn = true;
  appt.checkInTime = new Date().toISOString();
  appt.status = "en_espera";

  broadcastChange("kiosk_checkin", { appointment: appt }, tenantId);
  broadcastChange("appointment_updated", { appointment: appt, appointments: tenant.appointments }, tenantId);

  res.json({ success: true, message: `¡Bienvenido ${appt.clientName}! Tu llegada fue notificada al barbero.`, appointment: appt });
});

// --- KIOSK WALK-IN REGISTRATION ENDPOINT ---
app.post("/api/kiosk/walkin", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { clientName, clientPhone, serviceId, barberId } = req.body;

  if (!clientName || !serviceId) {
    return res.status(400).json({ error: "Por favor ingresa tu nombre y selecciona un servicio." });
  }

  const selectedService = tenant.services.find(s => s.id === serviceId);
  if (!selectedService) {
    return res.status(404).json({ error: "Servicio no encontrado" });
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let assignedBarberId = barberId;
  let assignedBarberName = "Cualquier Barbero";

  if (barberId && barberId !== "any") {
    const bObj = tenant.barbers.find(b => b.id === barberId);
    if (bObj) {
      assignedBarberId = bObj.id;
      assignedBarberName = bObj.name;
    }
  }

  const todayWalkIns = tenant.appointments.filter(a => a.date === today && a.notes?.includes("[WALK-IN KIOSCO]"));
  const turnNum = todayWalkIns.length + 1;
  const turnCode = `W-${String(turnNum).padStart(2, "0")}`;

  const newAppt: Appointment = {
    id: "a_walkin_" + Date.now().toString(),
    clientName,
    clientPhone: clientPhone || "Walk-in Entrada",
    clientEmail: "",
    serviceId,
    serviceName: selectedService.name,
    price: selectedService.price,
    date: today,
    time: time,
    duration: selectedService.duration,
    status: "en_espera",
    checkedIn: true,
    checkInTime: new Date().toISOString(),
    notes: `[WALK-IN KIOSCO] Turno ${turnCode}`,
    barberId: assignedBarberId,
    barberName: assignedBarberName,
    createdAt: new Date().toISOString()
  };

  tenant.appointments.push(newAppt);
  broadcastChange("appointment_created", { appointment: newAppt, appointments: tenant.appointments }, tenantId);
  broadcastChange("kiosk_walkin", { appointment: newAppt, turnCode }, tenantId);

  res.status(201).json({ success: true, appointment: newAppt, turnCode });
});

// --- PENALTIES & ABONOS ENDPOINTS ---
app.post("/api/clients/:id/penalties/add", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { amount, reason, appointmentId, clientName, clientPhone } = req.body;

  let client = tenant.clients.find(c => 
    c.id === id || 
    phonesMatch(c.phone, id) || 
    (clientPhone && phonesMatch(c.phone, clientPhone)) ||
    (clientName && c.name && c.name.toLowerCase().trim() === clientName.toLowerCase().trim())
  );

  if (!client) {
    if (!clientName && !clientPhone && id.startsWith("temp_")) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    // Create client on the fly if needed
    client = {
      id: "c_" + Date.now().toString(),
      name: clientName || id,
      phone: clientPhone || (id.match(/^\+?\d+$/) ? id : ""),
      email: "",
      createdAt: new Date().toISOString(),
      loyaltyPoints: 0,
      pendingPenalty: 0,
      penaltyHistory: []
    };
    tenant.clients.push(client);
  }

  const defaultPenalty = tenant.config?.noShowPenaltyAmount !== undefined ? Number(tenant.config.noShowPenaltyAmount) : 10000;
  const penaltyAmount = Number(amount) > 0 ? Number(amount) : defaultPenalty;
  client.pendingPenalty = (client.pendingPenalty || 0) + penaltyAmount;
  
  if (!client.penaltyHistory) client.penaltyHistory = [];
  client.penaltyHistory.unshift({
    id: "pen_" + Date.now().toString(),
    amount: penaltyAmount,
    reason: reason || "Inasistencia / Multa por reserva previa",
    createdAt: new Date().toISOString(),
    status: "pending",
    appointmentId
  });

  broadcastChange("client_updated", client, tenantId);
  broadcastChange("clients_list_update", tenant.clients, tenantId);
  res.json({ success: true, client });
});

app.post("/api/clients/:id/penalties/waive", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { waivedBy, clientPhone, clientName } = req.body;

  let client = tenant.clients.find(c => 
    c.id === id || 
    phonesMatch(c.phone, id) || 
    (clientPhone && phonesMatch(c.phone, clientPhone)) ||
    (clientName && c.name && c.name.toLowerCase().trim() === clientName.toLowerCase().trim())
  );

  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  client.pendingPenalty = 0;
  if (client.penaltyHistory) {
    client.penaltyHistory.forEach(p => {
      if (p.status === "pending") {
        p.status = "waived";
        p.waivedBy = waivedBy || "Barbero / Admin";
      }
    });
  }

  broadcastChange("client_updated", client, tenantId);
  broadcastChange("clients_list_update", tenant.clients, tenantId);
  res.json({ success: true, message: "Multa exonerada correctamente", client });
});

// --- PASAPORTE DIGITAL DE ESTILO ENDPOINTS ---
app.post("/api/clients/:id/passport", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { technicalPreferences, lastCutDate, internalNotes } = req.body;

  const client = tenant.clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  if (technicalPreferences) {
    client.technicalPreferences = { ...(client.technicalPreferences || {}), ...technicalPreferences };
  }
  if (lastCutDate) client.lastCutDate = lastCutDate;
  if (internalNotes !== undefined) client.internalNotes = internalNotes;

  broadcastChange("client_updated", client, tenantId);
  res.json({ success: true, client });
});

app.post("/api/clients/:id/gallery", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { url, styleTag, barberName, notes } = req.body;

  const client = tenant.clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  if (!client.galleryPhotos) client.galleryPhotos = [];
  const newPhoto = {
    id: "p_" + Date.now().toString(),
    url: url || "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600",
    date: new Date().toISOString().split("T")[0],
    styleTag: styleTag || "Corte de Autor",
    barberName: barberName || "Barbero",
    notes
  };

  client.galleryPhotos.unshift(newPhoto);
  broadcastChange("client_updated", client, tenantId);
  res.json({ success: true, photo: newPhoto, client });
});

// --- ARQUEO Y CIERRE DE CAJA AUTOMATIZADO ---
app.get("/api/cash-register/current", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const today = new Date().toISOString().split("T")[0];

  // Filter today's completed appointments
  const todayApps = tenant.appointments.filter(a => a.date === today && a.status === "completed");
  
  // Filter today's sales
  const sales = getTenantSales(tenant);
  const todaySales = sales.filter(s => (s.createdAt || "").split("T")[0] === today);

  // Breakdown by payment method
  let expectedCash = 0;
  let expectedDigital = 0; // Nequi / Daviplata / Transferencia
  let expectedCard = 0;
  let totalCutsRevenue = 0;
  let totalProductsRevenue = 0;
  let totalTips = 0;

  todayApps.forEach(a => {
    totalCutsRevenue += (a.price || 0);
    totalTips += (a.tip || 0);

    const apptTotal = (a.price || 0) + (a.tip || 0);
    const pm = a.paymentMethod || "efectivo";
    if (pm === "efectivo") {
      expectedCash += apptTotal;
    } else if (pm === "nequi_daviplata" || pm === "transferencia") {
      expectedDigital += apptTotal;
    } else if (pm === "tarjeta") {
      expectedCard += apptTotal;
    } else {
      expectedCash += apptTotal;
    }

    if (a.consumptions) {
      a.consumptions.forEach(c => {
        totalProductsRevenue += (c.price || 0) * (c.quantity || 1);
      });
    }
  });

  todaySales.forEach(s => {
    // Exclude included in appt sales if already counted
    if (s.paymentMethod !== "incluido_en_cita") {
      totalProductsRevenue += s.totalAmount || 0;
      if (s.paymentMethod === "efectivo") {
        expectedCash += s.totalAmount || 0;
      } else if (s.paymentMethod === "nequi_daviplata") {
        expectedDigital += s.totalAmount || 0;
      } else if (s.paymentMethod === "tarjeta") {
        expectedCard += s.totalAmount || 0;
      }
    }
  });

  const totalGross = totalCutsRevenue + totalProductsRevenue + totalTips;

  res.json({
    date: today,
    expectedCash,
    expectedDigital,
    expectedCard,
    totalCutsRevenue,
    totalProductsRevenue,
    totalTips,
    totalGross,
    completedCount: todayApps.length,
    salesCount: todaySales.length,
    closures: tenant.cashClosures || []
  });
});

app.post("/api/cash-register/close", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const {
    initialBase = 0,
    countedCash = 0,
    expectedCash = 0,
    expectedDigital = 0,
    expectedCard = 0,
    totalCutsRevenue = 0,
    totalProductsRevenue = 0,
    totalTips = 0,
    totalGross = 0,
    withdrawals = 0,
    notes = "",
    closedBy = "Administrador"
  } = req.body;

  const today = new Date().toISOString().split("T")[0];
  if (!tenant.cashClosures) tenant.cashClosures = [];

  const closure: DailyClosure = {
    id: "close_" + Date.now().toString(),
    date: today,
    closedAt: new Date().toISOString(),
    closedBy,
    initialBase: Number(initialBase),
    expectedCash: Number(expectedCash),
    countedCash: Number(countedCash),
    cashDifference: Number(countedCash) - Number(expectedCash),
    expectedDigital: Number(expectedDigital),
    expectedCard: Number(expectedCard),
    totalCutsRevenue: Number(totalCutsRevenue),
    totalProductsRevenue: Number(totalProductsRevenue),
    totalTips: Number(totalTips),
    totalGross: Number(totalGross),
    withdrawals: Number(withdrawals),
    notes,
    status: "closed"
  };

  tenant.cashClosures.unshift(closure);

  broadcastChange("cash_register_closed", { closure, closures: tenant.cashClosures }, tenantId);
  res.json({ success: true, closure });
});

// Setup Vite development or production serving
async function startServer() {
  // Preload local disk database immediately (synchronous & instant)
  loadFromLocalDisk();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Corriendo en puerto ${PORT} con persistencia activa.`);
  });

  // Sync with Firestore in background without blocking server bootstrap
  loadFromFirestore().catch((err) => {
    console.warn("[Firebase] Error durante sincronización en segundo plano de Firestore:", err?.message || err);
  });
}

startServer();
