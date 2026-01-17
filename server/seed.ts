import bcrypt from "bcryptjs";
import { storage } from "./storage";

async function seed() {
  console.log("Starting database seeding...");

  // Create users
  const users = await Promise.all([
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

  console.log(`Created ${users.length} users`);

  // Create posts
  const posts = await Promise.all([
    storage.createPost({
      userId: users[0].id,
      content: "Just arrived in Bali! The coworking scene here is incredible. Found an amazing spot with ocean views 🌊",
      imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
      location: "Canggu, Bali",
    }),
    storage.createPost({
      userId: users[1].id,
      content: "Working from this stunning cafe in Lisbon ☕ The perfect balance of work and exploration!",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      location: "Lisbon, Portugal",
    }),
    storage.createPost({
      userId: users[2].id,
      content: "Chiang Mai never gets old. Great wifi, amazing food, and the best community of digital nomads 🙌",
      imageUrl: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648",
      location: "Chiang Mai, Thailand",
    }),
  ]);

  console.log(`Created ${posts.length} posts`);

  // Create places (coworking spaces and hotels)
  const places = await Promise.all([
    storage.createPlace({
      name: "Dojo Bali",
      type: "coworking",
      location: "Jl. Batu Mejan, Canggu",
      city: "Bali",
      description: "Premier coworking space with ocean views, fast wifi, and a vibrant community",
      price: "$15/day",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
      tags: ["wifi", "community", "ocean-view", "cafe"],
    }),
    storage.createPlace({
      name: "Second Home Lisboa",
      type: "coworking",
      location: "Mercado da Ribeira",
      city: "Lisbon",
      description: "Beautiful design-forward workspace in the heart of Lisbon",
      price: "$25/day",
      imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
      tags: ["wifi", "design", "central", "events"],
    }),
    storage.createPlace({
      name: "Punspace",
      type: "coworking",
      location: "Nimmanhaemin Road",
      city: "Chiang Mai",
      description: "The original Chiang Mai coworking space with excellent facilities",
      price: "$10/day",
      imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
      tags: ["wifi", "quiet", "meeting-rooms", "affordable"],
    }),
    storage.createPlace({
      name: "Selina Canggu",
      type: "hotel",
      location: "Jl. Pantai Batu Bolong",
      city: "Bali",
      description: "Beachfront hotel with coworking, surfing, and amazing community vibes",
      price: "$45/night",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      tags: ["beach", "pool", "coworking", "surf"],
    }),
    storage.createPlace({
      name: "The Hive Hostel",
      type: "hostel",
      location: "Bairro Alto",
      city: "Lisbon",
      description: "Social hostel perfect for solo travelers and digital nomads",
      price: "$20/night",
      imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5",
      tags: ["social", "affordable", "central", "breakfast"],
    }),
  ]);

  console.log(`Created ${places.length} places`);

  // Create chat groups
  const chatGroups = await Promise.all([
    storage.createChatGroup({
      name: "Bali Digital Nomads",
      city: "Bali",
      description: "Connect with nomads in Bali, share tips and organize meetups",
      members: 247,
    }),
    storage.createChatGroup({
      name: "Lisbon Remote Workers",
      city: "Lisbon",
      description: "Community for remote workers based in Lisbon",
      members: 189,
    }),
    storage.createChatGroup({
      name: "Chiang Mai Expats",
      city: "Chiang Mai",
      description: "Long-term nomads and expats in Chiang Mai",
      members: 312,
    }),
  ]);

  console.log(`Created ${chatGroups.length} chat groups`);

  // Create some messages
  await Promise.all([
    storage.createMessage({
      senderId: users[0].id,
      groupId: chatGroups[0].id,
      receiverId: null,
      content: "Hey everyone! Just moved to Canggu. Anyone up for a coffee this week?",
    }),
    storage.createMessage({
      senderId: users[1].id,
      groupId: chatGroups[1].id,
      receiverId: null,
      content: "Best places for lunch in Alfama? Looking for authentic Portuguese food!",
    }),
    storage.createMessage({
      senderId: users[2].id,
      groupId: chatGroups[2].id,
      receiverId: null,
      content: "Reminder: Nomad meetup tonight at 7pm at Maya Mall food court!",
    }),
  ]);

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
