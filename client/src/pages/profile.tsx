import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { MapPin, Globe, Award, MessageSquare, Mail, Loader2, LogOut, Share2, QrCode, Camera, Users, UserPlus, Sun, Moon, Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import type { Post } from "@shared/schema";
import { ShareQRModal } from "@/components/share-qr-modal";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/lib/theme";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useUpload } from "@/hooks/use-upload";

export default function Profile() {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const { uploadFile, isUploading: uploadingPhoto } = useUpload();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareQR, setShowShareQR] = useState(false);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [showFollowModal, setShowFollowModal] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    Promise.all([
      fetch(`/api/posts/user/${user.id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/users/${user.id}/follow-stats`, { credentials: "include" }).then(r => r.json())
    ])
      .then(([postsData, statsData]) => {
        setPosts(postsData);
        setFollowStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const openFollowModal = async (type: "followers" | "following") => {
    if (!user) return;
    setShowFollowModal(type);
    setLoadingFollowList(true);
    try {
      const res = await fetch(`/api/users/${user.id}/${type}`, { credentials: "include" });
      const data = await res.json();
      setFollowList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const response = await uploadFile(file);
      if (!response) throw new Error("Upload failed");

      const updateRes = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatar: response.objectPath }),
      });

      if (!updateRes.ok) throw new Error("Update failed");

      if (refreshUser) await refreshUser();
      toast({ title: "Foto aggiornata!", description: "La tua foto profilo è stata cambiata." });
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile caricare la foto.", variant: "destructive" });
    }
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
            className="relative w-32 h-32 rounded-3xl border-4 border-card bg-muted overflow-hidden shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300 group"
          >
            <img 
              src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
              alt={user.name} 
              className="w-full h-full object-cover" 
              data-testid="img-profile-avatar"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              data-testid="button-change-photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </button>
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
            <button 
              onClick={() => setShowShareQR(true)}
              className="p-2 rounded-2xl border border-primary bg-primary/10 hover:bg-primary/20 transition-colors"
              data-testid="button-share-profile"
            >
              <QrCode className="w-5 h-5 text-primary" />
            </button>
          </div>
          
          <button
            onClick={() => setShowShareQR(true)}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-colors"
            data-testid="button-share-profile-main"
          >
            <Share2 className="w-4 h-4" />
            Invita Amici
          </button>

          {user.bio && (
            <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground max-w-sm" data-testid="text-profile-bio">
              {user.bio}
            </p>
          )}

          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={() => openFollowModal("followers")}
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
              data-testid="button-followers"
            >
              <span className="text-2xl font-bold">{followStats.followersCount}</span>
              <span className="text-xs text-muted-foreground">Followers</span>
            </button>
            <div className="w-px h-8 bg-border" />
            <button
              onClick={() => openFollowModal("following")}
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
              data-testid="button-following"
            >
              <span className="text-2xl font-bold">{followStats.followingCount}</span>
              <span className="text-xs text-muted-foreground">Following</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full mt-8">
            <StatCard label="Countries" value={user.countriesVisited} icon={Globe} />
            <StatCard label="Cities" value={user.citiesVisited} icon={MapPin} />
            <StatCard label="Coworking" value={user.coworkingSpaces} icon={Award} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-6 py-3 bg-muted rounded-2xl font-bold hover:bg-muted/80 transition-colors"
              data-testid="button-toggle-theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {pushSupported && (
              <button
                onClick={async () => {
                  const success = pushSubscribed ? await unsubscribePush() : await subscribePush();
                  if (success) {
                    toast({ title: pushSubscribed ? "Notifiche disattivate" : "Notifiche attivate" });
                  } else {
                    toast({ title: "Errore", description: "Impossibile modificare le notifiche", variant: "destructive" });
                  }
                }}
                disabled={pushLoading}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors ${
                  pushSubscribed 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted hover:bg-muted/80"
                }`}
                data-testid="button-toggle-push"
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pushSubscribed ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                {pushSubscribed ? "Notifiche ON" : "Notifiche OFF"}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-2xl font-bold hover:bg-red-500/30 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

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
      
      {showShareQR && (
        <ShareQRModal
          open={showShareQR}
          onClose={() => setShowShareQR(false)}
          type="invite"
          id="auth"
          title="Unisciti a NomadLife!"
        />
      )}

      {showFollowModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFollowModal(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold capitalize">{showFollowModal}</h3>
              <button onClick={() => setShowFollowModal(null)} className="p-2 hover:bg-muted rounded-xl">
                <span className="sr-only">Chiudi</span>✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
              {loadingFollowList ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : followList.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {showFollowModal === "followers" ? "Nessun follower" : "Non segui nessuno"}
                </p>
              ) : (
                followList.map((item: any) => {
                  const u = showFollowModal === "followers" ? item.follower : item.following;
                  return (
                    <button
                      key={u.id}
                      onClick={() => { setShowFollowModal(null); setLocation(`/user/${u.id}`); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {u.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">@{u.username}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
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
