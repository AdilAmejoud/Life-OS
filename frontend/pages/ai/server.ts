import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory database for demo purposes
const db = {
  conversations: [],
  skills: [],
  n8nConnected: [],
  tasks: [],
  instructions: [],
  userData: {}
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/health", (req, res) => {
    res.json({ status: "ok", model: "gemini-3.1-pro-preview" });
  });

  app.get("/api/models", (req, res) => {
    res.json({
      models: [
        { name: "gemini-3.1-pro-preview" },
        { name: "gemini-3-flash-preview" },
        { name: "gemini-2.5-flash" }
      ],
      current: "gemini-3.1-pro-preview"
    });
  });

  app.post("/api/models/switch", (req, res) => {
    res.json({ success: true, model: req.body.model });
  });

  app.get("/api/conversations", (req, res) => {
    res.json(db.conversations.map(c => ({ id: c.id, title: c.title })));
  });

  app.get("/api/conversations/:id", (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ message: "Not found" });
    res.json(conv);
  });

  app.delete("/api/conversations/:id", (req, res) => {
    db.conversations = db.conversations.filter(c => c.id !== req.params.id);
    res.json({ success: true });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, conversationId, reasoningMode } = req.body;
      
      let convId = conversationId;
      if (!convId || convId === 'new') {
        convId = Date.now().toString();
        db.conversations.push({
          id: convId,
          title: messages[messages.length - 1]?.content.substring(0, 30) + '...',
          messages: []
        });
      }

      const conv = db.conversations.find(c => c.id === convId);
      if (conv) {
        conv.messages.push(messages[messages.length - 1]);
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      const reply = response.text;
      
      if (conv) {
        conv.messages.push({ role: 'assistant', content: reply, id: Date.now() });
      }

      res.json({ reply, conversationId: convId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { messages, conversationId } = req.body;
      
      let convId = conversationId;
      if (!convId || convId === 'new') {
        convId = Date.now().toString();
        db.conversations.push({
          id: convId,
          title: messages[messages.length - 1]?.content.substring(0, 30) + '...',
          messages: []
        });
      }

      const conv = db.conversations.find(c => c.id === convId);
      if (conv) {
        conv.messages.push(messages[messages.length - 1]);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`);

      const stream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      let fullReply = '';
      for await (const chunk of stream) {
        fullReply += chunk.text;
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.text })}\n\n`);
      }

      if (conv) {
        conv.messages.push({ role: 'assistant', content: fullReply, id: Date.now() });
      }

      res.end();
    } catch (error) {
      console.error(error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });

  // Skills
  app.get("/api/skills", (req, res) => res.json(db.skills));
  app.post("/api/skills", (req, res) => {
    const skill = { id: Date.now().toString(), ...req.body };
    db.skills.push(skill);
    res.json(skill);
  });
  app.delete("/api/skills/:id", (req, res) => {
    db.skills = db.skills.filter(s => s.id !== req.params.id);
    res.json({ success: true });
  });

  // n8n
  app.get("/api/n8n/workflows", (req, res) => {
    res.json([
      { id: '1', name: 'Daily Summary', description: 'Summarizes unread emails' },
      { id: '2', name: 'Sync Calendar', description: 'Syncs Notion with Google Calendar' }
    ]);
  });
  app.get("/api/n8n/connected", (req, res) => res.json(db.n8nConnected));
  app.post("/api/n8n/connect", (req, res) => {
    db.n8nConnected.push({ workflowId: req.body.workflowId });
    res.json({ success: true });
  });
  app.delete("/api/n8n/disconnect/:id", (req, res) => {
    db.n8nConnected = db.n8nConnected.filter(c => c.workflowId !== req.params.id);
    res.json({ success: true });
  });
  app.post("/api/n8n/trigger/:id", (req, res) => res.json({ success: true }));

  // Tasks
  app.get("/api/tasks", (req, res) => {
    res.json(db.tasks.filter(t => t.status === req.query.status));
  });
  app.post("/api/tasks", (req, res) => {
    const task = { id: Date.now().toString(), status: 'pending', ...req.body };
    db.tasks.push(task);
    res.json(task);
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const task = db.tasks.find(t => t.id === req.params.id);
    if (task) Object.assign(task, req.body);
    res.json(task || { success: false });
  });

  // Instructions
  app.get("/api/instructions", (req, res) => res.json(db.instructions));
  app.post("/api/instructions", (req, res) => {
    const instruction = { id: Date.now().toString(), ...req.body };
    db.instructions.push(instruction);
    res.json(instruction);
  });
  app.patch("/api/instructions/:id", (req, res) => {
    const instruction = db.instructions.find(i => i.id === req.params.id);
    if (instruction) Object.assign(instruction, req.body);
    res.json(instruction || { success: false });
  });
  app.delete("/api/instructions/:id", (req, res) => {
    db.instructions = db.instructions.filter(i => i.id !== req.params.id);
    res.json({ success: true });
  });

  // User Data
  app.get("/api/user-data", (req, res) => res.json(db.userData));
  app.post("/api/user-data", (req, res) => {
    db.userData = { ...db.userData, ...req.body };
    res.json(db.userData);
  });
  app.delete("/api/user-data/:category/:key", (req, res) => {
    if (db.userData[req.params.category]) {
      delete db.userData[req.params.category][req.params.key];
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
