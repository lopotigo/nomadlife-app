import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { storage } from "../../storage";
import { db } from "../../db";
import { cities } from "@shared/schema";
import { ilike } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_places",
      description: "Search for hotels, hostels, coworking spaces in the NomadLife database. Use this when the user asks about accommodations, places to stay, or work spaces in a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name to search in (e.g. Bangkok, Lisbon, Bali)" },
          type: { type: "string", enum: ["hotel", "hostel", "coworking"], description: "Type of place to search for" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_place_reviews",
      description: "Get reviews and ratings for a specific place by its ID. Use this when the user wants more details or reviews about a specific place.",
      parameters: {
        type: "object",
        properties: {
          placeId: { type: "string", description: "The ID of the place to get reviews for" },
        },
        required: ["placeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a booking/reservation for a place. Use this when the user confirms they want to book a specific place. Always confirm the place name and check-in date with the user before calling this.",
      parameters: {
        type: "object",
        properties: {
          placeId: { type: "string", description: "The ID of the place to book" },
          checkInDate: { type: "string", description: "Check-in date in ISO format (YYYY-MM-DD)" },
          guestName: { type: "string", description: "Name of the guest for the booking" },
        },
        required: ["placeId", "checkInDate", "guestName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_affiliate",
      description: "Generate Travelpayouts affiliate links for flights, hotels, car rentals, transfers, and travel insurance. Use when no local DB results, or when user asks for booking/travel services.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Destination city" },
          type: { type: "string", enum: ["hotels", "flights", "cars", "transfers", "insurance", "vpn", "all"], description: "Type of service: hotels, flights, cars, transfers, insurance, vpn, or all for a complete list" },
          checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD) for hotels" },
          checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD) for hotels" },
        },
        required: ["city", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_city_costs",
      description: "Get cost of living data for a specific city from the NomadLife database. Returns daily costs for accommodation, food, coworking, transport, plus internet speed, weather, and nomad community size. Use this when users ask about costs, budget, or living expenses in a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name (e.g. Bangkok, Bali, Lisbon, Chiang Mai)" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "budget_trip_planner",
      description: "Calculate if a budget is enough for a trip to a destination. Cross-references city cost of living with estimated flight costs. Use when user says things like 'Ho 1000€, dove posso andare?', 'Can I travel to X with Y budget?', or asks about trip affordability.",
      parameters: {
        type: "object",
        properties: {
          budget: { type: "number", description: "Total budget in EUR" },
          destination: { type: "string", description: "Target destination city. If empty, will suggest best cities for budget." },
          days: { type: "number", description: "Number of days for the trip. Default 14 if not specified." },
          origin: { type: "string", description: "Origin city for flight estimate. Default 'Roma' if not specified." },
        },
        required: ["budget"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for real-time information about a location, Wi-Fi quality, cafes, coworking spaces, digital nomad tips, visa info, or any other travel-related query. Use this when the user asks about specific local info that may not be in the database, like 'best cafes with Wi-Fi in Vladivostok' or 'internet speed in rural Thailand'. Powered by Tavily.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query. Be specific, e.g. 'best coworking spaces with fast wifi in Tbilisi 2025'" },
        },
        required: ["query"],
      },
    },
  },
];

const TRAVELPAYOUTS_MARKER = process.env.VITE_TRAVELPAYOUTS_MARKER || "578583";

