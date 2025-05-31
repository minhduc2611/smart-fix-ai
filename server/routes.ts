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

  // Real-time conversational analysis with Gemini AI
  app.post("/api/conversational-analysis", async (req, res) => {
    try {
      const { imageData, spokenInput, sessionId } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const spokenText = spokenInput || "What do you see in this equipment?";

      // Analyze with Gemini using conversational approach
      const analysis = await geminiService.conversationalAnalysis(imageData, spokenText);
      
      // Log the analysis
      if (sessionId) {
        await storage.createAiAnalysisLog({
          sessionId: parseInt(sessionId),
          analysisType: "conversational_analysis",
          inputData: { spokenInput: spokenText, imageSize: imageData.length },
          response: analysis,
          confidence: Math.round(analysis.visualAnalysis.confidence * 100)
        });

        // Update session with analysis results
        await storage.updateRepairSession(parseInt(sessionId), {
          equipmentId: analysis.visualAnalysis.equipmentId,
          equipmentType: analysis.visualAnalysis.equipmentType,
          issueDetected: analysis.visualAnalysis.issueDetected,
          totalSteps: analysis.visualAnalysis.repairSteps.length,
          status: "in_progress",
          geminiAnalysis: analysis.visualAnalysis
        });

        // Create repair steps
        for (const step of analysis.visualAnalysis.repairSteps) {
          await storage.createRepairStep({
            sessionId: parseInt(sessionId),
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            status: step.stepNumber === 1 ? "current" : "pending"
          });
        }
      }

      res.json(analysis);
    } catch (error) {
      console.error("Conversational analysis error:", error);
      res.status(500).json({ error: "Failed to analyze with Gemini" });
    }
  });

  // Analyze image with Gemini AI (legacy endpoint)
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageData, sessionId } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Analyze with Gemini
      const analysis = await geminiService.analyzeEquipmentImage(imageData);
      
      // Log the analysis
      if (sessionId) {
        await storage.createAiAnalysisLog({
          sessionId: parseInt(sessionId),
          analysisType: "equipment_detection",
          inputData: { imageSize: imageData.length },
          response: analysis,
          confidence: Math.round(analysis.confidence * 100)
        });

        // Update session with analysis results
        await storage.updateRepairSession(parseInt(sessionId), {
          equipmentId: analysis.equipmentId,
          equipmentType: analysis.equipmentType,
          issueDetected: analysis.issueDetected,
          totalSteps: analysis.repairSteps.length,
          status: "in_progress",
          geminiAnalysis: analysis
        });

        // Create repair steps
        for (const step of analysis.repairSteps) {
          await storage.createRepairStep({
            sessionId: parseInt(sessionId),
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            status: step.stepNumber === 1 ? "current" : "pending"
          });
        }
      }

      res.json(analysis);
    } catch (error) {
      console.error("Image analysis error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // Generate voice guidance for a step
  app.post("/api/voice-guidance", async (req, res) => {
    try {
      const { stepDescription, sessionId } = req.body;
      
      if (!stepDescription) {
        return res.status(400).json({ error: "Step description is required" });
      }

      const voiceGuidance = await geminiService.generateVoiceGuidance(stepDescription);
      
      // Log the voice guidance generation
      if (sessionId) {
        await storage.createAiAnalysisLog({
          sessionId: parseInt(sessionId),
          analysisType: "voice_guidance",
          inputData: { stepDescription },
          response: { voiceGuidance },
          confidence: 95
        });
      }

      res.json({ voiceGuidance });
    } catch (error) {
      console.error("Voice guidance error:", error);
      res.status(500).json({ error: "Failed to generate voice guidance" });
    }
  });

  // Analyze step completion
  app.post("/api/analyze-step-completion", async (req, res) => {
    try {
      const { imageData, expectedStep, sessionId } = req.body;
      
      if (!imageData || !expectedStep) {
        return res.status(400).json({ error: "Image data and expected step are required" });
      }

      const completionAnalysis = await geminiService.analyzeStepCompletion(imageData, expectedStep);
      
      // Log the completion analysis
      if (sessionId) {
        await storage.createAiAnalysisLog({
          sessionId: parseInt(sessionId),
          analysisType: "step_completion",
          inputData: { expectedStep, imageSize: imageData.length },
          response: completionAnalysis,
          confidence: Math.round(completionAnalysis.confidence * 100)
        });
      }

      res.json(completionAnalysis);
    } catch (error) {
      console.error("Step completion analysis error:", error);
      res.status(500).json({ error: "Failed to analyze step completion" });
    }
  });

  // Upload and store video captures
  app.post("/api/upload-video", upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const videoCapture = await storage.createVideoCapture({
        sessionId: parseInt(sessionId),
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size
      });

      res.json(videoCapture);
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  // Get AI analysis logs for a session
  app.get("/api/analysis-logs/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const logs = await storage.getAiAnalysisLogs(sessionId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analysis logs" });
    }
  });

  // Get video captures for a session
  app.get("/api/video-captures/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const captures = await storage.getVideoCaptures(sessionId);
      res.json(captures);
    } catch (error) {
      res.status(500).json({ error: "Failed to get video captures" });
    }
  });

  // Serve uploaded files
  app.get("/api/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
