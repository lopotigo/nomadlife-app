import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

const MIN_DISTANCE_KM = 0.5;
const UPDATE_INTERVAL = 5 * 60 * 1000;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGpsTracking() {
  const { user } = useAuth();
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || !("geolocation" in navigator)) return;
    if (user.privacyMode === "hidden") return;

    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          if (lastPos.current) {
            const dist = haversineDistance(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
            if (dist < MIN_DISTANCE_KM) return;
          }

          lastPos.current = { lat: latitude, lng: longitude };

          try {
            await fetch(`/api/users/${user.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ latitude, longitude }),
            });
          } catch (err) {
            console.error("[GPS Tracking] Update failed:", err);
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    updatePosition();
    intervalRef.current = setInterval(updatePosition, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id, user?.privacyMode]);
}
