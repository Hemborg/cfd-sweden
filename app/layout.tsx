import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${bodyFont.variable} ${monoFont.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
