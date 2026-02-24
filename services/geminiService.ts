
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please set GEMINI_API_KEY in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const getFinancialInsights = async (transactions: Transaction[], parties: string[]) => {
  if (transactions.length === 0) return null;

  try {
    const ai = getAI();
    const prompt = `
      Analyze the following cash flow transactions between parties: ${parties.join(", ")}.
      Transactions: ${JSON.stringify(transactions)}
      
      Note: 'CREDIT' (+) means money flowed INTO the sender's account (Sender balance increases, Recipient balance decreases). 
      'DEBIT' (-) means money flowed OUT of the sender's account (Sender balance decreases, Recipient balance increases).
      
      Provide a concise summary of the financial relationship, identify who owes the most, 
      and give one piece of friendly financial advice.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            advice: { type: Type.STRING },
            totalVolume: { type: Type.NUMBER }
          },
          required: ["summary", "advice", "totalVolume"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error fetching Gemini insights:", error);
    return null;
  }
};
