import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Appointment, Service, SalonConfig, Barber, MembershipPlan, ClientAccount } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data structures
interface TenantData {
  config: SalonConfig;
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  clients: ClientAccount[];
  reviews: any[];
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
      name: "SyncBarber Studio",
      openTime: "09:00",
      closeTime: "19:00",
      workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      intervalMinutes: 30,
      licenseType: "premium",
      activeLicenseKey: "LIC-PREM-V98X2-2026",
    },
    services: [
      {
        id: "s1",
        name: "Corte de Cabello Premium (Caballero)",
        price: 18000,
        duration: 30,
        category: "cabello",
        description: "Corte personalizado con lavado, peinado con cera o pomada, y masaje capilar rápido.",
      },
      {
        id: "s2",
        name: "Corte de Cabello Estilo (Dama)",
        price: 25000,
        duration: 60,
        category: "cabello",
        description: "Lavado hidratante, corte personalizado de puntas o cambio de estilo, y secado o planchado profesional.",
      },
      {
        id: "s3",
        name: "Perfilado de Barba & Toalla Caliente",
        price: 12000,
        duration: 30,
        category: "barba",
        description: "Diseño y afeitado de barra con navaja libre, toalla caliente aromática y bálsamos hidratantes.",
      },
      {
        id: "s4",
        name: "Tinte o Coloración Completa",
        price: 45000,
        duration: 120,
        category: "color",
        description: "Aplicación de tinte profesional libre de amoníaco, lavado protector de color y peinado simple.",
      },
      {
        id: "s5",
        name: "Tratamiento de Hidratación Profunda",
        price: 30000,
        duration: 45,
        category: "tratamiento",
        description: "Lavado purificante, aplicación de mascarilla ultra-hidratante con vaporizador de ozono y sellado térmico.",
      },
    ],
    barbers: [
      { id: "b1", name: "Carlos Barber", username: "carlos", password: "123", isActive: true, specialties: ["cabello", "barba"] },
      { id: "b2", name: "Mateo Estilos", username: "mateo", password: "123", isActive: true, specialties: ["cabello", "color"] },
      { id: "b3", name: "Andrés Cortes", username: "andres", password: "123", isActive: true, specialties: ["cabello", "tratamiento"] },
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
        loyaltyPoints: 3
      },
      {
        id: "c_2",
        name: "Sofía Martínez",
        phone: "+57 312 999 8888",
        email: "sofia@example.com",
        password: "123",
        createdAt: new Date().toISOString(),
        loyaltyPoints: 1
      }
    ],
    reviews: [
      {
        id: "r1",
        clientName: "Juan David Castro",
        barberId: "b1",
        rating: 5,
        comment: "Excelente atención de Carlos, muy detallista con la barba. Recomiendo la toalla caliente.",
        date: "2026-07-06"
      },
      {
        id: "r2",
        clientName: "Sofía Martínez",
        barberId: "b2",
        rating: 5,
        comment: "Mateo es un profesional del color, me encantó el tinte chocolate que me aplicó. Volveré sin duda.",
        date: "2026-07-05"
      },
      {
        id: "r3",
        clientName: "Carlos Gómez",
        barberId: "b1",
        rating: 4,
        comment: "Muy buen corte fade, el ambiente de la peluquería es súper agradable y de lujo.",
        date: "2026-07-07"
      }
    ],
    appointments: [
      {
        id: "a1",
        clientName: "Carlos Gómez",
        clientPhone: "+57 312 456 7890",
        clientEmail: "carlos@example.com",
        serviceId: "s1",
        serviceName: "Corte de Cabello Premium (Caballero)",
        price: 18000,
        date: "2026-07-08",
        time: "09:30",
        duration: 30,
        status: "completed",
        notes: "Prefiere corte con tijera arriba y fade medio a los lados.",
        hairdresserNotes: "Cliente muy satisfecho. Se aplicó pomada mate.",
        barberId: "b1",
        barberName: "Carlos Barber",
        createdAt: "2026-07-07T14:20:00.000Z",
      },
      {
        id: "a2",
        clientName: "María Camila Restrepo",
        clientPhone: "+57 315 987 6543",
        clientEmail: "mariac@example.com",
        serviceId: "s2",
        serviceName: "Corte de Cabello Estilo (Dama)",
        price: 25000,
        date: "2026-07-08",
        time: "10:30",
        duration: 60,
        status: "confirmed",
        notes: "Solo despuntar y perfilar el flequillo. Cabello ondulado.",
        barberId: "b2",
        barberName: "Mateo Estilos",
        createdAt: "2026-07-07T16:45:00.000Z",
      },
      {
        id: "a3",
        clientName: "Juan David Castro",
        clientPhone: "+57 300 111 2233",
        clientEmail: "juand@example.com",
        serviceId: "s3",
        serviceName: "Perfilado de Barba & Toalla Caliente",
        price: 12000,
        date: "2026-07-08",
        time: "12:00",
        duration: 30,
        status: "pending",
        notes: "Tiene la piel un poco sensible.",
        barberId: "b1",
        barberName: "Carlos Barber",
        createdAt: "2026-07-08T07:15:00.000Z",
      },
      {
        id: "a4",
        clientName: "Valeria Mendoza",
        clientPhone: "+57 310 888 9900",
        serviceId: "s4",
        serviceName: "Tinte o Coloración Completa",
        price: 45000,
        date: "2026-07-08",
        time: "14:30",
        duration: 120,
        status: "confirmed",
        notes: "Quiere un tono chocolate. Trae su propia foto de referencia.",
        barberId: "b2",
        barberName: "Mateo Estilos",
        createdAt: "2026-07-06T10:00:00.000Z",
      },
      {
        id: "a5",
        clientName: "Andrés Felipe",
        clientPhone: "+57 318 777 6655",
        serviceId: "s1",
        serviceName: "Corte de Cabello Premium (Caballero)",
        price: 18000,
        date: "2026-07-08",
        time: "17:00",
        duration: 30,
        status: "pending",
        notes: "Corte clásico de oficina.",
        barberId: "b1",
        barberName: "Carlos Barber",
        createdAt: "2026-07-08T08:00:00.000Z",
      },
      {
        id: "a6",
        clientName: "Santiago Pérez",
        clientPhone: "+57 321 333 4444",
        serviceId: "s1",
        serviceName: "Corte de Cabello Premium (Caballero)",
        price: 18000,
        date: "2026-07-09",
        time: "10:00",
        duration: 30,
        status: "confirmed",
        barberId: "b3",
        barberName: "Andrés Cortes",
        createdAt: "2026-07-07T11:30:00.000Z",
      },
      {
        id: "a7",
        clientName: "Diana Carolina",
        clientPhone: "+57 314 555 6666",
        serviceId: "s5",
        serviceName: "Tratamiento de Hidratación Profunda",
        price: 30000,
        date: "2026-07-09",
        time: "11:00",
        duration: 45,
        status: "confirmed",
        notes: "Cabello muy reseco por decoloración anterior.",
        barberId: "b3",
        barberName: "Andrés Cortes",
        createdAt: "2026-07-07T15:20:00.000Z",
      },
    ]
  },
  "el-figaro": {
    config: {
      name: "Peluquería El Fígaro",
      openTime: "08:30",
      closeTime: "20:00",
      workingDays: [1, 2, 3, 4, 5, 6, 0],
      intervalMinutes: 45,
      licenseType: "profesional",
      activeLicenseKey: "LIC-PROF-A74B1-2026",
    },
    services: [
      {
        id: "s_fig_1",
        name: "Corte Italiano con Navaja",
        price: 22000,
        duration: 45,
        category: "cabello",
        description: "Corte clásico italiano con terminados finos a navaja."
      },
      {
        id: "s_fig_2",
        name: "Afeitado Clásico Completo",
        price: 15000,
        duration: 30,
        category: "barba",
        description: "Tratamiento completo de afeitado con aceites pre-shave."
      }
    ],
    barbers: [
      { id: "eb1", name: "Enzo Rossi", username: "enzo", password: "123", isActive: true, specialties: ["cabello", "barba"] },
      { id: "eb2", name: "Giovanni Di Barber", username: "giovanni", password: "123", isActive: true, specialties: ["cabello"] }
    ],
    clients: [],
    reviews: [],
    appointments: [
      {
        id: "da1",
        clientName: "Roberto Gómez",
        clientPhone: "+57 322 111 2222",
        clientEmail: "roberto@example.com",
        serviceId: "s_fig_2",
        serviceName: "Afeitado Tradicional",
        price: 15000,
        date: "2026-07-08",
        time: "10:30",
        duration: 30,
        status: "confirmed",
        notes: "Barba poblada.",
        barberId: "eb1",
        barberName: "Enzo Rossi",
        createdAt: new Date().toISOString()
      },
      {
        id: "da2",
        clientName: "Lucía Fernández",
        clientPhone: "+57 322 333 4444",
        clientEmail: "lucia@example.com",
        serviceId: "s_fig_1",
        serviceName: "Corte Bob",
        price: 30000,
        date: "2026-07-08",
        time: "14:00",
        duration: 45,
        status: "confirmed",
        notes: "Cabello liso.",
        barberId: "eb2",
        barberName: "Giovanni Di Barber",
        createdAt: new Date().toISOString()
      }
    ]
  },
  "estilo-tijera": {
    config: {
      name: "Estilo & Tijera",
      openTime: "10:00",
      closeTime: "18:00",
      workingDays: [2, 3, 4, 5, 6],
      intervalMinutes: 30,
      licenseType: "basica",
      activeLicenseKey: "LIC-BASIC-K32P9-2026",
    },
    services: [
      {
        id: "s_tij_1",
        name: "Corte Clásico Tijera",
        price: 12000,
        duration: 30,
        category: "cabello",
        description: "Corte realizado 100% con tijeras para un acabado natural."
      }
    ],
    barbers: [
      { id: "et1", name: "Elena Tijera", username: "elena", password: "123", isActive: true, specialties: ["cabello"] }
    ],
    clients: [],
    reviews: [],
    appointments: [
      {
        id: "da3",
        clientName: "Mateo López",
        clientPhone: "+57 312 000 9999",
        clientEmail: "mateo@example.com",
        serviceId: "s_tij_1",
        serviceName: "Corte Clásico",
        price: 12000,
        date: "2026-07-08",
        time: "11:30",
        duration: 30,
        status: "pending",
        notes: "Corte sutil.",
        barberId: "et1",
        barberName: "Elena Tijera",
        createdAt: new Date().toISOString()
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

// 2. Salon Config Routes
app.get("/api/config", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json(tenant.config);
});

app.put("/api/config", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  const { name, openTime, closeTime, workingDays, intervalMinutes, licenseType, activeLicenseKey } = req.body;
  
  if (name) tenant.config.name = name;
  if (openTime) tenant.config.openTime = openTime;
  if (closeTime) tenant.config.closeTime = closeTime;
  if (workingDays) tenant.config.workingDays = workingDays;
  if (intervalMinutes) tenant.config.intervalMinutes = Number(intervalMinutes);
  if (licenseType) tenant.config.licenseType = licenseType;
  if (activeLicenseKey !== undefined) tenant.config.activeLicenseKey = activeLicenseKey;

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
  { id: "bella-barba", name: "SyncBarber Studio", licenseType: "premium", activeLicenseKey: "LIC-PREM-V98X2-2026" },
  { id: "el-figaro", name: "Peluquería El Fígaro", licenseType: "profesional", activeLicenseKey: "LIC-PROF-A74B1-2026" },
  { id: "estilo-tijera", name: "Estilo & Tijera", licenseType: "basica", activeLicenseKey: "LIC-BASIC-K32P9-2026" }
];

let salonAdmins: any[] = [
  { id: "adm_default", name: "Administrador General", username: "admin", password: "admin", salonId: "bella-barba" },
  { id: "adm_figaro", name: "Administrador Fígaro", username: "figaro_admin", password: "123", salonId: "el-figaro" },
  { id: "adm_tijera", name: "Administrador Tijera", username: "tijera_admin", password: "123", salonId: "estilo-tijera" },
];

app.get("/api/developer/tenants", (req, res) => {
  res.json({ tenants });
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

  res.json({ message: "Licencia de inquilino actualizada con éxito", tenant, currentConfig: tenantData[id]?.config });
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

// --- Developer Licenses System ---
let generatedLicenses: any[] = [
  { key: "LIC-PREM-V98X2-2026", salonName: "Bella & Barba Studio", licenseType: "premium", createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), activatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), status: "active" },
  { key: "LIC-PROF-A74B1-2026", salonName: "Peluquería El Fígaro", licenseType: "profesional", createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), activatedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), status: "active" },
  { key: "LIC-BASIC-K32P9-2026", salonName: "Estilo & Tijera", licenseType: "basica", createdAt: new Date().toISOString(), status: "pending" },
];

