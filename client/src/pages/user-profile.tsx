import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, useParams, Link } from "wouter";
import { MapPin, Globe, Award, MessageSquare, Mail, Loader2, ArrowLeft, UserPlus, UserMinus, Users, BookOpen, Image, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Post, User, BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserProfile() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [followLoading, setFollowLoading] = useState(false);
  const { toast } = useToast();

  const fetchFollowStatus = useCallback(async () => {
    if (!params.id) return;
    try {
      const [followRes, statsRes] = await Promise.all([
        fetch(`/api/is-following/${params.id}`, { credentials: "include" }),
        fetch(`/api/users/${params.id}/follow-stats`, { credentials: "include" }),
      ]);
      if (followRes.ok) {
        const { isFollowing: following } = await followRes.json();
        setIsFollowing(following);
      }
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setFollowStats(stats);
      }
    } catch (error) {
      console.error("Failed to fetch follow status:", error);
    }
  }, [params.id]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      setLocation("/auth");
      return;
    }

    if (params.id === currentUser.id) {
      setLocation("/profile");
      return;
    }

    Promise.all([
      fetch(`/api/users/${params.id}`, { credentials: "include" }).then(res => res.json()),
      fetch(`/api/posts/user/${params.id}`, { credentials: "include" }).then(res => res.json()),
      fetch(`/api/blog/user/${params.id}`).then(res => res.ok ? res.json() : [])
    ])
      .then(([userData, postsData, blogData]) => {
        setUser(userData);
        setPosts(postsData);
        setBlogPosts(blogData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    
    fetchFollowStatus();
  }, [currentUser, authLoading, setLocation, params.id, fetchFollowStatus]);

  const handleFollow = async () => {
    if (!params.id) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${params.id}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setIsFollowing(true);
        setFollowStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
        toast({ title: `Ora segui ${user?.name}` });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile seguire", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!params.id) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/unfollow/${params.id}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setIsFollowing(false);
        setFollowStats(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
        toast({ title: `Non segui più ${user?.name}` });
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile smettere di seguire", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <p className="text-muted-foreground">User not found</p>
          <button 
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>
        </div>
      </Layout>
    );
  }

  const categoryLabels: Record<string, string> = {
    guide: "Guide Città", tips: "Consigli", lifestyle: "Vita Nomade",
    finance: "Finanza", tech: "Tech", travel: "Viaggi", events: "Eventi", review: "Recensioni",
  };

  const categoryColors: Record<string, string> = {
    guide: "bg-blue-100 text-blue-700", tips: "bg-amber-100 text-amber-700",
    lifestyle: "bg-green-100 text-green-700", finance: "bg-purple-100 text-purple-700",
    tech: "bg-cyan-100 text-cyan-700", travel: "bg-rose-100 text-rose-700",
    events: "bg-orange-100 text-orange-700", review: "bg-indigo-100 text-indigo-700",
  };

  return (
    <Layout>
      <header className="relative">
        <button 
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 z-20 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="h-40 bg-gradient-to-br from-primary/80 to-primary w-full relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/topography.png')]" />
        </div>
        
        <div className="px-6 pb-6 -mt-16 flex flex-col items-center relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-3xl border-4 border-card bg-muted overflow-hidden shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300"
          >
            <img 
              src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
              alt={user.name} 
              className="w-full h-full object-cover" 
              data-testid="img-user-avatar"
            />
          </motion.div>
          
          <div className="text-center mt-4 space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight" data-testid="text-user-name">{user.name}</h1>
            <p className="text-primary font-medium" data-testid="text-user-username">@{user.username}</p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-sm font-medium bg-secondary/50 text-secondary-foreground px-4 py-2 rounded-2xl border border-secondary">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-user-location">{user.location || "Nomadic"}</span>
            </div>
            
            <Button
              onClick={isFollowing ? handleUnfollow : handleFollow}
              disabled={followLoading}
              variant={isFollowing ? "outline" : "default"}
              className={isFollowing ? "border-primary text-primary" : "bg-primary hover:bg-primary/90"}
              data-testid="button-follow"
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-1" />
                  Smetti seguire
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Segui
                </>
              )}
            </Button>

            <Link href={`/chat?user=${params.id}`}>
              <button 
                className="p-2 rounded-2xl border border-border hover:bg-muted transition-colors"
                data-testid="button-message-user"
              >
                <Mail className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
          </div>
          
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold" data-testid="text-followers-count">{followStats.followersCount}</span>
              <span className="text-muted-foreground">follower</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold" data-testid="text-following-count">{followStats.followingCount}</span>
              <span className="text-muted-foreground">seguiti</span>
            </div>
          </div>

          {user.bio && (
            <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground max-w-sm" data-testid="text-user-bio">
              {user.bio}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 w-full mt-8">
            <StatCard label="Countries" value={user.countriesVisited} icon={Globe} />
            <StatCard label="Cities" value={user.citiesVisited} icon={MapPin} />
            <StatCard label="Coworking" value={user.coworkingSpaces} icon={Award} />
          </div>

          <div className="w-full mt-8">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full grid grid-cols-2" data-testid="tabs-profile-content">
                <TabsTrigger value="posts" className="flex items-center gap-1.5" data-testid="tab-posts">
                  <Image className="w-4 h-4" />
                  Post ({posts.length})
                </TabsTrigger>
                <TabsTrigger value="articles" className="flex items-center gap-1.5" data-testid="tab-articles">
                  <BookOpen className="w-4 h-4" />
                  Articoli ({blogPosts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-4">
                {posts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-posts">
                    <Image className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Nessun post pubblicato.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="aspect-square rounded-2xl overflow-hidden border border-border group relative"
                        data-testid={`card-journey-${post.id}`}
                      >
                        {post.imageUrl ? (
                          <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center p-4">
                            <p className="text-xs text-center text-muted-foreground">{post.content.substring(0, 100)}</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="articles" className="mt-4">
                {blogPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-articles">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Nessun articolo pubblicato.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blogPosts.map((article) => (
                      <Link key={article.id} href={`/blog/${article.slug}`}>
                        <motion.div
                          whileHover={{ x: 4 }}
                          className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
                          data-testid={`card-article-${article.id}`}
                        >
                          {article.imageUrl && (
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[article.category] || "bg-gray-100 text-gray-700"}`}>
                                {categoryLabels[article.category] || article.category}
                              </span>
                              {article.city && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />{article.city}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm leading-snug line-clamp-2" data-testid={`text-article-title-${article.id}`}>
                              {article.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {article.excerpt}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </header>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all"
      data-testid={`stat-${label.toLowerCase()}`}
    >
      <Icon className="w-5 h-5 text-primary mb-2" />
      <span className="text-2xl font-bold font-display">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
    </motion.div>
  );
}
