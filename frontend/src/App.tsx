import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import Messages from "@/pages/Messages";
import PersonProfile from "@/pages/PersonProfile";
import Phrases from "@/pages/Phrases";
import Profile from "@/pages/Profile";
import { beginSession } from "@/lib/session";

function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <p data-testid="app-loading-message" className="p-8 text-center text-stone-600">Loading your community…</p>;
  }
  if (!isSignedIn) return <Landing />;
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) beginSession();
  }, [isLoaded, isSignedIn]);

  return (
    <Routes>
      <Route path="/sign-in/*" element={<Auth mode="sign-in" />} />
      <Route path="/sign-up/*" element={<Auth mode="sign-up" />} />
      <Route path="/" element={<ProtectedPage><Home /></ProtectedPage>} />
      <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
      <Route path="/messages" element={<ProtectedPage><Messages /></ProtectedPage>} />
      <Route path="/messages/:conversationId" element={<ProtectedPage><Messages /></ProtectedPage>} />
      <Route path="/people/:userId" element={<ProtectedPage><PersonProfile /></ProtectedPage>} />
      <Route path="/phrases" element={<ProtectedPage><Phrases /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ClerkAuthProvider>
      <AppRoutes />
      <Toaster richColors />
    </ClerkAuthProvider>
  );
}
