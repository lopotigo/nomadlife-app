import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Bookmark, ArrowLeft, MapPin, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function SavedPosts() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/saved-posts", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSavedPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const handleUnsave = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/save`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setSavedPosts(prev => prev.filter(s => s.postId !== postId));
      }
    } catch (err) { console.error(err); }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-muted transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-saved-title">
              <Bookmark className="w-5 h-5 text-primary fill-primary" />
              {t("nav.saved")}
            </h1>
            <p className="text-sm text-muted-foreground">{savedPosts.length} post</p>
          </div>
        </div>

        {savedPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="empty-saved">
            <Bookmark className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg mb-1">Nessun post salvato</p>
            <p className="text-sm max-w-xs mx-auto">Tocca il pulsante "Salva" su un post per ritrovarlo qui</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="grid-saved-posts">
            <AnimatePresence>
              {savedPosts.map((saved: any) => (
                <motion.div
                  key={saved.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/post/${saved.postId}`)}
                  data-testid={`card-saved-${saved.postId}`}
                >
                  {saved.post?.imageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={saved.post.imageUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt=""
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {saved.post?.user?.avatar ? (
                        <img src={saved.post.user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {saved.post?.user?.name?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid={`text-author-${saved.postId}`}>{saved.post?.user?.name || "Nomad"}</p>
                        {saved.post?.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {saved.post.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {saved.post?.content && (
                      <p className="text-sm text-foreground line-clamp-3 mb-3">{saved.post.content}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> {saved.post?.likes || 0}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnsave(saved.postId); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-red-500/15 hover:text-red-500 transition-colors"
                        data-testid={`button-unsave-${saved.postId}`}
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                        Rimuovi
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}
