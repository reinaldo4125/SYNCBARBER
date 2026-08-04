import React, { useState } from "react";
import { ClientAccount, TechnicalPreferences, HaircutPhoto } from "../types";
import { 
  Scissors, 
  Camera, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  ShieldAlert, 
  Tag, 
  Calendar, 
  User, 
  Maximize2, 
  X,
  Upload,
  Droplet
} from "lucide-react";

interface ClientVisualCardProps {
  client: ClientAccount;
  onUpdateClient: (id: string, updates: Partial<ClientAccount>) => Promise<any>;
  readOnly?: boolean;
}

const FADE_OPTIONS = [
  "Bajo (Low Fade)",
  "Medio (Mid Fade)",
  "Alto (High Fade)",
  "Taper Fade",
  "Burst Fade",
  "Clásico / Tijera"
];

const TOP_STYLE_OPTIONS = [
  "Tijera Texturizado",
  "Guía #2 (6mm)",
  "Guía #3 (10mm)",
  "Buzz Cut",
  "Pompadour",
  "Slick Back / Peinado Atrás",
  "Mullet Moderno"
];

const BEARD_OPTIONS = [
  "Ritual Toalla Caliente & Navaja",
  "Delineado Navaja Suave",
  "Rebaje Guía #1",
  "Barba Larga Esculpida",
  "Sin Barba"
];

const SKIN_SENSITIVITY_OPTIONS = [
  "Normal",
  "Piel Sensible / Usar Bálsamo",
  "Propenso a Irritación con Navaja",
  "Alergia a Alcohol / Mentol"
];

const PRODUCT_OPTIONS = [
  "Cera Efecto Mate",
  "Polvo Texturizador de Volumen",
  "Aceite Nutritivo para Barba",
  "Shampoo Hydratante",
  "Laca / Spray de Fijación Strong"
];

// Preset sample photos for easy demonstration
const SAMPLE_PRESET_PHOTOS = [
  {
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
    tag: "Mid Fade + Barba Delineada",
  },
  {
    url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600",
    tag: "Low Taper Fade Texturizado",
  },
  {
    url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=600",
    tag: "Corte Ejecutivo & Tijera",
  }
];

