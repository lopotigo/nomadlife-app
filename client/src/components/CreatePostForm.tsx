import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image, MapPin, Send, X, Loader2, Plane, ChevronDown, Link as LinkIcon, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpload } from "@/hooks/use-upload";
import { useI18n } from "@/lib/i18n";

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
}

function extractUrlFromText(text: string): string | null {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern);
  if (!matches) return null;
  const youtubeUrl = matches.find((u) => isYouTubeUrl(u));
  return youtubeUrl || matches[0];
}

function getYouTubeThumb(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

interface CreatePostFormProps {
  onPostCreated: () => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTripSelect, setShowTripSelect] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: myTrips = [] } = useQuery<any[]>({
    queryKey: ["/api/my-trips"],
    enabled: isExpanded,
  });

  const selectedTrip = myTrips.find((t: any) => t.id === selectedTripId);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setImageUrl(response.objectPath);
      toast({ title: "Foto caricata!", description: "La tua foto è pronta per la condivisione." });
    },
    onError: (error) => {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      let finalLinkUrl = linkUrl.trim() || null;
      let finalVideoUrl: string | null = null;

      if (!finalLinkUrl) {
        const extracted = extractUrlFromText(content);
        if (extracted) finalLinkUrl = extracted;
      }

      if (finalLinkUrl && isYouTubeUrl(finalLinkUrl)) {
        finalVideoUrl = finalLinkUrl;
        finalLinkUrl = null;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || null,
          videoUrl: finalVideoUrl,
          linkUrl: finalLinkUrl,
          location: location.trim() || null,
          tripId: selectedTripId || null,
        }),
      });

      if (res.ok) {
        setContent("");
        setLocation("");
        setImageUrl("");
        setLinkUrl("");
        setShowLinkInput(false);
        setSelectedTripId(null);
        setIsExpanded(false);
        toast({ title: "Post condiviso!", description: "Il tuo post è ora visibile a tutti." });
        onPostCreated();
      } else {
        throw new Error("Failed to create post");
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile condividere il post. Riprova.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const country = data.address?.country || "";
            setLocation(city && country ? `${city}, ${country}` : data.display_name?.split(",").slice(0, 2).join(",") || "");
          } catch {
            setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
          }
        },
        () => {
          toast({ title: "Accesso posizione negato", description: "Abilita l'accesso alla posizione o inseriscila manualmente.", variant: "destructive" });
        }
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-4 mb-6">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary font-bold">{user?.name?.charAt(0) || "?"}</span>
          )}
        </div>
        <div className="flex-1">
          <div 
            onClick={() => setIsExpanded(true)}
            className={`${!isExpanded ? "cursor-pointer" : ""}`}
          >
            <Textarea
              placeholder={t("post.placeholder") || "Condividi la tua esperienza nomade..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              className="min-h-[50px] border-none bg-transparent resize-none p-0 text-sm focus-visible:ring-0"
              data-testid="input-post-content"
            />
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 mt-3"
              >
                {imageUrl && (
                  <div className="relative rounded-xl overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Upload preview" 
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Caricamento... {progress}%</span>
                  </div>
                )}

                {showLinkInput && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Incolla link YouTube o URL..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="flex-1 h-8 text-xs border-none bg-muted/50"
                        data-testid="input-post-link"
                      />
                      <button
                        onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid="button-close-link-input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {linkUrl && isYouTubeUrl(linkUrl) && (
                      <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border">
                        <div className="flex items-center gap-3 p-2">
                          <img
                            src={getYouTubeThumb(linkUrl) || ""}
                            alt="YouTube"
                            className="w-24 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="text-xs font-semibold text-red-500">YouTube</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{linkUrl}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedTrip && (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
                    <Plane className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary flex-1">
                      {selectedTrip.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedTrip.startLocation} → {selectedTrip.endLocation}
                    </span>
                    <button onClick={() => setSelectedTripId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("post.add_location") || "Aggiungi posizione..."}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 h-8 text-xs border-none bg-muted/50"
                    data-testid="input-post-location"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGetLocation}
                    className="text-xs h-8"
                  >
                    Auto
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                        <Image className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium">Foto</span>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                        showLinkInput || linkUrl ? "bg-red-500/10 text-red-500" : "bg-muted hover:bg-muted/80"
                      }`}
                      data-testid="button-attach-link"
                    >
                      <Video className="w-4 h-4" />
                      <span className="text-xs font-medium">Video/Link</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTripSelect(!showTripSelect)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                          selectedTripId ? "bg-primary/10 text-primary" : "bg-muted hover:bg-muted/80"
                        }`}
                        data-testid="button-attach-trip"
                      >
                        <Plane className="w-4 h-4" />
                        <span className="text-xs font-medium">{t("post.trip") || "Viaggio"}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      <AnimatePresence>
                        {showTripSelect && myTrips.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                          >
                            <div className="p-2 border-b border-border">
                              <p className="text-xs font-medium text-muted-foreground">{t("post.select_trip") || "Seleziona un viaggio"}</p>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {myTrips.map((trip: any) => (
                                <button
                                  key={trip.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTripId(trip.id);
                                    setShowTripSelect(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${
                                    selectedTripId === trip.id ? "bg-primary/10" : ""
                                  }`}
                                  data-testid={`select-trip-${trip.id}`}
                                >
                                  <p className="text-sm font-medium truncate">{trip.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {trip.startLocation} → {trip.endLocation}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                        {showTripSelect && myTrips.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-lg p-3 z-50"
                          >
                            <p className="text-xs text-muted-foreground">{t("post.no_trips") || "Nessun viaggio. Creane uno nel Diario di Viaggio!"}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent("");
                        setLocation("");
                        setImageUrl("");
                        setLinkUrl("");
                        setShowLinkInput(false);
                        setSelectedTripId(null);
                        setShowTripSelect(false);
                      }}
                    >
                      {t("common.cancel") || "Annulla"}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!content.trim() || isSubmitting || isUploading}
                      size="sm"
                      className="gap-1"
                      data-testid="button-share-post"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t("post.share") || "Condividi"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
