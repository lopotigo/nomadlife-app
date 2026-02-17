import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Compass, Wifi, Briefcase, FileText, UtensilsCrossed, Heart, Star, MapPin, Navigation, Loader2
} from "lucide-react";
import type { CityGuide } from "@shared/schema";

const categories = [
  { value: "", label: "Tutti", icon: Compass },
  { value: "wifi", label: "WiFi", icon: Wifi },
  { value: "coworking", label: "Coworking", icon: Briefcase },
  { value: "visa", label: "Visa", icon: FileText },
  { value: "food", label: "Food", icon: UtensilsCrossed },
  { value: "lifestyle", label: "Lifestyle", icon: Heart },
];

const categoryColors: Record<string, string> = {
  wifi: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  coworking: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  visa: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  food: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lifestyle: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function getCategoryIcon(cat: string) {
  const found = categories.find(c => c.value === cat);
  return found ? found.icon : Compass;
}

export default function CityGuides() {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!nearbyMode || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setNearbyMode(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [nearbyMode]);

  const { data: citiesList = [], isLoading: loadingCities } = useQuery<string[]>({
    queryKey: ["/api/city-guides/cities"],
    queryFn: () => apiRequest("GET", "/api/city-guides/cities").then(r => r.json()),
  });

  const { data: guides = [], isLoading: loadingGuides } = useQuery<CityGuide[]>({
    queryKey: ["/api/city-guides", selectedCity, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCity) params.set("city", selectedCity);
      if (selectedCategory) params.set("category", selectedCategory);
      return apiRequest("GET", `/api/city-guides?${params}`).then(r => r.json());
    },
    enabled: !nearbyMode,
  });

  const { data: nearbyGuides = [], isLoading: loadingNearby } = useQuery<CityGuide[]>({
    queryKey: ["/api/city-guides/nearby", coords?.lat, coords?.lng],
    queryFn: () =>
      apiRequest("GET", `/api/city-guides/nearby?lat=${coords!.lat}&lng=${coords!.lng}&radius=50`).then(r => r.json()),
    enabled: nearbyMode && !!coords,
  });

  const displayGuides = nearbyMode ? nearbyGuides : guides;
  const isLoading = nearbyMode ? loadingNearby : loadingGuides;

  const filteredGuides = selectedCategory
    ? displayGuides.filter(g => g.category === selectedCategory)
    : displayGuides;

  const selectedCityData = selectedCity && displayGuides.length > 0
    ? displayGuides.find(g => g.city === selectedCity)
    : null;

  return (
    <Layout fullWidth>
      <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Compass className="w-7 h-7 text-primary" />
              Guide Città
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Guide AI per nomadi digitali</p>
          </div>
          <button
            data-testid="button-nearby-mode"
            onClick={() => setNearbyMode(!nearbyMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              nearbyMode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Navigation className="w-4 h-4" />
            Vicino a me
          </button>
        </motion.div>

        {!nearbyMode && (
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {loadingCities ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Caricamento città...
                </div>
              ) : (
                <>
                  <button
                    data-testid="button-city-all"
                    onClick={() => setSelectedCity("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      !selectedCity
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Tutte le città
                  </button>
                  {citiesList.map(city => (
                    <button
                      key={city}
                      data-testid={`button-city-${city.toLowerCase().replace(/\s/g, "-")}`}
                      onClick={() => setSelectedCity(city)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedCity === city
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {selectedCity && selectedCityData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold" data-testid="text-selected-city">{selectedCityData.city}</h2>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{selectedCityData.country}</p>
          </motion.div>
        )}

        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  data-testid={`button-category-${cat.value || "all"}`}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.value
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

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="text-center py-16" data-testid="text-empty-state">
            <Compass className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nessuna guida trovata</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Prova a cambiare filtri o città</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuides.map((guide, i) => {
              const CatIcon = getCategoryIcon(guide.category);
              const colorClass = categoryColors[guide.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
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
    </Layout>
  );
}
