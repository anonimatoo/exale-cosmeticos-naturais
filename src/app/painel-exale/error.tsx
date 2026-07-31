/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect } from "react";

export default function PainelExaleError({
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
      "[EXALE PAINEL] Falha da rota:",
      error
    );
  }, [error]);

  return (
    <main className="painel-route-error">
      <section>
        <div className="painel-error-logo">E</div>

        <span>Painel administrativo</span>

        <h1>Falha temporária no painel</h1>

        <p>
          Os produtos, imagens e configurações permanecem
          salvos. Recarregue somente o painel para tentar
          novamente.
        </p>

        <button
          type="button"
          onClick={reset}
        >
          Recarregar painel
        </button>

        <a href="/">
          Voltar para a loja
        </a>
      </section>

      <style jsx>{`
        .painel-route-error {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 18px;
          color: #4a2815;
          background:
            linear-gradient(
              180deg,
              #fffaf1,
              #f2dfbe
            );
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        section {
          width: min(560px, 100%);
          padding: 36px 27px;
          border: 1px solid rgba(74, 40, 21, 0.14);
          border-radius: 27px;
          background: #fffaf1;
          text-align: center;
          box-shadow:
            0 22px 60px rgba(74, 40, 21, 0.14);
        }

        .painel-error-logo {
          width: 66px;
          height: 66px;
          display: grid;
          place-items: center;
          margin: 0 auto 17px;
          border-radius: 20px;
          color: #ffe39a;
          background: #160c07;
          font-size: 27px;
          font-weight: 950;
        }

        span {
          color: #b37e1c;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
        }

        h1 {
          margin: 8px 0 0;
          font-size: clamp(35px, 8vw, 50px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        p {
          color: #765033;
          line-height: 1.55;
        }

        button,
        a {
          width: 100%;
          min-height: 47px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
          border: 0;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 950;
          cursor: pointer;
        }

        button {
          color: #fff;
          background:
            linear-gradient(
              135deg,
              #160c07,
              #c5962f
            );
        }

        a {
          color: #4a2815;
          background: #f2e2c5;
        }
      `}</style>
    </main>
  );
}
