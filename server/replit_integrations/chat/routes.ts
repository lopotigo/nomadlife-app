import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { storage } from "../../storage";

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
          type: { type: "string", enum: ["hotels", "flights", "cars", "transfers", "insurance", "all"], description: "Type of service: hotels, flights, cars, transfers, insurance, or all for a complete list" },
          checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD) for hotels" },
          checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD) for hotels" },
        },
        required: ["city", "type"],
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

        return JSON.stringify({ error: "Tipo non supportato. Usa: hotels, flights, cars, transfers, insurance, all" });
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

YOU HAVE ACCESS TO THE REAL DATABASE. You MUST use your tools to answer questions about places, hotels, hostels, coworking spaces. NEVER invent or guess data.

YOUR WORKFLOW:
1. When the user asks about accommodations or places in a city → call search_places with the city name
2. Present the REAL results from the database with names, prices, ratings
3. If the user asks for reviews or more details → call get_place_reviews
4. If the user says "prenota", "book", "reserva" or confirms a booking → call create_booking
5. If NO results are found in the database → call search_affiliate with type "all" to provide a complete set of booking links
6. After booking, show a confirmation summary: "✅ Prenotazione effettuata per [Nome Hotel], check-in [data], stato: confermata"
7. For flights → use search_affiliate with type "flights" (Aviasales + Kiwi.com)
8. For car rentals → use search_affiliate with type "cars" (Rentalcars)
9. For airport/city transfers → use search_affiliate with type "transfers" (GetTransfer)
10. For travel insurance → use search_affiliate with type "insurance" (Insubuy)

IMPORTANT RULES:
- ALWAYS search the database first before responding about places/accommodations
- Show real prices, ratings, and amenities from the database
- For bookings, ALWAYS confirm place name, date, and guest name before creating
- When showing affiliate links, format them as clickable markdown links: [Label](url)
- Answer in the same language the user writes in (Italian, English, Spanish, etc.)
- Be friendly, concise, and practical. Use emojis sparingly.
- When presenting places, format them clearly with name, type, price, rating
- When the user asks about a city, proactively offer ALL useful services (hotels, flights, cars, transfers, insurance) using search_affiliate with type "all"
- Available affiliate services: Hotellook (hotels), Aviasales (flights), Kiwi.com (low-cost flights), Rentalcars (car rental), GetTransfer (transfers), Insubuy (travel insurance)`;

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
