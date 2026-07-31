export default function PainelExaleLoading() {
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
          width: "min(480px,100%)",
          padding: 28,
          borderRadius: 24,
          background: "#fffaf1",
          textAlign: "center",
          fontWeight: 900,
          boxShadow:
            "0 18px 50px rgba(74,40,21,.13)",
        }}
      >
        Carregando painel administrativo...
      </section>
    </main>
  );
}
