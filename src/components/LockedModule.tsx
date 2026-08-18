import { ShieldAlert, Sparkles, ArrowRight, CheckCircle2, Lock } from "lucide-react";

interface LockedModuleProps {
  moduleName: string;
  requiredLicense: "profesional" | "premium";
  activeLicense: "basica" | "profesional" | "premium";
  onNavigateToSettings: () => void;
}

export default function LockedModule({
  moduleName,
  requiredLicense,
  activeLicense,
  onNavigateToSettings,
}: LockedModuleProps) {
  const licenseNames = {
    basica: "🥉 Básica (Bronce)",
    profesional: "🥈 Profesional (Plata)",
    premium: "🥇 Premium (Oro)",
  };

  const isPremiumUpgrade = requiredLicense === "premium";

  return (
    <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-10 shadow-lg text-center max-w-2xl mx-auto my-12 space-y-6 animate-scaleUp">
      <div className="mx-auto w-16 h-16 bg-rose-950/40 border border-rose-800/40 rounded-full flex items-center justify-center text-rose-400 relative">
        <Lock className="h-7 w-7" />
        <span className="absolute -bottom-1 -right-1 p-1 bg-elegant-gold text-elegant-bg rounded-full text-[8px] font-bold uppercase">
          PRO
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white font-sans">
          Módulo Bloqueado: <span className="text-elegant-gold">{moduleName}</span>
        </h2>
        <p className="text-xs text-elegant-text-muted leading-relaxed max-w-md mx-auto">
          Este módulo de alta eficiencia no está disponible bajo tu licencia activa actual:{" "}
          <span className="text-white font-bold">{licenseNames[activeLicense] || activeLicense}</span>.
        </p>
      </div>

      {/* Upgrade Benefits Card */}
      <div className="bg-elegant-sub/50 border border-elegant-border rounded-2xl p-5 text-left space-y-4 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-elegant-gold">
            {isPremiumUpgrade ? "Beneficios Plan Premium" : "Beneficios Plan Profesional"}
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono text-right shrink-0">
            {isPremiumUpgrade ? "COP $179.000/mes (~$45 USD)" : "COP $99.000/mes (~$25 USD)"}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {isPremiumUpgrade ? (
            <>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Comisiones & Propinas Automatizadas:</span> Liquidación automática con porcentaje configurable por barbero y cobro de productos.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Cierres de Caja Ciegos & Auditoría:</span> Arqueo detallado de efectivo, transferencias y reportes Z diarios.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Barberos Ilimitados:</span> Agrega todo tu equipo sin límites de usuarios ni comisiones ocultas.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Editor de Catálogo de Cortes (Lookbook):</span> Sube fotos de tus propios trabajos y tendencias para que tus clientes elijan su estilo.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Inventario & Nevera POS:</span> Control de stock de bebidas, pomadas y cargos directos en la silla.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Membresías VIP & Clientes:</span> Fichas con historial y clubes de suscripción con descuentos automáticos.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Calendario Interactivo & Hasta 5 Barberos:</span> Vista de cuadrícula semanal para reacomodar citas al instante.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onNavigateToSettings}
          className="px-6 py-3 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center space-x-2"
        >
          <span>Mejorar mi Licencia Ahora</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
