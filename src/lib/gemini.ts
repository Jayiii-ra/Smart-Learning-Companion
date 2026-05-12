import { GoogleGenAI } from "@google/genai";

/**
 * GEMINI API INITIALIZATION
 * 
 * Local Development: 
 * Create a .env file and add VITE_GEMINI_API_KEY=your_api_key_here
 * 
 * Platform Deployment:
 * Set GEMINI_API_KEY in the Secrets panel.
 */
const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("CRITICAL: GEMINI_API_KEY is missing. AI features will not function. Please check your .env file or platform secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey as string });

export async function askGemini(prompt: string, isJson: boolean = false) {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure GEMINI_API_KEY.");
  }
  try {
    const config: any = {};
    if (isJson) {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config
    });

    if (isJson) {
      return JSON.parse(response.text || "[]");
    }
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
