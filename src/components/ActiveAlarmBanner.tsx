import React, { useState, useEffect } from "react";
import { ShieldAlert, VolumeX, Bell } from "lucide-react";
import { isAlarmActive, stopContinuousAlarm } from "../utils/notificationSound";

export default function ActiveAlarmBanner() {
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    const checkState = () => setRinging(isAlarmActive());
    const handleAlarmStart = () => setRinging(true);
    const handleAlarmStop = () => setRinging(false);

    window.addEventListener("syncbarber_alarm_started", handleAlarmStart);
    window.addEventListener("syncbarber_alarm_stopped", handleAlarmStop);

    const interval = setInterval(checkState, 1000);
    return () => {
      window.removeEventListener("syncbarber_alarm_started", handleAlarmStart);
      window.removeEventListener("syncbarber_alarm_stopped", handleAlarmStop);
      clearInterval(interval);
    };
  }, []);

  if (!ringing) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] max-w-[94vw] w-auto bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-white/40 flex items-center gap-3 animate-bounce">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-200 animate-spin" />
        <span className="text-xs font-black tracking-wide">
          🚨 ¡ALARMA SONANDO EN LA BARBERÍA!
        </span>
      </div>
      <button
        onClick={() => stopContinuousAlarm()}
        className="px-3 py-1 bg-white text-black hover:bg-neutral-200 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1"
      >
        <VolumeX className="h-3.5 w-3.5 text-rose-600" />
        <span>Apagar</span>
      </button>
    </div>
  );
}
