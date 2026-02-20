import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, BookOpen, MapPin, Globe, Plane, Shield, Wallet, Wifi, Calendar, ChevronRight, ArrowLeft, PenLine } from "lucide-react";
import { motion } from "framer-motion";

type BlogPost = {
  id: string;
  userId: string | null;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  city: string | null;
  country: string | null;
  imageUrl: string | null;
  tags: string[] | null;
  author: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const categoryIcons: Record<string, any> = {
  "guide": MapPin,
  "tips": Shield,
  "lifestyle": Globe,
  "finance": Wallet,
  "tech": Wifi,
  "travel": Plane,
  "events": Calendar,
  "review": BookOpen,
};

const categoryLabels: Record<string, string> = {
  "guide": "Guide Città",
  "tips": "Consigli Pratici",
  "lifestyle": "Vita Nomade",
  "finance": "Finanza & Budget",
  "tech": "Tech & Lavoro",
  "travel": "Viaggi",
  "events": "Eventi",
  "review": "Recensioni",
};

const categoryColors: Record<string, string> = {
  "guide": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "tips": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "lifestyle": "bg-green-500/10 text-green-600 dark:text-green-400",
  "finance": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "tech": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "travel": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "events": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "review": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/blog?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/blog/categories"],
  });

  const filtered = searchQuery
    ? posts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : posts;

  const featured = filtered.find(p => p.imageUrl);
  const rest = filtered.filter(p => p !== featured);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </div>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-blog-title">Storie & Guide</h1>
                <p className="text-sm text-muted-foreground">Esperienze, consigli e guide per nomadi digitali</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/blog/editor">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer" data-testid="button-write-article">
                  <PenLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Scrivi</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca articoli, città, consigli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-blog-search"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid="button-category-all"
            >
              Tutti
            </button>
            {categories.map(cat => {
              const Icon = categoryIcons[cat] || BookOpen;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    cat === selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  data-testid={`button-category-${cat}`}
                >
                  <Icon className="w-3 h-3" />
                  {categoryLabels[cat] || cat}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun articolo trovato</h3>
            <p className="text-sm text-muted-foreground">Prova a cambiare i filtri di ricerca</p>
          </div>
        ) : (
          <>
            {featured && (
              <Link href={`/blog/${featured.slug}`}>
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-2xl overflow-hidden mb-8 cursor-pointer group"
                  data-testid={`card-blog-featured-${featured.slug}`}
                >
                  <div className="aspect-[16/7] bg-gradient-to-br from-primary/20 to-primary/5 relative">
                    {featured.imageUrl && (
                      <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[featured.category] || "bg-muted text-muted-foreground"}`}>
                          {categoryLabels[featured.category] || featured.category}
                        </span>
                        {featured.city && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs">
                            <MapPin className="w-3 h-3" /> {featured.city}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-white/70 text-sm line-clamp-2">{featured.excerpt}</p>
                      <div className="flex items-center gap-2 mt-3 text-white/50 text-xs">
                        <span>{featured.author}</span>
                        <span>·</span>
                        <span>{new Date(featured.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              </Link>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((post, i) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col"
                    data-testid={`card-blog-${post.slug}`}
                  >
                    {post.imageUrl ? (
                      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        {(() => {
                          const Icon = categoryIcons[post.category] || BookOpen;
                          return <Icon className="w-10 h-10 text-primary/40" />;
                        })()}
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
                          {categoryLabels[post.category] || post.category}
                        </span>
                        {post.city && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {post.city}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                          Leggi <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>NomadLife - La community per nomadi digitali</p>
          <div className="flex justify-center gap-4 mt-3">
            <Link href="/" className="hover:text-primary transition-colors">Mappa</Link>
            <Link href="/booking" className="hover:text-primary transition-colors">Booking</Link>
            <Link href="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link>
            <Link href="/auth" className="hover:text-primary transition-colors">Accedi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
