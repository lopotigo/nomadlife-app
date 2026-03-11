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
    await seedEcoArticles();
    await seedGeopoliticsArticles();
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
  await seedEcoArticles();
  await seedGeopoliticsArticles();
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

async function seedEcoArticles() {
  try {
    const oldSlugs = ["viaggiare-green-guida-sostenibilita-nomadi-digitali", "citta-sostenibili-nomadi-digitali-2026"];
    for (const s of oldSlugs) { await db.delete(blogPosts).where(eq(blogPosts.slug, s)); }

    const slugs = ["green-travel-sustainability-guide-digital-nomads", "most-sustainable-cities-digital-nomads-2026"];
    const existingSlugs = (await db.select({ slug: blogPosts.slug }).from(blogPosts)).map(r => r.slug);

    if (!existingSlugs.includes(slugs[0])) {
      await db.insert(blogPosts).values({
        slug: slugs[0],
        title: "Green Travel: The Ultimate Sustainability Guide for Digital Nomads",
        excerpt: "How to reduce your environmental impact as a digital nomad. Eco-friendly transport, sustainable coworking, CO2 offsetting, and conscious choices for a low-impact nomadic lifestyle.",
        content: `# Green Travel: The Ultimate Sustainability Guide for Digital Nomads

Digital nomadism is freedom — but it comes with an environmental cost. Frequent flights, device energy consumption, and the "always moving" lifestyle create a significant carbon footprint. Here's how to reduce it without giving up the freedom.

## The Carbon Footprint of a Digital Nomad

An average digital nomad produces between **5 and 12 tonnes of CO2 per year**, compared to 4-6 tonnes for an average European citizen. The difference? Flights. A single London-Bangkok flight generates around **2.5 tonnes of CO2** — half the entire sustainable annual quota per person (about 5 tonnes according to the IPCC).

## Transport: The Choice That Matters Most

### Train vs Plane
Trains emit up to **90% less CO2** than planes for the same distances. In Europe, the high-speed rail network makes it possible to travel between nomad hubs without flying:
- **London to Lisbon** by train: ~85 kg CO2 (vs ~350 kg by plane)
- **Berlin to Barcelona**: ~65 kg CO2 (vs ~280 kg by plane)
- **Interrail Global Pass**: from €185 for unlimited travel across 33 countries

### Slow Travel
The **slow travel** philosophy isn't just ecological — it's also more productive. Staying 2-3 months in one place instead of 2 weeks means:
- Fewer flights, less CO2
- Cheaper monthly rent
- Time to build stable work routines
- Deeper connections with the local community

## Sustainable Coworking & Coliving

More and more coworking and coliving spaces are adopting green practices:

### Certifications to Look For
- **B Corp** — corporate sustainability standard
- **LEED** — low-impact energy buildings
- **100% Renewable Energy** — increasingly common in Northern European countries

### Examples of Eco-Friendly Spaces
- **Green Coworking Bali** — solar power, zero plastic, composting
- **The Sustainable Hub Lisbon** — renovated building with recycled materials
- **EcoHub Berlin** — LEED certification, shared transport for members
- **Impact Hub** (global network) — focus on sustainability and social impact

## CO2 Offsetting: How It Works

When flying is unavoidable, **CO2 offsetting** is an option:

1. **Calculate your emissions** — use NomadLife or sites like atmosfair.de
2. **Choose a certified project** — Gold Standard or VCS (Verified Carbon Standard)
3. **Pay for the offset** — costs about €23 per tonne of CO2

### Beware of Greenwashing
Not all offsetting programs are equal. Avoid:
- Projects without independent certification
- Programs that promise "carbon neutral" without transparency
- Apps that charge fixed amounts without calculating actual emissions

## Sustainable Eating While Traveling

- **Eat local and seasonal** — reduces food transport emissions
- **Reduce meat** — the livestock industry causes 14.5% of global emissions
- **Street food** — often more sustainable than restaurants (less packaging, shorter supply chain)
- **Carry a water bottle** — in many Asian countries, bottled water is a massive problem

## The 3-3-3 Rule for the Green Nomad

A simple formula to balance sustainability and freedom:

1. **3 months minimum** in each destination (slow travel)
2. **3 flights maximum** per year for intercontinental routes
3. **3 green actions** daily (water bottle, public transport, local food)

## Technology & Sustainability

Tech can be greener too:
- **Refurbished laptops** — saves money and the environment
- **Green cloud computing** — prefer providers with renewable-powered data centers (Google Cloud, AWS with green regions)
- **Dark mode** — on OLED screens, reduces energy consumption by up to 40%
- **WiFi vs 4G/5G** — WiFi uses less energy than mobile data

## Conclusion

Being a digital nomad and sustainable is not an oxymoron. It requires awareness and small daily choices that, combined, make a real difference. Slow travel isn't a limitation — it's a better way to live and work.

Use NomadLife's Eco Trip feature to calculate and track your carbon footprint on every trip. The planet is our home — wherever we are.`,
        category: "lifestyle",
        city: null,
        country: null,
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=630&fit=crop",
        tags: ["sustainability", "eco travel", "carbon footprint", "slow travel", "green coworking", "CO2 offsetting", "digital nomad", "green travel"],
        author: "NomadLife Team",
        published: true,
      });
      console.log("[Blog] Created eco-sustainability article 1 (EN)");
    }

    if (!existingSlugs.includes(slugs[1])) {
      await db.insert(blogPosts).values({
        slug: slugs[1],
        title: "The Most Sustainable Cities for Digital Nomads in 2026",
        excerpt: "Ranking the top 10 eco-friendly cities for remote work. Renewable energy, green transport, air quality, and sustainable coworking — where to go for a low-impact nomadic lifestyle.",
        content: `# The Most Sustainable Cities for Digital Nomads in 2026

Not all nomad destinations are equal from an environmental standpoint. We analyzed the top cities for digital nomads evaluating: renewable energy, public transport, air quality, green spaces, and sustainable coworking infrastructure.

## The Ranking

### 1. Oslo, Norway
**Eco Score: 9.5/10**

Oslo is Europe's green capital. 98% of Norwegian energy is renewable (hydroelectric). Public transport is electric, and combustion cars have nearly vanished from the city center.

- **Average monthly cost**: $3,000-3,800
- **WiFi**: excellent everywhere
- **Coworking**: Mesh (100% green energy), Spaces Stortorget
- **Pros**: pristine air, nature accessible by metro, 20+ hours of summer light
- **Cons**: very high cost of living, dark and cold winters

### 2. Amsterdam, Netherlands
**Eco Score: 9.2/10**

The city of bicycles needs no introduction. 36% of all trips are by bike, and the government targets 100% renewable by 2030.

- **Average monthly cost**: $2,400-3,000
- **WiFi**: excellent
- **Coworking**: B.Amsterdam, WeWork Weteringschans, The Student Hotel
- **Pros**: cycling culture, inclusivity, vibrant tech scene
- **Cons**: frequent rain, expensive and hard-to-find housing

### 3. Stockholm, Sweden
**Eco Score: 9.0/10**

Sweden recycles 99% of its waste and aims to become the first fossil-free country in the world. Stockholm has efficient and sustainable metro, bus, and train systems.

- **Average monthly cost**: $2,700-3,500
- **WiFi**: excellent
- **Coworking**: Epicenter, SUP46, United Spaces
- **Pros**: innovation, quality of life, archipelago nature
- **Cons**: long winter, high costs

### 4. Lisbon, Portugal
**Eco Score: 8.5/10**

Lisbon has invested heavily in electric public transport and solar energy. The mild climate reduces the need for heating and air conditioning.

- **Average monthly cost**: $1,600-2,400
- **WiFi**: very good
- **Coworking**: Second Home, Outsite, Heden
- **Pros**: affordable for Europe, sunshine, massive nomad community, excellent food
- **Cons**: gentrification, hot summers, noisy city center

### 5. Copenhagen, Denmark
**Eco Score: 8.8/10**

Copenhagen aims to become carbon neutral by 2025. 62% of citizens commute by bike. Offshore wind farms power much of the city.

- **Average monthly cost**: $2,800-3,600
- **WiFi**: excellent
- **Coworking**: Soho, Rainmaking Loft, BLOX Hub
- **Pros**: design, happiness, bike-friendliness, hygge
- **Cons**: very expensive, cold and dark winters

### 6. San Jose, Costa Rica
**Eco Score: 8.3/10**

Costa Rica generates **99% of its energy from renewable sources** — a world record. Biodiversity is extraordinary and the government plans to fully decarbonize by 2050.

- **Average monthly cost**: $1,300-2,000
- **WiFi**: good in urban areas, variable in rural zones
- **Coworking**: Selina, Impact Hub San Jose, Cenfotec
- **Pros**: incredible nature, pura vida lifestyle, digital nomad visa available
- **Cons**: unstable WiFi outside cities, intense rainy season

### 7. Ljubljana, Slovenia
**Eco Score: 8.2/10**

Ljubljana was European Green Capital in 2016 and has kept improving since. Pedestrian-only old town, green transport, parks everywhere.

- **Average monthly cost**: $1,300-1,700
- **WiFi**: very good
- **Coworking**: ABC Hub, Poligon, Technology Park Ljubljana
- **Pros**: affordable for Europe, safe, Alpine nature 30 minutes away
- **Cons**: small, limited nomad community, cold winters

### 8. Tokyo, Japan
**Eco Score: 7.8/10**

Tokyo has the world's most efficient public transport system. Japan is investing heavily in hydrogen and solar. The zero-waste culture runs deep.

- **Average monthly cost**: $2,000-2,700
- **WiFi**: excellent
- **Coworking**: WeWork, Fabbit, AND Space
- **Pros**: absolute safety, perfect trains, legendary food, unique culture
- **Cons**: language barrier, small apartments, visa bureaucracy

### 9. Valencia, Spain
**Eco Score: 7.5/10**

Valencia was European Green Capital in 2024. It has Europe's largest urban garden (Turia), over 160 km of bike lanes, and a climate that reduces energy consumption.

- **Average monthly cost**: $1,500-2,100
- **WiFi**: very good
- **Coworking**: Wayco, The Shed, Impact Hub Valencia
- **Pros**: excellent value for money, climate, paella, beach
- **Cons**: less international than Barcelona, extreme summer heat

### 10. Taipei, Taiwan
**Eco Score: 7.3/10**

Taiwan is investing massively in solar and wind. Taipei has an excellent metro and bike-sharing system (YouBike), and recycling culture is highly developed.

- **Average monthly cost**: $1,300-2,000
- **WiFi**: excellent (one of the best in the world)
- **Coworking**: CLBC, Hive Taipei, AppWorks
- **Pros**: blazing-fast internet, incredible food, ultra-safe, affordable
- **Cons**: seasonal typhoons, extreme summer humidity, language barrier

## How to Choose Your Green Destination

Beyond the eco score, consider:
- **Seasonality**: avoid needing AC in summer or heating in winter by choosing temperate climates
- **Local transport**: a city with good metro/bike infrastructure reduces daily impact
- **Local diet**: countries with strong plant-based traditions (India, Japan, Thailand) make sustainable eating easier
- **Slow travel**: the best way to reduce your footprint is staying longer

## The Future of Sustainable Nomadism

By 2030, digital nomads are estimated to number over 60 million. If each one reduced their footprint by just 30%, the impact would be enormous. Technology helps: NomadLife automatically calculates CO2 for every trip and suggests greener alternatives.

The future of nomadism isn't just about where you go — it's about how you get there and how you live when you're there.`,
        category: "travel",
        city: null,
        country: null,
        imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=630&fit=crop",
        tags: ["sustainability", "green cities", "digital nomad", "eco travel", "sustainable coworking", "carbon neutral", "slow travel", "renewable energy", "2026"],
        author: "NomadLife Team",
        published: true,
      });
      console.log("[Blog] Created eco-sustainability article 2 (EN)");
    }
  } catch (error) {
    console.error("[Blog] Eco articles seed error:", error);
  }
}

