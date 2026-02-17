import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import Layout from "@/components/layout";
import { 
  ShoppingBag, ExternalLink, Star, BadgeCheck, 
  Wifi, Briefcase, Shield, Smartphone, Package,
  Sparkles, MapPin, Navigation, Store, Trash2, Loader2, Plus, SlidersHorizontal,
  Tag, Image as ImageIcon, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { motion } from "framer-motion";
import type { Product, Vendor, LocalListing } from "@shared/schema";
import { AdBanner } from "@/components/ad-banner";

const CATEGORIES = [
  { id: "all", label: "Tutto", icon: Package },
  { id: "esim", label: "eSIM", icon: Wifi },
  { id: "bags", label: "Bagagli", icon: Briefcase },
  { id: "tech", label: "Tech", icon: Smartphone },
  { id: "insurance", label: "Assicurazioni", icon: Shield },
  { id: "software", label: "Software", icon: Package },
  { id: "clothing", label: "Abbigliamento", icon: Package },
];

const LOCAL_CATEGORIES = [
  { value: "", label: "Tutti" },
  { value: "electronics", label: "Elettronica" },
  { value: "clothing", label: "Abbigliamento" },
  { value: "accessories", label: "Accessori" },
  { value: "books", label: "Libri" },
  { value: "furniture", label: "Arredamento" },
  { value: "other", label: "Altro" },
];

const CONDITIONS = [
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

type ProductWithVendor = Product & { vendor: Vendor };
type SmartProduct = Product & { aiReason?: string; matchScore?: number };

interface SmartProductsResponse {
  recommendations: SmartProduct[];
  reason: string;
  profileComplete: boolean;
}

export default function Marketplace() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mainTab, setMainTab] = useState("shop");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "error">("loading");
  const [radius, setRadius] = useState(3);
  const [localCategoryFilter, setLocalCategoryFilter] = useState("");
  const [localSubTab, setLocalSubTab] = useState<"nearby" | "mine" | "create">("nearby");

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

  const { data: products = [], isLoading } = useQuery<ProductWithVendor[]>({
    queryKey: ["/api/marketplace/products", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === "all" 
        ? "/api/marketplace/products" 
        : `/api/marketplace/products?category=${selectedCategory}`;
      return apiRequest("GET", url).then(r => r.json());
    },
  });

  const { data: smartData } = useQuery<SmartProductsResponse>({
    queryKey: ["/api/ai/smart-products"],
    queryFn: async () => {
      return apiRequest("GET", "/api/ai/smart-products").then(r => r.json());
    },
    enabled: !!user,
  });

  const trackClickMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", `/api/marketplace/products/${productId}/click`);
    },
  });

  const handleProductClick = (product: ProductWithVendor | SmartProduct) => {
    trackClickMutation.mutate(product.id);
    if (product.affiliateUrl) {
      window.open(product.affiliateUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find(c => c.id === cat);
    return found ? found.icon : Package;
  };

  const formatPrice = (p: number | null, cur: string | null) => {
    if (!p) return "Gratis";
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: cur || 'EUR' 
    }).format(p);
  };

  const smartProducts = smartData?.recommendations?.slice(0, 3) || [];
  const showAiSection = user && smartProducts.length > 0;

  const { data: nearbyListings = [], isLoading: loadingNearby } = useQuery<(LocalListing & { seller?: any })[]>({
    queryKey: ["/api/local-listings/nearby", coords?.lat, coords?.lng, radius, localCategoryFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        lat: String(coords!.lat),
        lng: String(coords!.lng),
        radius: String(radius),
      });
      if (localCategoryFilter) params.set("category", localCategoryFilter);
      return apiRequest("GET", `/api/local-listings/nearby?${params}`).then((r) => r.json());
    },
    enabled: !!coords && mainTab === "local",
  });

  const { data: myListings = [], isLoading: loadingMine } = useQuery<LocalListing[]>({
    queryKey: ["/api/local-listings/user", user?.id],
    queryFn: () => apiRequest("GET", `/api/local-listings/user/${user!.id}`).then((r) => r.json()),
    enabled: !!user && mainTab === "local" && localSubTab === "mine",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/local-listings", data),
    onSuccess: () => {
      toast({ title: "Annuncio pubblicato!" });
      setTitle("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setLocalSubTab("mine");
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

  return (
    <Layout>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4">
        <h1 className="text-xl font-display font-bold" data-testid="text-marketplace-title">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Prodotti, servizi e annunci per digital nomad</p>
      </header>

      <div className="p-4 space-y-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="shop" className="flex-1" data-testid="tab-shop">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Shop
            </TabsTrigger>
            <TabsTrigger value="local" className="flex-1" data-testid="tab-local">
              <Store className="w-4 h-4 mr-2" />
              Vicino a te
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop">
            {showAiSection && (
              <section data-testid="section-ai-recommendations" className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Consigliati per te</h2>
                  {smartData?.reason === "personalized" && (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-ai-personalized">AI</Badge>
                  )}
                </div>
                {smartData && !smartData.profileComplete && (
                  <p className="text-xs text-muted-foreground mb-3" data-testid="text-profile-hint">
                    Analizza il tuo profilo per raccomandazioni migliori
                  </p>
                )}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {smartProducts.map(product => (
                    <Card
                      key={product.id}
                      className="flex-shrink-0 w-56 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleProductClick(product)}
                      data-testid={`ai-product-card-${product.id}`}
                    >
                      <div className="relative h-32 bg-muted">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-1" data-testid={`text-ai-product-name-${product.id}`}>{product.name}</h3>
                        <span className="font-bold text-primary text-sm" data-testid={`text-ai-product-price-${product.id}`}>
                          {formatPrice(product.price, product.currency)}
                        </span>
                        {product.aiReason && (
                          <Badge variant="outline" className="mt-1.5 text-[10px] block w-fit" data-testid={`badge-ai-reason-${product.id}`}>
                            <Sparkles className="w-3 h-3 mr-1 inline" />
                            {product.aiReason}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center gap-2 whitespace-nowrap"
                    data-testid={`category-filter-${cat.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>

            {isLoading ? (
              <>
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted rounded-t-lg" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="md:hidden space-y-4 mt-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4 flex gap-4">
                        <div className="w-24 h-24 bg-muted rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-4 bg-muted rounded w-1/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nessun prodotto</h3>
                <p className="text-muted-foreground">
                  Non ci sono prodotti in questa categoria
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {products.map(product => {
                    const CategoryIcon = getCategoryIcon(product.category);
                    return (
                      <Card 
                        key={product.id} 
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                        onClick={() => handleProductClick(product)}
                        data-testid={`product-card-${product.id}`}
                      >
                        <div className="relative h-48 bg-muted">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CategoryIcon className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}
                          {product.isFeatured && (
                            <Badge className="absolute top-2 left-2 bg-amber-500">
                              <Star className="w-3 h-3 mr-1" /> In evidenza
                            </Badge>
                          )}
                          {product.discountPercent && product.discountPercent > 0 && (
                            <Badge className="absolute top-2 right-2 bg-red-500">
                              -{product.discountPercent}%
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {product.originalPrice && product.originalPrice > (product.price || 0) && (
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.originalPrice, product.currency)}
                                </span>
                              )}
                              <span className="font-bold text-primary">
                                {formatPrice(product.price, product.currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {product.vendor?.isVerified && (
                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                              )}
                              <span>{product.vendor?.name}</span>
                            </div>
                          </div>
                          {product.tags && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {product.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="md:hidden space-y-3 mt-4">
                  {products.map(product => {
                    const CategoryIcon = getCategoryIcon(product.category);
                    return (
                      <Card 
                        key={product.id}
                        className="overflow-hidden"
                        onClick={() => handleProductClick(product)}
                        data-testid={`mobile-product-${product.id}`}
                      >
                        <CardContent className="p-3 flex gap-3">
                          <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <CategoryIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            {product.discountPercent && product.discountPercent > 0 && (
                              <Badge className="absolute top-1 left-1 bg-red-500 text-[10px] px-1 py-0">
                                -{product.discountPercent}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {product.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="font-bold text-primary">
                                {formatPrice(product.price, product.currency)}
                              </span>
                              {product.originalPrice && product.originalPrice > (product.price || 0) && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(product.originalPrice, product.currency)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              {product.vendor?.isVerified && (
                                <BadgeCheck className="w-3 h-3 text-blue-500" />
                              )}
                              <span>{product.vendor?.name}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            <AdBanner format="horizontal" className="mt-6 rounded-xl" />
          </TabsContent>

          <TabsContent value="local">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {gpsStatus === "loading" && <span>Rilevamento GPS...</span>}
                  {gpsStatus === "ok" && <span data-testid="text-gps-coords">{coords!.lat.toFixed(4)}, {coords!.lng.toFixed(4)}</span>}
                  {gpsStatus === "error" && <span className="text-red-500">GPS non disponibile</span>}
                </div>
                <div className={`w-3 h-3 rounded-full ${gpsStatus === "ok" ? "bg-green-500" : gpsStatus === "loading" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} data-testid="indicator-gps" />
              </div>

              <div className="flex border-b border-border">
                {[
                  { key: "nearby" as const, label: "Vicino a me", icon: Navigation },
                  { key: "mine" as const, label: "I miei annunci", icon: Package },
                  { key: "create" as const, label: "Pubblica", icon: Plus },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setLocalSubTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2 ${
                      localSubTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`tab-local-${tab.key}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {localSubTab === "nearby" && (
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
                    {LOCAL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setLocalCategoryFilter(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          localCategoryFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        data-testid={`filter-local-category-${cat.value || "all"}`}
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
                                  {CONDITIONS.find((c) => c.value === listing.condition)?.label || listing.condition}
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

              {localSubTab === "mine" && (
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
                        onClick={() => setLocalSubTab("create")}
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
                                {CONDITIONS.find((c) => c.value === listing.condition)?.label || listing.condition}
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

              {localSubTab === "create" && (
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
                        {LOCAL_CATEGORIES.filter((c) => c.value).map((c) => (
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
                        {CONDITIONS.map((c) => (
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
