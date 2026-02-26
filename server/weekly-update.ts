import { db } from "./db";
import { cities, posts, learnedLocations, knowledgeCache } from "@shared/schema";
import { eq, sql, desc, ilike, gte } from "drizzle-orm";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const DELAY_BETWEEN_CITIES_MS = 3000;

async function fetchTavilyInsights(cityName: string, country: string): Promise<string | null> {
  if (!TAVILY_API_KEY) return null;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `digital nomad ${cityName} ${country} coworking wifi cost of living 2025 2026`,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      console.error(`[Weekly Update] Tavily error for ${cityName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const insights: any = {
      answer: data.answer || null,
      highlights: (data.results || []).slice(0, 3).map((r: any) => ({
        title: r.title,
        snippet: r.content?.substring(0, 200),
        url: r.url,
      })),
      updatedAt: new Date().toISOString(),
    };

    const normalizedQuery = `digital nomad ${cityName.toLowerCase()} ${country.toLowerCase()}`;
    try {
      const existing = await db.select().from(knowledgeCache)
        .where(ilike(knowledgeCache.queryNormalized, `%${cityName.toLowerCase()}%`))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(knowledgeCache).values({
          query: `${cityName} ${country} digital nomad`,
          queryNormalized: normalizedQuery,
          answer: data.answer || null,
          results: JSON.stringify(insights.highlights),
          source: "weekly_update",
          category: "city_update",
          locationName: cityName,
        });
      }
    } catch (cacheErr) {
      console.error(`[Weekly Update] Cache save error for ${cityName}:`, cacheErr);
    }

    return JSON.stringify(insights);
  } catch (err) {
    console.error(`[Weekly Update] Fetch error for ${cityName}:`, err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateAllCities() {
  console.log("[Weekly Update] Starting city data refresh...");

  const allCities = await db.select().from(cities);
  let updated = 0;
  let skipped = 0;

  for (const city of allCities) {
    const lastUpdate = city.lastTavilyUpdate?.getTime() || 0;
    const now = Date.now();

    if (now - lastUpdate < UPDATE_INTERVAL_MS) {
      skipped++;
      continue;
    }

    console.log(`[Weekly Update] Updating ${city.name}, ${city.country}...`);
    const insights = await fetchTavilyInsights(city.name, city.country);

    if (insights) {
      await db.update(cities)
        .set({
          tavilyInsights: insights,
          lastTavilyUpdate: new Date(),
          lastUpdated: new Date(),
        })
        .where(eq(cities.id, city.id));
      updated++;
    }

    await sleep(DELAY_BETWEEN_CITIES_MS);
  }

  console.log(`[Weekly Update] Done. Updated: ${updated}, Skipped (recent): ${skipped}`);
}

export async function getCityEnrichedData(cityName: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentPosts = await db.select({
    id: posts.id,
    content: posts.content,
    location: posts.location,
    createdAt: posts.createdAt,
  }).from(posts)
    .where(ilike(posts.location, `%${cityName}%`))
    .orderBy(desc(posts.createdAt))
    .limit(5);

  const locationMentions = await db.select().from(learnedLocations)
    .where(ilike(learnedLocations.name, `%${cityName}%`))
    .limit(5);

  const totalMentions = locationMentions.reduce((sum, l) => sum + l.mentionCount, 0);

  return {
    recentPosts: recentPosts.map(p => ({
      snippet: p.content?.substring(0, 100),
      date: p.createdAt,
    })),
    postCount: recentPosts.length,
    communityMentions: totalMentions,
    trendingScore: totalMentions + recentPosts.length * 2,
  };
}

export function startWeeklyUpdateJob() {
  console.log("[Weekly Update] Scheduler started. Updates every 7 days.");

  setTimeout(async () => {
    try {
      await updateAllCities();
    } catch (err) {
      console.error("[Weekly Update] Initial run error:", err);
    }
  }, 120000);

  setInterval(async () => {
    try {
      await updateAllCities();
    } catch (err) {
      console.error("[Weekly Update] Scheduled run error:", err);
    }
  }, UPDATE_INTERVAL_MS);
}

export { updateAllCities };
