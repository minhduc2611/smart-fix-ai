import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { geminiService } from "./gemini-service";
import { insertRepairSessionSchema, insertRepairStepSchema, insertVideoCaptureSchema, insertAiAnalysisLogSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/videos/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), 'uploads/videos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create a new repair session
  app.post("/api/repair-sessions", async (req, res) => {
    try {
      const sessionData = insertRepairSessionSchema.parse(req.body);
      const session = await storage.createRepairSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Get active session for technician
  app.get("/api/repair-sessions/active/:technicianName", async (req, res) => {
    try {
      const { technicianName } = req.params;
      const session = await storage.getActiveSession(technicianName);
      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Update repair session
  app.patch("/api/repair-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateRepairSession(id, updates);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Create repair steps for a session
  app.post("/api/repair-steps", async (req, res) => {
    try {
      const stepData = insertRepairStepSchema.parse(req.body);
      const step = await storage.createRepairStep(stepData);
      res.json(step);
    } catch (error) {
      res.status(400).json({ error: "Invalid step data" });
    }
  });

  // Get steps for a session
  app.get("/api/repair-steps/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const steps = await storage.getRepairSteps(sessionId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get steps" });
    }
  });

  // Update repair step
  app.patch("/api/repair-steps/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const step = await storage.updateRepairStep(id, updates);
      if (!step) {
        return res.status(404).json({ error: "Step not found" });
      }
      res.json(step);
    } catch (error) {
      res.status(500).json({ error: "Failed to update step" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
