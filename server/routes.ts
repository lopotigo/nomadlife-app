import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertPostSchema, insertPlaceSchema, insertBookingSchema, insertChatGroupSchema, insertMessageSchema, insertSubscriptionSchema } from "@shared/schema";
import type { User } from "@shared/schema";

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
    done(null, user);
  } catch (error) {
    done(error);
  }
});

function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========== AUTH ROUTES ==========
  app.post("/api/auth/signup", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).send({ error: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).send({ error: "Email already exists" });
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
      const group = await storage.createChatGroup(data);
      res.status(201).send(group);
    } catch (error: any) {
      res.status(400).send({ error: error.message });
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

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: (req.user as User).id,
      });
      const message = await storage.createMessage(data);
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

  return httpServer;
}
