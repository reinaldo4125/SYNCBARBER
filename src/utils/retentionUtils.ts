import { ClientAccount, Appointment } from "../types";

export interface RetentionAnalysis {
  client: ClientAccount;
  cycleDays: number;
  lastCutDate: string;
  daysSinceLastCut: number;
  nextRecommendedCutDate: string;
  daysUntilNextCut: number;
  status: 'ok' | 'due_soon' | 'at_risk';
  statusLabel: string;
  statusColorClass: string;
  badgeBgClass: string;
  completedAppointmentsCount: number;
  lastBarberName?: string;
  lastServiceName?: string;
}

export function calculateClientRetention(
  client: ClientAccount,
  appointments: Appointment[]
): RetentionAnalysis {
  // Get all completed appointments for this client (match phone or email)
  const clientApps = appointments
    .filter(a => {
      if (a.status !== 'completed') return false;
      const phoneMatch = a.clientPhone && a.clientPhone.replace(/\s+/g, '') === client.phone.replace(/\s+/g, '');
      const emailMatch = client.email && a.clientEmail && a.clientEmail.toLowerCase() === client.email.toLowerCase();
      return phoneMatch || emailMatch;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const cycleDays = client.avgCutCycleDays || 21; // Default 21 days cycle
  
  // Find last cut date
  let lastCutDateStr = client.lastCutDate;
  let lastBarberName = undefined;
  let lastServiceName = undefined;

  if (clientApps.length > 0) {
    const mostRecent = clientApps[0];
    lastCutDateStr = mostRecent.date;
    lastBarberName = mostRecent.barberName;
    lastServiceName = mostRecent.serviceName;
  } else if (!lastCutDateStr) {
    // If no completed appointment, use registration date (or 30 days ago as fallback)
    lastCutDateStr = client.createdAt ? client.createdAt.substring(0, 10) : new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCutDate = new Date(lastCutDateStr + "T00:00:00");
  const diffTime = today.getTime() - lastCutDate.getTime();
  const daysSinceLastCut = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const nextCutDateObj = new Date(lastCutDate.getTime() + cycleDays * 86400000);
  const nextRecommendedCutDate = nextCutDateObj.toISOString().substring(0, 10);

  const daysUntilNextCut = cycleDays - daysSinceLastCut;

  let status: 'ok' | 'due_soon' | 'at_risk' = 'ok';
  let statusLabel = 'Al Día';
  let statusColorClass = 'text-emerald-400';
  let badgeBgClass = 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400';

  if (daysUntilNextCut < -5) {
    status = 'at_risk';
    statusLabel = 'Riesgo de Deserción';
    statusColorClass = 'text-rose-400';
    badgeBgClass = 'bg-rose-950/60 border-rose-800/40 text-rose-400';
  } else if (daysUntilNextCut <= 4) {
    status = 'due_soon';
    statusLabel = 'Próximo Re-Corte';
    statusColorClass = 'text-amber-400';
    badgeBgClass = 'bg-amber-950/60 border-amber-800/40 text-amber-400';
  }

  return {
    client,
    cycleDays,
    lastCutDate: lastCutDateStr,
    daysSinceLastCut,
    nextRecommendedCutDate,
    daysUntilNextCut,
    status,
    statusLabel,
    statusColorClass,
    badgeBgClass,
    completedAppointmentsCount: clientApps.length,
    lastBarberName,
    lastServiceName,
  };
}

export function calculateSalonRetentionMetrics(
  clients: ClientAccount[],
  appointments: Appointment[]
) {
  if (!clients || clients.length === 0) {
    return {
      totalClients: 0,
      okCount: 0,
      dueSoonCount: 0,
      atRiskCount: 0,
      retentionRate: 100,
      avgCycleDays: 21,
      estimatedRevenueAtRisk: 0,
    };
  }

  const analyses = clients.map(c => calculateClientRetention(c, appointments));
  
  const okCount = analyses.filter(a => a.status === 'ok').length;
  const dueSoonCount = analyses.filter(a => a.status === 'due_soon').length;
  const atRiskCount = analyses.filter(a => a.status === 'at_risk').length;

  const totalClients = clients.length;
  const retentionRate = Math.round(((okCount + dueSoonCount) / totalClients) * 100);

  const avgCycleDays = Math.round(
    analyses.reduce((acc, curr) => acc + curr.cycleDays, 0) / totalClients
  );

  // Assuming average cut value is $20.000 COP / ~$20 USD
  const estimatedRevenueAtRisk = atRiskCount * 20000;

  return {
    totalClients,
    okCount,
    dueSoonCount,
    atRiskCount,
    retentionRate,
    avgCycleDays,
    estimatedRevenueAtRisk,
    analyses,
  };
}