app.get("/api/licenses", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
  res.json({ licenses: generatedLicenses, currentConfig: tenant.config });
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
const createTenant = (id: string, name: string, licenseType: string, licenseKey: string) => {
  const isDefaultTenant = ["bella-barba", "el-figaro", "estilo-tijera"].includes(id);

  const baseServices: Service[] = [
    { id: "s1", name: "Corte de Cabello Básico", price: 15000, duration: 30, category: "cabello" as const, description: "Corte tradicional." },
    { id: "s2", name: "Perfilado de Barba", price: 10000, duration: 30, category: "barba" as const, description: "Arreglo completo de barba con navaja y toalla caliente." }
  ];

  const baseBarbers: Barber[] = [
    { id: "b1", name: "Barbero Principal", username: "barbero1", password: "123", isActive: true, specialties: ["cabello" as const, "barba" as const] }
  ];

  tenantData[id] = {
    config: {
      name: name,
      openTime: "09:00",
      closeTime: "19:00",
      workingDays: [1, 2, 3, 4, 5, 6],
      intervalMinutes: 30,
      licenseType: licenseType as any,
      activeLicenseKey: licenseKey,
      needsSetup: !isDefaultTenant, // mark newly created tenant for setup
    },
    services: isDefaultTenant && id === "bella-barba" && tenantData["bella-barba"] ? tenantData["bella-barba"].services : baseServices,
    barbers: isDefaultTenant && id === "bella-barba" && tenantData["bella-barba"] ? tenantData["bella-barba"].barbers : baseBarbers,
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
        name: `Admin ${name}`,
        username: adminUsername,
        password: "admin", // simple default password
        salonId: id
      });
    }
  }
};

