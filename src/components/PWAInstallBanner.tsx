import React, { useState, useEffect } from "react";
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { SalonConfig } from "../types";

interface PWAInstallProps {
  config: SalonConfig;
  customTriggerText?: string;
  showFloatingBanner?: boolean;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem("pwa_install_dismissed") === "true";
  });

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const checkStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");
    
    setIsStandalone(checkStandalone);

    // Platform detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobileDevice = isIosDevice || isAndroidDevice || window.innerWidth < 768;

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isMobileDevice);

    // Listen for Android/Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("[PWA] El usuario aceptó instalar la app");
        setDeferredPrompt(null);
        setShowModal(false);
      } else {
        console.log("[PWA] El usuario canceló la instalación");
      }
    } else {
      // If no native prompt (e.g. iOS or manual), show visual guidance modal
      setShowModal(true);
    }
  };

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  return {
    deferredPrompt,
    isStandalone,
    isIOS,
    isAndroid,
    isMobile,
    showModal,
    setShowModal,
    triggerInstall,
    isBannerDismissed,
    dismissBanner
  };
}

export default function PWAInstallBanner({ config }: PWAInstallProps) {
  const {
    isStandalone,
    isIOS,
    isAndroid,
    showModal,
    setShowModal,
    triggerInstall,
    isBannerDismissed,
    dismissBanner
  } = usePWAInstall();

  // If already installed, don't show the floating prompt
  if (isStandalone) return null;

  const salonName = config.name || "Nuestra Barbería";

  return (
    <>
      {/* Floating Smart Banner for Mobile / QR Visitors */}
      {!isBannerDismissed && (
        <div 
          className="bg-elegant-card border border-elegant-border hover:border-elegant-gold/30 rounded-2xl p-3.5 sm:p-4.5 shadow-lg text-white transition-all relative"
          id="pwa-install-banner"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Top row in mobile / Left side in desktop */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-elegant-gold/15 border border-elegant-gold/30 flex items-center justify-center text-elegant-gold shrink-0 mt-0.5 sm:mt-0">
                <Smartphone className="h-5 w-5 animate-pulse" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] bg-elegant-gold text-black font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">
                    Acceso Rápido
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="h-3 w-3" /> 1-Clic
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                  Instala el Acceso Directo de {salonName}
                </h4>

                <p className="text-[11px] text-elegant-text-muted leading-relaxed hidden xs:block sm:block">
                  Agrega el ícono a la pantalla de inicio de tu celular para agendar turnos al instante.
                </p>
              </div>

              {/* Close button in mobile top right */}
              <button
                onClick={dismissBanner}
                className="sm:hidden text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
                title="Cerrar aviso"
                id="pwa-dismiss-btn-mobile"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions: Full width comfortable button on mobile, inline on desktop */}
            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-elegant-border/40">
              <button
                onClick={triggerInstall}
                className="flex-1 sm:flex-initial px-4 py-2 sm:px-4 sm:py-2 bg-elegant-gold hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95"
                id="pwa-trigger-install-btn"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>Instalar App</span>
              </button>

              {/* Close button on desktop */}
              <button
                onClick={dismissBanner}
                className="hidden sm:flex text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                title="Cerrar aviso"
                id="pwa-dismiss-btn-desktop"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: How to add to home screen */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-gold/40 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-5 text-white max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white bg-neutral-800/60 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-12 w-12 rounded-2xl bg-elegant-gold/20 border border-elegant-gold/40 flex items-center justify-center text-elegant-gold shrink-0 shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-elegant-gold uppercase tracking-wider block">
                  PWA • Acceso Directo Móvil
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Instalar {salonName} en tu Celular
                </h3>
              </div>
            </div>

            <p className="text-xs text-elegant-text-muted leading-relaxed">
              Disfruta de la mejor experiencia: no ocupa espacio en tu memoria, no requiere App Store ni Google Play y te permite agendar con 1 solo toque desde tu pantalla de inicio.
            </p>

            {/* Platform specific instructions */}
            {isIOS ? (
              /* Instrucciones iOS Safari */
              <div className="bg-elegant-sub/80 border border-elegant-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <span>🍎 Pasos para iPhone / iPad (Safari):</span>
                </div>

                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="h-7 w-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">1. Toca el botón Compartir</p>
                      <p className="text-[11px] text-neutral-400">
                        En la barra inferior (o superior) de Safari, presiona el icono de compartir con la flecha hacia arriba.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="h-7 w-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">2. Selecciona "Agregar a Inicio"</p>
                      <p className="text-[11px] text-neutral-400">
                        Desplaza hacia abajo en las opciones y pulsa <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Agregar al inicio"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="h-7 w-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">3. Toca "Agregar"</p>
                      <p className="text-[11px] text-neutral-400">
                        Confirma en la esquina superior derecha y tendrás el icono listo en tu pantalla de inicio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
              /* Instrucciones Android */
              <div className="bg-elegant-sub/80 border border-elegant-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span>🤖 Pasos para Android (Chrome):</span>
                </div>

                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="h-7 w-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono">
                      ⋮
                    </div>
                    <div>
                      <p className="font-bold text-white">1. Abre el Menú de Chrome</p>
                      <p className="text-[11px] text-neutral-400">
                        Toca los 3 puntos verticales en la esquina superior derecha.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                    <div className="h-7 w-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">2. Pulsa "Instalar aplicación" o "Agregar a la pantalla principal"</p>
                      <p className="text-[11px] text-neutral-400">
                        Aparecerá el diálogo para crear el icono en tu teléfono.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Instrucciones Desktop / Computadora */
              <div className="bg-elegant-sub/80 border border-elegant-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <span>💻 En Computadora (Chrome / Edge / Navegadores):</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Haz clic en el icono de <strong>Instalar</strong> <Download className="inline h-3.5 w-3.5 text-elegant-gold" /> ubicado en la barra de direcciones de tu navegador (a la derecha de la URL) o guárdalo en tus marcadores con <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Ctrl + D</kbd>.
                </p>
              </div>
            )}

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-neutral-900/40 border border-neutral-800 p-2.5 rounded-xl flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-neutral-300">0% Consumo de Memoria</span>
              </div>
              <div className="bg-neutral-900/40 border border-neutral-800 p-2.5 rounded-xl flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-neutral-300">Agendamiento Instantáneo</span>
              </div>
            </div>

            {/* Bottom action */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-elegant-gold hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Compact Quick Action Header Button
export function PWAHeaderButton({ config }: { config: SalonConfig }) {
  const { isStandalone, triggerInstall } = usePWAInstall();

  if (isStandalone) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[10px] text-emerald-400 font-bold">
        <CheckCircle2 className="h-3 w-3" />
        <span>App Instalada</span>
      </div>
    );
  }

  return (
    <button
      onClick={triggerInstall}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-elegant-gold/20 to-amber-500/10 hover:from-elegant-gold/30 hover:to-amber-500/20 border border-elegant-gold/50 text-[11px] font-bold text-elegant-gold transition-all shadow-xs cursor-pointer active:scale-95 group"
      title="Crear acceso directo en tu celular"
    >
      <Smartphone className="h-3.5 w-3.5 text-elegant-gold group-hover:animate-bounce" />
      <span>Instalar App</span>
      <span className="bg-elegant-gold text-black text-[9px] px-1 py-0.2 rounded font-extrabold">1-Clic</span>
    </button>
  );
}

// Post-Booking Success Install Prompt Card
export function PWABookingSuccessPrompt({ config }: { config: SalonConfig }) {
  const { isStandalone, triggerInstall } = usePWAInstall();

  if (isStandalone) return null;

  return (
    <div className="bg-gradient-to-r from-neutral-900 to-elegant-card border border-elegant-gold/40 rounded-2xl p-4 text-left space-y-2.5 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-elegant-gold/20 text-elegant-gold flex items-center justify-center font-bold">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">¿Quieres agendar más rápido la próxima vez?</h4>
            <p className="text-[10px] text-elegant-text-muted">Crea el acceso directo en la pantalla de tu celular sin descargar nada.</p>
          </div>
        </div>
      </div>
      <button
        onClick={triggerInstall}
        className="w-full py-2 bg-elegant-gold hover:bg-amber-400 text-black rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Guardar Acceso Directo de {config.name || "la Barbería"}</span>
      </button>
    </div>
  );
}
