import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test Gemini connection on startup
async function testGeminiConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hello, this is a connection test.");
    console.log('✅ Gemini API connection successful');
    return true;
  } catch (error) {
    console.error('❌ Gemini API connection failed:', error);
    return false;
  }
}

// Test connection on module load
testGeminiConnection();

export interface EquipmentAnalysis {
  equipmentId: string;
  equipmentType: string;
  equipmentName: string;
  model: string;
  issueDetected: string;
  confidence: number;
  repairSteps: RepairStepSuggestion[];
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RepairStepSuggestion {
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
  estimatedTime: string;
  requiredTools: string[];
  safetyNotes: string[];
}

export class GeminiAnalysisService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  async conversationalAnalysis(imageBase64: string, spokenInput: string, sessionContext?: any): Promise<{
    visualAnalysis: EquipmentAnalysis;
    conversationalResponse: string;
    voiceGuidance: string;
  }> {
    console.log(`🤖 Gemini Analysis Request - Input: "${spokenInput}"`);
    console.log(`📸 Image size: ${imageBase64.length} characters`);
    
    try {
      const prompt = `
        You are SmartFix AI, an expert field technician assistant. Analyze the image and respond to: "${spokenInput}"
        
        Always respond with valid JSON in this exact format:
        {
          "visualAnalysis": {
            "equipmentId": "DEVICE_" + Math.random().toString(36).substr(2, 9),
            "equipmentType": "equipment_category",
            "equipmentName": "specific_equipment_name",
            "model": "model_number_if_visible",
            "issueDetected": "describe_what_you_see_that_needs_attention",
            "confidence": 0.85,
            "repairSteps": [
              {
                "stepNumber": 1,
                "title": "First Step",
                "description": "What to do first",
                "instructions": "Detailed instructions",
                "estimatedTime": "5 minutes",
                "requiredTools": ["basic tools"],
                "safetyNotes": ["safety tip"]
              }
            ],
            "position": { "x": 0.3, "y": 0.3, "width": 0.4, "height": 0.4 }
          },
          "conversationalResponse": "Friendly response to their question",
          "voiceGuidance": "Clear spoken instructions"
        }
      `;

      console.log('📤 Sending request to Gemini...');
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            mimeType: 'image/jpeg'
          }
        }
      ]);

      console.log('📥 Received response from Gemini');
      
      const response = await result.response;
      const text = response.text();
      
      console.log('📝 Raw Gemini response:', text.substring(0, 200) + '...');
      
      // Try to extract JSON from the response
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, create a structured response
        console.log('⚠️ No JSON found, creating structured response');
        return {
          visualAnalysis: {
            equipmentId: "DEVICE_" + Math.random().toString(36).substr(2, 9),
            equipmentType: "General Equipment",
            equipmentName: "Equipment in View",
            model: "Unknown Model",
            issueDetected: "Visual inspection needed",
            confidence: 0.7,
            repairSteps: [
              {
                stepNumber: 1,
                title: "Initial Assessment",
                description: "Examine the equipment carefully",
                instructions: "Look for visible damage, loose connections, or wear patterns",
                estimatedTime: "5 minutes",
                requiredTools: ["Visual inspection"],
                safetyNotes: ["Ensure power is off before touching"]
              }
            ],
            position: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }
          },
          conversationalResponse: text.trim() || "I can see some equipment in the image. What specific issue are you experiencing?",
          voiceGuidance: "I'm analyzing what I can see. Please describe the specific problem you're having with this equipment."
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed Gemini response');
      return parsed;
      
    } catch (error) {
      console.error('❌ Gemini conversational analysis error:', error);
      
      // Return a fallback response instead of throwing
      return {
        visualAnalysis: {
          equipmentId: "DEVICE_" + Math.random().toString(36).substr(2, 9),
          equipmentType: "Equipment",
          equipmentName: "Device in Field",
          model: "Field Equipment",
          issueDetected: "Requires inspection",
          confidence: 0.6,
          repairSteps: [
            {
              stepNumber: 1,
              title: "Visual Inspection",
              description: "Inspect the equipment for obvious issues",
              instructions: "Check for loose connections, damage, or unusual sounds",
              estimatedTime: "3-5 minutes",
              requiredTools: ["Flashlight", "Safety equipment"],
              safetyNotes: ["Turn off power", "Wear safety gear"]
            }
          ],
          position: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }
        },
        conversationalResponse: `I'm having trouble analyzing the image right now, but I heard you say "${spokenInput}". Can you describe what you're seeing?`,
        voiceGuidance: "I'm ready to help you troubleshoot. Please describe the equipment and any issues you're experiencing."
      };
    }
  }

  async analyzeEquipmentImage(imageBase64: string, sessionContext?: any): Promise<EquipmentAnalysis> {
    try {
      const prompt = `
        You are an expert field technician AI assistant. Analyze this equipment image and provide detailed repair guidance.
        
        Identify:
        1. Equipment type and model
        2. Any visible issues or anomalies
        3. Specific repair steps needed
        4. Required tools and safety precautions
        
        Respond in JSON format with this structure:
        {
          "equipmentId": "generated_id",
          "equipmentType": "category",
          "equipmentName": "specific_name",
          "model": "model_number",
          "issueDetected": "description_of_issue",
          "confidence": 0.0-1.0,
          "repairSteps": [
            {
              "stepNumber": 1,
              "title": "step_title",
              "description": "brief_description",
              "instructions": "detailed_instructions",
              "estimatedTime": "time_estimate",
              "requiredTools": ["tool1", "tool2"],
              "safetyNotes": ["safety1", "safety2"]
            }
          ],
          "position": {
            "x": 0.3,
            "y": 0.2,
            "width": 0.4,
            "height": 0.3
          }
        }
        
        Be specific and technical but clear. Focus on actionable repair guidance.
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Clean up the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const analysis = JSON.parse(jsonMatch[0]) as EquipmentAnalysis;
      
      // Validate and ensure required fields
      if (!analysis.equipmentType || !analysis.issueDetected) {
        throw new Error('Incomplete analysis from Gemini');
      }

      return analysis;
    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw new Error(`Failed to analyze equipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateVoiceGuidance(stepDescription: string, context?: any): Promise<string> {
    try {
      const prompt = `
        You are an AI field technician assistant speaking to a technician through smart glasses or phone.
        
        Convert this repair step into clear, conversational voice guidance:
        "${stepDescription}"
        
        Guidelines:
        - Use conversational, supportive tone
        - Include safety reminders when relevant
        - Be specific about actions
        - Keep it under 2 sentences
        - Sound like an experienced colleague helping out
        
        Respond with just the voice guidance text, no extra formatting.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Voice guidance generation error:', error);
      return stepDescription; // Fallback to original description
    }
  }

  async analyzeStepCompletion(imageBase64: string, expectedStep: string): Promise<{
    completed: boolean;
    confidence: number;
    feedback: string;
    nextGuidance?: string;
  }> {
    try {
      const prompt = `
        Analyze this image to determine if the repair step has been completed correctly.
        
        Expected step: "${expectedStep}"
        
        Respond in JSON format:
        {
          "completed": true/false,
          "confidence": 0.0-1.0,
          "feedback": "specific_feedback_about_what_you_see",
          "nextGuidance": "optional_additional_guidance"
        }
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in step completion analysis');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Step completion analysis error:', error);
      throw new Error(`Failed to analyze step completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const geminiService = new GeminiAnalysisService();