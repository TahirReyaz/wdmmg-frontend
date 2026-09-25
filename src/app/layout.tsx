import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Where did my money go", template: "%s · Where did my money go" },
  description: "Personal expenses, shared costs and where the money actually went.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161918" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sans.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
