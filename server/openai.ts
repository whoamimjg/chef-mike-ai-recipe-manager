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
  matchType: 'full' | 'partial';
  missingIngredients?: string[];
  inventoryMatch: number; // percentage of ingredients you have
}

export async function getAIRecipeRecommendations(
  request: RecommendationRequest
): Promise<RecipeRecommendation[]> {
  try {
    const { preferences, inventory } = request;

    // Build a comprehensive prompt for smart recipe recommendations
    let prompt = `You are an expert chef AI. Generate 5 diverse recipe recommendations based on the user's available ingredients and preferences. 

PRIORITIZE RECIPES THAT:
1. Use ingredients the user already has (aim for 70%+ ingredient match when possible)
2. Suggest recipes where they're only missing 1-3 common ingredients
3. Cover different meal types (breakfast, lunch, dinner, snacks)
4. Vary in cooking difficulty and cuisine styles
5. Consider dietary restrictions and preferences

USER'S AVAILABLE INGREDIENTS:`;

    if (inventory?.length) {
      prompt += `\nCurrent Inventory:\n`;
      inventory.forEach(item => {
        prompt += `- ${item.ingredientName} (${item.quantity} ${item.unit})\n`;
      });
    } else {
      prompt += `\nNo specific inventory provided - suggest versatile recipes with common ingredients.\n`;
    }

    if (preferences?.dietaryRestrictions?.length) {
      prompt += `\nDietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}`;
    }

    if (preferences?.allergies?.length) {
      prompt += `\nAllergies to avoid: ${preferences.allergies.join(', ')}`;
    }

    if (preferences?.favoriteCuisines?.length) {
      prompt += `\nPreferred Cuisines: ${preferences.favoriteCuisines.join(', ')}`;
    }

    if (preferences?.cookingSkillLevel) {
      prompt += `\nCooking Skill Level: ${preferences.cookingSkillLevel}`;
    }

    if (preferences?.maxPrepTime || preferences?.maxCookTime) {
      prompt += `\nTime Constraints: `;
      if (preferences.maxPrepTime) prompt += `Max prep ${preferences.maxPrepTime}min `;
      if (preferences.maxCookTime) prompt += `Max cook ${preferences.maxCookTime}min`;
    }

    prompt += `

FOR EACH RECIPE, ANALYZE INGREDIENT MATCHING:
- Calculate what percentage of ingredients the user already has
- List any missing ingredients clearly
- Prioritize recipes with higher ingredient matches

Please respond with a JSON object with a "recommendations" array containing exactly 5 recipe recommendations. Each recipe should have:
- title: string
- description: string (2-3 sentences describing the dish)
- prepTime: number (minutes)
- cookTime: number (minutes)
- servings: number
- difficulty: string (easy, medium, hard)
- cuisine: string (e.g., Italian, Mexican, Asian, American)
- ingredients: string[] (complete list with quantities like "2 cups rice", "1 lb chicken")
- instructions: string[] (detailed numbered cooking steps)
- tags: string[] (relevant tags like "vegetarian", "quick", "healthy", "breakfast", "dinner")
- matchReason: string (explain why this recipe matches their needs and inventory)
- matchType: string ("full" if they have all/most ingredients, "partial" if missing some)
- missingIngredients: string[] (list of ingredients they need to buy, empty array if they have everything)
- inventoryMatch: number (percentage 0-100 of how many ingredients they already have)

Ensure recipes respect dietary restrictions and allergies. Prioritize ingredient matches but suggest creative options.`;

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
