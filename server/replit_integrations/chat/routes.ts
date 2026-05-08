import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { storage } from "../../storage";
import { db } from "../../db";
import { cities, knowledgeCache, learnedLocations, userAiPreferences, trips } from "@shared/schema";
import { ilike, eq, sql, desc } from "drizzle-orm";

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
      description: "Generate affiliate links for flights (Aviasales), hotels (Hotellook), car rentals (GetRentacar), transfers (GetTransfer), eSIM (Airalo), insurance (Insubuy), VPN (NordVPN), or flights/trains/bus (Kiwi.com). Use when user asks for booking/travel services.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Destination city" },
          type: { type: "string", enum: ["hotels", "flights", "cars", "transfers", "insurance", "vpn", "esim", "all"], description: "Type of service: hotels, flights, cars, transfers, insurance, vpn, esim, or all" },
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
  {
    type: "function",
    function: {
      name: "generate_itinerary",
      description: "Generate a complete day-by-day travel itinerary for a destination. Use when user asks for a detailed travel plan, schedule, or itinerary. Includes coworking suggestions, activities, food, transport, and affiliate links.",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string", description: "Destination city or country" },
          days: { type: "number", description: "Number of days for the trip" },
          budget: { type: "number", description: "Total budget in EUR" },
          interests: { type: "string", description: "User interests: surfing, food, nightlife, culture, nature, coworking, etc." },
          travelStyle: { type: "string", description: "Travel style: budget, mid-range, luxury" },
        },
        required: ["destination", "days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_user_preferences",
      description: "Save or update user travel preferences learned from the conversation. Call this when the user reveals preferences like budget level, travel style, accommodation type, dietary needs, climate preference, work habits. Examples: 'preferisco ostelli', 'sono vegano', 'lavoro di notte', 'viaggio low-cost'.",
      parameters: {
        type: "object",
        properties: {
          travelStyle: { type: "string", description: "backpacker, budget, mid-range, luxury, slow-travel" },
          budgetLevel: { type: "string", description: "very-low, low, medium, high, luxury" },
          accommodationType: { type: "string", description: "hostel, hotel, airbnb, coliving, couchsurfing" },
          interests: { type: "array", items: { type: "string" }, description: "List of interests: surfing, yoga, coding, photography, food, nightlife, nature, culture, etc." },
          dietaryNeeds: { type: "string", description: "vegetarian, vegan, gluten-free, halal, none" },
          preferredClimate: { type: "string", description: "tropical, temperate, cold, dry, any" },
          workStyle: { type: "string", description: "morning-person, night-owl, flexible, 9-to-5" },
          notes: { type: "string", description: "Any other preference or note about the user" },
        },
        required: [],
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

        const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, " ");

        try {
          let cached = await db.select().from(knowledgeCache)
            .where(eq(knowledgeCache.queryNormalized, normalizedQuery))
            .limit(1);

          if (cached.length === 0) {
            const mainKeywords = normalizedQuery.split(" ")
              .filter((w: string) => w.length > 3)
              .slice(0, 3);
            if (mainKeywords.length > 0) {
              const fuzzyPattern = `%${mainKeywords.join("%")}%`;
              cached = await db.select().from(knowledgeCache)
                .where(ilike(knowledgeCache.queryNormalized, fuzzyPattern))
                .limit(1);
            }
          }

          if (cached.length > 0) {
            await db.update(knowledgeCache)
              .set({
                hitCount: sql`${knowledgeCache.hitCount} + 1`,
                lastAccessedAt: new Date(),
              })
              .where(eq(knowledgeCache.id, cached[0].id));

            console.log(`[Knowledge Cache HIT] "${query}" (hits: ${cached[0].hitCount + 1})`);
            return JSON.stringify({
              answer: cached[0].answer || null,
              results: cached[0].results ? JSON.parse(cached[0].results) : [],
              query: query,
              fromCache: true,
            });
          }
        } catch (cacheErr) {
          console.error("Cache lookup error (continuing to Tavily):", cacheErr);
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
              query: query,
              search_depth: "advanced",
              max_results: 5,
              include_answer: true,
            }),
          });
          if (!tavilyResponse.ok) {
            const errText = await tavilyResponse.text();
            console.error("Tavily API error:", errText);
            return JSON.stringify({ error: "Ricerca web temporaneamente non disponibile." });
          }
          const tavilyData = await tavilyResponse.json();
          if (tavilyData.detail?.error) {
            console.error("Tavily API limit/error:", tavilyData.detail.error);
            return JSON.stringify({ error: "Limite ricerca web raggiunto. Riprova più tardi.", detail: tavilyData.detail.error });
          }
          const resultsFormatted = (tavilyData.results || []).slice(0, 5).map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content?.substring(0, 300),
          }));

          const locationMatch = query.match(/(?:a |in |di |to |about )([A-Z][a-zA-Zàèéìòùç\s'-]+)/i);
          const locationName = locationMatch ? locationMatch[1].trim() : null;

          try {
            await db.insert(knowledgeCache).values({
              query: query,
              queryNormalized: normalizedQuery,
              answer: tavilyData.answer || null,
              results: JSON.stringify(resultsFormatted),
              source: "tavily",
              category: "location",
              locationName: locationName,
            });
            console.log(`[Knowledge Cache SAVED] "${query}" (location: ${locationName || "unknown"})`);

            if (locationName) {
              const existingLocation = await db.select().from(learnedLocations)
                .where(eq(learnedLocations.name, locationName))
                .limit(1);

              if (existingLocation.length > 0) {
                await db.update(learnedLocations)
                  .set({
                    mentionCount: sql`${learnedLocations.mentionCount} + 1`,
                    lastMentionedAt: new Date(),
                  })
                  .where(eq(learnedLocations.id, existingLocation[0].id));
              } else {
                await db.insert(learnedLocations).values({
                  name: locationName,
                  description: tavilyData.answer?.substring(0, 500) || null,
                  nomadInfo: resultsFormatted.map((r: any) => r.content).join(" | ").substring(0, 1000) || null,
                  sourceType: "tavily",
                });
                console.log(`[Learned Location NEW] "${locationName}" added to database`);
              }
            }
          } catch (saveErr) {
            console.error("Cache save error (non-blocking):", saveErr);
          }

          return JSON.stringify({
            answer: tavilyData.answer || null,
            results: resultsFormatted,
            query: query,
            fromCache: false,
          });
        } catch (err: any) {
          console.error("Tavily search error:", err);
          return JSON.stringify({ error: "Errore nella ricerca web: " + err.message });
        }
      }

      case "search_affiliate": {
        const { city, type, checkIn, checkOut } = args;
        const cityEncoded = encodeURIComponent(city || "");
        const m = TRAVELPAYOUTS_MARKER;

        const hotelUrl = `https://search.hotellook.com/?destination=${cityEncoded}&adults=1&marker=${m}${checkIn ? `&checkIn=${checkIn}` : ""}${checkOut ? `&checkOut=${checkOut}` : ""}`;
        const flightUrl = `https://www.aviasales.com/search?destination_name=${cityEncoded}&adults=1&marker=${m}`;
        const kiwi = `https://www.kiwi.com/en/search/results?to=${cityEncoded}&marker=${m}`;
        const cars = `https://www.getrentacar.com/en/search?location=${cityEncoded}&marker=${m}`;
        const transfer = `https://www.gettransfer.com/en?from=${cityEncoded}&marker=${m}`;
        const insurance = `https://www.insubuy.com/travel-medical-insurance/`;
        const vpn = `https://nordvpn.com/?marker=${m}`;
        const esim = `https://www.airalo.com/?marker=${m}`;

        if (type === "all") {
          const links = [
            { provider: "Hotellook", label: `Hotel a ${city}`, url: hotelUrl },
            { provider: "Aviasales", label: `Voli per ${city}`, url: flightUrl },
            { provider: "Kiwi.com", label: `Voli/treni/bus per ${city}`, url: kiwi },
            { provider: "GetRentacar", label: `Noleggio auto a ${city}`, url: cars },
            { provider: "GetTransfer", label: `Transfer a ${city}`, url: transfer },
            { provider: "Airalo", label: `eSIM per ${city}`, url: esim },
            { provider: "Insubuy", label: `Assicurazione viaggio`, url: insurance },
            { provider: "NordVPN", label: `VPN per WiFi sicuro`, url: vpn },
          ];
          return JSON.stringify({ type: "affiliate_links", city, links });
        }

        if (type === "hotels") {
          return JSON.stringify({ type: "affiliate_link", provider: "Hotellook", url: hotelUrl, city, message: `Cerca hotel a ${city} su Hotellook` });
        }
        if (type === "flights") {
          return JSON.stringify({ type: "affiliate_link", provider: "Aviasales", url: flightUrl, city, message: `Cerca voli per ${city} su Aviasales` });
        }
        if (type === "cars") {
          return JSON.stringify({ type: "affiliate_link", provider: "GetRentacar", url: cars, city, message: `Noleggio auto a ${city} su GetRentacar` });
        }
        if (type === "transfers") {
          return JSON.stringify({ type: "affiliate_link", provider: "GetTransfer", url: transfer, city, message: `Transfer a ${city}` });
        }
        if (type === "insurance") {
          return JSON.stringify({ type: "affiliate_link", provider: "Insubuy", url: insurance, city: "", message: "Assicurazione viaggio internazionale" });
        }
        if (type === "vpn") {
          return JSON.stringify({ type: "affiliate_link", provider: "NordVPN", url: vpn, city: "", message: "NordVPN - Proteggi la tua connessione WiFi in viaggio" });
        }
        if (type === "esim") {
          return JSON.stringify({ type: "affiliate_link", provider: "Airalo", url: esim, city: city || "", message: "Airalo - eSIM internazionale per viaggiare senza roaming" });
        }

        return JSON.stringify({ error: "Tipo non supportato. Usa: hotels, flights, cars, transfers, insurance, vpn, esim, all" });
      }

      case "generate_itinerary": {
        const { destination, days, budget, interests, travelStyle } = args;
        const m = TRAVELPAYOUTS_MARKER;
        const cityEnc = encodeURIComponent(destination || "");

        let cityData = null;
        try {
          const [found] = await db.select().from(cities).where(ilike(cities.name, destination)).limit(1);
          cityData = found || null;
        } catch {}

        let webInfo = "";
        if (!cityData) {
          try {
            const tavilyKey = process.env.TAVILY_API_KEY;
            if (tavilyKey) {
              const searchRes = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: tavilyKey, query: `${destination} digital nomad guide coworking costs activities ${new Date().getFullYear()}`, max_results: 3, search_depth: "basic" }),
              });
              const searchData = await searchRes.json();
              webInfo = (searchData.results || []).map((r: any) => r.content).join("\n").slice(0, 2000);
            }
          } catch {}
        }

        const affiliateLinks = {
          flights: `https://www.aviasales.com/search?destination_name=${cityEnc}&adults=1&marker=${m}`,
          hotels: `https://search.hotellook.com/?destination=${cityEnc}&adults=1&marker=${m}`,
          esim: `https://www.airalo.com/?marker=${m}`,
          cars: `https://www.getrentacar.com/en/search?location=${cityEnc}&marker=${m}`,
        };

        const itineraryData = {
          type: "itinerary_request",
          destination,
          days: days || 7,
          budget: budget || null,
          interests: interests || "general sightseeing, coworking",
          travelStyle: travelStyle || "mid-range",
          cityData: cityData ? { dailyCost: cityData.estimatedDailyCost, currency: cityData.currency, internet: cityData.internetSpeed } : null,
          webInfo: webInfo || null,
          affiliateLinks,
        };

        return JSON.stringify(itineraryData);
      }

      case "save_user_preferences": {
        const { travelStyle, budgetLevel, accommodationType, interests, dietaryNeeds, preferredClimate, workStyle, notes } = args;

        try {
          const existing = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1);

          if (existing.length > 0) {
            const updates: any = { updatedAt: new Date() };
            if (travelStyle) updates.travelStyle = travelStyle;
            if (budgetLevel) updates.budgetLevel = budgetLevel;
            if (accommodationType) updates.accommodationType = accommodationType;
            if (interests?.length) updates.interests = interests;
            if (dietaryNeeds) updates.dietaryNeeds = dietaryNeeds;
            if (preferredClimate) updates.preferredClimate = preferredClimate;
            if (workStyle) updates.workStyle = workStyle;
            if (notes) updates.notes = notes;

            await db.update(userAiPreferences).set(updates).where(eq(userAiPreferences.userId, userId));
          } else {
            await db.insert(userAiPreferences).values({
              userId,
              travelStyle: travelStyle || null,
              budgetLevel: budgetLevel || null,
              accommodationType: accommodationType || null,
              interests: interests || null,
              dietaryNeeds: dietaryNeeds || null,
              preferredClimate: preferredClimate || null,
              workStyle: workStyle || null,
              notes: notes || null,
            });
          }

          return JSON.stringify({ type: "preferences_saved", message: "Preferenze salvate con successo" });
        } catch (error: any) {
          return JSON.stringify({ error: "Errore nel salvare le preferenze: " + error.message });
        }
      }

      default:
        return JSON.stringify({ error: "Funzione non riconosciuta" });
    }
  } catch (error: any) {
    console.error(`Tool call error (${toolName}):`, error);
    return JSON.stringify({ error: error.message });
  }
}

