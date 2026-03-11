import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Package, Store, Plus, Trash2, Edit, Eye, EyeOff, Star, 
  BarChart3, MousePointer, ArrowLeft, Save, X, ExternalLink, Image, BookOpen, MapPin
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
import type { Product, Vendor, BlogPost } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

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
  usePageTitle("Admin");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "vendors" | "stats" | "blog">("products");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);

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

  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/all"],
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
            <p className="text-muted-foreground text-sm">Gestione Marketplace & Blog</p>
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
          <Button
            variant={activeTab === "blog" ? "default" : "outline"}
            onClick={() => setActiveTab("blog")}
            data-testid="button-tab-blog"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Blog
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

        {/* Blog Tab */}
        {activeTab === "blog" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Articoli Blog ({blogPosts.length})</h2>
              <Button onClick={() => { setEditingBlogPost(null); setShowBlogForm(true); }} data-testid="button-new-blog">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Articolo
              </Button>
            </div>

            <div className="grid gap-4">
              {blogPosts.map((post) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  onEdit={() => { setEditingBlogPost(post); setShowBlogForm(true); }}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/blog/all"] })}
                />
              ))}
              {blogPosts.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nessun articolo. Clicca "Nuovo Articolo" per iniziare.
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

        {/* Blog Form Modal */}
        <AnimatePresence>
          {showBlogForm && (
            <BlogFormModal
              post={editingBlogPost}
              onClose={() => { setShowBlogForm(false); setEditingBlogPost(null); }}
              onSuccess={() => {
                setShowBlogForm(false);
                setEditingBlogPost(null);
                queryClient.invalidateQueries({ queryKey: ["/api/blog/all"] });
                queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
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

const blogCategories = [
  { value: "guide", label: "Guide Città" },
  { value: "tips", label: "Consigli Pratici" },
  { value: "lifestyle", label: "Vita Nomade" },
  { value: "finance", label: "Finanza & Budget" },
  { value: "tech", label: "Tech & Lavoro" },
  { value: "travel", label: "Viaggi" },
  { value: "events", label: "Eventi" },
  { value: "review", label: "Recensioni" },
];

function BlogPostCard({ post, onEdit, onRefresh }: { post: BlogPost; onEdit: () => void; onRefresh: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/blog/${post.id}`),
    onSuccess: onRefresh,
  });

  const togglePublishMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/blog/${post.id}`, { published: !post.published }),
    onSuccess: onRefresh,
  });

  return (
    <Card className={`${!post.published ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{post.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{blogCategories.find(c => c.value === post.category)?.label || post.category}</Badge>
                  {post.city && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {post.city}</span>
                  )}
                  <span>{post.author}</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!post.published && <Badge variant="outline">Bozza</Badge>}
              </div>
            </div>
            <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{post.excerpt}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Slug: /{post.slug}</span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString("it-IT")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={onEdit} data-testid={`edit-blog-${post.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => togglePublishMutation.mutate()}
              data-testid={`toggle-publish-${post.id}`}
            >
              {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
              data-testid={`preview-blog-${post.id}`}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => { if (confirm("Eliminare questo articolo?")) deleteMutation.mutate(); }}
              data-testid={`delete-blog-${post.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BlogFormModal({ post, onClose, onSuccess }: {
  post: BlogPost | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    slug: post?.slug || "",
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    category: post?.category || "guide",
    city: post?.city || "",
    country: post?.country || "",
    imageUrl: post?.imageUrl || "",
    tags: post?.tags?.join(", ") || "",
    author: post?.author || "NomadLife Team",
    published: post?.published ?? true,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (post) {
        return apiRequest("PUT", `/api/blog/${post.id}`, data);
      }
      return apiRequest("POST", "/api/blog", data);
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      city: formData.city || null,
      country: formData.country || null,
      imageUrl: formData.imageUrl || null,
      tags: formData.tags ? formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
    };
    mutation.mutate(payload);
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[àáâãäå]/g, "a")
      .replace(/[èéêë]/g, "e")
      .replace(/[ìíîï]/g, "i")
      .replace(/[òóôõö]/g, "o")
      .replace(/[ùúûü]/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData({ ...formData, slug });
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
        className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{post ? "Modifica Articolo" : "Nuovo Articolo"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titolo *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="es. Guida Completa a Bangkok per Nomadi Digitali"
              required
              data-testid="input-blog-title"
            />
          </div>

          <div>
            <Label>Slug URL *</Label>
            <div className="flex gap-2">
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="guida-nomade-bangkok"
                required
                data-testid="input-blog-slug"
              />
              <Button type="button" variant="outline" onClick={generateSlug} data-testid="button-generate-slug">
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/blog/{formData.slug || "..."}</p>
          </div>

          <div>
            <Label>Estratto *</Label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Breve descrizione che appare nell'anteprima..."
              rows={2}
              required
              data-testid="input-blog-excerpt"
            />
          </div>

          <div>
            <Label>Contenuto * (Markdown supportato)</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Scrivi il contenuto dell'articolo in Markdown..."
              rows={12}
              required
              className="font-mono text-sm"
              data-testid="input-blog-content"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger data-testid="select-blog-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {blogCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Autore</Label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="NomadLife Team"
                data-testid="input-blog-author"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Città</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="es. Bangkok"
                data-testid="input-blog-city"
              />
            </div>
            <div>
              <Label>Paese</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="es. Thailandia"
                data-testid="input-blog-country"
              />
            </div>
          </div>

          <div>
            <Label>URL Immagine di copertina</Label>
            <Input
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              data-testid="input-blog-image"
            />
          </div>

          <div>
            <Label>Tag (separati da virgola)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="es. nomade, guida, asia, coworking"
              data-testid="input-blog-tags"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.published}
              onCheckedChange={(v) => setFormData({ ...formData, published: v })}
              data-testid="switch-blog-published"
            />
            <Label>Pubblicato</Label>
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-blog">
            {mutation.isPending ? "Salvataggio..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {post ? "Aggiorna" : "Crea"} Articolo
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
