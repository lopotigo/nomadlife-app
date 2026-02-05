import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plane, Leaf, Globe, MapPin, Route, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface TripStop {
  city: string;
  country: string;
  distanceKm?: number;
  co2Kg?: number;
  transportMode?: string;
}

interface Trip {
  id: string;
  status: string;
  stops: TripStop[];
}

interface StatsData {
  totalKm: number;
  totalCO2: number;
  savedCO2: number;
  countriesVisited: number;
  citiesVisited: number;
  tripsCompleted: number;
  tripsInProgress: number;
  tripsPlanned: number;
  ecoPercentage: number;
}

const CO2_RATES: Record<string, number> = {
  walk: 0,
  bike: 0,
  train: 0.041,
  car: 0.171,
  plane: 0.255
};

const CO2_CAR_RATE = 0.171;

export function PersonalStats({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { t } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    fetch(`/api/users/${userId}/trips`)
      .then(res => res.json())
      .then((trips: Trip[]) => {
        const countries = new Set<string>();
        const cities = new Set<string>();
        let totalKm = 0;
        let totalCO2 = 0;
        let ecoKm = 0;
        let tripsCompleted = 0;
        let tripsInProgress = 0;
        let tripsPlanned = 0;

        trips.forEach(trip => {
          if (trip.status === "completed") tripsCompleted++;
          else if (trip.status === "in_progress") tripsInProgress++;
          else tripsPlanned++;

          trip.stops?.forEach(stop => {
            if (stop.country) countries.add(stop.country.toLowerCase());
            if (stop.city) cities.add(stop.city.toLowerCase());
            if (stop.distanceKm) {
              totalKm += stop.distanceKm;
              
              if (stop.co2Kg !== undefined && stop.co2Kg !== null) {
                totalCO2 += stop.co2Kg;
              } else if (stop.transportMode && CO2_RATES[stop.transportMode] !== undefined) {
                totalCO2 += stop.distanceKm * CO2_RATES[stop.transportMode];
              } else {
                totalCO2 += stop.distanceKm * CO2_CAR_RATE;
              }
              
              if (stop.transportMode === "walk" || stop.transportMode === "bike" || stop.transportMode === "train") {
                ecoKm += stop.distanceKm;
              }
            }
          });
        });

        const savedCO2 = (totalKm * CO2_CAR_RATE) - totalCO2;
        const ecoPercentage = totalKm > 0 ? Math.round((ecoKm / totalKm) * 100) : 0;

        setStats({
          totalKm: Math.round(totalKm),
          totalCO2: Math.round(totalCO2 * 10) / 10,
          savedCO2: Math.round(savedCO2 * 10) / 10,
          countriesVisited: countries.size,
          citiesVisited: cities.size,
          tripsCompleted,
          tripsInProgress,
          tripsPlanned,
          ecoPercentage
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-6 bg-muted/30 rounded-xl">
        <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nessuna statistica disponibile</p>
        <p className="text-xs text-muted-foreground mt-1">Inizia a creare viaggi per vedere le tue statistiche!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2">
        <StatBox icon={Route} value={`${stats.totalKm}`} label="km" color="blue" small />
        <StatBox icon={Globe} value={`${stats.countriesVisited}`} label={t("stats.countries_visited").split(" ")[0]} color="purple" small />
        <StatBox icon={Leaf} value={`${stats.savedCO2}`} label="kg CO₂" color="green" small />
        <StatBox icon={Plane} value={`${stats.tripsCompleted}`} label={t("stats.trips_completed").split(" ")[0]} color="orange" small />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={Route} value={`${stats.totalKm.toLocaleString()}`} label={t("stats.km_traveled")} color="blue" />
        <StatBox icon={Globe} value={`${stats.countriesVisited}`} label={t("stats.countries_visited")} color="purple" />
        <StatBox icon={MapPin} value={`${stats.citiesVisited}`} label={t("stats.cities_visited")} color="indigo" />
        <StatBox icon={Plane} value={`${stats.tripsCompleted}`} label={t("stats.trips_completed")} color="orange" />
      </div>

      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-400">{t("stats.environmental_impact")}</h4>
            <p className="text-xs text-muted-foreground">{t("stats.vs_car")}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.totalCO2}</div>
            <div className="text-xs text-muted-foreground">{t("stats.co2_emitted")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">-{stats.savedCO2 > 0 ? stats.savedCO2 : 0}</div>
            <div className="text-xs text-muted-foreground">{t("stats.co2_saved")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ecoPercentage}%</div>
            <div className="text-xs text-muted-foreground">{t("stats.eco_transport")}</div>
          </div>
        </div>

        {stats.savedCO2 > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <Award className="w-4 h-4" />
            <span>{stats.savedCO2} {t("stats.co2_saved_message")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-primary">{stats.tripsPlanned}</div>
          <div className="text-xs text-muted-foreground">{t("stats.planned")}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-amber-500">{stats.tripsInProgress}</div>
          <div className="text-xs text-muted-foreground">{t("stats.in_progress")}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-500">{stats.tripsCompleted}</div>
          <div className="text-xs text-muted-foreground">{t("stats.completed")}</div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ 
  icon: Icon, 
  value, 
  label, 
  color,
  small = false 
}: { 
  icon: any; 
  value: string; 
  label: string; 
  color: string;
  small?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 text-blue-600",
    purple: "from-purple-500/20 to-purple-600/10 text-purple-600",
    indigo: "from-indigo-500/20 to-indigo-600/10 text-indigo-600",
    orange: "from-orange-500/20 to-orange-600/10 text-orange-600",
    green: "from-green-500/20 to-green-600/10 text-green-600",
  };

  if (small) {
    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-2 text-center`}>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4`}
    >
      <Icon className="w-5 h-5 mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}
