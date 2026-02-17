import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import webpush from "web-push";
import { insertUserSchema, insertPostSchema, insertPlaceSchema, insertBookingSchema, insertChatGroupSchema, insertMessageSchema, insertSubscriptionSchema, insertEventSchema, insertEventRegistrationSchema, insertTripSchema, insertTripStopSchema, insertTripExpenseSchema, insertNotificationSchema, insertCitySchema, insertCityFeedbackSchema, insertPushSubscriptionSchema, insertPlaceReviewSchema, updateTripStopSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAiSocialHubRoutes } from "./ai-social-hub";
import { createRepository, pushFile, getGitHubUser } from "./github";

// Configure VAPID keys for push notifications
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:nomadlife@replit.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId: string, title: string, body: string, url?: string) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    
    const subscriptions = await storage.getPushSubscriptionsByUser(userId);
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: url || "/" },
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected" && (result.reason as any)?.statusCode === 410) {
        await storage.deletePushSubscription(userId, subscriptions[i].endpoint);
      }
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Invalid credentials" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    if (!user) {
      // User was deleted, clear the session
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    // If user not found, don't crash - just return false
    done(null, false);
  }
});

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  registerObjectStorageRoutes(app, requireAuth);
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAiSocialHubRoutes(app);
  
  // ========== AUTH ROUTES ==========
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const pw = data.password;
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) {
        return res.status(400).send({ error: "La password deve avere almeno 8 caratteri, una maiuscola, un numero e un carattere speciale" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).send({ error: "Username già in uso" });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send({ error: "Email già in uso" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      
      // Auto login after signup
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).send(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const { password, ...userWithoutPassword } = req.user as User;
    res.send(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.send({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as User;
    res.send(userWithoutPassword);
  });

  // ========== USER ROUTES ==========
  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.send([]);
      }
      const users = await storage.searchUsers(query);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.send(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.send(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.send(userWithoutPassword);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.params.id !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const updates = req.body;
      delete updates.password; // Don't allow password changes through this endpoint
      
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.send(userWithoutPassword);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== POST ROUTES ==========
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const posts = await storage.getPosts(limit);
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const posts = await storage.getPostsByUser(req.params.userId);
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPostById(req.params.id);
      if (!post) {
        return res.status(404).send({ error: "Post not found" });
      }
      res.send(post);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const data = insertPostSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
      });
      const post = await storage.createPost(data);
      res.status(201).send(post);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const post = await storage.likePost(req.params.id);
      if (!post) {
        return res.status(404).send({ error: "Post not found" });
      }
      res.send(post);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== MOMENTS (STORIES) ROUTES ==========
  app.get("/api/moments", async (_req, res) => {
    try {
      const moments = await storage.getActiveMoments();
      res.send(moments);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/moments/user/:userId", async (req, res) => {
    try {
      const moments = await storage.getUserMoments(req.params.userId);
      res.send(moments);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/moments/:id", async (req, res) => {
    try {
      const moment = await storage.getMoment(req.params.id);
      if (!moment) return res.status(404).send({ error: "Moment not found" });
      res.send(moment);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/moments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const moment = await storage.createMoment({
        ...req.body,
        userId,
        expiresAt,
      });
      res.send(moment);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/moments/:id/view", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      await storage.viewMoment(req.params.id, userId);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/moments/:id/like", requireAuth, async (req, res) => {
    try {
      const moment = await storage.likeMoment(req.params.id);
      if (!moment) return res.status(404).send({ error: "Moment not found" });
      res.send(moment);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/moments/:id/viewers", requireAuth, async (req, res) => {
    try {
      const viewers = await storage.getMomentViewers(req.params.id);
      res.send(viewers);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/moments/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteMoment(req.params.id);
      if (!deleted) return res.status(404).send({ error: "Moment not found" });
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== SAVED POSTS ROUTES ==========
  app.get("/api/saved-posts", requireAuth, async (req, res) => {
    try {
      const saved = await storage.getSavedPosts((req.user as User).id);
      res.send(saved);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/saved-posts/ids", requireAuth, async (req, res) => {
    try {
      const ids = await storage.getSavedPostIds((req.user as User).id);
      res.send(ids);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/posts/:id/save", requireAuth, async (req, res) => {
    try {
      const saved = await storage.savePost((req.user as User).id, req.params.id);
      res.status(201).send(saved);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/posts/:id/save", requireAuth, async (req, res) => {
    try {
      const success = await storage.unsavePost((req.user as User).id, req.params.id);
      res.send({ success });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== FOLLOWED TRIPS ROUTES ==========
  app.get("/api/followed-trips", requireAuth, async (req, res) => {
    try {
      const followed = await storage.getFollowedTrips((req.user as User).id);
      res.send(followed);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/followed-trips/ids", requireAuth, async (req, res) => {
    try {
      const ids = await storage.getFollowedTripIds((req.user as User).id);
      res.send(ids);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/trips/:id/follow", requireAuth, async (req, res) => {
    try {
      const followed = await storage.followTrip((req.user as User).id, req.params.id);
      res.status(201).send(followed);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/trips/:id/follow", requireAuth, async (req, res) => {
    try {
      const success = await storage.unfollowTrip((req.user as User).id, req.params.id);
      res.send({ success });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/trips/:id/is-followed", requireAuth, async (req, res) => {
    try {
      const isFollowed = await storage.isTripFollowed((req.user as User).id, req.params.id);
      res.send({ isFollowed });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== COMMENT ROUTES ==========
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.send(comments);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const comment = await storage.createComment({
        postId: req.params.id,
        userId: (req.user as User).id,
        content: req.body.content,
      });
      res.status(201).send(comment);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteComment(req.params.id, (req.user as User).id);
      if (!success) {
        return res.status(403).send({ error: "Not authorized" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== PLACE ROUTES ==========
  app.get("/api/places", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.type) filters.type = req.query.type as string;
      
      const places = await storage.getPlaces(filters);
      res.send(places);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/places/search", async (req, res) => {
    try {
      const filters = {
        query: req.query.query as string | undefined,
        city: req.query.city as string | undefined,
        type: req.query.type as string | undefined,
        priceMin: req.query.priceMin ? parseInt(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseInt(req.query.priceMax as string) : undefined,
        amenities: req.query.amenities ? (req.query.amenities as string).split(",") : undefined,
      };
      const places = await storage.searchPlaces(filters);
      res.send(places);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/places/:id", async (req, res) => {
    try {
      const place = await storage.getPlace(req.params.id);
      if (!place) {
        return res.status(404).send({ error: "Place not found" });
      }
      res.send(place);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/places", requireAuth, async (req, res) => {
    try {
      const data = insertPlaceSchema.parse(req.body);
      const place = await storage.createPlace(data);
      res.status(201).send(place);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // ========== EXTERNAL HOTEL SEARCH (ready for API integration) ==========
  app.get("/api/hotels/search", requireAuth, async (req, res) => {
    try {
      const { city, checkIn, checkOut, guests, currency } = req.query;
      
      if (!city) {
        return res.status(400).send({ error: "City is required" });
      }

      // TODO: Replace with real hotel API (Booking.com, Hotels.com, Amadeus, etc.)
      // When API key is configured, this will call the external service.
      // For now, return local places filtered by city + any matching results structure.
      const apiKey = process.env.HOTEL_API_KEY;
      
      if (apiKey) {
        // Future: Call external hotel API here
        // const results = await fetchExternalHotels({ city, checkIn, checkOut, guests, apiKey });
        // return res.send(results);
      }
      
      // Fallback: search local places database
      const localResults = await storage.searchPlaces({
        query: city as string,
        type: "hotel",
      });
      
      res.send({
        source: apiKey ? "external" : "local",
        city: city as string,
        checkIn: checkIn as string || null,
        checkOut: checkOut as string || null,
        results: localResults.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          location: p.location,
          city: p.city,
          country: p.country,
          description: p.description,
          price: p.price,
          pricePerNight: p.pricePerNight,
          currency: p.currency || "EUR",
          imageUrl: p.imageUrl,
          rating: p.rating,
          reviews: p.reviews,
          amenities: p.amenities,
          latitude: p.latitude,
          longitude: p.longitude,
          affiliateUrl: null, // Will be populated by external API
          externalId: null,
        })),
      });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== PLACE REVIEWS ==========
  app.get("/api/places/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getPlaceReviews(req.params.id);
      res.send(reviews);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/places/:id/ratings", async (req, res) => {
    try {
      const ratings = await storage.getPlaceAverageRatings(req.params.id);
      res.send(ratings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/places/:id/reviews", requireAuth, async (req, res) => {
    try {
      const data = insertPlaceReviewSchema.parse({
        ...req.body,
        placeId: req.params.id,
        userId: (req.user as User).id,
      });
      const review = await storage.createPlaceReview(data);
      res.status(201).send(review);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.delete("/api/reviews/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePlaceReview(req.params.id, (req.user as User).id);
      if (!deleted) {
        return res.status(404).send({ error: "Review not found or not authorized" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== BOOKING ROUTES ==========
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getBookings((req.user as User).id);
      res.send(bookings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const data = insertBookingSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
        checkInDate: new Date(req.body.checkInDate),
      });
      const booking = await storage.createBooking(data);
      res.status(201).send(booking);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const booking = await storage.cancelBooking(req.params.id);
      if (!booking) {
        return res.status(404).send({ error: "Booking not found" });
      }
      res.send(booking);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== CHAT GROUP ROUTES ==========
  app.get("/api/chat-groups", async (req, res) => {
    try {
      const groups = await storage.getChatGroups();
      res.send(groups);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/chat-groups/:id", async (req, res) => {
    try {
      const group = await storage.getChatGroup(req.params.id);
      if (!group) {
        return res.status(404).send({ error: "Chat group not found" });
      }
      res.send(group);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/chat-groups", requireAuth, async (req, res) => {
    try {
      const data = insertChatGroupSchema.parse(req.body);
      const userId = (req.user as User).id;

      let latitude: string | undefined;
      let longitude: string | undefined;
      if (data.city) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.city)}&format=json&limit=1`,
            { headers: { "User-Agent": "NomadLife/1.0" } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.length > 0) {
              latitude = geoData[0].lat;
              longitude = geoData[0].lon;
            }
          }
        } catch (e) {
          console.error("Geocoding failed for group:", e);
        }
      }

      const group = await storage.createChatGroup({
        ...data,
        latitude: latitude || null,
        longitude: longitude || null,
        createdById: userId,
      });

      await storage.joinGroup(group.id, userId);

      res.status(201).send(group);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/chat-groups/:id/join", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const group = await storage.getChatGroup(req.params.id);
      if (!group) return res.status(404).send({ error: "Group not found" });
      await storage.joinGroup(group.id, userId);
      const updated = await storage.getChatGroup(group.id);
      res.send(updated);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/chat-groups/:id/leave", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      await storage.leaveGroup(req.params.id, userId);
      const updated = await storage.getChatGroup(req.params.id);
      res.send(updated);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/chat-groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupMembersWithDetails(req.params.id);
      const safeMembers = members.map(({ password, ...rest }) => rest);
      res.send(safeMembers);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/chat-groups/:id/is-member", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const isMember = await storage.isGroupMember(req.params.id, userId);
      res.send({ isMember });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== MESSAGE ROUTES ==========
  app.get("/api/messages/group/:groupId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getGroupMessages(req.params.groupId, limit);
      res.send(messages);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/messages/private/:userId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getPrivateMessages((req.user as User).id, req.params.userId, limit);
      res.send(messages);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations((req.user as User).id);
      res.send(conversations);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const result = await storage.markMessageAsRead(req.params.id);
      res.send(result);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Mark all messages from a sender as read
  app.patch("/api/messages/conversation/:senderId/read", requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as User).id;
      const senderId = req.params.senderId;
      // userId is receiver (current user), partnerId is sender
      await storage.markConversationAsRead(currentUserId, senderId);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: (req.user as User).id,
      });
      const message = await storage.createMessage(data);
      
      if (data.receiverId && data.receiverId !== (req.user as User).id) {
        const senderName = (req.user as User).name || (req.user as User).username;
        sendPushToUser(data.receiverId, "NomadLife", `${senderName}: ${data.content?.substring(0, 100) || "Nuovo messaggio"}`, `/chat`);
      }
      
      res.status(201).send(message);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  // ========== SUBSCRIPTION ROUTES ==========
  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription((req.user as User).id);
      res.send(subscription || null);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/subscription", requireAuth, async (req, res) => {
    try {
      const data = insertSubscriptionSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      
      // Mark user as premium
      await storage.updateUser((req.user as User).id, { isPremium: true });
      
      const subscription = await storage.createSubscription(data);
      res.status(201).send(subscription);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.patch("/api/subscription/:id", requireAuth, async (req, res) => {
    try {
      const subscription = await storage.updateSubscription(req.params.id, req.body);
      if (!subscription) {
        return res.status(404).send({ error: "Subscription not found" });
      }
      
      // If cancelled, update user premium status
      if (req.body.status === "cancelled") {
        await storage.updateUser((req.user as User).id, { isPremium: false });
      }
      
      res.send(subscription);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== EVENT ROUTES ==========
  app.get("/api/events", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.type) filters.type = req.query.type as string;
      const events = await storage.getEvents(filters);
      res.send(events);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }
      res.send(event);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const data = insertEventSchema.parse({
        ...req.body,
        hostId: (req.user as User).id,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const event = await storage.createEvent(data);
      res.status(201).send(event);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const data = insertEventRegistrationSchema.parse({
        eventId: req.params.id,
        userId: (req.user as User).id,
      });
      const registration = await storage.registerForEvent(data);
      res.status(201).send(registration);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.delete("/api/events/:id/register", requireAuth, async (req, res) => {
    try {
      const registration = await storage.cancelEventRegistration(req.params.id, (req.user as User).id);
      if (!registration) {
        return res.status(404).send({ error: "Registration not found" });
      }
      res.send(registration);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/event-registrations", requireAuth, async (req, res) => {
    try {
      const registrations = await storage.getUserEventRegistrations((req.user as User).id);
      res.send(registrations);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== EVENT LIKES ==========
  app.post("/api/events/:id/like", requireAuth, async (req, res) => {
    try {
      const event = await storage.likeEvent(req.params.id, (req.user as User).id);
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }
      res.send(event);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/events/:id/like", requireAuth, async (req, res) => {
    try {
      const event = await storage.unlikeEvent(req.params.id, (req.user as User).id);
      if (!event) {
        return res.status(404).send({ error: "Event not found" });
      }
      res.send(event);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/events/:id/liked", requireAuth, async (req, res) => {
    try {
      const liked = await storage.hasUserLikedEvent(req.params.id, (req.user as User).id);
      res.send({ liked });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== EVENT COMMENTS ==========
  app.get("/api/events/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getEventComments(req.params.id);
      res.send(comments);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/events/:id/comments", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).send({ error: "Comment content is required" });
      }
      const comment = await storage.createEventComment({
        eventId: req.params.id,
        userId: (req.user as User).id,
        content: content.trim(),
      });
      res.status(201).send(comment);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/events/:id/comments/:commentId", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteEventComment(req.params.commentId, (req.user as User).id);
      if (!deleted) {
        return res.status(404).send({ error: "Comment not found or not authorized" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== WEATHER API ==========
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).send({ error: "lat and lon are required" });
      }
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      
      const data = await response.json();
      
      const weatherCodes: Record<number, { description: string; icon: string }> = {
        0: { description: "Sereno", icon: "☀️" },
        1: { description: "Prevalentemente sereno", icon: "🌤️" },
        2: { description: "Parzialmente nuvoloso", icon: "⛅" },
        3: { description: "Nuvoloso", icon: "☁️" },
        45: { description: "Nebbia", icon: "🌫️" },
        48: { description: "Nebbia gelata", icon: "🌫️" },
        51: { description: "Pioggerella leggera", icon: "🌦️" },
        53: { description: "Pioggerella", icon: "🌦️" },
        55: { description: "Pioggerella intensa", icon: "🌧️" },
        61: { description: "Pioggia leggera", icon: "🌧️" },
        63: { description: "Pioggia", icon: "🌧️" },
        65: { description: "Pioggia intensa", icon: "🌧️" },
        71: { description: "Neve leggera", icon: "🌨️" },
        73: { description: "Neve", icon: "🌨️" },
        75: { description: "Neve intensa", icon: "❄️" },
        80: { description: "Rovesci leggeri", icon: "🌦️" },
        81: { description: "Rovesci", icon: "🌧️" },
        82: { description: "Rovesci intensi", icon: "⛈️" },
        95: { description: "Temporale", icon: "⛈️" },
        96: { description: "Temporale con grandine", icon: "⛈️" },
        99: { description: "Temporale con grandine intensa", icon: "⛈️" },
      };
      
      const code = data.current?.weather_code || 0;
      const weather = weatherCodes[code] || { description: "Sconosciuto", icon: "🌡️" };
      
      res.send({
        temperature: Math.round(data.current?.temperature_2m || 0),
        humidity: data.current?.relative_humidity_2m || 0,
        windSpeed: Math.round(data.current?.wind_speed_10m || 0),
        description: weather.description,
        icon: weather.icon,
      });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== ANALYTICS ROUTES ==========
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.send(analytics);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== TRIP ROUTES (TRAVEL DIARY) ==========
  app.get("/api/trips/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.send([]);
      }
      const trips = await storage.searchTripsByDestination(query);
      res.send(trips);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Live trips from followed users (in_progress status)
  app.get("/api/trips/live", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const liveTrips = await storage.getFollowingLiveTrips(userId);
      res.send(liveTrips);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Public trips for feed (completed trips that are public)
  app.get("/api/trips/public", async (req, res) => {
    try {
      const trips = await storage.getTrips({ isPublic: true, status: "completed" });
      res.send(trips);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/trips", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      
      // Always enforce visibility: only public trips OR own trips
      // Ignore client-provided isPublic/userId filters that would expose private data
      if (!userId) {
        // Unauthenticated: only public trips
        const trips = await storage.getTrips({ isPublic: true });
        res.send(trips);
      } else {
        // Authenticated: public trips + own trips
        const [publicTrips, ownTrips] = await Promise.all([
          storage.getTrips({ isPublic: true }),
          storage.getTrips({ userId, isPublic: false }),
        ]);
        // Merge and deduplicate (own public trips would be in both)
        const tripMap = new Map<string, any>();
        for (const trip of publicTrips) tripMap.set(trip.id, trip);
        for (const trip of ownTrips) tripMap.set(trip.id, trip);
        res.send(Array.from(tripMap.values()));
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      // Only allow access to public trips or own trips
      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      if (!trip.isPublic && trip.userId !== userId) {
        return res.status(403).send({ error: "Forbidden" });
      }
      res.send(trip);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/my-trips", requireAuth, async (req, res) => {
    try {
      const trips = await storage.getUserTrips((req.user as User).id);
      res.send(trips);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/trips", requireAuth, async (req, res) => {
    try {
      const data = insertTripSchema.parse({
        ...req.body,
        userId: (req.user as User).id,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const trip = await storage.createTrip(data);
      
      // Notify followers about new trip
      const followers = await storage.getFollowers((req.user as User).id);
      for (const f of followers) {
        await storage.createNotification({
          userId: f.followerId,
          type: "new_trip",
          message: `${(req.user as User).name} ha iniziato un nuovo viaggio: "${trip.title}"`,
          relatedUserId: (req.user as User).id,
          relatedTripId: trip.id,
        });
        sendPushToUser(f.followerId, "NomadLife", `${(req.user as User).name} ha iniziato un nuovo viaggio: "${trip.title}"`, `/trip/${trip.id}`);
      }
      
      res.status(201).send(trip);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.patch("/api/trips/:id", requireAuth, async (req, res) => {
    try {
      const existingTrip = await storage.getTrip(req.params.id);
      if (!existingTrip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      if (existingTrip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const updates = { ...req.body };
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);
      
      // Check if status is changing to 'in_progress' - notify followers
      const wasNotInProgress = existingTrip.status !== 'in_progress';
      const isNowInProgress = updates.status === 'in_progress';
      
      const trip = await storage.updateTrip(req.params.id, updates);
      
      // Send notifications to followers when trip starts
      if (wasNotInProgress && isNowInProgress && existingTrip.isPublic && trip) {
        try {
          const currentUser = req.user as User;
          const followers = await storage.getFollowers(currentUser.id);
          
          // Create unique set of follower IDs to avoid duplicates
          const notifiedIds = new Set<string>();
          for (const followerRelation of followers) {
            const followerId = followerRelation.followerId;
            // Skip if already notified or if it's the trip owner
            if (notifiedIds.has(followerId) || followerId === currentUser.id) continue;
            notifiedIds.add(followerId);
            
            await storage.createNotification({
              userId: followerId,
              type: 'trip_started',
              message: `${currentUser.name || currentUser.username} ha iniziato il viaggio "${trip.title}"`,
              relatedTripId: trip.id,
            });
            sendPushToUser(followerId, "NomadLife", `${currentUser.name || currentUser.username} ha iniziato il viaggio "${trip.title}"`, `/trip/${trip.id}`);
          }
        } catch (notifError) {
          console.error("Error sending trip start notifications:", notifError);
        }
      }
      
      res.send(trip);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/trips/:id", requireAuth, async (req, res) => {
    try {
      const existingTrip = await storage.getTrip(req.params.id);
      if (!existingTrip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      if (existingTrip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      await storage.deleteTrip(req.params.id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/trips/:id/copy", requireAuth, async (req, res) => {
    try {
      const sourceTrip = await storage.getTrip(req.params.id);
      if (!sourceTrip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      const currentUser = req.user as User;
      const newTrip = await storage.createTrip({
        userId: currentUser.id,
        title: `${sourceTrip.title} (copia)`,
        description: sourceTrip.description || "",
        startDate: sourceTrip.startDate,
        endDate: sourceTrip.endDate,
        startLocation: sourceTrip.startLocation,
        endLocation: sourceTrip.endLocation,
        isPublic: false,
        status: "planned",
      });
      const stops = await storage.getTripStops(req.params.id);
      for (const stop of stops) {
        await storage.createTripStop({
          tripId: newTrip.id,
          city: stop.city,
          country: stop.country,
          latitude: stop.latitude,
          longitude: stop.longitude,
          orderIndex: stop.orderIndex,
          arrivalDate: stop.arrivalDate,
          notes: stop.notes,
          transportMode: stop.transportMode,
          distanceKm: stop.distanceKm,
          co2Kg: stop.co2Kg,
          sourceTripId: req.params.id,
        });
      }
      res.json(newTrip);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // PATCH trip (status, visibility)
  app.patch("/api/trips/:tripId", requireAuth, async (req, res) => {
    try {
      const tripId = req.params.tripId;
      const existingTrip = await storage.getTrip(tripId);
      if (!existingTrip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      if (existingTrip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const { status, isPublic } = req.body;
      const updates: any = {};
      if (status !== undefined && ["planned", "in_progress", "completed"].includes(status)) {
        updates.status = status;
        if (status === "in_progress") {
          updates.isActive = true;
        } else if (status === "completed") {
          updates.isActive = false;
        }
      }
      if (isPublic !== undefined) {
        updates.isPublic = isPublic;
      }
      
      const updatedTrip = await storage.updateTrip(tripId, updates);
      res.json(updatedTrip);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== TRIP STOP ROUTES ==========
  app.get("/api/trips/:tripId/stops", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      // Only allow access to public trips or own trips
      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      if (!trip.isPublic && trip.userId !== userId) {
        return res.status(403).send({ error: "Forbidden" });
      }
      const stops = await storage.getTripStops(req.params.tripId);
      res.send(stops);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/trips/:tripId/stops", requireAuth, async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      if (trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const data = insertTripStopSchema.parse({
        ...req.body,
        tripId: req.params.tripId,
        arrivalDate: new Date(req.body.arrivalDate),
        departureDate: req.body.departureDate ? new Date(req.body.departureDate) : undefined,
      });
      const stop = await storage.createTripStop(data);
      
      // Notify followers about new stop
      if (trip.isPublic) {
        const followers = await storage.getFollowers((req.user as User).id);
        for (const f of followers) {
          await storage.createNotification({
            userId: f.followerId,
            type: "new_stop",
            message: `${(req.user as User).name} ha aggiunto una nuova tappa a "${trip.title}": ${stop.city}, ${stop.country}`,
            relatedUserId: (req.user as User).id,
            relatedTripId: trip.id,
          });
          sendPushToUser(f.followerId, "NomadLife", `${(req.user as User).name} ha aggiunto una nuova tappa: ${stop.city}, ${stop.country}`, `/trip/${trip.id}`);
        }
      }
      
      res.status(201).send(stop);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.patch("/api/stops/:id", requireAuth, async (req, res) => {
    try {
      // Get the stop first to check ownership
      const existingStop = await storage.getTripStop(req.params.id);
      if (!existingStop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(existingStop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const updates = { ...req.body };
      if (updates.arrivalDate) updates.arrivalDate = new Date(updates.arrivalDate);
      if (updates.departureDate) updates.departureDate = new Date(updates.departureDate);
      
      const stop = await storage.updateTripStop(req.params.id, updates);
      res.send(stop);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/stops/:id", requireAuth, async (req, res) => {
    try {
      // Get the stop first to check ownership
      const existingStop = await storage.getTripStop(req.params.id);
      if (!existingStop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(existingStop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      await storage.deleteTripStop(req.params.id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // PATCH stop (update transport mode, etc.)
  app.patch("/api/trips/:tripId/stops/:stopId", requireAuth, async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const stop = await storage.getTripStop(req.params.stopId);
      if (!stop || stop.tripId !== req.params.tripId) {
        return res.status(404).send({ error: "Stop not found" });
      }
      
      // Validate request body with Zod
      const parseResult = updateTripStopSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).send({ error: parseResult.error.errors[0]?.message || "Invalid data" });
      }
      
      const updated = await storage.updateTripStop(req.params.stopId, parseResult.data);
      res.send(updated);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== TRIP EXPENSE ROUTES ==========
  app.get("/api/stops/:stopId/expenses", async (req, res) => {
    try {
      // Check visibility of the trip this stop belongs to
      const stop = await storage.getTripStop(req.params.stopId);
      if (!stop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(stop.tripId);
      if (!trip) {
        return res.status(404).send({ error: "Trip not found" });
      }
      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      if (!trip.isPublic && trip.userId !== userId) {
        return res.status(403).send({ error: "Forbidden" });
      }
      const expenses = await storage.getStopExpenses(req.params.stopId);
      res.send(expenses);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/stops/:stopId/expenses", requireAuth, async (req, res) => {
    try {
      // Verify ownership through stop -> trip
      const stop = await storage.getTripStop(req.params.stopId);
      if (!stop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(stop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const data = insertTripExpenseSchema.parse({
        ...req.body,
        stopId: req.params.stopId,
      });
      const expense = await storage.createTripExpense(data);
      
      // Update city costs with this real expense data
      if (stop.city && expense.cost) {
        try {
          // Find or create the city
          let city = await storage.findCityByName(stop.city);
          if (!city) {
            // Create city if it doesn't exist
            city = await storage.createCity({
              name: stop.city,
              country: stop.country,
              latitude: stop.latitude || undefined,
              longitude: stop.longitude || undefined,
              emoji: "🌍",
            });
          }
          
          // Create feedback entry based on expense type
          const costInEuros = Math.round(expense.cost / 100); // Convert cents to euros
          const feedbackData: any = {
            cityId: city.id,
            userId: (req.user as User).id,
          };
          
          // Map expense type to feedback field
          if (expense.type === "hotel" || expense.type === "hostel" || expense.type === "airbnb") {
            feedbackData.accommodationCost = costInEuros;
          } else if (expense.type === "food" || expense.type === "groceries" || expense.type === "drinks") {
            feedbackData.foodCost = costInEuros;
          } else if (expense.type === "coworking") {
            feedbackData.coworkingCost = costInEuros;
          } else if (expense.type === "transport") {
            feedbackData.transportCost = costInEuros;
          }
          
          // Add ratings if provided
          if (expense.wifiRating) feedbackData.internetRating = expense.wifiRating;
          if (expense.rating) feedbackData.overallRating = expense.rating;
          
          if (Object.keys(feedbackData).length > 2) {
            await storage.createCityFeedback(feedbackData);
            await storage.updateCityCostsFromFeedback(city.id);
          }
        } catch (cityError) {
          console.error("Error updating city costs:", cityError);
          // Don't fail the expense creation
        }
      }
      
      res.status(201).send(expense);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      // Verify ownership through expense -> stop -> trip
      const existingExpense = await storage.getTripExpense(req.params.id);
      if (!existingExpense) {
        return res.status(404).send({ error: "Expense not found" });
      }
      const stop = await storage.getTripStop(existingExpense.stopId);
      if (!stop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(stop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      const expense = await storage.updateTripExpense(req.params.id, req.body);
      res.send(expense);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      // Verify ownership through expense -> stop -> trip
      const existingExpense = await storage.getTripExpense(req.params.id);
      if (!existingExpense) {
        return res.status(404).send({ error: "Expense not found" });
      }
      const stop = await storage.getTripStop(existingExpense.stopId);
      if (!stop) {
        return res.status(404).send({ error: "Stop not found" });
      }
      const trip = await storage.getTrip(stop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) {
        return res.status(403).send({ error: "Forbidden" });
      }
      
      await storage.deleteTripExpense(req.params.id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== FOLLOWER ROUTES ==========
  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const followers = await storage.getFollowers(req.params.id);
      res.send(followers);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const following = await storage.getFollowing(req.params.id);
      res.send(following);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/users/:id/follow-stats", async (req, res) => {
    try {
      const [followersCount, followingCount] = await Promise.all([
        storage.getFollowersCount(req.params.id),
        storage.getFollowingCount(req.params.id),
      ]);
      res.send({ followersCount, followingCount });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/users/:id/trips", async (req, res) => {
    try {
      const trips = await storage.getUserTripsWithStops(req.params.id);
      res.send(trips);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/is-following/:userId", requireAuth, async (req, res) => {
    try {
      const isFollowing = await storage.isFollowing((req.user as User).id, req.params.userId);
      res.send({ isFollowing });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/follow/:userId", requireAuth, async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      const currentUserId = (req.user as User).id;
      
      if (targetUserId === currentUserId) {
        return res.status(400).send({ error: "Cannot follow yourself" });
      }
      
      const alreadyFollowing = await storage.isFollowing(currentUserId, targetUserId);
      if (alreadyFollowing) {
        return res.status(400).send({ error: "Already following" });
      }
      
      const follower = await storage.follow(currentUserId, targetUserId);
      
      // Notify the user they have a new follower
      await storage.createNotification({
        userId: targetUserId,
        type: "new_follower",
        message: `${(req.user as User).name} ha iniziato a seguirti`,
        relatedUserId: currentUserId,
      });
      sendPushToUser(targetUserId, "NomadLife", `${(req.user as User).name} ha iniziato a seguirti`, `/profile/${currentUserId}`);
      
      res.status(201).send(follower);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/follow/:userId", requireAuth, async (req, res) => {
    try {
      const unfollowed = await storage.unfollow((req.user as User).id, req.params.userId);
      if (!unfollowed) {
        return res.status(404).send({ error: "Follow relationship not found" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== NOTIFICATION ROUTES ==========
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getUserNotifications((req.user as User).id, limit);
      res.send(notifications);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount((req.user as User).id);
      res.send({ count });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).send({ error: "Notification not found" });
      }
      res.send(notification);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead((req.user as User).id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== GITHUB ROUTES ==========
  app.post("/api/github/create-analytics-dashboard", requireAuth, async (req, res) => {
    try {
      const githubUser = await getGitHubUser();
      const repoName = "nomadlife-analytics-dashboard";
      const repoDescription = "Animated Analytics Dashboard for NomadLife - React + Recharts + Framer Motion";
      
      const repo = await createRepository(repoName, repoDescription, false);
      
      const analyticsCode = [
        '// NomadLife Analytics Dashboard',
        '// React component with animated charts using Recharts and Framer Motion',
        '',
        'import { useEffect, useState } from "react";',
        'import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";',
        'import { motion } from "framer-motion";',
        'import { Users, FileText, Calendar, CreditCard, TrendingUp } from "lucide-react";',
        '',
        'interface Analytics {',
        '  totalUsers: number;',
        '  premiumUsers: number;',
        '  totalPosts: number;',
        '  totalBookings: number;',
        '  totalMessages: number;',
        '  recentActivity: { date: string; users: number; posts: number; bookings: number }[];',
        '  postsByCity: { city: string; count: number }[];',
        '}',
        '',
        'function AnimatedCounter({ value }: { value: number }) {',
        '  const [count, setCount] = useState(0);',
        '  useEffect(() => {',
        '    let start = 0;',
        '    const timer = setInterval(() => { start += 1; setCount(start); if (start >= value) clearInterval(timer); }, 20);',
        '    return () => clearInterval(timer);',
        '  }, [value]);',
        '  return <span>{count}</span>;',
        '}',
        '',
        'export default function AnalyticsDashboard({ analytics }: { analytics: Analytics }) {',
        '  const mrr = analytics.premiumUsers * 29;',
        '  return (',
        '    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">',
        '      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">',
        '        <h1 className="text-3xl font-black text-white">Analytics Dashboard</h1>',
        '      </motion.div>',
        '      <div className="grid grid-cols-4 gap-4 mb-8">',
        '        <KPICard title="Users" value={analytics.totalUsers} icon={Users} />',
        '        <KPICard title="Premium" value={analytics.premiumUsers} icon={CreditCard} />',
        '        <KPICard title="Posts" value={analytics.totalPosts} icon={FileText} />',
        '        <KPICard title="Bookings" value={analytics.totalBookings} icon={Calendar} />',
        '      </div>',
        '      <div className="bg-green-500 rounded-2xl p-6 text-white mb-8">',
        '        <p>Monthly Revenue: $<AnimatedCounter value={mrr} /></p>',
        '      </div>',
        '    </div>',
        '  );',
        '}',
        '',
        'function KPICard({ title, value, icon: Icon }: any) {',
        '  return (',
        '    <div className="bg-slate-800 rounded-2xl p-4">',
        '      <Icon className="w-5 h-5 text-white" />',
        '      <p className="text-2xl font-black text-white"><AnimatedCounter value={value} /></p>',
        '      <p className="text-xs text-slate-400">{title}</p>',
        '    </div>',
        '  );',
        '}',
      ].join('\n');

      const readmeContent = [
        '# NomadLife Analytics Dashboard',
        '',
        'An animated analytics dashboard built with React, Recharts, and Framer Motion.',
        '',
        '## Features',
        '- Animated KPI Cards with counting animations',
        '- Interactive Charts (Area, Bar, Pie)',
        '- Glassmorphism dark theme design',
        '- Real-time data from API',
        '',
        '## Tech Stack',
        '- React 18',
        '- Recharts',
        '- Framer Motion',
        '- Tailwind CSS',
        '- Lucide React Icons',
        '',
        '## License',
        'MIT',
      ].join('\n');

      await pushFile(githubUser.login, repoName, "src/AnalyticsDashboard.tsx", analyticsCode, "Add Analytics Dashboard component");
      await pushFile(githubUser.login, repoName, "README.md", readmeContent, "Add README");
      
      res.send({ 
        success: true, 
        repository: repo.html_url,
        message: "Repository created at " + repo.html_url
      });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ============ CITIES API ============
  
  // Get all cities with cost of living data
  app.get("/api/cities", async (req, res) => {
    try {
      const cities = await storage.getAllCities();
      res.send(cities);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Search cities by name or country - combines local DB + OpenStreetMap
  app.get("/api/cities/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      if (query.length < 2) {
        return res.send([]);
      }
      
      // Search local database first
      const localCities = await storage.searchCities(query);
      
      // Also search OpenStreetMap Nominatim for cities not in our database
      let externalCities: any[] = [];
      try {
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
          { headers: { "User-Agent": "NomadLife/1.0" } }
        );
        
        if (nominatimRes.ok) {
          const results = await nominatimRes.json();
          
          for (const result of results) {
            if (result.type !== "city" && result.type !== "administrative" && result.addresstype !== "city") continue;
            
            const cityName = result.name || result.address?.city || "";
            const country = result.address?.country || "";
            
            // Skip if already in local results
            if (localCities.some(c => c.name.toLowerCase() === cityName.toLowerCase())) {
              continue;
            }
            
            // Skip duplicates in external results
            if (externalCities.some(c => c.name.toLowerCase() === cityName.toLowerCase())) {
              continue;
            }
            
            // Estimate costs based on region (simplified)
            let baseCost = 40; // Default daily cost
            const lat = parseFloat(result.lat);
            
            // Higher costs for Western Europe, US, Australia
            if (country.includes("United States") || country.includes("Australia") || 
                country.includes("United Kingdom") || country.includes("Switzerland") ||
                country.includes("Norway") || country.includes("Denmark")) {
              baseCost = 80;
            } else if (country.includes("Germany") || country.includes("France") || 
                       country.includes("Italy") || country.includes("Spain") ||
                       country.includes("Japan") || country.includes("Singapore")) {
              baseCost = 55;
            } else if (country.includes("Thailand") || country.includes("Vietnam") ||
                       country.includes("Indonesia") || country.includes("Philippines") ||
                       country.includes("Mexico") || country.includes("Colombia")) {
              baseCost = 25;
            } else if (country.includes("Russia") || country.includes("Poland") ||
                       country.includes("Portugal") || country.includes("Greece")) {
              baseCost = 40;
            }
            
            externalCities.push({
              id: `osm-${result.place_id}`,
              name: cityName,
              country: country,
              emoji: "🌍",
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              costAccommodationMin: Math.round(baseCost * 0.8),
              costAccommodationMax: Math.round(baseCost * 1.5),
              costFoodMin: Math.round(baseCost * 0.25),
              costFoodMax: Math.round(baseCost * 0.5),
              costCoworkingMin: Math.round(baseCost * 0.2),
              costCoworkingMax: Math.round(baseCost * 0.4),
              costTransportMin: Math.round(baseCost * 0.08),
              costTransportMax: Math.round(baseCost * 0.15),
              nomadsCount: 0,
              rating: 4.0,
              internetSpeed: 50,
              weather: null,
              feedbackCount: 0,
              fromAPI: true,
            });
          }
        }
      } catch (apiError) {
        console.error("Nominatim API error:", apiError);
      }
      
      // Combine results: local first, then external
      res.send([...localCities, ...externalCities]);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get single city by ID
  app.get("/api/cities/:id", async (req, res) => {
    try {
      const city = await storage.getCity(req.params.id);
      if (!city) {
        return res.status(404).send({ error: "City not found" });
      }
      res.send(city);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Submit feedback for a city (updates cost averages)
  app.post("/api/cities/:id/feedback", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const cityId = req.params.id;
      
      const parsed = insertCityFeedbackSchema.safeParse({
        ...req.body,
        cityId,
        userId,
      });
      
      if (!parsed.success) {
        return res.status(400).send({ error: parsed.error.message });
      }
      
      const feedback = await storage.createCityFeedback(parsed.data);
      
      // Update city costs based on new feedback
      await storage.updateCityCostsFromFeedback(cityId);
      
      res.send(feedback);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get feedback for a city
  app.get("/api/cities/:id/feedback", async (req, res) => {
    try {
      const feedback = await storage.getCityFeedback(req.params.id);
      res.send(feedback);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ===== PUSH NOTIFICATIONS =====
  
  // Get VAPID public key
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.send({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).send({ error: "Invalid subscription data" });
      }

      const userId = (req.user as User).id;
      
      // Check if already subscribed with this endpoint
      const existing = await storage.getPushSubscription(userId, endpoint);
      if (existing) {
        return res.send({ message: "Already subscribed" });
      }

      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.status(201).send({ message: "Subscribed successfully", id: subscription.id });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).send({ error: "Endpoint required" });
      }

      const userId = (req.user as User).id;
      await storage.deletePushSubscription(userId, endpoint);
      res.send({ message: "Unsubscribed successfully" });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== MARKETPLACE ROUTES ==========

  // Get all products (with optional category filter)
  app.get("/api/marketplace/products", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const products = await storage.getProducts(category);
      res.send(products);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get featured products
  app.get("/api/marketplace/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.send(products);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Track product click
  app.post("/api/marketplace/products/:id/click", async (req, res) => {
    try {
      const productId = req.params.id;
      await storage.trackProductClick(productId);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // Get all vendors
  app.get("/api/marketplace/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.send(vendors);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== ADMIN ROUTES ==========

  // Middleware to check if user is admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send({ error: "Non autenticato" });
    }
    const user = req.user as any;
    if (!user.isAdmin) {
      return res.status(403).send({ error: "Accesso negato - Solo admin" });
    }
    next();
  };

  // Check if current user is admin
  app.get("/api/admin/check", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.send({ isAdmin: false });
    }
    const user = req.user as any;
    res.send({ isAdmin: user.isAdmin || false });
  });

  // Get marketplace stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getMarketplaceStats();
      res.send(stats);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // VENDOR ADMIN ROUTES
  app.post("/api/admin/vendors", requireAdmin, async (req, res) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.send(vendor);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.put("/api/admin/vendors/:id", requireAdmin, async (req, res) => {
    try {
      const vendor = await storage.updateVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).send({ error: "Vendor non trovato" });
      }
      res.send(vendor);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/admin/vendors/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteVendor(req.params.id);
      if (!deleted) {
        return res.status(404).send({ error: "Vendor non trovato" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // PRODUCT ADMIN ROUTES
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.send(product);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).send({ error: "Prodotto non trovato" });
      }
      res.send(product);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).send({ error: "Prodotto non trovato" });
      }
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // SEO: Google Search Console verification file
  app.get("/google:verificationCode.html", (req, res) => {
    const code = req.params.verificationCode;
    if (code && /^[a-zA-Z0-9_-]+$/.test(code)) {
      res.send(`google-site-verification: google${code}.html`);
    } else {
      res.status(404).send("Not found");
    }
  });

  // SEO: Dynamic Sitemap
  app.get("/sitemap.xml", async (_req, res) => {
    const baseUrl = process.env.VITE_SITE_URL || "https://nomad-life.app";
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/map", priority: "0.9", changefreq: "daily" },
      { url: "/explore", priority: "0.8", changefreq: "daily" },
      { url: "/events", priority: "0.7", changefreq: "weekly" },
      { url: "/marketplace", priority: "0.7", changefreq: "weekly" },
      { url: "/coworking", priority: "0.7", changefreq: "weekly" },
      { url: "/diary", priority: "0.6", changefreq: "weekly" },
    ];

    try {
      const posts = await storage.getPosts(200);
      const events = await storage.getEvents();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      for (const page of staticPages) {
        xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      }

      for (const post of posts.slice(0, 200)) {
        xml += `
  <url>
    <loc>${baseUrl}/post/${post.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      }

      for (const event of events.slice(0, 100)) {
        xml += `
  <url>
    <loc>${baseUrl}/event/${event.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }

      xml += `
</urlset>`;

      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // ========== LOCAL LISTINGS (PROXIMITY MARKETPLACE) ==========
  app.get("/api/local-listings", async (req, res) => {
    try {
      const { category, city, status } = req.query;
      const listings = await storage.getLocalListings({
        category: category as string,
        city: city as string,
        status: status as string,
      });
      res.send(listings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/local-listings/nearby", async (req, res) => {
    try {
      const { lat, lng, radius, category } = req.query;
      if (!lat || !lng) return res.status(400).send({ error: "lat and lng required" });
      const radiusKm = parseFloat(radius as string) || 5;
      const listings = await storage.getNearbyListings(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radiusKm,
        category as string
      );
      res.send(listings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/local-listings/:id", async (req, res) => {
    try {
      const listing = await storage.getLocalListingById(req.params.id);
      if (!listing) return res.status(404).send({ error: "Listing not found" });
      res.send(listing);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/local-listings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const listing = await storage.createLocalListing({
        ...req.body,
        sellerId: user.id,
      });
      res.status(201).send(listing);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.patch("/api/local-listings/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const existing = await storage.getLocalListingById(req.params.id);
      if (!existing) return res.status(404).send({ error: "Listing not found" });
      if (existing.sellerId !== user.id) return res.status(403).send({ error: "Forbidden" });
      const updated = await storage.updateLocalListing(req.params.id, req.body);
      res.send(updated);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/local-listings/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const existing = await storage.getLocalListingById(req.params.id);
      if (!existing) return res.status(404).send({ error: "Listing not found" });
      if (existing.sellerId !== user.id) return res.status(403).send({ error: "Forbidden" });
      await storage.deleteLocalListing(req.params.id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/local-listings/user/:userId", requireAuth, async (req, res) => {
    try {
      const listings = await storage.getUserListings(req.params.userId);
      res.send(listings);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== CITY GUIDES ==========
  app.get("/api/city-guides", async (req, res) => {
    try {
      const { city, category } = req.query;
      const guides = await storage.getCityGuides(city as string, category as string);
      res.send(guides);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/city-guides/cities", async (req, res) => {
    try {
      const cities = await storage.getCityGuideCities();
      res.send(cities);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/city-guides/nearby", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      if (!lat || !lng) return res.status(400).send({ error: "lat and lng required" });
      const guides = await storage.getNearbyCityGuides(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string) || 50
      );
      res.send(guides);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/city-guides/:id", async (req, res) => {
    try {
      const guide = await storage.getCityGuideById(req.params.id);
      if (!guide) return res.status(404).send({ error: "Guide not found" });
      res.send(guide);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== SKILLS MATCHMAKING ==========
  app.get("/api/matchmaking/nearby", requireAuth, async (req, res) => {
    try {
      const { lat, lng, radius, skills } = req.query;
      if (!lat || !lng) return res.status(400).send({ error: "lat and lng required" });
      const skillsArr = skills ? (skills as string).split(",").map(s => s.trim()) : undefined;
      const nomads = await storage.getNearbyNomadsWithSkills(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string) || 5,
        skillsArr
      );
      const user = req.user as User;
      const filtered = nomads
        .filter(n => n.id !== user.id)
        .map(({ password, ...n }) => n);
      res.send(filtered);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== PRIVACY SETTINGS ==========
  app.patch("/api/users/:id/privacy", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (req.params.id !== user.id) return res.status(403).send({ error: "Forbidden" });
      const { privacyMode } = req.body;
      if (!['visible', 'approximate', 'hidden'].includes(privacyMode)) {
        return res.status(400).send({ error: "Invalid privacy mode" });
      }
      const updated = await storage.updateUser(user.id, { privacyMode });
      if (!updated) return res.status(404).send({ error: "User not found" });
      const { password, ...safe } = updated;
      res.send(safe);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  return httpServer;
}
