import React, { useState } from "react";
import { ClientAccount, Appointment, MembershipPlan } from "../types";
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
  X
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
  
  // Edit states for individual clients
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
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
  const [newPassword, setNewPassword] = useState("");
  const [newMembershipId, setNewMembershipId] = useState("");
  const [newLoyaltyPoints, setNewLoyaltyPoints] = useState<number>(1);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [formError, setFormError] = useState("");

  const handleOpenCreateForm = () => {
    // Pre-populate with a random 6-digit password for convenience
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randomPass);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
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
          password: newPassword,
          membershipId: newMembershipId || undefined,
          loyaltyPoints: newLoyaltyPoints,
        });
        setSuccessMsg(`¡Cliente ${newName} registrado con éxito!`);
        // Reset form
        setNewName("");
        setNewPhone("");
        setNewEmail("");
        setNewPassword("");
        setNewMembershipId("");
        setNewLoyaltyPoints(1);
        setShowCreateForm(false);
        // Auto dismiss success message
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
    setEditMembershipId(client.membershipId || "");
    setEditLoyaltyPoints(client.loyaltyPoints || 0);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSaveEdit = async (client: ClientAccount) => {
    setEditLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onUpdateClient(client.id, {
        membershipId: editMembershipId || null as any,
        loyaltyPoints: editLoyaltyPoints,
      });
      setSuccessMsg(`¡Cliente ${client.name} actualizado con éxito!`);
      setEditingClientId(null);
      // Auto dismiss success message
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
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const totalClients = clients.length;
  const bronzeCount = clients.filter(c => c.membershipActive && c.membershipId === "bronze").length;
  const silverCount = clients.filter(c => c.membershipActive && c.membershipId === "silver").length;
  const goldCount = clients.filter(c => c.membershipActive && c.membershipId === "gold").length;
  const activeMembershipsCount = bronzeCount + silverCount + goldCount;

  // Get client's appointments history helper
  const getClientAppointments = (client: ClientAccount) => {
    // Match by phone or email
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
        return "bg-neutral-800 text-neutral-400 border border-neutral-700 text-xs";
    }
  };

  const getMembershipLabel = (planId?: string) => {
    switch (planId) {
      case "gold": return "VIP ORO";
      case "silver": return "PLATA";
      case "bronze": return "BRONCE";
      default: return "Ninguna";
    }
  };

  return (
    <div className="space-y-6" id="client-membership-manager">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-elegant-gold" />
            Cartera de Clientes & Membresías
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Monitorea los clientes registrados, cambia su nivel de membresía, revisa su historial de visitas en tiempo real y gestiona sus sellos de fidelización.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreateForm}
            className="w-full sm:w-auto px-4 py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Crear un nuevo cliente directamente en la base de datos"
          >
            <UserPlus className="h-4 w-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>
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
            {/* Nombre */}
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

            {/* Teléfono */}
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

            {/* Correo */}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contraseña */}
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
              <p className="text-[9px] text-elegant-text-muted">
                Código para que el cliente acceda a su portal de fidelización y citas.
              </p>
            </div>

            {/* Membresía inicial */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Asignar Membresía Inicial (Opcional)</label>
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

            {/* Puntos de fidelidad */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Sellos de Fidelidad Iniciales</label>
              <input 
                type="number"
                min="0"
                value={newLoyaltyPoints}
                onChange={(e) => setNewLoyaltyPoints(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white"
              />
              <p className="text-[9px] text-elegant-text-muted">
                Cantidad de visitas registradas inicialmente.
              </p>
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

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
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

      {/* Mensajes de feedback */}
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
            placeholder="Buscar por nombre, celular o correo electrónico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-white placeholder-neutral-500 text-xs w-full focus:outline-none"
          />
        </div>

        {/* Tabla / Lista de Clientes */}
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
            <Users className="h-8 w-8 mx-auto stroke-1" />
            <p className="text-sm">No se encontraron clientes registrados con ese criterio de búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => {
              const isExpanded = expandedClientId === client.id;
              const isEditing = editingClientId === client.id;
              const clientApps = getClientAppointments(client);
              const completedVisits = clientApps.filter(a => a.status === "completed");

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
                        <h4 className="font-bold text-xs md:text-sm text-white flex items-center gap-1.5 leading-none">
                          {client.name}
                        </h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-elegant-text-muted">
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Membresía y Fidelización */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {/* Badge Membresía */}
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${getMembershipBadgeClass(client.membershipId)}`}>
                        {getMembershipLabel(client.membershipId)}
                      </span>

                      {/* Tarjeta de fidelización rápida */}
                      <div className="flex items-center gap-1 bg-elegant-sub border border-elegant-border px-2.5 py-1 rounded-xl text-[11px] text-white">
                        <Award className="h-3.5 w-3.5 text-elegant-gold" />
                        <span className="font-semibold font-mono">{client.loyaltyPoints || 0} sellos</span>
                      </div>

                      {/* Botón de expansión para ver historial */}
                      <button
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                        className="p-1.5 border border-elegant-border hover:bg-elegant-sub rounded-xl text-elegant-text transition-colors cursor-pointer"
                        title={isExpanded ? "Ocultar Historial" : "Ver Historial e Información Completa"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sección expandida */}
                  {isExpanded && (
                    <div className="mt-5 pt-4 border-t border-elegant-border/40 grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
                      
                      {/* Columna Izquierda: Acciones de Gestión Manual */}
                      <div className="md:col-span-5 space-y-4 border-r border-elegant-border/30 pr-0 md:pr-5">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          Modificar Estado de Cliente
                        </h5>

                        {isEditing ? (
                          <div className="space-y-4 bg-elegant-card/40 border border-elegant-border p-3.5 rounded-xl">
                            {/* Nivel Membresía */}
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

                            {/* Sellos de Fidelización */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Sellos del Cliente (0 a 5+)</label>
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
                              <p className="text-[9px] text-elegant-text-muted">A los 5 sellos se puede canjear una recompensa (corte gratis).</p>
                            </div>

                            <div className="flex gap-2 pt-1 text-[10px]">
                              <button
                                onClick={() => handleSaveEdit(client)}
                                disabled={editLoading}
                                className="px-3 py-1.5 bg-elegant-gold text-elegant-bg rounded-lg font-bold hover:bg-amber-500 cursor-pointer disabled:opacity-50"
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
                          <div className="space-y-3.5">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 text-center">
                              <div className="bg-elegant-sub/40 border border-elegant-border rounded-xl p-2.5">
                                <span className="text-[9px] text-elegant-text-muted uppercase tracking-wider block">Visitas Totales</span>
                                <span className="text-base font-bold text-white font-mono">{clientApps.length}</span>
                              </div>
                              <div className="bg-elegant-sub/40 border border-elegant-border rounded-xl p-2.5">
                                <span className="text-[9px] text-elegant-text-muted uppercase tracking-wider block">Completadas</span>
                                <span className="text-base font-bold text-emerald-400 font-mono">{completedVisits.length}</span>
                              </div>
                            </div>

                            {/* Acciones Rápidas */}
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
                                title="Otorga 1 Sello de Cortesía en su tarjeta sin necesidad de registrar cita"
                              >
                                <Gift className="h-3.5 w-3.5" />
                                +1 Sello de Cortesía
                              </button>
                            </div>
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
                          <p className="text-xs italic text-elegant-text-muted py-4">No se registran citas agendadas con el correo o celular de este cliente.</p>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                                    {app.price === 0 && (
                                      <span className="bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1 rounded uppercase">Canjeado</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-elegant-text-muted">
                                    <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{app.date}</span>
                                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{app.time}</span>
                                    <span>Peluquero: {app.barberName || "Cualquiera"}</span>
                                  </div>
                                </div>

                                <div className="text-right space-y-1">
                                  <span className="font-bold text-white font-mono block">
                                    {app.price === 0 ? "GRATIS" : formatPrice(app.price)}
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