export default function ClientVisualCard({
  client,
  onUpdateClient,
  readOnly = false,
}: ClientVisualCardProps) {
  const initialPrefs: TechnicalPreferences = client.technicalPreferences || {
    fadeType: "Medio (Mid Fade)",
    topStyle: "Tijera Texturizado",
    beardStyle: "Ritual Toalla Caliente & Navaja",
    skinSensitivity: "Normal",
    favoriteProducts: ["Cera Efecto Mate"],
  };

  const [prefs, setPrefs] = useState<TechnicalPreferences>(initialPrefs);
  const [photos, setPhotos] = useState<HaircutPhoto[]>(client.galleryPhotos || []);
  const [internalNotes, setInternalNotes] = useState<string>(client.internalNotes || "");
  const [avgCycleDays, setAvgCycleDays] = useState<number>(client.avgCutCycleDays || 21);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // New photo modal state
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoTag, setNewPhotoTag] = useState("Mid Fade + Perfilado");
  const [newPhotoNotes, setNewPhotoNotes] = useState("");
  const [newPhotoBarber, setNewPhotoBarber] = useState("Barbero de Turno");
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string>("");

  // Lightbox view state
  const [selectedPhoto, setSelectedPhoto] = useState<HaircutPhoto | null>(null);

  const handleWaivePenalty = async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}/penalties/waive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waivedBy: "Barbero / Admin" })
      });
      if (res.ok) {
        onUpdateClient(client.id, { pendingPenalty: 0 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPenalty = async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}/penalties/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10000, reason: "Inasistencia / Multa acumulada por reserva previa" })
      });
      const data = await res.json();
      if (res.ok && data.client) {
        onUpdateClient(client.id, { pendingPenalty: data.client.pendingPenalty });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleProduct = (product: string) => {
    if (readOnly) return;
    const current = prefs.favoriteProducts || [];
    if (current.includes(product)) {
      setPrefs({ ...prefs, favoriteProducts: current.filter(p => p !== product) });
    } else {
      setPrefs({ ...prefs, favoriteProducts: [...current, product] });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewPhotoDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = newPhotoDataUrl || SAMPLE_PRESET_PHOTOS[0].url;
    const newPhoto: HaircutPhoto = {
      id: "photo_" + Date.now(),
      url: finalUrl,
      date: new Date().toISOString().substring(0, 10),
      styleTag: newPhotoTag,
      barberName: newPhotoBarber,
      notes: newPhotoNotes,
    };

    const updatedPhotos = [newPhoto, ...photos];
    setPhotos(updatedPhotos);
    setShowAddPhotoModal(false);
    setNewPhotoDataUrl("");
    setNewPhotoNotes("");
    
    // Auto save photos update
    onUpdateClient(client.id, { galleryPhotos: updatedPhotos });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (readOnly) return;
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    await onUpdateClient(client.id, { galleryPhotos: updatedPhotos });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await onUpdateClient(client.id, {
        technicalPreferences: prefs,
        galleryPhotos: photos,
        internalNotes: internalNotes,
        avgCutCycleDays: avgCycleDays,
      });
      setSuccessMsg("¡Ficha técnica y galería visual actualizadas con éxito!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar la ficha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-6">
      {/* Header Ficha Visual */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-elegant-gold/10 border border-elegant-gold/30 flex items-center justify-center text-elegant-gold shrink-0">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white font-sans flex items-center gap-2">
              Ficha Visual & Estilo Técnico
            </h3>
            <p className="text-xs text-elegant-text-muted">
              Preferencias detalladas de degradado, cabello, barba, cuidados de piel y fotos de referencia.
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {saving ? <Sparkles className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Guardando..." : "Guardar Ficha"}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-950/50 border border-rose-800/60 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BANNER SEÑAS & MULTAS POR INASISTENCIA */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        (client.pendingPenalty || 0) > 0
          ? "bg-rose-950/40 border-rose-500/60 text-rose-200"
          : "bg-elegant-sub/40 border-elegant-border/60 text-slate-300"
      }`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5">
              <ShieldAlert className={`h-4 w-4 ${(client.pendingPenalty || 0) > 0 ? "text-rose-400 animate-bounce" : "text-emerald-400"}`} />
              {(client.pendingPenalty || 0) > 0 ? "⚠️ SEÑA / MULTA PENDIENTE ACUMULADA" : "✓ AL DÍA (SIN MULTAS PENDIENTES)"}
            </span>
            {(client.pendingPenalty || 0) > 0 && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black font-mono px-2 py-0.5 rounded-full">
                Cobrar en Próxima Reserva
              </span>
            )}
          </div>
          <p className="text-[11px] opacity-80">
            {(client.pendingPenalty || 0) > 0
              ? `Este cliente tiene un saldo acumulado por inasistencia previa o multa de cancelacion tardia.`
              : `Cliente con excelente historial de asistencia.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(client.pendingPenalty || 0) > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono text-rose-300 bg-rose-950 border border-rose-800 px-2.5 py-1 rounded-xl">
                ${(client.pendingPenalty || 0).toLocaleString()} COP
              </span>
              {!readOnly && (
                <button
                  onClick={handleWaivePenalty}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1 active:scale-95"
                  title="Exonerar Multa al cliente"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>✨ Exonerar Multa</span>
                </button>
              )}
            </div>
          ) : (
            !readOnly && (
              <button
                onClick={handleAddPenalty}
                className="px-3 py-1.5 bg-rose-950/50 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                + Registrar Multa ($10.000)
              </button>
            )
          )}
        </div>
      </div>

      {/* Grid: Preferencias Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Tipo de Fade / Degradado */}
        <div className="space-y-2 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl">
          <label className="text-xs font-extrabold text-elegant-gold uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5" />
            Tipo de Fade / Degradado Preferido
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FADE_OPTIONS.map((fade) => {
              const selected = prefs.fadeType === fade;
              return (
                <button
                  key={fade}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setPrefs({ ...prefs, fadeType: fade })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected 
                      ? "bg-elegant-gold text-elegant-bg border-elegant-gold font-bold shadow-sm" 
                      : "bg-elegant-sub/60 text-neutral-300 border-elegant-border hover:border-elegant-gold/40"
                  }`}
                >
                  {fade}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Estilo Superior / Peinado */}
        <div className="space-y-2 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl">
          <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-elegant-gold" />
            Estilo Arriba / Peinado
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TOP_STYLE_OPTIONS.map((style) => {
              const selected = prefs.topStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setPrefs({ ...prefs, topStyle: style })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold" 
                      : "bg-elegant-sub/60 text-neutral-300 border-elegant-border hover:border-elegant-gold/40"
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Barba & Ritual */}
        <div className="space-y-2 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl">
          <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-elegant-gold" />
            Arreglo de Barba
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {BEARD_OPTIONS.map((beard) => {
              const selected = prefs.beardStyle === beard;
              return (
                <button
                  key={beard}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setPrefs({ ...prefs, beardStyle: beard })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected 
                      ? "bg-slate-300/20 text-slate-200 border-slate-300/50 font-bold" 
                      : "bg-elegant-sub/60 text-neutral-300 border-elegant-border hover:border-elegant-gold/40"
                  }`}
                >
                  {beard}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Sensibilidad de Piel & Alergias */}
        <div className="space-y-2 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl">
          <label className="text-xs font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            Sensibilidad de Piel / Advertencia
          </label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SKIN_SENSITIVITY_OPTIONS.map((sens) => {
              const selected = prefs.skinSensitivity === sens;
              return (
                <button
                  key={sens}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setPrefs({ ...prefs, skinSensitivity: sens })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected 
                      ? sens.includes("Sensible") || sens.includes("Irritación")
                        ? "bg-rose-950/80 text-rose-300 border-rose-700/60 font-bold"
                        : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-bold"
                      : "bg-elegant-sub/60 text-neutral-300 border-elegant-border hover:border-rose-500/40"
                  }`}
                >
                  {sens}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Productos Favoritos & Frecuencia de Corte */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Productos Favoritos */}
        <div className="md:col-span-8 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl space-y-2">
          <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Droplet className="h-3.5 w-3.5 text-elegant-gold" />
            Productos de Styling Preferidos por el Cliente
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {PRODUCT_OPTIONS.map((prod) => {
              const isChecked = (prefs.favoriteProducts || []).includes(prod);
              return (
                <button
                  key={prod}
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToggleProduct(prod)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isChecked
                      ? "bg-elegant-gold/20 text-elegant-gold border-elegant-gold/50 font-bold"
                      : "bg-elegant-sub/50 text-neutral-400 border-elegant-border opacity-75 hover:opacity-100"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isChecked ? "bg-elegant-gold" : "bg-neutral-600"}`} />
                  {prod}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ciclo Habitual de Corte */}
        <div className="md:col-span-4 bg-elegant-sub/40 border border-elegant-border p-4 rounded-2xl space-y-2">
          <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-elegant-gold" />
            Frecuencia Habitual de Corte
          </label>
          <div className="flex items-center gap-3 pt-1">
            <input
              type="number"
              min="7"
              max="60"
              disabled={readOnly}
              value={avgCycleDays}
              onChange={(e) => setAvgCycleDays(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-center font-mono font-bold rounded-xl text-sm focus:outline-none focus:border-elegant-gold"
            />
            <span className="text-xs text-elegant-text-muted">
              días entre cada visita <br />
              <strong className="text-white text-[11px]">(Habitual: 15-21 días)</strong>
            </span>
          </div>
        </div>

      </div>

      {/* GALERÍA VISUAL DE CORTES DEL CLIENTE */}
      <div className="space-y-4 pt-2 border-t border-elegant-border/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Camera className="h-4 w-4 text-elegant-gold" />
              Galería de Fotos de Cortes Realizados ({photos.length})
            </h4>
            <p className="text-xs text-elegant-text-muted">
              Fotografías de referencia de los cortes anteriores para mantener consistencia y calidad.
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={() => setShowAddPhotoModal(true)}
              className="px-3.5 py-2 bg-elegant-sub hover:bg-elegant-card border border-elegant-gold/40 text-elegant-gold hover:text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Foto de Corte</span>
            </button>
          )}
        </div>

        {/* Grid de Fotos */}
        {photos.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-elegant-border rounded-2xl p-6 bg-elegant-sub/20 space-y-3">
            <Camera className="h-8 w-8 mx-auto text-neutral-600 stroke-1" />
            <p className="text-xs text-elegant-text-muted">
              Aún no hay fotos registradas para este cliente. Añade la primera foto de su corte para guardar su estilo de referencia.
            </p>
            {!readOnly && (
              <button
                onClick={() => setShowAddPhotoModal(true)}
                className="px-4 py-2 bg-elegant-gold/20 text-elegant-gold border border-elegant-gold/40 hover:bg-elegant-gold hover:text-elegant-bg rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Cargar Foto de Referencia</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div 
                key={photo.id}
                className="group relative bg-elegant-sub border border-elegant-border rounded-2xl overflow-hidden hover:border-elegant-gold/50 transition-all shadow-md"
              >
                <div className="aspect-square w-full overflow-hidden relative bg-black/40">
                  <img 
                    src={photo.url} 
                    alt={photo.styleTag || "Corte de pelo"} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Acciones flotantes */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedPhoto(photo)}
                      className="p-1.5 bg-black/60 hover:bg-black text-white rounded-lg backdrop-blur-md cursor-pointer"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg backdrop-blur-md cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Date badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[9px] font-mono font-bold text-white">
                    {photo.date}
                  </span>
                </div>

                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <Tag className="h-3 w-3 text-elegant-gold shrink-0" />
                    {photo.styleTag || "Corte registrado"}
                  </p>
                  {photo.barberName && (
                    <p className="text-[10px] text-elegant-text-muted truncate">
                      Barbero: {photo.barberName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOTAS INTERNAS DEL BARBERO */}
      <div className="space-y-2 pt-2 border-t border-elegant-border/40">
        <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
          📝 Observaciones e Instrucciones para Barberos
        </label>
        <textarea
          disabled={readOnly}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Ej. Le gusta el café negro sin azúcar. Usar navaja solo con gel protector. Siempre quiere la raya del lado izquierdo bien marcada..."
          className="w-full text-xs p-3.5 bg-elegant-sub border border-elegant-border rounded-2xl text-white placeholder-neutral-600 focus:outline-none focus:border-elegant-gold min-h-[80px] leading-relaxed"
        />
      </div>

      {/* MODAL Cargar Nueva Foto */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleAddPhotoSubmit} className="bg-elegant-card border border-elegant-border w-full max-w-lg rounded-3xl p-6 space-y-5 relative shadow-2xl">
            <button
              type="button"
              onClick={() => setShowAddPhotoModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-elegant-gold" />
              <h3 className="text-sm font-extrabold text-white">Añadir Fotografías de Corte a la Ficha</h3>
            </div>

            {/* Preview or Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-elegant-text-muted">Cargar Foto desde Dispositivo</label>
              <div className="border-2 border-dashed border-elegant-border hover:border-elegant-gold rounded-2xl p-4 text-center cursor-pointer bg-elegant-sub/40 transition-colors">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="photo-file-upload"
                />
                <label htmlFor="photo-file-upload" className="cursor-pointer space-y-2 block">
                  {newPhotoDataUrl ? (
                    <div className="relative aspect-video max-h-48 mx-auto rounded-xl overflow-hidden border border-elegant-gold">
                      <img src={newPhotoDataUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-elegant-gold mx-auto" />
                      <p className="text-xs text-white font-semibold">Haz clic para seleccionar una foto de tu celular o PC</p>
                      <p className="text-[10px] text-elegant-text-muted">JPG, PNG o WEBP (Base64)</p>
                    </>
                  )}
                </label>
              </div>

              {/* Sample presets option */}
              {!newPhotoDataUrl && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">O selecciona una plantilla de referencia de ejemplo:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_PRESET_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewPhotoDataUrl(preset.url);
                          setNewPhotoTag(preset.tag);
                        }}
                        className="border border-elegant-border hover:border-elegant-gold rounded-xl overflow-hidden aspect-square relative text-left group cursor-pointer"
                      >
                        <img src={preset.url} alt={preset.tag} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-white p-1 truncate">
                          {preset.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tag / Estilo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white uppercase">Etiqueta del Estilo *</label>
              <input
                type="text"
                required
                value={newPhotoTag}
                onChange={(e) => setNewPhotoTag(e.target.value)}
                placeholder="Ej. Mid Fade + Delineado Navaja"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-xs text-white focus:outline-none focus:border-elegant-gold"
              />
            </div>

            {/* Barbero */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white uppercase">Barbero que Realizó el Corte</label>
              <input
                type="text"
                value={newPhotoBarber}
                onChange={(e) => setNewPhotoBarber(e.target.value)}
                placeholder="Nombre del barbero"
                className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-xs text-white focus:outline-none focus:border-elegant-gold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="px-4 py-2 border border-elegant-border bg-elegant-sub text-white rounded-xl text-xs font-bold hover:bg-elegant-card cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold cursor-pointer"
              >
                Guardar Foto en Ficha
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIGHTBOX FULLSCREEN */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-elegant-card border border-elegant-border rounded-3xl overflow-hidden p-4 space-y-3">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full z-10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[70vh] overflow-hidden rounded-2xl flex items-center justify-center bg-black">
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.styleTag} 
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex justify-between items-center text-xs px-2 pt-1">
              <div>
                <h4 className="font-extrabold text-white text-sm">{selectedPhoto.styleTag || "Corte de Referencia"}</h4>
                <p className="text-elegant-text-muted">
                  Barbero: <span className="text-white font-semibold">{selectedPhoto.barberName || "No registrado"}</span>
                </p>
              </div>
              <span className="font-mono text-elegant-gold font-bold bg-elegant-gold/10 px-3 py-1 rounded-full border border-elegant-gold/30">
                {selectedPhoto.date}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
