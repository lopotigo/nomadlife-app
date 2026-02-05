import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Package, Store, Plus, Trash2, Edit, Eye, EyeOff, Star, 
  BarChart3, MousePointer, ArrowLeft, Save, X, ExternalLink, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Vendor } from "@shared/schema";

interface AdminCheckResponse {
  isAdmin: boolean;
}

interface MarketplaceStats {
  totalProducts: number;
  totalVendors: number;
  totalClicks: number;
  featuredCount: number;
}

const categories = [
  { value: "esim", label: "eSIM" },
  { value: "bags", label: "Zaini & Borse" },
  { value: "clothing", label: "Abbigliamento" },
  { value: "insurance", label: "Assicurazione" },
  { value: "tech", label: "Tech & Gadget" },
  { value: "software", label: "Software" },
];

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "vendors" | "stats">("products");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery<AdminCheckResponse>({
    queryKey: ["/api/admin/check"],
  });

  const { data: products = [] } = useQuery<(Product & { vendor: Vendor })[]>({
    queryKey: ["/api/marketplace/products"],
    enabled: adminCheck?.isAdmin,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/marketplace/vendors"],
    enabled: adminCheck?.isAdmin,
  });

  const { data: stats } = useQuery<MarketplaceStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isAdmin,
  });

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accesso Negato</h1>
        <p className="text-muted-foreground mb-4">Non hai i permessi per accedere a questa pagina.</p>
        <Button onClick={() => setLocation("/")}>Torna alla Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm">Gestione Marketplace</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">Prodotti</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Store className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalVendors}</p>
                    <p className="text-xs text-muted-foreground">Vendor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalClicks}</p>
                    <p className="text-xs text-muted-foreground">Click Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.featuredCount}</p>
                    <p className="text-xs text-muted-foreground">In Evidenza</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
          >
            <Package className="w-4 h-4 mr-2" />
            Prodotti
          </Button>
          <Button
            variant={activeTab === "vendors" ? "default" : "outline"}
            onClick={() => setActiveTab("vendors")}
          >
            <Store className="w-4 h-4 mr-2" />
            Vendor
          </Button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Prodotti ({products.length})</h2>
              <Button onClick={() => { setEditingProduct(null); setShowProductForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Prodotto
              </Button>
            </div>

            <div className="grid gap-4">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onEdit={() => { setEditingProduct(product); setShowProductForm(true); }}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/marketplace/products"] })}
                />
              ))}
              {products.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nessun prodotto. Clicca "Nuovo Prodotto" per iniziare.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === "vendors" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Vendor ({vendors.length})</h2>
              <Button onClick={() => { setEditingVendor(null); setShowVendorForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Vendor
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => (
                <VendorCard 
                  key={vendor.id} 
                  vendor={vendor}
                  onEdit={() => { setEditingVendor(vendor); setShowVendorForm(true); }}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/marketplace/vendors"] })}
                />
              ))}
              {vendors.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nessun vendor. Crea prima un vendor per poter aggiungere prodotti.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Product Form Modal */}
        <AnimatePresence>
          {showProductForm && (
            <ProductFormModal
              product={editingProduct}
              vendors={vendors}
              onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
              onSuccess={() => {
                setShowProductForm(false);
                setEditingProduct(null);
                queryClient.invalidateQueries({ queryKey: ["/api/marketplace/products"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
              }}
            />
          )}
        </AnimatePresence>

        {/* Vendor Form Modal */}
        <AnimatePresence>
          {showVendorForm && (
            <VendorFormModal
              vendor={editingVendor}
              onClose={() => { setShowVendorForm(false); setEditingVendor(null); }}
              onSuccess={() => {
                setShowVendorForm(false);
                setEditingVendor(null);
                queryClient.invalidateQueries({ queryKey: ["/api/marketplace/vendors"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProductCard({ product, onEdit, onRefresh }: { product: Product & { vendor: Vendor }; onEdit: () => void; onRefresh: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/products/${product.id}`),
    onSuccess: onRefresh,
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { isFeatured?: boolean; isActive?: boolean }) => 
      apiRequest("PUT", `/api/admin/products/${product.id}`, data),
    onSuccess: onRefresh,
  });

  return (
    <Card className={`${!product.isActive ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.vendor?.name}</p>
              </div>
              <div className="flex gap-1">
                {product.isFeatured && <Badge variant="secondary"><Star className="w-3 h-3" /></Badge>}
                <Badge>{product.category}</Badge>
              </div>
            </div>
            <p className="text-sm mt-1 line-clamp-2">{product.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="font-semibold text-primary">€{product.price}</span>
              {product.discountPercent && (
                <Badge variant="destructive">-{product.discountPercent}%</Badge>
              )}
              <span className="text-muted-foreground flex items-center gap-1">
                <MousePointer className="w-3 h-3" /> {product.clicks} click
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={onEdit} data-testid={`edit-product-${product.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => toggleMutation.mutate({ isFeatured: !product.isFeatured })}
              data-testid={`toggle-featured-${product.id}`}
            >
              <Star className={`w-4 h-4 ${product.isFeatured ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => toggleMutation.mutate({ isActive: !product.isActive })}
              data-testid={`toggle-active-${product.id}`}
            >
              {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => deleteMutation.mutate()}
              data-testid={`delete-product-${product.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VendorCard({ vendor, onEdit, onRefresh }: { vendor: Vendor; onEdit: () => void; onRefresh: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/vendors/${vendor.id}`),
    onSuccess: onRefresh,
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {vendor.logo ? (
            <img src={vendor.logo} alt={vendor.name} className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
              <Store className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold">{vendor.name}</h3>
            <Badge variant="outline" className="mt-1">{vendor.category}</Badge>
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-1">
                <ExternalLink className="w-3 h-3" /> Sito web
              </a>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={onEdit} data-testid={`edit-vendor-${vendor.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => deleteMutation.mutate()}
              data-testid={`delete-vendor-${vendor.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductFormModal({ product, vendors, onClose, onSuccess }: { 
  product: Product | null; 
  vendors: Vendor[];
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    vendorId: product?.vendorId || "",
    name: product?.name || "",
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    price: product?.price || 0,
    originalPrice: product?.originalPrice || 0,
    discountPercent: product?.discountPercent || 0,
    category: product?.category || "tech",
    affiliateUrl: product?.affiliateUrl || "",
    isFeatured: product?.isFeatured || false,
    isActive: product?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (product) {
        return apiRequest("PUT", `/api/admin/products/${product.id}`, data);
      }
      return apiRequest("POST", "/api/admin/products", data);
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{product ? "Modifica Prodotto" : "Nuovo Prodotto"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Vendor *</Label>
            <Select value={formData.vendorId} onValueChange={(v) => setFormData({...formData, vendorId: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nome Prodotto *</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="es. Zaino Osprey Farpoint 40"
              required
              data-testid="input-product-name"
            />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrizione del prodotto..."
              rows={3}
              data-testid="input-product-description"
            />
          </div>

          <div>
            <Label>URL Immagine</Label>
            <Input 
              value={formData.imageUrl} 
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              placeholder="https://..."
              data-testid="input-product-image"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Prezzo (€)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                data-testid="input-product-price"
              />
            </div>
            <div>
              <Label>Prezzo Originale</Label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.originalPrice} 
                onChange={(e) => setFormData({...formData, originalPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Sconto %</Label>
              <Input 
                type="number" 
                value={formData.discountPercent} 
                onChange={(e) => setFormData({...formData, discountPercent: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Link Affiliato Amazon *</Label>
            <Input 
              value={formData.affiliateUrl} 
              onChange={(e) => setFormData({...formData, affiliateUrl: e.target.value})}
              placeholder="https://www.amazon.it/dp/..."
              required
              data-testid="input-affiliate-url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Inserisci il link con il tuo tag affiliato Amazon
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.isFeatured} 
                onCheckedChange={(v) => setFormData({...formData, isFeatured: v})}
              />
              <Label>In Evidenza</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.isActive} 
                onCheckedChange={(v) => setFormData({...formData, isActive: v})}
              />
              <Label>Attivo</Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-product">
            {mutation.isPending ? "Salvataggio..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {product ? "Aggiorna" : "Crea"} Prodotto
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function VendorFormModal({ vendor, onClose, onSuccess }: { 
  vendor: Vendor | null; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: vendor?.name || "",
    description: vendor?.description || "",
    logo: vendor?.logo || "",
    website: vendor?.website || "",
    email: vendor?.email || "",
    category: vendor?.category || "tech",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (vendor) {
        return apiRequest("PUT", `/api/admin/vendors/${vendor.id}`, data);
      }
      return apiRequest("POST", "/api/admin/vendors", data);
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{vendor ? "Modifica Vendor" : "Nuovo Vendor"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Vendor *</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="es. Amazon, Osprey, SafetyWing"
              required
              data-testid="input-vendor-name"
            />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Breve descrizione del vendor..."
              rows={2}
            />
          </div>

          <div>
            <Label>URL Logo</Label>
            <Input 
              value={formData.logo} 
              onChange={(e) => setFormData({...formData, logo: e.target.value})}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Sito Web</Label>
            <Input 
              value={formData.website} 
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="contatto@vendor.com"
            />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-vendor">
            {mutation.isPending ? "Salvataggio..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {vendor ? "Aggiorna" : "Crea"} Vendor
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
