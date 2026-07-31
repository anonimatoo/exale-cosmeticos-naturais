/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      "Erro recuperável da aplicação:",
      error
    );
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        color: "#4a2815",
        background:
          "linear-gradient(180deg,#fffaf1,#f2dfbe)",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(560px,100%)",
          padding: 28,
          borderRadius: 24,
          background: "#fffaf1",
          border:
            "1px solid rgba(74,40,21,.15)",
          boxShadow:
            "0 20px 55px rgba(74,40,21,.13)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 15px",
            borderRadius: 18,
            color: "#ffe49d",
            background: "#160c07",
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          E
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 35,
            lineHeight: 1,
          }}
        >
          Não foi possível carregar esta parte
        </h1>

        <p
          style={{
            color: "#765033",
            lineHeight: 1.55,
          }}
        >
          Sua conexão pode ter oscilado.
          Tente novamente sem perder os dados já
          cadastrados.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 46,
            padding: "11px 18px",
            border: 0,
            borderRadius: 999,
            color: "#fff",
            background:
              "linear-gradient(135deg,#160c07,#c5962f)",
            fontWeight: 900,
          }}
        >
          Tentar novamente
        </button>

        <a
          href="/"
          style={{
            display: "block",
            marginTop: 13,
            color: "#4a2815",
            fontWeight: 800,
          }}
        >
          Voltar para a loja
        </a>
      </section>
    </main>
  );
}
