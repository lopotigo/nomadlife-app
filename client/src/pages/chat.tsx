import Layout from "@/components/layout";
import { USERS } from "@/lib/mock-data";
import { Send, Image, MapPin, MoreVertical, Search, Plus } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedChat, setSelectedChat] = useState<any>(null);

  const groups = [
    { id: 1, name: "Bali Nomads", city: "Canggu", members: 124, lastMsg: "Anyone up for sunset drinks?", time: "2m" },
    { id: 2, name: "Lisbon Tech", city: "Lisbon", members: 89, lastMsg: "Best cafe for meetings?", time: "15m" },
    { id: 3, name: "Tokyo Digital", city: "Tokyo", members: 56, lastMsg: "Cherry blossom meet tomorrow!", time: "1h" },
  ];

  const privates = [
    { id: 1, name: "Sarah Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop", status: "online", lastMsg: "The WiFi here is amazing!", time: "5m" },
    { id: 2, name: "Davide Rossi", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop", status: "offline", lastMsg: "See you in Mexico next month?", time: "2h" },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
        {!selectedChat ? (
          <>
            <header className="p-4 border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-display font-bold">Messages</h1>
                <button className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-4 mt-4 border-b border-border">
                <button 
                  onClick={() => setActiveTab("groups")}
                  className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === "groups" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Groups
                  {activeTab === "groups" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab("private")}
                  className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === "private" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Private
                  {activeTab === "private" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "groups" ? (
                groups.map(group => (
                  <button 
                    key={group.id} 
                    onClick={() => setSelectedChat(group)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 rounded-2xl transition-colors text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg">
                      {group.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{group.name}</span>
                        <span className="text-[10px] text-muted-foreground">{group.time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {group.city}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{group.lastMsg}</p>
                    </div>
                  </button>
                ))
              ) : (
                privates.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={() => setSelectedChat(chat)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 rounded-2xl transition-colors text-left"
                  >
                    <div className="relative">
                      <img src={chat.avatar} className="w-12 h-12 rounded-2xl object-cover" />
                      {chat.status === "online" && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{chat.name}</span>
                        <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{chat.lastMsg}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full bg-card">
            <header className="p-4 border-b border-border/40 flex items-center gap-3">
              <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors font-bold text-sm">←</button>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold">
                {selectedChat.avatar ? <img src={selectedChat.avatar} className="w-full h-full rounded-xl object-cover" /> : selectedChat.name[0]}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-sm leading-tight">{selectedChat.name}</h2>
                <p className="text-[10px] text-muted-foreground">{selectedChat.city ? `${selectedChat.members} members` : selectedChat.status}</p>
              </div>
              <button className="p-2 hover:bg-muted rounded-xl"><MoreVertical className="w-5 h-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                <p className="text-xs font-medium">This is the beginning of your conversation in {selectedChat.name}</p>
                <p className="text-[10px] mt-1">Encrypted and secure</p>
              </div>
              
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                  {selectedChat.lastMsg}
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-lg shadow-primary/20">
                  Hey! I'm around, let's connect.
                </div>
              </div>
            </div>

            <footer className="p-4 border-t border-border/40 flex items-center gap-2">
              <button className="p-2.5 bg-muted/50 rounded-xl text-muted-foreground hover:text-primary transition-colors">
                <Image className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="w-full bg-muted/50 border border-transparent focus:border-primary/20 rounded-2xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <button className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                <Send className="w-5 h-5" />
              </button>
            </footer>
          </div>
        )}
      </div>
    </Layout>
  );
}
