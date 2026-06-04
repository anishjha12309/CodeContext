import "./globals.css";
import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "@/trpc/react";
import { ToasterWithTheme } from "@/components/toaster-with-theme";
import { Providers } from "@/components/providers";
import { Playfair_Display, Inter, Roboto_Mono } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeContext",
  description: "AI-powered codebase intelligence",
  icons: [{ rel: "icon", url: "/favicon.png", type: "image/png" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#0ea5e9" } }}>
      <html lang="en" suppressHydrationWarning className="dark scroll-smooth">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <body
          className={`${inter.variable} ${playfair.variable} ${robotoMono.variable} min-h-screen bg-[#080808] font-sans antialiased`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Providers>
            <TRPCReactProvider>
              {children}
              <ToasterWithTheme />
            </TRPCReactProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
