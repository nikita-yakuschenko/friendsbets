import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter } from "next/font/google";
import { AppToaster } from "@/components/ui/app-toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FriendsBets — турнир прогнозов",
  description: "Закрытый турнир прогнозов на футбольные матчи",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${ibmPlexSans.variable} h-dvh overflow-hidden`}
    >
      <body
        className={`${inter.className} h-dvh overflow-hidden bg-brand-bg text-white antialiased`}
        suppressHydrationWarning
      >
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
