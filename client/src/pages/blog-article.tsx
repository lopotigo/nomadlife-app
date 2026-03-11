import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { ArrowLeft, MapPin, Calendar, User, ChevronRight, Plane, Hotel, Car, Shield, Lock, ExternalLink, BookOpen, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAffiliateLinks } from "@/lib/travelpayouts";

type BlogPost = {
  id: string;
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

export default function BlogArticle() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog/${slug}`],
    enabled: !!slug,
  });

  usePageTitle(post?.title || "Articolo");

  const { data: relatedPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog", post?.category],
    queryFn: async () => {
      if (!post?.category) return [];
      const res = await fetch(`/api/blog?category=${post.category}`);
      if (!res.ok) return [];
      const all = await res.json();
      return all.filter((p: BlogPost) => p.slug !== slug).slice(0, 3);
    },
    enabled: !!post?.category,
  });

  const affiliateLinks = post?.city ? getAffiliateLinks(post.city) : [];

  const iconMap: Record<string, any> = { hotel: Hotel, plane: Plane, car: Car, bus: Car, shield: Shield, lock: Lock };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post?.title, text: post?.excerpt, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Articolo non trovato</h2>
        <Link href="/blog">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Torna al Blog</button>
        </Link>
      </div>
    );
  }

  const renderContent = (content: string) => {
    return content.split('\n').map((paragraph, i) => {
      if (!paragraph.trim()) return <br key={i} />;
      if (paragraph.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-foreground">{paragraph.slice(3)}</h2>;
      }
      if (paragraph.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground">{paragraph.slice(4)}</h3>;
      }
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        const liFormatted = paragraph.slice(2)
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <li key={i} className="ml-4 mb-1 text-muted-foreground leading-relaxed list-disc" dangerouslySetInnerHTML={{ __html: liFormatted }} />
        );
      }
      if (paragraph.match(/^\d+\. /)) {
        const olFormatted = paragraph.replace(/^\d+\. /, '')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <li key={i} className="ml-4 mb-1 text-muted-foreground leading-relaxed list-decimal" dangerouslySetInnerHTML={{ __html: olFormatted }} />
        );
      }
      const formatted = paragraph
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">$1</a>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return (
        <p key={i} className="text-muted-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog">
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-back-to-blog">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm hidden sm:block">Blog</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="button-share-article">
              <Share2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                N
              </div>
              <span className="font-bold hidden sm:block">NomadLife</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {post.imageUrl && (
            <div className="aspect-[16/7] rounded-2xl overflow-hidden mb-6">
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[post.category] || "bg-muted text-muted-foreground"}`}>
              {categoryLabels[post.category] || post.category}
            </span>
            {post.city && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                <MapPin className="w-3 h-3" /> {post.city}{post.country ? `, ${post.country}` : ""}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-3" data-testid="text-article-title">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <div className="prose prose-sm max-w-none" data-testid="text-article-content">
                {renderContent(post.content)}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {affiliateLinks.length > 0 && (
              <aside className="lg:w-72 flex-shrink-0">
                <div className="sticky top-20 bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Plane className="w-4 h-4 text-primary" />
                    Servizi per {post.city}
                  </h3>
                  <div className="space-y-2">
                    {affiliateLinks.map(link => {
                      const Icon = iconMap[link.icon] || ExternalLink;
                      return (
                        <a
                          key={link.provider}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
                          data-testid={`link-affiliate-${link.provider.toLowerCase()}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{link.label}</p>
                            <p className="text-[10px] text-muted-foreground">{link.provider}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </motion.article>

        {relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-bold mb-4">Articoli correlati</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map(rp => (
                <Link key={rp.id} href={`/blog/${rp.slug}`}>
                  <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all cursor-pointer group" data-testid={`card-related-${rp.slug}`}>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[rp.category] || "bg-muted text-muted-foreground"}`}>
                      {categoryLabels[rp.category] || rp.category}
                    </span>
                    <h3 className="font-medium text-sm mt-2 mb-1 group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rp.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>NomadLife - La community per nomadi digitali</p>
          <div className="flex justify-center gap-4 mt-3">
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link href="/" className="hover:text-primary transition-colors">Mappa</Link>
            <Link href="/booking" className="hover:text-primary transition-colors">Booking</Link>
            <Link href="/auth" className="hover:text-primary transition-colors">Accedi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
