import { useState } from "react";
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User as UserIcon, Plane, MapPin, Calendar, Home, Coffee, Utensils, Bus, Users, X, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { User, Trip, TripStop } from "@shared/schema";

type TripWithUser = Trip & { user: User; stops: TripStop[] };

interface CityData {
  name: string;
  country: string;
  emoji: string;
  nomads: number;
  costs: {
    accommodation: { min: number; max: number };
    food: { min: number; max: number };
    coworking: { min: number; max: number };
    transport: { min: number; max: number };
  };
  rating: number;
  weather: string;
  internet: string;
}

const CITIES_DATA: CityData[] = [
  {
    name: "Bali",
    country: "Indonesia",
    emoji: "🏝️",
    nomads: 4250,
    costs: { accommodation: { min: 25, max: 60 }, food: { min: 8, max: 20 }, coworking: { min: 8, max: 15 }, transport: { min: 3, max: 8 } },
    rating: 4.8,
    weather: "☀️ 28°C",
    internet: "⚡ 25 Mbps"
  },
  {
    name: "Lisbona",
    country: "Portogallo",
    emoji: "🇵🇹",
    nomads: 3800,
    costs: { accommodation: { min: 40, max: 90 }, food: { min: 12, max: 25 }, coworking: { min: 12, max: 25 }, transport: { min: 4, max: 8 } },
    rating: 4.7,
    weather: "🌤️ 22°C",
    internet: "⚡ 100 Mbps"
  },
  {
    name: "Bangkok",
    country: "Thailandia",
    emoji: "🇹🇭",
    nomads: 5100,
    costs: { accommodation: { min: 20, max: 50 }, food: { min: 5, max: 15 }, coworking: { min: 6, max: 12 }, transport: { min: 2, max: 5 } },
    rating: 4.5,
    weather: "🌡️ 32°C",
    internet: "⚡ 35 Mbps"
  },
  {
    name: "Barcellona",
    country: "Spagna",
    emoji: "🇪🇸",
    nomads: 2900,
    costs: { accommodation: { min: 45, max: 100 }, food: { min: 15, max: 30 }, coworking: { min: 15, max: 30 }, transport: { min: 5, max: 10 } },
    rating: 4.6,
    weather: "☀️ 24°C",
    internet: "⚡ 150 Mbps"
  },
  {
    name: "Città del Messico",
    country: "Messico",
    emoji: "🇲🇽",
    nomads: 3200,
    costs: { accommodation: { min: 25, max: 55 }, food: { min: 8, max: 18 }, coworking: { min: 8, max: 18 }, transport: { min: 2, max: 5 } },
    rating: 4.4,
    weather: "🌤️ 22°C",
    internet: "⚡ 45 Mbps"
  },
  {
    name: "Chiang Mai",
    country: "Thailandia",
    emoji: "🏯",
    nomads: 3500,
    costs: { accommodation: { min: 15, max: 40 }, food: { min: 4, max: 12 }, coworking: { min: 5, max: 10 }, transport: { min: 2, max: 4 } },
    rating: 4.7,
    weather: "🌤️ 30°C",
    internet: "⚡ 30 Mbps"
  },
  {
    name: "Berlino",
    country: "Germania",
    emoji: "🇩🇪",
    nomads: 2100,
    costs: { accommodation: { min: 50, max: 110 }, food: { min: 12, max: 25 }, coworking: { min: 15, max: 35 }, transport: { min: 5, max: 10 } },
    rating: 4.5,
    weather: "🌧️ 15°C",
    internet: "⚡ 80 Mbps"
  },
  {
    name: "Medellin",
    country: "Colombia",
    emoji: "🇨🇴",
    nomads: 2800,
    costs: { accommodation: { min: 20, max: 50 }, food: { min: 6, max: 15 }, coworking: { min: 8, max: 15 }, transport: { min: 1, max: 3 } },
    rating: 4.6,
    weather: "🌤️ 24°C",
    internet: "⚡ 40 Mbps"
  },
  {
    name: "Milano",
    country: "Italia",
    emoji: "🇮🇹",
    nomads: 1500,
    costs: { accommodation: { min: 55, max: 120 }, food: { min: 15, max: 35 }, coworking: { min: 18, max: 40 }, transport: { min: 5, max: 10 } },
    rating: 4.3,
    weather: "🌤️ 20°C",
    internet: "⚡ 100 Mbps"
  },
  {
    name: "Ho Chi Minh",
    country: "Vietnam",
    emoji: "🇻🇳",
    nomads: 2400,
    costs: { accommodation: { min: 18, max: 45 }, food: { min: 4, max: 12 }, coworking: { min: 5, max: 12 }, transport: { min: 2, max: 4 } },
    rating: 4.4,
    weather: "🌡️ 30°C",
    internet: "⚡ 35 Mbps"
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<TripWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cities");
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  const filteredCities = query.length >= 2 
    ? CITIES_DATA.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) || 
        c.country.toLowerCase().includes(query.toLowerCase())
      )
    : CITIES_DATA;

  const handleSearch = async () => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const [usersRes, tripsRes] = await Promise.all([
        fetch(`/api/users/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/trips/search?q=${encodeURIComponent(query)}`)
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (tripsRes.ok) setTrips(await tripsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const getTotalCost = (city: CityData) => {
    const { accommodation, food, coworking, transport } = city.costs;
    const min = accommodation.min + food.min + coworking.min + transport.min;
    const max = accommodation.max + food.max + coworking.max + transport.max;
    return { min, max };
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Cerca</h1>

        <div className="flex gap-2 mb-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cerca città, nomadi, viaggi..."
            className="flex-1"
            data-testid="input-search"
          />
          <Button onClick={handleSearch} disabled={loading || query.length < 2} data-testid="button-search">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="cities" className="flex-1">
              <MapPin className="w-4 h-4 mr-2" />
              Città
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex-1">
              <Plane className="w-4 h-4 mr-2" />
              Viaggi ({trips.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              <UserIcon className="w-4 h-4 mr-2" />
              Nomadi ({users.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cities">
            <div className="grid grid-cols-2 gap-3">
              {filteredCities.map((city) => {
                const total = getTotalCost(city);
                return (
                  <motion.div
                    key={city.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCity(city)}
                    className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all"
                    data-testid={`city-card-${city.name}`}
                  >
                    <div className="text-3xl mb-2">{city.emoji}</div>
                    <h3 className="font-bold text-lg">{city.name}</h3>
                    <p className="text-sm text-muted-foreground">{city.country}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{city.nomads.toLocaleString()} nomadi</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      €{total.min}-{total.max}/giorno
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {filteredCities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna città trovata per "{query}"
              </div>
            )}
          </TabsContent>

          <TabsContent value="trips">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query.length >= 2 ? "Nessun viaggio trovato" : "Cerca viaggi per destinazione (es. 'Malesia', 'Bali', 'Thailandia')"}
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => (
                  <Link key={trip.id} href={`/trip/${trip.id}`}>
                    <div className="bg-card rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer" data-testid={`trip-${trip.id}`}>
                      <div className="flex items-start gap-3">
                        <img
                          src={trip.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user.username}`}
                          className="w-10 h-10 rounded-full"
                          alt={trip.user.name}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{trip.title}</h3>
                          <p className="text-sm text-muted-foreground">di {trip.user.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{trip.startLocation} → {trip.endLocation}</span>
                          </div>
                          {trip.stops.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {trip.stops.slice(0, 5).map((stop) => (
                                <span key={stop.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  {stop.city}
                                </span>
                              ))}
                              {trip.stops.length > 5 && (
                                <span className="text-xs text-muted-foreground">+{trip.stops.length - 5} altre</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query.length >= 2 ? "Nessun nomade trovato" : "Cerca nomadi per nome o posizione"}
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <Link key={user.id} href={`/user/${user.id}`}>
                    <div className="bg-card rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4" data-testid={`user-${user.id}`}>
                      <img
                        src={(user as any).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        className="w-12 h-12 rounded-full"
                        alt={user.name}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        {(user as any).location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {(user as any).location}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{(user as any).countriesVisited || 0} paesi</div>
                        <div>{(user as any).citiesVisited || 0} città</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* City Popup - Cartoonish Style */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCity(null)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 5 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-amber-200 dark:border-slate-700 relative overflow-hidden"
              data-testid="city-popup"
            >
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 text-8xl opacity-20">{selectedCity.emoji}</div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
              
              {/* Close button */}
              <button
                onClick={() => setSelectedCity(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                data-testid="button-close-popup"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="relative z-10 text-center mb-4">
                <motion.div 
                  className="text-6xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {selectedCity.emoji}
                </motion.div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">{selectedCity.name}</h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{selectedCity.country}</p>
              </div>

              {/* Nomads count - Big and fun */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 mb-4 text-white text-center shadow-lg"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-6 h-6" />
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-3xl font-black">{selectedCity.nomads.toLocaleString()}</div>
                <div className="text-sm opacity-90">nomadi digitali qui!</div>
              </motion.div>

              {/* Weather & Internet */}
              <div className="flex gap-3 mb-4">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 bg-white dark:bg-slate-700 rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">{selectedCity.weather.split(' ')[0]}</div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCity.weather.split(' ')[1]}</div>
                </motion.div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex-1 bg-white dark:bg-slate-700 rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">{selectedCity.internet.split(' ')[0]}</div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCity.internet.split(' ')[1]}</div>
                </motion.div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 bg-white dark:bg-slate-700 rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">⭐</div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCity.rating}</div>
                </motion.div>
              </div>

              {/* Costs breakdown - Fun cards */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">Costo giornaliero</h3>
                
                {[
                  { icon: Home, label: "Alloggio", costs: selectedCity.costs.accommodation, color: "from-blue-400 to-blue-500" },
                  { icon: Utensils, label: "Cibo", costs: selectedCity.costs.food, color: "from-orange-400 to-red-500" },
                  { icon: Coffee, label: "Coworking", costs: selectedCity.costs.coworking, color: "from-amber-400 to-yellow-500" },
                  { icon: Bus, label: "Trasporti", costs: selectedCity.costs.transport, color: "from-green-400 to-emerald-500" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-xl p-3 shadow-sm"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{item.label}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 dark:text-white">€{item.costs.min}-{item.costs.max}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Total */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-600 dark:to-slate-700 rounded-xl p-4 text-white mt-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">TOTALE GIORNALIERO</span>
                    <span className="text-xl font-black">
                      €{getTotalCost(selectedCity).min}-{getTotalCost(selectedCity).max}
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
