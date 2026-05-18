"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n/I18nContext";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClientInstance}>
        <AuthProvider>
          <I18nProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
              {children}
              <Toaster />
              <SonnerToaster />
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