async function executeToolCall(
  toolName: string,
  args: any,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "search_places": {
        const { city, type } = args;
        if (!city || typeof city !== "string" || city.trim().length < 2) {
          return JSON.stringify({ error: "Parametro 'city' non valido. Specifica una città." });
        }
        const cityTrimmed = city.trim();

        const filters: any = { city: cityTrimmed };
        if (type && ["hotel", "hostel", "coworking"].includes(type)) {
          filters.type = type;
        }

        const places = await storage.searchPlaces(filters);

        if (places.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Nessun risultato trovato nel database per "${city}"${type ? ` (tipo: ${type})` : ""}. Usa search_affiliate per mostrare link di prenotazione esterni.`,
          });
        }

        const results = await Promise.all(
          places.map(async (p) => {
            let avgRatings = null;
            try {
              avgRatings = await storage.getPlaceAverageRatings(p.id);
            } catch {}
            return {
              id: p.id,
              name: p.name,
              type: p.type,
              city: p.city,
              country: p.country,
              location: p.location,
              price: p.price,
              pricePerNight: p.pricePerNight,
              pricePerHour: p.pricePerHour,
              currency: p.currency,
              rating: p.rating,
              reviewCount: p.reviews,
              amenities: p.amenities,
              tags: p.tags,
              avgRatings: avgRatings && avgRatings.count > 0
                ? { wifi: avgRatings.wifi, noise: avgRatings.noise, price: avgRatings.price, clean: avgRatings.clean, overall: avgRatings.overall, reviewCount: avgRatings.count }
                : null,
            };
          })
        );

        return JSON.stringify({ found: true, count: results.length, places: results });
      }

      case "get_place_reviews": {
        const { placeId } = args;
        const place = await storage.getPlace(placeId);
        if (!place) return JSON.stringify({ error: "Posto non trovato" });

        const [reviews, ratings] = await Promise.all([
          storage.getPlaceReviews(placeId),
          storage.getPlaceAverageRatings(placeId),
        ]);

        return JSON.stringify({
          place: { id: place.id, name: place.name, type: place.type, city: place.city, price: place.price },
          averageRatings: ratings,
          reviews: reviews.slice(0, 5).map((r) => ({
            user: r.user.username,
            overall: r.overallRating,
            wifi: r.wifiRating,
            noise: r.noiseRating,
            price: r.priceRating,
            clean: r.cleanRating,
            comment: r.comment,
            date: r.createdAt,
          })),
        });
      }

      case "create_booking": {
        const { placeId, checkInDate, guestName } = args;
        if (!placeId) return JSON.stringify({ error: "placeId mancante" });
        if (!guestName || typeof guestName !== "string" || guestName.trim().length < 1) {
          return JSON.stringify({ error: "guestName mancante o non valido" });
        }
        if (!checkInDate || typeof checkInDate !== "string") {
          return JSON.stringify({ error: "checkInDate mancante. Usa formato YYYY-MM-DD" });
        }
        const parsedDate = new Date(checkInDate);
        if (isNaN(parsedDate.getTime())) {
          return JSON.stringify({ error: `Data non valida: "${checkInDate}". Usa formato YYYY-MM-DD` });
        }

        const place = await storage.getPlace(placeId);
        if (!place) return JSON.stringify({ error: "Posto non trovato nel database" });

        const booking = await storage.createBooking({
          userId,
          placeId,
          checkInDate: parsedDate,
          guestName: guestName.trim(),
        });

        return JSON.stringify({
          success: true,
          booking: {
            id: booking.id,
            status: booking.status,
            checkInDate: booking.checkInDate,
            guestName: booking.guestName,
          },
          place: {
            name: place.name,
            type: place.type,
            city: place.city,
            location: place.location,
            price: place.price,
          },
        });
      }

      case "get_city_costs": {
        const { city } = args;
        if (!city || typeof city !== "string") {
          return JSON.stringify({ error: "Specifica una città" });
        }
        const cityResults = await db.select().from(cities).where(ilike(cities.name, `%${city.trim()}%`));
        if (cityResults.length === 0) {
          return JSON.stringify({ found: false, message: `Nessun dato per "${city}". Prova con un'altra città o usa web_search per informazioni online.` });
        }
        const c = cityResults[0];
        const dailyMin = (c.costAccommodationMin || 0) + (c.costFoodMin || 0) + (c.costCoworkingMin || 0) + (c.costTransportMin || 0);
        const dailyMax = (c.costAccommodationMax || 0) + (c.costFoodMax || 0) + (c.costCoworkingMax || 0) + (c.costTransportMax || 0);
        return JSON.stringify({
          found: true,
          city: c.name,
          country: c.country,
          emoji: c.emoji,
          dailyCosts: {
            accommodation: { min: c.costAccommodationMin, max: c.costAccommodationMax, unit: "EUR/notte" },
            food: { min: c.costFoodMin, max: c.costFoodMax, unit: "EUR/giorno" },
            coworking: { min: c.costCoworkingMin, max: c.costCoworkingMax, unit: "EUR/giorno" },
            transport: { min: c.costTransportMin, max: c.costTransportMax, unit: "EUR/giorno" },
            totalDaily: { min: dailyMin, max: dailyMax, unit: "EUR/giorno" },
          },
          community: { nomadsCount: c.nomadsCount, rating: c.rating },
          internet: { speed: c.internetSpeed, unit: "Mbps" },
          weather: c.weather,
        });
      }

      case "budget_trip_planner": {
        const { budget, destination, days = 14, origin = "Roma" } = args;
        if (!budget || typeof budget !== "number" || budget <= 0) {
          return JSON.stringify({ error: "Specifica un budget valido in EUR" });
        }

        const FLIGHT_ESTIMATES: Record<string, Record<string, number>> = {
          "Roma": { "Bangkok": 450, "Bali": 550, "Chiang Mai": 500, "Lisbona": 80, "Berlino": 60, "Medellin": 600, "Buenos Aires": 700, "Città del Messico": 550, "Ho Chi Minh": 500, "Cape Town": 500, "Tokyo": 650, "Singapore": 550, "Dubai": 250, "Barcellona": 50, "Amsterdam": 70, "Londra": 60, "Parigi": 50, "New York": 350, "Sydney": 800, "Mosca": 200 },
          "Milano": { "Bangkok": 420, "Bali": 520, "Chiang Mai": 480, "Lisbona": 70, "Berlino": 50, "Medellin": 580, "Buenos Aires": 680, "Città del Messico": 530, "Ho Chi Minh": 480, "Cape Town": 480, "Tokyo": 620, "Singapore": 530, "Dubai": 230, "Barcellona": 40, "Amsterdam": 60, "Londra": 50, "Parigi": 40, "New York": 330, "Sydney": 780, "Mosca": 180 },
          "default": { "Bangkok": 500, "Bali": 600, "Chiang Mai": 550, "Lisbona": 150, "Berlino": 120, "Medellin": 650, "Buenos Aires": 750, "Città del Messico": 600, "Ho Chi Minh": 550, "Cape Town": 550, "Tokyo": 700, "Singapore": 600, "Dubai": 300, "Barcellona": 100, "Amsterdam": 130, "Londra": 120, "Parigi": 100, "New York": 400, "Sydney": 850, "Mosca": 250 },
        };

        const getFlightCost = (orig: string, dest: string): number => {
          const originMap = FLIGHT_ESTIMATES[orig] || FLIGHT_ESTIMATES["default"];
          return originMap[dest] || 400;
        };

        if (destination) {
          const cityResults = await db.select().from(cities).where(ilike(cities.name, `%${destination.trim()}%`));
          if (cityResults.length === 0) {
            return JSON.stringify({ feasible: false, message: `Nessun dato per "${destination}". Prova con un'altra città.` });
          }
          const c = cityResults[0];
          const flightCost = getFlightCost(origin, c.name) * 2;
          const dailyMin = (c.costAccommodationMin || 0) + (c.costFoodMin || 0) + (c.costCoworkingMin || 0) + (c.costTransportMin || 0);
          const dailyMax = (c.costAccommodationMax || 0) + (c.costFoodMax || 0) + (c.costCoworkingMax || 0) + (c.costTransportMax || 0);
          const totalMin = flightCost + (dailyMin * days);
          const totalMax = flightCost + (dailyMax * days);
          const feasible = budget >= totalMin;
          const maxDaysBudget = Math.floor((budget - flightCost) / dailyMin);

          return JSON.stringify({
            destination: c.name,
            country: c.country,
            emoji: c.emoji,
            budget,
            days,
            origin,
            flightCostRoundTrip: flightCost,
            dailyCost: { min: dailyMin, max: dailyMax },
            totalCost: { min: totalMin, max: totalMax },
            feasible,
            maxDaysWithBudget: maxDaysBudget > 0 ? maxDaysBudget : 0,
            budgetRemaining: feasible ? budget - totalMin : 0,
            tip: feasible
              ? `Con €${budget} puoi stare ${maxDaysBudget} giorni a ${c.name}! Budget giornaliero: €${dailyMin}-${dailyMax}.`
              : `Budget insufficiente per ${days} giorni. Ti servirebbero almeno €${totalMin}. Con €${budget} puoi stare max ${maxDaysBudget > 0 ? maxDaysBudget : 0} giorni.`,
            affiliateHint: "Usa search_affiliate per mostrare link di prenotazione voli e hotel con i prezzi reali.",
          });
        }

        const allCities = await db.select().from(cities);
        const suggestions = allCities
          .map((c) => {
            const flightCost = getFlightCost(origin, c.name) * 2;
            const dailyMin = (c.costAccommodationMin || 0) + (c.costFoodMin || 0) + (c.costCoworkingMin || 0) + (c.costTransportMin || 0);
            const totalMin = flightCost + (dailyMin * days);
            const maxDays = Math.floor((budget - flightCost) / dailyMin);
            return {
              city: c.name,
              country: c.country,
              emoji: c.emoji,
              flightCostRoundTrip: flightCost,
              dailyCostMin: dailyMin,
              totalMinCost: totalMin,
              maxDaysWithBudget: maxDays > 0 ? maxDays : 0,
              feasible: budget >= totalMin,
              nomadsCount: c.nomadsCount,
              internetSpeed: c.internetSpeed,
              rating: c.rating,
              weather: c.weather,
            };
          })
          .filter((s) => s.feasible && s.maxDaysWithBudget >= 7)
          .sort((a, b) => b.maxDaysWithBudget - a.maxDaysWithBudget);

        return JSON.stringify({
          budget,
          days,
          origin,
          suggestedDestinations: suggestions.slice(0, 8),
          totalOptions: suggestions.length,
          tip: suggestions.length > 0
            ? `Con €${budget} hai ${suggestions.length} destinazioni possibili per ${days} giorni! Le migliori per rapporto qualità/prezzo sono le prime della lista.`
            : `Con €${budget} per ${days} giorni non ci sono destinazioni fattibili. Prova ad aumentare il budget o ridurre i giorni.`,
        });
      }

      case "web_search": {
        const { query } = args;
        if (!query || typeof query !== "string") {
          return JSON.stringify({ error: "Specifica una query di ricerca" });
        }
        if (!process.env.TAVILY_API_KEY) {
          return JSON.stringify({ error: "Ricerca web non disponibile. Chiave API Tavily non configurata." });
        }
        try {
          const tavilyResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query: `digital nomad ${query}`,
              search_depth: "advanced",
              max_results: 5,
              include_answer: true,
            }),
          });
          if (!tavilyResponse.ok) {
            const errText = await tavilyResponse.text();
            console.error("Tavily API error:", errText);
            return JSON.stringify({ error: "Errore nella ricerca web. Riprova." });
          }
          const tavilyData = await tavilyResponse.json();
          return JSON.stringify({
            answer: tavilyData.answer || null,
            results: (tavilyData.results || []).slice(0, 5).map((r: any) => ({
              title: r.title,
              url: r.url,
              content: r.content?.substring(0, 300),
            })),
            query: query,
          });
        } catch (err: any) {
          console.error("Tavily search error:", err);
          return JSON.stringify({ error: "Errore nella ricerca web: " + err.message });
        }
      }

      case "search_affiliate": {
        const { city, type, checkIn, checkOut } = args;
        const cityEncoded = encodeURIComponent(city);
        const m = TRAVELPAYOUTS_MARKER;

        const buildLink = (targetUrl: string, subId: string) =>
          `https://tp.media/r?marker=${m}.${subId}&trs=nomadlife&p=4370&u=${encodeURIComponent(targetUrl)}`;

        if (type === "all") {
          const links = [
            { provider: "Hotellook", label: `🏨 Hotel a ${city}`, url: buildLink(`https://search.hotellook.com/?destination=${cityEncoded}&adults=1${checkIn ? `&checkIn=${checkIn}` : ""}${checkOut ? `&checkOut=${checkOut}` : ""}`, "hotels") },
            { provider: "Aviasales", label: `✈️ Voli per ${city}`, url: buildLink(`https://www.aviasales.com/search?destination_name=${cityEncoded}&adults=1`, "flights") },
            { provider: "Kiwi.com", label: `🛫 Voli low-cost per ${city}`, url: buildLink(`https://www.kiwi.com/en/search/results?to=${cityEncoded}`, "kiwi") },
            { provider: "Rentalcars", label: `🚗 Noleggio auto a ${city}`, url: buildLink(`https://www.rentalcars.com/search-results?location=${cityEncoded}`, "rentalcars") },
            { provider: "GetTransfer", label: `🚐 Transfer da ${city}`, url: buildLink(`https://www.gettransfer.com/en?from=${cityEncoded}`, "transfer") },
            { provider: "Insubuy", label: `🛡️ Assicurazione viaggio`, url: buildLink("https://www.insubuy.com/travel-medical-insurance/", "insurance") },
            { provider: "NordVPN", label: `🔒 VPN per WiFi sicuro`, url: buildLink("https://nordvpn.com/", "nordvpn") },
          ];
          return JSON.stringify({ type: "affiliate_links", city, links });
        }

        if (type === "hotels") {
          const url = buildLink(`https://search.hotellook.com/?destination=${cityEncoded}&adults=1${checkIn ? `&checkIn=${checkIn}` : ""}${checkOut ? `&checkOut=${checkOut}` : ""}`, "hotels");
          return JSON.stringify({ type: "affiliate_link", provider: "Hotellook", url, city, message: `Cerca hotel a ${city} su Hotellook` });
        }
        if (type === "flights") {
          const url = buildLink(`https://www.aviasales.com/search?destination_name=${cityEncoded}&adults=1`, "flights");
          return JSON.stringify({ type: "affiliate_link", provider: "Aviasales", url, city, message: `Cerca voli per ${city} su Aviasales` });
        }
        if (type === "cars") {
          const url = buildLink(`https://www.rentalcars.com/search-results?location=${cityEncoded}`, "rentalcars");
          return JSON.stringify({ type: "affiliate_link", provider: "Rentalcars", url, city, message: `Noleggio auto a ${city}` });
        }
        if (type === "transfers") {
          const url = buildLink(`https://www.gettransfer.com/en?from=${cityEncoded}`, "transfer");
          return JSON.stringify({ type: "affiliate_link", provider: "GetTransfer", url, city, message: `Transfer da ${city}` });
        }
        if (type === "insurance") {
          const url = buildLink("https://www.insubuy.com/travel-medical-insurance/", "insurance");
          return JSON.stringify({ type: "affiliate_link", provider: "Insubuy", url, city: "", message: "Assicurazione viaggio internazionale" });
        }

        if (type === "vpn") {
          const url = buildLink("https://nordvpn.com/", "nordvpn");
          return JSON.stringify({ type: "affiliate_link", provider: "NordVPN", url, city: "", message: "NordVPN - Proteggi la tua connessione WiFi in viaggio" });
        }

        return JSON.stringify({ error: "Tipo non supportato. Usa: hotels, flights, cars, transfers, insurance, vpn, all" });
      }

      default:
        return JSON.stringify({ error: "Funzione non riconosciuta" });
    }
  } catch (error: any) {
    console.error(`Tool call error (${toolName}):`, error);
    return JSON.stringify({ error: error.message });
  }
}

