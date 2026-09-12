import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { GameStateProvider } from "@/components/game-state-provider";
import ScrollJumpButtons from "@/components/scroll-jump-buttons";
import FirstLoginOnboarding from "@/components/first-login-onboarding";
import CampaignWelcomeGift from "@/components/campaign-welcome-gift";
import RouteUtilities from "@/components/route-utilities";
import SiteFooter from "@/components/site-footer";
import LegacyEraLabelNormalizer from "@/components/legacy-era-label-normalizer";

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
        <Suspense fallback={null}>
          <GameStateProvider>
            {children}
            <SiteFooter />
            <FirstLoginOnboarding />
            <CampaignWelcomeGift />
            <ScrollJumpButtons />
            <RouteUtilities />
            <LegacyEraLabelNormalizer />
          </GameStateProvider>
        </Suspense>
      </body>
    </html>
  );
}
