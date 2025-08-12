import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupAuth0, requiresAuth0 } from "./auth0Setup";
import { sendEmail, generateVerificationEmailHtml, generateWelcomeEmailHtml } from "./email";
import crypto from "crypto";
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
  
  // Setup Auth0 (optional third authentication method)
  if (process.env.AUTH0_SECRET && process.env.AUTH0_ISSUER_BASE_URL) {
    try {
      console.log('Setting up Auth0 with issuer:', process.env.AUTH0_ISSUER_BASE_URL);
      setupAuth0(app);
      console.log('Auth0 setup completed successfully');
    } catch (error) {
      console.error('Auth0 setup failed:', error);
      console.log('Continuing without Auth0 integration');
    }
  }

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or session
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "No user ID found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const { firstName, lastName, email, currentPassword, newPassword } = req.body;
      
      // Update basic profile info
      const updateData: any = { firstName, lastName, email };
      
      // Handle password change if requested
      if (newPassword && currentPassword) {
        const isValidPassword = await storage.verifyPassword(userId, currentPassword);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        updateData.password = newPassword; // Will be hashed in storage layer
      }

      await storage.updateUser(userId, updateData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update dietary preferences
  app.patch('/api/auth/dietary-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.userId;
      const { 
        dietaryRestrictions, 
        allergies, 
        cuisinePreferences, 
        dislikedIngredients, 
        cookingExperience, 
        cookingGoals 
      } = req.body;

      await storage.updateUser(userId, {
        dietaryRestrictions,
        allergies,
        cuisinePreferences,
        dislikedIngredients,
        cookingExperience,
        cookingGoals
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating dietary preferences:", error);
      res.status(500).json({ message: "Failed to update dietary preferences" });
    }
  });

  // Email verification routes
  app.post('/api/auth/send-verification', async (req, res) => {
    try {
      const { email, firstName } = req.body;
      
      if (!email || !firstName) {
        return res.status(400).json({ message: "Email and first name are required" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (existingUser.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await storage.setEmailVerificationToken(existingUser.id, verificationToken);

      // Send verification email
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
      const emailHtml = generateVerificationEmailHtml(firstName, verificationUrl);

      const emailSent = await sendEmail({
        from: '"Chef Mike\'s Culinary Classroom" <noreply@chefmike.app>',
        to: email,
        subject: 'Verify Your Email - Chef Mike\'s Culinary Classroom',
        html: emailHtml,
      });

      if (emailSent) {
        res.json({ success: true, message: "Verification email sent" });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Verify the email
      const user = await storage.verifyEmail(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Send welcome email
      const loginUrl = `${req.protocol}://${req.get('host')}/login`;
      const welcomeEmailHtml = generateWelcomeEmailHtml(user.firstName || 'there', loginUrl);

      await sendEmail({
        from: '"Chef Mike\'s Culinary Classroom" <noreply@chefmike.app>',
        to: user.email!,
        subject: 'Welcome to Chef Mike\'s Culinary Classroom!',
        html: welcomeEmailHtml,
      });

      // Redirect to success page or login
      res.redirect('/login?verified=true');
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Plan usage endpoint
  app.get('/api/plan/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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

  app.post('/api/recipes', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }]), async (req: any, res) => {
    try {
      console.log("Recipe creation request received");
      console.log("Request body:", req.body);
      console.log("Request files:", req.files);
      
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      console.log("User ID:", userId);
      
      // Check plan limits before creating recipe
      const limitCheck = await checkPlanLimits(userId, 'recipes');
      if (!limitCheck.allowed) {
        console.log("Recipe limit reached for user:", userId);
        return res.status(403).json({ 
          message: "Recipe limit reached", 
          current: limitCheck.current,
          limit: limitCheck.limit,
          plan: 'free'
        });
      }
      
      console.log("Parsing recipe data...");
      const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
      const recipeData = insertRecipeSchema.parse({
        ...req.body,
        userId,
        // Convert string numbers to actual numbers
        prepTime: req.body.prepTime ? parseInt(req.body.prepTime) : null,
        cookTime: req.body.cookTime ? parseInt(req.body.cookTime) : null,
        servings: req.body.servings ? parseInt(req.body.servings) : null,
        // Parse JSON fields
        ingredients: JSON.parse(req.body.ingredients || '[]'),
        instructions: JSON.parse(req.body.instructions || '[]'),
        tags: JSON.parse(req.body.tags || '[]'),
        nutritionInfo: req.body.nutritionInfo ? JSON.parse(req.body.nutritionInfo) : null,
        imageUrl: imageFile ? `/uploads/${imageFile.filename}` : (req.body.imageUrl || null),
      });

      console.log("Parsed recipe data:", recipeData);
      const recipe = await storage.createRecipe(recipeData);
      console.log("Recipe created successfully:", recipe.id);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create recipe", error: error.message });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const recipeId = parseInt(req.params.id);
      
      console.log("Recipe update request received for ID:", recipeId);
      console.log("Request body:", req.body);
      console.log("Request files:", req.files);
      
      const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
      const updateData: any = {
        ...req.body,
        // Convert string numbers to actual numbers
        prepTime: req.body.prepTime ? parseInt(req.body.prepTime) : null,
        cookTime: req.body.cookTime ? parseInt(req.body.cookTime) : null,
        servings: req.body.servings ? parseInt(req.body.servings) : null,
        // Parse JSON fields
        ingredients: JSON.parse(req.body.ingredients || '[]'),
        instructions: JSON.parse(req.body.instructions || '[]'),
        tags: JSON.parse(req.body.tags || '[]'),
        nutritionInfo: req.body.nutritionInfo ? JSON.parse(req.body.nutritionInfo) : null,
      };
      
      // Handle image update
      if (imageFile) {
        updateData.imageUrl = `/uploads/${imageFile.filename}`;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }

      console.log("Parsed update data:", updateData);
      const recipe = await storage.updateRecipe(recipeId, updateData, userId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      console.log("Recipe updated successfully:", recipe.id);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update recipe", error: error.message });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
        
        // Enhanced ingredient extraction patterns for multiple sites
        const extractIngredients = (html: string, siteUrl: string) => {
          const domain = new URL(siteUrl).hostname.toLowerCase();
          
          const siteSpecificSelectors = [
            // AllRecipes
            /<li[^>]*class="mntl-structured-ingredients__list-item[^"]*"[^>]*><p[^>]*>(.*?)<\/p><\/li>/gi,
            /<span[^>]*class="recipe-summary__item[^"]*"[^>]*>([^<]+)<\/span>/gi,
            
            // Food Network  
            /<li[^>]*class="o-RecipeIngredient__a-Ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<p[^>]*class="o-RecipeIngredient__a-Ingredient[^"]*"[^>]*>([^<]+)<\/p>/gi,
            
            // Delish, Country Living, Good Housekeeping
            /<li[^>]*class="ingredient[^"]*"[^>]*data-ingredient[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="recipe-ingredient[^"]*"[^>]*>([^<]*?)<\/li>/gi,
            /<div[^>]*class="ingredient-list[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<li[^>]*data-module="recipe-ingredients"[^>]*>([^<]+)<\/li>/gi,
            
            // Bon Appetit, Epicurious
            /<li[^>]*class="BaseIngredient-[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="recipe__ingredient[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Tasty, BuzzFeed  
            /<li[^>]*class="xs-mb1[^"]*ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="recipe-summary-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // BBC Good Food
            /<li[^>]*class="recipe-ingredients__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="ingredients-section__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // Simply Recipes, Serious Eats
            /<li[^>]*class="structured-ingredients__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="recipe-ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // NYTimes Cooking
            /<li[^>]*class="recipe-ingredient[^"]*"[^>]*><span[^>]*>([^<]+)<\/span><\/li>/gi,
            /<li[^>]*data-ingredient[^>]*>([^<]+)<\/li>/gi,
            
            // Martha Stewart, Real Simple
            /<li[^>]*class="recipe-ingredients-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="ingredients-item-name[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // King Arthur Baking
            /<div[^>]*class="recipe-ingredient[^"]*"[^>]*>([^<]+)<\/div>/gi,
            /<li[^>]*class="recipe-ingredients-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
          ];
          
          const genericSelectors = [
            // Generic patterns (fallback)
            /<li[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/div>/gi,
            /<p[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/p>/gi,
            /<li[^>]*data-ingredient[^>]*>([^<]+)<\/li>/gi,
            /<span[^>]*class[^>]*ingredient[^>]*>([^<]+)<\/span>/gi,
            
            // Common patterns
            /<li[^>]*class="[^"]*ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="[^"]*ingredient[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // WordPress recipe plugins
            /<li[^>]*class="wp-recipe-ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="recipe-card-ingredient[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Fallback: look for lists that might be ingredients
            /<li[^>]*>([^<]*(?:cup|tbsp|tsp|pound|oz|gram|ml|liter|clove|dash|pinch)[^<]*)<\/li>/gi,
          ];
          
          const allSelectors = [...siteSpecificSelectors, ...genericSelectors];
          
          for (const selector of allSelectors) {
            const matches = Array.from(html.matchAll(selector));
            if (matches.length > 0) {
              const ingredients = matches.map(match => {
                // Clean up the ingredient text
                let ingredient = match[1].trim();
                ingredient = ingredient.replace(/<[^>]*>/g, ''); // Remove HTML tags
                ingredient = ingredient.replace(/&nbsp;/g, ' '); // Replace nbsp
                ingredient = ingredient.replace(/&amp;/g, '&'); // Replace encoded ampersand
                return ingredient;
              }).filter((ing: string) => ing.length > 2 && !ing.toLowerCase().includes('advertisement'));
              
              if (ingredients.length > 0) {
                console.log(`Found ${ingredients.length} ingredients from ${domain} using pattern`);
                return ingredients;
              }
            }
          }
          
          console.log(`No ingredients found for ${domain}`);
          return [];
        };
        
        const extractedIngredients = extractIngredients(html, url);

        // Enhanced instruction extraction patterns for multiple sites  
        const extractInstructions = (html: string, siteUrl: string) => {
          const domain = new URL(siteUrl).hostname.toLowerCase();
          
          const siteSpecificSelectors = [
            // AllRecipes
            /<li[^>]*class="mntl-sc-block-group--LI[^"]*"[^>]*><div[^>]*class="mntl-sc-block[^"]*"[^>]*><p[^>]*>(.*?)<\/p><\/div><\/li>/gi,
            /<p[^>]*class="comp[^"]*mntl-sc-block[^"]*"[^>]*>([^<]+)<\/p>/gi,
            
            // Food Network
            /<li[^>]*class="o-Method__m-Step[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="o-Method__a-Description[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Delish, Country Living, Good Housekeeping
            /<li[^>]*class="direction[^"]*"[^>]*data-direction[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="direction-list[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<li[^>]*class="recipe-instruction[^"]*"[^>]*>([^<]*?)<\/li>/gi,
            /<li[^>]*data-module="recipe-instructions"[^>]*>([^<]+)<\/li>/gi,
            
            // Bon Appetit, Epicurious
            /<li[^>]*class="BaseWrap-[^"]*"[^>]*><div[^>]*>([^<]+)<\/div><\/li>/gi,
            /<div[^>]*class="recipe__instruction[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Tasty, BuzzFeed
            /<li[^>]*class="xs-mb1[^"]*instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="recipe-instructions-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // BBC Good Food
            /<li[^>]*class="recipe-method__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="method-section__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // Simply Recipes, Serious Eats
            /<li[^>]*class="structured-instructions__list-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="recipe-instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // NYTimes Cooking
            /<li[^>]*class="recipe-instruction[^"]*"[^>]*><span[^>]*>([^<]+)<\/span><\/li>/gi,
            /<li[^>]*data-step[^>]*>([^<]+)<\/li>/gi,
            
            // Martha Stewart, Real Simple
            /<li[^>]*class="recipe-instructions-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="instructions-item-text[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // King Arthur Baking
            /<div[^>]*class="recipe-instruction[^"]*"[^>]*>([^<]+)<\/div>/gi,
            /<li[^>]*class="recipe-instructions-item[^"]*"[^>]*>([^<]+)<\/li>/gi,
          ];
          
          const genericSelectors = [
            // Generic patterns (fallback)
            /<li[^>]*class[^>]*instruction[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class[^>]*instruction[^>]*>([^<]+)<\/div>/gi,
            /<p[^>]*class[^>]*instruction[^>]*>([^<]+)<\/p>/gi,
            /<li[^>]*class="recipe-instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="instruction[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Common patterns
            /<li[^>]*class="[^"]*instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="[^"]*direction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="[^"]*method[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<li[^>]*class="[^"]*step[^"]*"[^>]*>([^<]+)<\/li>/gi,
            
            // WordPress recipe plugins
            /<li[^>]*class="wp-recipe-instruction[^"]*"[^>]*>([^<]+)<\/li>/gi,
            /<div[^>]*class="recipe-card-instruction[^"]*"[^>]*>([^<]+)<\/div>/gi,
            
            // Container-based extraction (extract from ol/div containers)
            /<ol[^>]*class[^>]*(?:instruction|direction|method)[^>]*>([\s\S]*?)<\/ol>/gi,
            /<div[^>]*class="directions[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
            
            // Numbered lists that might be instructions
            /<li[^>]*>\s*\d+\.?\s+([^<]+)<\/li>/gi,
          ];
          
          const allSelectors = [...siteSpecificSelectors, ...genericSelectors];
          
          for (const selector of allSelectors) {
            const matches = Array.from(html.matchAll(selector));
            if (matches.length > 0) {
              let instructions = [];
              
              // Handle container-based selectors (ol, div)
              if (selector.source.includes('ol>') || selector.source.includes('div>')) {
                for (const match of matches) {
                  const containerContent = match[1];
                  const liMatches = Array.from(containerContent.matchAll(/<li[^>]*>([^<]+)<\/li>/gi));
                  if (liMatches.length > 0) {
                    instructions = liMatches.map(li => li[1].trim());
                    break;
                  }
                }
              } else {
                instructions = matches.map(match => {
                  let instruction = match[1].trim();
                  instruction = instruction.replace(/<[^>]*>/g, ''); // Remove HTML tags
                  instruction = instruction.replace(/&nbsp;/g, ' '); // Replace nbsp
                  instruction = instruction.replace(/&amp;/g, '&'); // Replace encoded ampersand
                  instruction = instruction.replace(/^\d+\.?\s*/, ''); // Remove leading numbers
                  return instruction;
                }).filter((inst: string) => inst.length > 10 && !inst.toLowerCase().includes('advertisement'));
              }
              
              if (instructions.length > 0) {
                console.log(`Found ${instructions.length} instructions from ${domain} using pattern`);
                return instructions;
              }
            }
          }
          
          console.log(`No instructions found for ${domain}`);
          return [];
        };
        
        const extractedInstructions = extractInstructions(html, url);

        // Enhanced image extraction
        // Enhanced image extraction for multiple recipe sites
        const extractImage = (html: string, siteUrl: string) => {
          const domain = new URL(siteUrl).hostname.toLowerCase();
          
          // Site-specific selectors (most reliable first)
          const siteSpecificSelectors = [
            // AllRecipes
            /<img[^>]*class="recipe-summary__image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="primary-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Food Network
            /<img[^>]*class="m-MediaBlock__a-Image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="recipe-lead-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Bon Appetit, Epicurious  
            /<img[^>]*class="recipe__header-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<picture[^>]*class="recipe-header-image[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // Tasty, BuzzFeed
            /<img[^>]*class="recipe-thumbnail[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="feed-item[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // BBC Good Food
            /<img[^>]*class="recipe-media__image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<div[^>]*class="recipe-header__media[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // Simply Recipes, Serious Eats
            /<img[^>]*class="wp-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="recipe-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // King Arthur Baking
            /<img[^>]*class="recipe-detail-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<div[^>]*class="recipe-hero[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // Delish, Country Living
            /<img[^>]*class="content-lede-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*data-src=["']([^"']+)["'][^>]*class="[^"]*recipe[^"]*"/gi,
            
            // Taste of Home, Better Homes & Gardens
            /<img[^>]*class="recipe-photo[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="featured-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<div[^>]*class="recipe-image-container[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // Martha Stewart, Real Simple
            /<img[^>]*class="hero-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="lead-photo[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<picture[^>]*class="hero[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // Food52, Kitchn  
            /<img[^>]*class="recipe__photo[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="post-lead-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<div[^>]*class="recipe-intro__photo[^"]*"[^>]*><img[^>]*src=["']([^"']+)["']/gi,
            
            // NYTimes Cooking
            /<img[^>]*class="recipe-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="media-viewer__media[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Pinterest, Yummly
            /<img[^>]*class="recipe-card-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="recipe-summary-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Bloggers and WordPress themes
            /<img[^>]*class="recipe-card__image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="entry-featured-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="post-thumbnail[^"]*"[^>]*src=["']([^"']+)["']/gi,
          ];
          
          // Generic selectors (fallback)
          const genericSelectors = [
            // Open Graph image (most universal)
            /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
            /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi,
            
            // Twitter card image
            /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi,
            
            // Lazy loading images (data-src, data-original, etc.)
            /<img[^>]*data-src=["']([^"']+)["'][^>]*class="[^"]*recipe[^"]*"/gi,
            /<img[^>]*data-original=["']([^"']+)["'][^>]*>/gi,
            /<img[^>]*data-lazy-src=["']([^"']+)["'][^>]*>/gi,
            /<img[^>]*data-image-src=["']([^"']+)["'][^>]*>/gi,
            /<img[^>]*data-full-src=["']([^"']+)["'][^>]*>/gi,
            /<img[^>]*data-srcset=["']([^"',\s]+)[^"']*["'][^>]*>/gi,
            
            // JSON-LD structured data
            /"image"\s*:\s*"([^"]+)"/gi,
            /"image"\s*:\s*\[\s*"([^"]+)"/gi,
            
            // Recipe-specific patterns
            /<img[^>]*class="[^"]*recipe[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*alt="[^"]*recipe[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*src=["']([^"']*recipe[^"']*)[^>]*>/gi,
            /<img[^>]*src=["']([^"']*food[^"']*)[^>]*>/gi,
            
            // High-resolution images (likely main images)
            /<img[^>]*src=["']([^"']*\d{3,4}x\d{3,4}[^"']*)[^>]*>/gi,
            /<img[^>]*src=["']([^"']*-\d{3,4}x\d{3,4}[^"']*)[^>]*>/gi,
            
            // WordPress media
            /<img[^>]*class="wp-post-image[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="attachment[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Hero/featured images
            /<img[^>]*class="[^"]*hero[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="[^"]*featured[^"]*"[^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*class="[^"]*main[^"]*"[^>]*src=["']([^"']+)["']/gi,
            
            // Large images (likely content images)
            /<img[^>]*width=["']\d{3,}["'][^>]*src=["']([^"']+)["']/gi,
            /<img[^>]*height=["']\d{3,}["'][^>]*src=["']([^"']+)["']/gi,
            
            // Fallback: any image that might be reasonable
            /<img[^>]*src=["']([^"']*[./](jpg|jpeg|png|webp)[^"']*?)["'][^>]*(?:width=["']\d{2,}|height=["']\d{2,}|class="[^"]*(?:image|photo|pic)[^"]*")/gi,
            /<img[^>]*(?:width=["']\d{2,}|height=["']\d{2,}|class="[^"]*(?:image|photo|pic)[^"]*")[^>]*src=["']([^"']*[./](jpg|jpeg|png|webp)[^"']*?)["']/gi,
          ];
          
          // Try site-specific selectors first
          const allSelectors = [...siteSpecificSelectors, ...genericSelectors];
          
          for (const selector of allSelectors) {
            const matches = Array.from(html.matchAll(selector));
            for (const match of matches) {
              let imageUrl = match[1];
              if (imageUrl) {
                // Clean up the URL
                imageUrl = imageUrl.trim();
                
                // Skip tiny images, icons, and social media images
                if (imageUrl.includes('icon') || 
                    imageUrl.includes('logo') || 
                    imageUrl.includes('favicon') ||
                    imageUrl.includes('avatar') ||
                    imageUrl.includes('profile') ||
                    imageUrl.match(/\d+x\d+/) && imageUrl.match(/(\d+)x(\d+)/) && 
                    (parseInt(imageUrl.match(/(\d+)x(\d+)/)?.[1] || '0') < 200 ||
                     parseInt(imageUrl.match(/(\d+)x(\d+)/)?.[2] || '0') < 200)) {
                  continue;
                }
                
                // Make sure it's a full URL
                if (imageUrl.startsWith('//')) {
                  imageUrl = 'https:' + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = new URL(siteUrl).origin + imageUrl;
                } else if (!imageUrl.startsWith('http')) {
                  imageUrl = new URL(siteUrl).origin + '/' + imageUrl;
                }
                
                // Validate it's a reasonable image URL (with more formats and validation)
                if (imageUrl.match(/\.(jpg|jpeg|png|webp|avif|svg)(\?|$)/i) || 
                    imageUrl.includes('image') || 
                    imageUrl.includes('photo') ||
                    imageUrl.includes('recipe')) {
                  
                  // Additional validation: ensure it's not a placeholder or broken image
                  if (!imageUrl.includes('placeholder') && 
                      !imageUrl.includes('default') &&
                      !imageUrl.includes('no-image') &&
                      !imageUrl.includes('missing') &&
                      imageUrl.length > 20) {
                    console.log(`Found recipe image from ${domain}: ${imageUrl}`);
                    return imageUrl;
                  }
                }
              }
            }
          }
          
          console.log(`No recipe image found for ${domain}`);
          return '';
        };

        const imageUrl = extractImage(html, url);

        // Try to extract time information
        const prepTimeMatch = html.match(/prep[^:]*:?\s*(\d+)\s*min/i) || html.match(/preparation[^:]*:?\s*(\d+)\s*min/i);
        const cookTimeMatch = html.match(/cook[^:]*:?\s*(\d+)\s*min/i) || html.match(/bake[^:]*:?\s*(\d+)\s*min/i);
        const servingsMatch = html.match(/serves?\s*(\d+)/i) || html.match(/yield[^:]*:?\s*(\d+)/i);

        recipeData = {
          title: title || 'Imported Recipe',
          description: `Recipe imported from ${new URL(url).hostname}`,
          ingredients: extractedIngredients && extractedIngredients.length > 0 ? 
            extractedIngredients.map((ingredient: string) => {
              // Try to parse amount, unit, and item
              const parseMatch = ingredient.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
              if (parseMatch) {
                return {
                  amount: parseMatch[1],
                  unit: parseMatch[2] || '',
                  item: parseMatch[3],
                  notes: ''
                };
              }
              return { unit: '', amount: '', item: ingredient, notes: '' };
            }) : 
            [{ unit: '', amount: '', item: 'See original recipe', notes: '' }],
          instructions: extractedInstructions && extractedInstructions.length > 0 ? 
            extractedInstructions : 
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const shoppingLists = await storage.getShoppingLists(userId);
      res.json(shoppingLists);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.post('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const autoCategory = categorizeIngredient(item);
      const newItem = {
        id: Date.now().toString(),
        name: item,
        quantity: quantity || '1',
        unit: 'item',
        category: category || (autoCategory !== 'skip' ? autoCategory : 'other'),
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
    
    // Skip plain water unless it's specifically bottled/gallon water
    if (name === 'water' || (name.includes('water') && !name.includes('bottled') && !name.includes('gallon') && !name.includes('sparkling') && !name.includes('coconut'))) {
      return 'skip'; // Special category to exclude from shopping lists
    }
    
    // Dry Goods - Non-perishable pantry staples (including oils, spices, grains, legumes)
    if (name.includes('flour') || name.includes('sugar') || name.includes('salt') || name.includes('pepper') ||
        name.includes('rice') || name.includes('pasta') || name.includes('orzo') || name.includes('quinoa') ||
        name.includes('barley') || name.includes('oats') || name.includes('lentil') || name.includes('chickpea') ||
        name.includes('black bean') || name.includes('kidney bean') || name.includes('pinto bean') ||
        name.includes('navy bean') || name.includes('split pea') || name.includes('couscous') ||
        name.includes('bulgur') || name.includes('farro') || name.includes('millet') || name.includes('amaranth') ||
        name.includes('buckwheat') || name.includes('cornmeal') || name.includes('corn starch') ||
        name.includes('cornstarch') || name.includes('breadcrumb') || name.includes('panko') ||
        name.includes('baking powder') || name.includes('baking soda') || name.includes('vanilla extract') ||
        name.includes('almond extract') || name.includes('coconut extract') || name.includes('vinegar') ||
        name.includes('olive oil') || name.includes('vegetable oil') || name.includes('canola oil') ||
        name.includes('sesame oil') || name.includes('coconut oil') || name.includes('honey') ||
        name.includes('maple syrup') || name.includes('molasses') || name.includes('brown sugar') ||
        name.includes('powdered sugar') || name.includes('cocoa powder') || name.includes('chocolate chip') ||
        name.includes('raisin') || name.includes('date') || name.includes('fig') || name.includes('apricot') ||
        name.includes('cranberry') || name.includes('almond') || name.includes('walnut') ||
        name.includes('pecan') || name.includes('cashew') || name.includes('pistachio') ||
        name.includes('peanut') || name.includes('sunflower seed') || name.includes('pumpkin seed') ||
        name.includes('chia seed') || name.includes('flax seed') || name.includes('sesame seed') ||
        name.includes('cumin') || name.includes('paprika') || name.includes('oregano') ||
        name.includes('thyme') || name.includes('rosemary') || name.includes('sage') ||
        name.includes('turmeric') || name.includes('cinnamon') || name.includes('nutmeg') ||
        name.includes('chili powder') || name.includes('cayenne') || name.includes('garlic powder') ||
        name.includes('onion powder') || name.includes('italian seasoning') || name.includes('bay leaf')) {
      return 'dry-goods';
    }
    
    // Produce
    if (name.includes('lettuce') || name.includes('spinach') || name.includes('tomato') || 
        name.includes('onion') || name.includes('carrot') || name.includes('celery') ||
        name.includes('bell pepper') || name.includes('broccoli') || name.includes('cucumber') ||
        name.includes('avocado') || name.includes('potato') || name.includes('garlic') ||
        name.includes('banana') || name.includes('apple') || name.includes('orange') ||
        name.includes('lemon') || name.includes('lime') || name.includes('cilantro') ||
        name.includes('parsley') || name.includes('basil') || name.includes('mushroom') ||
        name.includes('zucchini') || name.includes('corn') || name.includes('jalapeño') ||
        name.includes('kale') || name.includes('arugula') || name.includes('mint') ||
        name.includes('dill') || name.includes('chive') || name.includes('scallion') ||
        name.includes('leek') || name.includes('shallot') || name.includes('ginger') ||
        name.includes('strawberry') || name.includes('grape') || name.includes('pear') ||
        name.includes('peach') || name.includes('mango') || name.includes('pineapple') ||
        name.includes('cabbage') || name.includes('cauliflower') || name.includes('asparagus') ||
        name.includes('green bean') || name.includes('pea') || name.includes('radish') ||
        name.includes('beet') || name.includes('turnip') || name.includes('sweet potato')) {
      return 'produce';
    }
    
    // Dairy
    if (name.includes('milk') || name.includes('yogurt') || name.includes('butter') ||
        name.includes('cream') || name.includes('sour cream') || name.includes('eggs') ||
        name.includes('egg') || name.includes('cottage cheese') || name.includes('ricotta') ||
        name.includes('mozzarella') || name.includes('cheddar') || name.includes('parmesan') ||
        name.includes('swiss') || name.includes('goat cheese') || name.includes('feta') ||
        name.includes('brie') || name.includes('cream cheese') || name.includes('half and half') ||
        name.includes('heavy cream') || name.includes('buttermilk')) {
      return 'dairy';
    }
    
    // Deli
    if (name.includes('cheese') || name.includes('ham') || name.includes('turkey') ||
        name.includes('salami') || name.includes('prosciutto') || name.includes('deli') ||
        name.includes('lunch meat') || name.includes('cold cut') || name.includes('pastrami') ||
        name.includes('corned beef') || name.includes('mortadella') || name.includes('bologna')) {
      return 'deli';
    }
    
    // Poultry
    if (name.includes('chicken') || name.includes('turkey breast') || name.includes('duck') ||
        name.includes('goose') || name.includes('chicken breast') || name.includes('chicken thigh') ||
        name.includes('chicken wing') || name.includes('ground chicken') || name.includes('ground turkey')) {
      return 'poultry';
    }
    
    // Pork
    if (name.includes('pork') || name.includes('bacon') || name.includes('ham') ||
        name.includes('sausage') || name.includes('chorizo') || name.includes('pork chop') ||
        name.includes('pork loin') || name.includes('pork shoulder') || name.includes('pepperoni') ||
        name.includes('pancetta') || name.includes('ground pork')) {
      return 'pork';
    }
    
    // Red Meat
    if (name.includes('beef') || name.includes('steak') || name.includes('ground beef') ||
        name.includes('lamb') || name.includes('veal') || name.includes('roast beef') ||
        name.includes('brisket') || name.includes('ribs') || name.includes('venison') ||
        name.includes('sirloin') || name.includes('ribeye') || name.includes('filet mignon')) {
      return 'red-meat';
    }
    
    // Seafood
    if (name.includes('fish') || name.includes('salmon') || name.includes('tuna') ||
        name.includes('shrimp') || name.includes('crab') || name.includes('lobster') ||
        name.includes('cod') || name.includes('tilapia') || name.includes('scallop') ||
        name.includes('mussel') || name.includes('clam') || name.includes('oyster') ||
        name.includes('halibut') || name.includes('mahi mahi') || name.includes('trout') ||
        name.includes('bass') || name.includes('snapper') || name.includes('sardine')) {
      return 'seafood';
    }
    
    // Frozen
    if (name.includes('frozen') || name.includes('ice cream') || name.includes('sorbet') ||
        name.includes('gelato') || name.includes('popsicle') || name.includes('frozen yogurt') ||
        name.includes('frozen fruit') || name.includes('frozen vegetable')) {
      return 'frozen';
    }
    
    // Beverages (excluding plain water)
    if (name.includes('juice') || name.includes('soda') || name.includes('bottled water') ||
        name.includes('gallon water') || name.includes('coffee') || name.includes('tea') ||
        name.includes('wine') || name.includes('beer') || name.includes('sparkling water') ||
        name.includes('coconut water') || name.includes('energy drink') || name.includes('kombucha')) {
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const { startDate, endDate, name } = req.body;
      
      // Get meal plans for the date range
      const mealPlans = await storage.getMealPlans(userId, startDate, endDate);
      
      // Use a Map to consolidate duplicate items
      const itemsMap = new Map<string, {
        id: string;
        name: string;
        quantity: string;
        unit: string;
        category: string;
        checked: boolean;
        manuallyAdded: boolean;
        count: number;
      }>();

      const mealPlanIds: number[] = [];

      // Aggregate ingredients from recipes
      for (const mealPlan of mealPlans) {
        if (mealPlan.recipeId) {
          const recipe = await storage.getRecipe(mealPlan.recipeId, userId);
          if (recipe) {
            mealPlanIds.push(mealPlan.id);
            
            recipe.ingredients.forEach((ingredient, index) => {
              // Debug logging to see what ingredient structure we're getting
              console.log(`Processing ingredient ${index} for recipe "${recipe.title}":`, ingredient);
              
              let ingredientName = '';
              let quantity = '1';
              let unit = 'item';
              
              if (typeof ingredient === 'string') {
                ingredientName = ingredient;
              } else if (typeof ingredient === 'object' && ingredient !== null) {
                // Try different possible property names for ingredient name
                ingredientName = ingredient.item || ingredient.name || ingredient.ingredientName || '';
                quantity = ingredient.amount || ingredient.quantity || '1';
                unit = ingredient.unit || 'item';
              }
              
              // Skip if we don't have a valid ingredient name
              if (!ingredientName || ingredientName.trim() === '') {
                console.log(`Skipping ingredient ${index} - no name found`);
                return;
              }
              
              const category = categorizeIngredient(ingredientName);
              
              // Skip items categorized as 'skip' (like plain water)
              if (category !== 'skip') {
                const itemKey = `${ingredientName.toLowerCase()}-${category}`;
                
                if (itemsMap.has(itemKey)) {
                  // Item already exists, increment count and combine quantities if numeric
                  const existingItem = itemsMap.get(itemKey)!;
                  existingItem.count += 1;
                  
                  // Try to combine quantities if both are numeric
                  const existingQty = parseFloat(existingItem.quantity);
                  const newQty = parseFloat(quantity);
                  
                  if (!isNaN(existingQty) && !isNaN(newQty) && existingItem.unit === unit) {
                    existingItem.quantity = (existingQty + newQty).toString();
                  } else if (existingItem.quantity !== quantity || existingItem.unit !== unit) {
                    // Different quantities/units, show combined format
                    existingItem.quantity = `${existingItem.quantity} ${existingItem.unit} + ${quantity} ${unit}`;
                    existingItem.unit = "";
                  }
                } else {
                  // New item
                  itemsMap.set(itemKey, {
                    id: `${mealPlan.id}-${index}`,
                    name: ingredientName,
                    quantity,
                    unit,
                    category,
                    checked: false,
                    manuallyAdded: false,
                    count: 1,
                  });
                }
              }
            });
          }
        }
      }

      // Convert map to array
      const items = Array.from(itemsMap.values()).map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked,
        manuallyAdded: item.manuallyAdded,
      }));

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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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

      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
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

  // Contact form submission
  app.post('/api/contact', async (req: any, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      // Log the contact form submission
      console.log('Contact form submission:', {
        name,
        email,
        subject: subject || 'Contact Form Submission',
        message,
        timestamp: new Date().toISOString()
      });

      // In a real implementation, you would send email to mike@chefmikesculinaryclass.com
      // using a service like SendGrid or Nodemailer
      
      res.status(200).json({ 
        message: 'Contact form submitted successfully',
        success: true 
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ 
        message: "Failed to submit contact form",
        success: false 
      });
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
          plan: 'free',
          emailVerified: true // Simplified signup - no email verification required
        });

        // Send welcome email (optional, no verification required)
        const loginUrl = `${req.protocol}://${req.get('host')}/login`;
        const welcomeEmailHtml = generateWelcomeEmailHtml(firstName, loginUrl);

        const emailSent = await sendEmail({
          from: '"Chef Mike\'s AI Recipe Manager" <noreply@chefmike.app>',
          to: email,
          subject: 'Welcome to Chef Mike\'s AI Recipe Manager!',
          html: welcomeEmailHtml,
        });

        if (emailSent) {
          console.log(`Welcome email sent to ${email}`);
        } else {
          console.error(`Failed to send welcome email to ${email}`);
        }

        res.json({ 
          success: true, 
          user: newUser,
          message: "Account created successfully! You can now sign in.",
          canLogin: true
        });
      } else {
        // For paid plans, create the user account first and log them in for subscription creation
        const newUser = await storage.createUser({
          email,
          firstName,
          lastName,
          password, // Will be hashed in storage layer
          plan: plan, // Keep the selected plan
          emailVerified: true // Simplified signup - no email verification required
        });

        // Create session for the new user so they can create subscription
        (req.session as any).userId = newUser.id;
        (req.session as any).user = newUser;
        console.log('User session created for subscription flow:', newUser.id);

        // Save session synchronously to ensure it's available for next request
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session error" });
          }
          
          console.log('Session saved successfully for user:', newUser.id);
          res.json({ 
            success: true, 
            user: newUser,
            message: "Account created successfully! Please complete payment to activate your subscription.",
            requiresPayment: true
          });
        });
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

      // For now, allow login without email verification for testing
      // TODO: Re-enable email verification after fixing the flow
      // if (!user.emailVerified) {
      //   return res.status(401).json({ 
      //     message: "Please verify your email address before logging in. Check your inbox for the verification email.",
      //     requiresVerification: true 
      //   });
      // }

      // Create session (simplified for now)
      (req.session as any).userId = user.id;
      (req.session as any).user = user;

      // Save session synchronously to ensure it's available for next request
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session error" });
        }
        
        console.log('Login session saved successfully for user:', user.id);
        res.json({ success: true, user: user });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error logging in: " + error.message });
    }
  });

  // Session-based logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Stripe subscription route
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: 'User email not found' });
      }

      // Check if user already has a subscription
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            return res.json({
              subscriptionId: subscription.id,
              status: subscription.status,
              message: 'Already subscribed'
            });
          }
        } catch (error) {
          console.log('Existing subscription not found, creating new one');
        }
      }

      let customer;
      
      // Check if user already has a Stripe customer
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
          if (customer.deleted) {
            customer = null;
          }
        } catch (error) {
          console.log('Existing customer not found, creating new one');
          customer = null;
        }
      }

      // Create Stripe customer if needed
      if (!customer) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || 'Chef',
          metadata: {
            userId: userId
          }
        });

        // Update user with customer ID
        await storage.updateUser(userId, { stripeCustomerId: customer.id });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product: {
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
        metadata: {
          userId: userId
        }
      });

      // Update user with subscription info
      await storage.updateUser(userId, {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        plan: 'family'
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

  // Stripe webhook handler
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // For production, you would use your webhook signing secret
      // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      // event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      
      // For now, just parse the body directly (not recommended for production)
      event = JSON.parse(req.body.toString());
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object);
        const invoice = event.data.object;
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const customerId = subscription.customer;
            
            // Find user by customer ID
            const user = await storage.getUserByStripeCustomerId(customerId as string);
            if (user) {
              await storage.updateUser(user.id, {
                subscriptionStatus: subscription.status,
                subscriptionEndDate: new Date(subscription.current_period_end * 1000),
                plan: 'family'
              });
              console.log(`Updated user ${user.id} subscription status to ${subscription.status}`);
            }
          } catch (error) {
            console.error('Error updating user subscription:', error);
          }
        }
        break;

      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object);
        const failedInvoice = event.data.object;
        if (failedInvoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
            const customerId = subscription.customer;
            
            const user = await storage.getUserByStripeCustomerId(customerId as string);
            if (user) {
              await storage.updateUser(user.id, {
                subscriptionStatus: 'past_due'
              });
              console.log(`Updated user ${user.id} subscription status to past_due`);
            }
          } catch (error) {
            console.error('Error updating user subscription:', error);
          }
        }
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription cancelled:', event.data.object);
        const cancelledSubscription = event.data.object;
        try {
          const customerId = cancelledSubscription.customer;
          const user = await storage.getUserByStripeCustomerId(customerId as string);
          if (user) {
            await storage.updateUser(user.id, {
              subscriptionStatus: 'cancelled',
              plan: 'free'
            });
            console.log(`Updated user ${user.id} subscription status to cancelled`);
          }
        } catch (error) {
          console.error('Error updating cancelled subscription:', error);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Grocery Store API routes
  app.get('/api/grocery/pricing/:itemName', isAuthenticated, async (req: any, res) => {
    try {
      const { itemName } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
      // Get user's preferred stores
      const userStores = await storage.getUserGroceryStores(userId);
      
      // Fetch pricing from multiple sources
      const pricingData = await storage.getItemPricing(itemName, userStores);
      
      // Mock data for demo - only showing Kroger for now
      const mockPricing = [
        {
          storeName: "Kroger",
          storeChain: "kroger",
          price: 2.89,
          originalPrice: 3.19,
          onSale: true,
          inStock: true,
          stockLevel: "high",
          distance: "1.2 miles"
        }
      ];
      
      res.json({ 
        item: itemName,
        pricing: pricingData.length > 0 ? pricingData : mockPricing,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching item pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing data" });
    }
  });

  app.get('/api/grocery/stores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const stores = await storage.getUserGroceryStores(userId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching grocery stores:", error);
      res.status(500).json({ message: "Failed to fetch grocery stores" });
    }
  });

  app.post('/api/grocery/stores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      const storeData = {
        ...req.body,
        userId,
      };
      
      const store = await storage.addUserGroceryStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      console.error("Error adding grocery store:", error);
      res.status(500).json({ message: "Failed to add grocery store" });
    }
  });

  app.get('/api/shopping-lists/:id/pricing', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { store } = req.query; // Get selected store from query parameter
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
      console.log(`[Pricing API] Fetching pricing for list ${id}, store: ${store}, user: ${userId}`);
      
      const shoppingList = await storage.getShoppingList(parseInt(id), userId);
      if (!shoppingList) {
        console.log(`[Pricing API] Shopping list ${id} not found for user ${userId}`);
        return res.status(404).json({ message: "Shopping list not found" });
      }

      console.log(`[Pricing API] Raw items data type:`, typeof shoppingList.items);
      console.log(`[Pricing API] Raw items length:`, typeof shoppingList.items === 'string' ? shoppingList.items.length : 'N/A');
      
      let items = [];
      try {
        if (typeof shoppingList.items === 'string') {
          // Clean up the string - remove extra quotes and fix escaping
          let itemsString = shoppingList.items;
          
          // Handle double-escaped JSON (common issue)
          if (itemsString.startsWith('"""') && itemsString.endsWith('"""')) {
            itemsString = itemsString.slice(3, -3);
          } else if (itemsString.startsWith('"') && itemsString.endsWith('"')) {
            itemsString = itemsString.slice(1, -1);
          }
          
          // Fix escaped quotes
          itemsString = itemsString.replace(/\\"/g, '"');
          
          console.log(`[Pricing API] Cleaned items string (first 200 chars):`, itemsString.substring(0, 200));
          
          items = JSON.parse(itemsString);
        } else if (Array.isArray(shoppingList.items)) {
          items = shoppingList.items;
        } else {
          console.log(`[Pricing API] Unexpected items type:`, typeof shoppingList.items);
          items = [];
        }
      } catch (parseError) {
        console.error(`[Pricing API] Error parsing items:`, parseError);
        console.log(`[Pricing API] Failed string:`, shoppingList.items?.substring(0, 500));
        items = [];
      }
      
      console.log(`[Pricing API] Successfully parsed ${items.length} items`);
      if (items.length > 0) {
        console.log(`[Pricing API] First item structure:`, JSON.stringify(items[0], null, 2));
      }
      
      // Generate store-specific mock data if no real pricing available
      const generateMockPricing = (storeName: string) => {
        const basePrice = Math.round((Math.random() * 5 + 1) * 100) / 100;
        const storeMultipliers: Record<string, number> = {
          'kroger': 1.0,
          'target': 1.1,
          'walmart': 0.9,
          'safeway': 1.15,
          'meijer': 0.95,
          'giant-eagle': 1.05,
          'costco': 0.85,
          'wholefoods': 1.3
        };
        
        const multiplier = storeMultipliers[storeName.toLowerCase()] || 1.0;
        return [{
          storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
          price: Math.round(basePrice * multiplier * 100) / 100,
          inStock: Math.random() > 0.1,
          onSale: Math.random() > 0.7
        }];
      };

      const pricingPromises = items.map(async (item: any) => {
        try {
          // Handle different item name formats (name vs item)
          const itemName = item.name || item.item || 'Unknown Item';
          console.log(`[Pricing API] Processing item: "${itemName}"`);
          
          // Get pricing for each item with store filter - use empty array for userStores to avoid DB issues  
          const pricing = await storage.getItemPricing(itemName, [], store as string);

          let finalPricing = pricing;
          
          if (pricing.length === 0) {
            console.log(`[Pricing API] No real pricing found for "${itemName}", generating mock data for store: ${store}`);
            if (store && store !== 'all') {
              // Generate mock data for specific store
              finalPricing = generateMockPricing(store);
            } else {
              // Generate mock data for multiple stores
              const stores = ['Kroger', 'Target', 'Walmart', 'Safeway', 'Meijer', 'Giant Eagle'];
              finalPricing = stores.map(storeName => ({
                storeName,
                price: Math.round((Math.random() * 5 + 1) * 100) / 100,
                inStock: Math.random() > 0.1,
                onSale: Math.random() > 0.7
              }));
            }
          } else {
            console.log(`[Pricing API] Found ${pricing.length} pricing results for "${itemName}"`);
          }
          
          return {
            name: itemName,
            quantity: item.quantity || item.amount || '1',
            category: item.category || 'other',
            unit: item.unit || 'item',
            pricing: finalPricing
          };
        } catch (itemError) {
          const itemName = item.name || item.item || 'Unknown Item';
          console.error(`[Pricing API] Error processing item "${itemName}":`, itemError);
          // Return mock data on error
          const mockPricing = store && store !== 'all' 
            ? generateMockPricing(store)
            : [{
                storeName: 'Kroger',
                price: Math.round((Math.random() * 5 + 1) * 100) / 100,
                inStock: true,
                onSale: false
              }];
          
          return {
            name: itemName,
            quantity: item.quantity || item.amount || '1', 
            category: item.category || 'other',
            unit: item.unit || 'item',
            pricing: mockPricing
          };
        }
      });

      const itemsWithPricing = await Promise.all(pricingPromises);
      console.log(`[Pricing API] Final response - ${itemsWithPricing.length} items with pricing data`);
      console.log(`[Pricing API] Sample pricing data:`, JSON.stringify(itemsWithPricing[0], null, 2));
      
      const totalEstimate = itemsWithPricing.reduce((sum, item) => {
        const inStockPrices = item.pricing.filter((p: any) => p.inStock).map((p: any) => p.price);
        if (inStockPrices.length === 0) return sum;
        const bestPrice = Math.min(...inStockPrices);
        return sum + (isFinite(bestPrice) ? bestPrice : 0);
      }, 0);

      const responseData = {
        shoppingListId: id,
        items: itemsWithPricing,
        totalEstimate: Math.round(totalEstimate * 100) / 100,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`[Pricing API] Sending response with total estimate: ${responseData.totalEstimate}`);
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching shopping list pricing:", error);
      res.status(500).json({ message: "Failed to fetch shopping list pricing" });
    }
  });

  // Admin API Routes
  const adminAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Simple admin token validation (in production, use JWT or similar)
    if (token !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
      return res.status(401).json({ message: 'Invalid admin token' });
    }
    
    next();
  };

  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Simple admin credentials check (in production, use proper hashing)
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@airecipemanager.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
      
      if (email === adminEmail && password === adminPassword) {
        const token = process.env.ADMIN_TOKEN || 'admin-token-' + Date.now();
        res.json({ success: true, token });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Admin dashboard stats
  app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Admin activity log
  app.get('/api/admin/activity', adminAuth, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ message: 'Failed to fetch activity' });
    }
  });

  // Admin user management
  app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
      const { search } = req.query;
      const users = await storage.getAdminUsers(search as string);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/users/:id', adminAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.put('/api/admin/users/:id', adminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.post('/api/admin/users/:id/reset-password', adminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await storage.createPasswordReset(userId);
      // In production, send email here
      res.json({ success: true, resetToken: result.token });
    } catch (error) {
      console.error('Error creating password reset:', error);
      res.status(500).json({ message: 'Failed to create password reset' });
    }
  });

  app.post('/api/admin/users/:id/suspend', adminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.updateUser(userId, { suspended: true });
      res.json({ success: true });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  // Admin subscription management
  app.get('/api/admin/subscriptions', adminAuth, async (req, res) => {
    try {
      const subscriptions = await storage.getAdminSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
  });

  app.post('/api/admin/subscriptions/:id/cancel', adminAuth, async (req, res) => {
    try {
      const subscriptionId = req.params.id;
      
      // Cancel in Stripe
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      
      // Update in database
      await storage.updateUserByStripeSubscription(subscriptionId, {
        subscriptionStatus: 'canceled'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  });

  // Admin payment management
  app.get('/api/admin/payments', adminAuth, async (req, res) => {
    try {
      const payments = await storage.getAdminPayments();
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Failed to fetch payments' });
    }
  });

  app.post('/api/admin/payments/:id/refund', adminAuth, async (req, res) => {
    try {
      const paymentIntentId = req.params.id;
      
      // Process refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
      
      res.json({ success: true, refund });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // Admin system actions
  app.post('/api/admin/send-password-reset', adminAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const result = await storage.createPasswordReset(user.id);
      // In production, send email here
      res.json({ success: true, resetToken: result.token });
    } catch (error) {
      console.error('Error sending password reset:', error);
      res.status(500).json({ message: 'Failed to send password reset' });
    }
  });

  app.post('/api/admin/export-data', adminAuth, async (req, res) => {
    try {
      const exportData = await storage.exportAllData();
      // In production, generate file and return download URL
      res.json({ success: true, downloadUrl: '/admin/exports/data.json' });
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  app.post('/api/admin/clear-cache', adminAuth, async (req, res) => {
    try {
      // Clear any caches here
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ message: 'Failed to clear cache' });
    }
  });

  app.post('/api/admin/sync-stripe', adminAuth, async (req, res) => {
    try {
      // Sync Stripe subscriptions with local database
      const subscriptions = await stripe.subscriptions.list({ limit: 100 });
      
      for (const sub of subscriptions.data) {
        const customer = await stripe.customers.retrieve(sub.customer as string);
        if (customer.deleted) continue;
        
        const user = await storage.getUserByEmail((customer as any).email);
        if (user) {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            stripeCustomerId: customer.id
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing Stripe:', error);
      res.status(500).json({ message: 'Failed to sync Stripe data' });
    }
  });

  // Serve admin static files
  app.use('/admin', express.static('admin'));

  const httpServer = createServer(app);
  return httpServer;
}
