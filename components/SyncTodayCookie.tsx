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

/**
 * The server has no idea what timezone the visitor is in, so "today" from
 * `new Date()` on the server can be off by a day right around midnight for
 * anyone not in the server's timezone. This writes the browser's own local
 * date into a cookie the server reads instead, and refreshes once if it was
 * stale (new day, or first visit).
 */
export function SyncTodayCookie() {
  const router = useRouter();

  useEffect(() => {
    const key = localDateKey();
    const existing = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1];
    if (existing === key) return;

    document.cookie = `${COOKIE_NAME}=${key}; path=/; max-age=${60 * 60 * 24 * 400}; SameSite=Lax`;
    router.refresh();
  }, [router]);

  return null;
}
