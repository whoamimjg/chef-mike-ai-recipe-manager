import {
  users,
  recipes,
  recipeRatings,
  mealPlans,
  shoppingLists,
  userPreferences,
  userInventory,
  purchaseReceipts,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type RecipeRating,
  type InsertRecipeRating,
  type MealPlan,
  type InsertMealPlan,
  type ShoppingList,
  type InsertShoppingList,
  type UserPreferences,
  type InsertUserPreferences,
  type UserInventory,
  type InsertUserInventory,
  type PurchaseReceipt,
  type InsertPurchaseReceipt,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ilike, isNotNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe operations
  getRecipes(userId: string, filters?: { search?: string; minRating?: number; maxRating?: number }): Promise<Recipe[]>;
  getRecipe(id: number, userId: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>, userId: string): Promise<Recipe | undefined>;
  deleteRecipe(id: number, userId: string): Promise<boolean>;
  
  // Recipe rating operations
  getRating(recipeId: number, userId: string): Promise<RecipeRating | undefined>;
  createOrUpdateRating(rating: InsertRecipeRating): Promise<RecipeRating>;
  updateRecipeAverageRating(recipeId: number): Promise<void>;
  
  // Meal plan operations
  getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, mealPlan: Partial<InsertMealPlan>, userId: string): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number, userId: string): Promise<boolean>;
  
  // Shopping list operations
  getShoppingLists(userId: string): Promise<ShoppingList[]>;
  getShoppingList(id: number, userId: string): Promise<ShoppingList | undefined>;
  createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList>;
  updateShoppingList(id: number, shoppingList: Partial<InsertShoppingList>, userId: string): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: number, userId: string): Promise<boolean>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // User inventory operations
  getUserInventory(userId: string): Promise<UserInventory[]>;
  addInventoryItem(item: InsertUserInventory): Promise<UserInventory>;
  updateInventoryItem(id: number, item: Partial<InsertUserInventory>, userId: string): Promise<UserInventory | undefined>;
  deleteInventoryItem(id: number, userId: string): Promise<boolean>;
  markItemAsWasted(id: number, userId: string): Promise<void>;
  markItemAsUsed(id: number, userId: string): Promise<void>;
  getInventoryByBarcode(userId: string, barcode: string): Promise<UserInventory | undefined>;
  
  // Receipt operations
  addPurchaseReceipt(receipt: InsertPurchaseReceipt): Promise<PurchaseReceipt>;
  getPurchaseReceipts(userId: string): Promise<PurchaseReceipt[]>;
  
  // Reporting operations
  getSpendingReport(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSpent: number;
    mostFrequentItems: Array<{ name: string; count: number; totalSpent: number }>;
    mostWastedItems: Array<{ name: string; count: number; totalWasted: number }>;
    categoryBreakdown: Array<{ category: string; totalSpent: number }>;
  }>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    totalRecipes: number;
    totalMealPlans: number;
    monthlyRevenue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe operations
  async getRecipes(userId: string, filters?: { search?: string; minRating?: number; maxRating?: number }): Promise<Recipe[]> {
    let conditions = [eq(recipes.userId, userId)];
    
    if (filters?.search) {
      conditions.push(ilike(recipes.title, `%${filters.search}%`));
    }
    
    if (filters?.minRating) {
      conditions.push(gte(recipes.averageRating, filters.minRating.toString()));
    }
    
    if (filters?.maxRating) {
      conditions.push(lte(recipes.averageRating, filters.maxRating.toString()));
    }
    
    return await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.createdAt));
  }

  async getRecipe(id: number, userId: string): Promise<Recipe | undefined> {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
    return recipe;
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    // Ensure array fields are properly typed
    const insertData: any = recipe;
    
    const [newRecipe] = await db
      .insert(recipes)
      .values(insertData)
      .returning();
    return newRecipe;
  }

  async updateRecipe(id: number, recipe: Partial<InsertRecipe>, userId: string): Promise<Recipe | undefined> {
    // Ensure array fields are properly typed
    const updateData: any = { ...recipe, updatedAt: new Date() };
    
    const [updatedRecipe] = await db
      .update(recipes)
      .set(updateData)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning();
    return updatedRecipe;
  }

  async deleteRecipe(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Recipe rating operations
  async getRating(recipeId: number, userId: string): Promise<RecipeRating | undefined> {
    const [rating] = await db
      .select()
      .from(recipeRatings)
      .where(and(eq(recipeRatings.recipeId, recipeId), eq(recipeRatings.userId, userId)));
    return rating;
  }

  async createOrUpdateRating(rating: InsertRecipeRating): Promise<RecipeRating> {
    // First check if rating exists
    const existingRating = await this.getRating(rating.recipeId, rating.userId);
    
    let result: RecipeRating;
    if (existingRating) {
      // Update existing rating
      const [updatedRating] = await db
        .update(recipeRatings)
        .set({ rating: rating.rating })
        .where(and(eq(recipeRatings.recipeId, rating.recipeId), eq(recipeRatings.userId, rating.userId)))
        .returning();
      result = updatedRating;
    } else {
      // Create new rating
      const [newRating] = await db.insert(recipeRatings).values(rating).returning();
      result = newRating;
    }

    // Update recipe average rating
    await this.updateRecipeAverageRating(rating.recipeId);
    
    return result;
  }

  async updateRecipeAverageRating(recipeId: number): Promise<void> {
    const ratings = await db
      .select()
      .from(recipeRatings)
      .where(eq(recipeRatings.recipeId, recipeId));

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await db
        .update(recipes)
        .set({ 
          averageRating: avgRating.toFixed(2),
          ratingCount: ratings.length
        })
        .where(eq(recipes.id, recipeId));
    }
  }

  // Meal plan operations
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
    let baseQuery = db
      .select()
      .from(mealPlans);

    if (startDate && endDate) {
      return await baseQuery
        .where(
          and(
            eq(mealPlans.userId, userId),
            gte(mealPlans.date, startDate),
            lte(mealPlans.date, endDate)
          )
        )
        .orderBy(asc(mealPlans.date));
    }

    return await baseQuery
      .where(eq(mealPlans.userId, userId))
      .orderBy(asc(mealPlans.date));
  }

  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const [newMealPlan] = await db
      .insert(mealPlans)
      .values(mealPlan)
      .returning();
    return newMealPlan;
  }

  async updateMealPlan(id: number, mealPlan: Partial<InsertMealPlan>, userId: string): Promise<MealPlan | undefined> {
    const [updatedMealPlan] = await db
      .update(mealPlans)
      .set(mealPlan)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
      .returning();
    return updatedMealPlan;
  }

  async deleteMealPlan(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(mealPlans)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Shopping list operations
  async getShoppingLists(userId: string): Promise<ShoppingList[]> {
    return await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .orderBy(desc(shoppingLists.createdAt));
  }

  async getShoppingList(id: number, userId: string): Promise<ShoppingList | undefined> {
    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));
    return shoppingList;
  }

  async createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList> {
    // Ensure array fields are properly typed
    const insertData: any = shoppingList;
    
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values(insertData)
      .returning();
    return newShoppingList;
  }

  async updateShoppingList(id: number, shoppingList: Partial<InsertShoppingList>, userId: string): Promise<ShoppingList | undefined> {
    // Ensure array fields are properly typed
    const updateData: any = { ...shoppingList, updatedAt: new Date() };
    
    const [updatedShoppingList] = await db
      .update(shoppingLists)
      .set(updateData)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)))
      .returning();
    return updatedShoppingList;
  }

  async deleteShoppingList(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    // Ensure array fields are properly typed
    const insertData: any = preferences;
    const updateData: any = { ...preferences, updatedAt: new Date() };
    
    const [upsertedPreferences] = await db
      .insert(userPreferences)
      .values(insertData)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: updateData,
      })
      .returning();
    return upsertedPreferences;
  }

  // User inventory operations
  async getUserInventory(userId: string): Promise<UserInventory[]> {
    return await db
      .select()
      .from(userInventory)
      .where(eq(userInventory.userId, userId))
      .orderBy(asc(userInventory.ingredientName));
  }

  async addInventoryItem(item: InsertUserInventory): Promise<UserInventory> {
    const [newItem] = await db
      .insert(userInventory)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertUserInventory>, userId: string): Promise<UserInventory | undefined> {
    const [updatedItem] = await db
      .update(userInventory)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async markItemAsWasted(id: number, userId: string): Promise<void> {
    await db
      .update(userInventory)
      .set({ wasteDate: new Date() })
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
  }

  async markItemAsUsed(id: number, userId: string): Promise<void> {
    // Remove the item from inventory since it's been consumed
    await db
      .delete(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
  }

  async getInventoryByBarcode(userId: string, barcode: string): Promise<UserInventory | undefined> {
    const [item] = await db
      .select()
      .from(userInventory)
      .where(and(eq(userInventory.userId, userId), eq(userInventory.upcBarcode, barcode)));
    return item;
  }

  // Receipt operations
  async addPurchaseReceipt(receipt: InsertPurchaseReceipt): Promise<PurchaseReceipt> {
    const insertData: any = receipt; // Type casting to handle JSON arrays
    const [newReceipt] = await db
      .insert(purchaseReceipts)
      .values(insertData)
      .returning();
    return newReceipt;
  }

  async getPurchaseReceipts(userId: string): Promise<PurchaseReceipt[]> {
    return await db
      .select()
      .from(purchaseReceipts)
      .where(eq(purchaseReceipts.userId, userId))
      .orderBy(desc(purchaseReceipts.purchaseDate));
  }

  // Reporting operations
  async getSpendingReport(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSpent: number;
    mostFrequentItems: Array<{ name: string; count: number; totalSpent: number }>;
    mostWastedItems: Array<{ name: string; count: number; totalWasted: number }>;
    categoryBreakdown: Array<{ category: string; totalSpent: number }>;
  }> {
    // Build date filter conditions
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(userInventory.purchaseDate, startDate));
    }
    if (endDate) {
      dateFilters.push(lte(userInventory.purchaseDate, endDate));
    }

    // Get total spending
    const spendingData = await db
      .select()
      .from(userInventory)
      .where(and(
        eq(userInventory.userId, userId),
        ...dateFilters
      ));

    const totalSpent = spendingData.reduce((sum, item) => {
      return sum + (item.totalCost ? parseFloat(item.totalCost) : 0);
    }, 0);

    // Get most frequent items (by purchase count)
    const frequentItemsMap = new Map<string, { count: number; totalSpent: number }>();
    spendingData.forEach(item => {
      const existing = frequentItemsMap.get(item.ingredientName) || { count: 0, totalSpent: 0 };
      existing.count += 1;
      existing.totalSpent += item.totalCost ? parseFloat(item.totalCost) : 0;
      frequentItemsMap.set(item.ingredientName, existing);
    });

    const mostFrequentItems = Array.from(frequentItemsMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get most wasted items
    const wastedData = await db
      .select()
      .from(userInventory)
      .where(and(
        eq(userInventory.userId, userId),
        isNotNull(userInventory.wasteDate), // Items that have been marked as wasted
        ...dateFilters
      ));

    const wastedItemsMap = new Map<string, { count: number; totalWasted: number }>();
    wastedData.forEach(item => {
      const existing = wastedItemsMap.get(item.ingredientName) || { count: 0, totalWasted: 0 };
      existing.count += 1;
      existing.totalWasted += item.totalCost ? parseFloat(item.totalCost) : 0;
      wastedItemsMap.set(item.ingredientName, existing);
    });

    const mostWastedItems = Array.from(wastedItemsMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalWasted - a.totalWasted)
      .slice(0, 10);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    spendingData.forEach(item => {
      const category = item.category || 'uncategorized';
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + (item.totalCost ? parseFloat(item.totalCost) : 0));
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, totalSpent]) => ({ category, totalSpent }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      totalSpent,
      mostFrequentItems,
      mostWastedItems,
      categoryBreakdown,
    };
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    totalRecipes: number;
    totalMealPlans: number;
    monthlyRevenue: number;
  }> {
    // In a real implementation, you would calculate actual stats
    // For now, returning mock data structure
    const totalUsers = await db.$count(users);
    const totalRecipes = await db.$count(recipes);
    const totalMealPlans = await db.$count(mealPlans);
    
    // Revenue calculation would be based on actual subscription data
    const monthlyRevenue = totalUsers * 9; // Simple calculation for demo
    
    return {
      totalUsers,
      totalRecipes,
      totalMealPlans,
      monthlyRevenue,
    };
  }
}

export const storage = new DatabaseStorage();
