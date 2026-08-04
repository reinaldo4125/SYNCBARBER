import React, { useState } from "react";
import { Barber, SalonConfig } from "../types";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Edit2, 
  Trash2, 
  Key, 
  CheckCircle, 
  AlertCircle,
  X,
  Plus
} from "lucide-react";

interface BarberManagerProps {
  barbers: Barber[];
  onCreateBarber: (barberData: any) => Promise<any>;
  onUpdateBarber: (id: string, updates: Partial<Barber>) => Promise<any>;
  onDeleteBarber: (id: string) => Promise<any>;
  activeLicense?: "basica" | "profesional" | "premium";
  config?: SalonConfig;
}

export default function BarberManager({
  barbers,
  onCreateBarber,
  onUpdateBarber,
  onDeleteBarber,
  activeLicense = "premium",
  config,
}: BarberManagerProps) {
  const DEFAULT_CATEGORIES = [
    { id: "cabello", name: "Corte de Cabello" },
    { id: "barba", name: "Barbería / Barba" },
    { id: "color", name: "Tinte o Coloración" },
    { id: "tratamiento", name: "Tratamiento de Cabello" },
  ];

  const serviceCategories = config?.serviceCategories || DEFAULT_CATEGORIES;
  // Editing state
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  
  // Create / Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(["cabello"]);
  
  // Status and loading
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setSpecialties(["cabello"]);
    setEditingBarber(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!name || !username || !password) {
      setErrorMsg("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await onCreateBarber({
        name,
        username,
        password,
        specialties
      });
      setSuccessMsg(`¡Barbero ${name} creado con éxito!`);
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el barbero.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!editingBarber.name || !editingBarber.username) {
      setErrorMsg("Nombre y usuario son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await onUpdateBarber(editingBarber.id, {
        name: editingBarber.name,
        username: editingBarber.username,
        password: editingBarber.password || undefined, // only update if filled
        isActive: editingBarber.isActive,
        specialties: editingBarber.specialties,
        blockedDates: editingBarber.blockedDates || []
      });
      setSuccessMsg(`¡Barbero ${editingBarber.name} actualizado!`);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar barbero.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, barberName: string) => {
    if (window.confirm(`¿Estás completamente seguro de eliminar a ${barberName}? Las citas asociadas quedarán sin asignar.`)) {
      setErrorMsg("");
      setSuccessMsg("");
      try {
        await onDeleteBarber(id);
        setSuccessMsg(`Se eliminó al barbero ${barberName}.`);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al eliminar barbero.");
      }
    }
  };

  const toggleSpecialty = (spec: string, isEditing: boolean = false) => {
    if (isEditing && editingBarber) {
      const current = editingBarber.specialties || [];
      const updated = current.includes(spec) 
        ? current.filter(s => s !== spec) 
        : [...current, spec];
      setEditingBarber({ ...editingBarber, specialties: updated });
    } else {
      const current = specialties;
      const updated = current.includes(spec) 
        ? current.filter(s => s !== spec) 
        : [...current, spec];
      setSpecialties(updated);
    }
  };

  return (
    <div className="space-y-6" id="barber-manager">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-elegant-gold" />
            Administrar Barberos del Salón
          </h2>
          <p className="text-xs text-elegant-text-muted">Crea cuentas de acceso de barberos, edita especialidades y controla su estado de actividad.</p>
        </div>
        
        {!showAddForm && !editingBarber && (
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Agregar Nuevo Barbero</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* 1. Form para Agregar Barbero */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-elegant-card border border-elegant-gold/30 rounded-2xl p-5 md:p-6 space-y-4 animate-scaleUp">
          <div className="flex justify-between items-center border-b border-elegant-border pb-3">
            <h3 className="text-sm font-bold text-elegant-gold uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-4.5 w-4.5" />
              Nuevo Registro de Barbero
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-elegant-sub rounded-lg text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Nombre Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Camilo Pérez"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Usuario de Ingreso</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: camilo"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 3 caracteres"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                required
              />
            </div>
          </div>

          {/* Especialidades */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Categorías de Servicio Permitidas</label>
            <div className="flex flex-wrap gap-2">
              {serviceCategories.map((spec) => {
                const isSelected = specialties.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpecialty(spec.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected 
                        ? "bg-elegant-gold text-elegant-bg font-bold" 
                        : "bg-elegant-sub border border-elegant-border text-elegant-text hover:bg-elegant-border"
                    }`}
                  >
                    {spec.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-elegant-border hover:bg-elegant-sub rounded-xl cursor-pointer text-elegant-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl cursor-pointer transition-colors"
            >
              {loading ? "Guardando..." : "Crear Barbero"}
            </button>
          </div>
        </form>
      )}

      {/* 2. Form para Editar Barbero */}
      {editingBarber && (
        <form onSubmit={handleUpdateSubmit} className="bg-elegant-card border border-elegant-gold/30 rounded-2xl p-5 md:p-6 space-y-4 animate-scaleUp">
          <div className="flex justify-between items-center border-b border-elegant-border pb-3">
            <h3 className="text-sm font-bold text-elegant-gold uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 className="h-4 w-4" />
              Editar Barbero: {editingBarber.name}
            </h3>
            <button
              type="button"
              onClick={() => setEditingBarber(null)}
              className="p-1 hover:bg-elegant-sub rounded-lg text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Nombre</label>
              <input
                type="text"
                value={editingBarber.name}
                onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Usuario</label>
              <input
                type="text"
                value={editingBarber.username}
                onChange={(e) => setEditingBarber({ ...editingBarber, username: e.target.value })}
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Nueva Contraseña (Opcional)</label>
              <input
                type="password"
                value={editingBarber.password || ""}
                onChange={(e) => setEditingBarber({ ...editingBarber, password: e.target.value })}
                placeholder="Dejar vacío si no cambia"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Estado</label>
              <select
                value={editingBarber.isActive ? "true" : "false"}
                onChange={(e) => setEditingBarber({ ...editingBarber, isActive: e.target.value === "true" })}
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none text-left"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo (Suspendido)</option>
              </select>
            </div>
          </div>

          {/* Especialidades */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Categorías Permitidas</label>
            <div className="flex flex-wrap gap-2">
              {serviceCategories.map((spec) => {
                const isSelected = (editingBarber.specialties || []).includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpecialty(spec.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected 
                        ? "bg-elegant-gold text-elegant-bg font-bold" 
                        : "bg-elegant-sub border border-elegant-border text-elegant-text hover:bg-elegant-border"
                    }`}
                  >
                    {spec.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloquear Agenda */}
          <div className="space-y-2 border-t border-elegant-border pt-4">
            <h4 className="text-xs font-bold text-elegant-gold uppercase tracking-wider flex items-center gap-1.5">
              <span>📅 Días de Descanso / Agenda Bloqueada (Licencia, Enfermedad)</span>
            </h4>
            <p className="text-[10px] text-elegant-text-muted">
              Bloquea fechas específicas para evitar que los clientes agenden con este barbero.
            </p>
            
            {activeLicense === "basica" ? (
              <div className="bg-amber-950/20 border border-amber-900/40 p-3.5 rounded-2xl flex flex-col justify-between gap-1 text-xs text-amber-300">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Módulo de Ausencias Reservado para Licencia Profesional o Premium</span>
                </p>
                <p className="text-[10px] text-elegant-text-muted">
                  Mejora tu suscripción al plan Profesional o Premium para habilitar la gestión de bloqueos de agenda y vacaciones.
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    id="admin-block-date-input"
                    className="px-3 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("admin-block-date-input") as HTMLInputElement;
                      if (input && input.value) {
                        const selectedDateVal = input.value;
                        const currentBlocked = editingBarber.blockedDates || [];
                        if (!currentBlocked.includes(selectedDateVal)) {
                          setEditingBarber({
                            ...editingBarber,
                            blockedDates: [...currentBlocked, selectedDateVal]
                          });
                        }
                        input.value = "";
                      }
                    }}
                    className="px-3 py-1.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Bloquear Fecha
                  </button>
                </div>

                {editingBarber.blockedDates && editingBarber.blockedDates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editingBarber.blockedDates.map((dateStr) => (
                      <span
                        key={dateStr}
                        className="text-[10px] bg-rose-950/60 border border-rose-800 text-rose-300 px-2 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <span>{dateStr}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingBarber.blockedDates || []).filter(d => d !== dateStr);
                            setEditingBarber({
                              ...editingBarber,
                              blockedDates: updated
                            });
                          }}
                          className="text-rose-400 hover:text-rose-200 font-black cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-elegant-text-muted italic">No hay fechas bloqueadas actualmente.</p>
                )}
              </>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditingBarber(null)}
              className="px-4 py-2 border border-elegant-border hover:bg-elegant-sub rounded-xl cursor-pointer text-elegant-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-elegant-gold hover:bg-elegant-gold-hover font-bold text-elegant-bg rounded-xl cursor-pointer transition-colors"
            >
              {loading ? "Actualizando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      )}

      {/* 3. Listado de Barberos Existentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber) => (
          <div 
            key={barber.id}
            className={`bg-elegant-card border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all ${
              barber.isActive 
                ? "border-elegant-border hover:border-neutral-700" 
                : "border-rose-950/40 opacity-70"
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-elegant-sub border border-elegant-border flex items-center justify-center text-white shrink-0 relative">
                    <span className="text-xs font-bold font-mono">
                      {barber.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                    </span>
                    {barber.isActive ? (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 h-3 w-3 rounded-full border-2 border-elegant-bg" title="Activo" />
                    ) : (
                      <span className="absolute -bottom-1 -right-1 bg-rose-500 h-3 w-3 rounded-full border-2 border-elegant-bg" title="Inactivo" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white leading-tight">{barber.name}</h4>
                    <p className="text-[10px] text-elegant-text-muted font-mono">@{barber.username}</p>
                  </div>
                </div>
                
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                  barber.isActive 
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}>
                  {barber.isActive ? "Activo" : "Suspendido"}
                </span>
              </div>

              {/* Categorías autorizadas */}
              <div className="space-y-1 pt-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-elegant-text-muted">Servicios Autorizados:</p>
                <div className="flex flex-wrap gap-1">
                  {(barber.specialties || []).map((s) => {
                    const catName = serviceCategories.find(c => c.id === s)?.name || s;
                    return (
                      <span key={s} className="text-[9px] bg-elegant-sub px-1.5 py-0.5 rounded text-white border border-elegant-border">
                        {catName}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Fechas bloqueadas */}
              {barber.blockedDates && barber.blockedDates.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Ausencias / Agenda Bloqueada:</p>
                  <div className="flex flex-wrap gap-1">
                    {barber.blockedDates.map((d) => (
                      <span key={d} className="text-[9px] bg-rose-950/40 border border-rose-800/40 text-rose-300 px-1.5 py-0.5 rounded-md font-mono">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-elegant-border/60 text-xs">
              <button
                onClick={() => { resetForm(); setEditingBarber({ ...barber }); }}
                className="flex-1 py-1.5 rounded-lg border border-elegant-border hover:bg-elegant-sub text-white hover:text-elegant-gold transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Editar Barbero"
              >
                <Edit2 className="h-3 w-3" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => handleDelete(barber.id, barber.name)}
                className="py-1.5 px-3 rounded-lg border border-rose-950 hover:bg-rose-950/40 text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
                title="Eliminar Barbero"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
