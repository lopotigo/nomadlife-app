import { useEffect, useState, useRef, useMemo } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch, Link } from "wouter";
import { Send, Search, Plus, Loader2, ArrowLeft, Users, MapPin, MessageCircle, X, ChevronUp, Globe, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import type { ChatGroup, Message, User } from "@shared/schema";

type MessageWithSender = Message & { sender: User };
type Conversation = { user: User; lastMessage: Message; unreadCount: number };

const GROUP_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
];

const SENDER_NAME_COLORS = [
  "text-cyan-400",
  "text-amber-400",
  "text-emerald-400",
  "text-pink-400",
  "text-violet-400",
  "text-sky-400",
  "text-rose-400",
  "text-teal-400",
  "text-orange-400",
  "text-lime-400",
];

function getSenderColor(senderId: string): string {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_NAME_COLORS[Math.abs(hash) % SENDER_NAME_COLORS.length];
}

function isOnlineSimulated(userId: string): boolean {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 3 === 0;
}

function getDateLabel(date: Date, t: (key: string) => string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t("chat.today");
  if (date.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function PresenceDot({ userId, size = "sm" }: { userId: string; size?: "sm" | "md" }) {
  const online = isOnlineSimulated(userId);
  const sizeClasses = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span
      className={`absolute bottom-0 right-0 ${sizeClasses} rounded-full border-2 border-background ${
        online ? "bg-emerald-400" : "bg-muted-foreground"
      }`}
      data-testid={`presence-${userId}`}
    />
  );
}

function AvatarWithPresence({ user: u, size = "md", showPresence = true }: { user: Pick<User, "id" | "avatar" | "name">; size?: "sm" | "md" | "lg"; showPresence?: boolean }) {
  const sizeMap = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };
  return (
    <div className="relative flex-shrink-0">
      {u.avatar ? (
        <img src={u.avatar} alt={u.name} className={`${sizeMap[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold`}>
          {u.name?.charAt(0) || "?"}
        </div>
      )}
      {showPresence && <PresenceDot userId={u.id} size={size === "lg" ? "md" : "sm"} />}
    </div>
  );
}

