import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Sparkles, ShoppingBag, ChevronRight, ExternalLink } from "lucide-react";
import type { Product } from "@shared/schema";

type SmartProduct = Product & { aiReason?: string; matchScore?: number };

export function SmartProductsWidget() {
  const { user } = useAuth();

  const { data } = useQuery<{ recommendations: SmartProduct[]; reason: string; profileComplete: boolean }>({
    queryKey: ["/api/ai/smart-products"],
    queryFn: () => apiRequest("GET", "/api/ai/smart-products").then(r => r.json()),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.recommendations?.slice(0, 3) || [];
  if (!user || products.length === 0) return null;

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Gratis";
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: currency || "EUR" }).format(price);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden" data-testid="smart-products-widget">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Suggeriti per te</span>
          {data?.reason === "personalized" && (
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">AI</span>
          )}
        </div>
        <Link href="/marketplace">
          <button className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium" data-testid="link-marketplace-from-widget">
            Vedi tutti
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div className="divide-y">
        {products.map(product => (
          <div key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`widget-product-${product.id}`}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.name}</p>
              {product.aiReason && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">{product.aiReason}</p>
              )}
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">{formatPrice(product.price, product.currency)}</p>
            </div>
            {product.affiliateUrl && (
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      <Link href="/marketplace">
        <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t">
          <ShoppingBag className="w-3 h-3" />
          Vedi tutto il marketplace
          <ChevronRight className="w-3 h-3" />
        </button>
      </Link>
    </div>
  );
}
