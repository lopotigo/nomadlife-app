import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Heart, MessageCircle, MapPin, Loader2, Home, Compass, Building2, MessageSquare, User, Crown, Plus, X, Send, Image, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, User as UserType, ChatGroup, Message } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import "leaflet/dist/leaflet.css";

type PostWithUser = Post & { user: UserType };

const defaultCenter: [number, number] = [20, 0];
const defaultZoom = 2;

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createPostMarkerIcon(imageUrl: string | null) {
  const safeUrl = imageUrl ? escapeHtml(imageUrl) : null;
  const html = safeUrl 
    ? `<div class="post-marker"><img src="${safeUrl}" alt="post" /></div>`
    : `<div class="post-marker post-marker-text"><span>📍</span></div>`;
  
  return L.divIcon({
    html,
    className: "custom-post-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

export default function MapFeed() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostWithUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyNomads, setNearbyNomads] = useState<UserType[]>([]);

  const fetchPosts = useCallback(() => {
    fetch("/api/posts?limit=100", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        const users = data.map((p: PostWithUser) => p.user);
        const uniqueUsers = users.filter((u: UserType, i: number, arr: UserType[]) => 
          arr.findIndex((x) => x.id === u.id) === i
        );
        setNearbyNomads(uniqueUsers.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }
    fetchPosts();
  }, [user, authLoading, setLocation, fetchPosts]);

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: updatedPost.likes } : p)));
        if (selectedPost?.id === postId) {
          setSelectedPost((prev) => prev ? { ...prev, likes: updatedPost.likes } : null);
        }
      }
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setClickedCoords({ lat, lng });
    setShowCreateForm(true);
  };

  const postsWithCoords = posts.filter((p) => p.latitude != null && p.longitude != null);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" data-testid="loader-main" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden">
      <style>{`
        .custom-post-marker { background: transparent; border: none; }
        .post-marker {
          width: 48px; height: 48px; border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #14b8a6, #0891b2);
          border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          overflow: hidden; transform: rotate(-45deg);
        }
        .post-marker img {
          width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg) scale(1.4);
        }
        .post-marker-text {
          display: flex; align-items: center; justify-content: center;
        }
        .post-marker-text span { transform: rotate(45deg); font-size: 20px; }
        .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-radius: 16px; }
        .leaflet-popup-tip { background: #1e293b; }
        .leaflet-popup-close-button { color: white !important; }
      `}</style>

      <nav className="fixed bottom-0 left-0 right-0 z-[1001] bg-slate-900 border-t border-slate-800 flex justify-around py-2 md:hidden">
        {[
          { icon: Home, label: "Feed", path: "/" },
          { icon: Compass, label: "Explore", path: "/explore" },
          { icon: Building2, label: "Coworking", path: "/coworking" },
          { icon: MessageSquare, label: "Chat", path: "/chat" },
          { icon: User, label: "Profile", path: "/profile" },
        ].map((item) => (
          <Link key={item.path} href={item.path}>
            <div className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-teal-400 transition-colors" data-testid={`mobile-nav-${item.label.toLowerCase()}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="flex h-full pb-16 md:pb-0">
        <aside className="hidden md:flex w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex-col p-4 shrink-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <span className="text-xl">🌍</span>
            </div>
            <h1 className="hidden lg:block text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">NomadLife</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { icon: Home, label: "Feed", path: "/", active: true },
              { icon: Compass, label: "Explore", path: "/explore" },
              { icon: Building2, label: "Coworking", path: "/coworking" },
              { icon: MessageSquare, label: "Chat", path: "/chat" },
              { icon: User, label: "Profile", path: "/profile" },
              { icon: Crown, label: "Premium", path: "/subscription" },
            ].map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer ${
                    item.active ? "bg-teal-500/20 text-teal-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-teal-400 font-bold">
                    {user?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="hidden lg:block mt-3 w-full text-sm text-slate-500 hover:text-white transition-colors"
              data-testid="button-logout"
            >
              Log out
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="relative h-1/2 min-h-[300px]">
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              className="w-full h-full"
              zoomControl={false}
              style={{ background: "#0f172a" }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              <MapEvents onMapClick={handleMapClick} />

              {postsWithCoords.map((post) => (
                <Marker
                  key={post.id}
                  position={[post.latitude!, post.longitude!]}
                  icon={createPostMarkerIcon(post.imageUrl)}
                  eventHandlers={{ click: () => setSelectedPost(post) }}
                />
              ))}
            </MapContainer>

            <button
              onClick={() => {
                setClickedCoords(null);
                setShowCreateForm(true);
              }}
              className="absolute bottom-4 right-4 z-[1000] w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              data-testid="button-new-post"
            >
              <Plus className="w-5 h-5" />
            </button>

            <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700">
              <p className="text-xs text-slate-300">
                <span className="text-teal-400 font-bold">{postsWithCoords.length}</span> posts on map
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>📍</span> Latest Posts
            </h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                  data-testid={`feed-post-${post.id}`}
                >
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="Post" className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                        {post.user.avatar ? (
                          <img src={post.user.avatar} alt={post.user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-teal-400 text-xs font-bold">
                            {post.user.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.user.name}</p>
                        {post.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {post.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post.commentsCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <ProfilesSidebar />
      </div>

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
            onClick={() => setSelectedPost(null)}
            data-testid="overlay-post-detail"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPost.imageUrl && (
                <img src={selectedPost.imageUrl} alt="Post" className="w-full aspect-video object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                    {selectedPost.user.avatar ? (
                      <img src={selectedPost.user.avatar} alt={selectedPost.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-teal-400 font-bold">
                        {selectedPost.user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{selectedPost.user.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedPost.location || "Unknown location"}
                    </p>
                  </div>
                </div>
                <p className="text-slate-300 mb-4">{selectedPost.content}</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(selectedPost.id)}
                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors"
                    data-testid="button-like-detail"
                  >
                    <Heart className="w-5 h-5" />
                    <span>{selectedPost.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>{selectedPost.commentsCount}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCreateForm && (
          <CreatePostModal
            key={clickedCoords ? `${clickedCoords.lat}-${clickedCoords.lng}` : 'no-coords'}
            coords={clickedCoords}
            onClose={() => {
              setShowCreateForm(false);
              setClickedCoords(null);
            }}
            onPostCreated={() => {
              fetchPosts();
              setShowCreateForm(false);
              setClickedCoords(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const nomadProfiles = [
  {
    id: "1",
    name: "Sofia Martinez",
    username: "sofiatravels",
    location: "Bali, Indonesia",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    bio: "Digital marketer exploring Southeast Asia",
    countriesVisited: 23,
    isOnline: true,
  },
  {
    id: "2",
    name: "James Chen",
    username: "jamesdigital",
    location: "Lisbon, Portugal",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    bio: "Full-stack developer & coffee enthusiast",
    countriesVisited: 31,
    isOnline: true,
  },
  {
    id: "3",
    name: "Emma Wilson",
    username: "emmawanders",
    location: "Chiang Mai, Thailand",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    bio: "UX designer living the remote life",
    countriesVisited: 18,
    isOnline: false,
  },
  {
    id: "4",
    name: "Lucas Silva",
    username: "lucascode",
    location: "Barcelona, Spain",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    bio: "Startup founder, surfing when not coding",
    countriesVisited: 27,
    isOnline: true,
  },
  {
    id: "5",
    name: "Mia Anderson",
    username: "mianomad",
    location: "Mexico City, Mexico",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    bio: "Content creator & travel photographer",
    countriesVisited: 42,
    isOnline: false,
  },
  {
    id: "6",
    name: "Alex Kowalski",
    username: "alexremote",
    location: "Berlin, Germany",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    bio: "Product manager working across time zones",
    countriesVisited: 15,
    isOnline: true,
  },
];

function ProfilesSidebar() {
  const [, setLocation] = useLocation();

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 hidden xl:flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-400" /> Nearby Nomads
        </h2>
        <p className="text-xs text-slate-500 mt-1">Connect with fellow travelers</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {nomadProfiles.map((profile) => (
          <div
            key={profile.id}
            className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-all hover:scale-[1.02]"
            data-testid={`profile-card-${profile.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                />
                {profile.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{profile.name}</p>
                  {profile.isOnline && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">Online</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">@{profile.username}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-teal-400" /> {profile.location}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{profile.bio}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">
                <span className="text-teal-400 font-semibold">{profile.countriesVisited}</span> countries
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                onClick={() => setLocation("/chat")}
                data-testid={`button-message-${profile.id}`}
              >
                <MessageCircle className="w-3 h-3 mr-1" /> Message
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800">
        <Button 
          variant="outline" 
          className="w-full border-slate-700 text-slate-400 hover:text-white hover:border-teal-500"
          onClick={() => setLocation("/chat")}
          data-testid="button-view-all-nomads"
        >
          <Users className="w-4 h-4 mr-2" /> View All Nomads
        </Button>
      </div>
    </aside>
  );
}

function CreatePostModal({
  coords,
  onClose,
  onPostCreated,
}: {
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onPostCreated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(coords?.lat ?? null);
  const [longitude, setLongitude] = useState<number | null>(coords?.lng ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setImageUrl(response.objectPath);
      toast({ title: "Photo uploaded!" });
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const country = data.address?.country || "";
          setLocation(city && country ? `${city}, ${country}` : data.display_name?.split(",").slice(0, 2).join(",") || "");
        })
        .catch(() => {});
    }
  }, [coords]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const country = data.address?.country || "";
          setLocation(city && country ? `${city}, ${country}` : "");
        } catch {}
        setGettingLocation(false);
      },
      () => {
        toast({ title: "Location access denied", variant: "destructive" });
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || null,
          location: location.trim() || null,
          latitude,
          longitude,
        }),
      });
      if (res.ok) {
        toast({ title: "Post shared!" });
        onPostCreated();
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Error", description: "Failed to share post", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="overlay-create-post"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Post</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white" data-testid="button-close-create">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Textarea
          placeholder="Share your experience..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-slate-800 border-slate-700 mb-4 min-h-[100px]"
          data-testid="input-new-post-content"
        />

        {imageUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover" />
            <button
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isUploading && (
          <div className="mb-4 text-sm text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading... {progress}%
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-slate-500" />
          <Input
            placeholder="Location name"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 bg-slate-800 border-slate-700"
            data-testid="input-new-post-location"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={gettingLocation}
            className="border-slate-700 text-slate-300"
          >
            {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto"}
          </Button>
        </div>

        {latitude && longitude ? (
          <p className="text-xs text-teal-400 mb-4">
            📍 Your post will appear on the map at: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        ) : (
          <p className="text-xs text-amber-400 mb-4">
            ⚠️ Click "Auto" or tap the map to add location - without coordinates your post won't show on the map
          </p>
        )}

        <div className="flex items-center justify-between">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
              <Image className="w-4 h-4 text-teal-400" />
              <span className="text-sm">Photo</span>
            </div>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || isUploading || !latitude || !longitude}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50"
            data-testid="button-submit-new-post"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Share</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
