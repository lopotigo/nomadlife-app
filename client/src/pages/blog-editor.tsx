import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Save, X,
  BookOpen, MapPin, FileText, PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import type { BlogPost } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";

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

export default function BlogEditor() {
  usePageTitle("Blog Editor");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const { data: myPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/my-posts"],
  });

  const publishedCount = myPosts.filter(p => p.published).length;
  const draftCount = myPosts.filter(p => !p.published).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/blog">
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </div>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-editor-title">
                  <PenLine className="w-5 h-5 text-primary" />
                  I Miei Articoli
                </h1>
                <p className="text-xs text-muted-foreground">
                  {publishedCount} pubblicati · {draftCount} bozze
                </p>
              </div>
            </div>
            <Button onClick={() => { setEditingPost(null); setShowForm(true); }} data-testid="button-new-article">
              <Plus className="w-4 h-4 mr-2" />
              Scrivi
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : myPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun articolo ancora</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Condividi le tue esperienze, guide di viaggio e consigli con la community di nomadi digitali!
            </p>
            <Button onClick={() => { setEditingPost(null); setShowForm(true); }} data-testid="button-write-first">
              <PenLine className="w-4 h-4 mr-2" />
              Scrivi il tuo primo articolo
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {myPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <UserBlogPostCard
                  post={post}
                  onEdit={() => { setEditingPost(post); setShowForm(true); }}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/blog/my-posts"] })}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showForm && (
          <UserBlogFormModal
            post={editingPost}
            onClose={() => { setShowForm(false); setEditingPost(null); }}
            onSuccess={() => {
              setShowForm(false);
              setEditingPost(null);
              queryClient.invalidateQueries({ queryKey: ["/api/blog/my-posts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserBlogPostCard({ post, onEdit, onRefresh }: { post: BlogPost; onEdit: () => void; onRefresh: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/blog/${post.id}`),
    onSuccess: onRefresh,
  });

  const togglePublishMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/blog/${post.id}`, { published: !post.published }),
    onSuccess: onRefresh,
  });

  return (
    <Card className={`${!post.published ? "opacity-70 border-dashed" : ""}`} data-testid={`card-my-blog-${post.id}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {blogCategories.find(c => c.value === post.category)?.label || post.category}
              </Badge>
              {post.city && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {post.city}
                </span>
              )}
              {!post.published && <Badge variant="outline" className="text-[10px]">Bozza</Badge>}
            </div>
            <h3 className="font-semibold text-sm truncate">{post.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {new Date(post.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit} data-testid={`button-edit-${post.id}`}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => togglePublishMutation.mutate()}
              data-testid={`button-toggle-${post.id}`}
            >
              {post.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </Button>
            {post.published && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                data-testid={`button-view-${post.id}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => { if (confirm("Eliminare questo articolo?")) deleteMutation.mutate(); }}
              data-testid={`button-delete-${post.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserBlogFormModal({ post, onClose, onSuccess }: {
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
    published: post?.published ?? false,
  });

  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (post) {
        return apiRequest("PUT", `/api/blog/${post.id}`, data);
      }
      return apiRequest("POST", "/api/blog", data);
    },
    onSuccess,
    onError: (err: any) => {
      setError(err?.message || "Errore durante il salvataggio. Verifica che lo slug sia unico.");
    },
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
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
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
              placeholder="es. La mia esperienza a Bali come nomade digitale"
              required
              data-testid="input-article-title"
            />
          </div>

          <div>
            <Label>Slug URL *</Label>
            <div className="flex gap-2">
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="la-mia-esperienza-bali"
                required
                data-testid="input-article-slug"
              />
              <Button type="button" variant="outline" onClick={generateSlug} data-testid="button-auto-slug">
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/blog/{formData.slug || "..."}</p>
          </div>

          <div>
            <Label>Anteprima / Estratto *</Label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Una breve descrizione che appare nella lista articoli..."
              rows={2}
              required
              data-testid="input-article-excerpt"
            />
          </div>

          <div>
            <Label>Contenuto * (Markdown supportato)</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={"Racconta la tua esperienza, condividi consigli...\n\n## Sottotitolo\nUsa il markdown per formattare il testo.\n\n- Lista puntata\n- **Grassetto**\n- *Corsivo*"}
              rows={14}
              required
              className="font-mono text-sm"
              data-testid="input-article-content"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger data-testid="select-article-category">
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
              <Label>Città</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="es. Bali, Bangkok..."
                data-testid="input-article-city"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Paese</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="es. Indonesia"
                data-testid="input-article-country"
              />
            </div>
            <div>
              <Label>Immagine di copertina (URL)</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-article-image"
              />
            </div>
          </div>

          <div>
            <Label>Tag (separati da virgola)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="es. bali, coworking, vita nomade, consigli"
              data-testid="input-article-tags"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <Switch
              checked={formData.published}
              onCheckedChange={(v) => setFormData({ ...formData, published: v })}
              data-testid="switch-article-published"
            />
            <div>
              <Label className="text-sm">Pubblica subito</Label>
              <p className="text-xs text-muted-foreground">
                {formData.published ? "L'articolo sarà visibile a tutti" : "Salvato come bozza, solo tu puoi vederlo"}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-form-error">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-article">
            {mutation.isPending ? "Salvataggio..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {post ? "Aggiorna Articolo" : (formData.published ? "Pubblica Articolo" : "Salva Bozza")}
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
