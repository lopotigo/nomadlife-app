import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Wifi, Volume2, DollarSign, Sparkles, Loader2, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface PlaceReview {
  id: string;
  placeId: string;
  userId: string;
  wifiRating: number;
  noiseRating: number;
  priceRating: number;
  cleanRating: number;
  overallRating: number;
  comment: string | null;
  createdAt: string;
  user: User;
}

interface PlaceRatings {
  wifi: number;
  noise: number;
  price: number;
  clean: number;
  overall: number;
  count: number;
}

interface PlaceReviewsProps {
  placeId: string;
  currentUserId?: string;
}

function RatingStars({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`w-4 h-4 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, icon: Icon, value, color }: { label: string; icon: any; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs text-slate-400 w-16">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace("text-", "bg-")} rounded-full`} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-8">{value.toFixed(1)}</span>
    </div>
  );
}

export function PlaceReviews({ placeId, currentUserId }: PlaceReviewsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    wifiRating: 0,
    noiseRating: 0,
    priceRating: 0,
    cleanRating: 0,
    overallRating: 0,
    comment: "",
  });

  const { data: ratings, isLoading: ratingsLoading } = useQuery<PlaceRatings>({
    queryKey: ["place-ratings", placeId],
    queryFn: async () => {
      const res = await fetch(`/api/places/${placeId}/ratings`);
      if (!res.ok) throw new Error("Failed to fetch ratings");
      return res.json();
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<PlaceReview[]>({
    queryKey: ["place-reviews", placeId],
    queryFn: async () => {
      const res = await fetch(`/api/places/${placeId}/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/places/${placeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place-reviews", placeId] });
      queryClient.invalidateQueries({ queryKey: ["place-ratings", placeId] });
      setShowForm(false);
      setFormData({ wifiRating: 0, noiseRating: 0, priceRating: 0, cleanRating: 0, overallRating: 0, comment: "" });
      toast({ title: "Recensione aggiunta!" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la recensione", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete review");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place-reviews", placeId] });
      queryClient.invalidateQueries({ queryKey: ["place-ratings", placeId] });
      toast({ title: "Recensione eliminata" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).slice(0, 5).some(v => v === 0)) {
      toast({ title: "Completa tutti i rating", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const isLoading = ratingsLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Recensioni ({ratings?.count || 0})
        </h3>
        {currentUserId && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="text-xs border-slate-600"
            data-testid="button-add-review"
          >
            Aggiungi recensione
          </Button>
        )}
      </div>

      {ratings && ratings.count > 0 && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
          <RatingBar label="WiFi" icon={Wifi} value={ratings.wifi} color="text-blue-400" />
          <RatingBar label="Silenzio" icon={Volume2} value={ratings.noise} color="text-green-400" />
          <RatingBar label="Prezzo" icon={DollarSign} value={ratings.price} color="text-yellow-400" />
          <RatingBar label="Pulizia" icon={Sparkles} value={ratings.clean} color="text-purple-400" />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Wifi className="w-3 h-3" /> WiFi
              </label>
              <RatingStars value={formData.wifiRating} onChange={(v) => setFormData(p => ({ ...p, wifiRating: v }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Volume2 className="w-3 h-3" /> Silenzio
              </label>
              <RatingStars value={formData.noiseRating} onChange={(v) => setFormData(p => ({ ...p, noiseRating: v }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3" /> Prezzo
              </label>
              <RatingStars value={formData.priceRating} onChange={(v) => setFormData(p => ({ ...p, priceRating: v }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3" /> Pulizia
              </label>
              <RatingStars value={formData.cleanRating} onChange={(v) => setFormData(p => ({ ...p, cleanRating: v }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Star className="w-3 h-3" /> Valutazione complessiva
            </label>
            <RatingStars value={formData.overallRating} onChange={(v) => setFormData(p => ({ ...p, overallRating: v }))} />
          </div>
          <Textarea
            placeholder="Scrivi un commento (opzionale)..."
            value={formData.comment}
            onChange={(e) => setFormData(p => ({ ...p, comment: e.target.value }))}
            className="bg-slate-700 border-slate-600 text-white text-sm resize-none"
            rows={2}
            data-testid="input-review-comment"
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-slate-400">
              Annulla
            </Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-teal-500 hover:bg-teal-600" data-testid="button-submit-review">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Invia</>}
            </Button>
          </div>
        </form>
      )}

      {reviews && reviews.length > 0 && (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="bg-slate-800/50 rounded-xl p-3" data-testid={`review-${review.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={review.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user.username}`}
                    className="w-8 h-8 rounded-full object-cover"
                    alt=""
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{review.user.name}</p>
                    <div className="flex items-center gap-1">
                      <RatingStars value={review.overallRating} readonly />
                      <span className="text-xs text-slate-500 ml-1">
                        {new Date(review.createdAt).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                  </div>
                </div>
                {currentUserId === review.userId && (
                  <button
                    onClick={() => deleteMutation.mutate(review.id)}
                    className="p-1 text-slate-500 hover:text-red-400"
                    data-testid={`button-delete-review-${review.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {review.comment && (
                <p className="text-sm text-slate-400 mt-2">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {(!reviews || reviews.length === 0) && !showForm && (
        <p className="text-sm text-slate-500 text-center py-2">Nessuna recensione ancora. Sii il primo!</p>
      )}
    </div>
  );
}
