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
} from "@shared/schema";
import { getAIRecipeRecommendations } from "./openai";
import multer from 'multer';
import path from 'path';

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

  // Recipe routes
  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipes = await storage.getRecipes(userId);
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
      
      const shoppingList = await storage.updateShoppingList(shoppingListId, req.body, userId);
      
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

  // Generate shopping list from meal plans
  app.post('/api/shopping-lists/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, name } = req.body;
      
      // Get meal plans for the date range
      const mealPlans = await storage.getMealPlans(userId, startDate, endDate);
      
      // Get recipes for meal plans
      const recipeIds = mealPlans
        .filter(mp => mp.recipeId)
        .map(mp => mp.recipeId!);
      
      const items: Array<{
        id: string;
        name: string;
        quantity: string;
        category: string;
        recipeId?: number;
        checked: boolean;
      }> = [];

      // Aggregate ingredients from recipes
      for (const mealPlan of mealPlans) {
        if (mealPlan.recipeId) {
          const recipe = await storage.getRecipe(mealPlan.recipeId, userId);
          if (recipe) {
            recipe.ingredients.forEach((ingredient, index) => {
              items.push({
                id: `${mealPlan.id}-${index}`,
                name: ingredient,
                quantity: "1",
                category: "Pantry", // Default category
                recipeId: recipe.id,
                checked: false,
              });
            });
          }
        }
      }

      const shoppingListData = {
        userId,
        name: name || `Shopping List ${new Date().toLocaleDateString()}`,
        items,
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
      const inventoryData = insertUserInventorySchema.parse({
        ...req.body,
        userId,
      });

      const item = await storage.addInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding inventory item:", error);
      res.status(500).json({ message: "Failed to add inventory item" });
    }
  });

  // AI recommendations route
  app.post('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { preferences, inventory, mealType } = req.body;
      
      const recommendations = await getAIRecipeRecommendations({
        preferences,
        inventory,
        mealType,
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      res.status(500).json({ message: "Failed to get AI recommendations" });
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

  const httpServer = createServer(app);
  return httpServer;
}
