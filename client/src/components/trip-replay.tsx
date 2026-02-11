import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, X, Plane, Train, Car, Footprints, Bike, MapPin, Calendar, Star, Leaf, Route, Bed, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface TripStop {
  id: string;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  orderIndex: number;
  arrivalDate: string | Date;
  departureDate?: string | Date | null;
  notes?: string | null;
  imageUrl?: string | null;
  transportMode?: string | null;
  distanceKm?: number | null;
  co2Kg?: number | null;
  rating?: number | null;
  accommodationName?: string | null;
  accommodationType?: string | null;
}

interface TripReplayProps {
  tripTitle: string;
  stops: TripStop[];
  userAvatar?: string;
  userName?: string;
  onClose: () => void;
}

const transportIcons: Record<string, typeof Plane> = {
  plane: Plane,
  train: Train,
  car: Car,
  walk: Footprints,
  bike: Bike,
};

const transportLabels: Record<string, string> = {
  plane: "Aereo",
  train: "Treno",
  car: "Auto",
  walk: "A piedi",
  bike: "Bicicletta",
};

const transportColors: Record<string, string> = {
  plane: "#8b5cf6",
  train: "#3b82f6",
  car: "#f59e0b",
  walk: "#10b981",
  bike: "#06b6d4",
};

function AnimatedMapController({
  stops,
  currentStopIndex,
  isPlaying,
  progress,
  lineLayersRef,
  movingMarkerRef,
  userAvatar,
}: {
  stops: TripStop[];
  currentStopIndex: number;
  isPlaying: boolean;
  progress: number;
  lineLayersRef: React.MutableRefObject<L.Layer[]>;
  movingMarkerRef: React.MutableRefObject<L.Marker | null>;
  userAvatar?: string;
}) {
  const map = useMap();

  useEffect(() => {
    const validStops = stops.filter(s => s.latitude != null && s.longitude != null);
    if (validStops.length === 0) return;

    const bounds = L.latLngBounds(validStops.map(s => [s.latitude!, s.longitude!]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
  }, [stops, map]);

  useEffect(() => {
    const validStops = stops.filter(s => s.latitude != null && s.longitude != null);
    if (validStops.length === 0) return;

    lineLayersRef.current.forEach(l => map.removeLayer(l));
    lineLayersRef.current = [];

    const existingMovingMarker = movingMarkerRef.current;
    if (existingMovingMarker) {
      map.removeLayer(existingMovingMarker);
      movingMarkerRef.current = null;
    }

    for (let i = 0; i < currentStopIndex && i < validStops.length - 1; i++) {
      const start = validStops[i];
      const end = validStops[i + 1];
      const color = transportColors[end.transportMode || "walk"] || "#10b981";

      const curvedPoints = generateCurvedPath(
        [start.latitude!, start.longitude!],
        [end.latitude!, end.longitude!]
      );

      const shadow = L.polyline(curvedPoints, {
        color: "#000", weight: 6, opacity: 0.15, interactive: false, lineCap: "round",
      });
      shadow.addTo(map);
      lineLayersRef.current.push(shadow);

      const line = L.polyline(curvedPoints, {
        color, weight: 3.5, opacity: 0.9, interactive: false, lineCap: "round",
      });
      line.addTo(map);
      lineLayersRef.current.push(line);

      const glow = L.polyline(curvedPoints, {
        color, weight: 6, opacity: 0.2, interactive: false, lineCap: "round",
      });
      glow.addTo(map);
      lineLayersRef.current.push(glow);
    }

    if (currentStopIndex > 0 && currentStopIndex <= validStops.length - 1) {
      const prevStop = validStops[currentStopIndex - 1];
      const currStop = validStops[currentStopIndex];
      const color = transportColors[currStop.transportMode || "walk"] || "#10b981";

      const fullPath = generateCurvedPath(
        [prevStop.latitude!, prevStop.longitude!],
        [currStop.latitude!, currStop.longitude!]
      );

      const partialIndex = Math.floor(progress * (fullPath.length - 1));
      const partialPath = fullPath.slice(0, partialIndex + 1);

      if (partialPath.length > 1) {
        const animLine = L.polyline(partialPath, {
          color, weight: 3.5, opacity: 0.9, interactive: false, lineCap: "round",
        });
        animLine.addTo(map);
        lineLayersRef.current.push(animLine);

        const animGlow = L.polyline(partialPath, {
          color, weight: 6, opacity: 0.2, interactive: false, lineCap: "round",
        });
        animGlow.addTo(map);
        lineLayersRef.current.push(animGlow);
      }

      const currentPos = partialPath[partialPath.length - 1] || L.latLng(prevStop.latitude!, prevStop.longitude!);

      if (movingMarkerRef.current) {
        movingMarkerRef.current.setLatLng(currentPos);
      } else {
        const rawUrl = userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=nomad";
        const avatarUrl = sanitizeUrl(rawUrl) || "https://api.dicebear.com/7.x/avataaars/svg?seed=nomad";
        const icon = L.divIcon({
          html: `<div style="position:relative;">
            <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${color};box-shadow:0 0 20px ${color}80, 0 4px 15px rgba(0,0,0,0.4);overflow:hidden;background:white;animation:pulse-glow 2s ease-in-out infinite;">
              <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
            </div>
            <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:${color};color:white;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">IN VIAGGIO</div>
          </div>`,
          className: "trip-replay-marker",
          iconSize: [48, 56],
          iconAnchor: [24, 28],
        });
        movingMarkerRef.current = L.marker(currentPos, { icon, zIndexOffset: 1000 }).addTo(map);
      }
    }

    for (let i = 0; i <= Math.min(currentStopIndex, validStops.length - 1); i++) {
      const stop = validStops[i];
      const isCurrentStop = i === currentStopIndex;
      const isPast = i < currentStopIndex;

      if (!isPast && !isCurrentStop) continue;

      const size = isCurrentStop ? 36 : 28;
      const color = isCurrentStop ? "#10b981" : "#6b7280";

      const markerIcon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color};background:${isCurrentStop ? '#10b981' : '#374151'};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${isCurrentStop ? '14' : '11'}px;box-shadow:0 2px 8px rgba(0,0,0,0.3);${isCurrentStop ? 'animation:bounce-in 0.5s ease;' : ''}">
          ${i + 1}
        </div>`,
        className: "stop-replay-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([stop.latitude!, stop.longitude!], { icon: markerIcon, zIndexOffset: isCurrentStop ? 900 : 100 }).addTo(map);
      lineLayersRef.current.push(marker);
    }

  }, [currentStopIndex, progress, stops, map, lineLayersRef, movingMarkerRef, userAvatar]);

  useEffect(() => {
    const validStops = stops.filter(s => s.latitude != null && s.longitude != null);
    if (validStops.length === 0) return;

    if (currentStopIndex < validStops.length) {
      const target = validStops[currentStopIndex];
      const zoom = currentStopIndex === 0 ? 6 : 5;
      map.flyTo([target.latitude!, target.longitude!], zoom, { duration: 1.5 });
    }
  }, [currentStopIndex, stops, map]);

  return null;
}

function generateCurvedPath(start: [number, number], end: [number, number]): L.LatLng[] {
  const points: L.LatLng[] = [];
  const startLL = L.latLng(start[0], start[1]);
  const endLL = L.latLng(end[0], end[1]);

  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  const distance = startLL.distanceTo(endLL);
  const offset = Math.min(distance * 0.000005, 0.15);

  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const controlLat = midLat + offset * (dx >= 0 ? 1 : -1);
  const controlLng = midLng - offset * 0.3 * (dy >= 0 ? 1 : -1);

  for (let t = 0; t <= 1; t += 0.02) {
    const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlLat + t * t * end[0];
    const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlLng + t * t * end[1];
    points.push(L.latLng(lat, lng));
  }
  points.push(endLL);
  return points;
}

function StarsDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: size, height: size }} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "data:") return u.href;
    return "";
  } catch {
    return "";
  }
}

export function TripReplay({ tripTitle, stops, userAvatar, userName, onClose }: TripReplayProps) {
  const validStops = stops.filter(s => s.latitude != null && s.longitude != null).sort((a, b) => a.orderIndex - b.orderIndex);

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<"intro" | "traveling" | "arrived" | "summary">("intro");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineLayersRef = useRef<L.Layer[]>([]);
  const movingMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const totalKm = validStops.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const totalCo2 = validStops.reduce((sum, s) => sum + (s.co2Kg || 0), 0);
  const co2Car = totalKm * 0.171;
  const co2Saved = Math.max(0, co2Car - totalCo2);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startReplay = useCallback(() => {
    setCurrentStopIndex(0);
    setPhase("arrived");
    setProgress(0);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    if (phase === "arrived") {
      const timer = setTimeout(() => {
        if (currentStopIndex < validStops.length - 1) {
          setPhase("traveling");
          setProgress(0);
        } else {
          setPhase("summary");
          setIsPlaying(false);
        }
      }, 2500 / speed);
      return () => clearTimeout(timer);
    }

    if (phase === "traveling") {
      let lastTime = performance.now();
      const travelDuration = 3000 / speed;

      const animate = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        setProgress(prev => {
          const next = prev + delta / travelDuration;
          if (next >= 1) {
            setCurrentStopIndex(ci => ci + 1);
            setPhase("arrived");
            setProgress(0);
            return 1;
          }
          return next;
        });
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [isPlaying, phase, currentStopIndex, validStops.length, speed]);

  const handlePlayPause = () => {
    if (phase === "intro") {
      startReplay();
    } else if (phase === "summary") {
      setCurrentStopIndex(0);
      setPhase("intro");
      setProgress(0);
      if (movingMarkerRef.current) {
        movingMarkerRef.current = null;
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = () => {
    if (currentStopIndex < validStops.length - 1) {
      cleanup();
      setCurrentStopIndex(prev => prev + 1);
      setPhase("arrived");
      setProgress(0);
    } else {
      setPhase("summary");
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    cleanup();
    if (movingMarkerRef.current) {
      movingMarkerRef.current = null;
    }
    setCurrentStopIndex(0);
    setPhase("intro");
    setProgress(0);
    setIsPlaying(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const currentStop = validStops[currentStopIndex];
  const nextStop = currentStopIndex < validStops.length - 1 ? validStops[currentStopIndex + 1] : null;
  const TransportIcon = nextStop?.transportMode ? transportIcons[nextStop.transportMode] : null;

  if (validStops.length < 2) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 max-w-md text-center">
          <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Servono almeno 2 tappe</h2>
          <p className="text-muted-foreground mb-4">Aggiungi più tappe con coordinate al viaggio per poter avviare il replay.</p>
          <button onClick={onClose} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-medium">Chiudi</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-black flex flex-col" data-testid="trip-replay-container">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(16,185,129,0.4), 0 4px 15px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 30px rgba(16,185,129,0.7), 0 4px 15px rgba(0,0,0,0.4); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .trip-replay-marker, .stop-replay-marker { background: none !important; border: none !important; }
      `}</style>

      <div className="absolute top-0 left-0 right-0 z-[10001] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors" data-testid="button-close-replay">
            <X className="w-5 h-5" />
          </button>
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2">
            <h1 className="text-white font-bold text-sm">{tripTitle}</h1>
            {userName && <p className="text-white/60 text-xs">di {userName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={[validStops[0].latitude!, validStops[0].longitude!]}
          zoom={5}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <AnimatedMapController
            stops={validStops}
            currentStopIndex={currentStopIndex}
            isPlaying={isPlaying}
            progress={progress}
            lineLayersRef={lineLayersRef}
            movingMarkerRef={movingMarkerRef}
            userAvatar={userAvatar}
          />
        </MapContainer>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center p-8"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Plane className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">{tripTitle}</h2>
                <p className="text-white/60 mb-1">{validStops.length} tappe &middot; {totalKm} km</p>
                {userName && <p className="text-white/40 text-sm mb-6">Viaggio di {userName}</p>}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startReplay}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-500/30 flex items-center gap-2 mx-auto"
                  data-testid="button-start-replay"
                >
                  <Play className="w-5 h-5" /> Avvia Replay
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {phase === "arrived" && currentStop && (
            <motion.div
              key={`stop-${currentStopIndex}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="absolute bottom-28 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[10000]"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                {currentStop.imageUrl && (
                  <div className="relative h-32">
                    <img src={currentStop.imageUrl} className="w-full h-full object-cover" alt={currentStop.city} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          Tappa {currentStopIndex + 1}
                        </span>
                        {currentStop.rating && <StarsDisplay rating={currentStop.rating} size={12} />}
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  {!currentStop.imageUrl && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        Tappa {currentStopIndex + 1}
                      </span>
                      {currentStop.rating && <StarsDisplay rating={currentStop.rating} size={12} />}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-foreground">{currentStop.city}</h3>
                  <p className="text-sm text-muted-foreground">{currentStop.country}</p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(currentStop.arrivalDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </span>
                    {currentStop.distanceKm && currentStopIndex > 0 && (
                      <span className="flex items-center gap-1">
                        <Route className="w-3 h-3" /> {currentStop.distanceKm} km
                      </span>
                    )}
                    {currentStop.transportMode && (
                      <span className="flex items-center gap-1 capitalize">
                        {(() => {
                          const TIcon = transportIcons[currentStop.transportMode];
                          return TIcon ? <TIcon className="w-3 h-3" /> : null;
                        })()}
                        {transportLabels[currentStop.transportMode] || currentStop.transportMode}
                      </span>
                    )}
                  </div>

                  {currentStop.accommodationName && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-500/10 rounded-lg px-3 py-2">
                      <Bed className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{currentStop.accommodationName}</p>
                        {currentStop.accommodationType && (
                          <p className="text-[10px] text-muted-foreground capitalize">{currentStop.accommodationType}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStop.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">"{currentStop.notes}"</p>
                  )}

                  {nextStop && (
                    <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3" />
                      <span>Prossima: <span className="text-foreground font-medium">{nextStop.city}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {phase === "traveling" && currentStop && nextStop && (
            <motion.div
              key="traveling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-28 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 z-[10000]"
            >
              <div className="bg-card/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  {TransportIcon && (
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: transportColors[nextStop.transportMode || "walk"] + "20" }}
                    >
                      <TransportIcon className="w-5 h-5" style={{ color: transportColors[nextStop.transportMode || "walk"] }} />
                    </motion.div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">In viaggio verso</p>
                    <p className="font-bold text-foreground">{nextStop.city}</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: transportColors[nextStop.transportMode || "walk"],
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{currentStop.city}</span>
                  <span>{nextStop.distanceKm ? `${Math.round(nextStop.distanceKm * progress)} / ${nextStop.distanceKm} km` : ""}</span>
                  <span>{nextStop.city}</span>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="text-center mb-4">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    <Route className="w-12 h-12 text-emerald-500 mx-auto" />
                  </motion.div>
                  <h2 className="text-xl font-bold mt-2 text-foreground">Viaggio Completato!</h2>
                  <p className="text-muted-foreground text-sm">{tripTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{validStops.length}</p>
                    <p className="text-xs text-muted-foreground">Tappe</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{totalKm}</p>
                    <p className="text-xs text-muted-foreground">km totali</p>
                  </div>
                  {totalCo2 > 0 && (
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{totalCo2}</p>
                      <p className="text-xs text-muted-foreground">kg CO₂</p>
                    </div>
                  )}
                  {co2Saved > 0 && (
                    <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-400">-{co2Saved.toFixed(0)}</p>
                      <p className="text-xs text-emerald-400">kg CO₂ risparmiata</p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Percorso</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {validStops.map((stop, i) => (
                      <span key={stop.id} className="flex items-center gap-1">
                        <span className="text-xs font-medium text-foreground">{stop.city}</span>
                        {i < validStops.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRestart}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-foreground font-medium text-sm flex items-center justify-center gap-1 hover:bg-accent transition-colors"
                    data-testid="button-replay-restart"
                  >
                    <RotateCcw className="w-4 h-4" /> Rivedi
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors"
                    data-testid="button-replay-close"
                  >
                    Chiudi
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card/95 backdrop-blur-md border-t border-border/50 px-4 py-3 z-[10001]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-1">
            {validStops.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentStopIndex ? "bg-emerald-500" :
                  i === currentStopIndex ? "bg-emerald-400 w-3" :
                  "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
              data-testid="button-play-pause"
            >
              {phase === "summary" ? (
                <RotateCcw className="w-5 h-5" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <button
              onClick={handleSkip}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  speed === s ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-speed-${s}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
