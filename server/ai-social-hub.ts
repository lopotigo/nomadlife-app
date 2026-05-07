import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { eq, and, desc, sql, or, gte, lte, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}

function getUserId(req: Request): string {
  return (req.user as any)?.id;
}

export function registerAiSocialHubRoutes(app: Express): void {

  // ========== USER ACTIVITY LOGGING ==========
  app.post("/api/ai/track-activity", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { activityType, metadata, location } = req.body;
      if (!activityType) return res.status(400).json({ error: "activityType required" });

      await db.insert(schema.userActivityLog).values({
        userId,
        activityType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        location: location || null,
      });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI PROFILE ANALYSIS ==========
  app.get("/api/ai/my-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const interests = await db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)).orderBy(desc(schema.userInterests.confidence));
      res.json({ interests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/analyze-profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const [userPosts, userTrips, userActivities, userExpenses] = await Promise.all([
        db.select().from(schema.posts).where(eq(schema.posts.userId, userId)).orderBy(desc(schema.posts.createdAt)).limit(30),
        db.select().from(schema.trips).where(eq(schema.trips.userId, userId)).orderBy(desc(schema.trips.createdAt)).limit(10),
        db.select().from(schema.userActivityLog).where(eq(schema.userActivityLog.userId, userId)).orderBy(desc(schema.userActivityLog.createdAt)).limit(50),
        db.execute(sql`
          SELECT te.* FROM trip_expenses te
          JOIN trip_stops ts ON te.stop_id = ts.id
          JOIN trips t ON ts.trip_id = t.id
          WHERE t.user_id = ${userId}
          ORDER BY te.created_at DESC LIMIT 30
        `),
      ]);

      const postContents = userPosts.map(p => `[${p.location || ''}] ${p.content}`).join("\n");
      const tripSummary = userTrips.map(t => `${t.title}: ${t.startLocation} → ${t.endLocation} (${t.status})`).join("\n");
      const activitySummary = userActivities.map(a => `${a.activityType}: ${a.metadata || ''} ${a.location || ''}`).join("\n");
      const expenseSummary = (userExpenses.rows as any[]).map((e: any) => `${e.type}: ${e.name} (${e.cost}${e.currency || 'EUR'}) rating:${e.rating || 'N/A'}`).join("\n");

      const prompt = `Analyze this digital nomad's activity data and extract their interests/preferences as structured tags.

USER POSTS:
${postContents || "No posts yet"}

TRIPS:
${tripSummary || "No trips yet"}

RECENT ACTIVITY:
${activitySummary || "No tracked activity"}

EXPENSES:
${expenseSummary || "No expenses"}

Extract interest tags. Categories: food, lifestyle, transport, accommodation, activity, budget, climate, tech, social.
For each tag, provide a confidence score (0.0-1.0).
Examples: vegetarian (food, 0.8), surfer (activity, 0.7), budget_traveler (budget, 0.9), beach_lover (climate, 0.6), coworking_fan (lifestyle, 0.8), eco_conscious (transport, 0.7)

Return JSON: { "interests": [{ "category": "...", "tag": "...", "confidence": 0.0-1.0 }] }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a user profiling engine for a digital nomad platform. Analyze behavior to extract interest tags. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { interests: [] }; }

      const newInterests = parsed.interests || [];

      await db.delete(schema.userInterests).where(eq(schema.userInterests.userId, userId));

      if (newInterests.length > 0) {
        await db.insert(schema.userInterests).values(
          newInterests.map((i: any) => ({
            userId,
            category: i.category || "lifestyle",
            tag: i.tag || "unknown",
            confidence: Math.min(1, Math.max(0, i.confidence || 0.5)),
            source: "ai_analysis",
          }))
        );
      }

      const saved = await db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)).orderBy(desc(schema.userInterests.confidence));

      res.json({ interests: saved, analyzed: true });
    } catch (error: any) {
      console.error("Profile analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SMART PRODUCT RECOMMENDATIONS ==========
  app.get("/api/ai/smart-products", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const [interests, products] = await Promise.all([
        db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)),
        db.select().from(schema.products).where(eq(schema.products.isActive, true)),
      ]);

      if (interests.length === 0 || products.length === 0) {
        return res.json({ recommendations: products.slice(0, 6), reason: "general", profileComplete: false });
      }

      const interestTags = interests.map(i => `${i.tag} (${i.category}, confidence: ${i.confidence})`).join(", ");
      const productList = products.map(p => `ID:${p.id} | ${p.name} | ${p.category} | ${p.description?.substring(0, 80) || ''} | tags: ${p.tags?.join(',') || 'none'}`).join("\n");

      const prompt = `Given this user's interest profile:
${interestTags}

And these available marketplace products:
${productList}

Rank the TOP 6 most relevant products for this user. Explain briefly why each matches.
Return JSON: { "recommendations": [{ "productId": "...", "reason": "short reason", "matchScore": 0.0-1.0 }] }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a product recommendation engine. Match products to user interests. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { recommendations: [] }; }

      const recs = parsed.recommendations || [];
      const enriched = recs.map((r: any) => {
        const product = products.find(p => p.id === r.productId);
        return product ? { ...product, aiReason: r.reason, matchScore: r.matchScore } : null;
      }).filter(Boolean);

      res.json({ recommendations: enriched.length > 0 ? enriched : products.slice(0, 6), reason: enriched.length > 0 ? "personalized" : "general", profileComplete: true });
    } catch (error: any) {
      console.error("Smart products error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== NOMAD DISCOVERY - CHECK-INS ==========
  app.get("/api/ai/checkins", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const checkins = await db.select().from(schema.nomadCheckins)
        .where(and(eq(schema.nomadCheckins.userId, userId), eq(schema.nomadCheckins.isActive, true)))
        .orderBy(desc(schema.nomadCheckins.createdAt));
      res.json(checkins);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/checkin", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { city, country, latitude, longitude, status, arrivalDate, departureDate, note } = req.body;
      if (!city || !country) return res.status(400).json({ error: "city and country required" });

      await db.update(schema.nomadCheckins)
        .set({ isActive: false })
        .where(and(eq(schema.nomadCheckins.userId, userId), eq(schema.nomadCheckins.isActive, true)));

      const [checkin] = await db.insert(schema.nomadCheckins).values({
        userId,
        city,
        country,
        latitude: latitude || null,
        longitude: longitude || null,
        status: status || "here_now",
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        departureDate: departureDate ? new Date(departureDate) : null,
        note: note || null,
      }).returning();

      await db.insert(schema.userActivityLog).values({
        userId,
        activityType: "checkin",
        metadata: JSON.stringify({ city, country, status }),
        location: `${city}, ${country}`,
      });

      res.json(checkin);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ai/checkin/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await db.update(schema.nomadCheckins)
        .set({ isActive: false })
        .where(and(eq(schema.nomadCheckins.id, req.params.id), eq(schema.nomadCheckins.userId, userId)));
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== NOMAD DISCOVERY - FIND NOMADS ==========
  app.get("/api/ai/discover-nomads", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const city = req.query.city as string;
      const country = req.query.country as string;

      if (!city && !country) return res.status(400).json({ error: "city or country required" });

      const conditions = [eq(schema.nomadCheckins.isActive, true)];
      if (city) conditions.push(sql`LOWER(${schema.nomadCheckins.city}) = LOWER(${city})`);
      else if (country) conditions.push(sql`LOWER(${schema.nomadCheckins.country}) = LOWER(${country})`);

      const checkins = await db.select({
        checkin: schema.nomadCheckins,
        user: schema.users,
      })
        .from(schema.nomadCheckins)
        .innerJoin(schema.users, eq(schema.nomadCheckins.userId, schema.users.id))
        .where(and(...conditions))
        .orderBy(desc(schema.nomadCheckins.createdAt))
        .limit(50);

      const nomads = checkins
        .filter(c => c.checkin.userId !== userId)
        .map(c => ({
          id: c.user.id,
          username: c.user.username,
          name: c.user.name,
          avatar: c.user.avatar,
          bio: c.user.bio,
          location: c.user.location,
          status: c.checkin.status,
          city: c.checkin.city,
          country: c.checkin.country,
          arrivalDate: c.checkin.arrivalDate,
          departureDate: c.checkin.departureDate,
          note: c.checkin.note,
        }));

      res.json({ nomads, city: city || null, country: country || null, count: nomads.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI TRAVEL SUGGESTIONS ==========
  app.post("/api/ai/travel-suggestions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { currentCity, budget, duration, preferences } = req.body;

      const [interests, trips] = await Promise.all([
        db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)),
        db.select().from(schema.trips).where(eq(schema.trips.userId, userId)).limit(5),
      ]);

      const interestTags = interests.map(i => i.tag).join(", ") || "general traveler";
      const pastDestinations = trips.map(t => `${t.startLocation} → ${t.endLocation}`).join(", ") || "no previous trips";

      const prompt = `You are a travel advisor for a digital nomad.

USER PROFILE:
- Interests: ${interestTags}
- Past trips: ${pastDestinations}
- Current location: ${currentCity || "unknown"}
- Budget: ${budget || "flexible"}
- Duration: ${duration || "1-2 weeks"}
- Preferences: ${preferences || "none specified"}

Suggest 5 personalized destinations. For each include:
- city, country
- why it matches their profile (1 sentence)
- estimated daily budget (USD)
- best time to visit
- nomad score (1-10 for wifi, community, cost, safety)
- one insider tip

Return JSON: { "suggestions": [{ "city": "", "country": "", "reason": "", "dailyBudget": 0, "bestTime": "", "nomadScore": { "wifi": 0, "community": 0, "cost": 0, "safety": 0 }, "insiderTip": "" }] }`;

      res.setHeader("Content-Type", "application/json");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a personalized travel recommendation engine for digital nomads. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2048,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { suggestions: [] }; }

      res.json(parsed);
    } catch (error: any) {
      console.error("Travel suggestions error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI SOCIAL MATCHING ==========
  app.post("/api/ai/suggest-connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const [myInterests, myCheckins, allCheckins] = await Promise.all([
        db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)),
        db.select().from(schema.nomadCheckins).where(and(eq(schema.nomadCheckins.userId, userId), eq(schema.nomadCheckins.isActive, true))),
        db.select({
          checkin: schema.nomadCheckins,
          user: schema.users,
          interests: sql<string>`(SELECT string_agg(tag, ', ') FROM user_interests WHERE user_id = ${schema.users.id})`,
        })
          .from(schema.nomadCheckins)
          .innerJoin(schema.users, eq(schema.nomadCheckins.userId, schema.users.id))
          .where(and(eq(schema.nomadCheckins.isActive, true), sql`${schema.nomadCheckins.userId} != ${userId}`))
          .limit(30),
      ]);

      if (allCheckins.length === 0) {
        return res.json({ connections: [], reason: "no_nomads_found" });
      }

      const myTags = myInterests.map(i => i.tag).join(", ") || "general";
      const myLocation = myCheckins[0] ? `${myCheckins[0].city}, ${myCheckins[0].country}` : "unknown";

      const nomadList = allCheckins.map(n =>
        `ID:${n.user.id} | ${n.user.username} | ${n.checkin.city}, ${n.checkin.country} (${n.checkin.status}) | interests: ${n.interests || 'unknown'} | bio: ${n.user.bio?.substring(0, 60) || 'none'}`
      ).join("\n");

      const prompt = `I'm a digital nomad with these interests: ${myTags}
Currently at: ${myLocation}

Here are other nomads on the platform:
${nomadList}

Suggest the TOP 5 best connections for me, prioritizing:
1. Same/nearby location
2. Shared interests
3. Complementary skills/interests

Return JSON: { "connections": [{ "userId": "...", "reason": "short reason for connecting", "commonInterests": ["tag1", "tag2"], "matchScore": 0.0-1.0 }] }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a social matching engine. Connect digital nomads based on interests, location, and compatibility. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { connections: [] }; }

      const enriched = (parsed.connections || []).map((c: any) => {
        const found = allCheckins.find(n => n.user.id === c.userId);
        if (!found) return null;
        return {
          user: {
            id: found.user.id,
            username: found.user.username,
            name: found.user.name,
            avatar: found.user.avatar,
            bio: found.user.bio,
          },
          checkin: {
            city: found.checkin.city,
            country: found.checkin.country,
            status: found.checkin.status,
          },
          reason: c.reason,
          commonInterests: c.commonInterests || [],
          matchScore: c.matchScore || 0.5,
        };
      }).filter(Boolean);

      res.json({ connections: enriched });
    } catch (error: any) {
      console.error("Connection suggestions error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== POPULAR DESTINATIONS (from check-ins data) ==========
  app.get("/api/ai/popular-destinations", async (_req: Request, res: Response) => {
    try {
      const results = await db.execute(sql`
        SELECT city, country, COUNT(*) as nomad_count,
          COUNT(CASE WHEN status = 'here_now' THEN 1 END) as here_now_count
        FROM nomad_checkins
        WHERE is_active = true
        GROUP BY city, country
        ORDER BY nomad_count DESC
        LIMIT 10
      `);
      res.json({ destinations: results.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI DESTINATION ADVISOR ==========
  app.post("/api/ai/destination-advisor", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentCity, currentCountry, budget, durationWeeks, priorities } = req.body;
      if (!budget || !priorities) return res.status(400).json({ error: "budget and priorities required" });

      const userId = getUserId(req);
      const [userPrefs, userInterestsList] = await Promise.all([
        db.select().from(schema.userAiPreferences).where(eq(schema.userAiPreferences.userId, userId)).limit(1),
        db.select().from(schema.userInterests).where(eq(schema.userInterests.userId, userId)).orderBy(desc(schema.userInterests.confidence)).limit(10),
      ]);

      const prefs = userPrefs[0];
      const interestTags = userInterestsList.map(i => i.tag).join(", ");

      const prompt = `You are NomadBot, an expert digital nomad travel advisor. A nomad needs destination suggestions.

CURRENT SITUATION:
- Currently in: ${currentCity || "Unknown"}, ${currentCountry || "Unknown"}
- Monthly budget: €${budget}
- Stay duration: ${durationWeeks} weeks
- Priorities: ${(priorities as string[]).join(", ")}
- Travel style: ${prefs?.travelStyle || "not specified"}
- Preferred climate: ${prefs?.preferredClimate || "not specified"}
- User interests: ${interestTags || "general nomad"}

Generate exactly 5 destination suggestions optimized for this nomad profile.
For each destination consider: cost of living, internet quality, visa situation for EU/Italian citizens, nomad community size, safety, and seasonal conditions for the current month (May).

Return JSON exactly in this format:
{
  "destinations": [
    {
      "city": "City Name",
      "country": "Country Name",
      "countryCode": "IT",
      "lat": 0.0,
      "lng": 0.0,
      "iataCode": "FCO",
      "monthlyCostMin": 800,
      "monthlyCostMax": 1200,
      "internetMbps": 50,
      "visaInfo": "Visa-free for EU",
      "visaDifficulty": "easy",
      "nomadScore": 82,
      "climate": "25°C ☀️",
      "highlights": ["Fast wifi", "Low cost", "Beach"],
      "pros": ["Affordable coworking", "Large nomad community"],
      "bestFor": "Perfect for budget-conscious nomads who love sun and active community"
    }
  ]
}

visaDifficulty must be one of: "easy", "medium", "hard"
nomadScore is 0-100 based on all factors combined
monthlyCostMin/Max should be realistic all-inclusive monthly estimates for the given budget level
iataCode is the main airport IATA code for the city`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a travel advisor for digital nomads. Always return valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { destinations: [] }; }

      res.json({ destinations: parsed.destinations || [] });
    } catch (error: any) {
      console.error("[AI Destination Advisor] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI QUICK TRIP BUILDER ==========
  app.post("/api/ai/quick-trip-builder", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentCity, currentCountry, currentLat, currentLng, budget, totalDays, style } = req.body;

      const prompt = `You are NomadBot, a digital nomad trip planning expert. Build a complete multi-stop trip itinerary.

STARTING POINT: ${currentCity || "Current location"}, ${currentCountry || ""}
TOTAL DAYS: ${totalDays || 30}
MONTHLY BUDGET: €${budget || 1500}
TRAVEL STYLE: ${style || "balanced"} (budget=cheapest, social=community-focused, balanced=best overall)
START DATE: today (${new Date().toLocaleDateString("it-IT")})

Create a realistic trip with 3-5 stops. Each stop should be reachable from the previous one.
Consider: transport connections, visa requirements for EU citizens, seasonal suitability (May/June).

Return JSON exactly:
{
  "title": "Trip title (creative, evocative)",
  "totalDays": 30,
  "stops": [
    {
      "city": "City Name",
      "country": "Country Name",
      "lat": 0.0,
      "lng": 0.0,
      "durationDays": 10,
      "transportMode": "plane",
      "estimatedMonthlyCost": 1200,
      "highlights": "2-sentence description of why this stop is great for nomads"
    }
  ]
}

transportMode: "plane", "train", "bus", or "car"
Make the trip feel like an adventure. Budget the days so they add up to totalDays.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a digital nomad trip planner. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { title: "My Nomad Adventure", totalDays: totalDays, stops: [] }; }

      res.json({ trip: parsed });
    } catch (error: any) {
      console.error("[AI Quick Trip Builder] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
