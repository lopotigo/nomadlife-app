import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import Layout from "@/components/layout";
import { 
  ShoppingBag, ExternalLink, Star, BadgeCheck, 
  Wifi, Briefcase, Shield, Smartphone, Package,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Vendor } from "@shared/schema";
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

  const smartProducts = smartData?.recommendations?.slice(0, 3) || [];
  const showAiSection = user && smartProducts.length > 0;

  return (
    <Layout>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4">
        <h1 className="text-xl font-display font-bold" data-testid="text-marketplace-title">Marketplace Nomadi</h1>
        <p className="text-sm text-muted-foreground">Prodotti e servizi selezionati per digital nomad</p>
      </header>

      <div className="p-4 space-y-6">
        {showAiSection && (
          <section data-testid="section-ai-recommendations">
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
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="md:hidden space-y-4">
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
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            <div className="md:hidden space-y-3">
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
      </div>
    </Layout>
  );
}
