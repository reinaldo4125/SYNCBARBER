import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Scissors,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Shield,
  Key,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Percent,
  Check,
  RefreshCw,
  Plus
} from "lucide-react";

interface Barber {
  id: string;
  name: string;
  username: string;
  password?: string;
  isActive: boolean;
  specialties?: string[];
  avatarUrl?: string;
  photoUrl?: string;
  commissionPercent?: number;
}

interface TenantBarbersData {
  tenantId: string;
  salonName: string;
  licenseType: string;
  planName: string;
  defaultMaxBarbers: number;
  customMaxBarbers: number | null;
  effectiveMaxBarbers: number;
  activeCount: number;
  isCustomQuota: boolean;
  barbers: Barber[];
}

interface DeveloperBarberManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any | null;
  triggerToast: (title: string, msg: string, type?: "info" | "success" | "warning") => void;
  addLog?: (tag: string, text: string, type?: "info" | "success" | "warn" | "error") => void;
  onTenantUpdated?: () => void;
}

export function DeveloperBarberManagerModal({
  isOpen,
  onClose,
  tenant,
  triggerToast,
  addLog,
  onTenantUpdated
}: DeveloperBarberManagerModalProps) {
  const [data, setData] = useState<TenantBarbersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"list" | "add" | "quota">("list");

  // Form states for adding barber
  const [barberName, setBarberName] = useState("");
  const [barberUser, setBarberUser] = useState("");
  const [barberPass, setBarberPass] = useState("");
  const [barberCommission, setBarberCommission] = useState(50);
  const [barberSpecialties, setBarberSpecialties] = useState<string[]>(["cabello"]);
  const [barberPhoto, setBarberPhoto] = useState("");
  const [creatingBarber, setCreatingBarber] = useState(false);

  // Form states for custom quota
  const [customQuotaInput, setCustomQuotaInput] = useState<string>("");
  const [savingQuota, setSavingQuota] = useState(false);

  // Visibility states for passwords in table
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Editing existing barber state
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editCommission, setEditCommission] = useState(50);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTenantBarbers = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/developer/tenants/${tenant.id}/barbers`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setCustomQuotaInput(json.customMaxBarbers ? String(json.customMaxBarbers) : "");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "No se pudo cargar la información de barberos del salón.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenant?.id) {
      fetchTenantBarbers();
      setActiveSubTab("list");
      setEditingBarberId(null);
    }
  }, [isOpen, tenant?.id]);

  if (!isOpen || !tenant) return null;

  const handleToggleSpecialty = (spec: string) => {
    setBarberSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleCreateBarberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberName.trim() || !barberUser.trim() || !barberPass.trim()) {
      triggerToast("Campos Incompletos", "Ingresa el nombre, usuario y contraseña del barbero.", "warning");
      return;
    }

    try {
      setCreatingBarber(true);
      const res = await fetch(`/api/developer/tenants/${tenant.id}/barbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: barberName.trim(),
          username: barberUser.trim(),
          password: barberPass.trim(),
          commissionPercent: barberCommission,
          specialties: barberSpecialties,
          photoUrl: barberPhoto.trim() || undefined
        })
      });

      const resData = await res.json();
      if (res.ok) {
        triggerToast("¡Barbero Creado!", resData.message || "Barbero agregado exitosamente.", "success");
        if (addLog) {
          addLog("BARBEROS", `Barbero '${barberName}' agregado a '${tenant.name}' desde panel dev.`, "success");
        }
        // Reset form
        setBarberName("");
        setBarberUser("");
        setBarberPass("");
        setBarberPhoto("");
        setBarberCommission(50);
        setBarberSpecialties(["cabello"]);
        setActiveSubTab("list");
        await fetchTenantBarbers();
        if (onTenantUpdated) onTenantUpdated();
      } else {
        triggerToast("Error", resData.error || "No se pudo crear el barbero.", "warning");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "Fallo al comunicar la creación del barbero.", "warning");
    } finally {
      setCreatingBarber(false);
    }
  };

  const handleSaveCustomQuota = async (quotaValue: string | null) => {
    try {
      setSavingQuota(true);
      const res = await fetch(`/api/developer/tenants/${tenant.id}/custom-barber-limit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMaxBarbers: quotaValue === null || quotaValue === "" ? null : Number(quotaValue)
        })
      });

      const resData = await res.json();
      if (res.ok) {
        triggerToast("Cupo de Barberos Actualizado", resData.message, "success");
        if (addLog) {
          addLog("NEGOCIACIÓN", `Cupo especial de barberos para '${tenant.name}' establecido en ${quotaValue || 'Por defecto'}`, "success");
        }
        await fetchTenantBarbers();
        if (onTenantUpdated) onTenantUpdated();
      } else {
        triggerToast("Error", resData.error || "No se pudo actualizar el cupo.", "warning");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "Fallo al guardar el cupo de barberos.", "warning");
    } finally {
      setSavingQuota(false);
    }
  };

  const handleToggleBarberActive = async (barber: Barber) => {
    try {
      const nextActive = !barber.isActive;
      const res = await fetch(`/api/developer/tenants/${tenant.id}/barbers/${barber.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive })
      });

      if (res.ok) {
        triggerToast(
          nextActive ? "Barbero Activado" : "Barbero Inactivado",
          `Estado de ${barber.name} actualizado a ${nextActive ? "Activo" : "Inactivo"}.`,
          "info"
        );
        await fetchTenantBarbers();
        if (onTenantUpdated) onTenantUpdated();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "No se pudo cambiar el estado del barbero.", "warning");
    }
  };

  const handleDeleteBarber = async (barberId: string, barberName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar al barbero '${barberName}' de '${tenant.name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/developer/tenants/${tenant.id}/barbers/${barberId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        triggerToast("Barbero Eliminado", `Barbero '${barberName}' removido del salón.`, "info");
        if (addLog) {
          addLog("BARBEROS", `Barbero '${barberName}' eliminado de '${tenant.name}' desde panel dev.`, "info");
        }
        await fetchTenantBarbers();
        if (onTenantUpdated) onTenantUpdated();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "No se pudo eliminar el barbero.", "warning");
    }
  };

  const startEditingBarber = (b: Barber) => {
    setEditingBarberId(b.id);
    setEditName(b.name);
    setEditUser(b.username);
    setEditPass(b.password || "");
    setEditCommission(b.commissionPercent || 50);
  };

  const handleSaveBarberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarberId) return;

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/developer/tenants/${tenant.id}/barbers/${editingBarberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          username: editUser.trim(),
          password: editPass.trim() || undefined,
          commissionPercent: editCommission
        })
      });

      if (res.ok) {
        triggerToast("Barbero Actualizado", "Datos del barbero actualizados con éxito.", "success");
        setEditingBarberId(null);
        await fetchTenantBarbers();
        if (onTenantUpdated) onTenantUpdated();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error", "No se pudo guardar la edición del barbero.", "warning");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-elegant-card border border-elegant-border rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl space-y-0">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-elegant-border flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white">
                  Barberos & Negociación de Cupos
                </h3>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {tenant.name}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/80">
                  Plan {(data?.licenseType || tenant.licenseType || "basica").toUpperCase()}
                </span>
                {data?.isCustomQuota && (
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    Cupo Negociado ({data.effectiveMaxBarbers} máx)
                  </span>
                )}
              </div>
              <p className="text-xs text-elegant-text-muted mt-0.5">
                Crea barberos directamente, edita credenciales o autoriza cupos especiales adicionales negociados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Status Bar / Sub-tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-neutral-900/60 border-b border-elegant-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveSubTab("list"); setEditingBarberId(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === "list"
                  ? "bg-amber-500/20 border-amber-500/70 text-amber-300 font-extrabold shadow-sm"
                  : "bg-black/30 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Barberos del Salón ({data?.barbers?.length || 0})</span>
            </button>

            <button
              onClick={() => { setActiveSubTab("add"); setEditingBarberId(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === "add"
                  ? "bg-amber-500/20 border-amber-500/70 text-amber-300 font-extrabold shadow-sm"
                  : "bg-black/30 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>➕ Agregar Barbero Directo</span>
            </button>

            <button
              onClick={() => { setActiveSubTab("quota"); setEditingBarberId(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === "quota"
                  ? "bg-emerald-500/20 border-emerald-500/70 text-emerald-300 font-extrabold shadow-sm"
                  : "bg-black/30 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>⚙️ Negociar Cupo Especial</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-neutral-400">
              Ocupación: <strong className="text-white font-extrabold">{data?.activeCount || 0}</strong> /{" "}
              <strong className="text-amber-400 font-extrabold">
                {data?.effectiveMaxBarbers ? (data.effectiveMaxBarbers >= 99 ? "∞" : data.effectiveMaxBarbers) : 2}
              </strong>
            </span>
            <button
              onClick={fetchTenantBarbers}
              disabled={loading}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg cursor-pointer transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: LIST OF BARBERS */}
          {activeSubTab === "list" && (
            <div className="space-y-4">
              {editingBarberId ? (
                /* Edit Barber Inline Form */
                <form onSubmit={handleSaveBarberEdit} className="p-4 bg-neutral-900 border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      Editar Credenciales & Datos del Barbero
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingBarberId(null)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Nombre Completo:</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Usuario de Acceso:</label>
                      <input
                        type="text"
                        required
                        value={editUser}
                        onChange={(e) => setEditUser(e.target.value)}
                        className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Nueva Contraseña:</label>
                      <input
                        type="text"
                        placeholder="Dejar vacía para conservar actual"
                        value={editPass}
                        onChange={(e) => setEditPass(e.target.value)}
                        className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Comisión (%):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editCommission}
                        onChange={(e) => setEditCommission(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-black border border-neutral-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setEditingBarberId(null)}
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl"
                    >
                      {savingEdit ? "Guardando..." : "Actualizar Barbero"}
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Table of Barbers */}
              {data?.barbers && data.barbers.length > 0 ? (
                <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-950/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 bg-neutral-900/60">
                        <th className="py-3 px-3">Profesional / Barbero</th>
                        <th className="py-3 px-3">Usuario & Acceso</th>
                        <th className="py-3 px-3">Especialidades & Comisión</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones Directas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {data.barbers.map((b) => {
                        const showPass = showPasswordMap[b.id];
                        return (
                          <tr key={b.id} className="hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3 px-3 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden shrink-0">
                                  {b.avatarUrl || b.photoUrl ? (
                                    <img src={b.avatarUrl || b.photoUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{b.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="block text-xs">{b.name}</span>
                                  <span className="block text-[9px] text-neutral-500 font-mono">id: {b.id}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-neutral-400">Usuario:</span>
                                  <span className="text-xs font-mono font-bold text-amber-300">{b.username}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-neutral-400">Clave:</span>
                                  <span className="text-xs font-mono text-neutral-200">
                                    {showPass ? (b.password || "admin") : "••••••••"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswordMap(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                                    className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                                    title="Ver/Ocultar contraseña"
                                  >
                                    {showPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {(b.specialties || ["cabello"]).map((spec) => (
                                    <span key={spec} className="px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded text-[9px] font-mono">
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                                  Comisión: {b.commissionPercent !== undefined ? b.commissionPercent : 50}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleBarberActive(b)}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border cursor-pointer transition-all ${
                                  b.isActive !== false
                                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                                    : "bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900"
                                }`}
                              >
                                {b.isActive !== false ? "● Activo" : "○ Inactivo"}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditingBarber(b)}
                                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Editar nombre, usuario o clave"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBarber(b.id, b.name)}
                                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg border border-transparent hover:border-rose-800 cursor-pointer transition-colors"
                                  title="Eliminar barbero permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-neutral-950/40 border border-neutral-800 rounded-2xl space-y-3">
                  <Scissors className="h-8 w-8 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400">
                    No hay barberos registrados en <strong>{tenant.name}</strong> actualmente.
                  </p>
                  <button
                    onClick={() => setActiveSubTab("add")}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Agregar Primer Barbero</span>
                  </button>
                </div>
              )}

              {/* Informative quota card */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      ¿Llegaste a una negociación especial con {tenant.name}?
                    </h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Puedes añadir barberos directamente con permisos de desarrollador o ampliar el cupo del Plan {data?.planName || tenant.licenseType} sin alterar su precio base.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubTab("quota")}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer shrink-0 transition-all"
                >
                  Ajustar Cupo Negociado
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ADD BARBER DIRECTLY */}
          {activeSubTab === "add" && (
            <form onSubmit={handleCreateBarberSubmit} className="space-y-4">
              <div className="p-4 bg-neutral-900/80 border border-amber-500/30 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4 text-amber-400" />
                      Alta Directa de Barbero (Bypass & Permisos Developer)
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Crea una cuenta para que el barbero inicie sesión en su portal y gestione su agenda.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Auto-expansión activa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Nombre Completo del Barbero *:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Daniel Castillo (Fade Master)"
                      value={barberName}
                      onChange={(e) => setBarberName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Usuario de Acceso *:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: daniel_barber"
                      value={barberUser}
                      onChange={(e) => setBarberUser(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Contraseña de Acceso *:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: barbero123"
                      value={barberPass}
                      onChange={(e) => setBarberPass(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Porcentaje de Comisión (%):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="50"
                      value={barberCommission}
                      onChange={(e) => setBarberCommission(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                {/* Specialties */}
                <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Especialidades del Barbero:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "cabello", label: "✂️ Corte de Cabello" },
                      { id: "barba", label: "🪒 Barbería / Barba" },
                      { id: "color", label: "🎨 Tinte / Color" },
                      { id: "tratamiento", label: "✨ Tratamientos" },
                      { id: "spa", label: "🧖 Spa Facial" }
                    ].map((spec) => {
                      const isSel = barberSpecialties.includes(spec.id);
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => handleToggleSpecialty(spec.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSel
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                              : "bg-black/40 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          {spec.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* URL Foto */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    URL Foto o Avatar (Opcional):
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={barberPhoto}
                    onChange={(e) => setBarberPhoto(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Developer bypass note */}
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-[11px] text-neutral-300 flex items-start gap-2">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Garantía de Operatividad:</strong> Si este salón se encuentra en su límite de plan (ej. 2 barberos en Plan Básica), al agregarlo desde esta área de desarrollo se expandirá automáticamente el cupo negociado a <strong className="text-amber-400">{(data?.activeCount || 0) + 1}</strong> barberos.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("list")}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl hover:text-white transition-colors cursor-pointer"
                  >
                    Volver al Listado
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBarber}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>{creatingBarber ? "Creando Barbero..." : "Crear y Asignar Barbero"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: NEGOCIAR CUPO ESPECIAL */}
          {activeSubTab === "quota" && (
            <div className="space-y-4">
              <div className="p-5 bg-neutral-900/80 border border-emerald-500/40 rounded-2xl space-y-4">
                <div className="border-b border-neutral-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    Negociación Comercial & Cupo de Barberos Personalizado
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Si cerraste una negociación especial con este cliente para permitirle 1, 2 o más barberos adicionales en su <strong>Plan {(data?.licenseType || tenant.licenseType || "basica").toUpperCase()}</strong> (sin obligarlo a pagar un plan superior completo), establece aquí su cupo máximo autorizado.
                  </p>
                </div>

                {/* Plan Base info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-black/50 border border-neutral-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Plan Base:</span>
                    <span className="text-xs font-extrabold text-white uppercase">
                      {data?.planName || tenant.licenseType || "Plan Básica"}
                    </span>
                  </div>

                  <div className="p-3 bg-black/50 border border-neutral-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Cupo por Defecto:</span>
                    <span className="text-xs font-mono font-extrabold text-neutral-300">
                      {data?.defaultMaxBarbers || 2} Barberos
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Cupo Actual Autorizado:</span>
                    <span className="text-xs font-mono font-black text-emerald-300 flex items-center gap-1">
                      {data?.effectiveMaxBarbers || 2} Barberos
                      {data?.isCustomQuota && <span className="text-[9px] bg-emerald-900 px-1.5 rounded">Especial ✨</span>}
                    </span>
                  </div>
                </div>

                {/* Fast Selector buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Seleccionar Cupo Negociado Rápido:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: "2", label: "2 Barberos", sub: "Defecto Básica" },
                      { value: "3", label: "3 Barberos", sub: "+1 Negociado ✨" },
                      { value: "4", label: "4 Barberos", sub: "+2 Negociados ✨" },
                      { value: "5", label: "5 Barberos", sub: "Defecto Pro" },
                      { value: "6", label: "6 Barberos", sub: "+1 Pro Negociado ✨" },
                      { value: "7", label: "7 Barberos", sub: "+2 Pro Negociados ✨" },
                      { value: "8", label: "8 Barberos", sub: "Cupo Ampliado" },
                      { value: "99", label: "Ilimitado (∞)", sub: "Full Enterprise" }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCustomQuotaInput(item.value)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          customQuotaInput === item.value
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50"
                            : "bg-black/40 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <span className="block text-xs font-extrabold">{item.label}</span>
                        <span className="block text-[9px] text-neutral-400 font-mono mt-0.5">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    O Escribe una Cantidad Exacta de Barberos Permitidos:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder={`Ej: 3 (Por defecto: ${data?.defaultMaxBarbers || 2})`}
                      value={customQuotaInput}
                      onChange={(e) => setCustomQuotaInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-black border border-neutral-700 text-white text-xs font-mono rounded-xl focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomQuotaInput("")}
                      className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Restablecer al Plan
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("list")}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl hover:text-white transition-colors cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    disabled={savingQuota}
                    onClick={() => handleSaveCustomQuota(customQuotaInput)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Check className="h-4 w-4" />
                    <span>{savingQuota ? "Guardando Cupo..." : "Guardar Cupo Negociado"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-elegant-border flex justify-between items-center text-xs">
          <span className="text-neutral-400 text-[11px]">
            Inquilino: <strong className="text-white font-mono">{tenant.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
