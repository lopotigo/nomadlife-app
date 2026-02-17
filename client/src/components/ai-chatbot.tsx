import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Plus, Trash2, Loader2, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface AiConversation {
  id: number;
  title: string;
  userId: string | null;
  createdAt: string;
}

interface AiMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  { icon: "🌍", label: "Best nomad cities", prompt: "What are the best cities for digital nomads in 2026?" },
  { icon: "💰", label: "Budget tips", prompt: "Tips for living on a budget as a digital nomad?" },
  { icon: "🏠", label: "Coworking spaces", prompt: "How to find good coworking spaces while traveling?" },
  { icon: "✈️", label: "Visa info", prompt: "Which countries offer digital nomad visas?" },
  { icon: "🗺️", label: "City guide", prompt: "Show me city guide tips for nearby nomad hubs based on my current location" },
  { icon: "🤝", label: "Find collaborators", prompt: "Find digital nomads near me with complementary skills for collaboration" },
  { icon: "🛒", label: "Local deals", prompt: "What items are available in the local marketplace near me?" },
  { icon: "🌱", label: "Eco travel", prompt: "Help me plan an eco-friendly trip and calculate my carbon footprint savings" },
];

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [view, setView] = useState<"list" | "chat">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
        setMessages([]);
        setView("chat");
        return conv;
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
    return null;
  };

  const loadConversation = async (conv: AiConversation) => {
    try {
      const res = await fetch(`/api/ai/conversations/${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConversation(conv);
        setMessages(data.messages || []);
        setView("chat");
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    let conv = activeConversation;
    if (!conv) {
      conv = await createNewConversation();
      if (!conv) return;
    }

    const userMsg: AiMessage = {
      id: Date.now(),
      conversationId: conv.id,
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) {
                  const assistantMsg: AiMessage = {
                    id: Date.now() + 1,
                    conversationId: conv!.id,
                    role: "assistant",
                    content: fullContent,
                    createdAt: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  setStreamingContent("");

                  if (messages.length === 0 && fullContent) {
                    const titleSnippet = content.trim().slice(0, 40);
                    setActiveConversation((prev) => prev ? { ...prev, title: titleSnippet } : prev);
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv!.id ? { ...c, title: titleSnippet } : c)
                    );
                  }
                } else if (data.content) {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                } else if (data.error) {
                  console.error("Stream error:", data.error);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const errorMsg: AiMessage = {
        id: Date.now() + 1,
        conversationId: conv.id,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <p key={i} className="ml-3">• {line.slice(2)}</p>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <p key={i} className="ml-3">{line}</p>;
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      );
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-[400px] h-[500px] md:h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-[60] overflow-hidden"
            data-testid="ai-chatbot-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <div className="flex items-center gap-2">
                {view === "list" && (
                  <button onClick={() => setView("chat")} className="p-1 hover:bg-white/20 rounded-lg" data-testid="chatbot-back-btn">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">NomadBot</h3>
                  <p className="text-[10px] text-white/70">AI Travel Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView(view === "list" ? "chat" : "list")}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="History"
                  data-testid="chatbot-history-btn"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setActiveConversation(null); setMessages([]); setView("chat"); }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="New chat"
                  data-testid="chatbot-new-btn"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  data-testid="chatbot-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {view === "list" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-xs text-muted-foreground px-2 mb-2">Recent conversations</p>
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">No conversations yet</div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors group ${
                        activeConversation?.id === conv.id ? "bg-primary/5 border border-primary/20" : ""
                      }`}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                        data-testid={`delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && !streamingContent && (
                    <div className="space-y-4 pt-4">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
                          <Bot className="w-8 h-8 text-violet-500" />
                        </div>
                        <h4 className="font-semibold text-sm mb-1">Hey{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h4>
                        <p className="text-xs text-muted-foreground">Ask me anything about travel, nomad life, destinations...</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_PROMPTS.map((qp, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(qp.prompt)}
                            className="p-3 text-left bg-muted/50 hover:bg-muted rounded-xl transition-colors border border-border/50"
                            data-testid={`quick-prompt-${i}`}
                          >
                            <span className="text-lg">{qp.icon}</span>
                            <p className="text-xs font-medium mt-1">{qp.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed space-y-1 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                        data-testid={`message-${msg.role}-${msg.id}`}
                      >
                        {formatContent(msg.content)}
                      </div>
                    </div>
                  ))}

                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-muted text-sm leading-relaxed space-y-1">
                        {formatContent(streamingContent)}
                        <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
                      </div>
                    </div>
                  )}

                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-border">
                  <div className="flex items-end gap-2 bg-muted/50 rounded-xl px-3 py-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask NomadBot..."
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground max-h-20 min-h-[36px]"
                      rows={1}
                      disabled={isLoading}
                      data-testid="chatbot-input"
                    />
                    <Button
                      size="sm"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="h-8 w-8 p-0 rounded-lg shrink-0"
                      data-testid="chatbot-send-btn"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center z-[60] transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="ai-chatbot-toggle"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
