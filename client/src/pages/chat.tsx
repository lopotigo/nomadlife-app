import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Send, Image, MapPin, MoreVertical, Search, Plus, Loader2, ArrowLeft, Users, Smile, Paperclip, Phone, Video, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatGroup, Message, User } from "@shared/schema";

type MessageWithSender = Message & { sender: User };

const GROUP_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
];

function getGroupColor(index: number) {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

const EMOJI_LIST = [
  "😀", "😂", "🥰", "😎", "🤔", "👍", "👋", "🙌",
  "❤️", "🔥", "✨", "🎉", "🌍", "✈️", "🏖️", "🌴",
  "☕", "💻", "📍", "🎒", "🌅", "🏄", "🧳", "🗺️",
];

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("groups");
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatGroup | null>(null);
  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

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
    if (!selectedChat) return;

    fetch(`/api/messages/group/${selectedChat.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: selectedChat.id,
          receiverId: null,
          content: newMessage,
        }),
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

  const selectChat = (group: ChatGroup, index: number) => {
    setSelectedChat(group);
    setSelectedChatIndex(index);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
              <Send className="w-8 h-8 text-white" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <AnimatePresence mode="wait">
          {!selectedChat ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <header className="p-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-tight">Messages</h1>
                    <p className="text-sm text-slate-400 mt-1">Connect with nomads worldwide</p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-violet-500/30 flex items-center justify-center"
                    data-testid="button-new-chat"
                  >
                    <Plus className="w-6 h-6" />
                  </motion.button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search conversations..." 
                    className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    data-testid="input-search-chats"
                  />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => setActiveTab("groups")}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                      activeTab === "groups" 
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30" 
                        : "bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                    data-testid="tab-groups"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      Groups
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveTab("private")}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                      activeTab === "private" 
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30" 
                        : "bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                    data-testid="tab-private"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      Direct
                    </div>
                  </button>
                </div>
              </header>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {activeTab === "groups" ? (
                  groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-4">
                        <Globe className="w-10 h-10 text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium">No groups yet</p>
                      <p className="text-slate-500 text-sm mt-1">Join a community to start chatting!</p>
                    </div>
                  ) : (
                    groups.map((group, index) => (
                      <motion.button 
                        key={group.id} 
                        onClick={() => selectChat(group, index)}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-4 flex items-center gap-4 bg-slate-800/30 hover:bg-slate-800/60 backdrop-blur-xl border border-slate-700/30 hover:border-slate-600/50 rounded-2xl transition-all text-left group"
                        data-testid={`button-group-${group.id}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGroupColor(index)} flex items-center justify-center text-white font-display font-bold text-xl shadow-lg`}>
                          {group.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white text-base" data-testid={`text-group-name-${group.id}`}>
                              {group.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {new Date(group.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                              <MapPin className="w-3 h-3" />
                              {group.city}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {group.members} members
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-2 truncate">
                            {group.description}
                          </p>
                        </div>
                      </motion.button>
                    ))
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-4">
                      <Send className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium">No direct messages</p>
                    <p className="text-slate-500 text-sm mt-1">Start a conversation with someone!</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full"
            >
              {/* Chat Header */}
              <header className={`p-4 bg-gradient-to-r ${getGroupColor(selectedChatIndex)} bg-opacity-90 backdrop-blur-xl`}>
                <div className="flex items-center gap-3">
                  <motion.button 
                    onClick={() => setSelectedChat(null)} 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-display font-bold text-lg">
                    {selectedChat.name[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-white text-lg leading-tight">{selectedChat.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-white/70 text-xs">{selectedChat.members} members online</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors" data-testid="button-call">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors" data-testid="button-video">
                      <Video className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors" data-testid="button-more">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${getGroupColor(selectedChatIndex)} flex items-center justify-center mb-4`}>
                      <span className="text-3xl font-display font-bold text-white">{selectedChat.name[0]}</span>
                    </div>
                    <p className="text-white font-bold text-lg">Welcome to {selectedChat.name}</p>
                    <p className="text-slate-500 text-sm mt-2 max-w-xs">
                      This is the start of your journey with fellow nomads in {selectedChat.city}
                    </p>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isOwn = message.senderId === user?.id;
                    const showAvatar = !isOwn && (idx === 0 || messages[idx - 1].senderId !== message.senderId);
                    
                    return (
                      <motion.div 
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}
                        data-testid={`message-${message.id}`}
                      >
                        {!isOwn && (
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                            {message.sender.name?.[0] || "?"}
                          </div>
                        )}
                        <div className={`max-w-[75%] ${
                          isOwn 
                            ? `bg-gradient-to-br ${getGroupColor(selectedChatIndex)} text-white rounded-2xl rounded-br-md shadow-lg` 
                            : "bg-slate-800 text-white rounded-2xl rounded-bl-md"
                        } px-4 py-3`}>
                          {!isOwn && showAvatar && (
                            <p className="text-[11px] font-bold text-violet-400 mb-1">{message.sender.name}</p>
                          )}
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwn ? "text-white/50" : "text-slate-500"}`}>
                            {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <footer className="p-4 bg-slate-900 border-t border-slate-800 relative">
                {/* Emoji Picker */}
                <AnimatePresence>
                  {showEmoji && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-20 right-4 bg-slate-800 border border-slate-700 rounded-2xl p-3 shadow-xl z-10"
                      data-testid="emoji-picker"
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_LIST.map((emoji, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => addEmoji(emoji)}
                            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-slate-700 rounded-lg transition-colors"
                            data-testid={`emoji-${i}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <button type="button" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-400 hover:bg-slate-700 transition-colors" data-testid="button-attach">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button type="button" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-400 hover:bg-slate-700 transition-colors" data-testid="button-image">
                      <Image className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..." 
                      className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                      disabled={sending}
                      data-testid="input-message"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowEmoji(!showEmoji)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showEmoji ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"}`}
                      data-testid="button-emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <motion.button 
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-12 h-12 bg-gradient-to-br ${getGroupColor(selectedChatIndex)} text-white rounded-2xl shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                    data-testid="button-send"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </motion.button>
                </form>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
