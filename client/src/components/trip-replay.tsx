import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, X, Plane, Train, Car, Footprints, Bike, MapPin, Calendar, Star, Leaf, Route, Bed, ChevronRight, Maximize2, Minimize2, Gauge, Bus } from "lucide-react";
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
  bus: Bus,
};

const transportLabels: Record<string, string> = {
  plane: "Aereo",
  train: "Treno",
  car: "Auto",
  walk: "A piedi",
  bike: "Bici",
  bus: "Bus",
};

const transportColors: Record<string, string> = {
  plane: "#8b5cf6",
  train: "#3b82f6",
  car: "#f59e0b",
  walk: "#10b981",
  bike: "#06b6d4",
  bus: "#f97316",
};

const transportEmoji: Record<string, string> = {
  plane: "✈️",
  train: "🚂",
  car: "🚗",
  walk: "🚶",
  bike: "🚲",
  bus: "🚌",
};

const cityImageCache: Record<string, string> = {};

async function fetchCityImage(city: string): Promise<string> {
  if (cityImageCache[city]) return cityImageCache[city];
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
    if (res.ok) {
      const data = await res.json();
      const imgUrl = data.thumbnail?.source?.replace(/\/\d+px-/, "/600px-") || data.originalimage?.source;
      if (imgUrl) {
        cityImageCache[city] = imgUrl;
        return imgUrl;
      }
    }
  } catch {}
  const fallback = `https://placehold.co/400x200/1a1a2e/10b981?text=${encodeURIComponent(city)}`;
  cityImageCache[city] = fallback;
  return fallback;
}

function CityImage({ city, imageUrl, alt }: { city: string; imageUrl?: string | null; alt: string }) {
  const [src, setSrc] = useState(imageUrl || "");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (imageUrl) {
      setSrc(imageUrl);
      return;
    }
    let cancelled = false;
    fetchCityImage(city).then(url => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [city, imageUrl]);

  if (!src) return <div className="w-full h-[140px] bg-gradient-to-br from-emerald-900/40 to-teal-900/40 flex items-center justify-center"><MapPin className="w-8 h-8 text-emerald-400/50" /></div>;

  return (
    <img
      src={src}
      className={`w-full h-[140px] object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setSrc(`https://placehold.co/400x200/1a1a2e/10b981?text=${encodeURIComponent(city)}`);
      }}
    />
  );
}


