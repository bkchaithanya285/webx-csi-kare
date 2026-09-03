import type { Metadata } from "next";
import "./globals.css";
import { IntroProvider } from "@/context/IntroContext";
import { AppLayout } from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "WEBX — Into the Web of Innovation | CSI Hackathon Portal",
  description: "Official 24-Hour Hackathon Portal for WEBX - Into the Web of Innovation. Organized by CSI KLU Student Chapter.",
  keywords: ["WEBX", "Hackathon", "CSI KLU", "KLU", "Coding", "Innovation", "24-Hour Hackathon"],
  icons: {
    icon: "/assets/csi logo.png",
    shortcut: "/assets/csi logo.png",
    apple: "/assets/csi logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-white min-h-screen">
        <IntroProvider>
          <AppLayout>{children}</AppLayout>
        </IntroProvider>
      </body>
    </html>
  );
};
