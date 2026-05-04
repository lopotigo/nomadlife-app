import { db } from "./db";
import { travelAlerts, users, trips, notifications, proximityLogs } from "@shared/schema";
import { eq, sql, and, gt, ilike, or, ne, isNotNull } from "drizzle-orm";
import { storage } from "./storage";

async function getUserCountries(): Promise<string[]> {
  try {
    const allUsers = await db.select({ location: users.location }).from(users)
      .where(isNotNull(users.location));
    
    const allTrips = await db.select({ destination: trips.destination }).from(trips);

    const countries = new Set<string>();
    for (const u of allUsers) {
      if (u.location) {
        const parts = u.location.split(",").map(s => s.trim());
        if (parts.length >= 2) countries.add(parts[parts.length - 1]);
      }
    }
    for (const t of allTrips) {
      if (t.destination) {
        const parts = t.destination.split(",").map(s => s.trim());
        if (parts.length >= 1) countries.add(parts[parts.length - 1]);
      }
    }
    return Array.from(countries).filter(c => c.length > 1);
  } catch {
    return [];
  }
}

export async function checkTravelAlerts() {
  if (!process.env.TAVILY_API_KEY) {
    console.log("[Travel Alerts] No Tavily API key, skipping.");
    return;
  }

  console.log("[Travel Alerts] Starting alert check...");

  const userCountries = await getUserCountries();
  const priorityCountries = userCountries.length > 0 ? userCountries.slice(0, 8) : [
    "Italy", "Thailand", "Portugal", "Spain", "Colombia", "Georgia", "Vietnam", "Japan"
  ];

  let alertsCreated = 0;

  for (const country of priorityCountries) {
    try {
      await new Promise(r => setTimeout(r, 2000));

      const query = `${country} travel advisory safety warning visa changes 2025 2026`;
      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "basic",
          max_results: 3,
          include_answer: true,
        }),
      });

      if (!tavilyResponse.ok) continue;
      const data = await tavilyResponse.json();

      let textToAnalyze = data.answer || "";
      if (!textToAnalyze && data.results?.length > 0) {
        textToAnalyze = data.results.map((r: any) => `${r.title || ""} ${r.content || ""}`).join(" ");
      }
      if (!textToAnalyze.trim()) continue;

      const answer = textToAnalyze.toLowerCase();
      let severity = "info";
      let type = "general";

      if (/war|bomb|attack|military|conflict|invasion|missile|airstrike|killed|casualties/i.test(answer)) {
        severity = "critical";
        type = "safety";
      } else if (/danger|avoid|do not travel|evacuate|emergency|terrorist|coup|unrest|protest/i.test(answer)) {
        severity = "warning";
        type = "safety";
      } else if (/visa.*chang|new visa|visa.*update|visa.*require|entry.*require|border.*clos/i.test(answer)) {
        severity = "info";
        type = "visa";
      } else if (/earthquake|hurricane|typhoon|flood|tsunami|volcano|wildfire|storm/i.test(answer)) {
        severity = "warning";
        type = "natural_disaster";
      } else {
        continue;
      }

      const existing = await db.select().from(travelAlerts)
        .where(and(
          eq(travelAlerts.country, country),
          eq(travelAlerts.type, type),
          eq(travelAlerts.isActive, true),
          gt(travelAlerts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        ))
        .limit(1);

      if (existing.length > 0) continue;

      const titlePrefix = severity === "critical" ? "⚠️ CRITICAL" :
        severity === "warning" ? "⚠️ Warning" : "ℹ️ Update";
      const typeLabel = type === "safety" ? "Safety Alert" :
        type === "visa" ? "Visa Update" :
        type === "natural_disaster" ? "Natural Disaster" : "Travel Update";

      const summaryText = (data.answer || textToAnalyze).substring(0, 500);
      let sourceHost = "web";
      try {
        if (data.results?.[0]?.url) sourceHost = new URL(data.results[0].url).hostname;
      } catch {}
      
      const [alert] = await db.insert(travelAlerts).values({
        country,
        type,
        severity,
        title: `${titlePrefix}: ${country} - ${typeLabel}`,
        summary: summaryText,
        source: sourceHost,
        sourceUrl: data.results?.[0]?.url || null,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }).returning();

      alertsCreated++;

      const affectedUsers = await db.select({ id: users.id, location: users.location }).from(users)
        .where(ilike(users.location, `%${country}%`));

      for (const u of affectedUsers) {
        await storage.createNotification({
          userId: u.id,
          type: "travel_alert",
          message: `${titlePrefix}: ${country} - ${data.answer.substring(0, 150)}...`,
          relatedUserId: null,
          relatedTripId: null,
        });
      }

      console.log(`[Travel Alerts] Created ${severity} alert for ${country} (${type}), notified ${affectedUsers.length} users`);

    } catch (err) {
      console.error(`[Travel Alerts] Error checking ${country}:`, err);
    }
  }

  console.log(`[Travel Alerts] Check complete. ${alertsCreated} new alerts created.`);
}