function AnimatedMapController({
  stops,
  currentStopIndex,
  isPlaying,
  progress,
  lineLayersRef,
  movingMarkerRef,
  userAvatar,
  phase,
}: {
  stops: TripStop[];
  currentStopIndex: number;
  isPlaying: boolean;
  progress: number;
  lineLayersRef: React.MutableRefObject<L.Layer[]>;
  movingMarkerRef: React.MutableRefObject<L.Marker | null>;
  userAvatar?: string;
  phase: string;
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
        dashArray: getDashForTransport(end.transportMode),
      });
      line.addTo(map);
      lineLayersRef.current.push(line);

      const glow = L.polyline(curvedPoints, {
        color, weight: 6, opacity: 0.2, interactive: false, lineCap: "round",
      });
      glow.addTo(map);
      lineLayersRef.current.push(glow);

      const midIdx = Math.floor(curvedPoints.length / 2);
      const midPoint = curvedPoints[midIdx];
      const emoji = transportEmoji[end.transportMode || "walk"] || "🚶";
      const transportMidMarker = L.marker(midPoint, {
        icon: L.divIcon({
          html: `<div style="font-size:20px;text-shadow:0 2px 4px rgba(0,0,0,0.5);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${emoji}</div>`,
          className: "transport-emoji-marker",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 50,
        interactive: false,
      }).addTo(map);
      lineLayersRef.current.push(transportMidMarker);
    }

    if (phase === "traveling" && currentStopIndex > 0 && currentStopIndex <= validStops.length - 1) {
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
          dashArray: getDashForTransport(currStop.transportMode),
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

      const transportMode = currStop.transportMode || "walk";
      const emoji = transportEmoji[transportMode] || "🚶";
      const label = transportLabels[transportMode] || "A piedi";

      let angle = 0;
      if (partialPath.length >= 2) {
        const p1 = partialPath[partialPath.length - 2];
        const p2 = partialPath[partialPath.length - 1];
        angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);
      }

      if (movingMarkerRef.current) {
        movingMarkerRef.current.setLatLng(currentPos);
      } else {
        const icon = L.divIcon({
          html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="width:52px;height:52px;border-radius:50%;border:3px solid ${color};box-shadow:0 0 24px ${color}80, 0 4px 15px rgba(0,0,0,0.4);overflow:hidden;background:${color};display:flex;align-items:center;justify-content:center;animation:pulse-glow 1.5s ease-in-out infinite;">
              <span style="font-size:28px;${transportMode === 'plane' ? `transform:rotate(${angle - 90}deg);` : ''}">${emoji}</span>
            </div>
            <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:${color};color:white;padding:2px 10px;border-radius:10px;font-size:9px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1.5px solid white;">${label}</div>
          </div>`,
          className: "trip-replay-marker",
          iconSize: [52, 64],
          iconAnchor: [26, 32],
        });
        movingMarkerRef.current = L.marker(currentPos, { icon, zIndexOffset: 1000 }).addTo(map);
      }
    }

    if (phase === "arrived" && currentStopIndex < validStops.length) {
      const stop = validStops[currentStopIndex];
      const rawUrl = userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=nomad";
      const avatarUrl = sanitizeUrl(rawUrl) || "https://api.dicebear.com/7.x/avataaars/svg?seed=nomad";
      
      const arrivedIcon = L.divIcon({
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="width:56px;height:56px;border-radius:50%;border:3px solid #10b981;box-shadow:0 0 24px rgba(16,185,129,0.6), 0 4px 15px rgba(0,0,0,0.4);overflow:hidden;background:white;animation:bounce-in 0.5s ease;">
            <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
          </div>
          <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:2px 10px;border-radius:10px;font-size:9px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1.5px solid white;">📍 ${stop.city}</div>
        </div>`,
        className: "trip-replay-marker",
        iconSize: [56, 72],
        iconAnchor: [28, 36],
      });
      
      const avatarMarker = L.marker([stop.latitude!, stop.longitude!], { icon: arrivedIcon, zIndexOffset: 1000 }).addTo(map);
      lineLayersRef.current.push(avatarMarker);
    }

    for (let i = 0; i <= Math.min(currentStopIndex, validStops.length - 1); i++) {
      const stop = validStops[i];
      const isCurrentStop = i === currentStopIndex && phase === "arrived";
      const isPast = i < currentStopIndex;

      if (!isPast && !isCurrentStop) continue;
      if (isCurrentStop) continue;

      const size = 28;
      const color = "#6b7280";

      const markerIcon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color};background:#374151;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          ${i + 1}
        </div>`,
        className: "stop-replay-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([stop.latitude!, stop.longitude!], { icon: markerIcon, zIndexOffset: 100 }).addTo(map);
      lineLayersRef.current.push(marker);
    }

    for (let i = currentStopIndex + 1; i < validStops.length; i++) {
      const stop = validStops[i];
      const size = 24;
      const markerIcon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2px dashed #4b5563;background:#1f2937;display:flex;align-items:center;justify-content:center;color:#6b7280;font-weight:bold;font-size:10px;box-shadow:0 1px 4px rgba(0,0,0,0.2);">
          ${i + 1}
        </div>`,
        className: "stop-replay-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([stop.latitude!, stop.longitude!], { icon: markerIcon, zIndexOffset: 50 }).addTo(map);
      lineLayersRef.current.push(marker);
    }

  }, [currentStopIndex, progress, stops, map, lineLayersRef, movingMarkerRef, userAvatar, phase]);

  const zoomRef = useRef(6);

  useEffect(() => {
    const validStops = stops.filter(s => s.latitude != null && s.longitude != null);
    if (validStops.length === 0) return;

    if (currentStopIndex < validStops.length) {
      const target = validStops[currentStopIndex];
      map.flyTo([target.latitude!, target.longitude!], zoomRef.current, { duration: 1.5, noMoveStart: true });
    }
  }, [currentStopIndex, stops, map]);

  useEffect(() => {
    const onZoomEnd = () => { zoomRef.current = map.getZoom(); };
    map.on("zoomend", onZoomEnd);
    return () => { map.off("zoomend", onZoomEnd); };
  }, [map]);

  return null;
}

