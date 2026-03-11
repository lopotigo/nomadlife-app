import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import Layout from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";
import { Heart, MessageCircle, MapPin, ArrowLeft, Share2, Calendar, Users, Send, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareQRModal, handleShare } from "@/components/share-qr-modal";
import { Input } from "@/components/ui/input";
import type { Event, User } from "@shared/schema";

type EventWithHost = Event & { host?: User };
type EventCommentWithUser = { id: string; eventId: string; userId: string; content: string; createdAt: Date; user: User };

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function EventDetail() {
  usePageTitle("Evento");
  const [, params] = useRoute("/event/:id");
  const [event, setEvent] = useState<EventWithHost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState<EventCommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) return;
      try {
        const [eventRes, commentsRes, userRes, likedRes] = await Promise.all([
          fetch(`/api/events/${params.id}`, { credentials: "include" }),
          fetch(`/api/events/${params.id}/comments`, { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
          fetch(`/api/events/${params.id}/liked`, { credentials: "include" })
        ]);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData);
          setLikes(eventData.likes || 0);
        }
        if (commentsRes.ok) setComments(await commentsRes.json());
        if (userRes.ok) setCurrentUser(await userRes.json());
        if (likedRes.ok) {
          const likedData = await likedRes.json();
          setLiked(likedData.liked);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params?.id]);

  const handleLike = async () => {
    if (!currentUser || !event) return;
    try {
      if (liked) {
        await fetch(`/api/events/${event.id}/like`, { method: "DELETE", credentials: "include" });
        setLikes(l => Math.max(0, l - 1));
        setLiked(false);
      } else {
        await fetch(`/api/events/${event.id}/like`, { method: "POST", credentials: "include" });
        setLikes(l => l + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !event) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const commentsRes = await fetch(`/api/events/${event.id}/comments`, { credentials: "include" });
        if (commentsRes.ok) setComments(await commentsRes.json());
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!event) return;
    try {
      const res = await fetch(`/api/events/${event.id}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <h1 className="text-2xl font-bold mb-2">Evento non trovato</h1>
          <p className="text-muted-foreground mb-4">L'evento che stai cercando non esiste.</p>
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

  const eventColor = event.color || "#a855f7";

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
          <Button variant="outline" size="sm" onClick={() => handleShare("event", event.id, event.title, () => setShowShare(true))} data-testid="button-share-event">
            <Share2 className="w-4 h-4 mr-2" />
            Condividi
          </Button>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg">
          <div 
            className="p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${eventColor}, ${adjustColor(eventColor, -30)})` }}
          >
            {event.imageUrl && (
              <img src={event.imageUrl} className="w-full h-48 object-cover rounded-xl mb-4" alt={event.title} />
            )}

            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 opacity-70" />
              <span className="text-sm opacity-90">Evento</span>
            </div>

            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            
            {event.description && (
              <p className="opacity-90 mb-4">{event.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 opacity-70" />
                <span>{formatDate(event.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-70" />
                <span>Ore {formatTime(event.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 opacity-70" />
                <span>{event.city}, {event.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 opacity-70" />
                <span>{event.attendees} partecipanti</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/20">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="font-bold text-lg">
                  {(event.price ?? 0) > 0 ? `€${event.price}` : "Gratis"}
                </span>
              </div>
              
              {event.host && (
                <Link href={`/user/${event.hostId}`}>
                  <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {event.host.avatar ? (
                      <img src={event.host.avatar} alt={event.host.name || ""} className="w-8 h-8 rounded-full border-2 border-white/50" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold">
                        {(event.host.name || event.host.username || "?")[0]}
                      </div>
                    )}
                    <span className="text-sm">Organizzato da <strong>{event.host.name || event.host.username}</strong></span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-card p-4">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
                data-testid="button-like-event"
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-red-500' : ''}`} />
                <span className="font-semibold">{likes}</span>
              </button>
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="w-6 h-6" />
                <span className="font-semibold">{comments.length}</span>
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
                  data-testid="input-event-comment"
                />
                <Button type="submit" disabled={submitting || !newComment.trim()} data-testid="button-submit-event-comment">
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
                <div key={comment.id} className="p-4" data-testid={`event-comment-${comment.id}`}>
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
                            data-testid={`button-delete-event-comment-${comment.id}`}
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
          type="event"
          id={event.id}
          title={event.title}
        />
      )}
    </Layout>
  );
}
