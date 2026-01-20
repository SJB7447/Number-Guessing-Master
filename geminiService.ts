
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiCommentary = async (guess: number, result: string, history: number[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a witty game host for a number guessing game (1-100). 
      The player just guessed ${guess} and the result was ${result}. 
      Previous guesses: ${history.join(', ')}. 
      Give a very short, one-sentence encouraging or witty reaction in Korean. Keep it under 20 characters.`,
    });
    return response.text?.trim() || "좋은 시도예요!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "화이팅!";
  }
};
