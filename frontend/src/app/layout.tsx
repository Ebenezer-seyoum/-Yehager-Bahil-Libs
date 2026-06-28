import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppFrame } from "@/components/app-frame";
import { AuthenticatedGate } from "@/components/authenticated-gate";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://www.yehagerbahillibs.com";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Yehager Bahil Libs",
    template: "%s | Yehager Bahil Libs",
  },
  description: "Handcrafted Ethiopian traditional attire, custom measurements, and cultural fashion by Yehager Bahil Libs.",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Yehager Bahil Libs",
    description: "Handcrafted Ethiopian traditional attire, custom measurements, and cultural fashion by Yehager Bahil Libs.",
    type: "website",
    url: "/",
    siteName: "Yehager Bahil Libs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yehager Bahil Libs",
    description: "Handcrafted Ethiopian traditional attire, custom measurements, and cultural fashion by Yehager Bahil Libs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} dark h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AuthenticatedGate>
            <AppFrame>{children}</AppFrame>
          </AuthenticatedGate>
        </Providers>
      </body>
    </html>
  );
}
