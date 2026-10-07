import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/Providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Podium Apartments | Serviced apartments in Transekulu, Enugu",
    template: "%s | Podium Apartments",
  },
  description:
    "Book furnished serviced apartments by the night in Transekulu, Enugu. 24/7 power, fast Wi-Fi, secure parking and instant online booking from ₦30,000 a night.",
  keywords: ["serviced apartments Enugu", "short let Enugu", "Transekulu apartments", "daily rental Enugu", "furnished apartments Enugu", "Airbnb Enugu"],
  applicationName: "Podium Apartments",
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "Podium Apartments",
    title: "Podium Apartments | Serviced apartments in Transekulu, Enugu",
    description: "Furnished serviced apartments by the night in Transekulu, Enugu. Book online in minutes.",
    images: [{ url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80", width: 1200, height: 630, alt: "A Podium Apartments living room" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Podium Apartments",
  description: "Furnished serviced apartments rented by the night in Transekulu, Enugu, Nigeria.",
  url: siteUrl,
  priceRange: "₦30,000 – ₦63,000",
  currenciesAccepted: "NGN",
  address: { "@type": "PostalAddress", addressLocality: "Transekulu, Enugu", addressRegion: "Enugu", addressCountry: "NG" },
  geo: { "@type": "GeoCoordinates", latitude: 6.4498, longitude: 7.5227 },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
