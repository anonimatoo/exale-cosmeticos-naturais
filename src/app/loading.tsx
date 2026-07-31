export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#4a2815",
        background:
          "linear-gradient(180deg,#fffaf1,#f2dfbe)",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          padding: 22,
          borderRadius: 20,
          background: "#fffaf1",
          fontWeight: 900,
          boxShadow:
            "0 15px 40px rgba(74,40,21,.1)",
        }}
      >
        Carregando Exale...
      </div>
    </main>
  );
}
