import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import webpush from "web-push";
import { insertUserSchema, insertPostSchema, insertPlaceSchema, insertBookingSchema, insertChatGroupSchema, insertMessageSchema, insertSubscriptionSchema, insertEventSchema, insertEventRegistrationSchema, insertTripSchema, insertTripStopSchema, insertTripExpenseSchema, insertNotificationSchema, insertCitySchema, insertCityFeedbackSchema, insertPushSubscriptionSchema, insertPlaceReviewSchema, updateTripStopSchema, insertBlogPostSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAiSocialHubRoutes } from "./ai-social-hub";
import { createRepository, pushFile, getGitHubUser } from "./github";
import { checkProximityAndNotify, getActiveAlerts, checkTravelAlerts } from "./travel-alerts";

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
      let user = await storage.getUserByUsername(username);
      if (!user && username.includes("@")) {
        user = await storage.getUserByEmail(username);
      }
      if (!user) {
        console.log(`[Auth] Login failed: user not found for "${username}"`);
        return done(null, false, { message: "user_not_found" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`[Auth] Login failed: wrong password for "${user.username}"`);
        return done(null, false, { message: "wrong_password" });
      }
      console.log(`[Auth] Login success: ${user.username}`);
      return done(null, user);
    } catch (error) {
      console.error(`[Auth] Login error:`, error);
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

async function verifyRecaptcha(token: string): Promise<{ success: boolean; score: number }> {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    return { success: true, score: 1.0 };
  }
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });
    const data = await res.json();
    return { success: data.success, score: data.score || 0 };
  } catch {
    return { success: false, score: 0 };
  }
}

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

  // ========== SEO: robots.txt (served explicitly to avoid platform override) ==========
  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /chat
Disallow: /settings

