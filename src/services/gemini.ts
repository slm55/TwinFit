import { GoogleGenAI, Type } from "@google/genai";

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface OutfitAdvice {
  selectedItems: string[];
  description: string;
  justification: string;
}

export async function getOutfitSelection(
  baseImage: string,
  wardrobeImages: string[],
  eventContext: string
): Promise<OutfitAdvice> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const contents = [
    { text: `Сен - TwinFit атты қазақстандық виртуалды стиль кеңесшісісің. 
Міндетің: берілген киімдердің (Wardrobe Photos) арасынан фотодағы адамға (Base Photo) және берілген оқиғаға (Event Context) ең қолайлысын таңдап беру.

Оқиға мән-мәтіні: ${eventContext}

Жауапты қатаң түрде JSON форматында қайтар:
{
  "selectedItems": ["таңдалған киімдердің тізімі"],
  "description": "Образдың толық сипаттамасы (қазақша)",
  "justification": "Бұл таңдау неге осы оқиғаға сәйкес келетіндігінің стилистикалық негіздемесі (қазақша)"
}` },
    { inlineData: { data: baseImage.split(",")[1], mimeType: "image/jpeg" } },
    ...wardrobeImages.map(img => ({
      inlineData: { data: img.split(",")[1], mimeType: "image/jpeg" }
    }))
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            justification: { type: Type.STRING }
          },
          required: ["selectedItems", "description", "justification"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
}

export async function generateVirtualTryOn(
  baseImage: string,
  wardrobeImages: string[],
  advice: OutfitAdvice
): Promise<string> {
  const ai = getAI();
  // Using gemini-2.5-flash-image which is the general model often available on free tiers
  const model = "gemini-2.5-flash-image";
  
  const prompt = `Photorealistic virtual try-on. 
Subject: The person from the first image.
Outfit: ${advice.description}. 
Context: Make sure the person is wearing the selected clothes realistically. 
Style: High-end commercial fashion photography, extremely realistic textures for fabric (wool, cotton, silk) and skin. 
Lighting: Soft studio lighting.
Background: Strictly neutral minimalist studio background (gray or white). 
Important: Preserve the subject's face and build features from the first image. 
Maintain the specific design details of the clothes shown in the other images.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: baseImage.split(",")[1], mimeType: "image/jpeg" } },
          ...wardrobeImages.map(img => ({
            inlineData: { data: img.split(",")[1], mimeType: "image/jpeg" }
          })),
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Image generation failed - no image part returned");
  } catch (error: any) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
}
