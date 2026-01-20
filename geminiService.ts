
import { GoogleGenAI } from "@google/genai";

// Vercel 배포 시 환경 변수 process.env.API_KEY가 정의되어 있어야 합니다.
// 빌드 도구에 따라 process가 undefined일 수 있으므로 안전하게 참조합니다.
const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (import.meta as any).env?.VITE_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: apiKey });

export const getGeminiCommentary = async (guess: number, result: string, history: number[]) => {
  if (!apiKey) return "화이팅!";
  
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
