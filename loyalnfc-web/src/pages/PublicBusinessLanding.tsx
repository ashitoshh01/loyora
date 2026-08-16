import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import {
  Store,
  Star,
  MapPin,
  Globe,
  Phone,
  Mail,
  Smartphone,
  Gift,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface OfferItem {
  title: string;
  description: string;
  tag?: string;
}

interface PublicBusinessProfile {
  businessId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  googleReviewUrl?: string | null;
  googleMapsUrl?: string | null;
  offers: OfferItem[];
}

export const PublicBusinessLanding: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);

  useEffect(() => {
    if (!businessSlug) {
      setError("No business specified in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fn = httpsCallable<{ businessSlug: string }, PublicBusinessProfile>(
      functions,
      "getPublicBusinessProfile"
    );

    fn({ businessSlug })
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.error("Error loading public business profile:", err);
        setError("Business microsite not found or unavailable.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [businessSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading merchant microsite...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Microsite Not Found</h2>
          <p className="text-sm text-slate-400">
            {error || "The requested business QR landing page does not exist."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Fallback map query link if googleMapsUrl is not set
  const mapsLink =
    profile.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      profile.name + " " + (profile.address || "")
    )}`;

  // Fallback review query link if googleReviewUrl is not set
  const reviewLink =
    profile.googleReviewUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(
      profile.name + " review"
    )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased pb-16">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-950 border-b border-slate-800/80 pt-10 pb-8 px-4 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md mx-auto text-center space-y-4 relative">
          {/* Logo Badge */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border-2 border-indigo-500/40 p-1 shadow-2xl flex items-center justify-center overflow-hidden">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white">
                <Store className="w-9 h-9" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Merchant Partner</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{profile.name}</h1>
            {profile.address && (
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{profile.address}</span>
              </p>
            )}
          </div>

          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            {profile.description}
          </p>

          {/* PRIMARY CALL TO ACTION: Check Membership */}
          <div className="pt-2">
            <button
              onClick={() => navigate("/c")}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 text-sm group"
            >
              <Smartphone className="w-5 h-5" />
              <span>Check Loyalty Membership & Rewards</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* QUICK ACTION LINKS GRID */}
        <div className="grid grid-cols-2 gap-3">
          {/* Leave a Review */}
          <a
            href={reviewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition-all flex flex-col items-center text-center space-y-2 group shadow-lg"
          >
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 fill-amber-400/20" />
            </div>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>Leave a Review</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </span>
            <span className="text-[10px] text-slate-400">Share your experience</span>
          </a>

          {/* Get Directions */}
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-2xl transition-all flex flex-col items-center text-center space-y-2 group shadow-lg"
          >
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>Get Directions</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </span>
            <span className="text-[10px] text-slate-400">Google Maps location</span>
          </a>

          {/* Website Link */}
          {profile.websiteUrl && (
            <a
              href={
                profile.websiteUrl.startsWith("http")
                  ? profile.websiteUrl
                  : `https://${profile.websiteUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all flex flex-col items-center text-center space-y-2 group shadow-lg"
            >
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span>Visit Website</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </span>
              <span className="text-[10px] text-slate-400">Official site</span>
            </a>
          )}

          {/* Contact Phone */}
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 rounded-2xl transition-all flex flex-col items-center text-center space-y-2 group shadow-lg"
            >
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">Call Merchant</span>
              <span className="text-[10px] text-slate-400 font-mono">{profile.phone}</span>
            </a>
          )}
        </div>

        {/* CURRENT OFFERS & SPECIAL PROMOTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Gift className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Current Active Offers</h3>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
              Featured Perks
            </span>
          </div>

          <div className="space-y-3">
            {profile.offers.map((offer, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-950/70 border border-slate-800 hover:border-amber-500/30 rounded-2xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{offer.title}</span>
                  </h4>
                  {offer.tag && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                      {offer.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MERCHANT CONTACT INFO */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Store Contact & Information
          </h4>

          {profile.address && (
            <div className="flex items-start gap-3 text-slate-300">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>{profile.address}</span>
            </div>
          )}

          {profile.phone && (
            <div className="flex items-center gap-3 text-slate-300 font-mono">
              <Phone className="w-4 h-4 text-purple-400 shrink-0" />
              <a href={`tel:${profile.phone}`} className="hover:underline">
                {profile.phone}
              </a>
            </div>
          )}

          {profile.email && (
            <div className="flex items-center gap-3 text-slate-300 font-mono">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`mailto:${profile.email}`} className="hover:underline">
                {profile.email}
              </a>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center pt-4 text-slate-600 text-xs space-y-1">
          <p className="font-semibold text-slate-500">Powered by LoyalNFC Digital Mobile Pass</p>
          <p className="text-[10px]">Tap-to-Reward Merchant Loyalty Network</p>
        </div>
      </main>
    </div>
  );
};
