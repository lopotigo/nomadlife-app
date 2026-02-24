import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User as UserIcon, Plane, MapPin, Home, Coffee, Utensils, Bus, Users, X, Sparkles, UserPlus, UserCheck, Eye, Compass, Wifi, Briefcase, FileText, UtensilsCrossed, Heart, Star, Navigation, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { User, Trip, TripStop, City, CityGuide } from "@shared/schema";

type TripWithUser = Trip & { user: User; stops: TripStop[] };

const guideCategories = [
  { value: "", label: "Tutti", icon: Compass },
  { value: "wifi", label: "WiFi", icon: Wifi },
  { value: "coworking", label: "Coworking", icon: Briefcase },
  { value: "visa", label: "Visa", icon: FileText },
  { value: "food", label: "Food", icon: UtensilsCrossed },
  { value: "lifestyle", label: "Lifestyle", icon: Heart },
];

const guideCategoryColors: Record<string, string> = {
  wifi: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  coworking: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  visa: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  food: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lifestyle: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function getGuideCategoryIcon(cat: string) {
  const found = guideCategories.find(c => c.value === cat);
  return found ? found.icon : Compass;
}

export default function SearchPage() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<TripWithUser[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cities");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const [checkins, setCheckins] = useState<Record<string, { status: string; city: string }>>({});

  const [searchedCities, setSearchedCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [selectedGuideCity, setSelectedGuideCity] = useState("");
  const [selectedGuideCategory, setSelectedGuideCategory] = useState("");
  const [guideNearbyMode, setGuideNearbyMode] = useState(false);
  const [guideCoords, setGuideCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!guideNearbyMode || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGuideCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGuideNearbyMode(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [guideNearbyMode]);

  useEffect(() => {
    if (!currentUser || trips.length === 0) return;
    const userIds = Array.from(new Set(trips.map(t => t.user.id).filter(id => id !== currentUser.id)));
    userIds.forEach(userId => {
      fetch(`/api/users/${userId}/is-following`)
        .then(res => res.json())
        .then(data => setFollowingMap(prev => ({ ...prev, [userId]: data.isFollowing })))
        .catch(() => {});
    });
  }, [trips, currentUser]);

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;
    
    const isFollowing = followingMap[userId];
    const method = isFollowing ? "DELETE" : "POST";
    
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method });
      if (res.ok) {
        setFollowingMap(prev => ({ ...prev, [userId]: !isFollowing }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch("/api/cities")
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSearchedCities([]);
      return;
    }
    
    setCitiesLoading(true);
    fetch(`/api/cities/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => setSearchedCities(data))
      .catch(console.error)
      .finally(() => setCitiesLoading(false));
  }, [query]);

  const displayedCities = query.length >= 2 ? searchedCities : cities;

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

      try {
        const checkinRes = await fetch(`/api/ai/discover-nomads?city=${encodeURIComponent(query)}`);
        if (checkinRes.ok) {
          const checkinData = await checkinRes.json();
          const map: Record<string, { status: string; city: string }> = {};
          (checkinData.nomads || []).forEach((n: any) => { map[n.id] = { status: n.status, city: n.city }; });
          setCheckins(map);
        }
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const getTotalCost = (city: City) => {
    const min = (city.costAccommodationMin || 0) + (city.costFoodMin || 0) + (city.costCoworkingMin || 0) + (city.costTransportMin || 0);
    const max = (city.costAccommodationMax || 0) + (city.costFoodMax || 0) + (city.costCoworkingMax || 0) + (city.costTransportMax || 0);
    return { min, max };
  };

  const { data: guideCitiesList = [] } = useQuery<string[]>({
    queryKey: ["/api/city-guides/cities"],
    queryFn: () => apiRequest("GET", "/api/city-guides/cities").then(r => r.json()),
    enabled: activeTab === "guides",
  });

  const { data: guides = [], isLoading: loadingGuides } = useQuery<CityGuide[]>({
    queryKey: ["/api/city-guides", selectedGuideCity, selectedGuideCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedGuideCity) params.set("city", selectedGuideCity);
      if (selectedGuideCategory) params.set("category", selectedGuideCategory);
      return apiRequest("GET", `/api/city-guides?${params}`).then(r => r.json());
    },
    enabled: activeTab === "guides" && !guideNearbyMode,
  });

  const { data: nearbyGuides = [], isLoading: loadingNearbyGuides } = useQuery<CityGuide[]>({
    queryKey: ["/api/city-guides/nearby", guideCoords?.lat, guideCoords?.lng],
    queryFn: () =>
      apiRequest("GET", `/api/city-guides/nearby?lat=${guideCoords!.lat}&lng=${guideCoords!.lng}&radius=50`).then(r => r.json()),
    enabled: activeTab === "guides" && guideNearbyMode && !!guideCoords,
  });

  const displayGuides = guideNearbyMode ? nearbyGuides : guides;
  const guidesLoading = guideNearbyMode ? loadingNearbyGuides : loadingGuides;

  const filteredGuides = selectedGuideCategory
    ? displayGuides.filter(g => g.category === selectedGuideCategory)
    : displayGuides;

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
            <TabsTrigger value="guides" className="flex-1" data-testid="tab-guides">
              <Compass className="w-4 h-4 mr-2" />
              Guide AI
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
            {citiesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {displayedCities.map((city) => {
                    const total = getTotalCost(city);
                    return (
                      <motion.div
                        key={city.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCity(city)}
                        className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all"
                        data-testid={`city-card-${city.name}`}
                      >
                        <div className="text-3xl mb-2">{city.emoji || "🌍"}</div>
                        <h3 className="font-bold text-lg">{city.name}</h3>
                        <p className="text-sm text-muted-foreground">{city.country}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{(city.nomadsCount || 0).toLocaleString()} nomadi</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          €{total.min}-{total.max}/giorno
                        </div>
                        {(city as any).fromAPI && (
                          <div className="mt-2 text-xs text-primary/70">🌐 dati stimati</div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                {displayedCities.length === 0 && query.length >= 2 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessuna città trovata per "{query}"
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="guides">
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <button
                  data-testid="button-guide-nearby"
                  onClick={() => setGuideNearbyMode(!guideNearbyMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    guideNearbyMode
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  Vicino a me
                </button>
              </div>

              {!guideNearbyMode && (
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  <button
                    data-testid="button-guide-city-all"
                    onClick={() => setSelectedGuideCity("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      !selectedGuideCity
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Tutte le città
                  </button>
                  {guideCitiesList.map(city => (
                    <button
                      key={city}
                      data-testid={`button-guide-city-${city.toLowerCase().replace(/\s/g, "-")}`}
                      onClick={() => setSelectedGuideCity(city)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedGuideCity === city
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              )}

              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {guideCategories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        data-testid={`button-guide-category-${cat.value || "all"}`}
                        onClick={() => setSelectedGuideCategory(cat.value)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                          selectedGuideCategory === cat.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {guidesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredGuides.length === 0 ? (
                <div className="text-center py-12" data-testid="text-guides-empty">
                  <Compass className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">Nessuna guida trovata</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Prova a cambiare filtri o città</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGuides.map((guide, i) => {
                    const CatIcon = getGuideCategoryIcon(guide.category);
                    const colorClass = guideCategoryColors[guide.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                    return (
                      <motion.div
                        key={guide.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow"
                        data-testid={`card-guide-${guide.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${colorClass}`}>
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-snug" data-testid={`text-guide-title-${guide.id}`}>
                              {guide.title}
                            </h3>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {guide.city}, {guide.country}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-3 line-clamp-3" data-testid={`text-guide-content-${guide.id}`}>
                          {guide.content}
                        </p>

                        {guide.rating != null && guide.rating > 0 && (
                          <div className="flex items-center gap-1 mt-3" data-testid={`rating-guide-${guide.id}`}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  idx < Math.round(guide.rating!) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{guide.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {guide.tags && guide.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {guide.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md"
                                data-testid={`tag-${tag}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
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
                {trips.map((trip) => {
                  const isOwnTrip = currentUser?.id === trip.user.id;
                  const isFollowing = followingMap[trip.user.id];
                  
                  return (
                    <div key={trip.id} className="bg-card rounded-xl p-4 hover:shadow-lg transition-shadow" data-testid={`trip-${trip.id}`}>
                      <div className="flex items-start gap-3">
                        <Link href={`/user/${trip.user.id}`}>
                          <img
                            src={trip.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user.username}`}
                            className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            alt={trip.user.name}
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{trip.title}</h3>
                          <Link href={`/user/${trip.user.id}`}>
                            <p className="text-sm text-muted-foreground hover:text-primary cursor-pointer">di {trip.user.name}</p>
                          </Link>
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
                          
                          <div className="flex gap-2 mt-3">
                            <Link href={`/trip/${trip.id}`}>
                              <Button size="sm" variant="default" className="gap-1" data-testid={`view-trip-${trip.id}`}>
                                <Eye className="w-4 h-4" />
                                Visualizza
                              </Button>
                            </Link>
                            {!isOwnTrip && currentUser && (
                              <Button
                                size="sm"
                                variant={isFollowing ? "secondary" : "outline"}
                                className="gap-1"
                                onClick={(e) => handleFollow(trip.user.id, e)}
                                data-testid={`follow-user-${trip.user.id}`}
                              >
                                {isFollowing ? (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    Seguito
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-4 h-4" />
                                    Segui
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                        {checkins[user.id] && (
                          <div className="flex items-center gap-1 mt-1" data-testid={`checkin-badge-${user.id}`}>
                            <div className={`w-2 h-2 rounded-full ${checkins[user.id].status === 'here_now' ? 'bg-green-500' : checkins[user.id].status === 'arriving_soon' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                            <span className={`text-[10px] font-medium ${checkins[user.id].status === 'here_now' ? 'text-emerald-600' : checkins[user.id].status === 'arriving_soon' ? 'text-yellow-600' : 'text-blue-600'}`}>
                              {checkins[user.id].status === 'here_now' ? 'Qui ora' : checkins[user.id].status === 'arriving_soon' ? 'In arrivo' : 'Pianifica'}
                            </span>
                          </div>
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
              className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-card dark:to-background rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-amber-200 dark:border-border relative overflow-hidden"
              data-testid="city-popup"
            >
              <div className="absolute -top-6 -right-6 text-8xl opacity-20">{selectedCity.emoji || "🌍"}</div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
              
              <button
                onClick={() => setSelectedCity(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-muted rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                data-testid="button-close-popup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 text-center mb-4">
                <motion.div 
                  className="text-6xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {selectedCity.emoji || "🌍"}
                </motion.div>
                <h2 className="text-2xl font-black text-foreground">{selectedCity.name}</h2>
                <p className="text-muted-foreground font-medium">{selectedCity.country}</p>
              </div>

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
                <div className="text-3xl font-black">{(selectedCity.nomadsCount || 0).toLocaleString()}</div>
                <div className="text-sm opacity-90">nomadi digitali qui!</div>
              </motion.div>

              <div className="flex gap-3 mb-4">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 bg-white dark:bg-muted rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">{selectedCity.weather?.split(' ')[0] || "🌤️"}</div>
                  <div className="text-sm font-bold text-foreground">{selectedCity.weather?.split(' ')[1] || "N/A"}</div>
                </motion.div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex-1 bg-white dark:bg-muted rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">⚡</div>
                  <div className="text-sm font-bold text-foreground">{selectedCity.internetSpeed || 50} Mbps</div>
                </motion.div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 bg-white dark:bg-muted rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-2xl">⭐</div>
                  <div className="text-sm font-bold text-foreground">{selectedCity.rating?.toFixed(1) || "4.0"}</div>
                </motion.div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">Costo giornaliero</h3>
                
                {[
                  { icon: Home, label: "Alloggio", min: selectedCity.costAccommodationMin, max: selectedCity.costAccommodationMax, color: "from-blue-400 to-blue-500" },
                  { icon: Utensils, label: "Cibo", min: selectedCity.costFoodMin, max: selectedCity.costFoodMax, color: "from-orange-400 to-red-500" },
                  { icon: Coffee, label: "Coworking", min: selectedCity.costCoworkingMin, max: selectedCity.costCoworkingMax, color: "from-amber-400 to-yellow-500" },
                  { icon: Bus, label: "Trasporti", min: selectedCity.costTransportMin, max: selectedCity.costTransportMax, color: "from-green-400 to-emerald-500" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-3 bg-white dark:bg-muted rounded-xl p-3 shadow-sm"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{item.label}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">€{item.min || 0}-{item.max || 0}</span>
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-muted to-background dark:from-accent dark:to-muted rounded-xl p-4 text-foreground mt-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">TOTALE GIORNALIERO</span>
                    <span className="text-lg font-black">
                      €{getTotalCost(selectedCity).min}-{getTotalCost(selectedCity).max}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 opacity-70">
                    <span className="text-xs font-medium">STIMA MENSILE</span>
                    <span className="text-sm font-bold">
                      €{getTotalCost(selectedCity).min * 30}-{getTotalCost(selectedCity).max * 30}
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
