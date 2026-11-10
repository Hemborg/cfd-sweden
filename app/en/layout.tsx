import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "CFD Sweden | Citizens for Disclosure",
    template: "%s | CFD Sweden",
  },
  description: "The Swedish chapter of Citizens for Disclosure, working for responsible transparency on UAP.",
  openGraph: {
    locale: "en_US",
    type: "website",
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
