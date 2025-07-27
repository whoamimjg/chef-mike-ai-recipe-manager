import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Debug API key access
console.log("OpenAI API Key available:", process.env.OPENAI_API_KEY ? "YES" : "NO");
console.log("OpenAI API Key length:", process.env.OPENAI_API_KEY?.length || 0);

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
  existingRecipes?: Array<{
    id: number;
    title: string;
    ingredients: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
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
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.warn("No OpenAI API key available, returning fallback recommendations");
    return getFallbackRecommendations(request);
  }

  try {
    const { preferences, inventory, existingRecipes } = request;

    // Build a comprehensive prompt for smart recipe recommendations
    let prompt = `You are an expert chef AI. Analyze the user's inventory against their existing recipes AND suggest new recipes.

IMPORTANT INSTRUCTIONS:
1. FIRST analyze their existing saved recipes against their current inventory
2. For existing recipes, calculate ingredient match percentage  
3. THEN suggest 3-4 NEW recipes that use their available ingredients
4. Prioritize recipes where they have 60%+ of ingredients already
5. Include both "recipes you can make now" and "recipes missing just a few items"

USER'S AVAILABLE INGREDIENTS:`;

    if (inventory?.length) {
      prompt += `\nCurrent Inventory:\n`;
      inventory.forEach(item => {
        prompt += `- ${item.ingredientName} (${item.quantity} ${item.unit})\n`;
      });
    } else {
      prompt += `\nNo specific inventory provided - suggest versatile recipes with common ingredients.\n`;
    }

    if (existingRecipes?.length) {
      prompt += `\nUSER'S EXISTING SAVED RECIPES (analyze these against inventory first):\n`;
      existingRecipes.forEach((recipe, index) => {
        let ingredients = [];
        try {
          ingredients = JSON.parse(recipe.ingredients);
        } catch {
          ingredients = [];
        }
        prompt += `\n${index + 1}. "${recipe.title}"`;
        if (recipe.description) prompt += ` - ${recipe.description}`;
        if (ingredients.length) {
          prompt += `\n   Ingredients needed: ${ingredients.map((ing: any) => 
            typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.item || ing}`.trim()
          ).join(', ')}`;
        }
        if (recipe.prepTime || recipe.cookTime) {
          prompt += `\n   Time: ${recipe.prepTime || 0}min prep + ${recipe.cookTime || 0}min cook`;
        }
      });
      prompt += `\n\nFor each existing recipe, determine if they can make it with current inventory and calculate match percentage.`;
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

RESPONSE FORMAT: Return both existing recipe matches AND new suggestions

Please respond with a JSON object with a "recommendations" array containing 5-7 total recommendations:
- Include existing recipes that match their inventory (if any have 50%+ match)
- Fill remaining slots with NEW recipe suggestions
- Sort by inventory match percentage (highest first)

Each recipe should have:
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
    // Fallback to rule-based recommendations if AI fails
    console.warn("AI failed, falling back to rule-based recommendations");
    return getFallbackRecommendations(request);
  }
}

// Fallback function for when OpenAI is not available
function getFallbackRecommendations(request: RecommendationRequest): RecipeRecommendation[] {
  const { inventory, existingRecipes } = request;
  const recommendations: RecipeRecommendation[] = [];

  console.log("Fallback: Analyzing existing recipes against inventory");
  console.log("Existing recipes count:", existingRecipes?.length || 0);
  console.log("Inventory items:", inventory?.map(i => i.ingredientName) || []);

  // Analyze existing recipes against inventory
  if (existingRecipes?.length && inventory?.length) {
    const inventoryItems = inventory.map(item => item.ingredientName.toLowerCase());
    console.log("Inventory items for matching:", inventoryItems);
    
    existingRecipes.forEach((recipe, index) => {
      console.log(`Analyzing recipe ${index + 1}: "${recipe.title}"`);
      let ingredients = [];
      try {
        ingredients = JSON.parse(recipe.ingredients);
        console.log("Recipe ingredients:", ingredients);
      } catch (e) {
        console.log("Failed to parse ingredients for recipe:", recipe.title);
        ingredients = [];
      }

      if (ingredients.length > 0) {
        const requiredIngredients = ingredients.map((ing: any) => {
          const ingredient = (typeof ing === 'string' ? ing : ing.item || ing).toLowerCase();
          console.log("Required ingredient:", ingredient);
          return ingredient;
        });
        
        const matchedIngredients = requiredIngredients.filter((reqIng: string) => {
          const isMatch = inventoryItems.some(invIng => 
            invIng.includes(reqIng) || reqIng.includes(invIng) || 
            reqIng.includes(invIng.split(' ')[0]) || invIng.includes(reqIng.split(' ')[0])
          );
          if (isMatch) console.log(`Matched: ${reqIng} with inventory`);
          return isMatch;
        });
        
        const matchPercentage = Math.round((matchedIngredients.length / requiredIngredients.length) * 100);
        console.log(`Recipe "${recipe.title}" match: ${matchPercentage}% (${matchedIngredients.length}/${requiredIngredients.length})`);
        
        if (matchPercentage >= 20) { // Lowered threshold to include more recipes
          const missingIngredients = requiredIngredients.filter((reqIng: string) =>
            !inventoryItems.some(invIng => 
              invIng.includes(reqIng) || reqIng.includes(invIng) ||
              reqIng.includes(invIng.split(' ')[0]) || invIng.includes(reqIng.split(' ')[0])
            )
          );

          console.log(`Adding recipe "${recipe.title}" with ${matchPercentage}% match`);
          recommendations.push({
            title: `${recipe.title} (Your Recipe)`,
            description: recipe.description || "One of your saved recipes that matches your current inventory",
            prepTime: recipe.prepTime || 15,
            cookTime: recipe.cookTime || 30,
            servings: 4,
            difficulty: matchPercentage >= 80 ? "easy" : "medium",
            cuisine: "Your Recipe Collection",
            ingredients: ingredients.map((ing: any) => 
              typeof ing === 'string' ? ing : `${ing.amount || '1'} ${ing.unit || ''} ${ing.item || ing}`.trim()
            ),
            instructions: ["Follow your saved recipe instructions"],
            tags: ["saved recipe", "personal collection"],
            matchReason: `This is one of your saved recipes. You have ${matchPercentage}% of the ingredients needed. Perfect match for using your ${inventory.map(i => i.ingredientName).join(', ')}.`,
            matchType: matchPercentage >= 80 ? 'full' : 'partial',
            missingIngredients,
            inventoryMatch: matchPercentage
          });
        }
      }
    });
  }

  // Add some generic recipe suggestions based on common inventory items
  const commonRecipes = [
    {
      title: "Simple Grilled Fish",
      description: "A healthy and quick meal perfect for any white fish or salmon you have on hand.",
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      difficulty: "easy",
      cuisine: "American",
      ingredients: ["1 lb fish fillet", "2 tbsp olive oil", "1 lemon", "salt", "pepper", "herbs"],
      instructions: [
        "Preheat grill or pan to medium-high heat",
        "Brush fish with olive oil and season with salt and pepper",
        "Cook fish 3-4 minutes per side until flaky",
        "Serve with lemon and fresh herbs"
      ],
      tags: ["quick", "healthy", "protein"],
      matchReason: "Simple recipe that works with most fish and basic seasonings",
      matchType: "partial" as const,
      missingIngredients: ["lemon", "herbs"],
      inventoryMatch: 60
    },
    {
      title: "Basic Stir Fry",
      description: "Versatile stir fry that can use whatever vegetables and protein you have available.",
      prepTime: 10,
      cookTime: 10,
      servings: 4,
      difficulty: "easy",
      cuisine: "Asian",
      ingredients: ["2 cups mixed vegetables", "1 lb protein", "2 tbsp oil", "soy sauce", "garlic"],
      instructions: [
        "Heat oil in a large pan or wok",
        "Add protein and cook until done",
        "Add vegetables and stir fry 3-5 minutes",
        "Season with soy sauce and garlic"
      ],
      tags: ["quick", "versatile", "one-pan"],
      matchReason: "Flexible recipe that adapts to whatever ingredients you have",
      matchType: "partial" as const,
      missingIngredients: ["soy sauce", "garlic"],
      inventoryMatch: 50
    }
  ];

  // Only add generic recipes if we don't have enough from existing recipes
  if (recommendations.length < 3) {
    recommendations.push(...commonRecipes.slice(0, 3 - recommendations.length));
  }

  // Sort by inventory match percentage
  return recommendations.sort((a, b) => b.inventoryMatch - a.inventoryMatch);
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
