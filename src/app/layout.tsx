import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://exale-cosmeticos-naturais.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Exale Cosméticos Naturais",
    template: "%s | Exale Cosméticos Naturais",
  },
  description:
    "Cosméticos naturais, velas artesanais, body splash, argilas, hidratantes, sabonetes realistas e banho premium.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Exale Cosméticos Naturais",
    title: "Exale Cosméticos Naturais",
    description: "Linhas artesanais de beleza, banho premium e presentes especiais.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Exale Cosméticos Naturais" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exale Cosméticos Naturais",
    description: "Cosméticos naturais, velas artesanais e banho premium.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
