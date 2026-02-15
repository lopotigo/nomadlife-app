import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are NomadBot, the AI travel assistant for NomadLife - a social platform for digital nomads. You help users with:

- Trip planning: suggest destinations, itineraries, costs, and best times to visit
- Digital nomad lifestyle: visa info, coworking spaces, internet quality, cost of living
- Local tips: food, culture, safety, transport, hidden gems
- Budget planning: accommodation costs, daily expenses by city
- Community: connecting with other nomads, events, meetups

Be friendly, concise, and practical. Use emojis sparingly. If asked about the platform's features, explain how NomadLife helps nomads connect and share experiences. Answer in the same language the user writes in (Italian, English, Spanish, etc.).`;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

function getUserId(req: Request): string {
  return (req.user as any)?.id;
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/ai/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/ai/conversations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/ai/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim() : "New Chat";
      const userId = getUserId(req);
      const conversation = await chatStorage.createConversation(title, userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/ai/conversations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/ai/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = getUserId(req);
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await chatStorage.createMessage(conversationId, "user", content.trim());

      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_tokens: 4096,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content || "";
        if (c) {
          fullResponse += c;
          res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  app.post("/api/ai/quick-ask", requireAuth, async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "Question is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question.trim() },
        ],
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const c = chunk.choices[0]?.delta?.content || "";
        if (c) {
          res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in quick-ask:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process question" });
      }
    }
  });

  app.post("/api/ai/recommendations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, context } = req.body;
      const validTypes = ["destinations", "trips", "marketplace"];
      const recType = validTypes.includes(type) ? type : "destinations";
      
      const prompts: Record<string, string> = {
        destinations: `Based on this traveler context: "${context || 'digital nomad looking for new destinations'}". Suggest 5 destinations. Each object must have: city, country, reason (1 sentence), budget (daily USD estimate), bestFor (1-2 words like "surfing & coding"), emoji. Return as JSON object with key "recommendations" containing the array.`,
        trips: `Based on this context: "${context || 'a 2-week trip in Southeast Asia'}". Suggest a trip itinerary. Return as JSON object with keys: title, description (1 sentence), stops (array of {city, country, days, highlights}).`,
        marketplace: `Based on this nomad profile: "${context || 'remote worker traveling internationally'}". Suggest 5 essential products/services. Each: name, category, reason (1 sentence), priceRange. Return as JSON object with key "recommendations" containing the array.`,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a travel recommendation engine. Return ONLY valid JSON objects." },
          { role: "user", content: prompts[recType] },
        ],
        max_tokens: 2048,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      try {
        const parsed = JSON.parse(content);
        res.json(parsed);
      } catch {
        res.json({ recommendations: [] });
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
}
