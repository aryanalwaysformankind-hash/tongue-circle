import { Link, Navigate } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import { Globe2 } from "lucide-react";

interface AuthProps {
  mode: "sign-in" | "sign-up";
}

export default function Auth({ mode }: AuthProps) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <p data-testid="sign-in-loading-message" className="p-8 text-center text-stone-600">Loading sign-in…</p>;
  }
  if (isSignedIn) return <Navigate to="/" replace />;

  return (
    <main className="min-h-svh bg-[#FAF8F5] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="auth-brand-link">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#D9532F] text-white">
            <Globe2 className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-bold">Tongue Circle</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-stone-600 hover:text-[#B84728]" data-testid="auth-back-link">
          Back to welcome
        </Link>
      </div>
      <section className="mx-auto mt-10 grid max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_28px_80px_rgba(73,57,45,0.12)] lg:min-h-[680px] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-[#2A5B52] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-25">
            <img
              src="https://images.unsplash.com/photo-1573496129783-779a090a72f2?auto=format&fit=crop&w=1100&q=85"
              alt="Language learners talking together"
              className="h-full w-full object-cover"
              data-testid="auth-side-photo"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#173a34]/90 via-[#2A5B52]/70 to-[#173a34]/85" />
          <p data-testid="auth-side-kicker" className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/75">
            Conversations without borders
          </p>
          <div className="relative max-w-md">
            <h1 data-testid="auth-side-headline" className="font-heading text-4xl font-bold leading-tight">
              Learn a language from the people who live it.
            </h1>
            <p data-testid="auth-side-description" className="mt-4 text-base leading-7 text-white/80">
              Meet learners, share your perspective, and let every conversation teach you something new.
            </p>
          </div>
          <p data-testid="auth-side-footer" className="relative text-sm text-white/70">
            A welcoming place for curious people everywhere.
          </p>
        </div>
        <div className="flex items-center justify-center p-5 sm:p-9">
          {mode === "sign-in" ? (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              withSignUp
              appearance={{ variables: { colorPrimary: "#D9532F", borderRadius: "14px" } }}
            />
          ) : (
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              appearance={{ variables: { colorPrimary: "#D9532F", borderRadius: "14px" } }}
            />
          )}
        </div>
      </section>
      <p data-testid="auth-translation-note" className="mx-auto mt-5 max-w-lg text-center text-xs leading-5 text-stone-500">
        Joining is free. Translation is available in conversations and profile descriptions.
      </p>
    </main>
  );
}
