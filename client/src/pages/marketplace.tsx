import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import { 
  Home, Map, Users, ShoppingBag, Bell, User, 
  SlidersHorizontal, ExternalLink, Star, BadgeCheck, 
  Plane, Wifi, Briefcase, Shield, Smartphone, Package,
  Search, Calendar, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Vendor } from "@shared/schema";

const CATEGORIES = [
  { id: "all", label: "Tutto", icon: Package },
  { id: "esim", label: "eSIM", icon: Wifi },
  { id: "bags", label: "Bagagli", icon: Briefcase },
  { id: "tech", label: "Tech", icon: Smartphone },
  { id: "insurance", label: "Assicurazioni", icon: Shield },
  { id: "software", label: "Software", icon: Package },
  { id: "clothing", label: "Abbigliamento", icon: Package },
];

type ProductWithVendor = Product & { vendor: Vendor };

export default function Marketplace() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: products = [], isLoading } = useQuery<ProductWithVendor[]>({
    queryKey: ["/api/marketplace/products", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === "all" 
        ? "/api/marketplace/products" 
        : `/api/marketplace/products?category=${selectedCategory}`;
      return apiRequest("GET", url).then(r => r.json());
    },
  });

  const trackClickMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", `/api/marketplace/products/${productId}/click`);
    },
  });

  const handleProductClick = (product: ProductWithVendor) => {
    trackClickMutation.mutate(product.id);
    if (product.affiliateUrl) {
      window.open(product.affiliateUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.icon : Package;
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Gratis";
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: currency || 'EUR' 
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-primary">Marketplace</span>
        {user && <NotificationsDropdown />}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen">
        {/* Left Sidebar */}
        <div className="w-20 bg-card border-r border-border flex flex-col items-center py-6 space-y-6">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <nav className="flex flex-col space-y-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.map")}>
                <Map className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.search")}>
                <Search className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/travel-diary">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.travel_diary")}>
                <Plane className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/events-calendar">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.events_calendar")}>
                <Calendar className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.messages")}>
                <MessageSquare className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/booking">
              <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.booking")}>
                <Briefcase className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="secondary" size="icon" className="w-12 h-12" title={t("nav.marketplace")}>
                <ShoppingBag className="w-5 h-5" />
              </Button>
            </Link>
          </nav>
          <div className="mt-auto space-y-2">
            {user && <NotificationsDropdown />}
            {user && (
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="w-12 h-12" title={t("nav.profile")}>
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Marketplace Nomadi</h1>
                <p className="text-muted-foreground mt-1">
                  Prodotti e servizi selezionati per digital nomad
                </p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nessun prodotto</h3>
                <p className="text-muted-foreground">
                  Non ci sono prodotti in questa categoria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden pt-14 pb-20 px-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Marketplace Nomadi</h1>
          <p className="text-sm text-muted-foreground">
            Prodotti e servizi per digital nomad
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs"
                data-testid={`mobile-category-${cat.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Products List */}
        {isLoading ? (
          <div className="space-y-4">
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
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Nessun prodotto</h3>
            <p className="text-sm text-muted-foreground">
              Non ci sono prodotti in questa categoria
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 flex justify-around items-center z-50">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
            <Map className="w-5 h-5" />
            <span className="text-xs">Mappa</span>
          </Button>
        </Link>
        <Link href="/travel-diary">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
            <Home className="w-5 h-5" />
            <span className="text-xs">Viaggi</span>
          </Button>
        </Link>
        <Link href="/chat">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
            <Users className="w-5 h-5" />
            <span className="text-xs">Chat</span>
          </Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="secondary" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs">Shop</span>
          </Button>
        </Link>
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2">
            <User className="w-5 h-5" />
            <span className="text-xs">Profilo</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}