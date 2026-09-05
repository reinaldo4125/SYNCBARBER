import React, { useState } from "react";
import { ClientAccount, Appointment, MembershipPlan } from "../types";
import { calculateClientRetention, calculateSalonRetentionMetrics } from "../utils/retentionUtils";
import ClientVisualCard from "./ClientVisualCard";
import RetentionEngineModal from "./RetentionEngineModal";
import { 
  Users, 
  Search, 
  Award, 
  History, 
  Plus, 
  Minus, 
  Sparkles, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Scissors,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Gift,
  UserPlus,
  X,
  Zap,
  Camera,
  AlertTriangle,
  TrendingDown,
  Send,
  Filter,
  Edit
} from "lucide-react";

interface ClientManagerProps {
  clients: ClientAccount[];
  appointments: Appointment[];
  memberships: MembershipPlan[];
  onUpdateClient: (id: string, updates: Partial<ClientAccount>) => Promise<any>;
  onCreateClient?: (clientData: any) => Promise<any>;
  formatPrice: (price: number) => string;
}

export default function ClientManager({
  clients,
  appointments,
  memberships,
  onUpdateClient,
  onCreateClient,
  formatPrice,
}: ClientManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Navigation tab: 'all' or 'retention'
  const [activeMainTab, setActiveMainTab] = useState<'all' | 'retention'>('all');

  // Retention filter inside retention tab: 'all' | 'at_risk' | 'due_soon' | 'ok'
  const [retentionFilter, setRetentionFilter] = useState<'all' | 'at_risk' | 'due_soon' | 'ok'>('all');

  // Modal for AI Re-Cut Engine
  const [retentionModalClient, setRetentionModalClient] = useState<ClientAccount | null>(null);

  // Edit states for individual clients
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editBirthDate, setEditBirthDate] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [editMembershipId, setEditMembershipId] = useState<string>("");
  const [editLoyaltyPoints, setEditLoyaltyPoints] = useState<number>(0);
  const [editLoading, setEditLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create client states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newMembershipId, setNewMembershipId] = useState("");
  const [newLoyaltyPoints, setNewLoyaltyPoints] = useState<number>(1);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [formError, setFormError] = useState("");

  const retentionMetrics = calculateSalonRetentionMetrics(clients, appointments);

  const handleOpenCreateForm = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randomPass);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewBirthDate("");
    setNewMembershipId("");
    setNewLoyaltyPoints(1);
    setFormError("");
    setShowCreateForm(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmittingCreate(true);

    if (!newName || !newPhone || !newEmail || !newPassword) {
      setFormError("Por favor, completa todos los campos obligatorios (*).");
      setIsSubmittingCreate(false);
      return;
    }

    try {
      if (onCreateClient) {
        await onCreateClient({
          name: newName,
          phone: newPhone,
          email: newEmail,
          birthDate: newBirthDate || undefined,
          password: newPassword,
          membershipId: newMembershipId || undefined,
          loyaltyPoints: newLoyaltyPoints,
        });
        setSuccessMsg(`¡Cliente ${newName} registrado con éxito!`);
        setNewName("");
        setNewPhone("");
        setNewEmail("");
        setNewPassword("");
        setNewMembershipId("");
        setNewLoyaltyPoints(1);
        setShowCreateForm(false);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setFormError(err.message || "Error al registrar el cliente.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleStartEdit = (client: ClientAccount) => {
    setEditingClientId(client.id);
    setEditName(client.name || "");
    setEditPhone(client.phone || "");
    setEditEmail(client.email || "");
    setEditBirthDate(client.birthDate || "");
    setEditPassword(client.password || "");
    setEditMembershipId(client.membershipId || "");
    setEditLoyaltyPoints(client.loyaltyPoints || 0);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSaveEdit = async (client: ClientAccount) => {
    if (!editName || !editPhone) {
      setErrorMsg("El nombre y teléfono del cliente son obligatorios.");
      return;
    }
    setEditLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const selectedPlan = editMembershipId ? editMembershipId : null;
      const isActive = Boolean(selectedPlan);
      await onUpdateClient(client.id, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        birthDate: editBirthDate || undefined,
        password: editPassword.trim() ? editPassword.trim() : undefined,
        membershipId: selectedPlan as any,
        membershipActive: isActive,
        loyaltyPoints: editLoyaltyPoints,
      });
      setSuccessMsg(`¡Información del cliente "${editName}" guardada con éxito!`);
      setEditingClientId(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar el cliente.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleGrantCourtesyStamp = async (client: ClientAccount) => {
    try {
      const currentPoints = client.loyaltyPoints || 0;
      await onUpdateClient(client.id, {
        loyaltyPoints: currentPoints + 1,
      });
      setSuccessMsg(`¡Se otorgó 1 sello de cortesía a ${client.name}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al otorgar cortesía.");
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      c.name.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    if (activeMainTab === 'retention' && retentionFilter !== 'all') {
      const ret = calculateClientRetention(c, appointments);
      return ret.status === retentionFilter;
    }

    return true;
  });

  // Calculate stats
  const totalClients = clients.length;
  const bronzeCount = clients.filter(c => c.membershipActive && c.membershipId === "bronze").length;
  const silverCount = clients.filter(c => c.membershipActive && c.membershipId === "silver").length;
  const goldCount = clients.filter(c => c.membershipActive && c.membershipId === "gold").length;
  const activeMembershipsCount = bronzeCount + silverCount + goldCount;

  // Get client's appointments history helper
  const getClientAppointments = (client: ClientAccount) => {
    return appointments.filter(app => {
      const phoneMatch = app.clientPhone.replace(/\s+/g, '') === client.phone.replace(/\s+/g, '');
      const emailMatch = client.email && app.clientEmail && app.clientEmail.toLowerCase() === client.email.toLowerCase();
      return phoneMatch || emailMatch;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  };

  const getMembershipBadgeClass = (planId?: string) => {
    switch (planId) {
      case "gold":
        return "bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold";
      case "silver":
        return "bg-slate-300/10 border border-slate-300/30 text-slate-300 font-bold";
      case "bronze":
        return "bg-orange-700/10 border border-orange-700/30 text-orange-400 font-semibold";
      default:
        if (planId) return "bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold";
        return "bg-neutral-800 text-neutral-400 border border-neutral-700 text-xs";
    }
  };

  const getMembershipLabel = (planId?: string) => {
    switch (planId) {
      case "gold": return "VIP ORO";
      case "silver": return "PLATA";
      case "bronze": return "BRONCE";
      default:
        if (planId) {
          const matched = memberships.find(m => m.id === planId);
          return matched ? matched.name.toUpperCase() : planId.toUpperCase();
        }
        return "Ninguna";
    }
  };

  return (
    <div className="space-y-6" id="client-membership-manager">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-elegant-gold" />
            Gestión Inteligente de Clientes & Retención
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Administra la cartera de clientes, activa el motor de re-corte con IA y consulta las fichas técnicas con galería visual de fotos.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreateForm}
            className="w-full sm:w-auto px-4 py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Pestañas Principales: Cartera General vs Inteligencia de Retención */}
      <div className="flex border-b border-elegant-border/60 gap-3">
        <button
          onClick={() => setActiveMainTab('all')}
          className={`pb-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'all'
              ? "border-elegant-gold text-white"
              : "border-transparent text-elegant-text-muted hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Todos los Clientes ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('retention')}
          className={`pb-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'retention'
              ? "border-elegant-gold text-white"
              : "border-transparent text-elegant-text-muted hover:text-white"
          }`}
        >
          <Zap className="h-4 w-4 text-elegant-gold" />
          <span>Motor de Re-Corte & Retención IA</span>
          {retentionMetrics.atRiskCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
              {retentionMetrics.atRiskCount} en riesgo
            </span>
          )}
        </button>
      </div>

      {/* Formulario de Registro de Nuevo Cliente */}
      {showCreateForm && (
        <form onSubmit={handleCreateSubmit} className="bg-elegant-gold/10 border border-elegant-gold/20 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-elegant-border/30 pb-2">
            <h3 className="text-xs font-extrabold text-elegant-gold flex items-center gap-1.5 uppercase tracking-wider">
              <UserPlus className="h-4 w-4 text-elegant-gold" />
              Crear Nuevo Cliente en el Salón
            </h3>
            <button 
              type="button" 
              onClick={() => setShowCreateForm(false)}
              className="text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl">{formError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Nombre Completo *</label>
              <input 
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Carlos Ortiz"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Teléfono Celular *</label>
              <input 
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ej. +57 300 123 4567"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Correo Electrónico *</label>
              <input 
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Ej. carlos@correo.com"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                <span>🎂 Fecha de Nacimiento</span>
              </label>
              <input 
                type="date"
                value={newBirthDate}
                onChange={(e) => setNewBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-amber-500/40 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Contraseña de Acceso *</label>
              <input 
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Contraseña del cliente"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Membresía Inicial (Opcional)</label>
              <select
                value={newMembershipId}
                onChange={(e) => setNewMembershipId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
              >
                <option value="" className="bg-elegant-card text-white">Ninguna</option>
                {memberships.map((m) => (
                  <option key={m.id} value={m.id} className="bg-elegant-card text-white">{m.name} ({m.discountPercent}% descuento)</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Sellos de Fidelidad Iniciales</label>
              <input 
                type="number"
                min="0"
                value={newLoyaltyPoints}
                onChange={(e) => setNewLoyaltyPoints(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-elegant-border/10">
            <button 
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-elegant-border bg-elegant-sub hover:bg-elegant-card text-elegant-text rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmittingCreate}
              className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingCreate ? "Guardando..." : "Registrar Cliente"}
            </button>
          </div>
        </form>
      )}

      {/* METRICAS DE RETENCIÓN IA Y SALÓN */}
      {activeMainTab === 'retention' ? (
        <div className="space-y-5 animate-fadeIn">
          {/* Banner de Inteligencia */}
          <div className="bg-gradient-to-r from-elegant-card via-elegant-sub to-elegant-card border border-elegant-gold/30 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-elegant-gold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inteligencia Predicitiva de Retención
                </span>
                <h3 className="text-lg font-bold text-white">Análisis del Ciclo de Re-Corte de Barbería</h3>
                <p className="text-xs text-elegant-text-muted max-w-2xl">
                  Calcula la frecuencia promedio de corte de cada cliente para predecir cuándo deben retocar su estilo. Envía recordatorios automáticos por WhatsApp generados por IA antes de que se vayan con la competencia.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-black/40 border border-elegant-border px-4 py-3 rounded-2xl shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-elegant-text-muted uppercase block">Tasa de Retención Activa</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">{retentionMetrics.retentionRate}%</span>
                </div>
              </div>
            </div>

            {/* Grid de Métricas de Retención */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-elegant-sub/60 border border-rose-800/40 p-3 rounded-2xl space-y-0.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Clientes en Riesgo</span>
                <span className="text-lg font-extrabold text-rose-400 font-mono">{retentionMetrics.atRiskCount}</span>
                <span className="text-[9px] text-neutral-400 block">Excedieron su ciclo por &gt; 5 días</span>
              </div>

              <div className="bg-elegant-sub/60 border border-amber-800/40 p-3 rounded-2xl space-y-0.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Próximos Re-Cortes</span>
                <span className="text-lg font-extrabold text-amber-400 font-mono">{retentionMetrics.dueSoonCount}</span>
                <span className="text-[9px] text-neutral-400 block">En ventana de agendamiento</span>
              </div>

              <div className="bg-elegant-sub/60 border border-emerald-800/40 p-3 rounded-2xl space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Clientes Al Día</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">{retentionMetrics.okCount}</span>
                <span className="text-[9px] text-neutral-400 block">Atendidos recientemente</span>
              </div>

              <div className="bg-elegant-sub/60 border border-elegant-border p-3 rounded-2xl space-y-0.5">
                <span className="text-[10px] font-bold text-elegant-gold uppercase tracking-wider block">Ingreso en Riesgo Est.</span>
                <span className="text-lg font-extrabold text-white font-mono">{formatPrice(retentionMetrics.estimatedRevenueAtRisk)}</span>
                <span className="text-[9px] text-neutral-400 block">Recuperable con motor IA</span>
              </div>
            </div>
          </div>

          {/* Filtros de Retención */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-elegant-card border border-elegant-border p-3 rounded-2xl">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-elegant-gold" />
              Filtrar Cartera por Estado:
            </span>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setRetentionFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  retentionFilter === 'all'
                    ? "bg-elegant-gold text-elegant-bg"
                    : "bg-elegant-sub text-neutral-400 hover:text-white"
                }`}
              >
                Todos ({clients.length})
              </button>

              <button
                onClick={() => setRetentionFilter('at_risk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  retentionFilter === 'at_risk'
                    ? "bg-rose-950 border border-rose-800 text-rose-300"
                    : "bg-elegant-sub text-rose-400/70 hover:text-rose-400"
                }`}
              >
                🔴 En Riesgo ({retentionMetrics.atRiskCount})
              </button>

              <button
                onClick={() => setRetentionFilter('due_soon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  retentionFilter === 'due_soon'
                    ? "bg-amber-950 border border-amber-800 text-amber-300"
                    : "bg-elegant-sub text-amber-400/70 hover:text-amber-400"
                }`}
              >
                🟡 Próximos ({retentionMetrics.dueSoonCount})
              </button>

              <button
                onClick={() => setRetentionFilter('ok')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  retentionFilter === 'ok'
                    ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    : "bg-elegant-sub text-emerald-400/70 hover:text-emerald-400"
                }`}
              >
                🟢 Al Día ({retentionMetrics.okCount})
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tarjetas de Métricas Rápidas de Cartera */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-border p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">Total Clientes</span>
            <span className="text-xl font-bold text-white font-sans block mt-1">{totalClients}</span>
          </div>
          <div className="bg-elegant-card border border-elegant-border p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">Con Suscripción</span>
            <span className="text-xl font-bold text-elegant-gold font-sans block mt-1">{activeMembershipsCount}</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Miembros VIP Oro</span>
            <span className="text-xl font-bold text-amber-400 font-sans block mt-1">{goldCount}</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Miembros Plata</span>
            <span className="text-xl font-bold text-slate-300 font-sans block mt-1">{silverCount}</span>
          </div>
          <div className="bg-orange-950/20 border border-orange-800/20 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">Miembros Bronce</span>
            <span className="text-xl font-bold text-orange-400 font-sans block mt-1">{bronzeCount}</span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Buscador de Clientes */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 bg-elegant-sub border border-elegant-border px-3.5 py-2.5 rounded-2xl focus-within:border-elegant-gold transition-colors">
          <Search className="h-4 w-4 text-elegant-text-muted" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, celular o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-white placeholder-neutral-500 text-xs w-full focus:outline-none"
          />
        </div>

        {/* Lista de Clientes */}
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
            <Users className="h-8 w-8 mx-auto stroke-1" />
            <p className="text-sm">No se encontraron clientes con el filtro o término de búsqueda indicado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => {
              const isExpanded = expandedClientId === client.id;
              const isEditing = editingClientId === client.id;
              const clientApps = getClientAppointments(client);
              const completedVisits = clientApps.filter(a => a.status === "completed");
              const retention = calculateClientRetention(client, appointments);

              return (
                <div 
                  key={client.id}
                  className={`border rounded-2xl p-4 md:p-5 transition-all bg-elegant-sub/30 border-elegant-border ${
                    isExpanded ? "ring-1 ring-elegant-gold/30" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Info Básica */}
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-elegant-sub border border-elegant-border flex items-center justify-center text-white shrink-0 relative">
                        <span className="text-sm font-bold font-sans">
                          {client.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                        </span>
                        {client.membershipActive && (
                          <span className="absolute -top-1 -right-1 bg-elegant-gold text-elegant-bg h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-extrabold shadow-sm" title="Miembro Activo">
                            👑
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs md:text-sm text-white leading-none">
                            {client.name}
                          </h4>
                          {/* Badge de Cumpleaños */}
                          {(() => {
                            if (!client.birthDate) return null;
                            const currentM = new Date().toISOString().substring(5, 7);
                            let cM = "";
                            if (client.birthDate.includes("-")) {
                              const parts = client.birthDate.split("-");
                              cM = parts.length === 3 ? parts[1] : parts[0];
                            }
                            if (cM === currentM) {
                              return (
                                <span className="bg-gradient-to-r from-purple-950 to-amber-950 border border-amber-500/60 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-xs">
                                  🎂 CUMPLEAÑOS ESTE MES
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {/* Badge de Retención */}
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${retention.badgeBgClass}`}>
                            {retention.statusLabel} (hace {retention.daysSinceLastCut}d)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-elegant-text-muted">
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-300 font-mono font-medium">
                            <Gift className="h-3 w-3 text-amber-400 shrink-0" />
                            🎂 {client.birthDate ? client.birthDate.split("-").reverse().join("/") : "Cumple: Sin registrar"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Rápidas: Re-Corte IA & Membresía */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {/* Botón Motor de Re-Corte IA */}
                      <button
                        onClick={() => setRetentionModalClient(client)}
                        className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Generar mensaje personalizado con IA para WhatsApp"
                      >
                        <Zap className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Re-Corte IA</span>
                      </button>

                      {/* Badge Membresía */}
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${getMembershipBadgeClass(client.membershipId)}`}>
                        {getMembershipLabel(client.membershipId)}
                      </span>

                      {/* Tarjeta de fidelización */}
                      <div className="flex items-center gap-1 bg-elegant-sub border border-elegant-border px-2.5 py-1 rounded-xl text-[11px] text-white">
                        <Award className="h-3.5 w-3.5 text-elegant-gold" />
                        <span className="font-semibold font-mono">{client.loyaltyPoints || 0} sellos</span>
                      </div>

                      {/* Botón Editar Cliente */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingClientId(null);
                          } else {
                            handleStartEdit(client);
                          }
                        }}
                        className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
                          isEditing
                            ? "bg-amber-500 text-black border-amber-400"
                            : "bg-amber-950/40 border-amber-500/40 hover:bg-amber-900/50 text-amber-300"
                        }`}
                        title="Editar Nombre, Teléfono, Correo, Cumpleaños y Membresía del Cliente"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>{isEditing ? "Cerrar Edición" : "Editar Cliente"}</span>
                      </button>

                      {/* Botón expandir Ficha Visual & Historial */}
                      <button
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                        className="p-1.5 border border-elegant-border hover:bg-elegant-sub rounded-xl text-elegant-text transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title={isExpanded ? "Ocultar Ficha Visual" : "Ver Ficha Visual e Historial Completo"}
                      >
                        <Camera className="h-3.5 w-3.5 text-elegant-gold" />
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* PANEL DE EDICIÓN COMPLETA DE CLIENTE */}
                  {isEditing && (
                    <div className="mt-4 p-4 rounded-2xl bg-black/80 border-2 border-amber-500/70 space-y-4 animate-fadeIn shadow-xl">
                      <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                          <Edit className="h-4 w-4 text-amber-400" />
                          Editar Datos del Cliente: <span className="text-white font-sans font-extrabold">{client.name}</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingClientId(null)}
                          className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          ✕ Cerrar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase block">Nombre Completo *</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase block">Teléfono / WhatsApp *</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase block">Correo Electrónico</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-300 uppercase block flex items-center justify-between">
                            <span>🔑 Contraseña / Clave</span>
                            <button
                              type="button"
                              onClick={() => {
                                const randPass = Math.floor(100000 + Math.random() * 900000).toString();
                                setEditPassword(randPass);
                              }}
                              className="text-[9px] text-amber-400 hover:underline font-bold cursor-pointer"
                            >
                              ⚡ Generar Clave
                            </button>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Nueva clave"
                              className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:ring-1 focus:ring-amber-500"
                            />
                            {editPassword && editPhone && (
                              <a
                                href={`https://wa.me/${editPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${editName}, tu clave para ingresar a tu cuenta en la barbería ha sido actualizada. Tu nueva contraseña es: ${editPassword}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                                title="Enviar clave por WhatsApp"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-300 uppercase block flex items-center gap-1">
                            <span>🎂 Fecha de Nacimiento / Cumpleaños</span>
                          </label>
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => setEditBirthDate(e.target.value)}
                            className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase block">Nivel de Membresía</label>
                          <select
                            value={editMembershipId}
                            onChange={(e) => setEditMembershipId(e.target.value)}
                            className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="">Sin Membresía</option>
                            {memberships.map((m) => (
                              <option key={m.id} value={m.id} className="bg-elegant-card text-white">
                                {m.name} ({m.discountPercent}% descuento)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-300 uppercase block">Sellos / Puntos Acumulados</label>
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setEditLoyaltyPoints(Math.max(0, editLoyaltyPoints - 1))}
                              className="px-3 py-1.5 bg-elegant-sub border border-elegant-border rounded-lg text-white hover:bg-elegant-card cursor-pointer font-mono font-bold"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-bold font-mono text-amber-300 text-sm">
                              {editLoyaltyPoints} sellos
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditLoyaltyPoints(editLoyaltyPoints + 1)}
                              className="px-3 py-1.5 bg-elegant-sub border border-elegant-border rounded-lg text-white hover:bg-elegant-card cursor-pointer font-mono font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
                        <button
                          type="button"
                          onClick={() => setEditingClientId(null)}
                          className="px-4 py-2 border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(client)}
                          disabled={editLoading}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs cursor-pointer disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                          {editLoading ? (
                            <span>Guardando...</span>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Guardar Cambios</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ALERTA Y BOTÓN DE EXONERACIÓN RÁPIDA DE MULTA POR INASISTENCIA */}
                  {(client.pendingPenalty || 0) > 0 && (
                    <div className="mt-3 bg-rose-950/80 border border-rose-700/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fadeIn">
                      <div className="flex items-center gap-2.5 text-xs text-rose-100 font-medium">
                        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
                        <div>
                          <span className="font-extrabold text-rose-200 uppercase tracking-wider text-[10px] block">
                            Multa Activa por Inasistencia Previa
                          </span>
                          <span className="text-[11px] text-rose-200/90 font-mono">
                            Saldo a cobrar o exonerar: <strong className="text-white text-sm font-bold">${(client.pendingPenalty || 10000).toLocaleString()} COP</strong>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`¿Confirmar exoneración total de la multa de $${(client.pendingPenalty || 10000).toLocaleString()} COP a ${client.name}?`)) {
                            try {
                              await fetch(`/api/clients/${client.id}/penalties/waive`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ waivedBy: "Admin - Gestión de Clientes" })
                              });
                              if (onUpdateClient) {
                                await onUpdateClient(client.id, { pendingPenalty: 0 });
                              }
                              setSuccessMsg(`¡Multa exonerada correctamente para ${client.name}!`);
                              setTimeout(() => setSuccessMsg(""), 4000);
                            } catch (e) {
                              console.error("Error al exonerar:", e);
                              setErrorMsg("Error al exonerar la multa.");
                            }
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
                      >
                        <Check className="h-4 w-4" />
                        <span>✨ Exonerar Multa / Inasistencia</span>
                      </button>
                    </div>
                  )}

                  {/* SECCIÓN EXPANDIDA: FICHA VISUAL Y EDICIÓN DE CLIENTE */}
                  {isExpanded && (
                    <div className="mt-5 pt-4 border-t border-elegant-border/40 space-y-6 animate-fadeIn">
                      
                      {/* Ficha Visual & Preferencias Técnicas */}
                      <ClientVisualCard
                        client={client}
                        onUpdateClient={onUpdateClient}
                      />

                      {/* Opciones de Administración de Cuenta & Historial */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-elegant-border/30">
                        {/* Columna Izquierda: Ajustes de Membresía */}
                        <div className="md:col-span-5 space-y-3 border-r border-elegant-border/30 pr-0 md:pr-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5" />
                            Ajustar Membresía y Cortesía
                          </h5>

                          {isEditing ? (
                            <div className="space-y-3 bg-elegant-card/40 border border-elegant-border p-3 rounded-xl">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Nivel de Membresía</label>
                                <select
                                  value={editMembershipId}
                                  onChange={(e) => setEditMembershipId(e.target.value)}
                                  className="w-full text-xs px-2.5 py-1.5 border border-elegant-border rounded-lg bg-elegant-sub text-white"
                                >
                                  <option value="">Ninguna</option>
                                  {memberships.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.discountPercent}% descuento)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Sellos Acumulados</label>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditLoyaltyPoints(Math.max(0, editLoyaltyPoints - 1))}
                                    className="p-1.5 bg-elegant-sub border border-elegant-border rounded-md text-white hover:bg-elegant-card cursor-pointer"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-12 text-center text-xs font-bold font-mono text-white">
                                    {editLoyaltyPoints}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditLoyaltyPoints(editLoyaltyPoints + 1)}
                                    className="p-1.5 bg-elegant-sub border border-elegant-border rounded-md text-white hover:bg-elegant-card cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1 text-[10px]">
                                <button
                                  onClick={() => handleSaveEdit(client)}
                                  disabled={editLoading}
                                  className="px-3 py-1.5 bg-elegant-gold text-elegant-bg rounded-lg font-bold hover:bg-elegant-gold-hover cursor-pointer disabled:opacity-50"
                                >
                                  {editLoading ? "Guardando..." : "Guardar Cambios"}
                                </button>
                                <button
                                  onClick={() => setEditingClientId(null)}
                                  className="px-3 py-1.5 border border-elegant-border text-elegant-text rounded-lg hover:bg-elegant-sub cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 text-xs">
                              <button
                                onClick={() => handleStartEdit(client)}
                                className="px-3 py-2 border border-elegant-border bg-elegant-sub text-white hover:bg-elegant-card rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                              >
                                ✏️ Modificar Membresía
                              </button>

                              <button
                                onClick={() => handleGrantCourtesyStamp(client)}
                                className="px-3 py-2 bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Gift className="h-3.5 w-3.5" />
                                +1 Sello de Cortesía
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Columna Derecha: Historial de Visitas */}
                        <div className="md:col-span-7 space-y-3">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-1">
                            <History className="h-3.5 w-3.5" />
                            Historial de Citas ({clientApps.length} registradas)
                          </h5>

                          {clientApps.length === 0 ? (
                            <p className="text-xs italic text-elegant-text-muted py-2">No se registran citas agendadas con este cliente.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {clientApps.map((app) => (
                                <div 
                                  key={app.id} 
                                  className={`text-xs p-2.5 rounded-xl border flex justify-between items-center bg-elegant-card/50 ${
                                    app.status === "completed" ? "border-blue-900/30 opacity-90" :
                                    app.status === "confirmed" ? "border-emerald-900/30" :
                                    app.status === "canceled" ? "border-rose-900/30 opacity-70" :
                                    "border-elegant-gold/20"
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-white">{app.serviceName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-elegant-text-muted">
                                      <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{app.date}</span>
                                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{app.time}</span>
                                      <span>Barbero: {app.barberName || "Asignado"}</span>
                                    </div>
                                  </div>

                                  <div className="text-right space-y-1">
                                    <span className="font-bold text-white font-mono block">
                                      {formatPrice(app.price)}
                                    </span>
                                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider inline-block ${
                                      app.status === "completed" ? "bg-blue-950 text-blue-400 border border-blue-900/30" :
                                      app.status === "confirmed" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" :
                                      app.status === "canceled" ? "bg-rose-950 text-rose-400 border border-rose-900/30" :
                                      "bg-amber-950 text-amber-400 border border-amber-900/30"
                                    }`}>
                                      {app.status === "completed" ? "Completado" :
                                       app.status === "confirmed" ? "Confirmado" :
                                       app.status === "canceled" ? "Cancelado" : "Pendiente"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL MOTOR DE RE-CORTE IA */}
      {retentionModalClient && (
        <RetentionEngineModal
          client={retentionModalClient}
          appointments={appointments}
          onClose={() => setRetentionModalClient(null)}
        />
      )}
    </div>
  );
}