Sitemap: https://nomad-life.app/sitemap.xml
`);
  });

  // ========== AUTH ROUTES ==========
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
      const { recaptchaToken, ...bodyData } = req.body;
      if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
        const captchaResult = await verifyRecaptcha(recaptchaToken);
        if (!captchaResult.success || captchaResult.score < 0.1) {
          return res.status(400).send({ error: "Verifica di sicurezza fallita. Riprova." });
        }
      }

      const data = insertUserSchema.parse(bodyData);
      
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

  app.post("/api/auth/login", async (req, res, next) => {
    const { recaptchaToken } = req.body;
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev && process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const captchaResult = await verifyRecaptcha(recaptchaToken);
      if (!captchaResult.success || captchaResult.score < 0.3) {
        return res.status(400).send({ error: "Security verification failed. Please try again." });
      }
    }
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error("[Auth] Login error:", err);
        return res.status(500).send({ error: "Server error. Please try again." });
      }
      if (!user) {
        const msg = info?.message;
        const attemptedUsername = req.body?.username || "unknown";
        if (msg === "user_not_found") {
          console.log(`[Auth] Login failed: "${attemptedUsername}" - account not found`);
          return res.status(401).send({ error: "Account not found. Check your username or sign up." });
        }
        console.log(`[Auth] Login failed: "${attemptedUsername}" - wrong password`);
        return res.status(401).send({ error: "Wrong password. Try again or reset your password." });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("[Auth] Session save error:", loginErr);
          return res.status(500).send({ error: "Login failed. Please try again." });
        }
        console.log(`[Auth] Login success: ${user.username} (${user.name}) from ${user.location || "unknown"}`);
        const { password, ...userWithoutPassword } = user;
        res.send(userWithoutPassword);
      });
    })(req, res, next);
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

  // ========== PASSWORD RESET ==========
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ error: "Email richiesta" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.send({ success: true, message: "Se l'email esiste, riceverai un link di recupero." });
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);

      const { sendPasswordResetEmail } = await import("./email");
      const sent = await sendPasswordResetEmail(user.email, token, user.username);

      if (!sent) {
        return res.status(500).send({ error: "Errore nell'invio dell'email. Riprova più tardi." });
      }

      res.send({ success: true, message: "Se l'email esiste, riceverai un link di recupero." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).send({ error: "Errore interno. Riprova più tardi." });
    }
  });

  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).send({ error: "Token mancante" });
      }

      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).send({ error: "Token non valido o scaduto" });
      }

      res.send({ valid: true });
    } catch (error: any) {
      res.status(500).send({ error: "Errore interno" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).send({ error: "Token e nuova password richiesti" });
      }

      if (newPassword.length < 8) {
        return res.status(400).send({ error: "La password deve avere almeno 8 caratteri" });
      }

      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res.status(400).send({ error: "Token non valido o scaduto" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      await storage.markTokenUsed(tokenHash);

      res.send({ success: true, message: "Password aggiornata con successo!" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).send({ error: "Errore interno. Riprova più tardi." });
    }
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

  app.get("/api/users/by-country/:country", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByCountry(req.params.country);
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
      delete updates.password;
      
      const oldUser = req.user as User;
      const hasNewGps = typeof updates.latitude === "number" && typeof updates.longitude === "number";
      const gpsChanged = hasNewGps && (
        oldUser.latitude !== updates.latitude || oldUser.longitude !== updates.longitude
      );

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }

      if (gpsChanged && updates.latitude && updates.longitude) {
        checkProximityAndNotify(
          req.params.id,
          updates.latitude,
          updates.longitude,
          sendPushToUser
        ).catch(err => console.error("[Proximity] Background check error:", err));
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

      if (data.location && data.location.trim()) {
        try {
          const { learnedLocations } = await import("@shared/schema");
          const { eq, sql } = await import("drizzle-orm");
          const { db } = await import("./db");
          const locationName = data.location.trim();
          const existing = await db.select().from(learnedLocations)
            .where(eq(learnedLocations.name, locationName))
            .limit(1);
          if (existing.length > 0) {
            await db.update(learnedLocations)
              .set({
                mentionCount: sql`${learnedLocations.mentionCount} + 1`,
                lastMentionedAt: new Date(),
              })
              .where(eq(learnedLocations.id, existing[0].id));
          } else {
            await db.insert(learnedLocations).values({
              name: locationName,
              sourceType: "user_post",
              sourceUserId: (req.user as User).id,
            });
          }
        } catch (learnErr) {
          console.error("Location learning error (non-blocking):", learnErr);
        }
      }

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

  // ========== OVERPASS / REAL PLACES ==========
  app.get("/api/places/overpass", async (req, res) => {
    try {
      const { queryOverpass, geocodeCity, mergeWithLocal } = await import("./overpass");
      const { lat, lng, city, radius, type } = req.query;

      let coords: { lat: number; lng: number } | null = null;

      if (lat && lng) {
        const parsedLat = parseFloat(lat as string);
        const parsedLng = parseFloat(lng as string);
        if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
          return res.status(400).send({ error: "Invalid lat/lng values" });
        }
        coords = { lat: parsedLat, lng: parsedLng };
      } else if (city) {
        if (typeof city !== "string" || (city as string).length < 2 || (city as string).length > 100) {
          return res.status(400).send({ error: "City name must be 2-100 characters" });
        }
        coords = await geocodeCity(city as string);
      }

      if (!coords) {
        return res.status(400).send({ error: "Provide lat/lng or a valid city name" });
      }

      const r = radius ? Math.min(Math.max(parseInt(radius as string) || 5000, 500), 50000) : 5000;
      const placeType = (type as string) || "all";

      const overpassResults = await queryOverpass(coords.lat, coords.lng, r, placeType as any);

      const localPlaces = await storage.searchPlaces({
        city: city as string || undefined,
        type: placeType !== "all" ? placeType : undefined,
      });

      const merged = mergeWithLocal(overpassResults, localPlaces);

      res.send({
        source: "overpass+local",
        coords,
        radius: r,
        total: merged.length,
        osmCount: overpassResults.length,
        localCount: localPlaces.length,
        results: merged,
      });
    } catch (error: any) {
      console.error("Overpass API error:", error);
      try {
        const fallback = await storage.getPlaces();
        res.send({
          source: "local-fallback",
          total: fallback.length,
          results: fallback,
          error: error.message,
        });
      } catch {
        res.status(500).send({ error: error.message });
      }
    }
  });

  // ========== CROWDSOURCED LOCATIONS (SPOTS) ==========
  app.get("/api/locations", async (_req, res) => {
    try {
      const locations = await storage.getLocations();
      res.send(locations);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/locations/:id/ratings", async (req, res) => {
    try {
      const { db: dbInstance } = await import("./db");
      const { locationRatings } = await import("@shared/schema");
      const { eq: eqOp, avg, count: countFn, sql: sqlFn } = await import("drizzle-orm");
      const result = await dbInstance.select({
        avgRating: sqlFn<number>`round(avg(${locationRatings.rating})::numeric, 1)`,
        count: countFn(),
      }).from(locationRatings).where(eqOp(locationRatings.locationId, req.params.id));
      res.send({ avgRating: parseFloat(String(result[0]?.avgRating || 0)), count: Number(result[0]?.count || 0) });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/locations/:id/ratings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send({ error: "Non autenticato" });
    try {
      const { rating, wifiRating, review } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).send({ error: "Rating 1-5 richiesto" });
      const { db: dbInstance } = await import("./db");
      const { locationRatings } = await import("@shared/schema");
      const { eq: eqOp, and: andOp, avg, count: countFn, sql: sqlFn } = await import("drizzle-orm");
      const userId = (req.user as any).id;
      await dbInstance.insert(locationRatings).values({
        locationId: req.params.id,
        userId,
        rating,
        wifiRating: wifiRating || null,
        review: review || null,
      }).onConflictDoUpdate({
        target: [locationRatings.userId, locationRatings.locationId],
        set: { rating, wifiRating: wifiRating || null, review: review || null },
      });
      const result = await dbInstance.select({
        avgRating: sqlFn<number>`round(avg(${locationRatings.rating})::numeric, 1)`,
        count: countFn(),
      }).from(locationRatings).where(eqOp(locationRatings.locationId, req.params.id));
      res.send({ avgRating: parseFloat(String(result[0]?.avgRating || rating)), count: Number(result[0]?.count || 1) });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/locations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send({ error: "Non autenticato" });
    try {
      const { name, category, wifiQuality, powerOutlets, notes, latitude, longitude } = req.body;
      if (!name || !category || wifiQuality == null || latitude == null || longitude == null) {
        return res.status(400).send({ error: "Campi obbligatori mancanti" });
      }
      if (typeof name !== "string" || name.length < 2 || name.length > 100) {
        return res.status(400).send({ error: "Nome deve essere tra 2 e 100 caratteri" });
      }
      if (!["cafe", "coworking", "biblioteca", "luggage_storage"].includes(category)) {
        return res.status(400).send({ error: "Categoria non valida" });
      }
      const effectiveWifiQuality = category === "luggage_storage" ? 1 : wifiQuality;
      if (category !== "luggage_storage" && (typeof wifiQuality !== "number" || wifiQuality < 1 || wifiQuality > 5)) {
        return res.status(400).send({ error: "Qualità Wi-Fi deve essere tra 1 e 5" });
      }
      if (typeof latitude !== "number" || latitude < -90 || latitude > 90 || typeof longitude !== "number" || longitude < -180 || longitude > 180) {
        return res.status(400).send({ error: "Coordinate non valide" });
      }
      const location = await storage.createLocation({
        userId: (req.user as any).id,
        name: name.trim(),
        category,
        wifiQuality: effectiveWifiQuality,
        powerOutlets: !!powerOutlets,
        notes: notes?.trim() || null,
        latitude,
        longitude,
      });
      res.status(201).send(location);
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

  // City info: cost of living + quality scores + nomads going there
  app.get("/api/city-info", requireAuth, async (req, res) => {
    try {
      const dest = (req.query.dest as string || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const CITY_DATA: Record<string, any> = {
        lisbona: { cost: { housing: 900, food: 300, coworking: 150, transport: 50, total: 1400 }, scores: { wifi: 8.5, safety: 7.8, lifestyle: 9.1, affordability: 7.2, community: 8.9 }, visa: "90 giorni Schengen (passaporto UE: illimitato)", timezone: "GMT+1", weather: "☀️ 18–26°C", internet: "Fibra diffusa, 100–1000 Mbps" },
        bali: { cost: { housing: 400, food: 180, coworking: 80, transport: 60, total: 720 }, scores: { wifi: 7.2, safety: 7.5, lifestyle: 9.4, affordability: 9.2, community: 9.0 }, visa: "30 giorni on arrival, estendibile a 60", timezone: "GMT+8", weather: "☀️ 28–32°C (stagione secca Apr–Oct)", internet: "Buono nei coworking, variabile altrove" },
        bangkok: { cost: { housing: 500, food: 150, coworking: 100, transport: 40, total: 790 }, scores: { wifi: 8.0, safety: 7.0, lifestyle: 8.8, affordability: 9.0, community: 8.5 }, visa: "30 giorni on arrival, estendibile", timezone: "GMT+7", weather: "☀️ 28–35°C (evitare Apr–Jun)", internet: "Eccellente in centro, AIS/True Move" },
        berlino: { cost: { housing: 1200, food: 400, coworking: 200, transport: 90, total: 1890 }, scores: { wifi: 7.5, safety: 8.2, lifestyle: 8.5, affordability: 5.8, community: 9.2 }, visa: "Schengen 90 giorni (UE illimitato)", timezone: "GMT+2", weather: "☁️ 18–25°C d'estate", internet: "Buono in città, fibra nei coworking" },
        medellin: { cost: { housing: 350, food: 180, coworking: 70, transport: 30, total: 630 }, scores: { wifi: 7.8, safety: 6.5, lifestyle: 8.9, affordability: 9.5, community: 8.7 }, visa: "90 giorni turista, rinnovabile", timezone: "GMT-5", weather: "☀️ 22°C tutto l'anno (città eterna primavera)", internet: "Ottimo nei coworking, EPM fibra" },
        "chiang mai": { cost: { housing: 350, food: 130, coworking: 60, transport: 40, total: 580 }, scores: { wifi: 8.2, safety: 8.5, lifestyle: 9.0, affordability: 9.6, community: 9.1 }, visa: "30 giorni on arrival, estendibile", timezone: "GMT+7", weather: "☀️ 20–35°C (evitare Mar–Apr)", internet: "Eccellente, molti coworking dedicati ai nomadi" },
        dubai: { cost: { housing: 1500, food: 400, coworking: 250, transport: 100, total: 2250 }, scores: { wifi: 9.2, safety: 9.5, lifestyle: 8.0, affordability: 4.5, community: 7.8 }, visa: "30–90 giorni turista, remote work visa disponibile", timezone: "GMT+4", weather: "☀️ 25–45°C", internet: "Velocissimo, alcune restrizioni VoIP" },
        tallin: { cost: { housing: 800, food: 300, coworking: 150, transport: 50, total: 1300 }, scores: { wifi: 9.0, safety: 9.0, lifestyle: 7.5, affordability: 7.5, community: 7.2 }, visa: "Digital Nomad Visa disponibile (UE Schengen)", timezone: "GMT+3", weather: "🌧️ Freddo, ottimale May–Sep", internet: "Tra i migliori d'Europa" },
      };

      const cityKey = Object.keys(CITY_DATA).find(k =>
        dest.includes(k) || k.includes(dest) || dest.replace(/\s/g,"").includes(k.replace(/\s/g,""))
      );
      const cityData = cityKey ? CITY_DATA[cityKey] : null;

      const plannedTrips = await storage.searchTripsByDestination(req.query.dest as string);
      const nomadsGoing = plannedTrips
        .filter(t => t.status === "planned" || t.status === "in_progress")
        .slice(0, 5)
        .map(t => ({
          userId: t.userId,
          userName: t.user?.name || t.user?.username || "Nomade",
          avatarUrl: t.user?.avatarUrl,
          location: t.user?.location,
          startDate: t.startDate,
          endDate: t.endDate,
          tripTitle: t.title,
        }));

      res.json({
        destination: req.query.dest,
        found: !!cityData,
        cost: cityData?.cost || null,
        scores: cityData?.scores || null,
        visa: cityData?.visa || null,
        timezone: cityData?.timezone || null,
        weather: cityData?.weather || null,
        internet: cityData?.internet || null,
        nomadsGoing,
      });
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
      
      if (!userId) {
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

      // Save additional photos if provided
      const photos: string[] = req.body.photos || [];
      for (let i = 0; i < photos.length; i++) {
        await storage.addStopPhoto({ stopId: stop.id, url: photos[i], orderIndex: i });
      }
      
      if (trip.isPublic) {
        const emoji = stop.transportMode === "plane" ? "✈️" : stop.transportMode === "train" ? "🚂" : stop.transportMode === "car" ? "🚗" : "📍";
        const cleanNotes = stop.notes && stop.notes !== "Aggiunta dalla mappa" ? stop.notes : "";
        const content = `${emoji} Nuova tappa: ${stop.city}, ${stop.country}\n🗺️ Viaggio: "${trip.title}"${cleanNotes ? `\n💬 ${cleanNotes}` : ""}${stop.rating ? `\n⭐ ${stop.rating}/5` : ""}`;
        
        await storage.createPost({
          userId: (req.user as User).id,
          content,
          imageUrl: stop.imageUrl || (photos.length > 0 ? photos[0] : null),
          tripId: trip.id,
          location: `${stop.city}, ${stop.country}`,
          latitude: stop.latitude || undefined,
          longitude: stop.longitude || undefined,
        });
      }
      
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

  // ========== STOP PHOTOS ==========
  app.get("/api/stops/:stopId/photos", async (req, res) => {
    try {
      const photos = await storage.getStopPhotos(req.params.stopId);
      res.send(photos);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/stops/:stopId/photos", requireAuth, async (req, res) => {
    try {
      const stop = await storage.getTripStop(req.params.stopId);
      if (!stop) return res.status(404).send({ error: "Stop not found" });
      const trip = await storage.getTrip(stop.tripId);
      if (!trip || trip.userId !== (req.user as User).id) return res.status(403).send({ error: "Forbidden" });
      
      const { url, caption, orderIndex } = req.body;
      if (!url) return res.status(400).send({ error: "URL is required" });
      
      const photo = await storage.addStopPhoto({ stopId: req.params.stopId, url, caption, orderIndex: orderIndex || 0 });
      res.status(201).send(photo);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/stop-photos/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteStopPhoto(req.params.id);
      res.send({ success: true });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== MEETUP REQUESTS ==========
  app.post("/api/stops/:stopId/meetup", requireAuth, async (req, res) => {
    try {
      const stop = await storage.getTripStop(req.params.stopId);
      if (!stop) return res.status(404).send({ error: "Stop not found" });
      const trip = await storage.getTrip(stop.tripId);
      if (!trip) return res.status(404).send({ error: "Trip not found" });
      if (trip.userId === (req.user as User).id) return res.status(400).send({ error: "Non puoi richiedere un incontro con te stesso" });
      
      const meetup = await storage.createMeetupRequest({
        stopId: req.params.stopId,
        requesterId: (req.user as User).id,
        hostId: trip.userId,
        message: req.body.message || null,
        proposedDate: req.body.proposedDate ? new Date(req.body.proposedDate) : null,
      });

      await storage.createNotification({
        userId: trip.userId,
        type: "meetup_request",
        message: `${(req.user as User).name} vuole incontrarti a ${stop.city}, ${stop.country}!`,
        relatedUserId: (req.user as User).id,
        relatedTripId: trip.id,
      });
      sendPushToUser(trip.userId, "NomadLife", `${(req.user as User).name} vuole incontrarti a ${stop.city}!`, `/trip/${trip.id}`);

      res.status(201).send(meetup);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/meetups", requireAuth, async (req, res) => {
    try {
      const meetups = await storage.getMeetupRequestsForUser((req.user as User).id);
      res.send(meetups);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/stops/:stopId/meetups", async (req, res) => {
    try {
      const meetups = await storage.getMeetupRequestsByStop(req.params.stopId);
      res.send(meetups);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.patch("/api/meetups/:id", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["accepted", "declined", "cancelled"].includes(status)) {
        return res.status(400).send({ error: "Invalid status" });
      }
      const meetup = await storage.updateMeetupRequestStatus(req.params.id, status);
      if (!meetup) return res.status(404).send({ error: "Meetup not found" });

      const targetUserId = meetup.requesterId === (req.user as User).id ? meetup.hostId : meetup.requesterId;
      const statusText = status === "accepted" ? "accettato" : status === "declined" ? "rifiutato" : "annullato";
      await storage.createNotification({
        userId: targetUserId,
        type: "meetup_update",
        message: `${(req.user as User).name} ha ${statusText} la richiesta di incontro`,
        relatedUserId: (req.user as User).id,
      });

      res.send(meetup);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== STOP REVIEWS ==========
  app.get("/api/stops/:stopId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getStopReviews(req.params.stopId);
      const avg = await storage.getStopAverageRating(req.params.stopId);
      res.send({ reviews, average: avg.average, count: avg.count });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/stops/:stopId/reviews", requireAuth, async (req, res) => {
    try {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).send({ error: "Rating deve essere tra 1 e 5" });
      
      const review = await storage.createStopReview({
        stopId: req.params.stopId,
        userId: (req.user as User).id,
        rating,
        comment: comment || null,
      });
      res.status(201).send(review);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== FOLLOWED USERS' TRIPS FOR MAP ==========
  app.get("/api/followed-users-trips", requireAuth, async (req, res) => {
    try {
      const trips = await storage.getFollowedUsersTrips((req.user as User).id);
      res.send(trips);
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

  app.get("/api/cities/:id/enriched", async (req, res) => {
    try {
      const city = await storage.getCity(req.params.id);
      if (!city) {
        return res.status(404).send({ error: "City not found" });
      }
      const { getCityEnrichedData } = await import("./weekly-update");
      const enriched = await getCityEnrichedData(city.name);
      res.send({
        tavilyInsights: city.tavilyInsights ? JSON.parse(city.tavilyInsights) : null,
        lastTavilyUpdate: city.lastTavilyUpdate,
        ...enriched,
      });
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
      const blogPosts = await storage.getBlogPosts({ published: true });

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

      xml += `
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

      for (const bp of blogPosts) {
        xml += `
  <url>
    <loc>${baseUrl}/blog/${bp.slug}</loc>
    <lastmod>${bp.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
      let guides = await storage.getCityGuides(city as string, category as string);
      
      if (guides.length === 0 && city && typeof city === "string" && city.length >= 2) {
        try {
          let webContext = "";
          if (process.env.TAVILY_API_KEY) {
            try {
              const searches = [
                `${city} Italia coworking wifi nomadi digitali lavorare`,
                `${city} Italia ristoranti cibo tipico costo vita trasporti`,
              ];
              const results: string[] = [];
              for (const q of searches) {
                const tavilyRes = await fetch("https://api.tavily.com/search", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query: q,
                    search_depth: "basic",
                    max_results: 3,
                    include_answer: true,
                  }),
                });
                if (tavilyRes.ok) {
                  const data = await tavilyRes.json();
                  if (data.answer) results.push(data.answer);
                  for (const r of (data.results || []).slice(0, 3)) {
                    if (r.content) results.push(r.content.substring(0, 400));
                  }
                }
              }
              if (results.length > 0) {
                webContext = `\n\nDATI REALI DA RICERCA WEB (usa SOLO queste informazioni verificate, non inventare nomi di locali o servizi che non compaiono qui):\n${results.join("\n---\n")}`;
              }
            } catch (webErr) {
              console.log("Tavily search for city guide failed:", webErr);
            }
          }

          const OpenAI = (await import("openai")).default;
          const ai = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
          });
          
          const prompt = `Genera una guida per nomadi digitali per "${city}" in Italia. IMPORTANTE: Usa SOLO informazioni verificate. Se non hai dati certi su un aspetto specifico (es. nomi di coworking, velocità wifi), scrivi consigli generali utili senza inventare nomi di locali, servizi o dati specifici che non conosci con certezza.${webContext}

Return a JSON array with exactly 6 guide entries covering these categories: wifi, coworking, visa, food, lifestyle, transport.
Each entry must have: city (proper name), country, latitude (number, must be accurate for the actual city), longitude (number, must be accurate for the actual city), category, title (in Italian), content (detailed paragraph in Italian, 100+ words with practical tips based on REAL data), icon (emoji), rating (1-5, be honest - smaller cities may have lower ratings for some categories), tags (array of 3-4 relevant tags in Italian).
Return ONLY the JSON array, no markdown.`;
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          const response = await ai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: "Sei un esperto di viaggi e nomadismo digitale in Italia. Rispondi SOLO con dati verificati. Non inventare mai nomi di locali, coworking, ristoranti o servizi. Se non conosci informazioni specifiche, fornisci consigli generali utili. Preferisci informazioni provenienti dai dati di ricerca web forniti." }, { role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 4000,
          }, { signal: controller.signal });
          clearTimeout(timeout);
          
          const content = response.choices[0]?.message?.content?.trim() || "[]";
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const generated: any[] = JSON.parse(cleaned);
          
          for (const g of generated) {
            try {
              await storage.createCityGuide({
                city: g.city,
                country: g.country,
                latitude: g.latitude,
                longitude: g.longitude,
                category: g.category,
                title: g.title,
                content: g.content,
                icon: g.icon,
                rating: g.rating,
                tags: g.tags,
              });
            } catch {}
          }
          
          guides = await storage.getCityGuides(city, category as string);
        } catch (aiErr) {
          console.log("AI guide generation failed:", aiErr);
        }
      }
      
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
      const user = req.user as User;
      const nomads = await storage.getNearbyNomadsWithSkills(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string) || 5,
        skillsArr,
        user
      );
      const filtered = nomads
        .filter(n => n.id !== user.id)
        .map(({ password, ...n }) => n);
      res.send(filtered);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  // ========== BLOG POSTS (PUBLIC - NO AUTH REQUIRED) ==========
  app.get("/api/blog", async (req, res) => {
    try {
      const { category, city } = req.query;
      const posts = await storage.getBlogPosts({
        category: category as string,
        city: city as string,
        published: true,
      });
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/blog/all", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.isAdmin) return res.status(403).send({ error: "Admin only" });
      const posts = await storage.getBlogPosts({});
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/blog/my-posts", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const posts = await storage.getBlogPostsByUserId(user.id);
      res.send(posts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/blog/user/:userId", async (req, res) => {
    try {
      const posts = await storage.getBlogPostsByUserId(req.params.userId);
      const published = posts.filter(p => p.published);
      res.send(published);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/blog/categories", async (_req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.send(categories);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post || !post.published) return res.status(404).send({ error: "Article not found" });
      res.send(post);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/blog", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const parsed = insertBlogPostSchema.safeParse({
        ...req.body,
        userId: user.id,
        author: req.body.author || user.name || user.username,
      });
      if (!parsed.success) return res.status(400).send({ error: parsed.error.message });
      const post = await storage.createBlogPost(parsed.data);
      res.status(201).send(post);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.put("/api/blog/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const post = await storage.getBlogPostById(req.params.id);
      if (!post) return res.status(404).send({ error: "Post not found" });
      if (post.userId !== user.id && !user.isAdmin) return res.status(403).send({ error: "Non autorizzato" });
      const { title, slug, excerpt, content, category, city, country, imageUrl, tags, published } = req.body;
      const allowedUpdates: any = {};
      if (title !== undefined) allowedUpdates.title = title;
      if (slug !== undefined) allowedUpdates.slug = slug;
      if (excerpt !== undefined) allowedUpdates.excerpt = excerpt;
      if (content !== undefined) allowedUpdates.content = content;
      if (category !== undefined) allowedUpdates.category = category;
      if (city !== undefined) allowedUpdates.city = city;
      if (country !== undefined) allowedUpdates.country = country;
      if (imageUrl !== undefined) allowedUpdates.imageUrl = imageUrl;
      if (tags !== undefined) allowedUpdates.tags = tags;
      if (published !== undefined) allowedUpdates.published = published;
      const updated = await storage.updateBlogPost(req.params.id, allowedUpdates);
      res.send(updated);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.delete("/api/blog/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const post = await storage.getBlogPostById(req.params.id);
      if (!post) return res.status(404).send({ error: "Post not found" });
      if (post.userId !== user.id && !user.isAdmin) return res.status(403).send({ error: "Non autorizzato" });
      const deleted = await storage.deleteBlogPost(req.params.id);
      res.send({ success: true });
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

  // ========== TRAVEL ALERTS ==========
  app.get("/api/travel-alerts", async (req, res) => {
    try {
      const { country } = req.query;
      const alerts = await getActiveAlerts(country as string || undefined);
      res.send(alerts);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/travel-alerts/my", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const userLocation = user.location || "";
      const parts = userLocation.split(",").map(s => s.trim());
      const userCountry = parts.length >= 2 ? parts[parts.length - 1] : "";

      const alerts = [];
      if (userCountry) {
        const countryAlerts = await getActiveAlerts(userCountry);
        alerts.push(...countryAlerts);
      }

      const { db: dbInstance } = await import("./db");
      const { trips: tripsTable } = await import("@shared/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const userTrips = await dbInstance.select().from(tripsTable)
        .where(eqOp(tripsTable.userId, user.id))
        .limit(10);
      
      for (const trip of userTrips) {
        if (trip.destination) {
          const tripParts = trip.destination.split(",").map(s => s.trim());
          const tripCountry = tripParts[tripParts.length - 1];
          if (tripCountry && tripCountry !== userCountry) {
            const tripAlerts = await getActiveAlerts(tripCountry);
            alerts.push(...tripAlerts);
          }
        }
      }

      const unique = Array.from(new Map(alerts.map(a => [a.id, a])).values());
      res.send(unique);
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.post("/api/travel-alerts/check", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.isAdmin) return res.status(403).send({ error: "Admin only" });
      checkTravelAlerts().catch(err => console.error("[Travel Alerts] Manual check error:", err));
      res.send({ message: "Travel alert check started" });
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  });

  app.get("/api/download-logo", (_req, res) => {
    const filePath = process.cwd() + "/client/public/icons/icon-512x512.png";
    res.setHeader("Content-Disposition", "attachment; filename=NomadLife-Logo.png");
    res.setHeader("Content-Type", "image/png");
    res.sendFile(filePath);
  });

  // Job Inspector API — completely separate from NomadLife
  app.get("/api/inspector/jobs", async (_req, res) => {
    try {
      const FEDERICO_PROFILE = `
Name: Federico Poletti
Stack: TypeScript, React 18, Node.js, Express, PostgreSQL, Drizzle ORM, OpenAI API, Tailwind CSS
Experience: 1 year self-taught (built NomadLife solo - a full production PWA with AI, real-time chat, map, booking, marketplace)
Preferred location: Remote only, EU timezone compatible (Italy)
Job types: Full-time, Part-time, Contract, Freelance
Rate: €25-35/hr or €2000-5000/month
NOT interested in: On-site only, requires 5+ years experience, pure mobile native, blockchain/crypto
`;

      async function fetchRemotive() {
        const r = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=25");
        const d: any = await r.json();
        return (d.jobs || []).map((j: any) => ({
          id: `remotive-${j.id}`, title: j.title, company: j.company_name,
          url: j.url, description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
          tags: j.tags || [], source: "Remotive", salary: j.salary || "",
          location: j.candidate_required_location || "Remote",
        }));
      }

      async function fetchJobicy() {
        const r = await fetch("https://jobicy.com/api/v2/remote-jobs?tag=react,nodejs,typescript&count=20");
        const d: any = await r.json();
        return (d.jobs || []).map((j: any) => ({
          id: `jobicy-${j.id}`, title: j.jobTitle, company: j.companyName,
          url: j.url, description: (j.jobDescription || "").replace(/<[^>]*>/g, "").slice(0, 500),
          tags: j.jobIndustry || [], source: "Jobicy",
          salary: j.annualSalaryMin ? `$${j.annualSalaryMin}-${j.annualSalaryMax}` : "",
          location: j.jobGeo || "Remote",
        }));
      }

      async function fetchRemoteOK() {
        try {
          const r = await fetch("https://remoteok.com/api", { headers: { "User-Agent": "Mozilla/5.0 (compatible; JobInspector/1.0)" } });
          const d: any = await r.json();
          return (d || [])
            .filter((j: any) => j.id && j.position)
            .filter((j: any) => {
              const tags = (j.tags || []).join(" ").toLowerCase();
              const pos = (j.position || "").toLowerCase();
              return tags.includes("react") || tags.includes("node") || tags.includes("typescript") ||
                     tags.includes("javascript") || tags.includes("fullstack") || pos.includes("ai") || pos.includes("full stack");
            })
            .slice(0, 20)
            .map((j: any) => ({
              id: `remoteok-${j.id}`, title: j.position, company: j.company || "Unknown",
              url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
              description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
              tags: j.tags || [], source: "RemoteOK", salary: j.salary || "", location: "Remote Worldwide",
            }));
        } catch { return []; }
      }

      async function fetchRemotiveAI() {
        try {
          const r = await fetch("https://remotive.com/api/remote-jobs?category=ai&limit=20");
          const d: any = await r.json();
          return (d.jobs || []).map((j: any) => ({
            id: `remotive-ai-${j.id}`, title: j.title, company: j.company_name,
            url: j.url, description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
            tags: j.tags || [], source: "Remotive AI", salary: j.salary || "",
            location: j.candidate_required_location || "Remote",
          }));
        } catch { return []; }
      }

      const [r, j, rok, rai] = await Promise.all([fetchRemotive(), fetchJobicy(), fetchRemoteOK(), fetchRemotiveAI()]);
      const seen = new Set<string>();
      const allJobs = [...r, ...j, ...rok, ...rai].filter((job: any) => {
        const key = `${job.title}-${job.company}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const { OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const scored = await Promise.all(allJobs.map(async (job: any) => {
        try {
          const prompt = `Score this job from 0-100 for Federico Poletti.\nPROFILE:${FEDERICO_PROFILE}\nJOB:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nTags: ${Array.isArray(job.tags) ? job.tags.join(", ") : job.tags}\nSalary: ${job.salary}\nDescription: ${job.description}\n\nScore (0-35 stack match, 0-25 remote/EU, 0-20 experience match, 0-10 compensation, 0-10 sector fit).\nRespond ONLY with JSON: {"score":85,"reasons":["reason1","reason2"],"dealbreakers":[]}`;
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            response_format: { type: "json_object" },
          });
          const result = JSON.parse(response.choices[0].message.content || "{}");
          return { ...job, score: result.score || 0, reasons: result.reasons || [], dealbreakers: result.dealbreakers || [] };
        } catch {
          return { ...job, score: 0, reasons: [], dealbreakers: ["Scoring error"] };
        }
      }));

      const sorted = scored.sort((a: any, b: any) => b.score - a.score);
      res.json({ jobs: sorted, total: sorted.length, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Startup Scout API
  app.get("/api/inspector/startups", async (_req, res) => {
    try {
      const FEDERICO_PROFILE = `
Name: Federico Poletti
Age: 48, Sardinia Italy, remote only
Stack: TypeScript, React 18, Node.js, Express, PostgreSQL, Drizzle ORM, OpenAI API, Tailwind CSS, Leaflet, WebSockets, PWA
Experience: 1 year self-taught — built NomadLife (nomad-life.app) solo: full production app with AI chatbot, real-time chat, maps, booking, marketplace, multi-language, SEO
Background: PhD Political Science, former intelligence analyst, entrepreneur (holiday rental business)
Looking for: Remote, EU-compatible, small teams, AI/SaaS startups
Languages: Italian (native), English (professional)
`;

      async function tavilySearch(query: string) {
        try {
          const r = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query,
              search_depth: "basic",
              max_results: 6,
            }),
          });
          const d: any = await r.json();
          return d.results || [];
        } catch { return []; }
      }

      const queries = [
        "AI SaaS startup seed funded 2024 2025 Netherlands Belgium Switzerland Italy small team developer React Node remote hire",
        "YC W24 W25 S24 S25 European AI startup small team developer remote job opening",
        "startup italiana AI seed 2024 2025 piccolo team sviluppatore React Node PostgreSQL",
        "new AI startup Amsterdam Zurich Milan Antwerp small team React TypeScript developer remote 2025",
      ];

      const searchResults = await Promise.all(queries.map(q => tavilySearch(q)));
      const seen = new Set<string>();
      const allResults = searchResults.flat().filter((r: any) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      const allContent = allResults
        .map((r: any) => `[${r.title}](${r.url})\n${(r.content || "").slice(0, 500)}`)
        .join("\n\n---\n\n");

      const { OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const extractResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `You are a startup research analyst. Extract small AI/tech startups from these search results.

TARGET: Federico Poletti — full-stack dev (React, Node.js, PostgreSQL, OpenAI API), EU remote.

STRICT INCLUSION CRITERIA (ALL must be true):
- Team size: genuinely <20 people (pre-seed, seed, or Series A MAX)
- Geography: Italy, Netherlands, Belgium, Switzerland, France, Germany, Spain, Sweden, Denmark
- Stage: pre-seed, seed, or early Series A — EXCLUDE Series B, C, D and any company with >50 employees
- Domain: AI, SaaS, EdTech, developer tools, data platforms — NOT autonomous driving, hardware, biotech
- EXCLUDE any well-known large company (Mistral AI, Wayve, Nscale, Stability AI, etc. — these have 50-500+ employees)

SEARCH RESULTS:
${allContent}

Extract up to 8 startups that strictly match ALL criteria above. If a company is Series C/D or clearly has >20 people, skip it entirely.
Return JSON:
{"startups": [{"name":"","country":"","city":"","description":"","techStack":[],"teamSize":"","fundingInfo":"","founderName":"","founderLinkedIn":"","founderEmail":"","website":"","pitchHook":""}]}`
        }],
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });

      let startups: any[] = [];
      try {
        const parsed = JSON.parse(extractResponse.choices[0].message.content || "{}");
        startups = parsed.startups || [];
      } catch { startups = []; }

      const withPitches = await Promise.all(startups.map(async (s: any) => {
        try {
          const pitchRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
              role: "user",
              content: `Write a cold email pitch (max 120 words) from Federico Poletti to ${s.founderName ? s.founderName : "the team"} at ${s.name}.

FEDERICO:
- Full-stack dev: TypeScript, React 18, Node.js, Express, PostgreSQL, OpenAI API
- Built NomadLife solo (nomad-life.app) — production PWA with AI chatbot, real-time chat, maps, booking
- 48yo, PhD Political Science, 1yr self-taught, remote from Sardinia Italy
- Email: federicopoletti83@gmail.com
- LinkedIn: linkedin.com/in/federico-poletti-dev

STARTUP: ${s.name} (${s.city}, ${s.country}) — ${s.description}
WHY HE FITS: ${s.pitchHook}

STRICT RULES:
- If founder name is not known, open with "Hi," (English) or "Ciao," (Italian) — NEVER use "[Founder's Name]" or any placeholder
- Sign off as: Federico Poletti | federicopoletti83@gmail.com | nomad-life.app
- NEVER mention rates, salary, or hourly price in the email — discuss compensation only if they ask
- NO placeholder text like "[Your LinkedIn]" or "[link]" — use the real URL above or omit
- Mention nomad-life.app as concrete proof of work
- End with one specific ask (call or reply)
- English for non-Italian companies, Italian for Italian ones
- Max 120 words, punchy and direct

Return JSON: {"subject":"","pitch":""}`
            }],
            max_tokens: 400,
            response_format: { type: "json_object" },
          });
          const pd = JSON.parse(pitchRes.choices[0].message.content || "{}");
          return { ...s, subject: pd.subject || "", pitch: pd.pitch || "" };
        } catch { return { ...s, subject: "", pitch: "" }; }
      }));

      res.json({ startups: withPitches, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
