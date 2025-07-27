import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface RecommendationRequest {
  preferences?: {
    dietaryRestrictions?: string[];
    allergies?: string[];
    favoriteCuisines?: string[];
    cookingSkillLevel?: string;
    maxPrepTime?: number;
    maxCookTime?: number;
  };
  inventory?: Array<{
    ingredientName: string;
    quantity: string;
    unit: string;
  }>;
  mealType?: string;
}

interface RecipeRecommendation {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  matchReason: string;
}

export async function getAIRecipeRecommendations(
  request: RecommendationRequest
): Promise<RecipeRecommendation[]> {
  try {
    const { preferences, inventory, mealType } = request;

    // Build the prompt based on user data
    let prompt = `Generate 3 recipe recommendations based on the following criteria:

Meal Type: ${mealType || 'any'}
`;

    if (preferences?.dietaryRestrictions?.length) {
      prompt += `Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}\n`;
    }

    if (preferences?.allergies?.length) {
      prompt += `Allergies to avoid: ${preferences.allergies.join(', ')}\n`;
    }

    if (preferences?.favoriteCuisines?.length) {
      prompt += `Preferred Cuisines: ${preferences.favoriteCuisines.join(', ')}\n`;
    }

    if (preferences?.cookingSkillLevel) {
      prompt += `Cooking Skill Level: ${preferences.cookingSkillLevel}\n`;
    }

    if (preferences?.maxPrepTime) {
      prompt += `Maximum Prep Time: ${preferences.maxPrepTime} minutes\n`;
    }

    if (preferences?.maxCookTime) {
      prompt += `Maximum Cook Time: ${preferences.maxCookTime} minutes\n`;
    }

    if (inventory?.length) {
      prompt += `Available Ingredients: ${inventory.map(item => 
        `${item.quantity} ${item.unit} ${item.ingredientName}`
      ).join(', ')}\n`;
    }

    prompt += `
Please respond with a JSON array containing exactly 3 recipe recommendations. Each recipe should have:
- title: string
- description: string (2-3 sentences)
- prepTime: number (minutes)
- cookTime: number (minutes)
- servings: number
- difficulty: string (easy, medium, hard)
- cuisine: string
- ingredients: string[] (complete list with quantities)
- instructions: string[] (numbered steps)
- tags: string[] (relevant tags like "vegetarian", "quick", "healthy")
- matchReason: string (why this recipe matches their criteria)

Ensure all recipes respect the dietary restrictions and allergies. Try to use available ingredients when possible.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist who provides personalized recipe recommendations. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure we return an array of recommendations
    if (result.recommendations && Array.isArray(result.recommendations)) {
      return result.recommendations;
    } else if (Array.isArray(result)) {
      return result;
    } else {
      // Fallback if the response structure is unexpected
      return [];
    }
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error("Failed to get AI recommendations: " + (error as Error).message);
  }
}

export async function analyzeRecipeImage(base64Image: string): Promise<{
  ingredients: string[];
  estimatedServings: number;
  cookingMethod: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image and identify the ingredients, estimated servings, and cooking method. Respond with JSON in this format: { 'ingredients': string[], 'estimatedServings': number, 'cookingMethod': string }"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing recipe image:", error);
    throw new Error("Failed to analyze recipe image: " + (error as Error).message);
  }
}