function getDashForTransport(mode?: string | null): string | undefined {
  switch (mode) {
    case "walk": return "4 8";
    case "bike": return "8 6";
    default: return undefined;
  }
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
  const [showPhoto, setShowPhoto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineLayersRef = useRef<L.Layer[]>([]);
  const movingMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    validStops.forEach(stop => {
      if (!stop.imageUrl) fetchCityImage(stop.city);
    });
  }, [validStops.length]);

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
    setShowPhoto(false);
  }, []);

  useEffect(() => {
    if (phase === "arrived") {
      setShowPhoto(false);
      const photoTimer = setTimeout(() => setShowPhoto(true), 400);
      return () => clearTimeout(photoTimer);
    }
  }, [phase, currentStopIndex]);

  useEffect(() => {
    if (!isPlaying) return;

    if (phase === "arrived") {
      const timer = setTimeout(() => {
        if (currentStopIndex < validStops.length - 1) {
          setPhase("traveling");
          setProgress(0);
          setShowPhoto(false);
        } else {
          setPhase("summary");
          setIsPlaying(false);
        }
      }, 3000 / speed);
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
    setShowPhoto(false);
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
        @keyframes float-vehicle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .trip-replay-marker, .stop-replay-marker, .transport-emoji-marker { background: none !important; border: none !important; }
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
            phase={phase}
          />
        </MapContainer>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center p-6 sm:p-8 max-w-sm mx-4"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Plane className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tripTitle}</h2>
                <p className="text-white/60 mb-1">{validStops.length} tappe &middot; {totalKm} km</p>
                {userName && <p className="text-white/40 text-sm mb-3">Viaggio di {userName}</p>}

                <div className="flex items-center justify-center gap-1 flex-wrap mb-4">
                  {validStops.map((stop, i) => (
                    <span key={stop.id} className="flex items-center gap-0.5">
                      <span className="text-xs text-white/80 font-medium">{stop.city}</span>
                      {i < validStops.length - 1 && (
                        <>
                          <span className="text-sm mx-0.5">{transportEmoji[validStops[i + 1]?.transportMode || "walk"]}</span>
                        </>
                      )}
                    </span>
                  ))}
                </div>

                <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                  <p className="text-white/80 text-sm font-medium text-center mb-2">Come funziona:</p>
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <Play className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Premi <strong className="text-white">Avvia</strong> per vedere il viaggio animato sulla mappa</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <SkipForward className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Usa le <strong className="text-white">frecce</strong> per saltare tra le tappe</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <Gauge className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Cambia <strong className="text-white">velocità</strong> con i pulsanti 1x 2x 3x</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startReplay}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-500/30 flex items-center gap-2 mx-auto"
                  data-testid="button-start-replay"
                >
                  <Play className="w-6 h-6" /> Avvia Replay
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
                {showPhoto && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 140, opacity: 1 }}
                    transition={{ type: "spring", damping: 20, delay: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <CityImage city={currentStop.city} imageUrl={currentStop.imageUrl} alt={currentStop.city} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="absolute bottom-2 left-3 right-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg">
                          📍 Tappa {currentStopIndex + 1}
                        </span>
                        {currentStop.rating && <StarsDisplay rating={currentStop.rating} size={12} />}
                      </div>
                      {currentStop.transportMode && currentStopIndex > 0 && (
                        <span className="text-lg">{transportEmoji[currentStop.transportMode]}</span>
                      )}
                    </motion.div>
                  </motion.div>
                )}

                <div className="p-4">
                  <motion.h3 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-bold text-foreground"
                  >
                    {currentStop.city}
                  </motion.h3>
                  <p className="text-sm text-muted-foreground">{currentStop.country}</p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(currentStop.arrivalDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </span>
                    {currentStop.distanceKm && currentStopIndex > 0 && (
                      <span className="flex items-center gap-1">
                        <Route className="w-3 h-3" /> {currentStop.distanceKm} km
                      </span>
                    )}
                    {currentStop.transportMode && currentStopIndex > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ 
                          backgroundColor: (transportColors[currentStop.transportMode] || "#10b981") + "20",
                          color: transportColors[currentStop.transportMode] || "#10b981"
                        }}
                      >
                        {transportEmoji[currentStop.transportMode]} {transportLabels[currentStop.transportMode] || currentStop.transportMode}
                      </span>
                    )}
                  </div>

                  {currentStop.accommodationName && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-2 flex items-center gap-2 bg-blue-500/10 rounded-lg px-3 py-2"
                    >
                      <Bed className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{currentStop.accommodationName}</p>
                        {currentStop.accommodationType && (
                          <p className="text-[10px] text-muted-foreground capitalize">{currentStop.accommodationType}</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {currentStop.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">"{currentStop.notes}"</p>
                  )}

                  {nextStop && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="text-sm">{transportEmoji[nextStop.transportMode || "walk"]}</span>
                      <span>Prossima: <span className="text-foreground font-medium">{nextStop.city}</span></span>
                      {nextStop.distanceKm && <span className="text-[10px] ml-auto">({nextStop.distanceKm} km)</span>}
                    </motion.div>
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
              className="absolute bottom-28 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[10000]"
            >
              <div className="bg-card/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  {TransportIcon && (
                    <motion.div
                      animate={{ x: [0, 8, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: transportColors[nextStop.transportMode || "walk"] + "20" }}
                    >
                      {transportEmoji[nextStop.transportMode || "walk"]}
                    </motion.div>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">In viaggio</p>
                    <p className="font-bold text-foreground">{currentStop.city} → {nextStop.city}</p>
                    <p className="text-xs text-muted-foreground">
                      {transportLabels[nextStop.transportMode || "walk"]} {nextStop.distanceKm ? `• ${nextStop.distanceKm} km` : ""}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: transportColors[nextStop.transportMode || "walk"],
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span>{currentStop.city}</span>
                  <span className="font-medium" style={{ color: transportColors[nextStop.transportMode || "walk"] }}>
                    {nextStop.distanceKm ? `${Math.round(nextStop.distanceKm * progress)} / ${nextStop.distanceKm} km` : `${Math.round(progress * 100)}%`}
                  </span>
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
                      <p className="text-2xl font-bold text-amber-400">{totalCo2.toFixed(1)}</p>
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
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {validStops.map((stop, i) => (
                      <span key={stop.id} className="flex items-center gap-0.5">
                        <span className="text-xs font-medium text-foreground">{stop.city}</span>
                        {i < validStops.length - 1 && (
                          <span className="text-sm mx-0.5">{transportEmoji[validStops[i + 1]?.transportMode || "walk"]}</span>
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
        <div className="flex items-center gap-0.5 mb-2 justify-center overflow-x-auto scrollbar-hide">
          {validStops.map((s, i) => {
            const isPast = i < currentStopIndex;
            const isCurrent = i === currentStopIndex;
            const nextTransport = i < validStops.length - 1 ? validStops[i + 1]?.transportMode : null;
            return (
              <div key={i} className="flex items-center gap-0.5 shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isPast ? "bg-emerald-500" :
                      isCurrent ? "bg-emerald-400 w-3.5 h-3.5 ring-2 ring-emerald-400/30" :
                      "bg-muted-foreground/30"
                    }`}
                  />
                  {isCurrent && (
                    <span className="text-[9px] text-emerald-400 font-medium mt-0.5 whitespace-nowrap">{s.city}</span>
                  )}
                </div>
                {i < validStops.length - 1 && nextTransport && (
                  <div className="flex items-center mx-0.5">
                    <div className={`h-px w-3 ${isPast ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <span className="text-[10px] mx-0.5">{transportEmoji[nextTransport] || "🚶"}</span>
                    <div className={`h-px w-3 ${isPast ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  </div>
                )}
                {i < validStops.length - 1 && !nextTransport && (
                  <div className={`h-px w-4 mx-0.5 ${isPast ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                )}
              </div>
            );
          })}
          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
            {currentStopIndex + 1}/{validStops.length}
          </span>
        </div>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={handleRestart}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-[9px] text-muted-foreground">Riavvia</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
                data-testid="button-play-pause"
              >
                {phase === "summary" ? (
                  <RotateCcw className="w-6 h-6" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>
              <span className="text-[9px] text-muted-foreground">
                {phase === "summary" ? "Rivedi" : isPlaying ? "Pausa" : "Play"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={handleSkip}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-skip"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="text-[9px] text-muted-foreground">Avanti</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground">Velocità</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    speed === s ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
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
    </div>
  );
}