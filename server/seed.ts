import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { blogPosts, places, events, users, posts, chatGroups, messages, vendors, products } from "@shared/schema";
import { sql } from "drizzle-orm";
import seedData from "./seed-data.json";

export async function autoSeed() {
  const [{ count: blogCount }] = await db.select({ count: sql<number>`count(*)` }).from(blogPosts);
  const [{ count: placeCount }] = await db.select({ count: sql<number>`count(*)` }).from(places);
  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)` }).from(users);

  if (Number(blogCount) > 0 && Number(placeCount) > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Auto-seeding database...");

  try {
    if (Number(userCount) === 0) {
      const createdUsers = await Promise.all([
        storage.createUser({
          username: "marco",
          email: "marco@nomadlife.com",
          password: await bcrypt.hash("password123", 10),
          name: "Marco Rossi",
          bio: "Digital nomad exploring Southeast Asia 🌏",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marco",
          location: "Bali, Indonesia",
          isPremium: true,
          countriesVisited: 23,
          citiesVisited: 47,
          coworkingSpaces: 12,
        }),
        storage.createUser({
          username: "sarah",
          email: "sarah@nomadlife.com",
          password: await bcrypt.hash("password123", 10),
          name: "Sarah Chen",
          bio: "Remote dev & travel blogger ✈️",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
          location: "Lisbon, Portugal",
          isPremium: false,
          countriesVisited: 15,
          citiesVisited: 28,
          coworkingSpaces: 8,
        }),
        storage.createUser({
          username: "alex",
          email: "alex@nomadlife.com",
          password: await bcrypt.hash("password123", 10),
          name: "Alex Johnson",
          bio: "Full-stack developer working remotely from anywhere",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
          location: "Chiang Mai, Thailand",
          isPremium: true,
          countriesVisited: 31,
          citiesVisited: 52,
          coworkingSpaces: 18,
        }),
      ]);
      console.log(`Created ${createdUsers.length} users`);

      await Promise.all([
        storage.createPost({
          userId: createdUsers[0].id,
          content: "Just arrived in Bali! The coworking scene here is incredible. Found an amazing spot with ocean views 🌊",
          imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
          location: "Canggu, Bali",
        }),
        storage.createPost({
          userId: createdUsers[1].id,
          content: "Working from this stunning cafe in Lisbon ☕ The perfect balance of work and exploration!",
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
          location: "Lisbon, Portugal",
        }),
        storage.createPost({
          userId: createdUsers[2].id,
          content: "Chiang Mai never gets old. Great wifi, amazing food, and the best community of digital nomads 🙌",
          imageUrl: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648",
          location: "Chiang Mai, Thailand",
        }),
      ]);
      console.log("Created posts");

      const createdGroups = await Promise.all([
        storage.createChatGroup({ name: "Bali Digital Nomads", city: "Bali", description: "Connect with nomads in Bali, share tips and organize meetups" }),
        storage.createChatGroup({ name: "Lisbon Remote Workers", city: "Lisbon", description: "Community for remote workers based in Lisbon" }),
        storage.createChatGroup({ name: "Chiang Mai Expats", city: "Chiang Mai", description: "Long-term nomads and expats in Chiang Mai" }),
      ]);
      console.log(`Created ${createdGroups.length} chat groups`);

      await Promise.all([
        storage.createMessage({ senderId: createdUsers[0].id, groupId: createdGroups[0].id, receiverId: null, content: "Hey everyone! Just moved to Canggu. Anyone up for a coffee this week?" }),
        storage.createMessage({ senderId: createdUsers[1].id, groupId: createdGroups[1].id, receiverId: null, content: "Best places for lunch in Alfama? Looking for authentic Portuguese food!" }),
        storage.createMessage({ senderId: createdUsers[2].id, groupId: createdGroups[2].id, receiverId: null, content: "Reminder: Nomad meetup tonight at 7pm at Maya Mall food court!" }),
      ]);
      console.log("Created messages");
    }

    if (Number(placeCount) === 0 && seedData.places?.length > 0) {
      for (const p of seedData.places) {
        await storage.createPlace({
          name: p.name,
          type: p.type as any,
          location: p.location,
          city: p.city,
          description: p.description,
          price: p.price,
          imageUrl: p.image_url,
          tags: p.tags || [],
          latitude: p.latitude ? Number(p.latitude) : undefined,
          longitude: p.longitude ? Number(p.longitude) : undefined,
          country: p.country || undefined,
        });
      }
      console.log(`Created ${seedData.places.length} places`);
    }

    if (Number(blogCount) === 0 && seedData.blogs?.length > 0) {
      for (const b of seedData.blogs) {
        await db.insert(blogPosts).values({
          slug: b.slug,
          title: b.title,
          excerpt: b.excerpt,
          content: b.content,
          category: b.category,
          city: b.city || null,
          country: b.country || null,
          imageUrl: b.image_url || null,
          tags: b.tags || null,
          author: b.author || "NomadLife Team",
          published: b.published,
        });
      }
      console.log(`Created ${seedData.blogs.length} blog posts`);
    }

    const [{ count: eventCount }] = await db.select({ count: sql<number>`count(*)` }).from(events);
    if (Number(eventCount) === 0 && seedData.events?.length > 0) {
      for (const e of seedData.events) {
        await db.insert(events).values({
          title: e.title,
          description: e.description,
          type: e.type,
          city: e.city,
          country: e.country || null,
          location: e.location || null,
          imageUrl: e.image_url || null,
          startDate: e.start_date ? new Date(e.start_date) : new Date(),
          endDate: e.end_date ? new Date(e.end_date) : null,
          capacity: e.capacity || null,
          price: e.price || null,
          currency: e.currency || "EUR",
          tags: e.tags || null,
          latitude: e.latitude ? Number(e.latitude) : null,
          longitude: e.longitude ? Number(e.longitude) : null,
        });
      }
      console.log(`Created ${seedData.events.length} events`);
    }

    const [{ count: vendorCount }] = await db.select({ count: sql<number>`count(*)` }).from(vendors);
    if (Number(vendorCount) === 0 && (seedData as any).vendors?.length > 0) {
      const vendorMap: Record<string, string> = {};
      for (const v of (seedData as any).vendors) {
        const [created] = await db.insert(vendors).values({
          name: v.name,
          description: v.description || null,
          logo: v.logo || null,
          website: v.website || null,
          email: v.email || null,
          category: v.category,
          isVerified: v.is_verified ?? false,
          isActive: v.is_active ?? true,
        }).returning();
        vendorMap[v.name] = created.id;
      }
      console.log(`Created ${(seedData as any).vendors.length} vendors`);

      if ((seedData as any).products?.length > 0) {
        for (const p of (seedData as any).products) {
          const vendorId = vendorMap[p.vendor_name];
          if (!vendorId) continue;
          await db.insert(products).values({
            vendorId,
            name: p.name,
            description: p.description || null,
            imageUrl: p.image_url || null,
            price: p.price || null,
            currency: p.currency || "EUR",
            originalPrice: p.original_price || null,
            discountPercent: p.discount_percent || null,
            category: p.category,
            affiliateUrl: p.affiliate_url || null,
            tags: p.tags || null,
            isFeatured: p.is_featured ?? false,
            isActive: p.is_active ?? true,
          });
        }
        console.log(`Created ${(seedData as any).products.length} products`);
      }
    }

    console.log("Auto-seed completed successfully!");
  } catch (error) {
    console.error("Auto-seed error:", error);
  }

  await seedCommunityChannels();
  await assignBlogAuthors();
  await seedIndiaArticle();
}

async function seedCommunityChannels() {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(chatGroups).where(sql`is_community = true`);
    if (Number(existing[0].count) >= 6) return;

    const channels = [
      { name: "Lavoro & Freelance", city: "Global", description: "Offerte di lavoro, collaborazioni, consigli per freelancer e nomadi digitali", icon: "\u{1F4BC}", isCommunity: true, isOpen: true },
      { name: "Città & Destinazioni", city: "Global", description: "Consigli su dove andare, esperienze e recensioni delle migliori città per nomadi", icon: "\u{1F30D}", isCommunity: true, isOpen: true },
      { name: "Visti & Burocrazia", city: "Global", description: "Info su visti, permessi di soggiorno, tasse e questioni legali per nomadi", icon: "\u{1F4CB}", isCommunity: true, isOpen: true },
      { name: "Coworking & Alloggi", city: "Global", description: "Recensioni e suggerimenti su spazi di coworking, coliving e alloggi", icon: "\u{1F3E2}", isCommunity: true, isOpen: true },
      { name: "Tech & Strumenti", city: "Global", description: "Tool, app, VPN, setup e tutto ciò che serve per lavorare da remoto", icon: "\u{1F4BB}", isCommunity: true, isOpen: true },
      { name: "Off Topic", city: "Global", description: "Discussioni libere, politica, attualità, hobby e tutto il resto", icon: "\u{1F3B2}", isCommunity: true, isOpen: true },
    ];

    for (const ch of channels) {
      const exists = await db.select({ count: sql<number>`count(*)` }).from(chatGroups).where(sql`name = ${ch.name} AND is_community = true`);
      if (Number(exists[0].count) === 0) {
        await db.insert(chatGroups).values({ ...ch, members: 0 });
        console.log(`[Community] Created channel: ${ch.name}`);
      }
    }
  } catch (error) {
    console.error("[Community] Seed error:", error);
  }
}
