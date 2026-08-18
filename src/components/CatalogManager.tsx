import React, { useState, useEffect, useRef } from "react";
import { 
  CatalogStyle, 
  Service, 
  SalonConfig 
} from "../types";
import { 
  Scissors, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Upload, 
  Camera, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  Tag,
  SlidersHorizontal,
  Bookmark,
  Info,
  HelpCircle,
  Smartphone
} from "lucide-react";

interface CatalogManagerProps {
  services: Service[];
  config: SalonConfig;
  formatPrice: (price: number) => string;
}

export default function CatalogManager({
  services,
  config,
  formatPrice
}: CatalogManagerProps) {
  const [styles, setStyles] = useState<CatalogStyle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStyle, setEditingStyle] = useState<CatalogStyle | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewStyle, setPreviewStyle] = useState<CatalogStyle | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Form State
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCategory, setFormCategory] = useState<CatalogStyle["category"]>("fade");
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formRecommendedFace, setFormRecommendedFace] = useState<string>("");
  const [formRecommendedHair, setFormRecommendedHair] = useState<string>("");
  const [formServiceId, setFormServiceId] = useState<string>("");
  const [formTags, setFormTags] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isCompressingImg, setIsCompressingImg] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "all", label: "Todos los Cortes" },
    { id: "fade", label: "Fades / Degradados" },
    { id: "clasico", label: "Cortes Clásicos" },
    { id: "barba", label: "Barba & Afeitado" },
    { id: "tendencias", label: "Tendencias & Moda" },
    { id: "diseno", label: "Diseños & Freestyle" }
  ];

  // Fetch Styles
  const fetchStyles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/catalog-styles");
      if (res.ok) {
        const data = await res.json();
        if (data.styles) {
          setStyles(data.styles);
        }
      }
    } catch (err) {
      console.error("Error al cargar estilos del catálogo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  // Open modal for new style
  const handleOpenNewModal = () => {
    setEditingStyle(null);
    setFormTitle("");
    setFormCategory("fade");
    setFormPhotoUrl("");
    setFormDescription("");
    setFormRecommendedFace("");
    setFormRecommendedHair("");
    setFormServiceId(services.length > 0 ? services[0].id : "");
    setFormTags("");
    setFormIsActive(true);
    setErrorMessage("");
    setShowAddModal(true);
  };

  // Open modal for editing style
  const handleOpenEditModal = (style: CatalogStyle) => {
    setEditingStyle(style);
    setFormTitle(style.title);
    setFormCategory(style.category);
    setFormPhotoUrl(style.photoUrl);
    setFormDescription(style.description || "");
    setFormRecommendedFace(style.recommendedFace || "");
    setFormRecommendedHair(style.recommendedHair || "");
    setFormServiceId(style.serviceId || "");
    setFormTags(style.tags ? style.tags.join(", ") : "");
    setFormIsActive(style.isActive);
    setErrorMessage("");
    setShowAddModal(true);
  };

  // Handle client-side image compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).");
      return;
    }

    setIsCompressingImg(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setFormPhotoUrl(compressedDataUrl);
        }
        setIsCompressingImg(false);
      };

      img.onerror = () => {
        setIsCompressingImg(false);
        setErrorMessage("Error al procesar la imagen.");
      };
    };

    reader.readAsDataURL(file);
  };

  // Save Style (Create or Update)
  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMessage("Por favor ingresa un nombre para el corte.");
      return;
    }
    if (!formPhotoUrl.trim()) {
      setErrorMessage("Por favor sube o proporciona una foto de referencia para el corte.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const tagsArray = formTags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      photoUrl: formPhotoUrl.trim(),
      description: formDescription.trim(),
      recommendedFace: formRecommendedFace.trim(),
      recommendedHair: formRecommendedHair.trim(),
      serviceId: formServiceId || null,
      tags: tagsArray,
      isActive: formIsActive
    };

    try {
      let res;
      if (editingStyle) {
        res = await fetch(`/api/catalog-styles/${editingStyle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/catalog-styles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.styles) {
          setStyles(data.styles);
        } else {
          await fetchStyles();
        }
        setShowAddModal(false);
        setSaveSuccessMsg(editingStyle ? "¡Estilo actualizado correctamente!" : "¡Nuevo estilo agregado al catálogo!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "No se pudo guardar el estilo.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Error de conexión al guardar el estilo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Style Active Status
  const handleToggleActive = async (style: CatalogStyle) => {
    try {
      const res = await fetch(`/api/catalog-styles/${style.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !style.isActive })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styles) setStyles(data.styles);
        else fetchStyles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Style
  const handleDeleteStyle = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${title}" del catálogo?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/catalog-styles/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styles) setStyles(data.styles);
        else fetchStyles();
        setSaveSuccessMsg("Estilo eliminado con éxito.");
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset to default styles
  const handleResetDefaults = async () => {
    if (!window.confirm("¿Deseas restaurar la colección predeterminada de cortes profesionales? Esta acción agregará los estilos más populares.")) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/catalog-styles/reset-defaults", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styles) setStyles(data.styles);
        setSaveSuccessMsg("¡Catálogo restaurado a los cortes recomendados!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered styles
  const filteredStyles = styles.filter(s => {
    const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-white" id="catalog-manager">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-elegant-card to-neutral-900 border border-elegant-gold/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12 pointer-events-none">
          <Scissors className="h-56 w-56 text-elegant-gold" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-elegant-gold/20 text-elegant-gold border border-elegant-gold/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Catálogo & Lookbook Visual
              </span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {styles.filter(s => s.isActive).length} Estilos Activos
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans text-white">
              Catálogo de Cortes & Estilos de {config.name || "la Barbería"}
            </h1>
            <p className="text-xs md:text-sm text-elegant-text-muted max-w-2xl leading-relaxed">
              Permite que los clientes elijan su corte de referencia con 1 solo clic al agendar. El barbero verá la foto elegida en su tablet o celular para un resultado milimétrico y sin confusiones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cargar colección de cortes populares"
            >
              <RefreshCw className="h-3.5 w-3.5 text-elegant-gold" />
              <span>Restaurar Fábrica</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 rounded-xl bg-elegant-gold hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Nuevo Estilo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-elegant-card border border-elegant-border rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por corte, estilo o etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-elegant-text-muted">
            Mostrando <strong>{filteredStyles.length}</strong> de <strong>{styles.length}</strong> cortes
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-800">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-elegant-gold text-black shadow-md shadow-amber-500/10 scale-102"
                  : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Styles Grid */}
      {isLoading ? (
        <div className="text-center py-16 space-y-3 bg-elegant-card border border-elegant-border rounded-3xl">
          <div className="animate-spin h-8 w-8 border-2 border-elegant-gold border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-elegant-text-muted">Cargando catálogo de cortes y estilos...</p>
        </div>
      ) : filteredStyles.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-4 bg-elegant-card border border-dashed border-neutral-700 rounded-3xl">
          <div className="h-16 w-16 bg-elegant-sub rounded-2xl flex items-center justify-center mx-auto text-neutral-500">
            <Scissors className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-white">No se encontraron estilos en esta categoría</h3>
            <p className="text-xs text-neutral-400">
              {searchQuery ? "Intenta con otra palabra clave o limpia el filtro de búsqueda." : "Añade nuevos cortes o restaura los estilos recomendados."}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleOpenNewModal}
              className="px-4 py-2 bg-elegant-gold text-black rounded-xl text-xs font-bold cursor-pointer"
            >
              + Agregar Primer Estilo
            </button>
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Restaurar Estilos de Fábrica
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStyles.map((style) => {
            const linkedService = services.find(s => s.id === style.serviceId);

            return (
              <div 
                key={style.id}
                className={`bg-elegant-card border rounded-3xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between group ${
                  style.isActive 
                    ? "border-elegant-border hover:border-elegant-gold/60" 
                    : "border-neutral-800 opacity-60 bg-neutral-900/50"
                }`}
              >
                {/* Image Section */}
                <div className="relative aspect-4/3 overflow-hidden bg-neutral-900">
                  <img
                    src={style.photoUrl}
                    alt={style.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      {style.categoryLabel || style.category}
                    </span>

                    <button
                      onClick={() => handleToggleActive(style)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                        style.isActive
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-600"
                          : "bg-red-950/80 text-red-400 border-red-800"
                      }`}
                      title={style.isActive ? "Desactivar del catálogo" : "Activar en el catálogo"}
                    >
                      {style.isActive ? "✓ Activo" : "✕ Oculto"}
                    </button>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-extrabold text-white leading-tight drop-shadow-md">
                      {style.title}
                    </h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {style.description ? (
                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                        {style.description}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">Sin descripción detallada.</p>
                    )}

                    {/* Metadata tags */}
                    <div className="space-y-1 pt-1 text-[10.5px]">
                      {style.recommendedFace && (
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <span className="text-amber-400 font-bold">Rostro:</span>
                          <span className="truncate text-neutral-300">{style.recommendedFace}</span>
                        </div>
                      )}
                      {style.recommendedHair && (
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <span className="text-emerald-400 font-bold">Cabello:</span>
                          <span className="truncate text-neutral-300">{style.recommendedHair}</span>
                        </div>
                      )}
                      {linkedService && (
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <span className="text-cyan-400 font-bold">Servicio:</span>
                          <span className="truncate text-white font-medium">
                            {linkedService.name} ({formatPrice(linkedService.price)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags Pills */}
                    {style.tags && style.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {style.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="bg-neutral-800 text-neutral-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        setPreviewStyle(style);
                        setShowPreviewModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Vista ampliada"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Ver</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(style)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                        title="Editar estilo"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStyle(style.id, style.title)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer transition-colors"
                        title="Eliminar corte"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Style Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-gold/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-5 text-white max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white bg-neutral-800 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-elegant-gold/20 border border-elegant-gold/30 flex items-center justify-center text-elegant-gold shrink-0">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingStyle ? "Editar Corte del Catálogo" : "Agregar Nuevo Corte / Estilo"}
                </h3>
                <p className="text-xs text-neutral-400">
                  {editingStyle ? "Modifica los datos y foto del corte." : "Sube una foto de trabajo o modelo para que los clientes la elijan."}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="bg-red-950/60 border border-red-800/80 p-3 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveStyle} className="space-y-4 text-xs">
              {/* Name / Title */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 block">
                  Nombre del Corte / Estilo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mid Fade con Textura, Buzz Cut Militar, Ritual Barba..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 block">
                  Categoría del Corte *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border rounded-xl text-white focus:outline-none focus:border-elegant-gold cursor-pointer"
                >
                  <option value="fade">Degradados & Fades (Low, Mid, High, Taper)</option>
                  <option value="clasico">Cortes Clásicos & Ejecutivos (Pompadour, Side Part)</option>
                  <option value="barba">Barba & Afeitado Tradicional</option>
                  <option value="tendencias">Tendencias & Moda (Mullet, Burst Fade, Crop)</option>
                  <option value="diseno">Diseños & Freestyle con Navaja</option>
                  <option value="general">Estilo General</option>
                </select>
              </div>

              {/* Photo Upload & Preview */}
              <div className="space-y-2">
                <label className="font-bold text-neutral-300 block">
                  Foto de Referencia del Corte *
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Photo Preview Box */}
                  <div className="h-28 w-28 rounded-2xl bg-neutral-900 border border-neutral-700 overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner">
                    {formPhotoUrl ? (
                      <img
                        src={formPhotoUrl}
                        alt="Previsualización"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-2 text-neutral-500">
                        <Camera className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[9px]">Sin foto</span>
                      </div>
                    )}
                    {isCompressingImg && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-elegant-gold">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 flex-1 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5 text-elegant-gold" />
                      <span>Subir Foto desde mi Celular / PC</span>
                    </button>

                    <div className="relative">
                      <span className="text-[9px] text-neutral-400 block mb-1">O escribe una URL de imagen:</span>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/corte.jpg"
                        value={formPhotoUrl.startsWith("data:") ? "" : formPhotoUrl}
                        onChange={(e) => setFormPhotoUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-elegant-sub border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 block">
                  Descripción / Detalles del Estilo
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Degradado medio con acabado afeitado a piel y tijera en la zona superior..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold resize-none"
                />
              </div>

              {/* Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300 block">
                    Tipo de Rostro Recomendado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ovalado, Cuadrado, Redondo..."
                    value={formRecommendedFace}
                    onChange={(e) => setFormRecommendedFace(e.target.value)}
                    className="w-full px-3 py-2 bg-elegant-sub border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-300 block">
                    Tipo de Cabello Recomendado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lacio, Ondulado, Rizado, Grueso..."
                    value={formRecommendedHair}
                    onChange={(e) => setFormRecommendedHair(e.target.value)}
                    className="w-full px-3 py-2 bg-elegant-sub border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
                  />
                </div>
              </div>

              {/* Linked Service */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 block">
                  Vincular a Servicio del Salón (Opcional)
                </label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border rounded-xl text-white focus:outline-none focus:border-elegant-gold cursor-pointer"
                >
                  <option value="">-- Sin servicio vinculado (Corte informativo) --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {formatPrice(s.price)} ({s.duration} min)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">
                  Al elegir este corte, se seleccionará automáticamente este servicio y su precio.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 block">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  placeholder="Mid Fade, Textura, Tijera, Matte"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 bg-elegant-sub border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-neutral-300 font-bold cursor-pointer">
                  Mostrar en el catálogo público para agendamiento de clientes
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isCompressingImg}
                  className="px-5 py-2 bg-elegant-gold hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingStyle ? "Actualizar Estilo" : "Guardar Estilo"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal for Single Style */}
      {showPreviewModal && previewStyle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-gold/40 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative text-white">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-3 right-3 text-white bg-black/60 p-1.5 rounded-full hover:bg-black transition-colors z-20 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="aspect-4/3 w-full bg-neutral-900 relative">
              <img
                src={previewStyle.photoUrl}
                alt={previewStyle.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                <span className="text-[10px] bg-elegant-gold text-black font-extrabold px-2 py-0.5 rounded-md uppercase">
                  {previewStyle.categoryLabel || previewStyle.category}
                </span>
                <h3 className="text-lg font-black text-white mt-1">{previewStyle.title}</h3>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-neutral-300 leading-relaxed">
                {previewStyle.description || "Corte de autor diseñado con precisión."}
              </p>

              <div className="bg-neutral-900/70 border border-neutral-800 p-3 rounded-xl space-y-1.5">
                {previewStyle.recommendedFace && (
                  <p className="text-neutral-300">
                    <strong className="text-amber-400">Rostro sugerido:</strong> {previewStyle.recommendedFace}
                  </p>
                )}
                {previewStyle.recommendedHair && (
                  <p className="text-neutral-300">
                    <strong className="text-emerald-400">Tipo de cabello:</strong> {previewStyle.recommendedHair}
                  </p>
                )}
                {previewStyle.serviceName && (
                  <p className="text-neutral-300">
                    <strong className="text-cyan-400">Servicio:</strong> {previewStyle.serviceName}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Previsualización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
