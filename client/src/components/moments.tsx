import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Heart, Eye, MapPin, Send, Camera, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { Moment, User } from "@shared/schema";

type MomentWithUser = Moment & { user: User };

interface GroupedMoments {
  user: User;
  moments: MomentWithUser[];
  hasUnviewed?: boolean;
}

export function MomentsBar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [moments, setMoments] = useState<MomentWithUser[]>([]);
  const [viewingGroup, setViewingGroup] = useState<GroupedMoments | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMoments = useCallback(async () => {
    try {
      const res = await fetch("/api/moments", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMoments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch moments:", e);
    }
  }, []);

  useEffect(() => {
    fetchMoments();
    const interval = setInterval(fetchMoments, 60000);
    return () => clearInterval(interval);
  }, [fetchMoments]);

  const grouped: GroupedMoments[] = [];
  moments.forEach((m) => {
    const existing = grouped.find((g) => g.user.id === m.user.id);
    if (existing) {
      existing.moments.push(m);
    } else {
      grouped.push({ user: m.user, moments: [m] });
    }
  });

  if (user) {
    const myGroup = grouped.find((g) => g.user.id === user.id);
    if (myGroup) {
      grouped.splice(grouped.indexOf(myGroup), 1);
      grouped.unshift(myGroup);
    }
  }

  return (
    <>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          data-testid="moments-bar"
        >
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
              data-testid="button-create-moment"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center relative">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-900" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-bold text-emerald-700">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-16 text-center">
                {t("moments.your_moment") || "Il tuo momento"}
              </span>
            </button>
          )}

          {grouped.map((group) => (
            <button
              key={group.user.id}
              onClick={() => setViewingGroup(group)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
              data-testid={`moment-avatar-${group.user.id}`}
            >
              <div className={`w-16 h-16 rounded-full p-[2px] ${
                group.user.id === user?.id
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                  : "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400"
              }`}>
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
                  {group.user.avatar ? (
                    <img src={group.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600">
                      {group.user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-16 text-center">
                {group.user.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewingGroup && (
          <MomentViewer
            group={viewingGroup}
            allGroups={grouped}
            onClose={() => setViewingGroup(null)}
            onNavigateGroup={(g) => setViewingGroup(g)}
            currentUserId={user?.id}
          />
        )}
        {showCreate && (
          <CreateMomentModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              fetchMoments();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MomentViewer({
  group,
  allGroups,
  onClose,
  onNavigateGroup,
  currentUserId,
}: {
  group: GroupedMoments;
  allGroups: GroupedMoments[];
  onClose: () => void;
  onNavigateGroup: (g: GroupedMoments) => void;
  currentUserId?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moment = group.moments[currentIndex];
  const DURATION = 5000;

  useEffect(() => {
    setProgress(0);
    setCurrentIndex(0);
  }, [group.user.id]);

  useEffect(() => {
    if (moment && currentUserId) {
      fetch(`/api/moments/${moment.id}/view`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, [moment?.id, currentUserId]);

  useEffect(() => {
    if (paused) return;
    const startTime = Date.now();
    const startProgress = progress;
    const remaining = DURATION * (1 - startProgress / 100);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = startProgress + (elapsed / remaining) * (100 - startProgress);
      if (newProgress >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      } else {
        setProgress(newProgress);
      }
    }, 30);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, paused, group.user.id]);

  const goNext = () => {
    if (currentIndex < group.moments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      const currentGroupIdx = allGroups.findIndex((g) => g.user.id === group.user.id);
      if (currentGroupIdx < allGroups.length - 1) {
        onNavigateGroup(allGroups[currentGroupIdx + 1]);
      } else {
        onClose();
      }
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      const currentGroupIdx = allGroups.findIndex((g) => g.user.id === group.user.id);
      if (currentGroupIdx > 0) {
        onNavigateGroup(allGroups[currentGroupIdx - 1]);
      }
    }
  };

  const handleLike = async () => {
    if (!moment) return;
    try {
      await fetch(`/api/moments/${moment.id}/like`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {}
  };

  const handleDelete = async () => {
    if (!moment) return;
    try {
      await fetch(`/api/moments/${moment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (group.moments.length <= 1) {
        onClose();
      } else {
        group.moments.splice(currentIndex, 1);
        if (currentIndex >= group.moments.length) setCurrentIndex(group.moments.length - 1);
        setProgress(0);
      }
    } catch (e) {}
  };

  if (!moment) return null;

  const timeAgo = getTimeAgo(moment.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      data-testid="moment-viewer"
    >
      <div className="relative w-full h-full max-w-md mx-auto">
        <div className="flex gap-1 px-2 pt-2 absolute top-0 left-0 right-0 z-20">
          {group.moments.map((_, i) => (
            <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${i < currentIndex ? 100 : i === currentIndex ? progress : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {group.user.avatar ? (
              <img src={group.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                {group.user.name?.[0]}
              </div>
            )}
            <div>
              <p className="text-white text-sm font-semibold">{group.user.username}</p>
              <p className="text-white/60 text-[10px]">{timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUserId === group.user.id && (
              <button onClick={handleDelete} className="text-white/80 hover:text-white p-1" data-testid="button-delete-moment">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white p-1" data-testid="button-close-moment">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div
          className="w-full h-full flex items-center justify-center"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {moment.mediaType === "video" ? (
            <video
              src={moment.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <img
              src={moment.mediaUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <button
          onClick={goPrev}
          className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-10"
          data-testid="button-moment-prev"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-10"
          data-testid="button-moment-next"
        />

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
          {moment.caption && (
            <p className="text-white text-sm mb-2">{moment.caption}</p>
          )}
          {moment.location && (
            <div className="flex items-center gap-1 text-white/70 text-xs mb-3">
              <MapPin className="w-3 h-3" />
              {moment.location}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleLike} className="text-white hover:scale-110 transition-transform" data-testid="button-like-moment">
                <Heart className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/moment/${moment.id}`;
                  navigator.clipboard.writeText(url);
                }}
                className="text-white hover:scale-110 transition-transform"
                data-testid="button-share-moment"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <Eye className="w-3.5 h-3.5" />
              {moment.views}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CreateMomentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const objectKey = `uploads/${crypto.randomUUID()}.${ext}`;

      const presignRes = await fetch("/api/objects/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: objectKey, contentType: file.type }),
      });
      const { url: uploadUrl } = await presignRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const mediaUrl = `/objects/${objectKey}`;
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      await fetch("/api/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          caption: caption || undefined,
          location: location || undefined,
          latitude: lat,
          longitude: lng,
        }),
      });

      toast({ title: "Momento pubblicato!" });
      onCreated();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      data-testid="create-moment-modal"
    >
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-white" data-testid="button-close-create-moment">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-semibold text-lg">Nuovo Momento</h2>
        <Button
          onClick={handleSubmit}
          disabled={!file || uploading}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          data-testid="button-publish-moment"
        >
          {uploading ? "..." : "Pubblica"}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {preview ? (
          <div className="relative w-full max-w-sm">
            {file?.type.startsWith("video/") ? (
              <video src={preview} className="w-full rounded-2xl max-h-[60vh] object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={preview} alt="" className="w-full rounded-2xl max-h-[60vh] object-cover" />
            )}
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-sm h-80 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-3 text-white/60 hover:border-white/50 hover:text-white/80 transition-colors"
            data-testid="button-select-media"
          >
            <Camera className="w-12 h-12" />
            <span className="text-sm">Tocca per scegliere foto o video</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-moment-file"
        />
      </div>

      <div className="p-4 space-y-3">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Aggiungi una didascalia..."
          className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
          data-testid="input-moment-caption"
        />
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/40" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Dove sei?"
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
            data-testid="input-moment-location"
          />
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}g`;
}
