import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { MapPin, Globe, Award, MessageSquare, Mail, Loader2, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import type { Post } from "@shared/schema";

export default function Profile() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch(`/api/posts/user/${user.id}`)
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  if (authLoading || loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="relative">
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
              data-testid="img-profile-avatar"
            />
          </motion.div>
          
          <div className="text-center mt-4 space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight" data-testid="text-profile-name">{user.name}</h1>
            <p className="text-primary font-medium" data-testid="text-profile-username">@{user.username}</p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 text-sm font-medium bg-secondary/50 text-secondary-foreground px-4 py-2 rounded-2xl border border-secondary">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-profile-location">{user.location || "Nomadic"}</span>
            </div>
            <button className="p-2 rounded-2xl border border-border hover:bg-muted transition-colors">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {user.bio && (
            <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground max-w-sm" data-testid="text-profile-bio">
              {user.bio}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 w-full mt-8">
            <StatCard label="Countries" value={user.countriesVisited} icon={Globe} />
            <StatCard label="Cities" value={user.citiesVisited} icon={MapPin} />
            <StatCard label="Coworking" value={user.coworkingSpaces} icon={Award} />
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-muted rounded-2xl font-bold hover:bg-muted/80 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>

          <div className="w-full mt-10 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold">My Journey</h2>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {posts.length} Posts
                </span>
              </div>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No posts yet. Start sharing your journey!</p>
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
            </section>
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
