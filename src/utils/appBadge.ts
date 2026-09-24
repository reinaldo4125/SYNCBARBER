// App Badging API & Dynamic Badge Engine for SYNCBARBER PWA
// Provides native App Icon Badges on mobile/desktop PWA (navigator.setAppBadge),
// as well as dynamic Favicon red badge rendering and document title counter fallback.

let originalTitle = typeof document !== "undefined" ? document.title : "SYNCBARBER - Agendamiento de Citas & Barbería";
let originalFaviconHref = "/favicon.svg";

/**
 * Check if the native App Badging API is supported by the client browser/OS
 */
export function isAppBadgeSupported(): boolean {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

/**
 * Draws a red circular badge with the count number onto the favicon
 */
function updateFaviconWithBadge(count: number) {
  if (typeof document === "undefined") return;

  const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!favicon) return;

  if (count <= 0) {
    favicon.href = originalFaviconHref;
    return;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalFaviconHref;

    img.onload = () => {
      // Draw base icon
      ctx.drawImage(img, 0, 0, 64, 64);

      // Draw Red Notification Badge Bubble
      const badgeRadius = 18;
      const badgeX = 46;
      const badgeY = 18;

      // Outer glow / border
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = "#0F0F12";
      ctx.fill();

      // Red bubble
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "#EF4444";
      ctx.fill();

      // Number text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = count > 9 ? "bold 18px sans-serif" : "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count > 99 ? "99+" : count.toString(), badgeX, badgeY + 1);

      favicon.href = canvas.toDataURL("image/png");
    };
  } catch (e) {
    console.debug("[AppBadge] Favicon canvas badge fallback not applied:", e);
  }
}

/**
 * Sets the numeric badge on the PWA app icon, tab title, and favicon.
 * @param count The number of pending appointments / unread alerts.
 * @param salonName Optional salon name for title customization.
 */
export async function setAppIconBadge(count: number, salonName?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const validCount = Math.max(0, Math.floor(count));

  if (validCount === 0) {
    return clearAppIconBadge(salonName);
  }

  let nativeSuccess = false;

  // 1. Native App Badging API (PWA icon on home screen / taskbar)
  try {
    if ("setAppBadge" in navigator) {
      await (navigator as any).setAppBadge(validCount);
      nativeSuccess = true;
    }
  } catch (err) {
    console.debug("[AppBadge] Native setAppBadge failed or restricted:", err);
  }

  // 2. Relay to Service Worker for background badge persistence
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_APP_BADGE",
        count: validCount
      });
    }
  } catch (err) {
    // Ignore SW postMessage errors
  }

  // 3. Document Title Badge Fallback: e.g. "(3) SYNCBARBER | Bella Barba"
  try {
    const baseName = salonName ? `SYNCBARBER • ${salonName}` : "SYNCBARBER";
    document.title = `(${validCount}) ${baseName} - Citas Pendientes`;
  } catch (e) {}

  // 4. Dynamic Favicon Red Bubble Fallback
  updateFaviconWithBadge(validCount);

  return nativeSuccess;
}

/**
 * Clears the numeric badge from the PWA app icon, tab title, and restores favicon.
 */
export async function clearAppIconBadge(salonName?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let nativeSuccess = false;

  // 1. Native clearAppBadge
  try {
    if ("clearAppBadge" in navigator) {
      await (navigator as any).clearAppBadge();
      nativeSuccess = true;
    } else if ("setAppBadge" in navigator) {
      await (navigator as any).setAppBadge(0);
      nativeSuccess = true;
    }
  } catch (err) {
    console.debug("[AppBadge] Native clearAppBadge failed:", err);
  }

  // 2. Relay to Service Worker
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLEAR_APP_BADGE"
      });
    }
  } catch (err) {}

  // 3. Restore Document Title
  try {
    const baseName = salonName ? `SYNCBARBER • ${salonName}` : "SYNCBARBER";
    document.title = `${baseName} - Agendamiento de Citas & Barbería`;
  } catch (e) {}

  // 4. Restore Favicon
  updateFaviconWithBadge(0);

  return nativeSuccess;
}
