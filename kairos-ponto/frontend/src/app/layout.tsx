import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kairos Ponto",
  description: "Controle de jornada de trabalho — Ecossistema Kairos 2.0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
