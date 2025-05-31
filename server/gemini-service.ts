import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    try {
      const prompt = `
        You are an expert field technician AI assistant with real-time vision and voice interaction capabilities.
        
        The technician just said: "${spokenInput}"
        
        Analyze the image and respond conversationally to their input while providing technical guidance.
        
        Provide a JSON response with:
        {
          "visualAnalysis": {
            "equipmentId": "detected_id",
            "equipmentType": "category", 
            "equipmentName": "specific_name",
            "model": "model_number",
            "issueDetected": "what_you_see_wrong",
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
            "position": { "x": 0.3, "y": 0.2, "width": 0.4, "height": 0.3 }
          },
          "conversationalResponse": "Direct response to what they said, like a helpful colleague",
          "voiceGuidance": "Clear, spoken instructions for next steps"
        }
        
        Be conversational, supportive, and technically accurate. Respond as if you're right there helping them.
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
        throw new Error('No valid JSON found in Gemini response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Gemini conversational analysis error:', error);
      throw new Error(`Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`);
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