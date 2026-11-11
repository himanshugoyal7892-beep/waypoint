import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import { ClerkProvider } from "@clerk/nextjs";
import { PRODUCT } from "@waypoint/shared";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: PRODUCT.name, template: `%s · ${PRODUCT.name}` },
  description: PRODUCT.tagline,
  icons: { icon: "/brand/icon.svg" },
};

// Clerk's sign-in, sign-up and account screens follow the Waypoint theme.
const clerkAppearance = {
  variables: {
    colorPrimary: "#4A44D6",
    colorText: "#171A3D",
    colorTextSecondary: "#5D6283",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    borderRadius: "0.6rem",
    fontFamily: '"Instrument Sans Variable", ui-sans-serif, system-ui, sans-serif',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body className="min-h-screen font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
