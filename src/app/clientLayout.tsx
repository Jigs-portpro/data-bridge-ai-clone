"use client";

import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </SessionProvider>
  );
}
