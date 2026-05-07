import { useState, useCallback, useRef } from "react";

export interface OsmPlace {
  id: number;
  lat: number;
  lng: number;
  name: string;
  category: "coworking" | "cafe" | "library" | "hostel" | "luggage_storage";
  tags: Record<string, string>;
}

export function useOverpass() {
  const [osmPlaces, setOsmPlaces] = useState<OsmPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBboxRef = useRef<string | null>(null);

  const queryBounds = useCallback((
    south: number,
    west: number,
    north: number,
    east: number,
    zoom: number
  ) => {
    if (zoom < 12) {
      setOsmPlaces([]);
      return;
    }

    const bboxKey = `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;
    if (bboxKey === lastBboxRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      lastBboxRef.current = bboxKey;
      setLoading(true);

      const bbox = `${south},${west},${north},${east}`;
      const query = `[out:json][timeout:15];(
        node["amenity"="coworking_space"](${bbox});
        node["amenity"="cafe"]["name"](${bbox});
        node["amenity"="library"](${bbox});
        node["tourism"="hostel"](${bbox});
        node["tourism"="guest_house"](${bbox});
        node["amenity"="luggage_locker"](${bbox});
      );out body 200;`;

      try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
        const data = await response.json();

        const places: OsmPlace[] = (data.elements || [])
          .filter((el: any) => el.lat && el.lon && el.tags?.name)
          .slice(0, 200)
          .map((el: any): OsmPlace => ({
            id: el.id,
            lat: el.lat,
            lng: el.lon,
            name: el.tags.name,
            category:
              el.tags.amenity === "coworking_space" ? "coworking"
              : el.tags.amenity === "cafe" ? "cafe"
              : el.tags.amenity === "library" ? "library"
              : el.tags.amenity === "luggage_locker" ? "luggage_storage"
              : "hostel",
            tags: el.tags,
          }));

        setOsmPlaces(places);
      } catch (err) {
        console.warn("[Overpass] Query failed:", err);
      } finally {
        setLoading(false);
      }
    }, 900);
  }, []);

  return { osmPlaces, osmLoading: loading, queryBounds };
}
