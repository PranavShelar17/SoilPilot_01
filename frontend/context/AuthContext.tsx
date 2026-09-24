"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  authService,
  GatLoginPayload,
  FarmerSession,
  FieldSession,
  LocationSession,
  AuthSuccessResponse,
} from "@/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  field: FieldSession | null;
  farmer: FarmerSession | null;
  location: LocationSession | null;
  login: (payload: GatLoginPayload) => Promise<AuthSuccessResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [field, setField] = useState<FieldSession | null>(null);
  const [farmer, setFarmer] = useState<FarmerSession | null>(null);
  const [location, setLocation] = useState<LocationSession | null>(null);

  // Restore session on mount / page reload
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const sessionData = await authService.getCurrentSession();
        if (isMounted && sessionData?.authenticated) {
          setIsAuthenticated(true);
          setField(sessionData.field);
          setFarmer(sessionData.farmer);
          setLocation(sessionData.location);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
          setField(null);
          setFarmer(null);
          setLocation(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: GatLoginPayload): Promise<AuthSuccessResponse> => {
    setLoading(true);
    try {
      const res = await authService.gatLogin(payload);
      setIsAuthenticated(true);
      setField(res.field);
      setFarmer(res.farmer);
      setLocation(res.location);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setIsAuthenticated(false);
      setField(null);
      setFarmer(null);
      setLocation(null);
      setLoading(false);
      router.push("/");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        field,
        farmer,
        location,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
