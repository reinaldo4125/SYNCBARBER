import React, { useState } from "react";
import { Barber, SalonConfig } from "../types";
import PushNotificationBanner from "./PushNotificationBanner";
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
  Plus,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";

interface BarberManagerProps {
  barbers: Barber[];
  onCreateBarber: (barberData: any) => Promise<any>;
  onUpdateBarber: (id: string, updates: Partial<Barber>) => Promise<any>;
  onDeleteBarber: (id: string) => Promise<any>;
  activeLicense?: "basica" | "profesional" | "premium";
  config?: SalonConfig;
}

const PRESET_AVATARS = [
  {
    name: "Barbero Clásico",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Estilista Fade",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Master Barber",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Estilista / Barbera",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Barbero Ejecutivo",
    url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Especialista Color",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80"
  }
];

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
  
  // License Limits Calculation (including custom negotiated quotas)
  const licenseType = (config?.licenseType || activeLicense || "basica") as "basica" | "profesional" | "premium";
  const defaultMaxBarbers = licenseType === "basica" ? 2 : licenseType === "profesional" ? 5 : 99;
  const customMax = config?.customMaxBarbers ? Number(config.customMaxBarbers) : undefined;
  const maxBarbers = customMax || defaultMaxBarbers;
  const isCustomQuota = Boolean(customMax && customMax !== defaultMaxBarbers);
  const activeBarbersCount = barbers.filter(b => b.isActive !== false).length;
  const isLimitReached = activeBarbersCount >= maxBarbers;
  const basePlanName = licenseType === "basica" ? "Plan Básica" : licenseType === "profesional" ? "Plan Profesional" : "Plan Premium";
  const planName = isCustomQuota
    ? `${basePlanName} (Cupo Negociado: ${maxBarbers})`
    : licenseType === "basica" ? "Plan Básica (Máx 2)" : licenseType === "profesional" ? "Plan Profesional (Máx 5)" : "Plan Premium Enterprise (Ilimitado)";

  // Editing state
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  
  // Create / Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(["cabello"]);
  const [photoUrl, setPhotoUrl] = useState("");
  
  // Status and loading
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setPhone("");
    setWhatsapp("");
    setSpecialties(["cabello"]);
    setPhotoUrl("");
    setEditingBarber(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 500;
        let { width, height } = img;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          if (isEditing && editingBarber) {
            setEditingBarber({ ...editingBarber, photoUrl: compressed, avatarUrl: compressed });
          } else {
            setPhotoUrl(compressed);
          }
        } else {
          if (isEditing && editingBarber) {
            setEditingBarber({ ...editingBarber, photoUrl: rawDataUrl, avatarUrl: rawDataUrl });
          } else {
            setPhotoUrl(rawDataUrl);
          }
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
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
        phone,
        whatsapp: whatsapp || phone,
        specialties,
        photoUrl: photoUrl.trim(),
        avatarUrl: photoUrl.trim()
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
        phone: editingBarber.phone,
        whatsapp: editingBarber.whatsapp || editingBarber.phone,
        isActive: editingBarber.isActive,
        specialties: editingBarber.specialties,
        photoUrl: (editingBarber.photoUrl || editingBarber.avatarUrl || "").trim(),
        avatarUrl: (editingBarber.photoUrl || editingBarber.avatarUrl || "").trim(),
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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
              <Users className="h-5 w-5 text-elegant-gold" />
              Administrar Barberos del Salón
            </h2>
            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${
              isLimitReached
                ? "bg-amber-950/80 text-amber-300 border-amber-800"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-800"
            }`}>
              Cupos: {activeBarbersCount} / {maxBarbers >= 99 ? "∞ Ilimitado" : maxBarbers} ({planName})
            </span>
          </div>
          <p className="text-xs text-elegant-text-muted mt-0.5">
            Crea cuentas de acceso de barberos, edita especialidades y controla su estado de actividad.
          </p>
        </div>

        {/* Push & WhatsApp Notification Settings Banner */}
        <div className="w-full">
          <PushNotificationBanner config={config} />
        </div>
        
        {!showAddForm && !editingBarber && (
          <div className="flex items-center gap-2">
            {isLimitReached ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 font-bold hidden md:inline">
                  ⚠️ Límite del plan alcanzado
                </span>
                <button
                  type="button"
                  disabled
                  title={`Tu ${planName} tiene un límite de ${maxBarbers} barberos. Actualiza tu plan para agregar más.`}
                  className="px-4 py-2 bg-neutral-800 text-neutral-500 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 border border-neutral-700 opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Límite Alcanzado ({activeBarbersCount}/{maxBarbers})</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { resetForm(); setShowAddForm(true); }}
                className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                <span>Agregar Nuevo Barbero</span>
              </button>
            )}
          </div>
        )}
      </div>

      {isLimitReached && (
        <div className="p-4 bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300">
                Has alcanzado el límite máximo de {maxBarbers} barberos permitidos para tu {planName}.
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Para registrar más profesionales o habilitar más puestos en simultáneo, solicita una clave de actualización a un plan superior (Profesional o Premium).
              </p>
            </div>
          </div>
        </div>
      )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Celular / WhatsApp (Alertas Citas)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setWhatsapp(e.target.value);
                }}
                placeholder="Ej: +57 300 123 4567"
                className="w-full px-3 py-2 bg-elegant-sub border border-emerald-500/40 text-white text-xs rounded-xl focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          </div>

          {/* Foto / Avatar del Barbero */}
          <div className="space-y-3 bg-elegant-sub/60 p-4 rounded-2xl border border-elegant-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-elegant-gold" />
                <span>Foto de Perfil del Barbero (Visible al Cliente)</span>
              </label>
              <span className="text-[10px] text-elegant-text-muted">Aparecerá en la reserva online</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview */}
              <div className="relative group shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-elegant-card border-2 border-elegant-gold/40 overflow-hidden flex items-center justify-center text-white shadow-md">
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Vista previa" 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-base font-bold font-mono text-elegant-text-muted">
                      {name ? name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() : <Camera className="h-6 w-6 text-neutral-500" />}
                    </span>
                  )}
                </div>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl("")}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-md hover:bg-rose-500 cursor-pointer"
                    title="Quitar foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* URL or Upload */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="Pega URL de imagen (Ej: https://.../foto.jpg) o sube archivo"
                    className="flex-1 px-3 py-2 bg-elegant-card border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                  />
                  <label className="px-3 py-2 bg-elegant-sub hover:bg-elegant-card border border-elegant-border text-white text-xs rounded-xl font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0">
                    <Upload className="h-3.5 w-3.5 text-elegant-gold" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-elegant-text-muted font-bold uppercase">Presets:</span>
                  {PRESET_AVATARS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(p.url)}
                      className={`text-[9px] px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                        photoUrl === p.url 
                          ? "bg-elegant-gold/20 border-elegant-gold text-elegant-gold font-bold" 
                          : "bg-elegant-card border-elegant-border/60 text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-elegant-gold" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Celular / WhatsApp</label>
              <input
                type="text"
                value={editingBarber.phone || editingBarber.whatsapp || ""}
                onChange={(e) => setEditingBarber({ ...editingBarber, phone: e.target.value, whatsapp: e.target.value })}
                placeholder="Ej: +57 300 123 4567"
                className="w-full px-3 py-2 bg-elegant-sub border border-emerald-500/40 text-white text-xs rounded-xl focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">Nueva Contraseña</label>
              <input
                type="password"
                value={editingBarber.password || ""}
                onChange={(e) => setEditingBarber({ ...editingBarber, password: e.target.value })}
                placeholder="Sin cambios"
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

          {/* Foto del Barbero en Modo Edición */}
          <div className="space-y-3 bg-elegant-sub/60 p-4 rounded-2xl border border-elegant-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-elegant-gold" />
                <span>Foto de Perfil del Barbero</span>
              </label>
              <span className="text-[10px] text-elegant-text-muted">Visible para los clientes al agendar</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview */}
              <div className="relative group shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-elegant-card border-2 border-elegant-gold/40 overflow-hidden flex items-center justify-center text-white shadow-md">
                  {(editingBarber.photoUrl || editingBarber.avatarUrl) ? (
                    <img 
                      src={editingBarber.photoUrl || editingBarber.avatarUrl} 
                      alt={editingBarber.name} 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-base font-bold font-mono text-elegant-text-muted">
                      {editingBarber.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {(editingBarber.photoUrl || editingBarber.avatarUrl) && (
                  <button
                    type="button"
                    onClick={() => setEditingBarber({ ...editingBarber, photoUrl: "", avatarUrl: "" })}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-md hover:bg-rose-500 cursor-pointer"
                    title="Quitar foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* URL or Upload */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={editingBarber.photoUrl || editingBarber.avatarUrl || ""}
                    onChange={(e) => setEditingBarber({ ...editingBarber, photoUrl: e.target.value, avatarUrl: e.target.value })}
                    placeholder="Pega URL de imagen (Ej: https://.../foto.jpg) o sube archivo"
                    className="flex-1 px-3 py-2 bg-elegant-card border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                  />
                  <label className="px-3 py-2 bg-elegant-sub hover:bg-elegant-card border border-elegant-border text-white text-xs rounded-xl font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0">
                    <Upload className="h-3.5 w-3.5 text-elegant-gold" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-elegant-text-muted font-bold uppercase">Presets:</span>
                  {PRESET_AVATARS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingBarber({ ...editingBarber, photoUrl: p.url, avatarUrl: p.url })}
                      className={`text-[9px] px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                        (editingBarber.photoUrl === p.url || editingBarber.avatarUrl === p.url)
                          ? "bg-elegant-gold/20 border-elegant-gold text-elegant-gold font-bold" 
                          : "bg-elegant-card border-elegant-border/60 text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-elegant-gold" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
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
                  <div className="h-11 w-11 rounded-xl bg-elegant-sub border border-elegant-border flex items-center justify-center text-white shrink-0 relative overflow-hidden">
                    {(barber.photoUrl || barber.avatarUrl) ? (
                      <img 
                        src={barber.photoUrl || barber.avatarUrl} 
                        alt={barber.name} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold font-mono">
                        {barber.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                      </span>
                    )}
                    {barber.isActive ? (
                      <span className="absolute bottom-0 right-0 bg-emerald-500 h-3 w-3 rounded-full border-2 border-elegant-bg z-10" title="Activo" />
                    ) : (
                      <span className="absolute bottom-0 right-0 bg-rose-500 h-3 w-3 rounded-full border-2 border-elegant-bg z-10" title="Inactivo" />
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
