"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#fffaf1",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 20,
            color: "#4a2815",
            fontFamily:
              "Arial, Helvetica, sans-serif",
          }}
        >
          <section
            style={{
              width: "min(540px,100%)",
              padding: 28,
              borderRadius: 24,
              background: "#ffffff",
              textAlign: "center",
              boxShadow:
                "0 20px 55px rgba(74,40,21,.14)",
            }}
          >
            <h1>
              A loja encontrou uma falha temporária
            </h1>

            <p>
              Clique abaixo para recarregar o site.
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
                background: "#4a2815",
                fontWeight: 900,
              }}
            >
              Reabrir o site
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
