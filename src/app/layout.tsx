import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from "next-auth/react";
import ClientLayout from "./clientLayout";
import { EntityProvider } from '@/contexts/EntityContext';

export const metadata: Metadata = {
  title: 'Data Bridge',
  description: 'Intelligent Data Processing and Enrichment Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <EntityProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </EntityProvider>
      </body>
    </html>
  );
}
