/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

export default function AdminProfessionalEnhancer() {
  const [toast, setToast] = useState<any>(null);

  function showToast(type: "ok" | "error" | "info", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), type === "error" ? 8000 : 4200);
  }

  useEffect(() => {
    function onImageError(event: Event) {
      const image = event.target as HTMLImageElement;

      if (!image || image.tagName !== "IMG") return;
      if (image.src.includes("exale-produto-sem-foto.svg")) return;

      image.src = "/exale-produto-sem-foto.svg";
    }

    document.addEventListener("error", onImageError, true);

    return () => {
      document.removeEventListener("error", onImageError, true);
    };
  }, []);

  useEffect(() => {
    window.exaleAdminToast = showToast;
  }, []);

  return (
    <>
      {toast && (
        <div
          data-exale-admin-toast="1"
          style={{
            position: "fixed",
            left: "50%",
            top: 14,
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            width: "min(480px, calc(100vw - 28px))",
            borderRadius: 16,
            padding: "13px 15px",
            fontWeight: 950,
            textAlign: "center",
            lineHeight: 1.35,
            color: toast.type === "error" ? "#7f1d1d" : toast.type === "ok" ? "#064e3b" : "#172554",
            background:
              toast.type === "error"
                ? "linear-gradient(135deg,#fff1f2,#fecaca)"
                : toast.type === "ok"
                  ? "linear-gradient(135deg,#ecfdf5,#a7f3d0)"
                  : "linear-gradient(135deg,#eff6ff,#bfdbfe)",
            boxShadow: "0 16px 38px rgba(0,0,0,.26)",
            border: "1px solid rgba(0,0,0,.08)",
          }}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}
