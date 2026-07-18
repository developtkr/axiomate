import { createContext } from "react";

export interface AxiomateUser {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string;
}

export interface AuthContextValue {
  configured: boolean;
  loaded: boolean;
  signedIn: boolean;
  user?: AxiomateUser;
  getToken(): Promise<string | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export const guestAuth: AuthContextValue = {
  configured: false,
  loaded: true,
  signedIn: false,
  getToken: async () => null,
  signIn: async () => undefined,
  signOut: async () => undefined,
};

export const AuthContext = createContext<AuthContextValue>(guestAuth);
