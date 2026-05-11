import { GoogleGenAI } from "@google/genai";

// Initialization with public environment variable or standard process.env (handled by Vite)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function askGemini(prompt: string, isJson: boolean = false) {
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
