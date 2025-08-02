import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertRecipeSchema,
  insertMealPlanSchema,
  insertShoppingListSchema,
  insertUserPreferencesSchema,
  insertUserInventorySchema,
  PLAN_LIMITS,
  type PlanType,
} from "@shared/schema";
import { getAIRecipeRecommendations } from "./openai";
import { processReceiptImage, deleteReceiptImage } from "./receiptOCR";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Stripe from "stripe";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

// Utility function to check plan limits
async function checkPlanLimits(userId: string, resource: 'recipes' | 'shoppingLists') {
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  const planLimits = PLAN_LIMITS[user.plan as PlanType];
  
  if (resource === 'recipes') {
    if (planLimits.maxRecipes === -1) return { allowed: true, current: 0, limit: -1 };
    
    const currentCount = await storage.getRecipeCount(userId);
    return {
      allowed: currentCount < planLimits.maxRecipes,
      current: currentCount,
      limit: planLimits.maxRecipes
    };
  }
  
  if (resource === 'shoppingLists') {
    if (planLimits.maxShoppingLists === -1) return { allowed: true, current: 0, limit: -1 };
    
    const currentCount = await storage.getShoppingListCount(userId);
    return {
      allowed: currentCount < planLimits.maxShoppingLists,
      current: currentCount,
      limit: planLimits.maxShoppingLists
    };
  }
  
  return { allowed: false, current: 0, limit: 0 };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Plan usage endpoint
  app.get('/api/plan/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const planLimits = PLAN_LIMITS[user.plan as PlanType];
      const recipeCount = await storage.getRecipeCount(userId);
      const shoppingListCount = await storage.getShoppingListCount(userId);

      res.json({
        plan: user.plan,
        usage: {
          recipes: {
            current: recipeCount,
            limit: planLimits.maxRecipes,
            percentage: planLimits.maxRecipes === -1 ? 0 : Math.round((recipeCount / planLimits.maxRecipes) * 100)
          },
          shoppingLists: {
            current: shoppingListCount,
            limit: planLimits.maxShoppingLists,
            percentage: planLimits.maxShoppingLists === -1 ? 0 : Math.round((shoppingListCount / planLimits.maxShoppingLists) * 100)
          }
        },
        features: planLimits.features
      });
    } catch (error) {
      console.error("Error fetching plan usage:", error);
      res.status(500).json({ message: "Failed to fetch plan usage" });
    }
  });

  // Recipe routes
  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search, minRating, maxRating } = req.query;
      
      const filters: any = {};
      if (search) filters.search = search as string;
      if (minRating) filters.minRating = parseInt(minRating as string);
      if (maxRating) filters.maxRating = parseInt(maxRating as string);
      
      const recipes = await storage.getRecipes(userId, Object.keys(filters).length > 0 ? filters : undefined);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId, userId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check plan limits before creating recipe
      const limitCheck = await checkPlanLimits(userId, 'recipes');
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          message: "Recipe limit reached", 
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: 'free'
        });
      }
      
      const recipeData = insertRecipeSchema.parse({
        ...req.body,
        userId,
        ingredients: JSON.parse(req.body.ingredients || '[]'),
        instructions: JSON.parse(req.body.instructions || '[]'),
        tags: JSON.parse(req.body.tags || '[]'),
        nutritionInfo: req.body.nutritionInfo ? JSON.parse(req.body.nutritionInfo) : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      });

      const recipe = await storage.createRecipe(recipeData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = parseInt(req.params.id);
      
      const updateData: any = { ...req.body };
      if (req.body.ingredients) updateData.ingredients = JSON.parse(req.body.ingredients);
      if (req.body.instructions) updateData.instructions = JSON.parse(req.body.instructions);
      if (req.body.tags) updateData.tags = JSON.parse(req.body.tags);
      if (req.body.nutritionInfo) updateData.nutritionInfo = JSON.parse(req.body.nutritionInfo);
      if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

      const recipe = await storage.updateRecipe(recipeId, updateData, userId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = parseInt(req.params.id);
      
      const deleted = await storage.deleteRecipe(recipeId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Recipe import routes
  app.post('/api/recipes/import-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Use web scraping to extract recipe data
      const response = await fetch(url);
      const html = await response.text();
      
      // Basic HTML parsing to extract recipe information
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s*-[^-]*$/, '').trim() : 'Imported Recipe';
      
      // Try to extract structured data (JSON-LD)
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
      let recipeData: any = {};
      
      if (jsonLdMatch) {
        try {
          let structuredData = JSON.parse(jsonLdMatch[1]);
          
          // Handle arrays of structured data - look for Recipe type
          if (Array.isArray(structuredData)) {
            structuredData = structuredData.find(item => item['@type'] === 'Recipe') || structuredData[0];
          }
          
          // Handle nested @graph structures
          if (structuredData['@graph']) {
            const recipeInGraph = structuredData['@graph'].find((item: any) => item['@type'] === 'Recipe');
            if (recipeInGraph) {
              structuredData = recipeInGraph;
            }
          }
          
          if (structuredData['@type'] === 'Recipe' || structuredData.name) {
            // Parse ingredients more intelligently
            const ingredients = Array.isArray(structuredData.recipeIngredient) && structuredData.recipeIngredient.length > 0
              ? structuredData.recipeIngredient.map((ing: string) => {
                  // Clean up the ingredient text
                  const cleanIng = typeof ing === 'string' ? ing.trim() : String(ing || '').trim();
                  if (!cleanIng) return { unit: '', amount: '', item: '', notes: '' };
                  
                  // Try to parse amount, unit, and item from ingredient string
                  const match = cleanIng.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
                  if (match) {
                    return {
                      amount: match[1],
                      unit: match[2] || '',
                      item: match[3],
                      notes: ''
                    };
                  }
                  return { unit: '', amount: '', item: cleanIng, notes: '' };
                }).filter(ing => ing.item.length > 0)
              : [];

            // Parse instructions more intelligently
            const instructions = Array.isArray(structuredData.recipeInstructions) && structuredData.recipeInstructions.length > 0
              ? structuredData.recipeInstructions.map((inst: any) => {
                  if (typeof inst === 'string') return inst.trim();
                  if (inst.text) return inst.text.trim();
                  if (inst.name) return inst.name.trim();
                  return '';
                }).filter(inst => inst.length > 10)
              : [];

            // Parse nutrition info if available
            let nutritionInfo = null;
            if (structuredData.nutrition) {
              nutritionInfo = {
                calories: structuredData.nutrition.calories || null,
                protein: structuredData.nutrition.proteinContent || null,
                carbs: structuredData.nutrition.carbohydrateContent || null,
                fat: structuredData.nutrition.fatContent || null
              };
            }

            // Extract image URL
            let imageUrl = '';
            if (structuredData.image) {
              if (Array.isArray(structuredData.image)) {
                imageUrl = structuredData.image[0];
              } else if (typeof structuredData.image === 'string') {
                imageUrl = structuredData.image;
              } else if (structuredData.image.url) {
                imageUrl = structuredData.image.url;
              }
            }

            recipeData = {
              title: structuredData.name || title,
              description: structuredData.description || '',
              ingredients,
              instructions,
              prepTime: structuredData.prepTime ? parseInt(structuredData.prepTime.replace(/\D/g, '')) || null : null,
              cookTime: structuredData.cookTime ? parseInt(structuredData.cookTime.replace(/\D/g, '')) || null : null,
              servings: structuredData.recipeYield ? parseInt(structuredData.recipeYield.toString()) || null : null,
              imageUrl,
              cuisine: structuredData.recipeCuisine || '',
              mealType: '',
              tags: structuredData.keywords ? (Array.isArray(structuredData.keywords) ? structuredData.keywords : [structuredData.keywords]) : [],
              nutritionInfo,
              sourceUrl: url
            };
            
            console.log(`Extracted ${ingredients.length} ingredients and ${instructions.length} instructions from JSON-LD`);
            
            // If we didn't get enough data from JSON-LD, clear it to trigger fallback
            if (ingredients.length === 0 && instructions.length === 0) {
              recipeData = {};
            }
          }
        } catch (parseError) {
          console.log('Failed to parse JSON-LD, using basic extraction');
        }
      }
      
      // Fallback to enhanced HTML parsing if no structured data found
      if (!recipeData.title || recipeData.ingredients?.length === 0 || recipeData.ingredients?.[0]?.item === 'See original recipe') {
        console.log('Using enhanced HTML parsing fallback...');
        
        // Enhanced ingredient extraction patterns
        const ingredientSelectors = [
          /<li[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/li>/gi,
          /<div[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/div>/gi,
          /<p[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/p>/gi,
          /<li[^>]*data-ingredient[^>]*>([^<]+)<\/li>/gi,
          /<span[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/span>/gi,
          // Common recipe site patterns
          /<li[^>]*class="recipe-ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
          /<div[^>]*class="ingredient[^"]*"[^>]*>([^<]+)<\/div>/gi,
          // Allrecipes specific patterns
          /<span[^>]*class="recipe-summary__item[^"]*"[^>]*>([^<]+)<\/span>/gi,
          /<li[^>]*class="mntl-structured-ingredients__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
        ];
        
        let ingredientMatches: string[] = [];
        for (const selector of ingredientSelectors) {
          const matches = html.match(selector);
          if (matches && matches.length > 0) {
            ingredientMatches = matches;
            console.log(`Found ${matches.length} ingredients with pattern: ${selector}`);
            break;
          }
        }

        // Enhanced instruction extraction patterns
        const instructionSelectors = [
          /<li[^>]*class[^>]*instruction[^>]*>([^<]+)<\/li>/gi,
          /<div[^>]*class[^>]*instruction[^>]*>([^<]+)<\/div>/gi,
          /<p[^>]*class[^>]*instruction[^>]*>([^<]+)<\/p>/gi,
          /<li[^>]*class="recipe-instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
          /<div[^>]*class="instruction[^"]*"[^>]*>([^<]+)<\/div>/gi,
          /<ol[^>]*class[^>]*instruction[^>]*>[\s\S]*?<\/ol>/gi,
          /<div[^>]*class="directions[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
          // Allrecipes specific patterns
          /<li[^>]*class="mntl-sc-block-group--LI[^"]*"[^>]*>([^<]+)<\/li>/gi,
          /<p[^>]*class="comp[^"]*mntl-sc-block[^"]*"[^>]*>([^<]+)<\/p>/gi,
        ];

        let instructionMatches: string[] = [];
        for (const selector of instructionSelectors) {
          const matches = html.match(selector);
          if (matches && matches.length > 0) {
            // If we found an ol or div container, extract li items from it
            if (selector.includes('ol') || selector.includes('directions')) {
              const liMatches = matches[0].match(/<li[^>]*>([^<]+)<\/li>/gi);
              if (liMatches) {
                instructionMatches = liMatches;
              }
            } else {
              instructionMatches = matches;
            }
            console.log(`Found ${instructionMatches.length} instructions with pattern: ${selector}`);
            break;
          }
        }

        // Enhanced image extraction
        const imageSelectors = [
          /<img[^>]*class[^>]*recipe[^>]*[^>]*src=["']([^"']+)["']/gi,
          /<img[^>]*src=["']([^"']*recipe[^"']*)[^>]*>/gi,
          /<img[^>]*src=["']([^"']*food[^"']*)[^>]*>/gi,
          /<img[^>]*alt=["'][^"']*recipe[^"']*[^>]*src=["']([^"']+)["']/gi,
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
          // Try any high-resolution image
          /<img[^>]*src=["']([^"']*\d{3,4}x\d{3,4}[^"']*)[^>]*>/gi,
        ];

        let imageUrl = '';
        for (const selector of imageSelectors) {
          const match = html.match(selector);
          if (match && match[1]) {
            imageUrl = match[1];
            // Make sure it's a full URL
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = new URL(url).origin + imageUrl;
            }
            console.log(`Found image: ${imageUrl}`);
            break;
          }
        }

        // Try to extract time information
        const prepTimeMatch = html.match(/prep[^:]*:?\s*(\d+)\s*min/i) || html.match(/preparation[^:]*:?\s*(\d+)\s*min/i);
        const cookTimeMatch = html.match(/cook[^:]*:?\s*(\d+)\s*min/i) || html.match(/bake[^:]*:?\s*(\d+)\s*min/i);
        const servingsMatch = html.match(/serves?\s*(\d+)/i) || html.match(/yield[^:]*:?\s*(\d+)/i);

        recipeData = {
          title: title || 'Imported Recipe',
          description: `Recipe imported from ${new URL(url).hostname}`,
          ingredients: ingredientMatches && ingredientMatches.length > 0 ? 
            ingredientMatches.map((match: string) => {
              const cleanText = match.replace(/<[^>]*>/g, '').trim();
              // Try to parse amount, unit, and item
              const parseMatch = cleanText.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
              if (parseMatch) {
                return {
                  amount: parseMatch[1],
                  unit: parseMatch[2] || '',
                  item: parseMatch[3],
                  notes: ''
                };
              }
              return { unit: '', amount: '', item: cleanText, notes: '' };
            }) : 
            [{ unit: '', amount: '', item: 'See original recipe', notes: '' }],
          instructions: instructionMatches && instructionMatches.length > 0 ? 
            instructionMatches.map((match: string) => match.replace(/<[^>]*>/g, '').trim()).filter(inst => inst.length > 10) : 
            ['See original recipe for instructions'],
          prepTime: prepTimeMatch ? parseInt(prepTimeMatch[1]) : null,
          cookTime: cookTimeMatch ? parseInt(cookTimeMatch[1]) : null,
          servings: servingsMatch ? parseInt(servingsMatch[1]) : null,
          imageUrl,
          cuisine: '',
          mealType: '',
          tags: [],
          nutritionInfo: null,
          sourceUrl: url
        };
      }

      const recipe = await storage.createRecipe({
        ...recipeData,
        userId,
      });

      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error importing recipe from URL:", error);
      res.status(500).json({ message: "Failed to import recipe from URL" });
    }
  });

  app.post('/api/recipes/import-csv', isAuthenticated, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must contain headers and at least one recipe" });
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const recipes = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length !== headers.length) {
          continue; // Skip malformed rows
        }
        
        const recipeData: any = { userId };
        
        headers.forEach((header, index) => {
          const value = values[index];
          
          switch (header) {
            case 'title':
              recipeData.title = value;
              break;
            case 'description':
              recipeData.description = value;
              break;
            case 'ingredients':
              // Parse ingredients as JSON or split by semicolon
              try {
                recipeData.ingredients = JSON.parse(value);
              } catch {
                recipeData.ingredients = value.split(';').map((ing: string) => ({
                  unit: '',
                  amount: '',
                  item: ing.trim(),
                  notes: ''
                }));
              }
              break;
            case 'instructions':
              // Parse instructions as JSON or split by semicolon
              try {
                recipeData.instructions = JSON.parse(value);
              } catch {
                recipeData.instructions = value.split(';').map((inst: string) => inst.trim());
              }
              break;
            case 'cuisine':
              recipeData.cuisine = value;
              break;
            case 'mealtype':
            case 'meal_type':
              recipeData.mealType = value;
              break;
            case 'preptime':
            case 'prep_time':
              recipeData.prepTime = value ? parseInt(value) : null;
              break;
            case 'cooktime':
            case 'cook_time':
              recipeData.cookTime = value ? parseInt(value) : null;
              break;
            case 'servings':
              recipeData.servings = value ? parseInt(value) : null;
              break;
            case 'imageurl':
            case 'image_url':
              recipeData.imageUrl = value;
              break;
          }
        });

        // Set defaults for required fields
        if (!recipeData.title) recipeData.title = `Imported Recipe ${i}`;
        if (!recipeData.ingredients) recipeData.ingredients = [];
        if (!recipeData.instructions) recipeData.instructions = [];
        if (!recipeData.tags) recipeData.tags = [];

        try {
          const recipe = await storage.createRecipe(recipeData);
          recipes.push(recipe);
        } catch (error) {
          console.error(`Error creating recipe ${i}:`, error);
          // Continue with other recipes
        }
      }

      res.status(201).json({ 
        message: `Successfully imported ${recipes.length} recipes`,
        count: recipes.length,
        recipes 
      });
    } catch (error) {
      console.error("Error importing recipes from CSV:", error);
      res.status(500).json({ message: "Failed to import recipes from CSV" });
    }
  });

  // Meal plan routes
  app.get('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const mealPlans = await storage.getMealPlans(userId, startDate, endDate);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.post('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealPlanData = insertMealPlanSchema.parse({
        ...req.body,
        userId,
      });

      const mealPlan = await storage.createMealPlan(mealPlanData);
      res.status(201).json(mealPlan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  });

  app.put('/api/meal-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealPlanId = parseInt(req.params.id);
      
      const mealPlan = await storage.updateMealPlan(mealPlanId, req.body, userId);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      res.json(mealPlan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  app.delete('/api/meal-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealPlanId = parseInt(req.params.id);
      
      const deleted = await storage.deleteMealPlan(mealPlanId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Shopping list routes
  app.get('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shoppingLists = await storage.getShoppingLists(userId);
      res.json(shoppingLists);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.post('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check plan limits before creating shopping list
      const limitCheck = await checkPlanLimits(userId, 'shoppingLists');
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          message: "Shopping list limit reached", 
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: 'free'
        });
      }
      
      const shoppingListData = insertShoppingListSchema.parse({
        ...req.body,
        userId,
      });

      const shoppingList = await storage.createShoppingList(shoppingListData);
      res.status(201).json(shoppingList);
    } catch (error) {
      console.error("Error creating shopping list:", error);
      res.status(500).json({ message: "Failed to create shopping list" });
    }
  });

  app.put('/api/shopping-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shoppingListId = parseInt(req.params.id);
      
      // Clean the request body and ensure proper date formatting
      const { id, userId: reqUserId, createdAt, ...cleanData } = req.body;
      const updateData = {
        ...cleanData,
        updatedAt: new Date(),
      };
      
      const shoppingList = await storage.updateShoppingList(shoppingListId, updateData, userId);
      
      if (!shoppingList) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      res.json(shoppingList);
    } catch (error) {
      console.error("Error updating shopping list:", error);
      res.status(500).json({ message: "Failed to update shopping list" });
    }
  });

  app.delete('/api/shopping-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shoppingListId = parseInt(req.params.id);
      
      const deleted = await storage.deleteShoppingList(shoppingListId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shopping list:", error);
      res.status(500).json({ message: "Failed to delete shopping list" });
    }
  });

  // Route to add individual items to shopping list
  app.post('/api/shopping-lists/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shoppingListId = parseInt(req.params.id);
      const { item, category, quantity } = req.body;
      
      const shoppingList = await storage.getShoppingList(shoppingListId, userId);
      if (!shoppingList) {
        return res.status(404).json({ message: "Shopping list not found" });
      }
      
      // Parse current items - handle both array and object formats
      let currentItems = [];
      if (shoppingList.items) {
        const parsedItems = JSON.parse(shoppingList.items);
        if (Array.isArray(parsedItems)) {
          currentItems = parsedItems;
        } else {
          // Convert object format to array format
          currentItems = Object.entries(parsedItems).flatMap(([cat, items]: [string, any]) => 
            Array.isArray(items) ? items.map((item: any) => ({
              ...item,
              category: cat,
              id: item.id || `${cat}-${item.name}`
            })) : []
          );
        }
      }
      
      // Add the new item
      const newItem = {
        id: Date.now().toString(),
        name: item,
        quantity: quantity || '1',
        unit: 'item',
        category: category || 'other',
        checked: false,
        manuallyAdded: true
      };
      
      currentItems.push(newItem);
      
      const updatedList = await storage.updateShoppingList(shoppingListId, {
        items: JSON.stringify(currentItems)
      }, userId);
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error adding item to shopping list:", error);
      res.status(500).json({ message: "Failed to add item to shopping list" });
    }
  });

  // Helper function to categorize ingredients
  function categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    // Produce
    if (name.includes('lettuce') || name.includes('spinach') || name.includes('tomato') || 
        name.includes('onion') || name.includes('carrot') || name.includes('celery') ||
        name.includes('bell pepper') || name.includes('broccoli') || name.includes('cucumber') ||
        name.includes('avocado') || name.includes('potato') || name.includes('garlic') ||
        name.includes('banana') || name.includes('apple') || name.includes('orange') ||
        name.includes('lemon') || name.includes('lime') || name.includes('cilantro') ||
        name.includes('parsley') || name.includes('basil') || name.includes('mushroom') ||
        name.includes('zucchini') || name.includes('corn') || name.includes('jalapeño')) {
      return 'produce';
    }
    
    // Deli
    if (name.includes('cheese') || name.includes('ham') || name.includes('turkey') ||
        name.includes('salami') || name.includes('prosciutto') || name.includes('deli')) {
      return 'deli';
    }
    
    // Poultry
    if (name.includes('chicken') || name.includes('turkey breast') || name.includes('duck')) {
      return 'poultry';
    }
    
    // Pork
    if (name.includes('pork') || name.includes('bacon') || name.includes('ham') ||
        name.includes('sausage') || name.includes('chorizo')) {
      return 'pork';
    }
    
    // Red Meat
    if (name.includes('beef') || name.includes('steak') || name.includes('ground beef') ||
        name.includes('lamb') || name.includes('veal')) {
      return 'red-meat';
    }
    
    // Seafood
    if (name.includes('fish') || name.includes('salmon') || name.includes('tuna') ||
        name.includes('shrimp') || name.includes('crab') || name.includes('lobster') ||
        name.includes('cod') || name.includes('tilapia') || name.includes('scallop')) {
      return 'seafood';
    }
    
    // Dairy
    if (name.includes('milk') || name.includes('yogurt') || name.includes('butter') ||
        name.includes('cream') || name.includes('sour cream') || name.includes('eggs') ||
        name.includes('egg')) {
      return 'dairy';
    }
    
    // Frozen
    if (name.includes('frozen') || name.includes('ice cream') || name.includes('sorbet')) {
      return 'frozen';
    }
    
    // Beverages
    if (name.includes('juice') || name.includes('soda') || name.includes('water') ||
        name.includes('coffee') || name.includes('tea') || name.includes('wine') ||
        name.includes('beer') || name.includes('milk')) {
      return 'beverages';
    }
    
    // Snacks
    if (name.includes('chips') || name.includes('crackers') || name.includes('nuts') ||
        name.includes('pretzels') || name.includes('popcorn')) {
      return 'snacks';
    }
    
    // Canned Goods
    if (name.includes('canned') || name.includes('beans') || name.includes('sauce') ||
        name.includes('tomato sauce') || name.includes('broth') || name.includes('stock') ||
        name.includes('coconut milk') || name.includes('diced tomatoes')) {
      return 'canned-goods';
    }
    
    // Bread & Bakery
    if (name.includes('bread') || name.includes('bagel') || name.includes('muffin') ||
        name.includes('tortilla') || name.includes('pita') || name.includes('roll') ||
        name.includes('baguette')) {
      return 'bread';
    }
    
    // Ethnic Foods
    if (name.includes('rice') || name.includes('pasta') || name.includes('noodles') ||
        name.includes('quinoa') || name.includes('couscous') || name.includes('soy sauce') ||
        name.includes('sesame oil') || name.includes('curry') || name.includes('garam masala') ||
        name.includes('cumin') || name.includes('paprika') || name.includes('oregano') ||
        name.includes('thyme') || name.includes('rosemary') || name.includes('spices') ||
        name.includes('vinegar') || name.includes('olive oil')) {
      return 'ethnic-foods';
    }
    
    // Household Goods
    if (name.includes('paper towel') || name.includes('toilet paper') || name.includes('napkins') ||
        name.includes('foil') || name.includes('plastic wrap') || name.includes('bags')) {
      return 'household-goods';
    }
    
    // Cleaning Supplies
    if (name.includes('detergent') || name.includes('soap') || name.includes('cleaner') ||
        name.includes('bleach') || name.includes('sponge')) {
      return 'cleaning-supplies';
    }
    
    // Pet Supplies
    if (name.includes('dog') || name.includes('cat') || name.includes('pet') ||
        name.includes('kibble') || name.includes('treats')) {
      return 'pets';
    }
    
    // Default to produce for most food items
    return 'produce';
  }

  // Generate shopping list from meal plans
  app.post('/api/shopping-lists/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, name } = req.body;
      
      // Get meal plans for the date range
      const mealPlans = await storage.getMealPlans(userId, startDate, endDate);
      
      const items: Array<{
        id: string;
        name: string;
        quantity: string;
        unit: string;
        category: string;
        recipeId?: number;
        recipeTitle?: string;
        checked: boolean;
        manuallyAdded: boolean;
      }> = [];

      const mealPlanIds: number[] = [];

      // Aggregate ingredients from recipes
      for (const mealPlan of mealPlans) {
        if (mealPlan.recipeId) {
          const recipe = await storage.getRecipe(mealPlan.recipeId, userId);
          if (recipe) {
            mealPlanIds.push(mealPlan.id);
            
            recipe.ingredients.forEach((ingredient, index) => {
              const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.item;
              const quantity = typeof ingredient === 'object' && ingredient.amount ? ingredient.amount : "1";
              const unit = typeof ingredient === 'object' && ingredient.unit ? ingredient.unit : "item";
              
              items.push({
                id: `${mealPlan.id}-${index}`,
                name: ingredientName,
                quantity,
                unit,
                category: categorizeIngredient(ingredientName),
                recipeId: recipe.id,
                recipeTitle: recipe.title,
                checked: false,
                manuallyAdded: false,
              });
            });
          }
        }
      }

      const shoppingListData = {
        userId,
        name: name || `Shopping List ${new Date().toLocaleDateString()}`,
        startDate,
        endDate,
        items,
        mealPlanIds,
      };

      const shoppingList = await storage.createShoppingList(shoppingListData);
      res.status(201).json(shoppingList);
    } catch (error) {
      console.error("Error generating shopping list:", error);
      res.status(500).json({ message: "Failed to generate shopping list" });
    }
  });

  // User preferences routes
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferencesData = insertUserPreferencesSchema.parse({
        ...req.body,
        userId,
      });

      const preferences = await storage.upsertUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // User inventory routes
  app.get('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Convert empty strings to undefined for numeric fields
      const cleanedBody = {
        ...req.body,
        pricePerUnit: req.body.pricePerUnit && req.body.pricePerUnit !== '' ? req.body.pricePerUnit : undefined,
        totalCost: req.body.totalCost && req.body.totalCost !== '' ? req.body.totalCost : undefined,
        upcBarcode: req.body.upcBarcode && req.body.upcBarcode !== '' ? req.body.upcBarcode : undefined,
        expiryDate: req.body.expiryDate && req.body.expiryDate !== '' ? req.body.expiryDate : undefined,
      };
      
      const inventoryData = insertUserInventorySchema.parse({
        ...cleanedBody,
        userId,
        purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date()
      });

      const item = await storage.addInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding inventory item:", error);
      res.status(500).json({ message: "Failed to add inventory item" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);
      const item = await storage.updateInventoryItem(itemId, req.body, userId);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);
      const success = await storage.deleteInventoryItem(itemId, userId);
      if (!success) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json({ message: "Inventory item deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Enhanced inventory features
  app.post('/api/inventory/:id/waste', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);
      await storage.markItemAsWasted(itemId, userId);
      res.json({ message: "Item marked as wasted" });
    } catch (error) {
      console.error("Error marking item as wasted:", error);
      res.status(500).json({ message: "Failed to mark item as wasted" });
    }
  });

  app.patch('/api/inventory/:id/used', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);
      await storage.markItemAsUsed(itemId, userId);
      res.json({ message: "Item marked as used" });
    } catch (error) {
      console.error("Error marking item as used:", error);
      res.status(500).json({ message: "Failed to mark item as used" });
    }
  });

  app.get('/api/inventory/barcode/:barcode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const barcode = req.params.barcode;
      const item = await storage.getInventoryByBarcode(userId, barcode);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error finding item by barcode:", error);
      res.status(500).json({ message: "Failed to find item by barcode" });
    }
  });

  // Receipt OCR processing route
  app.post('/api/receipts/process-image', isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image uploaded" });
      }

      const userId = req.user.claims.sub;
      const imagePath = req.file.path;

      // Process the receipt image with OCR
      const receiptData = await processReceiptImage(imagePath);
      
      // Clean up the uploaded file
      await deleteReceiptImage(imagePath);

      res.json(receiptData);
    } catch (error) {
      console.error("Error processing receipt image:", error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        await deleteReceiptImage(req.file.path);
      }
      
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to process receipt image" });
    }
  });

  // Receipt saving routes
  app.post('/api/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const receipt = await storage.addPurchaseReceipt({
        ...req.body,
        userId,
        purchaseDate: new Date(req.body.purchaseDate)
      });
      
      // Also add items to inventory
      const inventoryPromises = req.body.items.map((item: any) => 
        storage.addInventoryItem({
          userId,
          ingredientName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category || 'uncategorized',
          totalCost: item.price.toString(),
          pricePerUnit: (item.price / parseFloat(item.quantity || '1')).toString(),
          purchaseDate: new Date(req.body.purchaseDate)
        })
      );
      
      await Promise.all(inventoryPromises);
      
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Error adding receipt:", error);
      res.status(500).json({ message: "Failed to add receipt" });
    }
  });

  app.get('/api/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const receipts = await storage.getPurchaseReceipts(userId);
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // Food cost reporting
  app.get('/api/reports/spending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const report = await storage.getSpendingReport(userId, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating spending report:", error);
      res.status(500).json({ message: "Failed to generate spending report" });
    }
  });

  // Enhanced AI recommendations route
  app.post('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { preferences, inventory } = req.body;
      
      // Get user's existing recipes to analyze against inventory
      const existingRecipes = await storage.getRecipes(userId);
      
      const recommendations = await getAIRecipeRecommendations({
        preferences,
        inventory,
        existingRecipes
      });
      
      console.log("Backend sending recommendations:", recommendations);
      console.log("Recommendations count:", recommendations?.length || 0);
      
      res.json({ recommendations });
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      res.status(500).json({ message: "Failed to get AI recommendations: " + (error as Error).message });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin privileges (you might want to add role checking)
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Enhanced admin user management
  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updateData,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // In a real implementation, you'd want to soft delete or archive user data
      // For now, we'll just return success without actually deleting
      res.json({ message: "User would be archived in production" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin analytics endpoints
  app.get('/api/admin/analytics/usage', isAuthenticated, async (req: any, res) => {
    try {
      // Mock data for demonstration - in production this would come from analytics
      const usageData = {
        dailyActiveUsers: [
          { date: '2024-01-01', users: 1200 },
          { date: '2024-01-02', users: 1350 },
          { date: '2024-01-03', users: 1180 },
          { date: '2024-01-04', users: 1420 },
          { date: '2024-01-05', users: 1380 },
        ],
        featureUsage: {
          recipes: 85,
          mealPlanning: 72,
          shoppingLists: 68,
          aiRecommendations: 45,
        },
        topRecipes: [
          { name: 'Chocolate Chip Cookies', saves: 2847 },
          { name: 'Creamy Basil Pasta', saves: 2192 },
          { name: 'Mediterranean Salad', saves: 1936 },
        ]
      };
      
      res.json(usageData);
    } catch (error) {
      console.error("Error fetching usage analytics:", error);
      res.status(500).json({ message: "Failed to fetch usage analytics" });
    }
  });

  // Recipe rating routes
  app.get('/api/recipes/:id/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = parseInt(req.params.id);
      
      const rating = await storage.getRating(recipeId, userId);
      res.json(rating || null);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  app.post('/api/recipes/:id/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = parseInt(req.params.id);
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 10) {
        return res.status(400).json({ message: "Rating must be between 1 and 10" });
      }

      // Verify recipe exists and belongs to user
      const recipe = await storage.getRecipe(recipeId, userId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const newRating = await storage.createOrUpdateRating({
        recipeId,
        userId,
        rating
      });

      res.json(newRating);
    } catch (error) {
      console.error("Error rating recipe:", error);
      res.status(500).json({ message: "Failed to rate recipe" });
    }
  });

  // AI Learning tracking routes
  app.post('/api/ai/learning', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const learningData = {
        ...req.body,
        userId,
      };
      
      const learning = await storage.createAiLearning(learningData);
      res.status(201).json(learning);
    } catch (error) {
      console.error("Error creating AI learning entry:", error);
      res.status(500).json({ message: "Failed to track AI learning" });
    }
  });

  app.get('/api/ai/learning/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await storage.getAiLearningHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching AI learning history:", error);
      res.status(500).json({ message: "Failed to fetch learning history" });
    }
  });

  // Daily meal suggestions
  app.get('/api/ai/meal-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const date = req.query.date as string;
      
      const suggestions = await storage.getMealSuggestions(userId, date);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching meal suggestions:", error);
      res.status(500).json({ message: "Failed to fetch meal suggestions" });
    }
  });

  app.post('/api/ai/meal-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const suggestionsData = {
        ...req.body,
        userId,
      };
      
      const suggestions = await storage.createMealSuggestions(suggestionsData);
      res.status(201).json(suggestions);
    } catch (error) {
      console.error("Error creating meal suggestions:", error);
      res.status(500).json({ message: "Failed to create meal suggestions" });
    }
  });

  app.put('/api/ai/meal-suggestions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const suggestionId = parseInt(req.params.id);
      
      const suggestions = await storage.updateMealSuggestions(suggestionId, req.body, userId);
      
      if (!suggestions) {
        return res.status(404).json({ message: "Meal suggestions not found" });
      }
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error updating meal suggestions:", error);
      res.status(500).json({ message: "Failed to update meal suggestions" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, plan, userInfo } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          plan: plan || '',
          userEmail: userInfo?.email || '',
          userName: `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Signup route for free accounts
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { firstName, lastName, email, password, plan } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Create user account for free plan
      if (plan === 'free') {
        const newUser = await storage.createUser({
          email,
          firstName,
          lastName,
          password, // Will be hashed in storage layer
          plan: 'free'
        });
        res.json({ success: true, user: newUser });
      } else {
        res.status(400).json({ message: "Paid plans require payment processing" });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Error creating account: " + error.message });
    }
  });

  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password using bcrypt
      if (!user.password) {
        return res.status(401).json({ message: "This account was created with social login. Please use the appropriate login method." });
      }
      
      const isValidPassword = await storage.verifyPassword(user.id, password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session (simplified for now)
      req.session.userId = user.id;
      req.session.user = user;

      res.json({ success: true, user: user });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error logging in: " + error.message });
    }
  });

  // Stripe subscription route
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: 'User email not found' });
      }

      // Check if user already has a Stripe customer
      if (user.stripeCustomerId) {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId as string);
        if (customer.deleted) {
          // Customer was deleted, create a new one
        } else {
          // Use existing customer
        }
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || 'Chef',
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Chef Mike\'s Family Plan',
              description: 'Full access to all features including unlimited recipes, AI recommendations, and family sharing.',
            },
            unit_amount: 1500, // $15.00
            recurring: {
              interval: 'month',
            },
          },
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error('Stripe subscription error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
