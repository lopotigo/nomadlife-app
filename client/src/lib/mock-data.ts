import digitalNomadImg from "@assets/generated_images/digital_nomad_working_at_beach_bar.png";
import coworkingImg from "@assets/generated_images/modern_coworking_space_interior.png";
import avatarImg from "@assets/generated_images/traveler_profile_portrait.png";

export const USERS = [
  {
    id: 1,
    name: "Alex Rivera",
    handle: "@arivera",
    avatar: avatarImg,
    location: "Canggu, Bali",
    bio: "Digital Nomad & UI Designer. Chasing sunsets and good WiFi.",
    stats: {
      countries: 12,
      cities: 34,
      coworking: 15
    }
  },
  {
    id: 2,
    name: "Sarah Chen",
    handle: "@schen_codes",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    location: "Lisbon, Portugal",
    bio: "Fullstack Dev. Coffee enthusiast. Lisbon lover.",
    stats: {
      countries: 8,
      cities: 21,
      coworking: 9
    }
  }
];

export const POSTS = [
  {
    id: 1,
    user: USERS[0],
    image: digitalNomadImg,
    content: "Golden hour work sessions are undefeated. Just found this amazing spot in Canggu with 50mbps wifi and the best tacos. 🌮💻 #DigitalNomad #BaliLife",
    location: "La Brisa, Bali",
    likes: 124,
    comments: 18,
    time: "2h ago"
  },
  {
    id: 2,
    user: USERS[1],
    image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=800&auto=format&fit=crop",
    content: "Cinque Terre hiking weekend! Sometimes you just need to disconnect to reconnect. 🇮🇹✨",
    location: "Cinque Terre, Italy",
    likes: 89,
    comments: 12,
    time: "5h ago"
  }
];

export const PLACES = [
  {
    id: 1,
    name: "Tropical Nomad Coworking",
    location: "Canggu, Bali",
    type: "Coworking",
    rating: 4.8,
    reviews: 342,
    price: "$15/day",
    image: coworkingImg,
    tags: ["High-speed WiFi", "AC", "Pool", "Cafe"],
    description: "The ultimate tropical workspace. Open 24/7 with ergonomic chairs and a community pool."
  },
  {
    id: 2,
    name: "Outsite Lisbon",
    location: "Lisbon, Portugal",
    type: "Coliving",
    rating: 4.9,
    reviews: 128,
    price: "$45/night",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop",
    tags: ["Private Room", "Community Kitchen", "Terrace", "Events"],
    description: "Beautiful coliving space in the heart of Cais do Sodré. Perfect for meeting other nomads."
  },
  {
    id: 3,
    name: "Hubud",
    location: "Ubud, Bali",
    type: "Coworking",
    rating: 4.7,
    reviews: 512,
    price: "$12/day",
    image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=800&auto=format&fit=crop",
    tags: ["Bamboo Architecture", "Community", "Raw Food Cafe"],
    description: "Legendary bamboo coworking space with rice field views and a vibrant community."
  }
];
