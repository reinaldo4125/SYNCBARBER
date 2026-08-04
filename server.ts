import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, SalonConfig, Barber, MembershipPlan, ClientAccount, DailyClosure } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Normalizer middleware for Nginx reverse proxies that strip the /api prefix
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && req.path !== "/" && !req.path.includes(".")) {
    req.url = "/api" + req.url;
  }
  next();
});

// --- FIREBASE FIRESTORE PERSISTENCE SETUP ---
let db: any = null;
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    db = getFirestore(firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Inicializado con éxito. Base de datos ID:", firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn("[Firebase] No se encontró el archivo firebase-applet-config.json");
  }
} catch (error) {
  console.error("[Firebase] Error al inicializar firebase-admin:", error);
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
      accentColor: "gold",
      textColor: "#FFFFFF",
      backgroundColor: "#060A13",
      cardColor: "#0E1524",
      subCardColor: "#162237",
      borderColor: "#1F314D",
      tagline: "Arte, Precisión & Estilo Masculino",
      noShowPenaltyAmount: 10000,
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
    ]
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
function getTenantInventory(tenant: TenantData): any[] {
  if (!tenant.inventory || !Array.isArray(tenant.inventory) || tenant.inventory.length === 0) {
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

// Helper function to extract Tenant ID
function getTenantId(req: express.Request): string {
  const headerTenant = req.headers["x-tenant-id"] || req.headers["x-tenant-slug"];
  if (headerTenant && typeof headerTenant === "string") {
    return headerTenant;
  }
  const queryTenant = req.query.salonId || req.query.tenantId;
  if (queryTenant && typeof queryTenant === "string") {
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
  const { name, openTime, closeTime, workingDays, intervalMinutes, licenseType, activeLicenseKey, serviceCategories, customLogoUrl, accentColor, textColor, tagline, backgroundColor, cardColor, subCardColor, borderColor, noShowPenaltyAmount } = req.body;
  
  if (name) tenant.config.name = name;
  if (openTime) tenant.config.openTime = openTime;
  if (closeTime) tenant.config.closeTime = closeTime;
  if (workingDays) tenant.config.workingDays = workingDays;
  if (intervalMinutes) tenant.config.intervalMinutes = Number(intervalMinutes);
  if (licenseType) tenant.config.licenseType = licenseType;
  if (activeLicenseKey !== undefined) tenant.config.activeLicenseKey = activeLicenseKey;
  if (serviceCategories !== undefined) tenant.config.serviceCategories = serviceCategories;
  if (customLogoUrl !== undefined) tenant.config.customLogoUrl = customLogoUrl;
  if (accentColor !== undefined) tenant.config.accentColor = accentColor;
  if (textColor !== undefined) tenant.config.textColor = textColor;
  if (tagline !== undefined) tenant.config.tagline = tagline;
  if (backgroundColor !== undefined) tenant.config.backgroundColor = backgroundColor;
  if (cardColor !== undefined) tenant.config.cardColor = cardColor;
  if (subCardColor !== undefined) tenant.config.subCardColor = subCardColor;
  if (borderColor !== undefined) tenant.config.borderColor = borderColor;
  if (noShowPenaltyAmount !== undefined) tenant.config.noShowPenaltyAmount = Number(noShowPenaltyAmount);

  broadcastChange("config_update", tenant.config, tenantId);
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

  res.json({ success: true, config: tenant.config, services: tenant.services, barbers: tenant.barbers });
});

// --- Developer Tenants & Administrators System ---
let tenants: any[] = [
  { id: "bella-barba", name: "Barberia Demo", licenseType: "premium", activeLicenseKey: "LIC-PREM-V98X2-2026" }
];

let salonAdmins: any[] = [
  { id: "adm_default", name: "Administrador General", username: "admin", password: "admin", salonId: "bella-barba" }
];

app.get("/api/developer/tenants", (req, res) => {
  const tenantsWithConfig = tenants.map(t => {
    const tenant = tenantData[t.id] || tenantData["bella-barba"];
    return {
      ...t,
      config: tenant.config || null,
      barbers: tenant.barbers || [],
      services: tenant.services || [],
      memberships: getTenantMemberships(tenant)
    };
  });
  res.json({ tenants: tenantsWithConfig });
});

app.put("/api/developer/tenants/:id/license", (req, res) => {
  const { id } = req.params;
  const { licenseType } = req.body;
  
  if (!licenseType || !["basica", "profesional", "premium"].includes(licenseType)) {
    return res.status(400).json({ error: "Tipo de licencia no válido." });
  }

  const tenant = tenants.find(t => t.id === id);
  if (!tenant) {
    return res.status(404).json({ error: "Inquilino no encontrado." });
  }

  tenant.licenseType = licenseType;

  // Also update corresponding license key status/type if matches
  if (tenant.activeLicenseKey) {
    const lic = generatedLicenses.find(l => l.key === tenant.activeLicenseKey);
    if (lic) {
      lic.licenseType = licenseType;
    }
  }

  // Update in tenantData if exists
  if (tenantData[id]) {
    tenantData[id].config.licenseType = licenseType;
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

// --- FIREBASE SYNC HELPERS ---
async function saveTenantToFirestore(tenantId: string) {
  if (!db) return;
  try {
    const data = tenantData[tenantId];
    if (data) {
      await db.collection("salon_tenants").doc(tenantId).set(data);
      console.log(`[Firebase] Inquilino '${tenantId}' guardado con éxito.`);
    }
  } catch (err: any) {
    console.warn(`[Firebase] Nota: No se pudo sincronizar el inquilino '${tenantId}' en Firestore (${err?.message || 'Permisos restringidos'}). Datos en memoria activos.`);
  }
}

async function saveGlobalsToFirestore() {
  if (!db) return;
  try {
    await db.collection("salon_system").doc("globals").set({
      tenants,
      salonAdmins,
      generatedLicenses,
      helpdeskTickets
    });
    console.log("[Firebase] Variables globales guardadas con éxito.");
  } catch (err: any) {
    console.warn(`[Firebase] Nota: No se pudieron sincronizar las variables globales en Firestore (${err?.message || 'Permisos restringidos'}). Estado en memoria activo.`);
  }
}

async function loadFromFirestore() {
  if (!db) return;
  try {
    console.log("[Firebase] Cargando datos desde Firestore...");
    
    // 1. Load globals
    const globalsRef = db.collection("salon_system").doc("globals");
    const globalsSnap = await globalsRef.get();
    if (globalsSnap.exists) {
      const data = globalsSnap.data() || {};
      let needsGlobalsUpdate = false;

      // Load tenants, preserving all but ensuring bella-barba is present and has a fallback name
      if (data.tenants && Array.isArray(data.tenants)) {
        tenants = data.tenants;
        let hasBellaBarba = false;
        tenants = tenants.map((t: any) => {
          if (t && t.id === "bella-barba") {
            hasBellaBarba = true;
            if (!t.name) {
              needsGlobalsUpdate = true;
              return { ...t, name: "Barberia Demo" };
            }
          }
          return t;
        });

        if (!hasBellaBarba) {
          tenants.unshift({
            id: "bella-barba",
            name: "Barberia Demo",
            licenseType: "premium",
            activeLicenseKey: "LIC-PREM-V98X2-2026"
          });
          needsGlobalsUpdate = true;
        }
      } else {
        tenants = [{ id: "bella-barba", name: "Barberia Demo", licenseType: "premium", activeLicenseKey: "LIC-PREM-V98X2-2026" }];
        needsGlobalsUpdate = true;
      }

      // Load salon admins, preserving all but ensuring bella-barba admin is present
      if (data.salonAdmins && Array.isArray(data.salonAdmins)) {
        salonAdmins = data.salonAdmins;
        const hasBellaBarbaAdmin = salonAdmins.some((a: any) => a && a.salonId === "bella-barba" && a.username === "admin");
        if (!hasBellaBarbaAdmin) {
          salonAdmins.push({ id: "adm_default", name: "Administrador General", username: "admin", password: "admin", salonId: "bella-barba" });
          needsGlobalsUpdate = true;
        }
      } else {
        salonAdmins = [{ id: "adm_default", name: "Administrador General", username: "admin", password: "admin", salonId: "bella-barba" }];
        needsGlobalsUpdate = true;
      }

      // Load generated licenses, preserving all but ensuring demo key exists with fallback salonName
      if (data.generatedLicenses && Array.isArray(data.generatedLicenses)) {
        generatedLicenses = data.generatedLicenses;
        let hasDemoLicense = false;
        generatedLicenses = generatedLicenses.map((l: any) => {
          if (l && l.key === "LIC-PREM-V98X2-2026") {
            hasDemoLicense = true;
            if (!l.salonName) {
              needsGlobalsUpdate = true;
              return { ...l, salonName: "Barberia Demo" };
            }
          }
          return l;
        });

        if (!hasDemoLicense) {
          generatedLicenses.unshift({
            key: "LIC-PREM-V98X2-2026",
            salonName: "Barberia Demo",
            licenseType: "premium",
            createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
            activatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
            status: "active"
          });
          needsGlobalsUpdate = true;
        }
      } else {
        generatedLicenses = [{ key: "LIC-PREM-V98X2-2026", salonName: "Barberia Demo", licenseType: "premium", createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), activatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), status: "active" }];
        needsGlobalsUpdate = true;
      }

      // Clean/load helpdesk tickets, preserving all
      if (data.helpdeskTickets && Array.isArray(data.helpdeskTickets)) {
        helpdeskTickets = data.helpdeskTickets;
      } else {
        needsGlobalsUpdate = true;
      }

      if (needsGlobalsUpdate) {
        await globalsRef.set({
          tenants,
          salonAdmins,
          generatedLicenses,
          helpdeskTickets
        });
        console.log("[Firebase] Variables globales saneadas y actualizadas en Firestore.");
      } else {
        console.log("[Firebase] Variables globales cargadas sin necesidad de saneo.");
      }
    } else {
      // Seed initial globals if not exist
      await globalsRef.set({
        tenants,
        salonAdmins,
        generatedLicenses,
        helpdeskTickets
      });
      console.log("[Firebase] Variables globales inicializadas en Firestore.");
    }

    // 2. Load all tenants (without deleting other custom tenants!)
    const tenantsSnap = await db.collection("salon_tenants").get();
    if (!tenantsSnap.empty) {
      tenantsSnap.forEach((doc: any) => {
        const tId = doc.id;
        tenantData[tId] = doc.data();
      });

      // Ensure bella-barba is present
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
          reviews: []
        };
        await db.collection("salon_tenants").doc("bella-barba").set(tenantData["bella-barba"]);
        console.log("[Firebase] Barberia Demo re-inicializada en Firestore.");
      } else {
        // Ensure config exists
        if (!tenantData["bella-barba"].config) {
          tenantData["bella-barba"].config = {
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
          };
          await db.collection("salon_tenants").doc("bella-barba").set(tenantData["bella-barba"]);
          console.log("[Firebase] Config de Barberia Demo inicializada en Firestore.");
        }
      }
      console.log("[Firebase] Inquilinos cargados y saneados.");
    } else {
      // Seed default tenants if empty
      for (const tId of Object.keys(tenantData)) {
        await db.collection("salon_tenants").doc(tId).set(tenantData[tId]);
      }
      console.log("[Firebase] Inquilinos por defecto inicializados en Firestore.");
    }
  } catch (err: any) {
    console.warn("[Firebase] Nota: No se pudieron cargar datos desde Firestore:", err?.message || err);
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
    const licenseType = config.licenseType || "basica";
    
    let licenseCost = saasPricingPlans[licenseType as keyof typeof saasPricingPlans]?.price || saasPricingPlans.basica.price;
    
    // Count active licenses
    activeCount++;
    if (licenseType === "premium") licenseCounts.premium++;
    else if (licenseType === "profesional") licenseCounts.profesional++;
    else licenseCounts.basica++;

    salonMetrics.push({
      id: tId,
      name: config.name || tId,
      licenseType: licenseType,
      activeLicenseKey: config.activeLicenseKey || "N/A",
      licenseSubscriptionRevenue: licenseCost,
      status: "activo",
      activationDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toLocaleDateString() // Platform activation simulation
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

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = (licenseCounts.premium * saasPricingPlans.premium.price) + (licenseCounts.profesional * saasPricingPlans.profesional.price) + (licenseCounts.basica * saasPricingPlans.basica.price);
  const arpu = mrr / (tenantKeys.length || 1);

  // Growth Trend (MRR Progression)
  const growthTrend = [
    { period: "Abril", mrr: 120000, activeSalons: 1 },
    { period: "Mayo", mrr: 180000, activeSalons: 2 },
    { period: "Junio", mrr: 210000, activeSalons: 3 },
    { period: "Julio (Actual)", mrr: mrr, activeSalons: tenantKeys.length }
  ];

  res.json({
    summary: {
      totalRevenue: mrr, // SaaS MRR is the developer revenue
      licenseRevenue: mrr,
      activeLicensesCount: activeCount,
      pendingLicensesCount: pendingCount,
      expiredLicensesCount: expiredCount,
      totalLicensesCount: activeCount + pendingCount + expiredCount,
      mrr: mrr,
      arpu: arpu,
      activeSalonsCount: tenantKeys.length,
    },
    salonMetrics,
    licenseCounts,
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
    licenseType: "premium",
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

// Helper to initialize custom tenant data with default services and barbers
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
  } = {}
) => {
  const isDefaultTenant = ["bella-barba"].includes(id);

  const baseServices: Service[] = [
    { id: "s1", name: "Corte de Cabello Básico", price: 20000, duration: 30, category: "cabello" as const, description: "Corte tradicional con tijeras o máquina." },
    { id: "s2", name: "Perfilado & Ritual de Barba", price: 15000, duration: 30, category: "barba" as const, description: "Arreglo completo de barba con navaja y toalla caliente." },
    { id: "s3", name: "Combo Imperial (Corte + Barba)", price: 32000, duration: 50, category: "combos" as const, description: "Experiencia completa de corte y barba con hidratación facial." }
  ];

  const count = extraDetails.initialBarbersCount || 2;
  const baseBarbers: Barber[] = Array.from({ length: Math.min(Math.max(count, 1), 10) }, (_, i) => ({
    id: `b${i + 1}`,
    name: i === 0 ? (extraDetails.ownerName ? `${extraDetails.ownerName} (Máster)` : "Barbero Principal") : `Barbero ${i + 1}`,
    username: `barbero${i + 1}`,
    password: "123",
    isActive: true,
    specialties: ["cabello" as const, "barba" as const]
  }));

  const baseMemberships = [
    { id: "p1", name: "Club VIP Ilimitado", monthlyPrice: 80000, discountPercent: 20, description: "Cortes ilimitados al mes y beneficios exclusivos", benefits: ["Cortes de cabello ilimitados", "10% dto. en productos", "Atención prioritaria"] },
    { id: "p2", name: "Pase Estilizado", monthlyPrice: 50000, discountPercent: 10, description: "2 cortes al mes + perfilado de barba", benefits: ["2 Cortes al mes", "1 Perfilado de barba gratis"] }
  ];

  const accentColor = templateType === "urban" ? "cyan" : templateType === "traditional" ? "amber" : "gold";

  const actDate = activationDate || new Date().toISOString().split("T")[0];
  const expDate = expirationDate || calculateExpirationDate(actDate, 12);
  const email = extraDetails.ownerEmail || `contacto@${id}.com`;

  tenantData[id] = {
    config: {
      name: name,
      openTime: extraDetails.openTime || "08:00",
      closeTime: extraDetails.closeTime || "20:00",
      workingDays: [1, 2, 3, 4, 5, 6],
      intervalMinutes: 30,
      licenseType: licenseType as any,
      activeLicenseKey: licenseKey,
      activationDate: actDate,
      expirationDate: expDate,
      ownerName: extraDetails.ownerName,
      ownerEmail: email,
      phone: extraDetails.phone,
      whatsapp: extraDetails.phone,
      city: extraDetails.city,
      address: extraDetails.address,
      needsSetup: false,
      accentColor: accentColor,
      textColor: "#FFFFFF",
      backgroundColor: "#0B0C10",
      cardColor: "#141414",
      subCardColor: "#1A1A1A",
      borderColor: "#262626",
      tagline: extraDetails.tagline || "Arte, Precisión & Estilo Masculino",
    },
    services: isDefaultTenant && id === "bella-barba" && tenantData["bella-barba"] ? tenantData["bella-barba"].services : baseServices,
    barbers: isDefaultTenant && id === "bella-barba" && tenantData["bella-barba"] ? tenantData["bella-barba"].barbers : baseBarbers,
    memberships: baseMemberships,
    appointments: [],
    clients: [],
    reviews: []
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
    customExpirationDate
  } = req.body;

  if (!salonName || !licenseType) {
    return res.status(400).json({ error: "Nombre del salón y tipo de licencia requeridos." });
  }

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
    activeLicenseKey: key
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
    email
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

// Endpoint to manually edit expiration date or contact email
app.put("/api/licenses/update-dates", (req, res) => {
  const { key, expirationDate, ownerEmail } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Clave de licencia requerida." });
  }

  const lic = generatedLicenses.find(l => l.key.toUpperCase() === key.toUpperCase().trim());
  if (!lic) {
    return res.status(404).json({ error: "Licencia no encontrada." });
  }

  if (expirationDate) lic.expirationDate = expirationDate;
  if (ownerEmail) lic.ownerEmail = ownerEmail;

  // Sync to active tenant
  for (const tenantId of Object.keys(tenantData)) {
    const tenant = tenantData[tenantId];
    if (tenant.config.activeLicenseKey === key) {
      if (expirationDate) tenant.config.expirationDate = expirationDate;
      if (ownerEmail) tenant.config.ownerEmail = ownerEmail;
      saveTenantToFirestore(tenantId);
      broadcastChange("config_update", tenant.config, tenantId);
    }
  }

  saveGlobalsToFirestore();

  res.json({ message: "Fechas de licencia actualizadas correctamente", license: lic });
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
  const { licenses, tenantsDataImport } = req.body;
  try {
    if (Array.isArray(licenses)) {
      generatedLicenses = licenses;
    }
    if (tenantsDataImport && typeof tenantsDataImport === "object") {
      Object.assign(tenantData, tenantsDataImport);
    }
    saveGlobalsToFirestore();
    res.json({ message: "Copia de seguridad restaurada correctamente" });
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
    firestoreSyncStatus: db ? "CONNECTED_CLOUD_FIRESTORE" : "LOCAL_IN_MEMORY_ONLY",
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
  const { name, price, duration, category, description } = req.body;
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
  };

  tenant.services.push(newService);
  broadcastChange("services_update", tenant.services, tenantId);
  res.status(201).json(newService);
});

app.put("/api/services/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { name, price, duration, category, description } = req.body;
  
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
    return res.json({
      success: true,
      role: "admin",
      user: { id: "admin", name: "Administrador del Salón", username: "admin", salonId: "bella-barba" }
    });
  }

  // Check barbers across the appropriate tenant (or check all if not specified, but best to check the extracted tenant)
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const barber = tenant.barbers.find(b => b.username.toLowerCase() === username.toLowerCase() && b.password === password);
  if (barber) {
    if (!barber.isActive) {
      return res.status(403).json({ error: "Este usuario de barbero está inactivo" });
    }
    return res.json({
      success: true,
      role: "barber",
      barberId: barber.id,
      user: { id: barber.id, name: barber.name, username: barber.username, salonId: tenantId }
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

app.get("/api/clients", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.clients);
});

app.post("/api/clients/register", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, phone, email, password, membershipId, loyaltyPoints } = req.body;
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
    createdAt: new Date().toISOString(),
    loyaltyPoints: loyaltyPoints !== undefined ? Number(loyaltyPoints) : 1,
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
  
  // Find in current tenant first
  let client = tenant.clients.find(c => c.id === id);
  
  // If not found in current, look across all tenants
  if (!client) {
    for (const tId of Object.keys(tenantData)) {
      const otherClient = tenantData[tId].clients.find(c => c.id === id);
      if (otherClient) {
        client = otherClient;
        break;
      }
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
- Días desde su último corte: ${daysSinceLastCut} días (frecuencia habitual: cada ${avgCutCycleDays || 21} días)
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
  const { name, username, password, specialties } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const exists = tenant.barbers.some(b => b.username.toLowerCase() === username.toLowerCase()) || username.toLowerCase() === "admin";
  if (exists) {
    return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
  }

  const newBarber: Barber = {
    id: "b_" + Date.now().toString(),
    name,
    username,
    password,
    isActive: true,
    specialties: specialties || ["cabello"]
  };

  tenant.barbers.push(newBarber);
  broadcastChange("barbers_update", tenant.barbers, tenantId);
  res.status(201).json(newBarber);
});

app.put("/api/barbers/:id", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { id } = req.params;
  const { name, username, password, isActive, specialties, commissionPercent } = req.body;

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

  tenant.barbers[index] = {
    ...tenant.barbers[index],
    name: name || tenant.barbers[index].name,
    username: username || tenant.barbers[index].username,
    password: password || tenant.barbers[index].password,
    isActive: isActive !== undefined ? isActive : tenant.barbers[index].isActive,
    specialties: specialties || tenant.barbers[index].specialties,
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
  const { clientName, clientPhone, clientEmail, serviceId, date, time, notes, barberId } = req.body;

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
      pendingPenalty: 0,
      penaltyHistory: []
    };
    tenant.clients.push(clientMatch);
    broadcastChange("clients_list_update", tenant.clients, tenantId);
  }
  
  if (req.body.redeemReward && clientMatch && (clientMatch.loyaltyPoints || 0) >= 5) {
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
    status: "pending", 
    notes: appointmentNotes,
    barberId: assignedBarberId,
    barberName: assignedBarberName,
    createdAt: new Date().toISOString(),
    membershipId: appointmentMembershipId,
    membershipDiscountPercent: appointmentDiscountPercent,
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

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`[Server] Corriendo en puerto ${PORT}`);
    // Load initial data from Firebase Firestore asynchronously after server starts
    try {
      await loadFromFirestore();
    } catch (err) {
      console.error("[Firebase] Error en carga inicial asíncrona de Firestore:", err);
    }
  });
}

startServer();
