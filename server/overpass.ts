import type { Place } from "@shared/schema";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const CACHE = new Map<string, { data: OverpassPlace[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassPlace {
  id: string;
  name: string;
  type: string;
  location: string;
  city: string;
  country: string;
  description: string | null;
  price: string;
  pricePerNight: number | null;
  pricePerHour: number | null;
  currency: string;
  imageUrl: string | null;
  rating: number;
  reviews: number;
  tags: string[];
  amenities: string[];
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  source: "osm";
  osmId: string;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
}

type PlaceType = "coworking" | "hotel" | "hostel" | "cafe" | "all";

function buildOverpassQuery(lat: number, lng: number, radius: number, type: PlaceType): string {
  const r = Math.min(Math.max(radius, 500), 50000);
  const around = `(around:${r},${lat},${lng})`;

  let filters = "";
  switch (type) {
    case "coworking":
      filters = `node["amenity"="coworking_space"]${around};way["amenity"="coworking_space"]${around};`;
      break;
    case "hotel":
      filters = `node["tourism"="hotel"]${around};way["tourism"="hotel"]${around};`;
      break;
    case "hostel":
      filters = `node["tourism"="hostel"]${around};way["tourism"="hostel"]${around};`;
      break;
    case "cafe":
      filters = `node["amenity"="cafe"]["internet_access"]${around};way["amenity"="cafe"]["internet_access"]${around};`;
      break;
    case "all":
    default:
      filters = `
        node["amenity"="coworking_space"]${around};
        way["amenity"="coworking_space"]${around};
        node["tourism"="hotel"]${around};
        way["tourism"="hotel"]${around};
        node["tourism"="hostel"]${around};
        way["tourism"="hostel"]${around};
        node["amenity"="cafe"]["internet_access"]${around};
        way["amenity"="cafe"]["internet_access"]${around};
      `;
      break;
  }

  return `[out:json][timeout:15];(${filters});out center tags 100;`;
}

function getPlaceType(tags: Record<string, string>): string {
  if (tags.amenity === "coworking_space") return "coworking";
  if (tags.tourism === "hotel") return "hotel";
  if (tags.tourism === "hostel") return "hostel";
  if (tags.amenity === "cafe") return "cafe";
  return "coworking";
}

function extractAmenities(tags: Record<string, string>): string[] {
  const amenities: string[] = [];
  if (tags.internet_access === "wlan" || tags.internet_access === "yes" || tags["internet_access:fee"] === "no") amenities.push("WiFi");
  if (tags.amenity === "cafe" || tags.cuisine) amenities.push("Coffee");
  if (tags["air_conditioning"] === "yes") amenities.push("Air Conditioning");
  if (tags.parking && tags.parking !== "no") amenities.push("Parking");
  if (tags["opening_hours"]?.includes("24/7")) amenities.push("24/7 Access");
  if (tags.wheelchair === "yes") amenities.push("Accessible");
  if (tags.outdoor_seating === "yes") amenities.push("Outdoor Seating");
  if (tags.shower === "yes") amenities.push("Shower");
  return amenities;
}

function extractTags(tags: Record<string, string>): string[] {
  const result: string[] = [];
  if (tags.internet_access) result.push("WiFi");
  if (tags.cuisine) result.push(tags.cuisine.split(";")[0]);
  if (tags.stars) result.push(`${tags.stars} Stars`);
  if (tags.smoking === "no") result.push("Non-smoking");
  if (tags.breakfast === "yes") result.push("Breakfast");
  return result;
}

function buildAddress(tags: Record<string, string>): string {
  const parts = [];
  if (tags["addr:street"]) {
    let street = tags["addr:street"];
    if (tags["addr:housenumber"]) street += " " + tags["addr:housenumber"];
    parts.push(street);
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  return parts.length > 0 ? parts.join(", ") : tags.name || "Unknown location";
}

function transformElement(el: OverpassElement): OverpassPlace | null {
  const tags = el.tags || {};
  if (!tags.name) return null;

  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;

  const placeType = getPlaceType(tags);
  const city = tags["addr:city"] || tags["addr:suburb"] || "";
  const country = tags["addr:country"] || "";

  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name,
    type: placeType,
    location: buildAddress(tags),
    city,
    country,
    description: tags.description || tags.note || null,
    price: tags.stars ? `${tags.stars}-star` : "N/A",
    pricePerNight: null,
    pricePerHour: null,
    currency: "EUR",
    imageUrl: null,
    rating: tags.stars ? parseInt(tags.stars) : 0,
    reviews: 0,
    tags: extractTags(tags),
    amenities: extractAmenities(tags),
    capacity: tags.rooms ? parseInt(tags.rooms) : null,
    latitude: lat,
    longitude: lon,
    source: "osm",
    osmId: `${el.type}/${el.id}`,
    website: tags.website || tags["contact:website"] || null,
    phone: tags.phone || tags["contact:phone"] || null,
    openingHours: tags.opening_hours || null,
  };
}

function getCacheKey(lat: number, lng: number, radius: number, type: PlaceType): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${roundedLat},${roundedLng},${radius},${type}`;
}

export async function queryOverpass(
  lat: number,
  lng: number,
  radius: number = 5000,
  type: PlaceType = "all"
): Promise<OverpassPlace[]> {
  const cacheKey = getCacheKey(lat, lng, radius, type);
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const query = buildOverpassQuery(lat, lng, radius, type);

  let lastError: Error | null = null;
  let elements: OverpassElement[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`Overpass ${endpoint}: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      elements = data.elements || [];
      break;
    } catch (e: any) {
      lastError = e;
      console.warn(`Overpass endpoint failed (${endpoint}): ${e.message}`);
      continue;
    }
  }

  if (elements.length === 0 && lastError) {
    throw lastError;
  }

  const places = elements
    .map(transformElement)
    .filter((p): p is OverpassPlace => p !== null);

  CACHE.set(cacheKey, { data: places, timestamp: Date.now() });

  if (CACHE.size > 200) {
    const oldest = Array.from(CACHE.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 50);
    oldest.forEach(([key]) => CACHE.delete(key));
  }

  return places;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "bali": { lat: -8.6500, lng: 115.1389 },
  "canggu": { lat: -8.6478, lng: 115.1385 },
  "ubud": { lat: -8.5069, lng: 115.2625 },
  "bangkok": { lat: 13.7563, lng: 100.5018 },
  "chiang mai": { lat: 18.7883, lng: 98.9853 },
  "lisbon": { lat: 38.7223, lng: -9.1393 },
  "lisbona": { lat: 38.7223, lng: -9.1393 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "barcelona": { lat: 41.3851, lng: 2.1734 },
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "new york": { lat: 40.7128, lng: -74.0060 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "milan": { lat: 45.4642, lng: 9.1900 },
  "milano": { lat: 45.4642, lng: 9.1900 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "roma": { lat: 41.9028, lng: 12.4964 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "ho chi minh city": { lat: 10.8231, lng: 106.6297 },
  "da nang": { lat: 16.0544, lng: 108.2022 },
  "kuala lumpur": { lat: 3.1390, lng: 101.6869 },
  "budapest": { lat: 47.4979, lng: 19.0402 },
  "prague": { lat: 50.0755, lng: 14.4378 },
  "praga": { lat: 50.0755, lng: 14.4378 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "medellin": { lat: 6.2442, lng: -75.5812 },
  "buenos aires": { lat: -34.6037, lng: -58.3816 },
  "tbilisi": { lat: 41.7151, lng: 44.8271 },
  "madeira": { lat: 32.6669, lng: -16.9241 },
  "tenerife": { lat: 28.2916, lng: -16.6291 },
  "playa del carmen": { lat: 20.6296, lng: -87.0739 },
  "olbia": { lat: 40.9237, lng: 9.4961 },
  "napoli": { lat: 40.8518, lng: 14.2681 },
  "torino": { lat: 45.0703, lng: 7.6869 },
  "firenze": { lat: 43.7696, lng: 11.2558 },
  "bologna": { lat: 44.4949, lng: 11.3426 },
  "palermo": { lat: 38.1157, lng: 13.3615 },
};

export async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  const key = cityName.toLowerCase().trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { headers: { "User-Agent": "NomadLife/1.0" } }
    );
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error("Geocoding error:", e);
  }
  return null;
}

export function mergeWithLocal(overpassPlaces: OverpassPlace[], localPlaces: Place[]): (OverpassPlace | Place)[] {
  const localIds = new Set(localPlaces.map(p => p.id));
  const merged: (OverpassPlace | Place)[] = [...localPlaces];

  for (const op of overpassPlaces) {
    const isDuplicate = localPlaces.some(lp => {
      if (!lp.latitude || !lp.longitude || !op.latitude || !op.longitude) return false;
      const latDiff = Math.abs(lp.latitude - op.latitude);
      const lngDiff = Math.abs(lp.longitude - op.longitude);
      const nameSimilar = lp.name.toLowerCase().includes(op.name.toLowerCase().slice(0, 5)) ||
                          op.name.toLowerCase().includes(lp.name.toLowerCase().slice(0, 5));
      return latDiff < 0.001 && lngDiff < 0.001 && nameSimilar;
    });

    if (!isDuplicate) {
      merged.push(op);
    }
  }

  return merged;
}
