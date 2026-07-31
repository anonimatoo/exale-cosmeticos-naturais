/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

type AlertState = {
  type: "saving" | "success" | "error";
  text: string;
} | null;

function findProducts(value: any): any[] | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.products)) return value.products;
  if (Array.isArray(value.produtos)) return value.produtos;
  if (Array.isArray(value.items)) return value.items;
  if (value.data) return findProducts(value.data);
  if (value.payload) return findProducts(value.payload);
  return null;
}

export default function AdminSaveAlert() {
  const [alert, setAlert] = useState<AlertState>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    function clearLater(ms: number) {
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setAlert(null), ms);
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = String(init?.method || "GET").toUpperCase();
      const isAdminSave =
        url.includes("/api/admin/") &&
        ["POST", "PUT", "PATCH"].includes(method);

      if (!isAdminSave) return originalFetch(input, init);

      setAlert({
        type: "saving",
        text: "Salvando e sincronizando as alterações com o site...",
      });

      try {
        if (typeof init?.body === "string") {
          const payload = JSON.parse(init.body);
          const products = findProducts(payload);

          if (products && products.length > 50) {
            throw new Error("Limite atingido: o painel permite cadastrar até 50 produtos.");
          }
        }

        const response = await originalFetch(input, {
          ...init,
          cache: "no-store",
          headers: {
            ...(init?.headers as any),
            "Cache-Control": "no-store",
          },
        });

        let body: any = null;

        try {
          body = await response.clone().json();
        } catch {}

        if (!response.ok || body?.ok === false) {
          throw new Error(body?.message || `Erro HTTP ${response.status} ao salvar.`);
        }

        await originalFetch("/api/storefront?refresh=" + Date.now(), {
          cache: "no-store",
        }).catch(() => null);

        setAlert({
          type: "success",
          text: body?.message || "Salvo com sucesso. O site recebeu a atualização.",
        });

        clearLater(7500);
        return response;
      } catch (error: any) {
        setAlert({
          type: "error",
          text: error?.message || "Erro ao salvar. Verifique a conexão e tente novamente.",
        });

        clearLater(10000);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, []);

  if (!alert) return null;

  const isSaving = alert.type === "saving";
  const isError = alert.type === "error";

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 18,
        zIndex: 999999,
        width: "min(430px, calc(100vw - 36px))",
        borderRadius: 20,
        padding: "16px 18px",
        border: isError ? "1px solid #fecaca" : "1px solid rgba(120,70,0,.22)",
        background: isError
          ? "linear-gradient(135deg,#fff1f2,#fecaca)"
          : "linear-gradient(135deg,#fff7d7,#ffd36a)",
        color: isError ? "#991b1b" : "#422006",
        boxShadow: "0 18px 44px rgba(0,0,0,.28)",
        fontWeight: 900,
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {isSaving ? (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "4px solid rgba(70,35,0,.25)",
              borderTopColor: "#4b2600",
              display: "inline-block",
              animation: "spinSaveAdmin .75s linear infinite",
            }}
          />
        ) : (
          <span style={{ fontSize: 22 }}>{isError ? "✕" : "✓"}</span>
        )}

        <span>{alert.text}</span>
      </div>

      <style>{`@keyframes spinSaveAdmin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
