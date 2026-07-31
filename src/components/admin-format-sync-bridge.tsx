/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __EXALE_FORMAT_SYNC_BRIDGE_INSTALLED__?: boolean;
    __EXALE_ORIGINAL_FETCH__?: typeof fetch;
    exalePanelSyncNow?: () => Promise<any>;
    exaleAdminToast?: (type: "ok" | "error" | "info", text: string) => void;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAdminWrite(input: any, init: any) {
  const method = String(init?.method || "GET").toUpperCase();
  const url = typeof input === "string" ? input : String(input?.url || "");

  return (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    url.includes("/api/admin/") &&
    !url.includes("/api/admin/sync-site")
  );
}

async function syncSite(reason = "salvamento do painel") {
  await sleep(400);

  const response = await fetch("/api/admin/sync-site?reason=" + encodeURIComponent(reason) + "&t=" + Date.now(), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
    },
  });

  return response.json().catch(() => null);
}

export default function AdminFormatSyncBridge() {
  useEffect(() => {
    if (window.__EXALE_FORMAT_SYNC_BRIDGE_INSTALLED__) return;

    window.__EXALE_FORMAT_SYNC_BRIDGE_INSTALLED__ = true;
    window.__EXALE_ORIGINAL_FETCH__ = window.fetch.bind(window);

    const originalFetch = window.__EXALE_ORIGINAL_FETCH__;

    window.exalePanelSyncNow = () => syncSite("manual");

    window.fetch = async (input: any, init: any = {}) => {
      const shouldSync = isAdminWrite(input, init);
      const response = await originalFetch(input, init);

      if (shouldSync && response?.ok) {
        syncSite("salvamento do painel").catch(() => null);
      }

      return response;
    };

    return () => {
      if (window.__EXALE_ORIGINAL_FETCH__) {
        window.fetch = window.__EXALE_ORIGINAL_FETCH__;
      }

      window.__EXALE_FORMAT_SYNC_BRIDGE_INSTALLED__ = false;
    };
  }, []);

  return null;
}