async function seedGeopoliticsArticles() {
  try {
    const oldSlugs = ["geopolitica-nomadismo-digitale-conflitti-rotte", "visti-digitali-2026-mappa-geopolitica-opportunita"];
    for (const s of oldSlugs) { await db.delete(blogPosts).where(eq(blogPosts.slug, s)); }

    const slugs = ["geopolitics-digital-nomadism-how-conflicts-reshape-routes", "digital-nomad-visas-2026-geopolitical-map-opportunities"];
    const existingSlugs = (await db.select({ slug: blogPosts.slug }).from(blogPosts)).map(r => r.slug);

    if (!existingSlugs.includes(slugs[0])) {
      await db.insert(blogPosts).values({
        slug: slugs[0],
        title: "Geopolitics & Digital Nomadism: How Conflicts Are Reshaping Nomad Routes",
        excerpt: "Wars, sanctions, diplomatic crises: how geopolitical events in 2025-2026 are redrawing the map for digital nomads. Which countries to avoid, which are emerging, and how to protect yourself.",
        content: `# Geopolitics & Digital Nomadism: How Conflicts Are Reshaping Nomad Routes

Digital nomadism doesn't exist in a bubble. Geopolitical events — wars, sanctions, diplomatic tensions, economic crises — directly affect where we can go, how much it costs to live there, and how safe it is to work remotely. Here's an updated analysis for 2026.

## The Risk Map in 2026

### Eastern Europe and the Russia-Ukraine Conflict
The conflict that began in 2022 has redrawn nomad routes across Eastern Europe. Ukraine, which was emerging as a tech hub before the war (Kyiv had a vibrant startup ecosystem), is obviously off the table.

**Indirect impacts:**
- **Georgia and Armenia**: received a wave of Russian nomads fleeing the regime. Tbilisi has become a nomad hub, but the influx has driven up prices
- **Baltic States** (Estonia, Latvia, Lithuania): have made entry harder for Russian citizens while strengthening cybersecurity
- **Poland**: has become the new gateway to Eastern Europe, with Warsaw and Krakow growing rapidly

### Middle East
The Middle East situation remains complex:
- **Israel**: Tel Aviv was a top-tier tech hub, but the current situation has drastically reduced the influx of nomads
- **UAE**: Dubai remains stable and continues attracting nomads with its one-year visa, despite regional tensions
- **Jordan and Oman**: emerging destinations for those seeking the Middle East without conflict zone risks

### Asia-Pacific and China-Taiwan Tensions
Tensions in the Taiwan Strait concern nomads across Asia:
- **Taiwan**: despite geopolitical risks, it remains one of the best destinations for internet and quality of life. But having a Plan B is advisable
- **Japan and South Korea**: stable but monitoring the situation closely
- **Southeast Asia**: Thailand, Vietnam, and Indonesia remain distant from direct tensions

### Africa: Emerging Opportunities
Several African countries are introducing digital nomad visas:
- **Mauritius**: stable, English-speaking, easy nomad visa
- **Cape Verde**: safe, excellent climate, growing community
- **Namibia**: surprisingly well-connected, unique landscapes
- **Rwanda**: strong economic and tech growth, but authoritarian

## How Sanctions Affect Nomads

International sanctions don't just hit states — they have practical effects on nomads' daily lives:

### Payment Systems
- **Western bank cards** don't work in Russia, Iran, and Cuba
- **Crypto** has become an alternative payment method in many sanctioned countries
- **Wise and Revolut** have restrictions on transfers to certain countries

### Flights and Transport
- **Closed airspace** over Russia and Ukraine has made Europe-Asia flights longer and more expensive (up to 2-3 extra hours)
- Routes to Southeast Asia now go through the Middle East or the Arctic
- Flight costs have increased 15-25% on intercontinental routes

### Internet and Censorship
- **VPN essential** in China, Russia, Iran, Turkey (partially)
- Some countries block work platforms (Slack, Notion, Google Workspace)
- **Net Neutrality** is not guaranteed everywhere

## Geopolitical "Safe Havens" for Nomads

Some countries stand out for stability and welcoming attitudes:

### Portugal
- Democratically stable for decades
- NATO and EU member
- D7 visa and digital nomad visa
- Massive nomad community in Lisbon, Porto, and Madeira

### Uruguay
- The "Switzerland of South America"
- Stable democracy, low corruption
- Not involved in regional conflicts
- Reasonable cost of living

### New Zealand
- Geographic isolation = distance from conflicts
- Solid democracy, high quality of life
- Working Holiday Visa for many nationalities
- Expensive but extremely safe

### Estonia
- Pioneer of e-Residency and digital governance
- NATO and EU member, stable despite proximity to Russia
- Tallinn as a tech hub

## How to Protect Yourself: Geopolitical Checklist for Nomads

1. **Travel insurance with evacuation coverage** — not the basic $20 plan, but a serious one covering medical and political evacuation (World Nomads, SafetyWing with add-ons)
2. **Register your trip** at your embassy or consulate
3. **Always have a Plan B** — keep a flexible flight ticket or funds for a quick exit
4. **Diversify your money** — don't keep all savings in one bank or currency
5. **VPN and data backup** — in case of internet shutdowns
6. **Follow NomadLife's Travel Alerts** for real-time updates on visas, safety, and natural disasters

## The Geopolitical Nomad Paradox

There's a paradox in digital nomadism in the geopolitical era: the very freedom of movement that defines us is the first thing crises put at risk. A strong passport (German, Japanese, Swedish) grants access to 190+ countries — but that number shrinks rapidly when a conflict erupts or diplomatic relations change.

The lesson? The digital nomad of 2026 can no longer ignore geopolitics. It's as essential a skill as having reliable WiFi.`,
        category: "travel",
        city: null,
        country: null,
        imageUrl: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&h=630&fit=crop",
        tags: ["geopolitics", "digital nomad", "safety", "conflicts", "sanctions", "visas", "travel alerts", "safe havens", "remote work"],
        author: "NomadLife Team",
        published: true,
      });
      console.log("[Blog] Created geopolitics article 1 (EN)");
    }

    if (!existingSlugs.includes(slugs[1])) {
      await db.insert(blogPosts).values({
        slug: slugs[1],
        title: "Digital Nomad Visas in 2026: The Geopolitical Map of Opportunities",
        excerpt: "Over 60 countries now offer digital nomad visas in 2026. Complete analysis: which ones are actually worth it, income requirements, taxation, duration, and strategies to choose the best one.",
        content: `# Digital Nomad Visas in 2026: The Geopolitical Map of Opportunities

The race for the "Digital Nomad Visa" has become a geopolitical competition. Over 60 countries now offer a specific visa for remote workers, and the number grows every month. But behind this openness lies a precise economic strategy: attracting talent, capital, and expertise.

## Why Are Countries Competing for Digital Nomads?

The numbers speak for themselves: in 2026, there are roughly **40 million** digital nomads worldwide, with an average income exceeding $50,000 per year. For a country like Estonia (1.3 million inhabitants), attracting even 10,000 nomads means a significant economic impact.

**What governments are looking for:**
- **Local spending** — rent, food, transport, entertainment
- **No impact on the local job market** — nomads work for foreign companies
- **Qualified human capital** — tech talent, creatives, entrepreneurs
- **Soft power** — nomads speaking positively about the country on social media

## The Visa Map in 2026

### Europe

**Portugal — D8 Digital Nomad Visa**
- Minimum income: €3,510/month (4x minimum wage)
- Duration: 1 year, renewable up to 5 years
- Taxation: NHR regime (Non-Habitual Resident), 20% flat for 10 years
- Permanent residency possible after 5 years
- **Verdict**: the best in Europe for the path to residency

**Spain — Ley de Startups (Digital Nomad Visa)**
- Minimum income: ~€2,520/month (200% of minimum wage)
- Duration: 1 year, renewable up to 3
- Taxation: 24% flat on first €600,000 for 4 years (Beckham regime)
- **Verdict**: excellent tax regime, but slow bureaucracy

**Greece — Digital Nomad Visa**
- Minimum income: €3,500/month
- Duration: 1 year, renewable
- Taxation: 50% tax reduction for 7 years if you become a tax resident
- **Verdict**: great climate and cost of living, improved bureaucracy

**Estonia — Digital Nomad Visa**
- Minimum income: €4,500/month (highest in Europe)
- Duration: 1 year
- No local taxation on foreign income
- Separate e-Residency (for opening an EU business)
- **Verdict**: perfect for those with an EU business, but high income threshold

**Croatia — Digital Nomad Visa**
- Minimum income: ~€2,540/month
- Duration: 1 year, non-renewable (must leave and re-enter)
- No local taxation
- **Verdict**: good value, but the non-renewal aspect is a limitation

### Americas

**Mexico — Residente Temporal**
- Minimum income: ~€2,700/month (or savings of ~€45,000)
- Duration: 1-4 years
- Taxation: complex — risk of becoming a tax resident after 183 days
- **Verdict**: de facto the most popular nomad destination, but the visa isn't nomad-specific

**Colombia — Digital Nomad Visa**
- Minimum income: ~€2,800/month (3x minimum wage)
- Duration: 2 years, renewable
- No taxation on foreign income for the first year
- **Verdict**: Medellin is among the world's best nomad cities, solid visa

**Brazil — Digital Nomad Visa**
- Minimum income: ~€1,500/month
- Duration: 1 year, renewable
- No taxation on foreign income for the first 12 months
- **Verdict**: low income threshold, but complex bureaucracy

**Costa Rica — Digital Nomad Visa (Rentista Digital)**
- Minimum income: ~€3,000/month
- Duration: 1 year, renewable
- Taxation: only on income earned in Costa Rica
- **Verdict**: incredible nature, 99% renewable energy, but rising cost of living

### Asia & Oceania

**Thailand — Long-Term Resident (LTR) Visa**
- Minimum income: ~€70,000/year for the "Work from Thailand" category
- Duration: 5 years (!) with multiple entries
- Taxation: 17% flat (reduced from 35%)
- **Verdict**: high income threshold, but the 5-year duration is unbeatable

**Indonesia — Digital Nomad Visa (B211A DN)**
- Minimum income: ~€1,800/month
- Duration: 1 year
- Taxation: none on foreign income
- **Verdict**: Bali remains the nomad mecca, the visa finally matches the demand

**Japan — Digital Nomad Visa (2024)**
- Minimum income: ~€65,000/year
- Duration: 6 months, non-renewable
- No taxation
- **Verdict**: Japan has finally opened up, but conditions are restrictive

**Malaysia — DE Rantau**
- Minimum income: ~€22,000/year
- Duration: 1 year, renewable
- No taxation on foreign income
- **Verdict**: KL is underrated — fast internet, incredible food, low cost

### Africa & Middle East

**Mauritius — Premium Travel Visa**
- Minimum income: no formal minimum (proof of sufficient income)
- Duration: 1 year, renewable
- No taxation on foreign income
- **Verdict**: tropical English-speaking paradise, zero bureaucracy

**Dubai — Virtual Working Visa**
- Minimum income: ~€3,500/month
- Duration: 1 year
- Zero taxation (no income tax in UAE)
- **Verdict**: luxury and zero taxes, but high cost of living

**Cape Verde — Remote Working Visa**
- Minimum income: ~€1,400/month
- Duration: 6 months, renewable up to 1 year
- **Verdict**: emerging destination, perfect climate, small but growing community

## Strategies for Choosing the Right Visa

### Lowest Income Requirement
1. **Brazil** (€1,500/month)
2. **Cape Verde** (€1,400/month)
3. **Indonesia** (€1,800/month)

### Zero Tax
1. **Dubai** — zero income tax
2. **Mauritius** — no tax on foreign income
3. **Croatia** — no local taxation

### Path to Residency
1. **Portugal** — permanent residency after 5 years
2. **Colombia** — clear path to residency
3. **Spain** — possible after 5 years

### Longest Duration
1. **Thailand** — 5 years
2. **Mexico** — up to 4 years
3. **Colombia** — 2 years renewable

## The Future of Digital Nomad Visas

The trend is clear: by 2028, virtually every tourist-friendly country will have a digital nomad visa. Competition will shift to:
- **Competitive taxation** — low or zero taxes to attract talent
- **Digital infrastructure** — fiber optics, 5G, coworking
- **Quality of life** — healthcare, safety, community
- **Bilateral agreements** — reciprocal visas between "nomad-friendly" countries

The nomad of the future won't just choose where to go — they'll choose which country's "ecosystem" to belong to. And the countries that understand this first will win the new global competition for talent.`,
        category: "tips",
        city: null,
        country: null,
        imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop",
        tags: ["digital nomad visa", "geopolitics", "taxation", "digital nomad", "remote work", "residency", "portugal", "thailand", "dubai", "2026"],
        author: "NomadLife Team",
        published: true,
      });
      console.log("[Blog] Created geopolitics article 2 (EN)");
    }
  } catch (error) {
    console.error("[Blog] Geopolitics articles seed error:", error);
  }
}
