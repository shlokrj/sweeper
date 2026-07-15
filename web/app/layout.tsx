import type { Metadata } from "next";
import "@fontsource-variable/inclusive-sans";
import "@fontsource/press-start-2p";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sweeper | Minesweeper research",
  description: "A research interface for Minesweeper agents, board state, and benchmark results.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