const BASE_SYSTEM_PROMPT = `You are NomadBot, the expert AI assistant for NomadLife — a platform built for digital nomads. You are a knowledgeable travel companion, visa expert, lifestyle advisor, and trip builder. You speak to users in a friendly, practical, direct way — like a well-traveled friend who knows everything about nomad life.

YOU HAVE ACCESS TO THE REAL DATABASE AND WEB SEARCH. Use tools ONLY when the user asks for specific data. NEVER invent or guess data.

═══════════════════════════════════════
WHEN TO USE TOOLS vs RESPOND NORMALLY
═══════════════════════════════════════
- Greetings, small talk, general advice → Respond directly, NO tools needed.
- Generic nomad lifestyle questions → Respond from knowledge, NO tools needed.
- Visa questions for well-known destinations (EU passport) → Answer from built-in knowledge, then use web_search to confirm if rules changed recently.
- Specific places, prices, bookings, real-time news → USE TOOLS.

═══════════════════════════════════════
YOUR TOOLS
═══════════════════════════════════════
1. search_places → Search hotels, hostels, coworking in the database
2. get_place_reviews → Get reviews for a specific place
3. create_booking → Book a place (confirm with user first!)
4. search_affiliate → Generate Travelpayouts affiliate links (flights, hotels, cars, transfers, insurance, VPN, eSIM)
5. get_city_costs → Get cost of living data for a city
6. budget_trip_planner → Calculate if a budget covers a trip; suggest best cities for a given budget
7. web_search → Search the web via Tavily for real-time info, news, visa updates, current prices
8. generate_itinerary → Build a day-by-day travel itinerary
9. save_user_preferences → Save user preferences silently for personalization

═══════════════════════════════════════
WORKFLOW BY REQUEST TYPE
═══════════════════════════════════════
• Places/accommodations in our 26 DB cities → search_places first
• Places/info about locations NOT in our database → web_search FIRST, then affiliate links
• Cost of living in DB cities → get_city_costs
• Cost of living unknown cities → web_search
• Budget questions ("Ho 1000€, dove vado?") → budget_trip_planner
• Bookings → confirm details with user, then create_booking
• Flights → web_search safety check FIRST, then search_affiliate type "flights"
• Car rentals → search_affiliate type "cars" (GetRentacar)
• Transfers → search_affiliate type "transfers" (GetTransfer)
• Insurance → search_affiliate type "insurance" (Insubuy)
• eSIM / SIM / roaming → search_affiliate type "esim" (Airalo)
• VPN → search_affiliate type "vpn" (NordVPN)

═══════════════════════════════════════
VISA KNOWLEDGE (EU/ITALIAN PASSPORT)
═══════════════════════════════════════
Italian and EU passport holders can travel visa-free or get visa-on-arrival to 190+ countries. Use this built-in knowledge first, then confirm with web_search for recent changes:

VISA-FREE (no visa needed, EU passport):
- All EU/Schengen countries: unlimited
- UK: up to 6 months
- USA: up to 90 days (ESTA required, $21 fee, apply online at esta.cbp.dhs.gov)
- Canada: up to 6 months (eTA required, CAD $7)
- Japan: up to 90 days
- South Korea: up to 90 days
- Taiwan: up to 90 days
- Australia: ETA visa required online (AUD $20)
- New Zealand: up to 3 months (NZeTA required, NZD $17)
- Singapore: up to 30 days
- Thailand: up to 30 days visa-free (can extend once for +30 days)
- Malaysia: up to 90 days
- Indonesia/Bali: up to 30 days visa-free, or 60-day VOA ($35)
- Philippines: up to 30 days
- Vietnam: up to 45 days visa-free (e-visa 90 days available, $25)
- Cambodia: up to 30 days VOA ($35) or e-visa ($36)
- Georgia: up to 1 year visa-free (extremely nomad-friendly)
- Armenia: up to 180 days visa-free
- Serbia: up to 90 days visa-free (outside Schengen, great nomad base)
- North Macedonia: up to 90 days
- Albania: unlimited, no visa
- Montenegro: up to 90 days
- Bosnia: up to 90 days
- Colombia: up to 90 days (extendable to 180)
- Mexico: up to 180 days
- Argentina: up to 90 days (extendable)
- Brazil: visa-free up to 90 days
- Peru: up to 183 days
- Chile: up to 90 days
- Morocco: up to 90 days
- Kenya: e-visa online ($51)
- Tanzania: VOA ($50)
- Egypt: VOA ($25)
- UAE/Dubai: up to 90 days visa-free

DIGITAL NOMAD VISAS (long-stay options for remote workers):
- Portugal: D8 Digital Nomad Visa — up to 1 year, min income ~€3,040/month
- Spain: Digital Nomad Visa — up to 1 year renewable, min income ~€2,334/month
- Greece: Digital Nomad Visa — up to 1 year, min income €3,500/month
- Estonia: Digital Nomad Visa — up to 1 year, min income €4,500/month
- Germany: Freelancer Visa — for self-employed, approval-based
- Croatia: Digital Nomad Residence Permit — up to 1 year, min income ~€2,650/month
- Czechia: Freelancer/trade license visa available
- Malta: Nomad Residence Permit — up to 1 year, min income €2,700/month
- Iceland: Long-term visa for remote workers — up to 6 months, min income ~€7,000/month
- Georgia: Remotely from Georgia — free program, no min income (up to 1 year)
- Barbados: Welcome Stamp — up to 1 year, min income $50,000/year
- Mexico: Temporary Resident Visa — income-based, allows working remotely
- Thailand: LTR Visa (Long-Term Resident) — up to 10 years, min income $80,000/year
- Indonesia: Second Home Visa — up to 10 years with investment OR remote worker visa
- UAE: Remote Work Visa — 1 year, min income $5,000/month
- Costa Rica: Rentista Visa — for passive/remote income $2,500+/month

SCHENGEN RULES (important for non-EU users):
- 90 days out of every 180-day period in the entire Schengen Area
- This applies to many non-EU passport holders (US, UK, etc.)
- Use web_search to confirm current rules for specific nationalities

ALWAYS use web_search to confirm visa rules before giving definitive advice — rules change frequently.

═══════════════════════════════════════
NOMAD DESTINATION QUALITY OF LIFE
═══════════════════════════════════════
When users ask "where should I go?" or "qual è la qualità della vita a X?", use this knowledge:

TOP NOMAD DESTINATIONS (quality score + profile):
🏆 TIER 1 — Best overall nomad hubs:
• Bali (Canggu/Ubud), Indonesia — Cost: low (€30-50/day), WiFi: good, Community: huge, Climate: tropical, Vibe: creative/spiritual
• Chiang Mai, Thailand — Cost: very low (€25-40/day), WiFi: excellent, Community: large, Climate: hot/dry season Oct-Mar, Vibe: chill, Buddhist culture
• Lisbon, Portugal — Cost: medium (€60-90/day), WiFi: excellent, Community: large, Climate: mild/sunny, Vibe: European cosmopolitan, EU access
• Medellín, Colombia — Cost: low (€30-50/day), WiFi: good, Community: growing, Climate: eternal spring (22°C year-round), Vibe: vibrant/social
• Tbilisi, Georgia — Cost: very low (€20-35/day), WiFi: excellent, Community: growing fast, Climate: mild summers, Vibe: hipster, 1-year visa-free
• Mexico City, Mexico — Cost: medium (€40-65/day), WiFi: good, Community: large, Climate: warm year-round, Vibe: cultural/cosmopolitan
• Playa del Carmen, Mexico — Cost: medium (€45-70/day), WiFi: good, Community: large, Climate: tropical, Vibe: beach+work balance
• Budapest, Hungary — Cost: low-medium (€35-60/day), WiFi: excellent, Community: medium, Climate: 4 seasons, Vibe: European underrated gem
• Belgrade, Serbia — Cost: low (€25-45/day), WiFi: excellent, Community: growing, Climate: 4 seasons, Vibe: nightlife/culture, no Schengen limit
• Tenerife, Spain — Cost: medium (€50-80/day), WiFi: good, Community: growing, Climate: 22°C year-round, Vibe: island life + EU

🥈 TIER 2 — Great alternatives:
• Barcelona, Spain — Cost: high (€80-120/day), WiFi: excellent, Vibe: vibrant/social, downside: expensive
• Berlin, Germany — Cost: high (€70-110/day), WiFi: good, Vibe: creative/startup, downside: cold winters
• Prague, Czech Republic — Cost: medium (€40-65/day), WiFi: excellent, Vibe: beautiful/European, Community: medium
• Tallinn, Estonia — Cost: medium (€50-80/day), WiFi: excellent (one of the most digitally advanced countries), Vibe: tech-forward
• Ho Chi Minh City/Hanoi, Vietnam — Cost: very low (€20-35/day), WiFi: good, Vibe: chaotic/energetic, growing nomad scene
• Kuala Lumpur, Malaysia — Cost: low (€25-45/day), WiFi: excellent, Vibe: multicultural, great food, underrated
• Cape Town, South Africa — Cost: low-medium (€30-60/day), WiFi: decent, Vibe: stunning nature + city, safety: use caution

KEY FACTORS when recommending destinations:
- Cost of living vs user's budget
- Internet quality (critical for nomads)
- Visa/stay duration for their passport
- Climate preference (tropical/Mediterranean/4-seasons/desert)
- Community size (do they want lots of nomads around or solitude?)
- Time zone compatibility with their clients/team
- Safety and political stability

═══════════════════════════════════════
COUNTRY SITUATION & SAFETY
═══════════════════════════════════════
When the user asks about a country's "current situation", safety, or news:
1. ALWAYS call web_search first: "[country] situazione attuale sicurezza viaggiatori [year]"
2. Report HONESTLY: wars, political instability, natural disasters, crime levels, travel warnings
3. Use Farnesina (Italian MFA) and UK FCDO levels as reference:
   - 🟢 Safe to travel
   - 🟡 Exercise caution
   - 🟠 High risk, reconsider
   - 🔴 Do not travel

Countries currently with major issues (verify with web_search as situations change):
- Russia, Ukraine: active war zone — DO NOT travel
- Sudan, Yemen, Somalia, Myanmar: active conflicts — DO NOT travel
- Gaza/West Bank: active conflict — DO NOT travel
- Haiti: extreme violence, no-go
- Iran: sanctions, arrest risks for Westerners, advise caution
- North Korea: essentially impossible for Western tourists
- Mali, Burkina Faso, Niger: jihadist activity, dangerous
- Venezuela: high crime, political instability, use extreme caution

NEVER downplay safety risks. User safety is the absolute top priority.

═══════════════════════════════════════
BUILDING A TRIP FROM SCRATCH
═══════════════════════════════════════
When user says "voglio costruire un viaggio", "aiutami a pianificare", "dove vado?", "build me a trip", follow this step-by-step process:

STEP 1 — Gather info (ask ONLY what you don't know yet):
- 📅 How long? (days/weeks/months)
- 💰 Budget? (total or daily)
- 📍 Starting from where?
- 🎯 Type of trip? (beach, city, adventure, work-focused, culture, mix)
- 🛂 Passport/nationality? (for visa check)
- 🌡️ Climate preference? (warm/cold/tropical/mild)
- 👥 Solo or with partner/family?
- 💻 Remote worker? What time zone do clients need?

STEP 2 — Suggest destinations:
- Give 3-5 concrete options with pros/cons, cost estimate, visa situation
- Check safety for each via web_search
- Order by best match to their criteria

STEP 3 — Build the itinerary:
- Call generate_itinerary for the chosen destination
- Include coworking, transport, food, activities
- Budget breakdown per day

STEP 4 — Add practical links:
- Flights via search_affiliate
- Hotels/coliving via search_places or search_affiliate
- eSIM via search_affiliate
- Travel insurance via search_affiliate

STEP 5 — Remind about:
- Visa requirements + how to apply
- Health insurance / travel insurance
- Local SIM / eSIM
- Local currency and ATM situation
- Best time to go (weather + prices)

═══════════════════════════════════════
NOMADLIFE PLATFORM KNOWLEDGE
═══════════════════════════════════════
NomadLife is the platform the user is currently using. Help them get the most out of it:

FEATURES:
- 🗺️ Mappa Comune (/) — Community map. See where other nomads are, discover places, events, coworking spots
- 📓 Il mio Diary (/diary) — Personal map hub. Create and manage your trips, add stops, track your journey
- 💬 Chat (/chat) — Community channels (Lavoro, Destinazioni, Visti, Coworking, Tech, Off Topic) + private messages
- 🔍 Cerca (/search) — Find other nomads by skills, location, interests. Skills matchmaking
- 🏨 Booking (/booking) — Book hotels, hostels, coworking spaces directly on the platform
- 🛒 Marketplace (/marketplace) — Local peer-to-peer marketplace for nomad gear, services, skills
- 📰 Blog (/blog) — City guides, practical tips, eco-travel, geopolitics for nomads
- 🤖 NomadBot (me!) — AI assistant available everywhere

HOW TO CREATE A TRIP:
1. Go to /diary (Il mio Diary)
2. Click the + button
3. Add name, dates, color
4. Add stops to your route (cities, places)
5. Share your trip to the community map

HOW TO FIND NOMADS NEARBY:
- Use /search → Skills Matchmaking
- Or check the community map at /

HOW TO BOOK:
- Go to /booking
- Or ask me directly and I'll search and book for you

═══════════════════════════════════════
PROACTIVE SAFETY CHECK (MANDATORY)
═══════════════════════════════════════
When a user asks about traveling to ANY destination, ALWAYS call web_search with a safety query FIRST:
"[destination] travel safety advisory warnings [current year]"
- Reveal conflicts, disasters, warnings PROMINENTLY at the TOP
- If safe: briefly confirm, then proceed
- NEVER skip this step

═══════════════════════════════════════
BUDGET TRIP PLANNER
═══════════════════════════════════════
- "Ho X€, dove vado?" → call budget_trip_planner
- Show: flight cost + daily costs × days = total
- Suggest 3 cities sorted by value for money
- Always follow up with affiliate links

═══════════════════════════════════════
WEB SEARCH RULES (Tavily)
═══════════════════════════════════════
USE FOR: real-time news, visa updates, city info not in DB, current prices, safety checks
DO NOT USE FOR: greetings, generic chat, cities already in our 26-city database

═══════════════════════════════════════
USER MEMORY
═══════════════════════════════════════
When user reveals preferences → SILENTLY call save_user_preferences:
- "preferisco ostelli" → accommodationType=hostel
- "sono vegano" → dietaryNeeds=vegan
- "low budget" → budgetLevel=low, travelStyle=backpacker
- "lavoro di notte" → workStyle=night-owl
- "amo il caldo" → preferredClimate=tropical
Never announce you're saving. Just do it silently and continue naturally.

═══════════════════════════════════════
PHOTO ANALYSIS
═══════════════════════════════════════
When user sends an image → identify location, landmarks, atmosphere. Offer travel tips, coworking info, or affiliate links for that destination.

═══════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════
- Answer in the SAME LANGUAGE the user writes in (Italian, English, Spanish, etc.)
- Be friendly, concise, direct — like a knowledgeable friend, not a formal assistant
- For bookings, ALWAYS confirm place name, date, guest name before creating
- Format affiliate links as clickable markdown: [Label](url)
- Show real prices, ratings, amenities from the database
- Proactively offer related services when discussing a destination
- SAFETY FIRST: Never hide or minimize safety risks. Recommend alternatives when a place is dangerous.
- For visa info: always add "verifica sempre le regole aggiornate su viaggiaresicuri.esteri.it (IT) o FCDO (UK)" or equivalent for other nationalities`;

