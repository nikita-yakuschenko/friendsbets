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

const siteTitle = "FriendsBets — турнир прогнозов";
const siteDescription = "Закрытый турнир прогнозов на футбольные матчи";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "FriendsBets",
    images: [{ url: "/favicon.png", alt: "FriendsBets" }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/favicon.png"],
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
