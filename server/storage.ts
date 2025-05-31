import { 
  users, 
  repairSessions, 
  repairSteps,
  type User, 
  type InsertUser,
  type RepairSession,
  type InsertRepairSession,
  type RepairStep,
  type InsertRepairStep
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private repairSessions: Map<number, RepairSession>;
  private repairSteps: Map<number, RepairStep>;
  private currentUserId: number;
  private currentSessionId: number;
  private currentStepId: number;

  constructor() {
    this.users = new Map();
    this.repairSessions = new Map();
    this.repairSteps = new Map();
    this.currentUserId = 1;
    this.currentSessionId = 1;
    this.currentStepId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRepairSession(session: InsertRepairSession): Promise<RepairSession> {
    const id = this.currentSessionId++;
    const repairSession: RepairSession = {
      ...session,
      id,
      startTime: new Date(),
      endTime: null,
    };
    this.repairSessions.set(id, repairSession);
    return repairSession;
  }

  async getRepairSession(id: number): Promise<RepairSession | undefined> {
    return this.repairSessions.get(id);
  }

  async updateRepairSession(id: number, updates: Partial<RepairSession>): Promise<RepairSession | undefined> {
    const session = this.repairSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.repairSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveSession(technicianName: string): Promise<RepairSession | undefined> {
    return Array.from(this.repairSessions.values()).find(
      (session) => session.technicianName === technicianName && session.status === "in_progress"
    );
  }

  async createRepairStep(step: InsertRepairStep): Promise<RepairStep> {
    const id = this.currentStepId++;
    const repairStep: RepairStep = {
      ...step,
      id,
      completedAt: null,
    };
    this.repairSteps.set(id, repairStep);
    return repairStep;
  }

  async getRepairSteps(sessionId: number): Promise<RepairStep[]> {
    return Array.from(this.repairSteps.values())
      .filter((step) => step.sessionId === sessionId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }

  async updateRepairStep(id: number, updates: Partial<RepairStep>): Promise<RepairStep | undefined> {
    const step = this.repairSteps.get(id);
    if (!step) return undefined;
    
    const updatedStep = { ...step, ...updates };
    this.repairSteps.set(id, updatedStep);
    return updatedStep;
  }
}

export const storage = new MemStorage();
