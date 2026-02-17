import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Leaf, Share2, Download, MapPin, Route, Plane, X, Globe, Award } from "lucide-react";
import { SocialShare } from "./social-share";

interface TripStop {
  city: string;
  country: string;
  distanceKm?: number | null;
  co2Kg?: number | null;
  transportMode?: string | null;
}

interface EcoTripData {
  tripTitle: string;
  userName: string;
  stops: TripStop[];
  totalKm: number;
  totalCO2: number;
  savedCO2: number;
  ecoPercentage: number;
  countriesCount: number;
}

const CO2_CAR_RATE = 0.171;

function calculateEcoStats(stops: TripStop[]) {
  let totalKm = 0;
  let totalCO2 = 0;
  let ecoKm = 0;
  const countries = new Set<string>();

  const CO2_RATES: Record<string, number> = {
    walk: 0, bike: 0, train: 0.041, car: 0.171, plane: 0.255
  };

  stops.forEach(s => {
    if (s.country) countries.add(s.country);
    const km = s.distanceKm || 0;
    totalKm += km;
    const mode = s.transportMode || 'plane';
    totalCO2 += km * (CO2_RATES[mode] || 0.255);
    if (['walk', 'bike', 'train'].includes(mode)) ecoKm += km;
  });

  const savedCO2 = Math.max(0, (totalKm * CO2_CAR_RATE) - totalCO2);
  const ecoPercentage = totalKm > 0 ? Math.round((ecoKm / totalKm) * 100) : 0;

  return { totalKm, totalCO2, savedCO2, ecoPercentage, countriesCount: countries.size };
}

export function EcoTripCard({ trip, onClose }: { trip: { title: string; userName: string; stops: TripStop[] }; onClose?: () => void }) {
  const [showShare, setShowShare] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const stats = calculateEcoStats(trip.stops);
  const cities = trip.stops.map(s => s.city).filter(Boolean);
  const ecoScore = stats.ecoPercentage >= 70 ? "A+" : stats.ecoPercentage >= 50 ? "A" : stats.ecoPercentage >= 30 ? "B" : "C";
  const ecoColor = stats.ecoPercentage >= 70 ? "text-green-500" : stats.ecoPercentage >= 50 ? "text-emerald-500" : stats.ecoPercentage >= 30 ? "text-yellow-500" : "text-orange-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full max-w-sm" data-testid="eco-trip-card">
        {onClose && (
          <button onClick={onClose} className="absolute -top-2 -right-2 z-10 p-1.5 bg-card rounded-full border shadow-lg" data-testid="button-close-eco-card">
            <X className="w-4 h-4" />
          </button>
        )}

        <div ref={cardRef} className="bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <p className="text-xs text-green-300/80 font-medium">NomadLife Eco Card</p>
                <p className="text-sm font-bold">{trip.userName}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-1" data-testid="text-eco-trip-title">{trip.title}</h3>
            <div className="flex items-center gap-1 text-green-200/70 text-xs mb-4">
              <MapPin className="w-3 h-3" />
              <span>{cities.slice(0, 4).join(" → ")}{cities.length > 4 ? " ..." : ""}</span>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke="url(#ecoGrad)" strokeWidth="8" fill="none"
                    strokeDasharray={`${stats.ecoPercentage * 2.64} ${264 - stats.ecoPercentage * 2.64}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="ecoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${ecoColor}`} data-testid="text-eco-score">{ecoScore}</span>
                  <span className="text-[10px] text-green-200/60">eco score</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Route className="w-4 h-4 mx-auto mb-1 text-green-300" />
                <p className="text-lg font-bold" data-testid="text-eco-km">{Math.round(stats.totalKm).toLocaleString()}</p>
                <p className="text-[10px] text-green-200/60">km totali</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Leaf className="w-4 h-4 mx-auto mb-1 text-green-300" />
                <p className="text-lg font-bold text-green-400" data-testid="text-eco-saved">{stats.savedCO2.toFixed(1)}</p>
                <p className="text-[10px] text-green-200/60">kg CO2 risparmiati</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Globe className="w-4 h-4 mx-auto mb-1 text-cyan-300" />
                <p className="text-lg font-bold">{stats.countriesCount}</p>
                <p className="text-[10px] text-green-200/60">paesi</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Award className="w-4 h-4 mx-auto mb-1 text-yellow-300" />
                <p className="text-lg font-bold">{stats.ecoPercentage}%</p>
                <p className="text-[10px] text-green-200/60">eco-trasporti</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-green-200/40">nomad-life.app</p>
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                data-testid="button-share-eco-card"
              >
                <Share2 className="w-4 h-4" />
                Condividi
              </button>
            </div>
          </div>
        </div>

        {showShare && (
          <div className="mt-3">
            <SocialShare
              url={`${window.location.origin}/travel-diary`}
              title={`${trip.title} - Eco Score: ${ecoScore} | ${stats.savedCO2.toFixed(1)}kg CO2 risparmiati`}
              text={`Ho viaggiato ${Math.round(stats.totalKm).toLocaleString()}km risparmiando ${stats.savedCO2.toFixed(1)}kg di CO2! Score: ${ecoScore}`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EcoTripButton({ trip, userName }: { trip: { title: string; stops: TripStop[] }; userName: string }) {
  const [showCard, setShowCard] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowCard(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
        data-testid="button-eco-trip-card"
      >
        <Leaf className="w-4 h-4" />
        Eco Card
      </button>

      {showCard && (
        <EcoTripCard
          trip={{ title: trip.title, userName, stops: trip.stops }}
          onClose={() => setShowCard(false)}
        />
      )}
    </>
  );
}
