import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const repairSessions = pgTable("repair_sessions", {
  id: serial("id").primaryKey(),
  technicianName: text("technician_name").notNull(),
  equipmentId: text("equipment_id"),
  equipmentType: text("equipment_type"),
  issueDetected: text("issue_detected"),
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").default(0),
  status: text("status").notNull().default("analyzing"), // analyzing, in_progress, completed, paused
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  sessionData: jsonb("session_data"), // Store additional session info
  videoUrl: text("video_url"), // URL to stored video file
  geminiAnalysis: jsonb("gemini_analysis"), // Store Gemini analysis results
});

export const repairSteps = pgTable("repair_steps", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  status: text("status").notNull().default("pending"), // pending, current, completed
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const videoCaptures = pgTable("video_captures", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  analysisResult: jsonb("analysis_result"), // Gemini analysis of this specific capture
});

export const aiAnalysisLogs = pgTable("ai_analysis_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  analysisType: text("analysis_type").notNull(), // "equipment_detection", "step_guidance", etc.
  inputData: jsonb("input_data"), // What was sent to Gemini
  response: jsonb("response"), // Gemini's response
  confidence: integer("confidence"), // 0-100
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertRepairSessionSchema = createInsertSchema(repairSessions).omit({
  id: true,
  startTime: true,
  endTime: true,
});

export const insertRepairStepSchema = createInsertSchema(repairSteps).omit({
  id: true,
  completedAt: true,
});

export const insertVideoCaptureSchema = createInsertSchema(videoCaptures).omit({
  id: true,
  capturedAt: true,
});

export const insertAiAnalysisLogSchema = createInsertSchema(aiAnalysisLogs).omit({
  id: true,
  timestamp: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RepairSession = typeof repairSessions.$inferSelect;
export type InsertRepairSession = z.infer<typeof insertRepairSessionSchema>;
export type RepairStep = typeof repairSteps.$inferSelect;
export type InsertRepairStep = z.infer<typeof insertRepairStepSchema>;
export type VideoCapture = typeof videoCaptures.$inferSelect;
export type InsertVideoCapture = z.infer<typeof insertVideoCaptureSchema>;
export type AiAnalysisLog = typeof aiAnalysisLogs.$inferSelect;
export type InsertAiAnalysisLog = z.infer<typeof insertAiAnalysisLogSchema>;