export async function checkProximityAndNotify(
  userId: string,
  lat: number,
  lng: number,
  sendPushFn: (userId: string, title: string, body: string, url?: string) => Promise<void>
) {
  try {
    const radiusKm = 50;

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const nearbyUsers = await db.execute(sql`
      SELECT u.id, u.name, u.username, u.avatar, u.location, u.profession,
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(u.latitude)) *
          cos(radians(u.longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(u.latitude))
        )) AS distance_km
      FROM users u
      WHERE u.id != ${userId}
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND u.privacy_mode != 'hidden'
        AND (6371 * acos(
          cos(radians(${lat})) * cos(radians(u.latitude)) *
          cos(radians(u.longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(u.latitude))
        )) <= ${radiusKm}
    `);

    if (!nearbyUsers.rows || nearbyUsers.rows.length === 0) return;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) return;

    for (const nearby of nearbyUsers.rows as any[]) {
      const existingLog = await db.select().from(proximityLogs)
        .where(and(
          or(
            and(eq(proximityLogs.userId, userId), eq(proximityLogs.nearbyUserId, nearby.id)),
            and(eq(proximityLogs.userId, nearby.id), eq(proximityLogs.nearbyUserId, userId))
          ),
          gt(proximityLogs.notifiedAt, fourteenDaysAgo)
        ))
        .limit(1);

      if (existingLog.length > 0) continue;

      const distKm = Math.round(nearby.distance_km * 10) / 10;

      await db.insert(proximityLogs).values({
        userId: userId,
        nearbyUserId: nearby.id,
        distanceKm: distKm,
      });

      const messageForNearby = `📍 ${currentUser.name} (@${currentUser.username}) is ${distKm}km from you!${currentUser.profession ? ` - ${currentUser.profession}` : ""}`;
      await storage.createNotification({
        userId: nearby.id,
        type: "nearby_nomad",
        message: messageForNearby,
        relatedUserId: userId,
        relatedTripId: null,
      });
      await sendPushFn(nearby.id, "Nomad Nearby! 📍", messageForNearby, `/user/${userId}`);

      const messageForUser = `📍 ${nearby.name} (@${nearby.username}) is ${distKm}km from you!${nearby.profession ? ` - ${nearby.profession}` : ""}`;
      await storage.createNotification({
        userId: userId,
        type: "nearby_nomad",
        message: messageForUser,
        relatedUserId: nearby.id,
        relatedTripId: null,
      });
      await sendPushFn(userId, "Nomad Nearby! 📍", messageForUser, `/user/${nearby.id}`);
    }
  } catch (err) {
    console.error("[Proximity Check] Error:", err);
  }
}

export async function getActiveAlerts(country?: string) {
  const conditions = [
    eq(travelAlerts.isActive, true),
    or(
      gt(travelAlerts.expiresAt, new Date()),
      sql`${travelAlerts.expiresAt} IS NULL`
    ),
  ];

  if (country) {
    conditions.push(ilike(travelAlerts.country, `%${country}%`));
  }

  return db.select().from(travelAlerts)
    .where(and(...conditions))
    .orderBy(sql`CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END`, sql`created_at DESC`)
    .limit(50);
}