function StackedAvatars({ members, max = 4 }: { members: Partial<User>[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m, i) => (
        <div key={m.id || i} className="relative" style={{ zIndex: max - i }}>
          {m.avatar ? (
            <img src={m.avatar} alt={m.name || ""} className="w-7 h-7 rounded-full object-cover border-2 border-background" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-background">
              {m.name?.charAt(0) || "?"}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-foreground border-2 border-background" style={{ zIndex: 0 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const privateUserId = urlParams.get("user");
  const groupIdParam = urlParams.get("group");

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<User | null>(null);
  const [groupMessages, setGroupMessages] = useState<MessageWithSender[]>([]);
  const [privateMessages, setPrivateMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactSearch, setNewContactSearch] = useState("");
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Partial<User>[]>([]);
  const [visibleMessages, setVisibleMessages] = useState(30);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = () => {
    fetch("/api/conversations", { credentials: "include" })
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const selectPrivateChat = async (u: User) => {
    setSelectedPrivateUser(u);
    setSelectedGroup(null);
    setShowMembersPanel(false);
    setVisibleMessages(30);
    try {
      await fetch(`/api/messages/conversation/${u.id}/read`, {
        method: "PATCH",
        credentials: "include"
      });
      fetchConversations();
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const fetchGroups = () => {
    fetch("/api/chat-groups", { credentials: "include" })
      .then(res => res.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const res = await fetch(`/api/chat-groups/${groupId}/members`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setGroupMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch group members:", error);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/auth");
      return;
    }

    Promise.all([
      fetch("/api/chat-groups", { credentials: "include" }).then(res => res.json()),
      fetch("/api/users", { credentials: "include" }).then(res => res.json()),
      fetch("/api/conversations", { credentials: "include" }).then(res => res.json()),
      fetch(`/api/users/${user.id}/followers`, { credentials: "include" }).then(res => res.json()).catch(() => []),
      fetch(`/api/users/${user.id}/following`, { credentials: "include" }).then(res => res.json()).catch(() => []),
    ])
      .then(([groupsData, usersData, conversationsData, followersData, followingData]) => {
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        const otherUsers = Array.isArray(usersData) ? usersData.filter((u: User) => u.id !== user.id) : [];
        setAllUsers(otherUsers);
        setConversations(Array.isArray(conversationsData) ? conversationsData : []);
        setFollowerIds(new Set(Array.isArray(followersData) ? followersData.map((f: any) => f.followerId) : []));
        setFollowingIds(new Set(Array.isArray(followingData) ? followingData.map((f: any) => f.followingId) : []));
        
        if (groupIdParam) {
          const targetGroup = (Array.isArray(groupsData) ? groupsData : []).find((g: ChatGroup) => g.id === groupIdParam);
          if (targetGroup) {
            setSelectedGroup(targetGroup);
            fetchGroupMembers(targetGroup.id);
          }
        } else if (privateUserId) {
          const targetUser = otherUsers.find((u: User) => u.id === privateUserId);
          if (targetUser) {
            setSelectedPrivateUser(targetUser);
            fetch(`/api/messages/conversation/${targetUser.id}/read`, {
              method: "PATCH",
              credentials: "include"
            }).then(() => fetchConversations()).catch(console.error);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation, privateUserId, groupIdParam]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!selectedGroup) return;
    
    fetchGroupMembers(selectedGroup.id);
    
    const fetchMessages = () => {
      fetch(`/api/messages/group/${selectedGroup.id}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setGroupMessages(Array.isArray(data) ? data : []))
        .catch(console.error);
    };
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedPrivateUser || !user) return;
    
    const fetchMessages = () => {
      fetch(`/api/messages/private/${selectedPrivateUser.id}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setPrivateMessages(Array.isArray(data) ? data : []))
        .catch(console.error);
    };
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
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

  const handleCreateGroup = async (name: string, city: string, description: string) => {
    try {
      const res = await fetch("/api/chat-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, city, description, members: 1 }),
      });
      if (res.ok) {
        const newGroup = await res.json();
        setGroups(prev => [newGroup, ...prev]);
        setSelectedGroup(newGroup);
        setSelectedPrivateUser(null);
        setShowCreateGroup(false);
        toast({ title: t("chat.group_created"), description: name });
      }
    } catch (error) {
      console.error("Failed to create group:", error);
      toast({ title: t("chat.group_create_failed"), variant: "destructive" });
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const hasActiveChat = selectedGroup || selectedPrivateUser;
  const currentMessages = selectedGroup ? groupMessages : privateMessages;

  const getRelationship = (userId: string): "mutual" | "following" | "follower" | "none" => {
    const iFollow = followingIds.has(userId);
    const followsMe = followerIds.has(userId);
    if (iFollow && followsMe) return "mutual";
    if (iFollow) return "following";
    if (followsMe) return "follower";
    return "none";
  };

  const sortedContacts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const conversationUserIds = new Set(conversations.map(c => c.user.id));
    
    const sortedConversations = [...conversations]
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
    
    const conversationUsers = sortedConversations
      .map(c => c.user)
      .filter(u => u.name.toLowerCase().includes(searchLower) || u.username.toLowerCase().includes(searchLower));
    
    const connectedUsers = allUsers
      .filter(u => !conversationUserIds.has(u.id))
      .filter(u => followingIds.has(u.id) || followerIds.has(u.id))
      .filter(u => u.name.toLowerCase().includes(searchLower) || u.username.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        const relA = getRelationship(a.id);
        const relB = getRelationship(b.id);
        const order = { mutual: 0, following: 1, follower: 2, none: 3 };
        return order[relA] - order[relB];
      });
    
    const otherUsers = allUsers
      .filter(u => !conversationUserIds.has(u.id))
      .filter(u => !followingIds.has(u.id) && !followerIds.has(u.id))
      .filter(u => u.name.toLowerCase().includes(searchLower) || u.username.toLowerCase().includes(searchLower));
    
    return [...conversationUsers, ...connectedUsers, ...otherUsers];
  }, [searchQuery, conversations, allUsers, followingIds, followerIds]);

  const groupedMessages = useMemo(() => {
    const msgs = currentMessages;
    const total = msgs.length;
    const startIndex = Math.max(0, total - visibleMessages);
    const visible = msgs.slice(startIndex);
    const hasMore = startIndex > 0;

    type GroupedItem = 
      | { type: "date"; label: string }
      | { type: "message"; msg: MessageWithSender; showAvatar: boolean; showName: boolean; isOwn: boolean; isLast: boolean };

    const items: GroupedItem[] = [];
    let lastDate = "";
    let lastSenderId = "";

    visible.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt);
      const dateLabel = getDateLabel(msgDate, t);
      
      if (dateLabel !== lastDate) {
        items.push({ type: "date", label: dateLabel });
        lastDate = dateLabel;
        lastSenderId = "";
      }

      const isOwn = msg.senderId === user?.id;
      const isSameSender = msg.senderId === lastSenderId;
      const nextMsg = visible[i + 1];
      const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId || getDateLabel(new Date(nextMsg.createdAt), t) !== dateLabel;

      items.push({
        type: "message",
        msg,
        showAvatar: !isSameSender,
        showName: !isSameSender && !isOwn && !!selectedGroup,
        isOwn,
        isLast: isLastInGroup,
      });

      lastSenderId = msg.senderId;
    });

    return { items, hasMore };
  }, [currentMessages, visibleMessages, user, selectedGroup, t]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] md:h-screen bg-background">
        {/* Left Sidebar - Groups */}
        <aside className={`${hasActiveChat && isMobile ? 'hidden' : 'flex'} lg:flex flex-col w-20 bg-background border-r border-border`}>
          <div className="p-3 border-b border-border">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">{t("chat.groups")}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {groups.map((group, index) => (
              <button
                key={group.id}
                onClick={() => { setSelectedGroup(group); setSelectedPrivateUser(null); setShowMembersPanel(false); setVisibleMessages(30); }}
                className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center transition-all relative group ${
                  selectedGroup?.id === group.id 
                    ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background" 
                    : "hover:scale-110"
                }`}
                title={group.name}
                data-testid={`group-icon-${group.id}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GROUP_COLORS[index % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-lg`}>
                  {group.name[0]}
                </div>
                {group.members > 1 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {group.members > 99 ? "99+" : group.members}
                  </span>
                )}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-muted text-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {group.name} ({group.city})
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="w-12 h-12 mx-auto bg-violet-500 hover:bg-violet-600 rounded-xl flex items-center justify-center text-white transition-colors"
              data-testid="button-create-group"
            >
              <Plus className="w-5 h-5" />
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-1">{t("chat.new")}</p>
          </div>
        </aside>

        {/* Middle Section - Contacts List */}
        <aside className={`${hasActiveChat && isMobile ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-80 bg-background border-r border-border`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-400" />
                {t("chat.title")}
              </h1>
              <button
                onClick={() => setShowNewContact(true)}
                className="w-8 h-8 bg-violet-500 hover:bg-violet-600 rounded-lg flex items-center justify-center text-white transition-colors"
                data-testid="button-new-contact"
                title={t("chat.new_contact")}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("chat.search_contacts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none"
                data-testid="input-search-contacts"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Send className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">{t("chat.no_contacts")}</p>
              </div>
            ) : (
              sortedContacts.map(u => {
                const conversation = conversations.find(c => c.user.id === u.id);
                const unreadCount = conversation?.unreadCount || 0;
                const lastMessage = conversation?.lastMessage;
                const rel = getRelationship(u.id);
                
                return (
                  <button
                    key={u.id}
                    onClick={() => selectPrivateChat(u)}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left ${
                      selectedPrivateUser?.id === u.id ? "bg-violet-500/20 border border-violet-500/50" : "hover:bg-muted"
                    }`}
                    data-testid={`chat-private-${u.id}`}
                  >
                    <AvatarWithPresence user={u} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground">{u.name}</p>
                          {rel === "mutual" && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full">{t("chat.badge_mutual")}</span>
                          )}
                          {rel === "following" && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded-full">{t("chat.badge_following")}</span>
                          )}
                          {rel === "follower" && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 text-[9px] font-bold rounded-full">{t("chat.badge_follower")}</span>
                          )}
                        </div>
                        {lastMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {u.location && (
                          <span className="flex items-center gap-0.5 text-[10px] text-teal-500">
                            <MapPin className="w-2.5 h-2.5" />
                            {u.location.split(",")[0]}
                          </span>
                        )}
                      </div>
                      {lastMessage ? (
                        <p className={`text-xs truncate mt-0.5 ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {lastMessage.senderId === user?.id ? t("chat.you_prefix") : ""}{lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 bg-violet-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side - Chat Window */}
        <main className={`${!hasActiveChat && isMobile ? 'hidden' : 'flex'} flex-1 flex-col bg-background relative`}>
          {hasActiveChat ? (
            <>
              {/* Chat Header */}
              <header
                className={`p-4 bg-card/95 backdrop-blur-sm border-b border-border flex items-center gap-3 z-10 ${selectedGroup ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                onClick={() => { if (selectedGroup) setShowMembersPanel(!showMembersPanel); }}
                data-testid="chat-header"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); setSelectedPrivateUser(null); setShowMembersPanel(false); }}
                  className="lg:hidden w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-foreground"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {selectedPrivateUser ? (
                  <>
                    <AvatarWithPresence user={selectedPrivateUser} />
                    <div className="flex-1">
                      <h2 className="font-bold text-foreground">{selectedPrivateUser.name}</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">@{selectedPrivateUser.username}</p>
                        {isOnlineSimulated(selectedPrivateUser.id) && (
                          <span className="text-[10px] text-emerald-400 font-medium">{t("chat.online_now")}</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : selectedGroup ? (
                  <>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GROUP_COLORS[groups.indexOf(selectedGroup) % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                      {selectedGroup.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-foreground truncate">{selectedGroup.name}</h2>
                        <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full font-medium flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {selectedGroup.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <StackedAvatars members={groupMembers} max={5} />
                        <span className="text-[11px] text-muted-foreground">
                          {selectedGroup.members} {t("chat.group_members_count")}
                        </span>
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </>
                ) : null}
              </header>

              {/* Members Panel (slides from top) */}
              <AnimatePresence>
                {showMembersPanel && selectedGroup && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-background border-b border-border overflow-hidden z-10"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4 text-violet-400" />
                          {t("chat.group_members")} ({groupMembers.length})
                        </h3>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowMembersPanel(false); }}
                          className="w-6 h-6 bg-muted rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                          data-testid="button-close-members"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {groupMembers.map((member) => {
                          const online = isOnlineSimulated(member.id!);
                          return (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/60 hover:bg-muted transition-colors group/member"
                              data-testid={`member-${member.id}`}
                            >
                              <AvatarWithPresence user={member as User} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                                <div className="flex items-center gap-1.5">
                                  {(member as any).location && (
                                    <span className="text-[10px] text-teal-400 flex items-center gap-0.5 truncate">
                                      <Globe className="w-2.5 h-2.5 flex-shrink-0" />
                                      {(member as any).location.split(",")[0]}
                                    </span>
                                  )}
                                  <span className={`text-[10px] ${online ? "text-emerald-400" : "text-muted-foreground"}`}>
                                    {online ? t("chat.online_now") : t("chat.offline")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                <Link href={`/user/${member.id}`}>
                                  <button
                                    className="w-7 h-7 bg-accent hover:bg-violet-500 rounded-lg flex items-center justify-center text-foreground hover:text-white transition-colors"
                                    title={t("chat.view_profile")}
                                    data-testid={`button-profile-${member.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Compass className="w-3.5 h-3.5" />
                                  </button>
                                </Link>
                                {member.id !== user?.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const u = allUsers.find(u => u.id === member.id);
                                      if (u) { selectPrivateChat(u); setShowMembersPanel(false); }
                                    }}
                                    className="w-7 h-7 bg-accent hover:bg-teal-500 rounded-lg flex items-center justify-center text-foreground hover:text-white transition-colors"
                                    title={t("chat.send_message")}
                                    data-testid={`button-dm-${member.id}`}
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Load previous messages button */}
                {groupedMessages.hasMore && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={() => setVisibleMessages(prev => prev + 30)}
                      className="flex items-center gap-2 px-4 py-2 bg-muted/80 hover:bg-accent text-foreground text-xs font-medium rounded-full transition-colors border border-border/50"
                      data-testid="button-load-previous"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      {t("chat.load_previous")}
                    </button>
                  </div>
                )}

                {currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-accent flex items-center justify-center mb-4">
                      <Compass className="w-10 h-10 text-teal-400" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">{t("chat.no_messages_yet")}</h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                      {selectedGroup ? t("chat.group_welcome") : t("chat.start_the_conversation")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {groupedMessages.items.map((item, i) => {
                      if (item.type === "date") {
                        return (
                          <div key={`date-${i}`} className="flex items-center justify-center my-4">
                            <div className="px-3 py-1 bg-muted/80 backdrop-blur-sm rounded-full border border-border/50">
                              <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
                            </div>
                          </div>
                        );
                      }

                      const { msg, showAvatar, showName, isOwn, isLast } = item;
                      const senderAvatar = isOwn ? user?.avatar : msg.sender?.avatar;
                      const senderName = isOwn ? user?.name : msg.sender?.name;
                      const senderLocation = !isOwn ? (msg.sender as any)?.location : null;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'} ${isLast ? 'mb-1' : ''}`}
                          data-testid={`message-${msg.id}`}
                        >
                          {/* Avatar column for other users */}
                          {!isOwn && (
                            <div className="w-9 mr-2 flex-shrink-0">
                              {showAvatar ? (
                                <Link href={`/user/${msg.senderId}`}>
                                  <div className="cursor-pointer">
                                    {senderAvatar ? (
                                      <img src={senderAvatar} alt={senderName || ""} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {senderName?.[0] || "?"}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ) : null}
                            </div>
                          )}
                          
                          <div className={`max-w-[70%]`}>
                            {/* Sender name + location tag */}
                            {showName && (
                              <div className="flex items-center gap-2 mb-0.5 ml-1">
                                <span className={`text-xs font-semibold ${getSenderColor(msg.senderId)}`}>
                                  {senderName}
                                </span>
                                {senderLocation && (
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                    <MapPin className="w-2 h-2" />
                                    {senderLocation.split(",")[0]}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className={`px-3.5 py-2 ${
                              isOwn 
                                ? `bg-gradient-to-br from-violet-500 to-violet-600 text-white ${showAvatar ? 'rounded-2xl rounded-br-md' : isLast ? 'rounded-2xl rounded-tr-md' : 'rounded-xl rounded-r-md'}` 
                                : `bg-muted/80 text-foreground ${showAvatar ? 'rounded-2xl rounded-bl-md' : isLast ? 'rounded-2xl rounded-tl-md' : 'rounded-xl rounded-l-md'}`
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <p className={`text-[10px] mt-0.5 text-right ${isOwn ? 'text-violet-200/70' : 'text-muted-foreground'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={selectedPrivateUser ? handleSendPrivateMessage : handleSendGroupMessage}
                className="p-3 bg-card/95 backdrop-blur-sm border-t border-border flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("chat.write_message")}
                  className="flex-1 bg-muted border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none"
                  data-testid="input-message"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-2xl flex items-center justify-center hover:from-violet-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                  data-testid="button-send"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-accent flex items-center justify-center mb-4">
                <Compass className="w-12 h-12 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t("chat.select_conversation")}</h2>
              <p className="text-muted-foreground mt-2">{t("chat.select_conversation_desc")}</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={handleCreateGroup}
          />
        )}

        {showNewContact && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border border-border rounded-2xl w-full max-w-md shadow-xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-400" />
                  {t("chat.new_contact")}
                </h2>
                <button
                  onClick={() => { setShowNewContact(false); setNewContactSearch(""); }}
                  className="w-8 h-8 bg-muted hover:bg-accent rounded-lg flex items-center justify-center text-muted-foreground"
                  data-testid="button-close-new-contact"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("chat.search_users")}
                    value={newContactSearch}
                    onChange={(e) => setNewContactSearch(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none"
                    data-testid="input-new-contact-search"
                    autoFocus
                  />
                </div>

                <div className="max-h-80 overflow-y-auto space-y-1">
                  {allUsers
                    .filter(u => 
                      u.name.toLowerCase().includes(newContactSearch.toLowerCase()) ||
                      u.username.toLowerCase().includes(newContactSearch.toLowerCase())
                    )
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          selectPrivateChat(u);
                          setShowNewContact(false);
                          setNewContactSearch("");
                        }}
                        className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-muted transition-colors text-left"
                        data-testid={`new-contact-${u.id}`}
                      >
                        <AvatarWithPresence user={u} size="sm" />
                        <div>
                          <p className="font-semibold text-foreground text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </button>
                    ))
                  }
                  {allUsers.filter(u => 
                    u.name.toLowerCase().includes(newContactSearch.toLowerCase()) ||
                    u.username.toLowerCase().includes(newContactSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>{t("chat.no_users_found")}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function CreateGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, city: string, description: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    setCreating(true);
    await onCreate(name, city, description);
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background rounded-2xl w-full max-w-md p-6 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{t("chat.create_group")}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">{t("chat.group_name")} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chat.group_name_placeholder")}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none"
              data-testid="input-group-name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">{t("chat.city")} *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("chat.city_placeholder")}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none"
              data-testid="input-group-city"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">{t("chat.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("chat.description_placeholder")}
              rows={3}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 outline-none resize-none"
              data-testid="input-group-description"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !city.trim() || creating}
              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
              data-testid="button-create-group-submit"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("chat.create_group_btn")}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
