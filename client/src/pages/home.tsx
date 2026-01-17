import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Post, User } from "@shared/schema";

type PostWithUser = Post & { user: User };

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: updatedPost.likes } : p))
        );
      }
    } catch (error) {
      console.error("Failed to like post:", error);
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

  return (
    <Layout>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 p-4 flex justify-between items-center">
        <h1 className="text-xl font-display font-bold">Feed</h1>
        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <span className="sr-only">Notifications</span>
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
        </button>
      </header>

      <div className="p-4 space-y-6">
        <StoryRail />
        
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start exploring!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={handleLike} />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

function StoryRail() {
  const stories = [
    { id: 0, name: "Add Story", img: "me", active: false },
    { id: 1, name: "Sarah", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", active: true },
    { id: 2, name: "Davide", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", active: true },
    { id: 3, name: "Elena", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop", active: false },
    { id: 4, name: "Marc", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop", active: false },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className={`w-16 h-16 rounded-full p-[2px] ${story.active ? "bg-gradient-to-tr from-yellow-400 to-primary" : "bg-border"}`}>
            <div className="w-full h-full rounded-full border-2 border-background overflow-hidden relative bg-muted">
               {story.id === 0 ? (
                 <div className="w-full h-full flex items-center justify-center bg-muted text-2xl font-light text-muted-foreground">+</div>
               ) : (
                 <img src={story.img} alt={story.name} className="w-full h-full object-cover" />
               )}
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{story.name}</span>
        </div>
      ))}
    </div>
  );
}

function PostCard({ post, onLike }: { post: PostWithUser; onLike: (id: string) => void }) {
  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      data-testid={`card-post-${post.id}`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt={post.user.name} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h3 className="text-sm font-bold leading-none" data-testid={`text-username-${post.id}`}>{post.user.name}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <span>{post.user.location}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {post.imageUrl && (
        <div className="aspect-[4/5] md:aspect-video w-full bg-muted relative">
          <img src={post.imageUrl} alt="Post content" className="w-full h-full object-cover" />
          {post.location && (
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {post.location}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <button 
            onClick={() => onLike(post.id)}
            className="flex items-center gap-1.5 text-foreground hover:text-red-500 transition-colors"
            data-testid={`button-like-${post.id}`}
          >
            <Heart className="w-6 h-6" />
            <span className="text-sm font-bold" data-testid={`text-likes-${post.id}`}>{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-bold">{post.commentsCount}</span>
          </button>
          <button className="ml-auto text-foreground hover:text-primary transition-colors">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-sm leading-relaxed" data-testid={`text-content-${post.id}`}>
          <span className="font-bold mr-2">{post.user.username}</span>
          {post.content}
        </p>
      </div>
    </motion.article>
  );
}
