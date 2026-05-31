import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body
        className={`${inter.className} min-h-full bg-brand-bg text-white antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
