import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Heart, Eye, MapPin, Send, Camera, ChevronLeft, ChevronRight, Trash2, Upload, RotateCcw, SwitchCamera, Image, Compass, Globe, Video, Square } from "lucide-react";
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

  const latestMoment = (group: GroupedMoments) => group.moments[group.moments.length - 1];

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
              className="shrink-0 cursor-pointer group"
              data-testid="button-create-moment"
            >
              <div className="w-[72px] h-[96px] rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-2 border-dashed border-emerald-300 dark:border-emerald-700 flex flex-col items-center justify-center gap-1.5 group-hover:border-emerald-500 group-hover:shadow-md transition-all relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight text-center px-1">
                  Condividi
                </span>
              </div>
            </button>
          )}

          {grouped.map((group) => {
            const latest = latestMoment(group);
            return (
              <button
                key={group.user.id}
                onClick={() => setViewingGroup(group)}
                className="shrink-0 cursor-pointer group"
                data-testid={`moment-avatar-${group.user.id}`}
              >
                <div className="w-[72px] h-[96px] rounded-lg overflow-hidden relative shadow-sm group-hover:shadow-lg transition-all group-hover:scale-[1.03] bg-gray-100 dark:bg-gray-800">
                  <img
                    src={latest.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                  <div className="absolute top-1 left-1 right-1 flex items-center gap-1">
                    {group.user.avatar ? (
                      <img src={group.user.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-white/80 shadow-sm" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white border border-white/80">
                        {group.user.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {group.moments.length > 1 && (
                      <span className="text-[8px] font-bold text-white bg-black/40 px-1 rounded-full backdrop-blur-sm">
                        {group.moments.length}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-1 left-1 right-1">
                    {latest.location ? (
                      <div className="flex items-center gap-0.5 text-white">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="text-[8px] font-medium truncate leading-tight">{latest.location}</span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-medium text-white/80 truncate block">{group.user.username}</span>
                    )}
                  </div>
                  {group.user.id === user?.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                      <Compass className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
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
  const [liked, setLiked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moment = group.moments[currentIndex];
  const DURATION = 6000;

  useEffect(() => {
    setProgress(0);
    setCurrentIndex(0);
    setLiked(false);
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
    setLiked(false);
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
    setLiked(false);
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
    setLiked(true);
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
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="moment-viewer"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gray-900 shadow-2xl"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex gap-1 px-3 pt-3 relative z-20">
          {group.moments.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400 rounded-full"
                style={{
                  width: `${i < currentIndex ? 100 : i === currentIndex ? progress : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 z-20 flex items-center justify-between px-3 mt-1">
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full py-1 pl-1 pr-3">
            {group.user.avatar ? (
              <img src={group.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-emerald-400/50" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                {group.user.name?.[0]}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-white text-xs font-semibold">{group.user.username}</p>
              <p className="text-white/50 text-[9px]">{timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentUserId === group.user.id && (
              <button onClick={handleDelete} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-red-400 transition-colors" data-testid="button-delete-moment">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors" data-testid="button-close-moment">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className="relative aspect-[3/4] max-h-[70vh]"
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

          <button
            onClick={goPrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            data-testid="button-moment-prev"
          />
          <button
            onClick={goNext}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
            data-testid="button-moment-next"
          />

          {group.moments.length > 1 && (
            <>
              {currentIndex > 0 && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 text-white/60" />
                  </div>
                </div>
              )}
              {currentIndex < group.moments.length - 1 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white/60" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-gray-900">
          {moment.location && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 rounded-full px-2 py-0.5">
                <Globe className="w-3 h-3" />
                <span className="text-[10px] font-semibold">{moment.location}</span>
              </div>
            </div>
          )}
          {moment.caption && (
            <p className="text-white/90 text-sm mb-2 leading-snug">{moment.caption}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 transition-all ${liked ? "text-red-400 scale-110" : "text-white/60 hover:text-red-400"}`}
                data-testid="button-like-moment"
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-red-400" : ""}`} />
                <span className="text-xs">{moment.likes + (liked ? 1 : 0)}</span>
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/moment/${moment.id}`;
                  navigator.clipboard.writeText(url);
                }}
                className="text-white/60 hover:text-emerald-400 transition-colors"
                data-testid="button-share-moment"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Eye className="w-3 h-3" />
              {moment.views}
            </div>
          </div>
        </div>
      </motion.div>

      {allGroups.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {allGroups.map((g) => (
            <button
              key={g.user.id}
              onClick={() => onNavigateGroup(g)}
              className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${g.user.id === group.user.id ? "border-emerald-400 scale-110" : "border-white/20 opacity-60 hover:opacity-100"}`}
            >
              {g.user.avatar ? (
                <img src={g.user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                  {g.user.name?.[0]}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
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
  const [mode, setMode] = useState<"choose" | "camera" | "preview">("choose");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraTab, setCameraTab] = useState<"photo" | "video">("photo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_RECORD_SECONDS = 30;

  const stopCamera = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: cameraTab === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Impossibile accedere alla fotocamera. Consenti i permessi.");
    }
  }, [stopCamera, cameraTab]);

  useEffect(() => {
    if (mode === "camera") {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, facingMode, startCamera, stopCamera]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const captured = new File([blob], `moment_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(captured);
      setPreview(URL.createObjectURL(blob));
      setMode("preview");
    }, "image/jpeg", 0.92);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const recorded = new File([blob], `moment_${Date.now()}.${ext}`, { type: mimeType });
        setFile(recorded);
        setPreview(URL.createObjectURL(blob));
        setMode("preview");
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORD_SECONDS - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Errore", description: "Impossibile avviare la registrazione video.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setMode("preview");
    };
    reader.readAsDataURL(f);
  };

  const resetMedia = () => {
    setPreview(null);
    setFile(null);
    setMode("choose");
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const uploadRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Impossibile ottenere URL di caricamento");
      }

      const { uploadURL, objectPath } = await uploadRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const mediaUrl = objectPath;
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

      toast({ title: "Momento condiviso!" });
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
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      data-testid="create-moment-modal"
    >
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-moment-file"
      />

      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" data-testid="button-close-create-moment">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-semibold">Nuovo Momento</h2>
        </div>
        {mode === "preview" ? (
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4"
            data-testid="button-publish-moment"
          >
            {uploading ? "..." : "Condividi"}
          </Button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {mode === "choose" && (
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => { setCameraTab("photo"); setMode("camera"); }}
              className="w-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-5 flex items-center gap-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
              data-testid="button-open-camera"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Scatta una foto</p>
                <p className="text-white/40 text-xs mt-0.5">Cattura il tuo momento nomade</p>
              </div>
            </button>
            <button
              onClick={() => { setCameraTab("video"); setMode("camera"); }}
              className="w-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-5 flex items-center gap-4 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/5 transition-all group"
              data-testid="button-open-video-camera"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <Video className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Registra un video</p>
                <p className="text-white/40 text-xs mt-0.5">Fino a {MAX_RECORD_SECONDS} secondi</p>
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-5 flex items-center gap-4 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/5 transition-all group"
              data-testid="button-select-media"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <Image className="w-6 h-6 text-teal-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Dalla galleria</p>
                <p className="text-white/40 text-xs mt-0.5">Scegli foto o video dal tuo dispositivo</p>
              </div>
            </button>
          </div>
        )}

        {mode === "camera" && (
          <div className="relative w-full max-w-sm">
            {cameraError ? (
              <div className="h-[60vh] rounded-2xl bg-gray-800 flex flex-col items-center justify-center gap-4">
                <Camera className="w-16 h-16 text-white/20" />
                <p className="text-white/50 text-sm text-center px-4">{cameraError}</p>
                <Button
                  onClick={() => startCamera(facingMode)}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Riprova
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full rounded-2xl max-h-[60vh] object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  data-testid="camera-preview"
                />
                {isRecording && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-xs font-mono font-semibold">
                      {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:{String(recordingTime % 60).padStart(2, "0")}
                    </span>
                    <span className="text-white/40 text-xs">/ {MAX_RECORD_SECONDS}s</span>
                  </div>
                )}
                {cameraTab === "video" && !isRecording && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-red-500/80 backdrop-blur-md rounded-full px-3 py-1">
                    <Video className="w-3 h-3 text-white" />
                    <span className="text-white text-[10px] font-semibold uppercase tracking-wider">Video</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {mode === "preview" && preview && (
          <div className="relative w-full max-w-sm">
            {file?.type.startsWith("video/") ? (
              <video src={preview} className="w-full rounded-2xl max-h-[60vh] object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={preview} alt="" className="w-full rounded-2xl max-h-[60vh] object-cover" />
            )}
            <button
              onClick={resetMedia}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
              data-testid="button-reset-media"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {mode === "camera" && !cameraError && (
        <div className="p-6 flex flex-col items-center gap-4">
          {!isRecording && (
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
              <button
                onClick={() => { setCameraTab("photo"); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${cameraTab === "photo" ? "bg-emerald-500 text-white" : "text-white/50 hover:text-white/80"}`}
                data-testid="button-tab-photo"
              >
                Foto
              </button>
              <button
                onClick={() => { setCameraTab("video"); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${cameraTab === "video" ? "bg-red-500 text-white" : "text-white/50 hover:text-white/80"}`}
                data-testid="button-tab-video"
              >
                Video
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => { if (!isRecording) { setMode("choose"); fileInputRef.current?.click(); } }}
              className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white transition-colors ${isRecording ? "opacity-30" : "hover:bg-white/20"}`}
              disabled={isRecording}
              data-testid="button-gallery-from-camera"
            >
              <Image className="w-5 h-5" />
            </button>
            {cameraTab === "photo" ? (
              <button
                onClick={capturePhoto}
                className="w-[72px] h-[72px] rounded-full border-[3px] border-emerald-400 flex items-center justify-center hover:scale-105 transition-transform"
                data-testid="button-capture"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-emerald-400 hover:bg-emerald-300 transition-colors" />
              </button>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-[72px] h-[72px] rounded-full border-[3px] border-red-400 flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
                data-testid="button-stop-recording"
              >
                <div className="w-7 h-7 rounded-sm bg-red-500" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-[72px] h-[72px] rounded-full border-[3px] border-red-400 flex items-center justify-center hover:scale-105 transition-transform"
                data-testid="button-start-recording"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
              </button>
            )}
            <button
              onClick={() => { if (!isRecording) flipCamera(); }}
              className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white transition-colors ${isRecording ? "opacity-30" : "hover:bg-white/20"}`}
              disabled={isRecording}
              data-testid="button-flip-camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {mode === "preview" && (
        <div className="p-4 space-y-3">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Racconta il tuo momento..."
            className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 border border-white/10"
            data-testid="input-moment-caption"
          />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Dove ti trovi?"
              className="flex-1 bg-white/5 text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 border border-white/10"
              data-testid="input-moment-location"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "adesso";
  if (minutes < 60) return `${minutes}min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}
