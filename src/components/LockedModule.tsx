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
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-elegant-gold">
            {isPremiumUpgrade ? "Beneficios Plan Premium" : "Beneficios Plan Profesional"}
          </span>
          <span className="text-xs font-bold text-emerald-400">Desde {isPremiumUpgrade ? "$59/mes" : "$35/mes"}</span>
        </div>

        <div className="space-y-2 text-xs">
          {isPremiumUpgrade ? (
            <>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Comisiones & Propinas Avanzadas:</span> Gestiona los pagos individuales a cada barbero de forma automatizada.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Estadísticas Financieras:</span> Gráficos e informes de ingresos totales de tu peluquería en tiempo real.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Membresías VIP:</span> Fideliza clientes con planes de suscripción mensual y puntos de lealtad.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Calendario Interactivo Drag & Drop:</span> Organiza y re-agenda citas visualmente en segundos.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Gestión de Ausencias:</span> Bloquea la agenda de barberos por vacaciones, licencias o enfermedad.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-elegant-text">
                  <span className="font-bold text-white">Gestión de Clientes:</span> Accede a un historial clínico o notas detalladas de cada cliente.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onNavigateToSettings}
          className="px-6 py-3 bg-elegant-gold hover:bg-amber-500 text-elegant-bg font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center space-x-2"
        >
          <span>Mejorar mi Licencia Ahora</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
