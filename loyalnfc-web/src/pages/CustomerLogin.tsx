import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Smartphone, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export const CustomerLogin: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize reCAPTCHA verifier for phone OTP auth
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
    });
    setRecaptchaVerifier(verifier);

    return () => {
      verifier.clear();
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recaptchaVerifier) {
      setError("reCAPTCHA verifier initializing, please wait a moment.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendPhoneOtp(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Please check phone number format (e.g. +1234567890).");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!confirmationResult) {
      setError("No OTP session active.");
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOtp(confirmationResult, otp);
      navigate("/c");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid OTP verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-400">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Customer Portal</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in with your mobile number to view loyalty rewards
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Mobile Phone Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all text-slate-100 placeholder-slate-600"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Include country code (e.g. +1 for US, +91 for IN)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group"
            >
              <span>{loading ? "Sending OTP..." : "Send Security Code"}</span>
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Enter 6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Change Phone
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm tracking-widest text-center text-slate-100 placeholder-slate-600 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loading ? "Verifying..." : "Verify & View Rewards"}</span>
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-slate-500">
          Staff member?{" "}
          <button
            onClick={() => navigate("/staff-login")}
            className="text-emerald-400 hover:underline font-medium"
          >
            Staff Email Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
