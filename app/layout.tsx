import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { GameStateProvider } from "@/components/game-state-provider";
import { FocusTimerProvider } from "@/components/focus-timer-provider";
import ScrollJumpButtons from "@/components/scroll-jump-buttons";
import FirstLoginOnboarding from "@/components/first-login-onboarding";
import CampaignWelcomeGift from "@/components/campaign-welcome-gift";
import RouteUtilities from "@/components/route-utilities";
import SiteFooter from "@/components/site-footer";
import LegacyEraLabelNormalizer from "@/components/legacy-era-label-normalizer";

const SITE_URL = "https://medslime.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MedSlime｜國考刷題與弱點補強",
    template: "%s｜MedSlime",
  },
  description:
    "刷國考歷屆題，從作答紀錄找出弱點，知道下一步該讀什麼。",
  applicationName: "MedSlime",
  keywords: [
    "醫檢師國考",
    "醫事檢驗師國考",
    "醫檢國考",
    "醫技國考",
    "國考刷題",
    "醫檢師國考刷題",
    "醫檢師國考題庫",
    "醫檢師歷屆試題",
    "醫事檢驗師歷屆試題",
    "國考題庫",
    "AI 詳解",
    "錯題複習",
  ],
  verification: {
    google: "D8CeE1MidMYtQ3Fgv3B9-joH0qQXtTKBuIsMe-FurEI",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: SITE_URL,
    siteName: "MedSlime",
    title: "MedSlime｜國考刷題與弱點補強",
    description: "刷國考歷屆題，從作答紀錄找出弱點，知道下一步該讀什麼。",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "MedSlime 醫檢師國考學習網站",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MedSlime｜國考刷題與弱點補強",
    description: "刷國考歷屆題，從作答紀錄找出弱點，知道下一步該讀什麼。",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
            <FocusTimerProvider>
              {children}
              <SiteFooter />
              <FirstLoginOnboarding />
              <CampaignWelcomeGift />
              <ScrollJumpButtons />
              <RouteUtilities />
              <LegacyEraLabelNormalizer />
            </FocusTimerProvider>
          </GameStateProvider>
        </Suspense>
      </body>
    </html>
  );
}
