
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FontAwesomeConfig from "@/components/FontAwesomeConfig";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { ToastProvider } from "@/context/ToastContext";
import SalesNotification from "@/components/features/notification/SalesNotification";
import HelpCenterWidget from "@/components/features/cs/HelpCenterWidget";

// ... existing imports

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Digital Store",
  description: "Premium Digital Products",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // Fetch CS Configs & FAQs
  // @ts-ignore
  const csConfigs = await prisma.systemConfig.findMany({
    where: { key: { in: ['CS_WHATSAPP', 'CS_TELEGRAM'] } }
  });
  const csWhatsapp = csConfigs.find((c: any) => c.key === 'CS_WHATSAPP')?.value || '';
  const csTelegram = csConfigs.find((c: any) => c.key === 'CS_TELEGRAM')?.value || '';

  // @ts-ignore
  const faqs = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FontAwesomeConfig />
        <Navbar />
        <MobileNav />
        <main className="min-h-screen transition-colors duration-300">
          <ToastProvider>
            {children}
            <SalesNotification />
            <HelpCenterWidget whatsapp={csWhatsapp} telegram={csTelegram} faqs={faqs} />
          </ToastProvider>
        </main>
      </body>
    </html>
  );
}
