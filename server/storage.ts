import {
  users,
  recipes,
  recipeRatings,
  mealPlans,
  shoppingLists,
  userPreferences,
  userInventory,
  purchaseReceipts,
  wastedItems,
  usedItems,
  aiLearning,
  mealSuggestions,
  groceryStorePricing,
  userGroceryStores,
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
  type WastedItem,
  type InsertWastedItem,
  type UsedItem,
  type InsertUsedItem,
  type AiLearning,
  type InsertAiLearning,
  type MealSuggestions,
  type InsertMealSuggestions,
  type GroceryStorePricing,
  type InsertGroceryStorePricing,
  type UserGroceryStore,
  type InsertUserGroceryStore,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ilike, isNotNull, isNull, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  verifyPassword(userId: string, password: string): Promise<boolean>;
  
  // Email verification operations
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  setEmailVerificationToken(userId: string, token: string): Promise<void>;
  verifyEmail(token: string): Promise<User | null>;
  
  // Recipe operations
  getRecipes(userId: string, filters?: { search?: string; minRating?: number; maxRating?: number }): Promise<Recipe[]>;
  getRecipe(id: number, userId: string): Promise<Recipe | undefined>;
  getRecipeCount(userId: string): Promise<number>;
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
  getShoppingListCount(userId: string): Promise<number>;
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
    mostUsedItems: Array<{ name: string; count: number; totalUsed: number }>;
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

  // AI Learning operations
  createAiLearning(learning: InsertAiLearning): Promise<AiLearning>;
  getAiLearningHistory(userId: string, limit?: number): Promise<AiLearning[]>;
  getAiLearningByType(userId: string, interactionType: string, limit?: number): Promise<AiLearning[]>;
  
  // Meal suggestions operations
  getMealSuggestions(userId: string, date?: string): Promise<MealSuggestions | undefined>;
  createMealSuggestions(suggestions: InsertMealSuggestions): Promise<MealSuggestions>;
  updateMealSuggestions(id: number, suggestions: Partial<InsertMealSuggestions>, userId: string): Promise<MealSuggestions | undefined>;
  getMealSuggestionsHistory(userId: string, limit?: number): Promise<MealSuggestions[]>;
  
  // Grocery store operations
  getUserGroceryStores(userId: string): Promise<UserGroceryStore[]>;
  addUserGroceryStore(store: InsertUserGroceryStore): Promise<UserGroceryStore>;
  updateUserGroceryStore(id: number, store: Partial<InsertUserGroceryStore>, userId: string): Promise<UserGroceryStore | undefined>;
  deleteUserGroceryStore(id: number, userId: string): Promise<boolean>;
  getItemPricing(itemName: string, userStores: UserGroceryStore[]): Promise<GroceryStorePricing[]>;
  updateGroceryPricing(pricing: InsertGroceryStorePricing): Promise<GroceryStorePricing>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    // Hash password if provided
    const insertData: any = { ...userData };
    if (insertData.password) {
      const saltRounds = 10;
      insertData.password = await bcrypt.hash(insertData.password, saltRounds);
    }
    
    const [user] = await db
      .insert(users)
      .values(insertData as UpsertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    // Hash password if provided
    const updateData: any = { ...updates };
    if (updateData.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }
    
    updateData.updatedAt = new Date();
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.password) {
      return false;
    }
    
    return await bcrypt.compare(password, user.password);
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

  // Email verification operations
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async setEmailVerificationToken(userId: string, token: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerificationToken: token,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.getUserByVerificationToken(token);
    if (!user) return null;

    const [updatedUser] = await db
      .update(users)
      .set({ 
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date()
      })
      .where(eq(users.emailVerificationToken, token))
      .returning();

    return updatedUser || null;
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

  async getRecipeCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipes)
      .where(eq(recipes.userId, userId));
    return result[0]?.count || 0;
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

  async getShoppingListCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId));
    return result[0]?.count || 0;
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
    // Clean the data and ensure proper typing
    const { id: _, userId: __, createdAt, ...cleanData } = shoppingList as any;
    const updateData = {
      ...cleanData,
      updatedAt: new Date()
    };
    
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
    // Show all active inventory items
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
    // Get the item first
    const [item] = await db
      .select()
      .from(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    
    if (item) {
      // Add to wasted items table
      await db
        .insert(wastedItems)
        .values({
          userId: item.userId,
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          totalCost: item.totalCost,
          wasteReason: 'marked_by_user'
        });
      
      // Remove from inventory
      await db
        .delete(userInventory)
        .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    }
  }

  async markItemAsUsed(id: number, userId: string): Promise<void> {
    // Get the item first
    const [item] = await db
      .select()
      .from(userInventory)
      .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    
    if (item) {
      // Add to used items table
      await db
        .insert(usedItems)
        .values({
          userId: item.userId,
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          totalCost: item.totalCost,
        });
      
      // Remove from inventory
      await db
        .delete(userInventory)
        .where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
    }
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
    mostUsedItems: Array<{ name: string; count: number; totalUsed: number }>;
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

    // Get most wasted items from dedicated wasted items table
    const wasteDateFilters = [];
    if (startDate) {
      wasteDateFilters.push(gte(wastedItems.wasteDate, startDate));
    }
    if (endDate) {
      wasteDateFilters.push(lte(wastedItems.wasteDate, endDate));
    }

    const wastedData = await db
      .select()
      .from(wastedItems)
      .where(and(
        eq(wastedItems.userId, userId),
        ...wasteDateFilters
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

    // Get most used items from dedicated used items table
    const usedDateFilters = [];
    if (startDate) {
      usedDateFilters.push(gte(usedItems.usedDate, startDate));
    }
    if (endDate) {
      usedDateFilters.push(lte(usedItems.usedDate, endDate));
    }

    const usedData = await db
      .select()
      .from(usedItems)
      .where(and(
        eq(usedItems.userId, userId),
        ...usedDateFilters
      ));

    const usedItemsMap = new Map<string, { count: number; totalUsed: number }>();
    usedData.forEach(item => {
      const existing = usedItemsMap.get(item.ingredientName) || { count: 0, totalUsed: 0 };
      existing.count += 1;
      existing.totalUsed += item.totalCost ? parseFloat(item.totalCost) : 0;
      usedItemsMap.set(item.ingredientName, existing);
    });

    const mostUsedItems = Array.from(usedItemsMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalUsed - a.totalUsed)
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
      mostUsedItems,
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

  // AI Learning operations
  async createAiLearning(learning: InsertAiLearning): Promise<AiLearning> {
    const [result] = await db
      .insert(aiLearning)
      .values([learning])
      .returning();
    return result;
  }

  async getAiLearningHistory(userId: string, limit: number = 50): Promise<AiLearning[]> {
    return await db
      .select()
      .from(aiLearning)
      .where(eq(aiLearning.userId, userId))
      .orderBy(desc(aiLearning.createdAt))
      .limit(limit);
  }

  async getAiLearningByType(userId: string, interactionType: string, limit: number = 20): Promise<AiLearning[]> {
    return await db
      .select()
      .from(aiLearning)
      .where(and(
        eq(aiLearning.userId, userId),
        eq(aiLearning.interactionType, interactionType)
      ))
      .orderBy(desc(aiLearning.createdAt))
      .limit(limit);
  }

  // Meal suggestions operations
  async getMealSuggestions(userId: string, date?: string): Promise<MealSuggestions | undefined> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [result] = await db
      .select()
      .from(mealSuggestions)
      .where(and(
        eq(mealSuggestions.userId, userId),
        eq(mealSuggestions.suggestionDate, targetDate)
      ))
      .orderBy(desc(mealSuggestions.createdAt))
      .limit(1);
    return result;
  }

  async createMealSuggestions(suggestions: InsertMealSuggestions): Promise<MealSuggestions> {
    const [result] = await db
      .insert(mealSuggestions)
      .values([suggestions])
      .returning();
    return result;
  }

  async updateMealSuggestions(id: number, suggestionsData: Partial<InsertMealSuggestions>, userId: string): Promise<MealSuggestions | undefined> {
    const updateData = suggestionsData as any;
    const [result] = await db
      .update(mealSuggestions)
      .set(updateData)
      .where(and(
        eq(mealSuggestions.id, id),
        eq(mealSuggestions.userId, userId)
      ))
      .returning();
    return result;
  }

  async getMealSuggestionsHistory(userId: string, limit: number = 10): Promise<MealSuggestions[]> {
    return await db
      .select()
      .from(mealSuggestions)
      .where(eq(mealSuggestions.userId, userId))
      .orderBy(desc(mealSuggestions.createdAt))
      .limit(limit);
  }
  // Grocery store operations
  async getUserGroceryStores(userId: string): Promise<UserGroceryStore[]> {
    return await db.select()
      .from(userGroceryStores)
      .where(eq(userGroceryStores.userId, userId))
      .orderBy(desc(userGroceryStores.isPrimary), asc(userGroceryStores.storeName));
  }

  async addUserGroceryStore(store: InsertUserGroceryStore): Promise<UserGroceryStore> {
    const [newStore] = await db
      .insert(userGroceryStores)
      .values(store)
      .returning();
    return newStore;
  }

  async updateUserGroceryStore(id: number, store: Partial<InsertUserGroceryStore>, userId: string): Promise<UserGroceryStore | undefined> {
    const [updatedStore] = await db
      .update(userGroceryStores)
      .set(store)
      .where(and(eq(userGroceryStores.id, id), eq(userGroceryStores.userId, userId)))
      .returning();
    return updatedStore;
  }

  async deleteUserGroceryStore(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userGroceryStores)
      .where(and(eq(userGroceryStores.id, id), eq(userGroceryStores.userId, userId)));
    return result.rowCount > 0;
  }

  async getItemPricing(itemName: string, userStores: UserGroceryStore[], filterStore?: string): Promise<GroceryStorePricing[]> {
    console.log(`[Storage] Getting pricing for "${itemName}", userStores: ${userStores.length}, filter: ${filterStore}`);
    
    try {
      // Try to get real-time pricing from grocery store APIs first
      const realTimePricing = await this.getRealTimePricing(itemName, userStores, filterStore);
      
      if (realTimePricing.length > 0) {
        console.log(`[Storage] Found ${realTimePricing.length} real-time pricing results`);
        return realTimePricing;
      }

      console.log(`[Storage] No real-time pricing found, trying database cache...`);
      
      // Fallback to cached database pricing - but skip DB queries for now to avoid crashes
      // if (userStores.length === 0) {
      //   return await db.select()
      //     .from(groceryStorePricing)
      //     .where(ilike(groceryStorePricing.itemName, `%${itemName}%`))
      //     .orderBy(asc(groceryStorePricing.price))
      //     .limit(5);
      // }

      // const storeNames = userStores.map(store => store.storeName);
      // return await db.select()
      //   .from(groceryStorePricing)
      //   .where(
      //     and(
      //       ilike(groceryStorePricing.itemName, `%${itemName}%`),
      //       sql`${groceryStorePricing.storeName} = ANY(${storeNames})`
      //     )
      //   )
      //   .orderBy(asc(groceryStorePricing.price));
      
      console.log(`[Storage] Skipping database cache, returning empty array`);
      return [];
    } catch (error) {
      console.error(`[Storage] Error in getItemPricing for "${itemName}":`, error);
      return [];
    }
  }

  private async getRealTimePricing(itemName: string, userStores: UserGroceryStore[], filterStore?: string): Promise<GroceryStorePricing[]> {
    const results: any[] = [];

    try {
      console.log(`[Storage] Getting real-time pricing for "${itemName}", stores: ${userStores.length}, filter: ${filterStore}`);
      
      // Import and use Kroger API
      const { krogerAPI } = await import('./kroger-api');
      const krogerStores = userStores.filter(store => store.storeType === 'kroger').map(store => store.storeId);
      const krogerPricing = await krogerAPI.getItemPricing(itemName, krogerStores, filterStore);
      
      // Convert to our GroceryStorePricing format
      for (const pricing of krogerPricing) {
        results.push({
          id: 0, // Not stored in DB
          itemName: itemName,
          storeName: pricing.storeName,
          storeId: pricing.storeId,
          price: pricing.price,
          promoPrice: pricing.promoPrice,
          inStock: pricing.inStock,
          onSale: pricing.onSale,
          lastUpdated: new Date(),
          userId: userStores[0]?.userId || ''
        });
      }

      // Try Target API if available
      const { targetAPI } = await import('./target-api');
      const targetStores = userStores.filter(store => store.storeType === 'target').map(store => store.storeId);
      if (targetStores.length > 0) {
        const targetPricing = await targetAPI.getItemPricing(itemName, targetStores);
        
        for (const pricing of targetPricing) {
          results.push({
            id: 0,
            itemName: itemName,
            storeName: pricing.storeName,
            storeId: pricing.storeId,
            price: pricing.price,
            promoPrice: pricing.promoPrice,
            inStock: pricing.inStock,
            onSale: pricing.onSale,
            lastUpdated: new Date(),
            userId: userStores[0]?.userId || ''
          });
        }
      }

    } catch (error) {
      console.error('Error fetching real-time pricing:', error);
    }

    return results;
  }

  async updateGroceryPricing(pricing: InsertGroceryStorePricing): Promise<GroceryStorePricing> {
    const [updatedPricing] = await db
      .insert(groceryStorePricing)
      .values({
        ...pricing,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [groceryStorePricing.storeName, groceryStorePricing.itemName],
        set: {
          price: pricing.price,
          originalPrice: pricing.originalPrice,
          onSale: pricing.onSale,
          inStock: pricing.inStock,
          stockLevel: pricing.stockLevel,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return updatedPricing;
  }
}

export const storage = new DatabaseStorage();
