import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import { Send, Search, Plus, Loader2, ArrowLeft, Users, Phone, Video, MoreVertical, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatGroup, Message, User } from "@shared/schema";

type MessageWithSender = Message & { sender: User };

type PrivateChat = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  location: string;
  isOnline: boolean;
  lastMessage?: string;
};

const nomadProfiles: PrivateChat[] = [
  {
    id: "1",
    name: "Sofia Martinez",
    username: "sofiatravels",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    location: "Bali, Indonesia",
    isOnline: true,
    lastMessage: "Hey! Are you coming to the meetup?",
  },
  {
    id: "2",
    name: "James Chen",
    username: "jamesdigital",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    location: "Lisbon, Portugal",
    isOnline: true,
    lastMessage: "The coworking space is amazing!",
  },
  {
    id: "3",
    name: "Emma Wilson",
    username: "emmawanders",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    location: "Chiang Mai, Thailand",
    isOnline: false,
    lastMessage: "Thanks for the recommendation!",
  },
  {
    id: "4",
    name: "Lucas Silva",
    username: "lucascode",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    location: "Barcelona, Spain",
    isOnline: true,
    lastMessage: "Let's catch up soon!",
  },
  {
    id: "5",
    name: "Mia Anderson",
    username: "mianomad",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    location: "Mexico City, Mexico",
    isOnline: false,
  },
  {
    id: "6",
    name: "Alex Kowalski",
    username: "alexremote",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    location: "Berlin, Germany",
    isOnline: true,
  },
];

const GROUP_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
];

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const privateUserId = urlParams.get("user");

  const [activeTab, setActiveTab] = useState<"groups" | "private">(privateUserId ? "private" : "groups");
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedPrivate, setSelectedPrivate] = useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [privateMessages, setPrivateMessages] = useState<{ id: string; content: string; isOwn: boolean; time: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (privateUserId) {
      const profile = nomadProfiles.find(p => p.id === privateUserId);
      if (profile) {
        setSelectedPrivate(profile);
        setActiveTab("private");
      }
    }
  }, [privateUserId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/chat-groups", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (!selectedGroup) return;
    fetch(`/api/messages/group/${selectedGroup.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, privateMessages]);

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !user) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId: selectedGroup.id, receiverId: null, content: newMessage }),
      });
      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, { ...message, sender: user }]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSendPrivateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPrivate) return;
    const now = new Date();
    setPrivateMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: newMessage,
      isOwn: true,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewMessage("");
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  const hasActiveChat = selectedGroup || selectedPrivate;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] md:h-screen bg-slate-900">
        {/* Left Sidebar - Chat List */}
        <aside className={`${hasActiveChat && isMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-white">Messages</h1>
              <button className="w-10 h-10 bg-violet-500 text-white rounded-xl flex items-center justify-center hover:bg-violet-600 transition-colors" data-testid="button-new-chat">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none"
                data-testid="input-search-chats"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setActiveTab("private"); setSelectedGroup(null); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "private"
                    ? "bg-violet-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
                data-testid="tab-private"
              >
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Direct
                </div>
              </button>
              <button
                onClick={() => { setActiveTab("groups"); setSelectedPrivate(null); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "groups"
                    ? "bg-violet-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
                data-testid="tab-groups"
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Groups
                </div>
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === "private" ? (
              nomadProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => { setSelectedPrivate(profile); setSelectedGroup(null); }}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left ${
                    selectedPrivate?.id === profile.id
                      ? "bg-violet-500/20 border border-violet-500/50"
                      : "hover:bg-slate-800"
                  }`}
                  data-testid={`chat-private-${profile.id}`}
                >
                  <div className="relative">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {profile.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white text-sm truncate">{profile.name}</p>
                      {profile.isOnline && (
                        <span className="text-[10px] text-green-400">online</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{profile.location}</p>
                    {profile.lastMessage && (
                      <p className="text-xs text-slate-400 truncate mt-1">{profile.lastMessage}</p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              groups.map((group, index) => (
                <button
                  key={group.id}
                  onClick={() => { setSelectedGroup(group); setSelectedPrivate(null); }}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left ${
                    selectedGroup?.id === group.id
                      ? "bg-violet-500/20 border border-violet-500/50"
                      : "hover:bg-slate-800"
                  }`}
                  data-testid={`chat-group-${group.id}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GROUP_COLORS[index % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-lg`}>
                    {group.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{group.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {group.city} • {group.members} members
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Side - Chat Window */}
        <main className={`${!hasActiveChat && isMobile ? 'hidden' : 'flex'} flex-1 flex-col bg-slate-950`}>
          {hasActiveChat ? (
            <>
              {/* Chat Header */}
              <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => { setSelectedGroup(null); setSelectedPrivate(null); }}
                  className="md:hidden w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {selectedPrivate ? (
                  <>
                    <div className="relative">
                      <img
                        src={selectedPrivate.avatar}
                        alt={selectedPrivate.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {selectedPrivate.isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-white">{selectedPrivate.name}</h2>
                      <p className="text-xs text-slate-400">
                        {selectedPrivate.isOnline ? "Online" : "Offline"} • {selectedPrivate.location}
                      </p>
                    </div>
                  </>
                ) : selectedGroup ? (
                  <>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GROUP_COLORS[groups.indexOf(selectedGroup) % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                      {selectedGroup.name[0]}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-white">{selectedGroup.name}</h2>
                      <p className="text-xs text-slate-400">{selectedGroup.members} members • {selectedGroup.city}</p>
                    </div>
                  </>
                ) : null}

                <div className="flex gap-1">
                  <button className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedPrivate ? (
                  privateMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <img
                        src={selectedPrivate.avatar}
                        alt={selectedPrivate.name}
                        className="w-20 h-20 rounded-full object-cover mb-4"
                      />
                      <h3 className="font-bold text-white text-lg">{selectedPrivate.name}</h3>
                      <p className="text-slate-500 text-sm mt-1">Start a conversation!</p>
                    </div>
                  ) : (
                    privateMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                          msg.isOwn
                            ? 'bg-violet-500 text-white rounded-br-sm'
                            : 'bg-slate-800 text-white rounded-bl-sm'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.isOwn ? 'text-violet-200' : 'text-slate-500'}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : selectedGroup ? (
                  messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${GROUP_COLORS[groups.indexOf(selectedGroup) % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-2xl mb-4`}>
                        {selectedGroup.name[0]}
                      </div>
                      <h3 className="font-bold text-white text-lg">{selectedGroup.name}</h3>
                      <p className="text-slate-500 text-sm mt-1">Be the first to say hello!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn = msg.senderId === user?.id;
                      const showAvatar = !isOwn && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {!isOwn && (
                            <div className={`w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                              {msg.sender?.avatar ? (
                                <img src={msg.sender.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                msg.sender?.name?.[0] || "?"
                              )}
                            </div>
                          )}
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-violet-500 text-white rounded-br-sm'
                              : 'bg-slate-800 text-white rounded-bl-sm'
                          }`}>
                            {!isOwn && showAvatar && (
                              <p className="text-xs font-semibold text-violet-400 mb-1">{msg.sender?.name}</p>
                            )}
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={selectedPrivate ? handleSendPrivateMessage : handleSendGroupMessage}
                className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none"
                  data-testid="input-message"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-12 h-12 bg-violet-500 text-white rounded-xl flex items-center justify-center hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center mb-4">
                <Send className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white">Select a conversation</h2>
              <p className="text-slate-500 mt-2">Choose from your contacts or groups</p>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
