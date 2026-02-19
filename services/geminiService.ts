
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFinancialInsights = async (transactions: Transaction[], parties: string[]) => {
  if (transactions.length === 0) return null;

  const prompt = `
    Analyze the following cash flow transactions between parties: ${parties.join(", ")}.
    Transactions: ${JSON.stringify(transactions)}
    
    Provide a concise summary of the financial relationship, identify who owes the most, 
    and give one piece of friendly financial advice.
  `;

  try {
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
