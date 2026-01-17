import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Send, Image, MapPin, MoreVertical, Search, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatGroup, Message, User } from "@shared/schema";

type MessageWithSender = Message & { sender: User };

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("groups");
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/chat-groups")
      .then((res) => res.json())
      .then((data) => setGroups(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (!selectedChat) return;

    fetch(`/api/messages/group/${selectedChat.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(console.error);
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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
                  data-testid="tab-groups"
                >
                  Groups
                  {activeTab === "groups" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab("private")}
                  className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === "private" ? "text-primary" : "text-muted-foreground"}`}
                  data-testid="tab-private"
                >
                  Private
                  {activeTab === "private" && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === "groups" ? (
                groups.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No groups yet. Join a community!</p>
                  </div>
                ) : (
                  groups.map(group => (
                    <button 
                      key={group.id} 
                      onClick={() => setSelectedChat(group)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 rounded-2xl transition-colors text-left group"
                      data-testid={`button-group-${group.id}`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg">
                        {group.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm" data-testid={`text-group-name-${group.id}`}>{group.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {group.city}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {group.members} members · {group.description}
                        </p>
                      </div>
                    </button>
                  ))
                )
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No private chats yet. Start a conversation!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full bg-card">
            <header className="p-4 border-b border-border/40 flex items-center gap-3">
              <button 
                onClick={() => setSelectedChat(null)} 
                className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors font-bold text-sm"
                data-testid="button-back"
              >
                ←
              </button>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold">
                {selectedChat.name[0]}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-sm leading-tight">{selectedChat.name}</h2>
                <p className="text-[10px] text-muted-foreground">{selectedChat.members} members</p>
              </div>
              <button className="p-2 hover:bg-muted rounded-xl"><MoreVertical className="w-5 h-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                  <p className="text-xs font-medium">This is the beginning of your conversation in {selectedChat.name}</p>
                  <p className="text-[10px] mt-1">Encrypted and secure</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className={`max-w-[80%] ${message.senderId === user?.id ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none shadow-lg shadow-primary/20" : "bg-muted rounded-2xl rounded-tl-none"} p-3`}>
                      {message.senderId !== user?.id && (
                        <p className="text-[10px] font-bold mb-1">{message.sender.name}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <footer className="p-4 border-t border-border/40">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button type="button" className="p-2.5 bg-muted/50 rounded-xl text-muted-foreground hover:text-primary transition-colors">
                  <Image className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..." 
                    className="w-full bg-muted/50 border border-transparent focus:border-primary/20 rounded-2xl px-4 py-2.5 text-sm outline-none transition-all"
                    disabled={sending}
                    data-testid="input-message"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-send"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </footer>
          </div>
        )}
      </div>
    </Layout>
  );
}
