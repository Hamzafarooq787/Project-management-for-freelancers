"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NAME = "today-date";

function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
}

/**
 * The server has no idea what timezone the visitor is in, so "today" from
 * `new Date()` on the server can be off by a day right around midnight for
 * anyone not in the server's timezone. This writes the browser's own local
 * date into a cookie the server reads instead, and refreshes when it's
 * stale (new day, or first visit).
 *
 * The layout that mounts this doesn't unmount on client-side navigation, so
 * a tab left open across midnight would otherwise keep yesterday's cookie
 * indefinitely — re-check on an interval and whenever the tab regains focus,
 * not just once on mount.
 */
export function SyncTodayCookie() {
  const router = useRouter();

  useEffect(() => {
    function sync() {
      const key = localDateKey();
      if (readCookie() === key) return;

      document.cookie = `${COOKIE_NAME}=${key}; path=/; max-age=${60 * 60 * 24 * 400}; SameSite=Lax`;
      router.refresh();
    }

    sync();
    const interval = setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [router]);

  return null;
}
