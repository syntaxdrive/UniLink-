import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateCareerRoadmap = async (
  courses: string[],
  skills: string[],
  department: string
): Promise<string> => {
  if (!ai) {
    // Fallback if no API key is present for the demo
    return `
## 🚀 Suggested Career Path: Data Analyst

Based on your Economics background (ECO 301) and skills in Data Analysis:

1.  **Immediate Step:** Master Excel (VLOOKUP, Pivot Tables) and Power BI.
2.  **SIWES Target:** Look for roles in Fintech (Paystack, Flutterwave) or FMCG (Nestle).
3.  **Project Idea:** Analyze Nigerian inflation trends using NBS data.

**Why this fits:** Your statistics knowledge gives you an edge over pure CS students in interpreting business data.
    `;
  }

  const prompt = `
    I am a Nigerian university student in the ${department} department.
    My current courses are: ${courses.join(', ')}.
    My current skills are: ${skills.join(', ')}.
    
    Please act as a career mentor. Suggest 2 specific career paths for me in the Nigerian market.
    For the best option, provide a 3-step actionable roadmap that I can start today.
    Keep it practical, encouraging, and localized to Nigeria (mention specific Nigerian industries or company types).
    Format the output in clean Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate roadmap.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I couldn't generate a roadmap at the moment. Please try again later.";
  }
};