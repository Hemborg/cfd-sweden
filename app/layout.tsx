import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { Manrope, Martian_Mono, Josefin_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "500",
});

const logoFont = Josefin_Sans({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    title: site.title,
    description: site.socialDescription,
    url: site.url,
    siteName: site.name,
    locale: "sv_SE",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const lang = (h.get("x-pathname") ?? "").startsWith("/en") ? "en" : "sv";
  return (
    <html
      lang={lang}
      className={`${bodyFont.variable} ${monoFont.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}
