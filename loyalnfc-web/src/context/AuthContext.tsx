import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  RecaptchaVerifier,
} from "firebase/auth";
import type { User, ConfirmationResult, UserCredential } from "firebase/auth";
import { auth } from "../lib/firebase";


export type UserRole = "super_admin" | "business_admin" | "customer" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  businessId: string | null;
  loading: boolean;
  signInStaff: (email: string, pass: string) => Promise<UserCredential>;
  sendPhoneOtp: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const parseUserClaims = async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setRole(null);
      setBusinessId(null);
      setLoading(false);
      return;
    }

    try {
      // Force token refresh to obtain updated custom claims
      const tokenResult = await currentUser.getIdTokenResult(true);
      const claimsRole = (tokenResult.claims.role as UserRole) || null;
      const claimsBusinessId = (tokenResult.claims.businessId as string) || null;

      setUser(currentUser);
      setRole(claimsRole);
      setBusinessId(claimsBusinessId);
    } catch (err) {
      console.error("Failed to parse custom claims:", err);
      setUser(currentUser);
      setRole(null);
      setBusinessId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      parseUserClaims(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const signInStaff = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await parseUserClaims(cred.user);
      return cred;
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  };

  const verifyPhoneOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    setLoading(true);
    try {
      const cred = await confirmationResult.confirm(otp);
      await parseUserClaims(cred.user);
      return cred;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
    setBusinessId(null);
    setLoading(false);
  };

  const refreshClaims = async () => {
    if (auth.currentUser) {
      await parseUserClaims(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        businessId,
        loading,
        signInStaff,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
        refreshClaims,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
