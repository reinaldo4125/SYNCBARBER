import React, { useState } from "react";
import SyncBarberLogo from "./SyncBarberLogo";
import { 
  FileText, 
  Printer, 
  Mail, 
  Share2, 
  Copy, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Lock, 
  Key, 
  Award, 
  Building2, 
  Sparkles,
  ExternalLink,
  Clock,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  Scissors,
  Ban,
  RefreshCw,
  Trash2,
  Scale,
  ShieldAlert
} from "lucide-react";

interface SaaSContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  license?: any;
  pricingConfig?: any;
  formatPrice?: (price: number) => string;
}

export default function SaaSContractModal({
  isOpen,
  onClose,
  tenant,
  license,
  pricingConfig,
  formatPrice = (p) => `$${p.toLocaleString("es-CO")}`
}: SaaSContractModalProps) {
  const [copied, setCopied] = useState(false);
  const [activePaperTheme, setActivePaperTheme] = useState<"dark" | "light">("light");

  if (!isOpen || !tenant) return null;

  // Extract license or tenant fallback data
  const licType = (license?.type || tenant?.config?.licenseType || "profesional").toUpperCase();
  const durationMonths = license?.durationMonths || 12;
  const expirationDate = license?.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const licenseKey = license?.key || tenant?.config?.licenseKey || "SYNC-PRO-2026-DEMO";
  const createdAt = license?.createdAt ? new Date(license.createdAt).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO");

  // Calculate pricing based on license type
  let monthlyPrice = 0;
  if (licType.includes("PREMIUM")) {
    monthlyPrice = pricingConfig?.premium?.price || 149000;
  } else if (licType.includes("PROFESIONAL")) {
    monthlyPrice = pricingConfig?.profesional?.price || 89000;
  } else if (licType.includes("ESTÁNDAR") || licType.includes("ESTANDAR") || licType.includes("BASICA")) {
    monthlyPrice = pricingConfig?.basica?.price || 49000;
  } else {
    monthlyPrice = 0; // Gratuita
  }

  const annualTotalAmount = monthlyPrice * durationMonths;

  const formattedMonthlyPrice = formatPrice(monthlyPrice);
  const formattedAnnualTotal = formatPrice(annualTotalAmount);

  // Generate unique Contract ID / Hash
  const contractId = `CONTRATO-SYNCBARBER-${(tenant.id || "SAAS").toUpperCase()}-${createdAt.replace(/\//g, "")}`;
  const securityHash = `SHA256:${Math.random().toString(36).substring(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

  // Clean phone number for WhatsApp link
  const rawPhone = (tenant.phone || tenant.ownerPhone || "").replace(/\D/g, "");
  const formattedPhoneForWhatsApp = rawPhone.length === 10 ? `57${rawPhone}` : rawPhone;

  // Construct WhatsApp Message
  const whatsappMessage = encodeURIComponent(
    `📜 *CONTRATO OFICIAL DE LICENCIAMIENTO SYNCBARBER*\n\n` +
    `Estimado(a) *${tenant.ownerName || tenant.name}*,\n` +
    `Adjuntamos la confirmación del contrato de software de gestión para tu barbería:\n\n` +
    `💈 *Barbería:* ${tenant.name}\n` +
    `🆔 *Inquilino ID:* ${tenant.tenantId || tenant.id}\n` +
    `🔑 *Plan SyncBarber:* ${licType}\n` +
    `🔑 *Clave de Licencia:* ${licenseKey}\n` +
    `⏳ *Vigencia:* ${durationMonths} Meses (Vence: ${expirationDate})\n` +
    `💰 *Tarifa Mensual:* ${formattedMonthlyPrice} COP/mes\n` +
    `💵 *VALOR TOTAL (12 Meses):* ${formattedAnnualTotal} COP\n\n` +
    `🔒 *Garantías & Políticas Incluidas:*\n` +
    `• Encriptación SSL 256-bit y Aislamiento Multi-tenant\n` +
    `• Copia de seguridad diaria (Backups de Citas & Finanzas)\n` +
    `• Propiedad del 100% de la base de clientes (Hábeas Data)\n` +
    `• Compromiso de SLA 99.5% y Soporte Técnico Dedicado\n\n` +
    `📄 *N° de Contrato:* ${contractId}\n\n` +
    `¡Gracias por confiar en SyncBarber!`
  );

  const whatsappUrl = `https://wa.me/${formattedPhoneForWhatsApp || ""}?text=${whatsappMessage}`;

  // Email subject & body
  const emailSubject = encodeURIComponent(`Contrato SyncBarber SaaS - ${tenant.name} [${contractId}]`);
  const emailBody = encodeURIComponent(
    `Hola ${tenant.ownerName || tenant.name},\n\n` +
    `Se ha generado exitosamente el Contrato de Licenciamiento SyncBarber para la barbería "${tenant.name}".\n\n` +
    `RESUMEN FINANCIERO Y CONTRACTUAL:\n` +
    `- Número de Contrato: ${contractId}\n` +
    `- Plan SyncBarber: ${licType}\n` +
    `- Clave de Licencia: ${licenseKey}\n` +
    `- Vigencia: ${durationMonths} meses (Vence: ${expirationDate})\n` +
    `- Tarifa Mensual: ${formattedMonthlyPrice} COP / mes\n` +
    `- VALOR TOTAL DEL CONTRATO (${durationMonths} Meses): ${formattedAnnualTotal} COP\n\n` +
    `POLÍTICAS DESTACADAS:\n` +
    `1. Aislamiento Multi-Tenant con encriptación de datos en tránsito y reposo.\n` +
    `2. Propiedad del 100% de la base de datos de clientes e ingresos para la barbería.\n` +
    `3. Respaldo diario inmutable de citas y registros financieros.\n` +
    `4. Nivel de Servicio (SLA Uptime) del 99.5% garantizado.\n` +
    `5. Soporte con Mesa de Ayuda y atención prioritaria.\n\n` +
    `Atentamente,\n` +
    `SyncBarber Technologies S.A.S.\n` +
    `Departamento de Licencias & Soporte Cloud`
  );

  const mailtoUrl = `mailto:${tenant.ownerEmail || ""}?subject=${emailSubject}&body=${emailBody}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textToCopy = 
      `CONTRATO DE LICENCIAMIENTO Y PRESTACIÓN DE SERVICIOS SYNCBARBER\n` +
      `===============================================================\n` +
      `N° CONTRATO: ${contractId}\n` +
      `FECHA DE EMISIÓN: ${createdAt}\n` +
      `PROVEEDOR: SyncBarber Technologies S.A.S.\n` +
      `BARBERÍA SUSCRIPTORA: ${tenant.name} (ID: ${tenant.id})\n` +
      `PROPIETARIO / REP: ${tenant.ownerName || 'N/A'}\n` +
      `EMAIL: ${tenant.ownerEmail || 'N/A'} | TEL: ${tenant.phone || 'N/A'}\n` +
      `CIUDAD: ${tenant.city || 'N/A'} - ${tenant.address || ''}\n\n` +
      `DETALLES DE LA LICENCIA Y COBROS:\n` +
      `- PLAN SYNCBARBER: ${licType}\n` +
      `- CLAVE DE LICENCIA: ${licenseKey}\n` +
      `- DURACIÓN: ${durationMonths} Meses (Vence: ${expirationDate})\n` +
      `- TARIFA MENSUAL: ${formattedMonthlyPrice} COP / mes\n` +
      `- MONTO TOTAL DEL CONTRATO (12 MESES): ${formattedAnnualTotal} COP\n\n` +
      `POLÍTICAS DE SEGURIDAD, CONFIDENCIALIDAD, DATOS Y TÉRMINOS LEGALES:\n` +
      `1. Cifrado SSL 256-bit y Aislamiento lógicamente dedicado por Tenant.\n` +
      `2. Respaldos diarios de base de datos de citas, clientes e ingresos.\n` +
      `3. Titularidad del 100% de los datos para la barbería (Ley Hábeas Data).\n` +
      `4. Confidencialidad absoluta sobre facturación e información comercial.\n` +
      `5. SLA Uptime garantizado del 99.5% anual.\n` +
      `6. Periodo de gracia por mora de 5 días hábiles antes de suspensión.\n` +
      `7. Prohibición de sublicenciamiento e ingeniería inversa.\n` +
      `8. Exclusión de responsabilidad por lucro cesante y fuerza mayor.\n` +
      `9. Actualizaciones continuas y mantenimiento transparente en la nube.\n` +
      `10. Ventana de 30 días post-cancelación para descarga de respaldos en Excel/JSON antes de purga definitiva.\n` +
      `11. Solución pacífica de controversias mediante conciliación previa.\n\n` +
      `SELLO CRIPTOGRÁFICO SHA256: ${securityHash}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      
      {/* Styles to force high contrast black text on white paper when printing/downloading PDF */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          
          body * {
            visibility: hidden !important;
          }

          .print-contract-sheet, .print-contract-sheet * {
            visibility: visible !important;
          }

          .print-contract-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 10pt !important;
          }

          .print-contract-sheet * {
            color: #111827 !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          .print-force-badge {
            background-color: #f8fafc !important;
            border: 1px solid #9ca3af !important;
            color: #111827 !important;
          }

          .print-force-highlight {
            background-color: #fef3c7 !important;
            color: #92400e !important;
            font-weight: bold !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Container Dialog */}
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none print:w-full print:bg-white print:text-black">
        
        {/* Top Header Bar (Hidden when printing) */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Contrato de Licenciamiento SyncBarber
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-mono font-bold">
                  DOCUMENTO OFICIAL
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Suscripción para <strong className="text-amber-300">{tenant.name}</strong> ({tenant.id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper theme toggle */}
            <button
              onClick={() => setActivePaperTheme(activePaperTheme === "dark" ? "light" : "dark")}
              className="hidden sm:flex px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer"
              title="Cambiar vista de lectura previa"
            >
              <span>{activePaperTheme === "dark" ? "☀️ Hoja Clara" : "🌙 Hoja Oscura"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar (Hidden when printing) */}
        <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {/* Print / Download PDF */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Send WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span>Enviar WhatsApp</span>
            </a>

            {/* Send Email */}
            <a
              href={mailtoUrl}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              <span>Enviar por Correo</span>
            </a>

            {/* Copy Text */}
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl flex items-center gap-2 transition-colors border border-neutral-700 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "¡Copiado!" : "Copiar Texto"}</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono hidden md:block">
            N° Ref: <span className="text-amber-400 font-bold">{contractId}</span>
          </div>
        </div>

        {/* Printable Contract Sheet Content */}
        <div className={`p-6 sm:p-10 overflow-y-auto flex-1 text-sm font-sans leading-relaxed print-contract-sheet ${
          activePaperTheme === "light" 
            ? "bg-white text-neutral-900 border-t border-stone-200" 
            : "bg-neutral-950 text-neutral-200"
        }`}>
          
          {/* Header Brand Stamp with Official SyncBarber Logo */}
          <div className="border-b-2 border-amber-600/40 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-3">
              {/* Official SyncBarber Brand Logo Badge */}
              <div className="flex items-center gap-3">
                <SyncBarberLogo 
                  size={58} 
                  showText={true} 
                  showTagline={true} 
                  variant={activePaperTheme === "light" ? "dark" : "gold"} 
                />
                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-mono font-bold tracking-wider print-force-badge">
                  DOCUMENTO OFICIAL
                </span>
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                  CONTRATO OFICIAL DE LICENCIAMIENTO SaaS
                </h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono mt-0.5">
                  SyncBarber Technologies S.A.S. — Software de Gestión, Cierre de Caja y Fidelización
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-1 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 shrink-0 print-force-badge">
              <div><strong className="text-neutral-800 dark:text-neutral-200">N° de Contrato:</strong> <span className="text-amber-700 dark:text-amber-400 font-bold">{contractId}</span></div>
              <div><strong className="text-neutral-800 dark:text-neutral-200">Fecha Emisión:</strong> {createdAt}</div>
              <div><strong className="text-neutral-800 dark:text-neutral-200">Estado Licencia:</strong> <span className="text-emerald-700 dark:text-emerald-400 font-bold">VIGENTE Y ACTIVA</span></div>
            </div>
          </div>

          {/* Section 1: Parties involved */}
          <div className="space-y-6">
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                SECCIÓN I: PARTES SUSCRIPTORES Y REPRESENTACIÓN LEGAL
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Provider */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-neutral-950/60 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="font-black text-neutral-900 dark:text-white block uppercase text-[10px] text-amber-700 dark:text-amber-500">
                    🏢 EL PROVEEDOR (LICENCIANTE):
                  </span>
                  <div><strong>Razón Social:</strong> SyncBarber Technologies S.A.S.</div>
                  <div><strong>NIT / Registro:</strong> 901.845.210-9</div>
                  <div><strong>Plataforma:</strong> SyncBarber Cloud Platform</div>
                  <div><strong>Canal Oficial:</strong> soporte@syncbarber.cloud</div>
                  <div><strong>Mesa de Ayuda:</strong> Helpdesk Integrado en Consola SyncBarber</div>
                </div>

                {/* Tenant Client */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-neutral-950/60 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="font-black text-neutral-900 dark:text-white block uppercase text-[10px] text-amber-700 dark:text-amber-500">
                    💈 EL SUSCRIPTOR (INQUILINO / BARBERÍA):
                  </span>
                  <div><strong>Nombre de la Barbería:</strong> {tenant.name}</div>
                  <div><strong>ID Inquilino (Tenant ID):</strong> <code className="bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800 dark:text-amber-400 print-force-highlight">{tenant.id}</code></div>
                  <div><strong>Representante Legal:</strong> {tenant.ownerName || "No especificado"}</div>
                  <div><strong>Correo Electrónico:</strong> {tenant.ownerEmail || "No especificado"}</div>
                  <div><strong>Teléfono de Contacto:</strong> {tenant.phone || "No especificado"}</div>
                  <div><strong>Sede / Ubicación:</strong> {tenant.city || "Principal"} - {tenant.address || "Dirección registrada"}</div>
                </div>
              </div>
            </div>

            {/* Section 2: License Terms & Financial Conditions */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Award className="h-4 w-4 text-amber-600" />
                SECCIÓN II: OBJETO DEL CONTRATO, TARIFA MENSUAL Y CÁLCULO DE COBRO ANUAL
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 print-force-badge">
                  <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold block uppercase">PLAN SYNCBARBER</span>
                  <strong className="text-base font-black text-amber-700 dark:text-amber-400">{licType}</strong>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/30 print-force-badge">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold block uppercase">TARIFA MENSUAL</span>
                  <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">{formattedMonthlyPrice} COP / mes</strong>
                  <span className="text-[10px] block text-neutral-600 dark:text-neutral-400 font-mono">Facturación periódica</span>
                </div>
                <div className="p-3.5 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-200 dark:border-sky-500/30 print-force-badge">
                  <span className="text-[10px] text-sky-800 dark:text-sky-400 font-bold block uppercase">VALOR TOTAL ({durationMonths} MESES)</span>
                  <strong className="text-base font-black text-sky-700 dark:text-sky-400 block">{formattedAnnualTotal} COP</strong>
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono">Vence: {expirationDate}</span>
                </div>
              </div>

              <div className="text-xs space-y-2.5 pt-2 text-neutral-800 dark:text-neutral-300">
                <p>
                  <strong>2.1 Objeto de la Licencia:</strong> SyncBarber Technologies S.A.S. concede al Suscriptor una licencia de uso no exclusiva, revocable e intransferible para acceder al software SaaS SyncBarber durante un ciclo de <strong className="text-amber-700 dark:text-amber-400">{durationMonths} meses</strong>.
                </p>
                <p>
                  <strong>2.2 Clave de Licencia Asignada:</strong> La licencia oficial asignada a este inquilino es <code className="bg-neutral-200 dark:bg-neutral-800 font-mono font-bold px-2 py-0.5 rounded text-amber-700 dark:text-amber-400 print-force-highlight">{licenseKey}</code>.
                </p>
                <p>
                  <strong>2.3 Desglose Financiero de Cobro:</strong> La suscripción contempla una cuota recurrente mensual de <strong>{formattedMonthlyPrice} COP</strong>. El importe consolidado contratado para el periodo completo de {durationMonths} meses asciende a la suma de <strong className="text-emerald-700 dark:text-emerald-400">{formattedAnnualTotal} COP</strong>.
                </p>
                <p>
                  <strong>2.4 Periodo de Gracia y Pagos:</strong> El Suscriptor dispondrá de un periodo de gracia de <strong>5 días hábiles</strong> posteriores a cada fecha límite de pago mensual antes de que la plataforma aplique la restricción de acceso automatizada por mora.
                </p>
              </div>
            </div>

            {/* Section 3: Security & Data Isolation */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                SECCIÓN III: POLÍTICAS DE SEGURIDAD Y ARQUITECTURA MULTI-TENANT
              </h2>
              <ul className="text-xs space-y-2 text-neutral-800 dark:text-neutral-300 list-disc pl-5">
                <li>
                  <strong>Cifrado SSL/TLS de 256 bits:</strong> Todos los paquetes de datos transmitidos entre los dispositivos de la barbería, la recepción, los clientes y la nube SyncBarber están protegidos con encriptación bancaria de alta seguridad.
                </li>
                <li>
                  <strong>Aislamiento Lógico Multi-Tenant:</strong> La base de datos de la barbería <strong className="text-amber-700 dark:text-amber-400">{tenant.name}</strong> está estrictamente segmentada bajo el identificador <code className="font-mono">{tenant.id}</code>. Ningún otro inquilino de la red SyncBarber tiene acceso a sus datos.
                </li>
                <li>
                  <strong>Respaldos Automáticos Diarios (Backups Inmutables):</strong> Se realizan copias de seguridad cada 24 horas que almacenan el historial de citas, contabilidad de caja, cartera de clientes e inventarios para garantizar cero pérdida de datos.
                </li>
                <li>
                  <strong>Autenticación y Control de Roles:</strong> Acceso restringido mediante credenciales encriptadas para Administradores, Barberos (Modo Silla PWA) y Recepción.
                </li>
              </ul>
            </div>

            {/* Section 4: Confidentiality & Data Ownership */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Lock className="h-4 w-4 text-amber-600" />
                SECCIÓN IV: POLÍTICAS DE CONFIDENCIALIDAD, HÁBEAS DATA Y PROPIEDAD DE LOS DATOS
              </h2>
              <ul className="text-xs space-y-2 text-neutral-800 dark:text-neutral-300 list-disc pl-5">
                <li>
                  <strong>Titularidad Exclusiva de los Datos:</strong> El Suscriptor (<strong className="text-amber-700 dark:text-amber-400">{tenant.name}</strong>) es el único dueño y titular de la totalidad de su cartera de clientes, registros de facturación, comisiones e inventarios.
                </li>
                <li>
                  <strong>Prohibición Absoluta de Divulgación o Venta:</strong> SyncBarber Technologies S.A.S. se compromete a no compartir, alquilar, vender ni transferir la información de clientes o métricas comerciales a terceros bajo ninguna circunstancia.
                </li>
                <li>
                  <strong>Cumplimiento de Protección de Datos (Hábeas Data):</strong> SyncBarber cumple rigurosamente con las normativas de protección de datos personales y garantiza herramientas para la actualización o supresión de datos a solicitud del suscriptor.
                </li>
                <li>
                  <strong>Derecho de Exportación de Datos:</strong> Al finalizar la vigencia del contrato, el Suscriptor podrá descargar una copia completa de su base de datos en formato JSON/Excel antes del cierre definitivo de la cuenta.
                </li>
              </ul>
            </div>

            {/* Section 5: Service Level Agreement (SLA) & Support */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                SECCIÓN V: ACUERDO DE NIVEL DE SERVICIO (SLA) Y SOPORTE TÉCNICO
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>5.1 Disponibilidad del Servicio (SLA 99.5%):</strong> SyncBarber garantiza un nivel de disponibilidad anual del sistema del <strong>99.5%</strong>. Mantenimientos de servidores programados serán notificados con mínimo 24 horas de antelación.
                </p>
                <p>
                  <strong>5.2 Tiempos de Respuesta Soporte Técnico:</strong> Incidencias críticas (bloqueo total de la agenda) serán atendidas en un plazo máximo de <strong>2 horas</strong>. Dudas operativas y configuraciones dentro de un plazo de 12 horas hábiles.
                </p>
                <p>
                  <strong>5.3 Mesa de Ayuda SyncBarber:</strong> El Suscriptor dispone de acceso directo a la consola de Helpdesk para abrir tickets de soporte, reportar requerimientos o solicitar capacitaciones para su personal.
                </p>
              </div>
            </div>

            {/* Section 6: Termination & Renewal */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                SECCIÓN VI: MORA, SUSPENSIÓN Y REGLAS DE RENOVACIÓN
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>6.1 Renovación del Servicio:</strong> Al finalizar la fecha de vencimiento ({expirationDate}), la licencia se renovará por un periodo idéntico previo pago de la tarifa correspondiente vigente.
                </p>
                <p>
                  <strong>6.2 Terminación Anticipada:</strong> El Suscriptor podrá solicitar la no renovación del contrato mediante notificación por escrito enviada a través de la Mesa de Ayuda con al menos 15 días de anticipación.
                </p>
              </div>
            </div>

            {/* Section 7: Acceptable Use & Anti-Reverse Engineering */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Ban className="h-4 w-4 text-amber-600" />
                SECCIÓN VII: POLÍTICA DE USO ACEPTABLE Y PROHIBICIÓN DE INGENIERÍA INVERSA
              </h2>
              <ul className="text-xs space-y-2 text-neutral-800 dark:text-neutral-300 list-disc pl-5">
                <li>
                  <strong>Prohibición de Sublicenciamiento y Reventa:</strong> El Suscriptor no podrá revender, alquilar, ceder ni compartir el acceso a su tenant con terceros ajenos a la barbería registrada.
                </li>
                <li>
                  <strong>Prohibición de Ingeniería Inversa:</strong> Queda terminantemente prohibido descompilar, realizar ingeniería inversa, extraer código fuente o intentar evadir las medidas de seguridad criptográficas de SyncBarber.
                </li>
                <li>
                  <strong>Seguridad de Credenciales:</strong> El Suscriptor es responsable exclusivo de la custodia de sus credenciales de acceso (Administración, Recepción y Modo Silla PWA).
                </li>
              </ul>
            </div>

            {/* Section 8: Limitation of Liability & Force Majeure */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                SECCIÓN VIII: LIMITACIÓN DE RESPONSABILIDAD Y FUERZA MAYOR
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>8.1 Exclusión de Lucro Cesante:</strong> SyncBarber Technologies S.A.S. no será responsable por daños indirectos, lucro cesante, ni pérdidas comerciales ocasionadas por interrupciones en el servicio eléctrico, redes locales de internet del Suscriptor o fallas de hardware del usuario.
                </p>
                <p>
                  <strong>8.2 Exención por Fuerza Mayor:</strong> Caídas globales masivas de proveedores de infraestructura cloud de nivel primario (Google Cloud Platform, AWS, Cloudflare) o ataques cibernéticos internacionales de fuerza mayor estarán exentos de penalizaciones contractuales.
                </p>
              </div>
            </div>

            {/* Section 9: Software Updates & Cloud Upgrades */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                SECCIÓN IX: ACTUALIZACIONES CONTINUAS Y MEJORAS DE PLATAFORMA
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>9.1 Despliegue Transparente de Mejoras:</strong> SyncBarber desplegará actualizaciones automáticas, parches de seguridad y mejoras funcionales periódicas sin costo adicional dentro de la vigencia del plan contratado.
                </p>
              </div>
            </div>

            {/* Section 10: Data Retention & Permanent Purge */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Trash2 className="h-4 w-4 text-amber-600" />
                SECCIÓN X: RETENCIÓN, DESCARGA Y PURGA DEFINITIVA DE DATOS
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>10.1 Ventana de Descarga de Respaldo (30 Días):</strong> En caso de terminación o no renovación de la suscripción, el Suscriptor dispondrá de un plazo máximo de <strong>30 días calendario</strong> para solicitar y exportar la totalidad de su base de clientes y registros financieros en formato estándar (Excel / JSON).
                </p>
                <p>
                  <strong>10.2 Borrado Inmutable y Purga Definitiva:</strong> Vencido el plazo de 30 días posteriores a la cancelación, SyncBarber procederá a la purga y borrado definitivo e irreversible de la base de datos del inquilino en estricto cumplimiento de las normativas de protección de datos.
                </p>
              </div>
            </div>

            {/* Section 11: Applicable Law & Dispute Resolution */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h2 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <Scale className="h-4 w-4 text-amber-600" />
                SECCIÓN XI: LEY APLICABLE Y RESOLUCIÓN PACÍFICA DE CONTROVERSIAS
              </h2>
              <div className="text-xs text-neutral-800 dark:text-neutral-300 space-y-2">
                <p>
                  <strong>11.1 Arreglo Directo y Conciliación:</strong> Cualquier diferencia o reclamación referente al contrato será resuelta prioritariamente mediante un mecanismo de arreglo directo o ante un Centro de Conciliación autorizado antes de recurrir a la vía judicial ordinaria.
                </p>
              </div>
            </div>

            {/* Digital Stamp & Signatures */}
            <div className="pt-6 border-t border-neutral-300 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2 border-t border-dashed border-neutral-400 dark:border-neutral-600 pt-3">
                <span className="font-extrabold block text-neutral-900 dark:text-white uppercase text-[10px]">
                  POR EL PROVEEDOR SAAS:
                </span>
                <div className="font-black text-amber-700 dark:text-amber-500">SyncBarber Technologies S.A.S.</div>
                <div className="text-[10px] text-neutral-600 dark:text-neutral-400">División de Licencias & Soporte Cloud SyncBarber</div>
                <div className="text-[9px] font-mono text-neutral-500 mt-1">Sello Digital: VERIFICADO_SYNCBARBER_OK</div>
              </div>

              <div className="space-y-2 border-t border-dashed border-neutral-400 dark:border-neutral-600 pt-3">
                <span className="font-extrabold block text-neutral-900 dark:text-white uppercase text-[10px]">
                  POR EL SUSCRIPTOR (ACEPTACIÓN DIGITAL):
                </span>
                <div className="font-black text-neutral-900 dark:text-white">{tenant.ownerName || tenant.name}</div>
                <div className="text-[10px] text-neutral-600 dark:text-neutral-400">Representante Legal / Propietario — {tenant.name}</div>
                <div className="text-[9px] font-mono text-neutral-500 mt-1">Aceptación Acreditada vía Tenant ID: {tenant.id}</div>
              </div>
            </div>

            {/* Footer Cryptographic Hash */}
            <div className="pt-4 text-center font-mono text-[9px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
              <div>HASH DE VALIDACIÓN CORTEX SYNCBARBER: <span className="text-amber-700 dark:text-amber-400 font-bold">{securityHash}</span></div>
              <div>Documento electrónico de licenciamiento con plena validez jurídica.</div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