const BASE_SYSTEM_PROMPT = `You are NomadBot, the AI travel assistant for NomadLife - a database-connected agent for digital nomads.

YOU HAVE ACCESS TO THE REAL DATABASE AND WEB SEARCH. Use tools ONLY when the user asks for specific data. NEVER invent or guess data.

WHEN TO USE TOOLS vs RESPOND NORMALLY:
- Greetings ("ciao", "hello", "come stai") → Respond normally, NO tools needed.
- Generic chat, opinions, advice, small talk → Respond normally, NO tools needed.
- Questions you can answer from general knowledge (e.g. "cos'è un nomade digitale?") → Respond normally, NO tools needed.
- Questions about specific places, prices, bookings, costs, availability → USE TOOLS.

YOUR TOOLS:
1. search_places → Search hotels, hostels, coworking in the database
2. get_place_reviews → Get reviews for a specific place
3. create_booking → Book a place (confirm with user first!)
4. search_affiliate → Generate Travelpayouts affiliate links (flights, hotels, cars, transfers, insurance, VPN)
5. get_city_costs → Get cost of living data for a city (accommodation, food, coworking, transport per day)
6. budget_trip_planner → Calculate if a budget covers a trip. Suggests best cities for a given budget. Cross-references flight costs + daily living costs.
7. web_search → Search the web via Tavily for real-time info NOT already in our database.

YOUR WORKFLOW:
1. For accommodations/places → search_places first, then search_affiliate if no results
2. For cost of living / "quanto costa vivere a..." → get_city_costs
3. For budget questions ("Ho 1000€, dove vado?") → budget_trip_planner
4. For specific local info (Wi-Fi speed, specific cafes, current prices) that is NOT in our database → web_search
5. For bookings → confirm details with user, then create_booking
6. After search_places with no results → search_affiliate with type "all"
7. For flights → search_affiliate type "flights"
8. For car rentals → search_affiliate type "cars"
9. For transfers → search_affiliate type "transfers"
10. For insurance → search_affiliate type "insurance"

BUDGET TRIP PLANNER:
- When user says "Ho X€" or asks "where can I go with X budget" → call budget_trip_planner
- If they specify a destination, check if budget is enough
- If no destination, suggest best cities sorted by value
- ALWAYS follow up with search_affiliate links for the recommended destinations
- Show clear breakdown: flight cost + daily costs × days = total

WEB SEARCH (Tavily) - USE SPARINGLY:
- ONLY use when user asks specific questions about real-time/local info NOT in our database
- Good examples: "miglior WiFi a Vladivostok", "visto per Giappone 2025", "caffè con prese elettriche a Porto"
- DO NOT use for: greetings, generic questions, cities already in our 26-city database (use get_city_costs instead)
- DO NOT use for: general travel advice, opinions, or anything you can answer from knowledge
- Present results with source links when used

IMPORTANT RULES:
- For data-related questions, use tools. For chat/greetings/advice, respond directly.
- Show real prices, ratings, and amenities from the database
- For bookings, ALWAYS confirm place name, date, and guest name before creating
- Format affiliate links as clickable markdown: [Label](url)
- Answer in the same language the user writes in (Italian, English, Spanish, etc.)
- Be friendly, concise, and practical
- When presenting places, format clearly with name, type, price, rating
- Proactively offer related services when discussing a city`;

