import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal, Loader2, Plus, Camera, X, Upload, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, User } from "@shared/schema";
import { CreatePostForm } from "@/components/CreatePostForm";

type PostWithUser = Post & { user: User };

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(() => {
    fetch("/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
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
        
        <CreatePostForm onPostCreated={fetchPosts} />
        
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
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<{name: string; img: string} | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [myStory, setMyStory] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const baseStories = [
    { id: 1, name: "Sarah", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", active: true },
    { id: 2, name: "Davide", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", active: true },
    { id: 3, name: "Elena", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop", active: false },
    { id: 4, name: "Marc", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop", active: false },
  ];

  const stories = myStory 
    ? [{ id: 0, name: "Your Story", img: myStory, active: true, isMyStory: true }, ...baseStories]
    : [{ id: 0, name: "Add Story", img: "add", active: false, isMyStory: false }, ...baseStories];

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const shareStory = () => {
    if (capturedPhoto) {
      setMyStory(capturedPhoto);
      setCapturedPhoto(null);
      setShowCameraModal(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setMyStory(dataUrl);
        setShowStoryModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = () => {
    setShowStoryModal(false);
    setShowCameraModal(true);
    setCapturedPhoto(null);
    setTimeout(startCamera, 100);
  };

  const closeCamera = () => {
    stopCamera();
    setCapturedPhoto(null);
    setShowCameraModal(false);
  };

  const handleStoryClick = (story: typeof stories[0]) => {
    if (story.id === 0 && !myStory) {
      setShowStoryModal(true);
    } else if (story.id === 0 && myStory) {
      setSelectedStory({ name: "Your Story", img: myStory });
    } else {
      setSelectedStory({ name: story.name, img: story.img });
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload}
        data-testid="input-file-upload"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {stories.map((story) => (
          <button 
            key={story.id} 
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
            onClick={() => handleStoryClick(story)}
            data-testid={story.id === 0 ? "button-add-story" : `story-${story.id}`}
          >
            <div className={`w-16 h-16 rounded-full p-[2px] ${story.active ? "bg-gradient-to-tr from-yellow-400 to-primary" : "bg-border"} hover:scale-105 transition-transform`}>
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden relative bg-muted">
                 {story.id === 0 && !myStory ? (
                   <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                     <Plus className="w-6 h-6" />
                   </div>
                 ) : story.id === 0 && myStory ? (
                   <img src={myStory} alt="Your story" className="w-full h-full object-cover" />
                 ) : (
                   <img src={story.img} alt={story.name} className="w-full h-full object-cover" />
                 )}
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{story.name}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showStoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowStoryModal(false)}
            data-testid="overlay-story-modal"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Create Story</h2>
              <div className="flex flex-col gap-3">
                <button 
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors" 
                  data-testid="button-take-photo"
                  onClick={openCamera}
                >
                  <Camera className="w-6 h-6 text-primary" />
                  <span>Take Photo</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors" 
                  data-testid="button-upload-gallery"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-primary" />
                  <span>Upload from Gallery</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">Stories disappear after 24 hours</p>
            </motion.div>
          </motion.div>
        )}

        {showCameraModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
            data-testid="overlay-camera-modal"
          >
            <div className="absolute top-4 left-4 z-10">
              <button 
                onClick={closeCamera}
                className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                data-testid="button-close-camera"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              {cameraError ? (
                <div className="text-center p-4">
                  <p className="text-red-400 mb-4">{cameraError}</p>
                  <button 
                    onClick={startCamera}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : capturedPhoto ? (
                <img src={capturedPhoto} alt="Captured" className="max-w-full max-h-full object-contain" />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="max-w-full max-h-full object-contain scale-x-[-1]"
                />
              )}
            </div>
            
            <div className="p-6 flex items-center justify-center gap-6">
              {capturedPhoto ? (
                <>
                  <button 
                    onClick={retakePhoto}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    data-testid="button-retake"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Retake
                  </button>
                  <button 
                    onClick={shareStory}
                    className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
                    data-testid="button-share-story"
                  >
                    Share Story
                  </button>
                </>
              ) : (
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                  data-testid="button-capture"
                >
                  <div className="w-16 h-16 rounded-full bg-white" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setSelectedStory(null)}
            data-testid="overlay-story-viewer"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative w-full h-full max-w-lg"
            >
              <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-10">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                  <img src={selectedStory.img} alt={selectedStory.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-bold">{selectedStory.name}</span>
              </div>
              <img src={selectedStory.img} alt={selectedStory.name} className="w-full h-full object-contain" />
              <p className="absolute bottom-4 left-4 right-4 text-white text-center text-sm">Tap to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
          <Link href={`/user/${post.user.id}`} data-testid={`link-avatar-${post.id}`}>
            <img 
              src={post.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
              alt={post.user.name} 
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
              data-testid={`avatar-${post.id}`}
            />
          </Link>
          <div>
            <Link 
              href={`/user/${post.user.id}`}
              className="text-sm font-bold leading-none cursor-pointer hover:text-primary transition-colors" 
              data-testid={`link-username-${post.id}`}
            >
              {post.user.name}
            </Link>
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
