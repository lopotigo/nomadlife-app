import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { blogPosts, places, events, users, posts, chatGroups, messages, vendors, products, trips, tripStops } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import seedData from "./seed-data.json";

export async function autoSeed() {
  const [{ count: blogCount }] = await db.select({ count: sql<number>`count(*)` }).from(blogPosts);
  const [{ count: placeCount }] = await db.select({ count: sql<number>`count(*)` }).from(places);
  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)` }).from(users);

  if (Number(blogCount) > 0 && Number(placeCount) > 0) {
    console.log("Database already seeded, skipping...");
    await seedCommunityChannels();
    await seedMissingBlogPosts();
    await seedIndiaArticle();
    await seedGabrieleIndiaTrip();
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
  await seedMissingBlogPosts();
  await seedIndiaArticle();
  await seedGabrieleIndiaTrip();
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

async function seedIndiaArticle() {
  try {
    const slug = "viaggio-india-nomade-digitale-gabriele-zavettieri";
    const existing = await db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.slug, slug));
    if (Number(existing[0].count) > 0) return;

    const userRows = await db.select().from(users).where(eq(users.username, "zave_17"));
    if (userRows.length === 0) return;
    const gabriele = userRows[0];

    await db.insert(blogPosts).values({
      slug,
      title: "Viaggio in India da Nomade Digitale: Delhi, Jaipur, Agra e Varanasi",
      excerpt: "Il racconto del mio viaggio in India come nomade digitale: da Nuova Delhi al Taj Mahal, passando per Jaipur e Varanasi. Costi, WiFi, coworking, consigli pratici e cosa aspettarsi lavorando da remoto in India.",
      content: `# Viaggio in India da Nomade Digitale: la mia esperienza

Sono Gabriele Zavettieri e a gennaio 2026 ho deciso di partire per l'India. Non un viaggio turistico qualsiasi, ma un'esperienza da nomade digitale: lavorare da remoto esplorando uno dei paesi più affascinanti e caotici del mondo.

## Il mio itinerario: 5 tappe in 3 settimane

### 1. Nuova Delhi — Il primo impatto

Delhi ti travolge. Il traffico, i colori, gli odori, il rumore. Ho trovato alloggio nel quartiere di Paharganj, vicino alla stazione centrale, dove una stanza decente costa 15-20 euro a notte.

**Per lavorare da remoto a Delhi:**
- WiFi negli hotel: variabile, meglio portare una SIM Airtel o Jio (costa circa 5€ per 1.5GB/giorno per 28 giorni)
- Coworking: 91springboard e Innov8 hanno spazi moderni a partire da 10€/giorno
- Costo della vita: 20-30€ al giorno vivendo bene (alloggio + cibo + trasporti)

### 2. Jaipur — La città rosa

Da Delhi a Jaipur ho preso il treno (circa 5 ore, 238 km). Jaipur è più tranquilla di Delhi e incredibilmente fotogenica. L'Hawa Mahal, l'Amber Fort e i bazar colorati sono imperdibili.

**Consigli per nomadi digitali a Jaipur:**
- Il WiFi in città sta migliorando rapidamente
- Ci sono diversi café con buona connessione nella zona di C-Scheme
- Costo della vita ancora più basso di Delhi: 15-25€ al giorno
- Attenzione al caldo: da marzo in poi le temperature superano i 35°C

### 3. Agra — Il Taj Mahal

Da Jaipur ad Agra: 224 km in treno. Il Taj Mahal è uno di quei posti che devi vedere almeno una volta nella vita. L'ho visitato all'alba — consiglio che do a tutti. La luce è perfetta e ci sono meno turisti.

Agra non è una città dove restare a lungo per lavorare. La visito in 1-2 giorni e poi via verso Varanasi.

### 4. Varanasi — L'India spirituale

Da Agra a Varanasi ho preso un volo interno (538 km). Varanasi è l'India più autentica e spirituale. I ghat sul Gange, le cerimonie aarti al tramonto, i vicoli stretti della old city.

**Lavorare da Varanasi:**
- Il WiFi è il punto debole: instabile e lento in molte zone
- La SIM 4G diventa essenziale qui
- Pochi coworking, ma alcuni café turistici nella zona di Assi Ghat hanno connessione discreta
- Il costo della vita è bassissimo: 12-18€ al giorno

### 5. Ritorno a Delhi

Dopo Varanasi sono tornato a Delhi per il volo di ritorno (674 km in aereo). Un ultimo giorno per visitare la Jama Masjid e il Red Fort.

## Costi totali del viaggio

| Voce | Costo |
|------|-------|
| Voli interni (2) | ~120€ |
| Treni (2) | ~25€ |
| Alloggio (21 notti) | ~350€ |
| Cibo | ~200€ |
| Attrazioni e ingressi | ~50€ |
| SIM + internet | ~10€ |
| Trasporti locali (rickshaw, uber) | ~40€ |
| **Totale** | **~795€ per 3 settimane** |

## Impatto ambientale

Ho calcolato la CO2 del viaggio usando NomadLife:
- Treno Delhi-Jaipur: 10 kg CO2
- Treno Jaipur-Agra: 9 kg CO2
- Volo Agra-Varanasi: 137 kg CO2
- Volo Varanasi-Delhi: 172 kg CO2
- **Totale: 328 kg CO2**

Il treno in India è molto più ecologico dell'aereo. Se avessi fatto tutto in treno avrei emesso meno di 40 kg totali.

## L'India è adatta ai nomadi digitali?

