import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Exale Cosméticos Naturais"
export const size = {
  width: 1200,
  height: 630
}
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #070403 0%, #120b07 35%, #5a3317 72%, #d4af37 100%)",
          color: "#ffd56a",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "42px",
            border: "3px solid rgba(255,213,106,.58)",
            borderRadius: "48px"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "820px",
            height: "820px",
            borderRadius: "999px",
            right: "-190px",
            top: "-210px",
            background: "radial-gradient(circle, rgba(255,213,106,.35), rgba(212,175,55,.16), transparent 65%)"
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "70px",
            zIndex: 2
          }}
        >
          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "38px",
              border: "3px solid rgba(255,213,106,.88)",
              background: "radial-gradient(circle, #ffd56a 0%, #d4af37 45%, #5a3317 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#120b07",
              fontSize: "96px",
              fontWeight: 900,
              marginBottom: "28px",
              boxShadow: "0 0 55px rgba(255,213,106,.55)"
            }}
          >
            E
          </div>
          <div
            style={{
              fontSize: "104px",
              fontWeight: 900,
              letterSpacing: "-4px",
              color: "#ffd56a"
            }}
          >
            Exale
          </div>
          <div
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: "#fff7d1",
              marginTop: "8px"
            }}
          >
            Cosméticos Naturais & Velas Artesanais
          </div>
          <div
            style={{
              marginTop: "26px",
              fontSize: "30px",
              color: "#f4e4c9",
              fontWeight: 700
            }}
          >
            Body Splash · Argilas · Hidratantes · Sabonetes · Banho Premium
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  )
}
