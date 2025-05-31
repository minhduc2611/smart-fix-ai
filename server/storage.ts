import { 
  users, 
  repairSessions, 
  repairSteps,
  videoCaptures,
  aiAnalysisLogs,
  type User, 
  type InsertUser,
  type RepairSession,
  type InsertRepairSession,
  type RepairStep,
  type InsertRepairStep,
  type VideoCapture,
  type InsertVideoCapture,
  type AiAnalysisLog,
  type InsertAiAnalysisLog
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Repair Session methods
  createRepairSession(session: InsertRepairSession): Promise<RepairSession>;
  getRepairSession(id: number): Promise<RepairSession | undefined>;
  updateRepairSession(id: number, updates: Partial<RepairSession>): Promise<RepairSession | undefined>;
  getActiveSession(technicianName: string): Promise<RepairSession | undefined>;
  
  // Repair Steps methods
  createRepairStep(step: InsertRepairStep): Promise<RepairStep>;
  getRepairSteps(sessionId: number): Promise<RepairStep[]>;
  updateRepairStep(id: number, updates: Partial<RepairStep>): Promise<RepairStep | undefined>;
  
  // Video Capture methods
  createVideoCapture(capture: InsertVideoCapture): Promise<VideoCapture>;
  getVideoCaptures(sessionId: number): Promise<VideoCapture[]>;
  
  // AI Analysis methods
  createAiAnalysisLog(log: InsertAiAnalysisLog): Promise<AiAnalysisLog>;
  getAiAnalysisLogs(sessionId: number): Promise<AiAnalysisLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createRepairSession(session: InsertRepairSession): Promise<RepairSession> {
    const [repairSession] = await db
      .insert(repairSessions)
      .values(session)
      .returning();
    return repairSession;
  }

  async getRepairSession(id: number): Promise<RepairSession | undefined> {
    const [session] = await db.select().from(repairSessions).where(eq(repairSessions.id, id));
    return session || undefined;
  }

  async updateRepairSession(id: number, updates: Partial<RepairSession>): Promise<RepairSession | undefined> {
    const [session] = await db
      .update(repairSessions)
      .set(updates)
      .where(eq(repairSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getActiveSession(technicianName: string): Promise<RepairSession | undefined> {
    const [session] = await db
      .select()
      .from(repairSessions)
      .where(eq(repairSessions.technicianName, technicianName))
      .limit(1);
    return session || undefined;
  }

  async createRepairStep(step: InsertRepairStep): Promise<RepairStep> {
    const [repairStep] = await db
      .insert(repairSteps)
      .values(step)
      .returning();
    return repairStep;
  }

  async getRepairSteps(sessionId: number): Promise<RepairStep[]> {
    return await db
      .select()
      .from(repairSteps)
      .where(eq(repairSteps.sessionId, sessionId))
      .orderBy(repairSteps.stepNumber);
  }

  async updateRepairStep(id: number, updates: Partial<RepairStep>): Promise<RepairStep | undefined> {
    const [step] = await db
      .update(repairSteps)
      .set(updates)
      .where(eq(repairSteps.id, id))
      .returning();
    return step || undefined;
  }

  async createVideoCapture(capture: InsertVideoCapture): Promise<VideoCapture> {
    const [videoCapture] = await db
      .insert(videoCaptures)
      .values(capture)
      .returning();
    return videoCapture;
  }

  async getVideoCaptures(sessionId: number): Promise<VideoCapture[]> {
    return await db
      .select()
      .from(videoCaptures)
      .where(eq(videoCaptures.sessionId, sessionId))
      .orderBy(videoCaptures.capturedAt);
  }

  async createAiAnalysisLog(log: InsertAiAnalysisLog): Promise<AiAnalysisLog> {
    const [analysisLog] = await db
      .insert(aiAnalysisLogs)
      .values(log)
      .returning();
    return analysisLog;
  }

  async getAiAnalysisLogs(sessionId: number): Promise<AiAnalysisLog[]> {
    return await db
      .select()
      .from(aiAnalysisLogs)
      .where(eq(aiAnalysisLogs.sessionId, sessionId))
      .orderBy(aiAnalysisLogs.timestamp);
  }
}

export const storage = new DatabaseStorage();
