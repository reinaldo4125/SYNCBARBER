import React, { useState, useEffect } from "react";
import { CatalogStyle, Service, SalonConfig } from "../types";
import { 
  Scissors, 
  Sparkles, 
  X, 
  Check, 
  Search, 
  HelpCircle, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Smartphone,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";
import { DEFAULT_CATALOG_STYLES } from "../data/defaultCatalogStyles";

interface ClientStyleLookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStyle: (style: CatalogStyle) => void;
  services: Service[];
  config: SalonConfig;
  currentSelectedStyleId?: string;
  formatPrice: (price: number) => string;
}

export default function ClientStyleLookbookModal({
  isOpen,
  onClose,
  onSelectStyle,
  services,
  config,
  currentSelectedStyleId,
  formatPrice
}: ClientStyleLookbookModalProps) {
  const [styles, setStyles] = useState<CatalogStyle[]>(DEFAULT_CATALOG_STYLES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeDetailStyle, setActiveDetailStyle] = useState<CatalogStyle | null>(null);

  const categories = [
    { id: "all", label: "Todos los Estilos" },
    { id: "fade", label: "Fades / Degradados" },
    { id: "clasico", label: "Cortes Clásicos" },
    { id: "barba", label: "Barba & Afeitado" },
    { id: "tendencias", label: "Tendencias & Moda" },
    { id: "diseno", label: "Diseños Freestyle" }
  ];

  // Fetch styles from tenant backend
  useEffect(() => {
    if (!isOpen) return;

    const loadStyles = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/catalog-styles");
        if (res.ok) {
          const data = await res.json();
          if (data.styles && Array.isArray(data.styles) && data.styles.length > 0) {
            // Filter only active styles for client
            const activeOnly = data.styles.filter((s: CatalogStyle) => s.isActive);
            if (activeOnly.length > 0) {
              setStyles(activeOnly);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar estilos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStyles();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredStyles = styles.filter(s => {
    const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const handlePickStyle = (style: CatalogStyle) => {
    onSelectStyle(style);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn text-white">
      <div className="bg-elegant-card border border-elegant-gold/40 w-full max-w-4xl rounded-3xl shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-elegant-border bg-gradient-to-r from-neutral-900 via-elegant-card to-neutral-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-elegant-gold/20 border border-elegant-gold/40 flex items-center justify-center text-elegant-gold shrink-0 shadow-md">
              <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-elegant-gold text-black font-extrabold px-2 py-0.2 rounded uppercase tracking-wider">
                  Lookbook {config.name || "Barbería"}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Sparkles className="h-3 w-3" /> Guía Visual
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Catálogo de Cortes & Estilos de Referencia
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800/80 p-2 rounded-full hover:bg-neutral-700 transition-colors cursor-pointer"
            title="Cerrar catálogo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-elegant-sub/60 border-b border-elegant-border space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar corte (ej: Fade, Pompadour, Barba, Crop)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-elegant-gold"
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

            <p className="text-[11px] text-elegant-text-muted hidden sm:block">
              Toca la foto que te guste para adjuntarla a tu cita
            </p>
          </div>

          {/* Categories Tab Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-elegant-gold text-black shadow-md shadow-amber-500/10 scale-102"
                    : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lookbook Gallery Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <div className="animate-spin h-8 w-8 border-2 border-elegant-gold border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-neutral-400">Cargando catálogo visual...</p>
            </div>
          ) : filteredStyles.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Scissors className="h-10 w-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-bold text-white">No se encontraron estilos en esta búsqueda</p>
              <button
                onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                className="text-xs text-elegant-gold hover:underline"
              >
                Ver todos los estilos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStyles.map((style) => {
                const isSelected = currentSelectedStyleId === style.id;
                const linkedService = services.find(s => s.id === style.serviceId);

                return (
                  <div
                    key={style.id}
                    className={`bg-neutral-900 border rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                      isSelected 
                        ? "border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20" 
                        : "border-neutral-800 hover:border-elegant-gold/60"
                    }`}
                    onClick={() => handlePickStyle(style)}
                  >
                    {/* Photo with Overlay */}
                    <div className="relative aspect-4/3 overflow-hidden bg-neutral-950">
                      <img
                        src={style.photoUrl}
                        alt={style.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                          {style.categoryLabel || style.category}
                        </span>

                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black flex items-center gap-1 shadow-md animate-scaleUp">
                            <Check className="h-3 w-3 stroke-[3]" /> Seleccionado
                          </span>
                        )}
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <h4 className="text-sm font-extrabold text-white leading-snug drop-shadow-md">
                          {style.title}
                        </h4>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {style.description && (
                          <p className="text-[11.5px] text-neutral-300 leading-relaxed line-clamp-2">
                            {style.description}
                          </p>
                        )}

                        <div className="space-y-1 text-[10.5px]">
                          {style.recommendedFace && (
                            <p className="text-neutral-400">
                              <span className="text-amber-400 font-semibold">Rostro:</span> {style.recommendedFace}
                            </p>
                          )}
                          {style.recommendedHair && (
                            <p className="text-neutral-400">
                              <span className="text-emerald-400 font-semibold">Cabello:</span> {style.recommendedHair}
                            </p>
                          )}
                          {linkedService && (
                            <p className="text-cyan-300 font-semibold">
                              Servicio: {linkedService.name} ({formatPrice(linkedService.price)})
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select CTA Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickStyle(style);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500 text-black"
                            : "bg-elegant-gold hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 active:scale-95"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>Corte Seleccionado</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="h-3.5 w-3.5" />
                            <span>Quiero este Corte</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-neutral-400 text-[11px] hidden sm:inline">
            El peluquero podrá ver esta foto de referencia durante tu cita.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Lookbook
          </button>
        </div>

      </div>
    </div>
  );
}
