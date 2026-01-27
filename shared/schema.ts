import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  location: text("location"),
  isPremium: boolean("is_premium").default(false).notNull(),
  countriesVisited: integer("countries_visited").default(0).notNull(),
  citiesVisited: integer("cities_visited").default(0).notNull(),
  coworkingSpaces: integer("coworking_spaces").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Posts table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  linkUrl: text("link_url"),
  tripId: varchar("trip_id"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  likes: integer("likes").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likes: true,
  commentsCount: true,
  createdAt: true,
});
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// Places (Hotels & Coworking) table
export const places = pgTable("places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "hotel", "hostel", "coworking"
  location: text("location").notNull(),
  city: text("city").notNull(),
  country: text("country"),
  description: text("description"),
  price: text("price").notNull(),
  pricePerNight: integer("price_per_night"),
  pricePerHour: integer("price_per_hour"),
  currency: text("currency").default("USD"),
  imageUrl: text("image_url"),
  rating: integer("rating").default(0).notNull(),
  reviews: integer("reviews").default(0).notNull(),
  tags: text("tags").array(),
  amenities: text("amenities").array(),
  capacity: integer("capacity"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  rating: true,
  reviews: true,
  createdAt: true,
});
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Place = typeof places.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  checkInDate: timestamp("check_in_date").notNull(),
  guestName: text("guest_name").notNull(),
  status: text("status").default("confirmed").notNull(), // "confirmed", "cancelled"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Chat Groups table
export const chatGroups = pgTable("chat_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  members: integer("members").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatGroupSchema = createInsertSchema(chatGroups).omit({
  id: true,
  members: true,
  createdAt: true,
});
export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;
export type ChatGroup = typeof chatGroups.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").references(() => chatGroups.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(), // "pro"
  status: text("status").notNull(), // "active", "cancelled"
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  startDate: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "public", "nomad"
  city: text("city").notNull(),
  country: text("country"),
  location: text("location"),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  capacity: integer("capacity"),
  price: integer("price").default(0),
  currency: text("currency").default("USD"),
  hostId: varchar("host_id").references(() => users.id, { onDelete: "set null" }),
  placeId: varchar("place_id").references(() => places.id, { onDelete: "set null" }),
  tags: text("tags").array(),
  attendees: integer("attendees").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  attendees: true,
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Event Registrations table
export const eventRegistrations = pgTable("event_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("confirmed").notNull(), // "confirmed", "cancelled", "waitlist"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

// Trips (Travel Diary) table
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isPublic: boolean("is_public").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(), // viaggio in corso
  totalBudget: integer("total_budget").default(0),
  currency: text("currency").default("EUR"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  totalBudget: true,
  createdAt: true,
});
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// Trip Stops (Tappe del viaggio) table
export const tripStops = pgTable("trip_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  orderIndex: integer("order_index").notNull(), // ordine della tappa
  arrivalDate: timestamp("arrival_date").notNull(),
  departureDate: timestamp("departure_date"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripStopSchema = createInsertSchema(tripStops).omit({
  id: true,
  createdAt: true,
});
export type InsertTripStop = z.infer<typeof insertTripStopSchema>;
export type TripStop = typeof tripStops.$inferSelect;

// Trip Expenses (Spese per tappa) table
export const tripExpenses = pgTable("trip_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").notNull().references(() => tripStops.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "hotel", "coworking", "food", "transport", "other"
  name: text("name").notNull(),
  cost: integer("cost").notNull(), // in centesimi
  currency: text("currency").default("EUR"),
  rating: integer("rating"), // 1-5 stelle
  review: text("review"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripExpenseSchema = createInsertSchema(tripExpenses).omit({
  id: true,
  createdAt: true,
});
export type InsertTripExpense = z.infer<typeof insertTripExpenseSchema>;
export type TripExpense = typeof tripExpenses.$inferSelect;

// Followers table
export const followers = pgTable("followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFollowerSchema = createInsertSchema(followers).omit({
  id: true,
  createdAt: true,
});
export type InsertFollower = z.infer<typeof insertFollowerSchema>;
export type Follower = typeof followers.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "new_trip", "new_stop", "new_follower"
  message: text("message").notNull(),
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: "cascade" }),
  relatedTripId: varchar("related_trip_id").references(() => trips.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
