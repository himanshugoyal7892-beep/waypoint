import { ClerkProvider } from "@clerk/nextjs";
import { PRODUCT } from "@waypoint/shared";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: PRODUCT.name, template: `%s · ${PRODUCT.name}` },
  description: PRODUCT.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