**Sì, ma con le giuste aspettative.** L'India non è Bali o Lisbona. Il WiFi può essere instabile, il traffico caotico, e la cultura è molto diversa da quella europea. Ma il costo della vita incredibilmente basso, la ricchezza culturale e l'ospitalità delle persone compensano tutto.

### Pro:
- Costo della vita bassissimo (600-800€/mese vivendo bene)
- Cibo incredibile e vario
- Cultura millenaria a ogni angolo
- Gente accogliente e curiosa
- Trasporti interni economici

### Contro:
- WiFi instabile fuori dalle grandi città
- Burocrazia per il visto (serve l'e-Visa, facile da ottenere online)
- Igiene alimentare: attenzione all'acqua e al cibo di strada i primi giorni
- Jet lag e clima estremo in certi periodi

## Visto per l'India

Per entrare in India serve un **e-Visa turistico**, richiedibile online su [indianvisaonline.gov.in](https://indianvisaonline.gov.in). Costa circa 25 USD per 30 giorni. Il processo è semplice: compili il form, carichi la foto, paghi e ricevi il visto via email in 3-5 giorni.

Per soggiorni più lunghi esiste il visto turistico da 1 anno o 5 anni.

## Consigli finali

1. **Porta una VPN** — molti siti sono bloccati o lenti dall'India
2. **Compra una SIM locale appena atterri** — Airtel o Jio sono le migliori
3. **Scarica le mappe offline** di Google Maps
4. **Prenota i treni in anticipo** su IRCTC — i posti si esauriscono
5. **Assicurazione viaggio obbligatoria** — meglio avere una copertura sanitaria seria
6. **Usa NomadLife** per trovare altri nomadi nella tua zona e scoprire coworking verificati

Se stai pensando di andare in India come nomade digitale, fallo. È un'esperienza che ti cambia la prospettiva sul lavoro e sulla vita.

*— Gabriele Zavettieri, @zave_17 su NomadLife*`,
      category: "travel",
      city: "New Delhi",
      country: "India",
      imageUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&h=630&fit=crop",
      tags: ["india", "nomade digitale", "delhi", "jaipur", "agra", "taj mahal", "varanasi", "lavoro remoto", "viaggio low cost", "visto india"],
      author: gabriele.name || "Gabriele Zavettieri",
      userId: gabriele.id,
      published: true,
    });
    console.log("[Blog] Created India travel article by Gabriele Zavettieri");
  } catch (error) {
    console.error("[Blog] India article seed error:", error);
  }
}

async function seedGabrieleIndiaTrip() {
  try {
    const userRows = await db.select().from(users).where(eq(users.username, "zave_17"));
    if (userRows.length === 0) return;
    const gabriele = userRows[0];

    const existingTrips = await db.select({ count: sql<number>`count(*)` }).from(trips)
      .where(sql`user_id = ${gabriele.id} AND title = 'India'`);
    if (Number(existingTrips[0].count) > 0) return;

    const [trip] = await db.insert(trips).values({
      userId: gabriele.id,
      title: "India",
      description: "Viaggio da nomade digitale attraverso l'India: Delhi, Jaipur, Agra, Varanasi",
      startLocation: "Milano",
      endLocation: "New Delhi",
      startDate: new Date("2026-01-25"),
      isPublic: true,
      isActive: true,
      status: "completed",
      imageUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=400&fit=crop",
    }).returning();

    const stops = [
      { tripId: trip.id, city: "Nuova Delhi", country: "India", latitude: 28.6141, longitude: 77.2091, orderIndex: 0, arrivalDate: new Date("2026-02-10"), notes: "Prima tappa - la capitale" },
      { tripId: trip.id, city: "Jaipur", country: "India", latitude: 26.9057, longitude: 75.7471, orderIndex: 1, arrivalDate: new Date("2026-02-13"), notes: "La città rosa", transportMode: "train", distanceKm: 238, co2Kg: 10 },
      { tripId: trip.id, city: "Agra", country: "India", latitude: 27.1797, longitude: 77.9883, orderIndex: 2, arrivalDate: new Date("2026-02-16"), notes: "Il Taj Mahal", transportMode: "train", distanceKm: 224, co2Kg: 9 },
      { tripId: trip.id, city: "Varanasi", country: "India", latitude: 25.3904, longitude: 83.0054, orderIndex: 3, arrivalDate: new Date("2026-02-18"), notes: "L'India spirituale", transportMode: "plane", distanceKm: 538, co2Kg: 137 },
      { tripId: trip.id, city: "Nuova Delhi", country: "India", latitude: 28.6145, longitude: 77.2389, orderIndex: 4, arrivalDate: new Date("2026-02-21"), notes: "Ritorno per il volo", transportMode: "plane", distanceKm: 674, co2Kg: 172 },
    ];

    for (const stop of stops) {
      await db.insert(tripStops).values(stop as any);
    }

    if (gabriele.countriesVisited === 0) {
      await db.update(users).set({ countriesVisited: 2, citiesVisited: 5 }).where(eq(users.id, gabriele.id));
    }

    console.log("[Seed] Created India trip for Gabriele with 5 stops");
  } catch (error) {
    console.error("[Seed] India trip seed error:", error);
  }
}

async function seedMissingBlogPosts() {
  try {
    const existingSlugs = (await db.select({ slug: blogPosts.slug }).from(blogPosts)).map(r => r.slug);
    
    const missingBlogs = (seedData as any).blogs?.filter((b: any) => !existingSlugs.includes(b.slug)) || [];
    
    for (const b of missingBlogs) {
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
    
    if (missingBlogs.length > 0) {
      console.log(`[Seed] Created ${missingBlogs.length} missing blog posts`);
    }
  } catch (error) {
    console.error("[Seed] Missing blog posts error:", error);
  }
}
