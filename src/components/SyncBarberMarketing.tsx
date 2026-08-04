import { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Zap, 
  Calendar, 
  Users, 
  TrendingUp, 
  DollarSign, 
  ArrowRight, 
  Layers, 
  Check, 
  Cpu, 
  Shield, 
  RefreshCw, 
  Award,
  BookOpen,
  Mail,
  Linkedin,
  Phone,
  Clock,
  ChevronRight,
  TrendingDown,
  Percent,
  CheckCircle2,
  Lock,
  ThumbsUp,
  AlertTriangle,
  Smartphone,
  History,
  Gift,
  ShoppingBag,
  Scissors,
  Bot
} from "lucide-react";

interface SyncBarberMarketingProps {
  onEnterApp: (role: "client" | "admin" | "developer") => void;
  formatPrice: (price: number) => string;
}

export default function SyncBarberMarketing({ onEnterApp, formatPrice }: SyncBarberMarketingProps) {
  // ROI Simulator State
  const [appointmentsPerMonth, setAppointmentsPerMonth] = useState<number>(300);
  const [avgPrice, setAvgPrice] = useState<number>(15000);
  const [barberCount, setBarberCount] = useState<number>(3);

  // Math for ROI - simplified and focused on barber-friendly stats
  const hoursSavedPerMonth = Math.round(appointmentsPerMonth * 0.15); // 9 mins per appointment
  const estimatedNoShowsReduced = Math.round(appointmentsPerMonth * 0.10); // 10% reduction
  const recoverySavings = estimatedNoShowsReduced * avgPrice;
  const adminValueSaved = hoursSavedPerMonth * 7000; 
  const totalMonthlyBenefit = recoverySavings + adminValueSaved;

  // Active FAQ index
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "¿Mis clientes tienen que descargar alguna aplicación pesada?",
      a: "¡No, para nada! Tus clientes no necesitan descargar nada ni registrarse con contraseñas complejas. Solo entran a tu enlace desde WhatsApp o Instagram, eligen el servicio, el barbero, la hora ¡y listo! Reservan en menos de 10 segundos."
    },
    {
      q: "No soy bueno con la tecnología, ¿es difícil configurar mi barbería?",
      a: "Diseñamos SYNCBARBER pensando exactamente en barberos que prefieren cortar cabello antes que usar computadoras. El sistema viene listo para usarse. Puedes añadir tus servicios, tus barberos y tus horarios en un asistente de 3 pasos muy sencillo."
    },
    {
      q: "¿Cómo calculo las comisiones de mis barberos?",
      a: "El sistema lo hace por ti al instante. En el plan Premium, tú solo defines qué porcentaje o comisión fija se lleva cada barbero por servicio. Conforme los clientes van pagando sus turnos, la plataforma divide el dinero automáticamente y te muestra un reporte de nómina limpio al final de la semana o mes."
    },
    {
      q: "¿Qué pasa si un cliente reserva y no asiste (No-Show)?",
      a: "El sistema cuenta con un control de clientes VIP y registro de ausentismo. Puedes ver el historial de asistencia de cada persona y bloquear a los clientes problemáticos que reservan turnos y no se presentan, protegiendo el tiempo de tus barberos."
    },
    {
      q: "¿Cómo ayuda el Historial de Citas y Fórmulas de Corte?",
      a: "Tanto el cliente como el barbero pueden revisar en qué fecha se realizó el último corte y consultar las notas técnicas guardadas (como peines utilizados, mezcla de tintes o estilo preferido). Así aseguras una atención 100% personalizada en cada visita."
    },
    {
      q: "¿Cómo funciona el Agendamiento por Ciclo Habitual?",
      a: "SYNCBARBER detecta automáticamente la frecuencia con la que se corta cada cliente (ej. cada 15 o 21 días). Al ingresar a reservar, el sistema le sugiere directamente la fecha y hora sugerida de su próximo servicio para evitar que busque otra opción."
    },
    {
      q: "¿Puedo vender productos de barbería y hacer cierre de caja diario?",
      a: "¡Sí! El módulo de Punto de Venta (POS) te permite registrar ventas de ceras, aceites o bebidas junto con el corte. Al final de la jornada, generas el Reporte de Cierre de Caja con el desglose exacto de efectivo, transferencias y comisiones."
    }
  ];

  return (
    <div className="space-y-16 py-4">
      
      {/* HERO SECTION - WARM & DIRECT */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E1524] via-[#060A13] to-[#162237] border border-[#1F314D] p-8 md:p-14 text-center space-y-6 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 rounded-full text-[10px] md:text-xs font-bold tracking-wider uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>¡Adiós al cuaderno! La agenda inteligente para tu local</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-5xl mx-auto leading-tight">
          La Agenda Digital que tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A267] to-cyan-400">Clientes Aman</span> y que Ordena tus Ganancias
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-gray-300 max-w-3xl mx-auto leading-relaxed font-sans">
          ¿Cansado de interrumpir tus cortes para responder el teléfono o calcular comisiones en papel al final del día? 
          <strong> SYNCBARBER</strong> organiza tus turnos en vivo, envía recordatorios automáticos y calcula la nómina de tus barberos al instante.
        </p>

        {/* Core Quick CTAs */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 max-w-2xl mx-auto">
          <button
            onClick={() => onEnterApp("client")}
            className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-[#060A13] font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Smartphone className="h-4 w-4" />
            <span>Ver demo interactiva (Cliente)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onEnterApp("admin")}
            className="w-full sm:w-auto px-8 py-4 bg-[#162237] border border-[#1F314D] hover:border-cyan-500/40 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield className="h-4 w-4 text-[#C5A267]" />
            <span>Ingresar como Administrador</span>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 font-medium">
          💡 Puedes probar ambos paneles (Cliente y Administrador) alternándolos en el menú superior para ver cómo se sincronizan en vivo.
        </p>
      </section>

      {/* LATEST UPDATES & NEW POWERFUL MODULES */}
      <section className="space-y-8 bg-[#0E1524]/80 border border-amber-500/20 rounded-3xl p-6 md:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1F314D] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider">
              <Zap className="h-3 w-3 animate-bounce text-amber-400" />
              Novedades de la Última Actualización 2026
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              Diseñado para la Barbería del Futuro
            </h2>
          </div>
          <button
            onClick={() => onEnterApp("client")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <span>Explorar en Vivo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: Historial & Fórmulas */}
          <div className="bg-[#162237]/80 border border-[#1F314D] hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <History className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Historial & Fórmulas</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">Cliente</span>
            </h3>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Tus clientes ahora consultan su historial de citas realizadas con sus barberos y las fórmulas técnicas guardadas (número de peine, tinte o degradado).
            </p>
          </div>

          {/* Feature 2: Ciclo Habitual Inteligente */}
          <div className="bg-[#162237]/80 border border-[#1F314D] hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Agendamiento por Ciclo</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">IA Predictiva</span>
            </h3>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              El sistema analiza la frecuencia de corte habitual de cada cliente (ej. cada 15 o 20 días) y le sugiere la fecha y hora perfecta automáticamente.
            </p>
          </div>

          {/* Feature 3: Modo Silla Barbero */}
          <div className="bg-[#162237]/80 border border-[#1F314D] hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Modo Silla en Vivo</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono">Barberos</span>
            </h3>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Pantalla optimizada para celulares en la estación de corte. Incluye cronómetro del servicio, registro de propinas instantáneas y fórmulas.
            </p>
          </div>

          {/* Feature 4: POS & Cierre de Caja */}
          <div className="bg-[#162237]/80 border border-[#1F314D] hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Punto de Venta POS & Caja</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Caja</span>
            </h3>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Venta de ceras, aceites y lociones adjuntas al cobro de la cita, desglose por Efectivo, Transferencia o MercadoPago y cierre diario en 1 clic.
            </p>
          </div>

          {/* Feature 5: Fidelización & Puntos VIP */}
          <div className="bg-[#162237]/80 border border-[#1F314D] hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all group sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-950/60 border border-purple-800/50 text-purple-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Tarjeta VIP Digital & Puntos de Fidelización</span>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">Retención</span>
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
                  Los clientes acumulan visitas automáticamente con cada corte completado. Al completar su tarjeta, reciben recompensas o cortes gratis configurables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEFORE VS AFTER - SUPER PRACTICAL FOR BARBERS */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            ¿Cómo cambia tu vida diaria en el local?
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto">
            Comparamos la rutina tradicional de cuadernos y WhatsApp frente a la comodidad de tener SYNCBARBER.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* El pasado (Cuaderno) */}
          <div className="bg-[#0E1524]/60 border border-red-500/20 rounded-3xl p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-red-950/50 text-red-400 border border-red-800/40 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Con Cuaderno o WhatsApp
            </div>

            <h3 className="text-sm font-extrabold text-red-400 uppercase tracking-wider pt-2">El Caos de Siempre</h3>
            
            <ul className="space-y-3.5 text-xs">
              <li className="flex items-start gap-2.5 text-gray-300">
                <span className="text-red-500 font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Llamadas constantes:</strong> Tienes que detener tu corte de cabello, lavarte las manos y buscar el cuaderno solo para anotar una cita.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-300">
                <span className="text-red-500 font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Sillas Vacías por Olvidos:</strong> Clientes reservan turno por mensaje de texto, lo olvidan y no asisten. Perdiste esa hora de trabajo.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-300">
                <span className="text-red-500 font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Cuentas difíciles:</strong> Al final del sábado, pasas horas sumando cortes, restando comisiones y propinas de cada barbero con calculadora.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-300">
                <span className="text-red-500 font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Choques de horarios:</strong> Dos clientes aseguran que les diste la misma hora. Un momento incómodo en recepción.</span>
              </li>
            </ul>
          </div>

          {/* El presente (SYNCBARBER) */}
          <div className="bg-[#0E1524]/90 border border-cyan-500/30 rounded-3xl p-6 space-y-4 relative overflow-hidden shadow-lg shadow-cyan-950/10">
            <div className="absolute top-4 right-4 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Con SYNCBARBER
            </div>

            <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider pt-2">Tranquilidad Total</h3>
            
            <ul className="space-y-3.5 text-xs">
              <li className="flex items-start gap-2.5 text-gray-200">
                <span className="text-cyan-400 font-black shrink-0 mt-0.5">✓</span>
                <span><strong>Auto-servicio 24/7:</strong> Tus clientes se agendan solos por internet incluso a medianoche. Tú solo miras tu pantalla para saber quién sigue.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <span className="text-cyan-400 font-black shrink-0 mt-0.5">✓</span>
                <span><strong>Reducción de ausencias:</strong> El sistema mantiene un panel interactivo que te ayuda a registrar quién falta y restringir a clientes que cancelan repetidamente.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <span className="text-cyan-400 font-black shrink-0 mt-0.5">✓</span>
                <span><strong>Comisiones automáticas:</strong> Al terminar un servicio, el sistema calcula de inmediato el pago del barbero y la parte del local de forma transparente.</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <span className="text-cyan-400 font-black shrink-0 mt-0.5">✓</span>
                <span><strong>Control en tu celular:</strong> Todo el equipo puede ver su agenda mensual desde el celular sin interferir en el trabajo de los demás.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - SIMPLE AS 1-2-3 */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            ¿Cómo funciona? Tan fácil como cortar con tijera
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto">
            No necesitas cursos de computación. Solo sigues estos tres sencillos pasos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Paso 1 */}
          <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 text-center space-y-3 relative">
            <div className="absolute top-3 left-4 text-[42px] font-black text-[#C5A267]/10 select-none">01</div>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#162237] border border-[#1F314D] text-[#C5A267] flex items-center justify-center font-bold">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">El Cliente Elige</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Tu cliente abre tu enlace personalizado desde su móvil, selecciona el corte o barba que quiere, su barbero de confianza y su hora favorita.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 text-center space-y-3 relative">
            <div className="absolute top-3 left-4 text-[42px] font-black text-cyan-400/10 select-none">02</div>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#162237] border border-[#1F314D] text-cyan-400 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">La Agenda se Actualiza</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Tú y tus barberos ven aparecer la cita en vivo en la pantalla de su celular o tablet del local. No hay llamadas, no hay demoras.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 text-center space-y-3 relative">
            <div className="absolute top-3 left-4 text-[42px] font-black text-emerald-400/10 select-none">03</div>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#162237] border border-[#1F314D] text-emerald-400 flex items-center justify-center font-bold">
              <Percent className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sueldo Calculado</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Al finalizar cada servicio, la plataforma calcula el porcentaje del barbero y la ganancia neta de tu negocio. ¡Cuentas claras, barberos felices!
            </p>
          </div>
        </div>
      </section>

      {/* SIMULATOR - REDESIGNED FOR TRADITIONAL OWNERS */}
      <section className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-md text-[9px] font-bold font-mono">
          <DollarSign className="h-3 w-3 animate-pulse" />
          SIMULA TU GANANCIA
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg md:text-xl font-black text-white uppercase">
                ¿Cuánto dinero extra puedes generar al mes?
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Mueve las barras deslizadoras según la realidad de tu negocio para estimar cuántas horas de trabajo administrativo vas a recuperar y cuánto dinero adicional salvarás al evitar cancelaciones olvidadas.
              </p>
            </div>

            <div className="space-y-4">
              {/* Slider 1: Turnos al mes */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-white uppercase tracking-wider">Servicios realizados al mes:</span>
                  <span className="text-cyan-400 font-mono font-bold">{appointmentsPerMonth} cortes/servicios</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={appointmentsPerMonth}
                  onChange={(e) => setAppointmentsPerMonth(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-[#162237] rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Precio promedio */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-white uppercase tracking-wider">Precio promedio por corte:</span>
                  <span className="text-cyan-400 font-mono font-bold">{formatPrice(avgPrice)}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="40000"
                  step="1000"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-[#162237] rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 3: Barberos */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-white uppercase tracking-wider">Número de barberos trabajando:</span>
                  <span className="text-cyan-400 font-mono font-bold">{barberCount} barberos</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={barberCount}
                  onChange={(e) => setBarberCount(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-[#162237] rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#162237]/60 rounded-2xl p-5 border border-[#1F314D] space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest text-center border-b border-[#1F314D]/60 pb-2">
              Tu Beneficio Estimado con SYNCBARBER
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0E1524] rounded-xl border border-[#1F314D]/80 text-center space-y-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Tiempo Libre Ganado</p>
                <p className="text-lg font-black text-cyan-400 font-mono">{hoursSavedPerMonth} hrs</p>
                <p className="text-[8px] text-gray-400">Sin atender teléfonos</p>
              </div>

              <div className="p-3 bg-[#0E1524] rounded-xl border border-[#1F314D]/80 text-center space-y-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Turnos Rescatados</p>
                <p className="text-lg font-black text-emerald-400 font-mono">+{estimatedNoShowsReduced} citas</p>
                <p className="text-[8px] text-gray-400">Menos ausencias olvidadas</p>
              </div>
            </div>

            <div className="p-4 bg-cyan-950/20 border border-cyan-800/20 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span>Ingreso recuperado por asistencia:</span>
                <span className="font-mono text-white">{formatPrice(recoverySavings)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span>Valor de tu tiempo recuperado:</span>
                <span className="font-mono text-white">{formatPrice(adminValueSaved)}</span>
              </div>
              <div className="h-[1px] bg-[#1F314D]" />
              <div className="flex justify-between items-center text-xs font-bold text-white">
                <span className="uppercase text-[9px] tracking-wider text-cyan-400">Tu beneficio mensual total:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {formatPrice(totalMonthlyBenefit)}
                </span>
              </div>
            </div>

            <div className="text-[9px] text-gray-400 text-center italic">
              *Valores calculados de forma realista basados en el comportamiento de clientes que usan recordatorios web directos.
            </div>
          </div>

        </div>
      </section>

      {/* CLEAR LICENSING SCHEME FOR OWNER-DECISION MAKERS */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            Planes a la medida de tu barbería
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto">
            Elige el plan ideal según el tamaño de tu negocio. Puedes cambiarlos en vivo desde el panel de desarrollo para ver cómo reaccionan los módulos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Plan Basico */}
          <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 space-y-5 flex flex-col relative">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-gray-400 rounded-md text-[8px] font-bold uppercase tracking-wider">
                Hasta 2 Barberos
              </span>
              <h3 className="text-lg font-black text-white uppercase">Esencial</h3>
              <div className="py-1">
                <span className="text-2xl font-black text-white font-mono">$35.000</span>
                <span className="text-xs text-gray-400 font-sans ml-1">COP / mes</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Diseñado para profesionales independientes que atienden su propia silla y necesitan jubilar el cuaderno de papel.
              </p>
            </div>

            <div className="h-[1px] bg-[#1F314D]" />

            <ul className="space-y-2.5 flex-1 text-xs">
              <li className="flex items-start gap-2 text-gray-300">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Agenda diaria reactiva en vivo</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Enlace web para tus clientes</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Base de datos segura e independiente</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400 opacity-30">
                <Check className="h-3.5 w-3.5 text-neutral-600 shrink-0 mt-0.5" />
                <span>Calendario mensual visual interactivo</span>
              </li>
            </ul>

            <button
              onClick={() => onEnterApp("client")}
              className="w-full py-3 bg-[#162237] hover:bg-[#1F314D] border border-[#1F314D] hover:text-white text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Probar como Cliente
            </button>
          </div>

          {/* Plan Profesional */}
          <div className="bg-[#0E1524] border border-cyan-500/30 rounded-3xl p-6 space-y-5 flex flex-col relative shadow-lg shadow-cyan-950/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-full text-[9px] font-black uppercase tracking-wider">
              Recomendado
            </div>
            
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-cyan-950 border border-cyan-900 text-cyan-400 rounded-md text-[8px] font-bold uppercase tracking-wider">
                Hasta 5 Barberos
              </span>
              <h3 className="text-lg font-black text-white uppercase">Profesional</h3>
              <div className="py-1">
                <span className="text-2xl font-black text-cyan-400 font-mono">$75.000</span>
                <span className="text-xs text-gray-400 font-sans ml-1">COP / mes</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Ideal para barberías en crecimiento que cuentan con varios barberos y requieren ver el calendario completo del mes.
              </p>
            </div>

            <div className="h-[1px] bg-[#1F314D]" />

            <ul className="space-y-2.5 flex-1 text-xs">
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Todo lo del Plan Esencial</span>
              </li>
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Calendario Mensual Interactivo</span>
              </li>
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Membresías VIP y control de faltas</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400 opacity-30">
                <Check className="h-3.5 w-3.5 text-neutral-600 shrink-0 mt-0.5" />
                <span>Nómina y comisiones automatizadas</span>
              </li>
            </ul>

            <button
              onClick={() => onEnterApp("admin")}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-[#060A13] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Probar como Admin
            </button>
          </div>

          {/* Plan Premium */}
          <div className="bg-[#0E1524] border border-[#C5A267]/30 rounded-3xl p-6 space-y-5 flex flex-col relative shadow-lg shadow-[#C5A267]/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-950 border border-amber-900 text-[#C5A267] rounded-full text-[9px] font-black uppercase tracking-wider">
              Control Total
            </div>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-amber-950 border border-amber-900 text-[#C5A267] rounded-md text-[8px] font-bold uppercase tracking-wider">
                Barberos Ilimitados
              </span>
              <h3 className="text-lg font-black text-white uppercase">Premium Enterprise</h3>
              <div className="py-1">
                <span className="text-2xl font-black text-[#C5A267] font-mono">$139.000</span>
                <span className="text-xs text-gray-400 font-sans ml-1">COP / mes</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Perfecto para dueños de salones que quieren delegar y automatizar el cálculo de comisiones, propinas y reportes financieros.
              </p>
            </div>

            <div className="h-[1px] bg-[#1F314D]" />

            <ul className="space-y-2.5 flex-1 text-xs">
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-[#C5A267] shrink-0 mt-0.5" />
                <span>Todo lo del Plan Profesional</span>
              </li>
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-[#C5A267] shrink-0 mt-0.5" />
                <span>Control de Comisiones Automatizado (50/50, etc.)</span>
              </li>
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-[#C5A267] shrink-0 mt-0.5" />
                <span>Módulo de registro de Propinas</span>
              </li>
              <li className="flex items-start gap-2 text-gray-200">
                <Check className="h-3.5 w-3.5 text-[#C5A267] shrink-0 mt-0.5" />
                <span>Reportes de ingresos acumulados en un clic</span>
              </li>
            </ul>

            <button
              onClick={() => onEnterApp("admin")}
              className="w-full py-3 bg-[#C5A267] hover:bg-[#B38E54] text-[#060A13] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Probar como Admin VIP
            </button>
          </div>

        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
            Preguntas frecuentes de barberos como tú
          </h3>
          <p className="text-xs text-gray-400">
            Respondemos de manera simple a tus inquietudes del día a día.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-[#0E1524] border border-[#1F314D] rounded-2xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white flex justify-between items-center hover:bg-[#162237]/30 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className={`text-cyan-400 font-mono transition-transform duration-200 ${activeFaq === idx ? 'rotate-45' : ''}`}>
                  ＋
                </span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-gray-300 leading-relaxed border-t border-[#1F314D]/40 pt-2 bg-[#162237]/20 font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* DESIGNER SPOTLIGHT */}
      <section className="border-t border-[#1F314D]/60 pt-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-2">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Creador de SYNCBARBER</h4>
          <p className="text-xs text-gray-400 leading-relaxed max-w-lg">
            SYNCBARBER es un producto desarrollado con pasión por <strong>Reinaldo Duran Castro</strong>, conectando capacidades de software de primer nivel con las necesidades del barbero tradicional.
          </p>
        </div>

        <div className="flex gap-4 shrink-0">
          <a
            href="https://www.linkedin.com/in/reinaldo-duran-castro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0077b5]/10 border border-[#0077b5]/30 hover:bg-[#0077b5]/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Linkedin className="h-4 w-4 text-[#0077b5]" />
            <span>LinkedIn de Reinaldo</span>
          </a>
          <a
            href="mailto:rey4125@gmail.com"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#162237] border border-[#1F314D] hover:border-cyan-500/40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Mail className="h-4 w-4 text-[#C5A267]" />
            <span>Escribir Correo</span>
          </a>
        </div>
      </section>

    </div>
  );
}
