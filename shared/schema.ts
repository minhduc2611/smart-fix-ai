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
  equipmentId: text("equipment_id").notNull(),
  equipmentType: text("equipment_type").notNull(),
  issueDetected: text("issue_detected").notNull(),
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, paused
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  sessionData: jsonb("session_data"), // Store additional session info
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

export const insertRepairSessionSchema = createInsertSchema(repairSessions).omit({
  id: true,
  startTime: true,
  endTime: true,
});

export const insertRepairStepSchema = createInsertSchema(repairSteps).omit({
  id: true,
  completedAt: true,
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
