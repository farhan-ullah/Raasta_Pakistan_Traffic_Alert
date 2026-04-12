import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "raasta_police_token";

interface PoliceAuthContextType {
  token: string | null;
  isLoading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const PoliceAuthContext = createContext<PoliceAuthContextType>({
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function PoliceAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const apiBase = `https://${domain}`;

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then(async (saved) => {
        if (!saved) return;
        try {
          const res = await fetch(`${apiBase}/api/auth/police/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: saved }),
          });
          const { valid } = await res.json() as { valid: boolean };
          if (valid) setToken(saved);
          else await AsyncStorage.removeItem(TOKEN_KEY);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiBase}/api/auth/police/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const { token: newToken } = await res.json() as { token: string };
        await AsyncStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        return { success: true };
      }
      return { success: false, error: "Invalid access code" };
    } catch {
      return { success: false, error: "Connection error. Try again." };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <PoliceAuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </PoliceAuthContext.Provider>
  );
}

export function usePoliceAuth() {
  return useContext(PoliceAuthContext);
}
