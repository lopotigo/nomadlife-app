import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, doublePrecision, uniqueIndex, serial } from "drizzle-orm/pg-core";
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
  isAdmin: boolean("is_admin").default(false).notNull(),
  countriesVisited: integer("countries_visited").default(0).notNull(),
  citiesVisited: integer("cities_visited").default(0).notNull(),
  coworkingSpaces: integer("coworking_spaces").default(0).notNull(),
  privacyMode: text("privacy_mode").default("visible").notNull(),
  skills: text("skills").array(),
  profession: text("profession"),
  lookingFor: text("looking_for"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
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

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

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

// Place Reviews table
export const placeReviews = pgTable("place_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wifiRating: integer("wifi_rating").notNull(), // 1-5
  noiseRating: integer("noise_rating").notNull(), // 1-5 (5 = quiet)
  priceRating: integer("price_rating").notNull(), // 1-5 (5 = good value)
  cleanRating: integer("clean_rating").notNull(), // 1-5
  overallRating: integer("overall_rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const ratingValidation = z.number().int().min(1).max(5);
export const insertPlaceReviewSchema = createInsertSchema(placeReviews).omit({
  id: true,
  createdAt: true,
}).extend({
  wifiRating: ratingValidation,
  noiseRating: ratingValidation,
  priceRating: ratingValidation,
  cleanRating: ratingValidation,
  overallRating: ratingValidation,
});
export type InsertPlaceReview = z.infer<typeof insertPlaceReviewSchema>;
export type PlaceReview = typeof placeReviews.$inferSelect;

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
  latitude: text("latitude"),
  longitude: text("longitude"),
  isOpen: boolean("is_open").default(true).notNull(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatGroupSchema = createInsertSchema(chatGroups).omit({
  id: true,
  members: true,
  createdAt: true,
});
export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;
export type ChatGroup = typeof chatGroups.$inferSelect;

// Group Members table
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => chatGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").references(() => chatGroups.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
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
  type: text("type").notNull(), // "public", "nomad", "online"
  city: text("city").notNull(),
  country: text("country"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  capacity: integer("capacity"),
  price: integer("price").default(0),
  currency: text("currency").default("EUR"),
  hostId: varchar("host_id").references(() => users.id, { onDelete: "set null" }),
  placeId: varchar("place_id").references(() => places.id, { onDelete: "set null" }),
  tags: text("tags").array(),
  attendees: integer("attendees").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  color: text("color").default("#a855f7"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  attendees: true,
  likes: true,
  commentsCount: true,
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

// Event Likes table
export const eventLikes = pgTable("event_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EventLike = typeof eventLikes.$inferSelect;

// Event Comments table
export const eventComments = pgTable("event_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventCommentSchema = createInsertSchema(eventComments).omit({
  id: true,
  createdAt: true,
});
export type InsertEventComment = z.infer<typeof insertEventCommentSchema>;
export type EventComment = typeof eventComments.$inferSelect;

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
  status: text("status").default("planned").notNull(), // "planned", "in_progress", "completed"
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
  transportMode: text("transport_mode"), // mezzo per arrivare: walk, bike, train, car, plane
  distanceKm: integer("distance_km"), // distanza dalla tappa precedente
  co2Kg: integer("co2_kg"), // emissioni CO2 in grammi
  placeId: varchar("place_id").references(() => places.id, { onDelete: "set null" }), // hotel/coworking collegato
  sourceTripId: varchar("source_trip_id"), // se copiata da un altro viaggio
  rating: integer("rating"), // 1-5 stelle per il posto
  accommodationName: text("accommodation_name"), // nome dell'alloggio
  accommodationType: text("accommodation_type"), // hotel, hostel, airbnb, camping, couchsurfing
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripStopSchema = createInsertSchema(tripStops).omit({
  id: true,
  createdAt: true,
});
export const updateTripStopSchema = z.object({
  transportMode: z.enum(["walk", "bike", "train", "car", "plane"]).optional(),
  distanceKm: z.number().min(0).optional(),
  co2Kg: z.number().min(0).optional(),
  rating: z.number().min(1).max(5).optional(),
  accommodationName: z.string().optional(),
  accommodationType: z.enum(["hotel", "hostel", "airbnb", "camping", "couchsurfing", "other"]).optional(),
});
export type InsertTripStop = z.infer<typeof insertTripStopSchema>;
export type UpdateTripStop = z.infer<typeof updateTripStopSchema>;
export type TripStop = typeof tripStops.$inferSelect;

// Trip Expenses (Spese per tappa) table
export const tripExpenses = pgTable("trip_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").notNull().references(() => tripStops.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "hotel", "hostel", "airbnb", "coworking", "food", "groceries", "drinks", "transport", "internet", "entertainment", "health", "other"
  name: text("name").notNull(),
  cost: integer("cost").notNull(), // in centesimi
  currency: text("currency").default("EUR"),
  rating: integer("rating"), // 1-5 stelle valutazione generale
  wifiRating: integer("wifi_rating"), // 1-5 qualità wifi
  cleanRating: integer("clean_rating"), // 1-5 pulizia
  locationRating: integer("location_rating"), // 1-5 posizione
  valueRating: integer("value_rating"), // 1-5 rapporto qualità/prezzo
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

// Cities table - Cost of living data
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: text("country").notNull(),
  teleportSlug: text("teleport_slug"), // es. "bali" per API Teleport
  emoji: text("emoji").default("🌍"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Costi giornalieri (in EUR)
  costAccommodationMin: integer("cost_accommodation_min").default(30),
  costAccommodationMax: integer("cost_accommodation_max").default(80),
  costFoodMin: integer("cost_food_min").default(10),
  costFoodMax: integer("cost_food_max").default(25),
  costCoworkingMin: integer("cost_coworking_min").default(8),
  costCoworkingMax: integer("cost_coworking_max").default(20),
  costTransportMin: integer("cost_transport_min").default(3),
  costTransportMax: integer("cost_transport_max").default(10),
  // Dati community
  nomadsCount: integer("nomads_count").default(0),
  rating: doublePrecision("rating").default(4.0),
  internetSpeed: integer("internet_speed").default(50), // Mbps
  weather: text("weather"), // es. "☀️ 28°C"
  // Statistiche feedback
  feedbackCount: integer("feedback_count").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  tavilyInsights: text("tavily_insights"),
  lastTavilyUpdate: timestamp("last_tavily_update"),
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
  feedbackCount: true,
  lastUpdated: true,
  createdAt: true,
  lastTavilyUpdate: true,
});
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

// City Feedback - Aggiorna costi dalle esperienze reali
export const cityFeedback = pgTable("city_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Costi giornalieri riportati
  accommodationCost: integer("accommodation_cost"), // per notte
  foodCost: integer("food_cost"), // per giorno
  coworkingCost: integer("coworking_cost"), // per giorno
  transportCost: integer("transport_cost"), // per giorno
  // Valutazioni
  internetRating: integer("internet_rating"), // 1-5
  safetyRating: integer("safety_rating"), // 1-5
  overallRating: integer("overall_rating"), // 1-5
  review: text("review"),
  stayDuration: integer("stay_duration"), // giorni
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCityFeedbackSchema = createInsertSchema(cityFeedback).omit({
  id: true,
  createdAt: true,
});
export type InsertCityFeedback = z.infer<typeof insertCityFeedbackSchema>;
export type CityFeedback = typeof cityFeedback.$inferSelect;

// Push subscriptions for notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Marketplace - Vendors table
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  email: text("email"),
  category: text("category").notNull(), // "esim", "bags", "clothing", "insurance", "tech", "software"
  isVerified: boolean("is_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  isVerified: true,
  isActive: true,
  createdAt: true,
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Marketplace - Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: doublePrecision("price"),
  currency: text("currency").default("EUR"),
  originalPrice: doublePrecision("original_price"),
  discountPercent: integer("discount_percent"),
  category: text("category").notNull(),
  affiliateUrl: text("affiliate_url"),
  tags: text("tags").array(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Local Listings - User-to-user marketplace with GPS
export const localListings = pgTable("local_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: doublePrecision("price").notNull(),
  currency: text("currency").default("EUR"),
  category: text("category").notNull(),
  condition: text("condition").default("good"),
  city: text("city"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLocalListingSchema = createInsertSchema(localListings).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertLocalListing = z.infer<typeof insertLocalListingSchema>;
export type LocalListing = typeof localListings.$inferSelect;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  isFeatured: true,
  isActive: true,
  clicks: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Saved Posts table
export const savedPosts = pgTable("saved_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedPostSchema = createInsertSchema(savedPosts).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedPost = z.infer<typeof insertSavedPostSchema>;
export type SavedPost = typeof savedPosts.$inferSelect;

// Followed Trips table
export const followedTrips = pgTable("followed_trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("followed_trips_user_trip_idx").on(table.userId, table.tripId),
]);

export const insertFollowedTripSchema = createInsertSchema(followedTrips).omit({
  id: true,
  createdAt: true,
});
export type InsertFollowedTrip = z.infer<typeof insertFollowedTripSchema>;
export type FollowedTrip = typeof followedTrips.$inferSelect;

// Moments (Stories) table - ephemeral 24h content
export const moments = pgTable("moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull().default("image"),
  caption: text("caption"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMomentSchema = createInsertSchema(moments).omit({
  id: true,
  views: true,
  likes: true,
  createdAt: true,
});
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;

// Moment Views table
export const momentViews = pgTable("moment_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  momentId: varchar("moment_id").notNull().references(() => moments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("moment_views_moment_user_idx").on(table.momentId, table.userId),
]);

export type MomentView = typeof momentViews.$inferSelect;

// AI Conversations table - for AI chatbot
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
});
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

// AI Messages table - for AI chatbot messages
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;

// User Interests - AI-derived profile tags from activity analysis
export const userInterests = pgTable("user_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // "food", "lifestyle", "transport", "accommodation", "activity", "budget", "climate"
  tag: text("tag").notNull(), // "vegetarian", "surfer", "budget_traveler", "beach_lover", etc.
  confidence: doublePrecision("confidence").default(0.5).notNull(), // 0-1 how confident AI is
  source: text("source").notNull(), // "post_analysis", "trip_data", "expense_data", "manual"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserInterestSchema = createInsertSchema(userInterests).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});
export type InsertUserInterest = z.infer<typeof insertUserInterestSchema>;
export type UserInterest = typeof userInterests.$inferSelect;

// User Activity Log - tracks user behavior for AI profiling
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // "post_created", "trip_added", "place_booked", "product_clicked", "event_joined", "search", "moment_created"
  metadata: text("metadata"), // JSON string with details
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserActivityLog = typeof userActivityLog.$inferSelect;

// Nomad Check-ins - where nomads are or plan to be
export const nomadCheckins = pgTable("nomad_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status").notNull().default("here_now"), // "here_now", "arriving_soon", "planning"
  arrivalDate: timestamp("arrival_date"),
  departureDate: timestamp("departure_date"),
  note: text("note"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNomadCheckinSchema = createInsertSchema(nomadCheckins).omit({
  id: true,
  isActive: true,
  createdAt: true,
});
export type InsertNomadCheckin = z.infer<typeof insertNomadCheckinSchema>;
export type NomadCheckin = typeof nomadCheckins.$inferSelect;

// City Guides - AI-generated content for major nomad hubs
export const cityGuides = pgTable("city_guides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  icon: text("icon"),
  rating: doublePrecision("rating"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCityGuideSchema = createInsertSchema(cityGuides).omit({
  id: true,
  createdAt: true,
});
export type InsertCityGuide = z.infer<typeof insertCityGuideSchema>;
export type CityGuide = typeof cityGuides.$inferSelect;

// Blog Posts - Travel guides, tips, and articles for SEO
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  city: text("city"),
  country: text("country"),
  imageUrl: text("image_url"),
  tags: text("tags").array(),
  author: text("author").default("NomadLife Team").notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Stop Photos (multi-photo gallery per trip stop)
export const stopPhotos = pgTable("stop_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").notNull().references(() => tripStops.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStopPhotoSchema = createInsertSchema(stopPhotos).omit({
  id: true,
  createdAt: true,
});
export type InsertStopPhoto = z.infer<typeof insertStopPhotoSchema>;
export type StopPhoto = typeof stopPhotos.$inferSelect;

// Meetup Requests (nomad-to-nomad meetings at trip stops)
export const meetupRequests = pgTable("meetup_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").notNull().references(() => tripStops.id, { onDelete: "cascade" }),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(), // pending, accepted, declined, cancelled
  message: text("message"),
  proposedDate: timestamp("proposed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMeetupRequestSchema = createInsertSchema(meetupRequests).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertMeetupRequest = z.infer<typeof insertMeetupRequestSchema>;
export type MeetupRequest = typeof meetupRequests.$inferSelect;

// Stop Reviews (community ratings for trip stops / places visited)
export const stopReviews = pgTable("stop_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").notNull().references(() => tripStops.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStopReviewSchema = createInsertSchema(stopReviews).omit({
  id: true,
  createdAt: true,
});
export type InsertStopReview = z.infer<typeof insertStopReviewSchema>;
export type StopReview = typeof stopReviews.$inferSelect;

// Crowdsourced Locations (Spots)
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  wifiQuality: integer("wifi_quality").notNull(),
  powerOutlets: boolean("power_outlets").default(false).notNull(),
  notes: text("notes"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const knowledgeCache = pgTable("knowledge_cache", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  queryNormalized: text("query_normalized").notNull(),
  answer: text("answer"),
  results: text("results"),
  source: text("source").notNull().default("tavily"),
  category: text("category").default("general"),
  locationName: text("location_name"),
  hitCount: integer("hit_count").default(1).notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKnowledgeCacheSchema = createInsertSchema(knowledgeCache).omit({
  id: true,
  hitCount: true,
  lastAccessedAt: true,
  createdAt: true,
});
export type InsertKnowledgeCache = z.infer<typeof insertKnowledgeCacheSchema>;
export type KnowledgeCache = typeof knowledgeCache.$inferSelect;

export const learnedLocations = pgTable("learned_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country"),
  region: text("region"),
  description: text("description"),
  nomadInfo: text("nomad_info"),
  wifiQuality: text("wifi_quality"),
  costLevel: text("cost_level"),
  coworkingSpaces: text("coworking_spaces"),
  sourceType: text("source_type").notNull().default("tavily"),
  sourceUserId: varchar("source_user_id"),
  mentionCount: integer("mention_count").default(1).notNull(),
  lastMentionedAt: timestamp("last_mentioned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLearnedLocationSchema = createInsertSchema(learnedLocations).omit({
  id: true,
  mentionCount: true,
  lastMentionedAt: true,
  createdAt: true,
});
export type InsertLearnedLocation = z.infer<typeof insertLearnedLocationSchema>;
export type LearnedLocation = typeof learnedLocations.$inferSelect;

export const userAiPreferences = pgTable("user_ai_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  travelStyle: text("travel_style"),
  budgetLevel: text("budget_level"),
  accommodationType: text("accommodation_type"),
  interests: text("interests").array(),
  dietaryNeeds: text("dietary_needs"),
  preferredClimate: text("preferred_climate"),
  workStyle: text("work_style"),
  languagesSpoken: text("languages_spoken").array(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserAiPreferencesSchema = createInsertSchema(userAiPreferences).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});
export type InsertUserAiPreferences = z.infer<typeof insertUserAiPreferencesSchema>;
export type UserAiPreferences = typeof userAiPreferences.$inferSelect;
