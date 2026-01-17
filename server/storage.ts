import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  InsertUser,
  Post,
  InsertPost,
  Place,
  InsertPlace,
  Booking,
  InsertBooking,
  ChatGroup,
  InsertChatGroup,
  Message,
  InsertMessage,
  Subscription,
  InsertSubscription,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Posts
  getPosts(limit?: number): Promise<(Post & { user: User })[]>;
  getPostsByUser(userId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  likePost(postId: string): Promise<Post | undefined>;

  // Places
  getPlaces(filters?: { city?: string; type?: string }): Promise<Place[]>;
  getPlace(id: string): Promise<Place | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;

  // Bookings
  getBookings(userId: string): Promise<(Booking & { place: Place })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking | undefined>;

  // Chat Groups
  getChatGroups(): Promise<ChatGroup[]>;
  getChatGroup(id: string): Promise<ChatGroup | undefined>;
  createChatGroup(group: InsertChatGroup): Promise<ChatGroup>;

  // Messages
  getGroupMessages(groupId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  getPrivateMessages(userId1: string, userId2: string, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Subscriptions
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
}

export class DrizzleStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(pool, { schema });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(schema.users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(schema.users).set(updates).where(eq(schema.users.id, id)).returning();
    return result[0];
  }

  // Posts
  async getPosts(limit: number = 20): Promise<(Post & { user: User })[]> {
    const result = await this.db
      .select()
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit);

    return result.map((row) => ({
      ...row.posts,
      user: row.users!,
    }));
  }

  async getPostsByUser(userId: string): Promise<Post[]> {
    return await this.db.select().from(schema.posts).where(eq(schema.posts.userId, userId)).orderBy(desc(schema.posts.createdAt));
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const result = await this.db.insert(schema.posts).values(insertPost).returning();
    return result[0];
  }

  async likePost(postId: string): Promise<Post | undefined> {
    const result = await this.db
      .update(schema.posts)
      .set({ likes: sql`${schema.posts.likes} + 1` })
      .where(eq(schema.posts.id, postId))
      .returning();
    return result[0];
  }

  // Places
  async getPlaces(filters?: { city?: string; type?: string }): Promise<Place[]> {
    if (!filters?.city && !filters?.type) {
      return await this.db.select().from(schema.places);
    }
    
    const conditions = [];
    if (filters.city) conditions.push(eq(schema.places.city, filters.city));
    if (filters.type) conditions.push(eq(schema.places.type, filters.type));
    
    return await this.db.select().from(schema.places).where(and(...conditions) as any);
  }

  async getPlace(id: string): Promise<Place | undefined> {
    const result = await this.db.select().from(schema.places).where(eq(schema.places.id, id));
    return result[0];
  }

  async createPlace(insertPlace: InsertPlace): Promise<Place> {
    const result = await this.db.insert(schema.places).values(insertPlace).returning();
    return result[0];
  }

  // Bookings
  async getBookings(userId: string): Promise<(Booking & { place: Place })[]> {
    const result = await this.db
      .select()
      .from(schema.bookings)
      .leftJoin(schema.places, eq(schema.bookings.placeId, schema.places.id))
      .where(eq(schema.bookings.userId, userId))
      .orderBy(desc(schema.bookings.createdAt));

    return result.map((row) => ({
      ...row.bookings,
      place: row.places!,
    }));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const result = await this.db.insert(schema.bookings).values(insertBooking).returning();
    return result[0];
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const result = await this.db
      .update(schema.bookings)
      .set({ status: "cancelled" })
      .where(eq(schema.bookings.id, id))
      .returning();
    return result[0];
  }

  // Chat Groups
  async getChatGroups(): Promise<ChatGroup[]> {
    return await this.db.select().from(schema.chatGroups).orderBy(desc(schema.chatGroups.createdAt));
  }

  async getChatGroup(id: string): Promise<ChatGroup | undefined> {
    const result = await this.db.select().from(schema.chatGroups).where(eq(schema.chatGroups.id, id));
    return result[0];
  }

  async createChatGroup(insertGroup: InsertChatGroup): Promise<ChatGroup> {
    const result = await this.db.insert(schema.chatGroups).values(insertGroup).returning();
    return result[0];
  }

  // Messages
  async getGroupMessages(groupId: string, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await this.db
      .select()
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(eq(schema.messages.groupId, groupId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    return result.map((row) => ({
      ...row.messages,
      sender: row.users!,
    })).reverse();
  }

  async getPrivateMessages(userId1: string, userId2: string, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await this.db
      .select()
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(
        and(
          eq(schema.messages.groupId, null as any),
          sql`(sender_id = ${userId1} AND receiver_id = ${userId2}) OR (sender_id = ${userId2} AND receiver_id = ${userId1})`
        ) as any
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    return result.map((row) => ({
      ...row.messages,
      sender: row.users!,
    })).reverse();
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db.insert(schema.messages).values(insertMessage).returning();
    return result[0];
  }

  // Subscriptions
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const result = await this.db
      .select()
      .from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, "active")) as any);
    return result[0];
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const result = await this.db.insert(schema.subscriptions).values(insertSubscription).returning();
    return result[0];
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const result = await this.db
      .update(schema.subscriptions)
      .set(updates)
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DrizzleStorage();
