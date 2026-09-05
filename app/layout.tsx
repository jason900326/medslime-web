import type { Metadata } from "next";
import "./globals.css";
import { GameStateProvider } from "@/components/game-state-provider";
import ScrollJumpButtons from "@/components/scroll-jump-buttons";
import FirstLoginOnboarding from "@/components/first-login-onboarding";
import BetaFeedbackButton from "@/components/beta-feedback-button";
import RouteUtilities from "@/components/route-utilities";

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
        <GameStateProvider>
          {children}
          <FirstLoginOnboarding />
          <BetaFeedbackButton />
          <ScrollJumpButtons />
          <RouteUtilities />
        </GameStateProvider>
      </body>
    </html>
  );
}
