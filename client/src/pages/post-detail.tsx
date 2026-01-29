import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import Layout from "@/components/layout";
import { Heart, MessageCircle, MapPin, ArrowLeft, Share2, Calendar, Video, Link as LinkIcon, Plane, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQRModal } from "@/components/share-qr-modal";
import { Input } from "@/components/ui/input";
import type { Post, User, Comment } from "@shared/schema";

type PostWithUser = Post & { user: User };
type CommentWithUser = Comment & { user: User };

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) return;
      try {
        const [postRes, commentsRes, userRes] = await Promise.all([
          fetch(`/api/posts/${params.id}`, { credentials: "include" }),
          fetch(`/api/posts/${params.id}/comments`, { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" })
        ]);
        if (postRes.ok) setPost(await postRes.json());
        if (commentsRes.ok) setComments(await commentsRes.json());
        if (userRes.ok) setCurrentUser(await userRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params?.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !post) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const comment = await res.json();
        const commentsRes = await fetch(`/api/posts/${post.id}/comments`, { credentials: "include" });
        if (commentsRes.ok) setComments(await commentsRes.json());
        setNewComment("");
        setPost({ ...post, commentsCount: post.commentsCount + 1 });
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
        if (post) setPost({ ...post, commentsCount: Math.max(0, post.commentsCount - 1) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <h1 className="text-2xl font-bold mb-2">Post non trovato</h1>
          <p className="text-muted-foreground mb-4">Il post che stai cercando non esiste.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla mappa
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)} data-testid="button-share-post">
            <Share2 className="w-4 h-4 mr-2" />
            Condividi
          </Button>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <img
                src={post.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.username}`}
                className="w-12 h-12 rounded-full"
                alt={post.user.name}
              />
              <div>
                <p className="font-bold">{post.user.name}</p>
                <p className="text-sm text-muted-foreground">@{post.user.username}</p>
              </div>
            </div>
          </div>

          {post.imageUrl && (
            <img src={post.imageUrl} className="w-full aspect-video object-cover" alt="" />
          )}

          {post.videoUrl && (
            <video src={post.videoUrl} controls className="w-full aspect-video object-cover" />
          )}

          <div className="p-4">
            <p className="text-lg mb-4">{post.content}</p>

            {post.linkUrl && (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-muted rounded-xl mb-4 hover:bg-muted/80 transition-colors"
              >
                <LinkIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-500 truncate">{post.linkUrl}</span>
              </a>
            )}

            {post.tripId && (
              <Link href={`/trip/${post.tripId}`}>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl mb-4 cursor-pointer hover:bg-green-500/20 transition-colors">
                  <Plane className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">Visualizza il viaggio collegato</span>
                </div>
              </Link>
            )}

            <div className="flex items-center gap-4 text-muted-foreground">
              {post.location && (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="w-4 h-4" />
                  {post.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm">
                <Calendar className="w-4 h-4" />
                {new Date(post.createdAt).toLocaleDateString("it-IT")}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="font-semibold">{post.likes}</span>
              </span>
              <span className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">{post.commentsCount}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Commenti ({comments.length})
            </h3>
          </div>

          {currentUser && (
            <form onSubmit={handleSubmitComment} className="p-4 border-b border-border">
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  className="flex-1"
                  data-testid="input-comment"
                />
                <Button type="submit" disabled={submitting || !newComment.trim()} data-testid="button-submit-comment">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          <div className="divide-y divide-border">
            {comments.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Nessun commento ancora. Sii il primo a commentare!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-4" data-testid={`comment-${comment.id}`}>
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                      className="w-8 h-8 rounded-full"
                      alt={comment.user.name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{comment.user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString("it-IT")}
                        </span>
                        {currentUser?.id === comment.userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="ml-auto text-red-500 hover:text-red-600 p-1"
                            data-testid={`button-delete-comment-${comment.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showShare && (
        <ShareQRModal
          open={showShare}
          onClose={() => setShowShare(false)}
          type="post"
          id={post.id}
          title={post.content.substring(0, 50) + "..."}
        />
      )}
    </Layout>
  );
}
