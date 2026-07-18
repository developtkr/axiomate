import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/react";
import { useCallback, useMemo, type ReactNode } from "react";
import { AuthContext, guestAuth, type AuthContextValue } from "./authContext";

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const signIn = useCallback(async () => {
    await clerk.openSignIn();
  }, [clerk]);
  const signOut = useCallback(async () => {
    await clerk.signOut();
  }, [clerk]);
  const value = useMemo<AuthContextValue>(() => ({
    configured: true,
    loaded: isLoaded,
    signedIn: Boolean(isSignedIn),
    user: user ? {
      id: user.id,
      name: user.fullName ?? user.username ?? "Researcher",
      email: user.primaryEmailAddress?.emailAddress,
      imageUrl: user.imageUrl,
    } : undefined,
    getToken,
    signIn,
    signOut,
  }), [getToken, isLoaded, isSignedIn, signIn, signOut, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return <AuthContext.Provider value={guestAuth}>{children}</AuthContext.Provider>;
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}
