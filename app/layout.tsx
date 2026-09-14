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
    default: "MedSlime｜醫檢師國考刷題、歷屆試題、AI 詳解與弱點分析",
    template: "%s｜MedSlime",
  },
  description:
    "MedSlime 是給醫技系與醫事檢驗師國考考生使用的刷題網站，提供歷屆國考題、AI 詳解、錯題複習、弱點分析、讀書計時與史萊姆收藏。",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: SITE_URL,
    siteName: "MedSlime",
    title: "MedSlime｜醫檢師國考刷題、歷屆試題、AI 詳解與弱點分析",
    description:
      "刷醫檢師歷屆國考題、看 AI 詳解、整理錯題與弱點分析，還能收集史萊姆。",
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
    title: "MedSlime｜醫檢師國考刷題與 AI 詳解",
    description:
      "醫檢師歷屆國考題、AI 詳解、錯題複習、弱點分析與史萊姆收藏。",
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
