"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = "youcard_last_activity";

function clearAuthCookie() {
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon("/api/logout");
    return;
  }

  void fetch("/api/logout", {
    method: "POST",
    keepalive: true,
  });
}

export default function AuthSessionWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    const logout = () => {
      clearAuthCookie();
      window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
    };

    const markActivity = () => {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };

    const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    const now = Date.now();

    if (Number.isFinite(lastActivity) && lastActivity > 0 && now - lastActivity >= TIMEOUT_MS) {
      logout();
      return;
    }

    markActivity();

    let timer = window.setTimeout(logout, TIMEOUT_MS);

    const resetTimer = () => {
      markActivity();
      window.clearTimeout(timer);
      timer = window.setTimeout(logout, TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markActivity();
        return;
      }

      const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (Number.isFinite(stored) && stored > 0 && Date.now() - stored >= TIMEOUT_MS) {
        logout();
        return;
      }

      resetTimer();
    };

    const handlePageHide = () => {
      markActivity();
    };

    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("scroll", resetTimer, { passive: true });
    window.addEventListener("focus", resetTimer);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      window.removeEventListener("focus", resetTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [pathname]);

  return null;
}
