import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUpload } from "@/hooks/use-upload";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Store, Trash2, Loader2, Plus, Search, SlidersHorizontal,
  Package, Tag, Image as ImageIcon, DollarSign
} from "lucide-react";
import type { LocalListing } from "@shared/schema";

const categories = [
  { value: "", label: "Tutti" },
  { value: "electronics", label: "Elettronica" },
  { value: "clothing", label: "Abbigliamento" },
  { value: "accessories", label: "Accessori" },
  { value: "books", label: "Libri" },
  { value: "furniture", label: "Arredamento" },
  { value: "other", label: "Altro" },
];

const conditions = [
  { value: "new", label: "Nuovo" },
  { value: "like_new", label: "Come nuovo" },
  { value: "good", label: "Buono" },
  { value: "used", label: "Usato" },
];

const conditionColors: Record<string, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  like_new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  good: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  used: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocalMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [activeTab, setActiveTab] = useState<"nearby" | "mine" | "create">("nearby");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "error">("loading");
  const [radius, setRadius] = useState(3);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("other");
  const [condition, setCondition] = useState("good");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const { data: nearbyListings = [], isLoading: loadingNearby } = useQuery<(LocalListing & { seller?: any })[]>({
    queryKey: ["/api/local-listings/nearby", coords?.lat, coords?.lng, radius, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        lat: String(coords!.lat),
        lng: String(coords!.lng),
        radius: String(radius),
      });
      if (categoryFilter) params.set("category", categoryFilter);
      return apiRequest("GET", `/api/local-listings/nearby?${params}`).then((r) => r.json());
    },
    enabled: !!coords,
  });

  const { data: myListings = [], isLoading: loadingMine } = useQuery<LocalListing[]>({
    queryKey: ["/api/local-listings/user", user?.id],
    queryFn: () => apiRequest("GET", `/api/local-listings/user/${user!.id}`).then((r) => r.json()),
    enabled: !!user && activeTab === "mine",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/local-listings", data),
    onSuccess: () => {
      toast({ title: "Annuncio pubblicato!" });
      setTitle("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setActiveTab("mine");
      queryClient.invalidateQueries({ queryKey: ["/api/local-listings"] });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile pubblicare l'annuncio", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/local-listings/${id}`),
    onSuccess: () => {
      toast({ title: "Annuncio eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/local-listings"] });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!title.trim() || !price) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      currency,
      category,
      condition,
      imageUrl: imageUrl || null,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await uploadFile(file);
      if (response) setImageUrl(response.objectPath);
    } catch {
      toast({ title: "Errore upload", variant: "destructive" });
    }
  };

  const tabs = [
    { key: "nearby" as const, label: "Vicino a me", icon: Navigation },
    { key: "mine" as const, label: "I miei annunci", icon: Package },
    { key: "create" as const, label: "Pubblica", icon: Plus },
  ];

  return (
    <Layout>
      <div className="p-4 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold" data-testid="text-marketplace-title">Mercato Locale</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {gpsStatus === "loading" && <span>Rilevamento GPS...</span>}
                {gpsStatus === "ok" && <span data-testid="text-gps-coords">{coords!.lat.toFixed(4)}, {coords!.lng.toFixed(4)}</span>}
                {gpsStatus === "error" && <span className="text-red-500">GPS non disponibile</span>}
              </div>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${gpsStatus === "ok" ? "bg-green-500" : gpsStatus === "loading" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} data-testid="indicator-gps" />
        </div>

        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "nearby" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
                data-testid="slider-radius"
              />
              <span className="text-sm font-medium min-w-[40px]" data-testid="text-radius">{radius}km</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  data-testid={`filter-category-${cat.value || "all"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {loadingNearby ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : nearbyListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun annuncio nelle vicinanze</p>
                <p className="text-sm mt-1">Prova ad aumentare il raggio di ricerca</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {nearbyListings.map((listing) => {
                  const dist = coords && listing.latitude && listing.longitude
                    ? haversineDistance(coords.lat, coords.lng, listing.latitude, listing.longitude)
                    : null;
                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-2xl overflow-hidden bg-card hover:shadow-md transition-shadow"
                      data-testid={`card-listing-${listing.id}`}
                    >
                      <div className="aspect-square bg-muted relative">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {dist !== null && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm" data-testid={`text-distance-${listing.id}`}>
                            {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                          </span>
                        )}
                        {listing.condition && (
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${conditionColors[listing.condition] || conditionColors.good}`}>
                            {conditions.find((c) => c.value === listing.condition)?.label || listing.condition}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</h3>
                        <p className="text-primary font-bold text-sm mt-0.5" data-testid={`text-listing-price-${listing.id}`}>
                          {listing.price} {listing.currency}
                        </p>
                        {(listing as any).seller && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {(listing as any).seller.avatar ? (
                              <img src={(listing as any).seller.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                {(listing as any).seller.name?.charAt(0) || "?"}
                              </div>
                            )}
                            <span className="text-[11px] text-muted-foreground truncate">{(listing as any).seller.name}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "mine" && (
          <div className="space-y-4">
            {loadingMine ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun annuncio pubblicato</p>
                <p className="text-sm mt-1">Pubblica il tuo primo annuncio!</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium"
                  data-testid="button-create-first"
                >
                  <Plus className="w-4 h-4 inline mr-1" /> Pubblica
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 p-3 border border-border rounded-2xl bg-card"
                    data-testid={`card-my-listing-${listing.id}`}
                  >
                    <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{listing.title}</h3>
                      <p className="text-primary font-bold text-sm">{listing.price} {listing.currency}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${conditionColors[listing.condition || "good"]}`}>
                          {conditions.find((c) => c.value === listing.condition)?.label || listing.condition}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">{listing.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(listing.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors self-center"
                      data-testid={`button-delete-listing-${listing.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "create" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Titolo *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. MacBook Pro 2023"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="input-listing-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Descrizione</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi il tuo articolo..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                data-testid="input-listing-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Prezzo *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-listing-price"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Valuta</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="select-currency"
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="THB">THB ฿</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="select-category"
                >
                  {categories.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Condizione</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="select-condition"
                >
                  {conditions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Immagine</label>
              {imageUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                    data-testid="button-remove-image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Carica immagine</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="input-listing-image" />
                </label>
              )}
            </div>
            {coords && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                <MapPin className="w-3 h-3" />
                <span>Posizione GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !title.trim() || !price}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              data-testid="button-publish-listing"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Pubblica Annuncio"
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
