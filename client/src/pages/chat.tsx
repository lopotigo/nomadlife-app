import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import { Send, Search, Plus, Loader2, ArrowLeft, Users, Phone, Video, MoreVertical, MapPin, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatGroup, Message, User } from "@shared/schema";

type MessageWithSender = Message & { sender: User };

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

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<User | null>(null);
  const [groupMessages, setGroupMessages] = useState<MessageWithSender[]>([]);
  const [privateMessages, setPrivateMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }

    Promise.all([
      fetch("/api/chat-groups", { credentials: "include" }).then(res => res.json()),
      fetch("/api/users", { credentials: "include" }).then(res => res.json())
    ])
      .then(([groupsData, usersData]) => {
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        const otherUsers = Array.isArray(usersData) ? usersData.filter((u: User) => u.id !== user.id) : [];
        setAllUsers(otherUsers);
        
        if (privateUserId) {
          const targetUser = otherUsers.find((u: User) => u.id === privateUserId);
          if (targetUser) {
            setSelectedPrivateUser(targetUser);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation, privateUserId]);

  useEffect(() => {
    if (!selectedGroup) return;
    fetch(`/api/messages/group/${selectedGroup.id}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setGroupMessages(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedPrivateUser || !user) return;
    fetch(`/api/messages/private/${selectedPrivateUser.id}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setPrivateMessages(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedPrivateUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, privateMessages]);

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
        setGroupMessages(prev => [...prev, { ...message, sender: user }]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSendPrivateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPrivateUser || !user) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId: null, receiverId: selectedPrivateUser.id, content: newMessage }),
      });
      if (res.ok) {
        const message = await res.json();
        setPrivateMessages(prev => [...prev, { ...message, sender: user }]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const hasActiveChat = selectedGroup || selectedPrivateUser;
  const currentMessages = selectedGroup ? groupMessages : privateMessages;

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] md:h-screen bg-slate-900">
        {/* Left Sidebar - Groups */}
        <aside className={`${hasActiveChat && isMobile ? 'hidden' : 'flex'} lg:flex flex-col w-20 bg-slate-950 border-r border-slate-800`}>
          <div className="p-3 border-b border-slate-800">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {groups.map((group, index) => (
              <button
                key={group.id}
                onClick={() => { setSelectedGroup(group); setSelectedPrivateUser(null); }}
                className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center transition-all ${
                  selectedGroup?.id === group.id 
                    ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950" 
                    : "hover:scale-110"
                }`}
                title={group.name}
                data-testid={`group-icon-${group.id}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GROUP_COLORS[index % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-lg`}>
                  {group.name[0]}
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-slate-800">
            <button className="w-12 h-12 mx-auto bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Middle Section - Contacts List */}
        <aside className={`${hasActiveChat && isMobile ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-80 bg-slate-900 border-r border-slate-800`}>
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-400" />
                Messages
              </h1>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none"
                data-testid="input-search-contacts"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Send className="w-10 h-10 text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium">No contacts found</p>
              </div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedPrivateUser(u); setSelectedGroup(null); }}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left ${
                    selectedPrivateUser?.id === u.id ? "bg-violet-500/20 border border-violet-500/50" : "hover:bg-slate-800"
                  }`}
                  data-testid={`chat-private-${u.id}`}
                >
                  <div className="relative">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {u.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                    {u.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {u.location}
                      </p>
                    )}
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
              <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => { setSelectedGroup(null); setSelectedPrivateUser(null); }}
                  className="lg:hidden w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {selectedPrivateUser ? (
                  <>
                    {selectedPrivateUser.avatar ? (
                      <img src={selectedPrivateUser.avatar} alt={selectedPrivateUser.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {selectedPrivateUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="font-bold text-white">{selectedPrivateUser.name}</h2>
                      <p className="text-xs text-slate-400">@{selectedPrivateUser.username}</p>
                    </div>
                  </>
                ) : selectedGroup ? (
                  <>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GROUP_COLORS[groups.indexOf(selectedGroup) % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                      {selectedGroup.name[0]}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-white">{selectedGroup.name}</h2>
                      <p className="text-xs text-slate-400">{selectedGroup.members} members - {selectedGroup.city}</p>
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

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    {selectedPrivateUser ? (
                      <>
                        {selectedPrivateUser.avatar ? (
                          <img src={selectedPrivateUser.avatar} alt={selectedPrivateUser.name} className="w-20 h-20 rounded-full object-cover mb-4" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4">
                            {selectedPrivateUser.name.charAt(0)}
                          </div>
                        )}
                        <h3 className="font-bold text-white text-lg">{selectedPrivateUser.name}</h3>
                        <p className="text-slate-500 text-sm mt-1">Start a conversation!</p>
                      </>
                    ) : selectedGroup ? (
                      <>
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${GROUP_COLORS[groups.indexOf(selectedGroup) % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-2xl mb-4`}>
                          {selectedGroup.name[0]}
                        </div>
                        <h3 className="font-bold text-white text-lg">{selectedGroup.name}</h3>
                        <p className="text-slate-500 text-sm mt-1">Be the first to say hello!</p>
                      </>
                    ) : null}
                  </div>
                ) : (
                  currentMessages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    const senderAvatar = isOwn ? user?.avatar : msg.sender?.avatar;
                    const senderName = isOwn ? user?.name : msg.sender?.name;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-3`}
                        data-testid={`message-${msg.id}`}
                      >
                        {!isOwn && (
                          <div className="flex-shrink-0">
                            {senderAvatar ? (
                              <img src={senderAvatar} alt={senderName || ""} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {senderName?.[0] || "?"}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                          {!isOwn && selectedGroup && (
                            <p className="text-xs font-semibold text-violet-400 mb-1 ml-1">{senderName}</p>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isOwn ? 'bg-violet-500 text-white rounded-br-sm' : 'bg-slate-800 text-white rounded-bl-sm'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-violet-200' : 'text-slate-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {isOwn && (
                          <div className="flex-shrink-0">
                            {senderAvatar ? (
                              <img src={senderAvatar} alt={senderName || ""} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                                {senderName?.[0] || "?"}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={selectedPrivateUser ? handleSendPrivateMessage : handleSendGroupMessage}
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
            <div className="hidden lg:flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center mb-4">
                <Send className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white">Select a conversation</h2>
              <p className="text-slate-500 mt-2">Choose a contact or group to start chatting</p>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
