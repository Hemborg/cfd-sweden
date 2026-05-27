import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CFD Sweden | Citizens for Disclosure",
  description:
    "CFD Sweden organiserar svenskar för ansvarsfull transparens kring UFO/UAP-frågan.",
  metadataBase: new URL("https://cfdsweden.se"),
  openGraph: {
    title: "CFD Sweden | Citizens for Disclosure",
    description:
      "Den svenska grenen av Citizens for Disclosure, inom New Paradigm Institute.",
    url: "https://cfdsweden.se",
    siteName: "CFD Sweden",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
