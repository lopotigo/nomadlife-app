import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal, Loader2, Plus, Camera, X, Upload, RotateCcw, Send, Trash2, Navigation, Wallet, Route, Calendar, Users, MapPinned, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post, User, Comment, Trip, TripStop, TripExpense, Event } from "@shared/schema";
import { CreatePostForm } from "@/components/CreatePostForm";
import { QRCodeSVG } from "qrcode.react";

type PostWithUser = Post & { user: User };
type CommentWithUser = Comment & { user: User };
type LiveTrip = Trip & { user: User; stops: (TripStop & { expenses: TripExpense[] })[] };
type EventWithHost = Event & { host: User };
type PublicTrip = Trip & { user: User; stops: TripStop[] };

type FeedItem = 
  | { type: "post"; data: PostWithUser; createdAt: Date }
  | { type: "event"; data: EventWithHost; createdAt: Date }
  | { type: "trip"; data: PublicTrip; createdAt: Date };

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [events, setEvents] = useState<EventWithHost[]>([]);
  const [publicTrips, setPublicTrips] = useState<PublicTrip[]>([]);
  const [liveTrips, setLiveTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(() => {
    fetch("/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchEvents = useCallback(() => {
    fetch("/api/events", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(console.error);
  }, []);

  const fetchPublicTrips = useCallback(() => {
    fetch("/api/trips/public", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setPublicTrips(data);
      })
      .catch(console.error);
  }, []);

  const fetchLiveTrips = useCallback(() => {
    fetch("/api/trips/live", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setLiveTrips(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetchPosts();
    fetchEvents();
    fetchPublicTrips();
    fetchLiveTrips();
  }, [user, authLoading, setLocation, fetchPosts, fetchEvents, fetchPublicTrips, fetchLiveTrips]);

  const feedItems: FeedItem[] = [
    ...posts.map((p) => ({ type: "post" as const, data: p, createdAt: new Date(p.createdAt) })),
    ...events.map((e) => ({ type: "event" as const, data: e, createdAt: new Date(e.createdAt) })),
    ...publicTrips.map((t) => ({ type: "trip" as const, data: t, createdAt: new Date(t.createdAt) })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
        
        {liveTrips.length > 0 && <LiveTripsSection trips={liveTrips} />}
        
        <CreatePostForm onPostCreated={fetchPosts} />
        
        <div className="space-y-6">
          {feedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start exploring!</p>
            </div>
          ) : (
            feedItems.map((item) => {
              if (item.type === "post") {
                return <PostCard key={`post-${item.data.id}`} post={item.data} onLike={handleLike} currentUser={user} />;
              }
              if (item.type === "event") {
                return <EventManifestoCard key={`event-${item.data.id}`} event={item.data} />;
              }
              if (item.type === "trip") {
                return <TripFeedCard key={`trip-${item.data.id}`} trip={item.data} />;
              }
              return null;
            })
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

function PostCard({ post, onLike, currentUser }: { post: PostWithUser; onLike: (id: string) => void; currentUser: User | null }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        await fetchComments();
        setNewComment("");
        setCommentsCount(c => c + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setCommentsCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

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
          <button 
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
            data-testid={`button-comments-${post.id}`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-bold">{commentsCount}</span>
          </button>
          {currentUser && post.user.id !== currentUser.id && (
            <Link href={`/chat?user=${post.user.id}`}>
              <button 
                className="text-foreground hover:text-violet-500 transition-colors"
                data-testid={`button-dm-${post.id}`}
                title={`Messaggio a ${post.user.name}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </Link>
          )}
          <button className="ml-auto text-foreground hover:text-primary transition-colors">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-sm leading-relaxed" data-testid={`text-content-${post.id}`}>
          <span className="font-bold mr-2">{post.user.username}</span>
          {post.content}
        </p>

        {post.tripId && (
          <Link href={`/trip/${post.tripId}`}>
            <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors" data-testid={`trip-badge-${post.id}`}>
              <Plane className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Viaggio allegato - clicca per vedere</span>
            </div>
          </Link>
        )}

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-border overflow-hidden"
            >
              {currentUser && (
                <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Scrivi un commento..."
                    className="flex-1 bg-muted rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid={`input-comment-${post.id}`}
                  />
                  <button 
                    type="submit" 
                    disabled={submitting || !newComment.trim()}
                    className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50"
                    data-testid={`button-submit-comment-${post.id}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Nessun commento ancora</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2" data-testid={`feed-comment-${comment.id}`}>
                      <img
                        src={comment.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                        className="w-7 h-7 rounded-full"
                        alt={comment.user.name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold mr-1">{comment.user.username}</span>
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(comment.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {currentUser?.id === comment.userId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-600 p-1"
                          data-testid={`button-delete-feed-comment-${comment.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function LiveTripsSection({ trips }: { trips: LiveTrip[] }) {
  const calculateTotalExpenses = (trip: LiveTrip) => {
    return trip.stops.reduce((total, stop) => {
      return total + stop.expenses.reduce((sum, exp) => sum + exp.cost, 0);
    }, 0) / 100;
  };

  const getLastStop = (trip: LiveTrip) => {
    const stopsWithCoords = trip.stops.filter(s => s.latitude && s.longitude);
    return stopsWithCoords[stopsWithCoords.length - 1];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="w-5 h-5 text-emerald-500 animate-pulse" />
        <h2 className="font-semibold text-lg">Viaggi Live</h2>
        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
          {trips.length} in corso
        </span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {trips.map((trip) => {
          const lastStop = getLastStop(trip);
          const totalExpenses = calculateTotalExpenses(trip);
          
          return (
            <Link key={trip.id} href={`/trip/${trip.id}`}>
              <motion.div 
                className="flex-shrink-0 w-64 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 cursor-pointer hover:border-emerald-400/50 transition-colors"
                whileHover={{ scale: 1.02 }}
                data-testid={`live-trip-card-${trip.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    {trip.user.avatar ? (
                      <img 
                        src={trip.user.avatar} 
                        alt={trip.user.name || trip.user.username} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border-2 border-emerald-500">
                        <span className="text-sm font-bold">{(trip.user.name || trip.user.username || 'N')[0]}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{trip.user.name || trip.user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
                  </div>
                </div>
                
                {lastStop && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{lastStop.city}, {lastStop.country}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Route className="w-3.5 h-3.5" />
                    <span>{trip.stops.length} tappe</span>
                  </div>
                  {totalExpenses > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>€{totalExpenses.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EventManifestoCard({ event }: { event: EventWithHost }) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("it-IT", { 
      weekday: "long",
      day: "numeric", 
      month: "long",
      year: "numeric"
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const shareUrl = `${window.location.origin}/event/${event.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-xl"
      data-testid={`event-manifesto-${event.id}`}
    >
      <div className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-6 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/20 blur-xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Evento</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <QRCodeSVG value={shareUrl} size={60} bgColor="transparent" fgColor="white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
          
          {event.description && (
            <p className="text-sm opacity-80 mb-4 line-clamp-2">{event.description}</p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-70" />
              <span className="text-sm">{formatDate(event.startDate)}</span>
              <span className="text-sm opacity-70">ore {formatTime(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 opacity-70" />
              <span className="text-sm">{event.city}, {event.country}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPinned className="w-4 h-4 opacity-70" />
                <span className="text-sm opacity-80">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 opacity-70" />
              <span className="text-sm">{event.attendees} partecipanti</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="font-bold">
                {(event.price ?? 0) > 0 ? `€${event.price}` : "Gratis"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {event.host?.avatar ? (
              <img src={event.host.avatar} alt={event.host.name || ""} className="w-8 h-8 rounded-full border-2 border-white/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
                {(event.host?.name || event.host?.username || "?")[0]}
              </div>
            )}
            <span className="text-sm">Organizzato da <strong>{event.host?.name || event.host?.username}</strong></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TripFeedCard({ trip }: { trip: PublicTrip }) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const stops = trip.stops || [];
  const cities = stops.map(s => s.city).filter(Boolean);
  const countries = Array.from(new Set(stops.map(s => s.country).filter(Boolean)));
  
  const tripDays = stops.length > 1 
    ? Math.ceil((new Date(stops[stops.length - 1].arrivalDate).getTime() - new Date(stops[0].arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  const coverImage = stops.find(s => s.imageUrl)?.imageUrl;

  return (
    <Link href={`/trip/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/40 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
        data-testid={`trip-feed-card-${trip.id}`}
      >
        {coverImage && (
          <div className="h-40 overflow-hidden">
            <img src={coverImage} alt={trip.title} className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {trip.user?.avatar ? (
              <img src={trip.user.avatar} alt={trip.user.name || ""} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold">{(trip.user?.name || trip.user?.username || "?")[0]}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-sm">{trip.user?.name || trip.user?.username}</p>
              <p className="text-xs text-muted-foreground">ha condiviso un viaggio</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-2">{trip.title}</h3>
          
          {trip.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{trip.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {cities.slice(0, 4).map((city, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                <MapPin className="w-3 h-3" />
                {city}
              </span>
            ))}
            {cities.length > 4 && (
              <span className="px-2 py-1 bg-muted rounded-full text-xs">+{cities.length - 4}</span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Route className="w-4 h-4" />
                {stops.length} tappe
              </span>
              <span>{tripDays} giorni</span>
            </div>
            {countries.length > 0 && (
              <span className="text-xs">{countries.join(", ")}</span>
            )}
          </div>

          {stops.length > 1 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{stops[0].city}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent relative">
                  {stops.slice(1, -1).map((_, i) => (
                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" style={{ left: `${((i + 1) / stops.length) * 100}%` }} />
                  ))}
                </div>
                <span className="font-medium">{stops[stops.length - 1].city}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
