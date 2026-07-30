import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KodeHarga — Cari Harga atau Kode",
  description:
    "Cari harga atau kode unik 4 karakter untuk nominal Rp1.000 sampai Rp1.000.000.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
