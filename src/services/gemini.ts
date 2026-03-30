import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface FoodAnalysis {
  description: string;
  calories: number;
}

export async function analyzeFood(input: string | { data: string; mimeType: string }): Promise<FoodAnalysis> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze the following food input (could be a description or an image) and estimate the total calories. 
  Return the result as a JSON object with "description" (a brief summary of the food) and "calories" (an integer estimate).
  If it's an image, identify the food items first. If it's text, parse the description.
  Be as accurate as possible.`;

  const contents = typeof input === 'string' 
    ? prompt + "\nInput: " + input 
    : {
        parts: [
          { text: prompt },
          { inlineData: input }
        ]
      };

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          calories: { type: Type.NUMBER }
        },
        required: ["description", "calories"]
      }
    }
  });

  return JSON.parse(response.text);
}

export interface WorkoutPrediction {
  caloriesBurned: number;
}

export async function predictWorkoutCalories(
  workoutDetails: string,
  userProfile: { weight: number; height: number; gender: string; age: number }
): Promise<WorkoutPrediction> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Predict the calories burned for the following workout session.
  User Profile: Weight ${userProfile.weight}kg, Height ${userProfile.height}cm, Gender ${userProfile.gender}, Age ${userProfile.age}.
  Workout Details: ${workoutDetails}
  Return a JSON object with "caloriesBurned" (an integer).`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          caloriesBurned: { type: Type.NUMBER }
        },
        required: ["caloriesBurned"]
      }
    }
  });

  return JSON.parse(response.text);
}
