import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import type { ClerkConfig } from "@/lib/types";

interface ClerkAuthProviderProps {
  children: ReactNode;
}

const appearance = {
  variables: {
    colorPrimary: "#D9532F",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorForeground: "#1E1F24",
    colorInput: "#FFFFFF",
    colorInputForeground: "#1E1F24",
    colorBorder: "#E8E4DF",
    fontFamily: "DM Sans Variable, sans-serif",
    borderRadius: "14px",
  },
};

export default function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ClerkConfig | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt = 0) => {
      try {
        const result = await apiGet<ClerkConfig>("/clerk/config");
        if (result.enabled) {
          if (!cancelled) setConfig(result);
          return;
        }
      } catch {
        // The backend may be restarting just after auth provisioning.
      }
      if (cancelled) return;
      if (attempt >= 20) {
        setUnavailable(true);
        return;
      }
      timer = setTimeout(() => void load(attempt + 1), 1500);
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (unavailable) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#FAF8F5] px-6">
        <section className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <p data-testid="auth-unavailable-message" className="text-lg font-semibold">
            Sign-in is getting a little rest
          </p>
          <p data-testid="auth-unavailable-detail" className="mt-2 text-sm text-stone-600">
            Refresh this page in a moment to continue to Tongue Circle.
          </p>
        </section>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#FAF8F5]">
        <p data-testid="auth-loading-message" className="text-sm text-stone-600">
          Preparing your language community…
        </p>
      </main>
    );
  }

  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
