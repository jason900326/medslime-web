import type { Metadata } from "next";
import "./globals.css";
import { GameStateProvider } from "@/components/game-state-provider";

export const metadata: Metadata = {
  title: "MedSlime",
  description: "學習工具 × 史萊姆收藏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <GameStateProvider>{children}</GameStateProvider>
      </body>
    </html>
  );
}