app.post("/api/licenses/generate", (req, res) => {
  const { salonName, licenseType } = req.body;
  if (!salonName || !licenseType) {
    return res.status(400).json({ error: "Nombre del salón y tipo de licencia requeridos." });
  }

  // Generate a high-fidelity cryptographic-style key
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseTypePrefix = licenseType === "premium" ? "PREM" : licenseType === "profesional" ? "PROF" : "BSIC";
  const key = `LIC-${licenseTypePrefix}-${randStr}${randNum}-2026`;

  const newLicense = {
    key,
    salonName,
    licenseType,
    createdAt: new Date().toISOString(),
    status: "pending",
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
  createTenant(newTenantId, salonName, licenseType, key);

  generatedLicenses.push(newLicense);
  res.status(201).json({ message: "Licencia generada con éxito", license: newLicense, tenantId: newTenantId });
});

app.post("/api/licenses/activate", (req, res) => {
  const tenantId = getTenantId(req);
  const tenant = tenantData[tenantId] || tenantData["bella-barba"];
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
  
  // Apply changes to tenant config
  tenant.config.licenseType = lic.licenseType;
  tenant.config.activeLicenseKey = lic.key;
  if (lic.salonName) {
    tenant.config.name = lic.salonName;
  }

  // Update in tenants developer list
  const devTenant = tenants.find(t => t.id === tenantId);
  if (devTenant) {
    devTenant.licenseType = lic.licenseType;
    devTenant.activeLicenseKey = lic.key;
    if (lic.salonName) {
      devTenant.name = lic.salonName;
    }
  }

  broadcastChange("config_update", tenant.config, tenantId);
  res.json({ message: "¡Licencia activada con éxito!", config: tenant.config, license: lic });
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

// 3. Services Routes
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
  res.json(memberships);
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
    const plan = memberships.find(m => m.id === membershipId);
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
  const client = tenant.clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }
  res.json({ success: true, client });
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

  const index = tenant.clients.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }

  const client = tenant.clients[index];

  if (name !== undefined) client.name = name;
  if (phone !== undefined) client.phone = phone;
  if (email !== undefined) client.email = email;
  if (password !== undefined) client.password = password;
  if (loyaltyPoints !== undefined) client.loyaltyPoints = Number(loyaltyPoints);

  if (membershipId !== undefined) {
    if (membershipId === null || membershipId === "" || membershipId === undefined) {
      client.membershipId = undefined;
      client.membershipActive = false;
    } else {
      const plan = memberships.find(m => m.id === membershipId);
      if (!plan) {
        return res.status(400).json({ error: "Plan de membresía no válido" });
      }
      client.membershipId = membershipId;
      client.membershipActive = true;
    }
  }

  broadcastChange("client_updated", client, tenantId);
  broadcastChange("clients_list_update", tenant.clients, tenantId);

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
    blockedDates: req.body.blockedDates !== undefined ? req.body.blockedDates : tenant.barbers[index].blockedDates
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

  const clientMatch = tenant.clients.find(
    c => phonesMatch(c.phone, clientPhone) || 
         (clientEmail && c.email && c.email.toLowerCase() === clientEmail.toLowerCase())
  );
  
  if (req.body.redeemReward && clientMatch && (clientMatch.loyaltyPoints || 0) >= 5) {
    calculatedPrice = 0;
    clientMatch.loyaltyPoints = (clientMatch.loyaltyPoints || 0) - 5;
    setTimeout(() => {
      broadcastChange("client_updated", clientMatch, tenantId);
    }, 100);
  } else if (clientMatch && clientMatch.membershipActive && clientMatch.membershipId) {
    const plan = memberships.find(m => m.id === clientMatch.membershipId);
    if (plan) {
      calculatedPrice = Math.round(selectedService.price * (1 - plan.discountPercent / 100));
      appointmentMembershipId = clientMatch.membershipId;
      appointmentDiscountPercent = plan.discountPercent;
    }
  }

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
    notes: notes || "",
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
  const { status, date, time, hairdresserNotes, notes, clientName, clientPhone, clientEmail, serviceId, barberId, tip } = req.body;

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

  let finalPrice = appToUpdate.price;
  let appointmentMembershipId = appToUpdate.membershipId;
  let appointmentDiscountPercent = appToUpdate.membershipDiscountPercent;

  if (serviceId !== undefined) {
    finalPrice = (currentService as any).price;
    const phoneToCheck = clientPhone !== undefined ? clientPhone : appToUpdate.clientPhone;
    const emailToCheck = clientEmail !== undefined ? clientEmail : appToUpdate.clientEmail;
    
    const clientMatch = tenant.clients.find(
      c => phonesMatch(c.phone, phoneToCheck) || 
           (emailToCheck && c.email && c.email.toLowerCase() === emailToCheck.toLowerCase())
    );
    if (clientMatch && clientMatch.membershipActive && clientMatch.membershipId) {
      const plan = memberships.find(m => m.id === clientMatch.membershipId);
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
    tip: tip !== undefined ? Number(tip) : appToUpdate.tip
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Corriendo en puerto ${PORT}`);
  });
}

startServer();
