import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export function CurvedRouteLine({ positions, color = "#3b82f6", dashed = false, opacity = 0.9 }: { 
  positions: [number, number][]; 
  color?: string; 
  dashed?: boolean; 
  opacity?: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length < 2) return;
    
    const curvedPoints: L.LatLng[] = [];
    
    for (let i = 0; i < positions.length - 1; i++) {
      const start = L.latLng(positions[i][0], positions[i][1]);
      const end = L.latLng(positions[i + 1][0], positions[i + 1][1]);
      
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const distance = start.distanceTo(end);
      const offset = Math.min(distance * 0.000005, 0.15);
      
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const controlLat = midLat + offset * (dx >= 0 ? 1 : -1);
      const controlLng = midLng - offset * 0.3 * (dy >= 0 ? 1 : -1);
      
      for (let t = 0; t <= 1; t += 0.03) {
        const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * end.lat;
        const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * end.lng;
        curvedPoints.push(L.latLng(lat, lng));
      }
    }
    curvedPoints.push(L.latLng(positions[positions.length - 1][0], positions[positions.length - 1][1]));
    
    const layers: L.Polyline[] = [];
    const opacityScale = opacity / 0.9;
    
    const shadow = L.polyline(curvedPoints, {
      color: "#000000", weight: 5, opacity: 0.12 * opacityScale,
      lineCap: "round", lineJoin: "round", interactive: false,
    });
    shadow.addTo(map);
    layers.push(shadow);
    
    const outline = L.polyline(curvedPoints, {
      color: "#ffffff", weight: 4, opacity: 0.5 * opacityScale,
      lineCap: "round", lineJoin: "round", interactive: false,
    });
    outline.addTo(map);
    layers.push(outline);
    
    const mainLine = L.polyline(curvedPoints, {
      color, weight: 3, opacity,
      lineCap: "round", lineJoin: "round",
      dashArray: dashed ? "10, 6" : undefined, interactive: false,
    });
    mainLine.addTo(map);
    layers.push(mainLine);
    
    const animDots = L.polyline(curvedPoints, {
      color: "#ffffff", weight: 1.5, opacity: 0.5 * opacityScale,
      lineCap: "round", dashArray: "3, 12",
      className: "route-anim-dots", interactive: false,
    });
    animDots.addTo(map);
    layers.push(animDots);
    
    return () => {
      layers.forEach(l => map.removeLayer(l));
    };
  }, [positions, map, color, dashed, opacity]);
  
  return null;
}

export function createStopMarkerIcon(orderIndex: number, color: string = "#3b82f6", avatarUrl?: string | null, stopMediaUrl?: string | null) {
  const avatar = stopMediaUrl || avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=nomad${orderIndex}`;
  
  return L.divIcon({
    html: `<div style="position:relative;">
      <div style="width:40px;height:40px;border-radius:50%;border:3px solid ${color};box-shadow:0 3px 10px rgba(0,0,0,0.35);overflow:hidden;background:white;">
        <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
      </div>
      <div style="position:absolute;bottom:-3px;right:-3px;background:${color};color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:9px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${orderIndex + 1}</div>
    </div>`,
    className: "custom-stop-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}
