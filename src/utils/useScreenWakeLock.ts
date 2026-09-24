import { useState, useEffect, useCallback, useRef } from "react";

export function useScreenWakeLock(autoRequest: boolean = true) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  const requestLock = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      console.log("[WakeLock] API no soportada en este navegador/dispositivo");
      return false;
    }

    try {
      // Release existing if any
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        await wakeLockRef.current.release();
      }

      const lock = await (navigator as any).wakeLock.request("screen");
      wakeLockRef.current = lock;
      setIsLocked(true);

      lock.addEventListener("release", () => {
        setIsLocked(false);
      });

      console.log("[WakeLock] Pantalla activa (Anti-apagado activado)");
      return true;
    } catch (err: any) {
      console.warn("[WakeLock] Error al solicitar bloqueo de pantalla:", err?.message || err);
      setIsLocked(false);
      return false;
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
        console.log("[WakeLock] Pantalla liberada");
      } catch (err) {
        console.warn("[WakeLock] Error al liberar:", err);
      }
    }
  }, []);

  const toggleLock = useCallback(async () => {
    if (isLocked) {
      await releaseLock();
    } else {
      await requestLock();
    }
  }, [isLocked, releaseLock, requestLock]);

  // Auto request on mount if desired
  useEffect(() => {
    if (!autoRequest) return;

    requestLock();

    // Re-acquire lock when user returns to tab / unlocks phone
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      releaseLock();
    };
  }, [autoRequest, requestLock, releaseLock]);

  return {
    isLocked,
    isSupported,
    requestLock,
    releaseLock,
    toggleLock
  };
}