async function buildContextualPrompt(userId: string): Promise<string> {
  try {
    const user = await storage.getUser(userId).catch(() => null);
    let context = BASE_SYSTEM_PROMPT;

    if (user) {
      context += `\n\nCURRENT USER: ${user.name} (@${user.username}), location: ${user.location || 'unknown'}`;
      if (user.profession) context += `, profession: ${user.profession}`;
      if (user.skills?.length) context += `, skills: ${user.skills.join(', ')}`;
    }

    return context;
  } catch {
    return BASE_SYSTEM_PROMPT;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

function getUserId(req: Request): string {
  return (req.user as any)?.id;
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/ai/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/ai/conversations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/ai/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim() : "New Chat";
      const userId = getUserId(req);
      const conversation = await chatStorage.createConversation(title, userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/ai/conversations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/ai/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = getUserId(req);
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await chatStorage.createMessage(conversationId, "user", content.trim());

      const contextualPrompt = await buildContextualPrompt(userId);
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: contextualPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      const MAX_TOOL_ROUNDS = 5;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: chatMessages,
          tools: TOOLS,
          tool_choice: "auto",
          max_tokens: 4096,
        });

        const choice = response.choices[0];
        const msg = choice.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          chatMessages.push(msg as any);

          res.write(`data: ${JSON.stringify({ content: "🔍 " })}\n\n`);

          for (const toolCall of msg.tool_calls) {
            const tc = toolCall as any;
            const fnName = tc.function.name;
            let fnArgs: any;
            try {
              fnArgs = JSON.parse(tc.function.arguments);
            } catch {
              fnArgs = {};
            }

            const toolStatusMap: Record<string, string> = {
              search_places: "Cerco nel database...",
              get_place_reviews: "Carico recensioni...",
              create_booking: "Creo prenotazione...",
              search_affiliate: "Cerco link esterni...",
              get_city_costs: "Analizzo costi della città...",
              budget_trip_planner: "Calcolo budget viaggio...",
              web_search: "Ricerca web in corso...",
            };
            const statusMsg = toolStatusMap[fnName] || "Elaboro...";
            res.write(`data: ${JSON.stringify({ content: statusMsg + "\n" })}\n\n`);
            fullResponse += "🔍 " + statusMsg + "\n";

            const result = await executeToolCall(fnName, fnArgs, userId);

            chatMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            } as any);
          }
          continue;
        }

        if (msg.content) {
          const tokens = msg.content;
          fullResponse += tokens;
          const chunkSize = 20;
          for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        }
        break;
      }

      if (!fullResponse.replace(/🔍[^\n]*\n/g, "").trim()) {
        const fallbackMsg = "Mi dispiace, non sono riuscito a elaborare la risposta. Puoi riprovare con una domanda diversa?";
        fullResponse += fallbackMsg;
        res.write(`data: ${JSON.stringify({ content: fallbackMsg })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  app.post("/api/ai/quick-ask", requireAuth, async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "Question is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: BASE_SYSTEM_PROMPT },
          { role: "user", content: question.trim() },
        ],
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content || "";
        if (c) {
          res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in quick-ask:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process question" });
      }
    }
  });

  app.post("/api/ai/recommendations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, context } = req.body;
      const validTypes = ["destinations", "trips", "marketplace"];
      const recType = validTypes.includes(type) ? type : "destinations";
      
      const prompts: Record<string, string> = {
        destinations: `Based on this traveler context: "${context || 'digital nomad looking for new destinations'}". Suggest 5 destinations. Each object must have: city, country, reason (1 sentence), budget (daily USD estimate), bestFor (1-2 words like "surfing & coding"), emoji. Return as JSON object with key "recommendations" containing the array.`,
        trips: `Based on this context: "${context || 'a 2-week trip in Southeast Asia'}". Suggest a trip itinerary. Return as JSON object with keys: title, description (1 sentence), stops (array of {city, country, days, highlights}).`,
        marketplace: `Based on this nomad profile: "${context || 'remote worker traveling internationally'}". Suggest 5 essential products/services. Each: name, category, reason (1 sentence), priceRange. Return as JSON object with key "recommendations" containing the array.`,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a travel recommendation engine. Return ONLY valid JSON objects." },
          { role: "user", content: prompts[recType] },
        ],
        max_tokens: 2048,
        response_format: { type: "json_object" },
      });

      const resContent = response.choices[0]?.message?.content || "{}";
      try {
        const parsed = JSON.parse(resContent);
        res.json(parsed);
      } catch {
        res.json({ recommendations: [] });
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
}
