import type { SVGProps } from "react";

type LogoPartProps = SVGProps<SVGSVGElement> & { decorative?: boolean; tone?: "original" | "white" };

/** Original pixels, cropped without resizing. This SVG wrapper is not a vector tracing. */
export function BrandSymbol({ decorative = false, tone = "original", style, ...props }: LogoPartProps) {
  return (
    <svg viewBox="0 0 532 532" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "New Paradigm Institute-symbol"} aria-hidden={decorative || undefined} style={{ ...style, filter: tone === "white" ? "brightness(0) invert(1)" : style?.filter }} {...props}>
      <image href="/brand/cfd-symbol.png" width="532" height="532" />
    </svg>
  );
}

/** Separate chapter label; the original Florida subtitle font is not confirmed. */
export function BrandCountryName({ decorative = false, tone = "original", ...props }: LogoPartProps) {
  return (
    <svg viewBox="0 0 1108 108" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "Sweden"} aria-hidden={decorative || undefined} {...props}>
      <text x="554" y="81" textAnchor="middle" fill={tone === "white" ? "#ffffff" : "#464342"} fontFamily="var(--font-logo), sans-serif" fontSize="60" fontWeight="600" letterSpacing="10">SWEDEN</text>
    </svg>
  );
}

export function BrandWordmark({ country = false, decorative = false, tone = "original", style, ...props }: LogoPartProps & { country?: boolean }) {
  return (
    <svg viewBox={`0 0 1108 ${country ? 432 : 324}`} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `Citizens for Disclosure${country ? " Sweden" : ""}`} aria-hidden={decorative || undefined} style={{ ...style, filter: tone === "white" ? "brightness(0) invert(1)" : style?.filter }} {...props}>
      <image href="/brand/cfd-wordmark.png" width="1108" height="324" />
      {country && <BrandCountryName decorative x="0" y="324" width="1108" height="108" />}
    </svg>
  );
}

/** Full chapter lockup. Each exported part can also be used on its own. */
export function BrandLogo({ decorative = false, tone = "original", style, ...props }: LogoPartProps) {
  return (
    <svg viewBox="0 0 1698 532" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "CFD Sweden – Citizens for Disclosure"} aria-hidden={decorative || undefined} style={{ ...style, filter: tone === "white" ? "brightness(0) invert(1)" : style?.filter }} {...props}>
      <title>CFD Sweden – Citizens for Disclosure</title>
      <BrandSymbol decorative x="0" y="0" width="532" height="532" />
      <BrandWordmark decorative country x="590" y="100" width="1108" height="432" />
    </svg>
  );
}