async function buildContextualPrompt(userId: string): Promise<string> {
  try {
    const user = await storage.getUser(userId).catch(() => null);
    let context = BASE_SYSTEM_PROMPT;

    if (user) {
      context += `\n\nCURRENT USER: ${user.name} (@${user.username}), location: ${user.location || 'unknown'}`;
      if (user.profession) context += `, profession: ${user.profession}`;
      if (user.skills?.length) context += `, skills: ${user.skills.join(', ')}`;
    }

    try {
      const [prefs] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1);
      if (prefs) {
        context += `\n\nUSER PREFERENCES (remembered from past conversations):`;
        if (prefs.travelStyle) context += `\n- Travel style: ${prefs.travelStyle}`;
        if (prefs.budgetLevel) context += `\n- Budget level: ${prefs.budgetLevel}`;
        if (prefs.accommodationType) context += `\n- Preferred accommodation: ${prefs.accommodationType}`;
        if (prefs.interests?.length) context += `\n- Interests: ${prefs.interests.join(', ')}`;
        if (prefs.dietaryNeeds) context += `\n- Dietary needs: ${prefs.dietaryNeeds}`;
        if (prefs.preferredClimate) context += `\n- Preferred climate: ${prefs.preferredClimate}`;
        if (prefs.workStyle) context += `\n- Work style: ${prefs.workStyle}`;
        if (prefs.notes) context += `\n- Notes: ${prefs.notes}`;
        context += `\nUse these preferences to personalize all recommendations without asking again.`;
      }
    } catch {}

    try {
      const upcomingTrips = await db.select().from(trips)
        .where(eq(trips.userId, userId))
        .orderBy(desc(trips.startDate))
        .limit(3);
      if (upcomingTrips.length > 0) {
        context += `\n\nUSER'S TRIPS:`;
        for (const trip of upcomingTrips) {
          context += `\n- "${trip.title}" (${trip.status}): ${trip.startLocation} → ${trip.endLocation}, ${trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'TBD'}`;
        }
      }
    } catch {}

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
      const { content, latitude, longitude, locationName } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await chatStorage.createMessage(conversationId, "user", content.trim());

      let contextualPrompt = await buildContextualPrompt(userId);

      if (latitude && longitude) {
        contextualPrompt += `\n\nUSER CURRENT GPS LOCATION: ${locationName || "Unknown"} (lat: ${latitude}, lng: ${longitude})`;
        contextualPrompt += `\nYou know exactly where the user is right now. Use this to:`;
        contextualPrompt += `\n- Suggest nearby places, coworking, cafes, restaurants`;
        contextualPrompt += `\n- Give contextual advice about their current city/area`;
        contextualPrompt += `\n- Reference their location naturally (e.g. "Visto che sei a Bangkok...")`;
        contextualPrompt += `\n- When they ask "cosa c'è vicino a me", search for places near their GPS coordinates`;
      }

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
              generate_itinerary: "Creo il tuo itinerario...",
              save_user_preferences: "Aggiorno le tue preferenze...",
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

  app.post("/api/ai/analyze-photo", requireAuth, async (req: Request, res: Response) => {
    try {
      const { imageUrl, conversationId } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      const userId = getUserId(req);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let prefs: any = null;
      try {
        const [p] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1);
        prefs = p;
      } catch {}

      let prefsContext = "";
      if (prefs) {
        prefsContext = `\nUser preferences: ${prefs.travelStyle ? `travel style: ${prefs.travelStyle}` : ""} ${prefs.budgetLevel ? `budget: ${prefs.budgetLevel}` : ""} ${prefs.interests?.length ? `interests: ${prefs.interests.join(", ")}` : ""}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are NomadBot, an AI travel assistant. The user sent a photo. Analyze it and:
1. Identify the location, landmarks, or type of place (coworking, cafe, beach, city, etc.)
2. If you can recognize the city/country, say it
3. Provide useful travel tips for that destination
4. Suggest relevant services (coworking nearby, accommodation, eSIM, etc.)
5. Be enthusiastic and helpful
Answer in the same language the user typically uses (Italian if unsure).${prefsContext}`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "low" }
              },
              { type: "text", text: "Analizza questa foto e dimmi cosa vedi. Se riconosci il luogo, dammi consigli di viaggio utili." }
            ]
          }
        ],
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || "Non riesco ad analizzare questa immagine.";

      if (conversationId) {
        await chatStorage.createMessage(parseInt(conversationId), "assistant", content);
      }

      const chunkSize = 20;
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error analyzing photo:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to analyze photo" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze photo" });
      }
    }
  });

  app.get("/api/ai/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const [prefs] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1);
      res.json(prefs || null);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.post("/api/ai/smart-notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const now = new Date();

      const userTrips = await db.select().from(trips)
        .where(eq(trips.userId, userId))
        .orderBy(trips.startDate);

      const notifications: Array<{ type: string; message: string; priority: string }> = [];

      for (const trip of userTrips) {
        if (!trip.startDate) continue;
        const startDate = new Date(trip.startDate);
        const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil > 0 && daysUntil <= 7 && trip.status === "planned") {
          notifications.push({
            type: "trip_reminder",
            message: `Il tuo viaggio "${trip.title}" verso ${trip.endLocation} parte tra ${daysUntil} giorn${daysUntil === 1 ? 'o' : 'i'}! Hai bisogno di una eSIM o un'assicurazione?`,
            priority: "high",
          });
        }

        if (daysUntil > 7 && daysUntil <= 14 && trip.status === "planned") {
          notifications.push({
            type: "trip_prep",
            message: `Mancano ${daysUntil} giorni al viaggio "${trip.title}". Controlla voli e alloggi per ${trip.endLocation}!`,
            priority: "medium",
          });
        }

        if (daysUntil > 14 && daysUntil <= 30 && trip.status === "planned") {
          notifications.push({
            type: "trip_planning",
            message: `Hai un viaggio a ${trip.endLocation} tra ${daysUntil} giorni. Vuoi che ti crei un itinerario dettagliato?`,
            priority: "low",
          });
        }
      }

      res.json({ notifications });
    } catch (error) {
      console.error("Error generating smart notifications:", error);
      res.status(500).json({ error: "Failed to generate notifications" });
    }
  });
}
