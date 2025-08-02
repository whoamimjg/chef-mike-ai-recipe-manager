import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  serial,
  numeric,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // Hashed password for traditional auth
  plan: varchar("plan").notNull().default("free"), // free, pro, family
  // Dietary preferences and food preferences collected during signup
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergies: text("allergies").array(),
  cuisinePreferences: text("cuisine_preferences").array(),
  dislikedIngredients: text("disliked_ingredients").array(),
  cookingExperience: varchar("cooking_experience", { enum: ["beginner", "intermediate", "advanced"] }),
  cookingGoals: text("cooking_goals").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipes table
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings"),
  difficulty: varchar("difficulty"), // easy, medium, hard
  cuisine: varchar("cuisine"),
  ingredients: jsonb("ingredients").notNull().$type<{
    unit?: string;
    amount?: string;
    item: string;
    notes?: string;
  }[]>(),
  instructions: jsonb("instructions").notNull().$type<string[]>(),
  mealType: varchar("meal_type"), // breakfast, lunch, dinner, snack
  nutritionInfo: jsonb("nutrition_info").$type<{
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>(),
  tags: jsonb("tags").$type<string[]>().default([]),
  isPublic: boolean("is_public").default(false),
  rating: integer("rating"), // User's personal rating 1-10
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }), // Community average rating
  ratingCount: integer("rating_count").default(0), // Number of ratings
  sourceUrl: varchar("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe ratings table for community ratings
export const recipeRatings = pgTable("recipe_ratings", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-10 scale
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_ratings_recipe_id_idx").on(table.recipeId),
  index("recipe_ratings_user_id_idx").on(table.userId),
]);

// Meal plans table
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  mealType: varchar("meal_type").notNull(), // breakfast, lunch, dinner, snack
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  customMeal: varchar("custom_meal"), // for non-recipe meals
  servings: integer("servings").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping lists table
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  startDate: varchar("start_date"), // For week/date range planning
  endDate: varchar("end_date"),
  items: jsonb("items").notNull().$type<Array<{
    id: string;
    name: string;
    quantity: string;
    unit: string;
    category: "produce" | "deli" | "poultry" | "pork" | "red-meat" | "seafood" | "dairy" | "frozen" | "beverages" | "snacks" | "canned-goods" | "bread" | "ethnic-foods" | "household-goods" | "cleaning-supplies" | "pets";
    recipeId?: number;
    recipeTitle?: string;
    checked: boolean;
    manuallyAdded: boolean;
  }>>(),
  mealPlanIds: jsonb("meal_plan_ids").$type<number[]>().default([]), // Track which meal plans contributed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// This section moved to end of file to avoid duplicates

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<(typeof DIETARY_RESTRICTIONS[number])[]>().default([]),
  allergies: jsonb("allergies").$type<(typeof COMMON_ALLERGIES[number])[]>().default([]),
  favoriteCuisines: jsonb("favorite_cuisines").$type<string[]>().default([]),
  cookingSkillLevel: varchar("cooking_skill_level").default("beginner"), // beginner, intermediate, advanced
  preferences: jsonb("preferences").$type<{
    maxPrepTime?: number;
    maxCookTime?: number;
    preferredMealTypes?: string[];
    avoidIngredients?: string[];
    preferredIngredients?: string[];
    mealComplexity?: "simple" | "moderate" | "complex";
    spiceLevel?: "mild" | "medium" | "hot";
    cookingMethods?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI learning table to track user interactions and preferences
export const aiLearning = pgTable("ai_learning", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  interactionType: varchar("interaction_type").notNull(), // "recipe_viewed", "recipe_cooked", "recipe_rated", "ingredient_liked", "ingredient_disliked"
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name"),
  cuisine: varchar("cuisine"),
  mealType: varchar("meal_type"),
  rating: integer("rating"), // 1-10 scale
  feedback: jsonb("feedback").$type<{
    liked?: string[];
    disliked?: string[];
    suggestions?: string[];
    cookingTime?: number;
    difficulty?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal suggestions tracking
export const mealSuggestions = pgTable("meal_suggestions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  suggestionDate: varchar("suggestion_date").notNull(), // YYYY-MM-DD format
  suggestions: jsonb("suggestions").notNull().$type<Array<{
    title: string;
    description: string;
    cuisine: string;
    mealType: string;
    prepTime: number;
    cookTime: number;
    difficulty: string;
    matchScore: number;
    ingredients: string[];
    instructions: string[];
    reasons: string[];
    inventoryMatch: number;
    missingIngredients?: string[];
  }>>(),
  acceptedSuggestions: jsonb("accepted_suggestions").$type<number[]>().default([]), // indices of accepted suggestions
  rejectedSuggestions: jsonb("rejected_suggestions").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// User inventory table (for AI recommendations)
export const userInventory = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name").notNull(),
  quantity: varchar("quantity"),
  unit: varchar("unit"),
  expiryDate: varchar("expiry_date"), // YYYY-MM-DD format
  category: varchar("category"),
  upcBarcode: varchar("upc_barcode"),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  purchaseDate: timestamp("purchase_date"),
  wasteDate: timestamp("waste_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase receipts table for bulk ingredient adding
export const purchaseReceipts = pgTable("purchase_receipts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storeName: varchar("store_name"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  receiptImageUrl: varchar("receipt_image_url"),
  items: jsonb("items").notNull().$type<Array<{
    name: string;
    quantity: string;
    unit: string;
    price: number;
    category?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wasted items table for tracking food waste separately
export const wastedItems = pgTable("wasted_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name").notNull(),
  quantity: varchar("quantity"),
  unit: varchar("unit"),
  category: varchar("category"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  wasteDate: timestamp("waste_date").defaultNow(),
  wasteReason: varchar("waste_reason"), // expired, spoiled, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Used items table for tracking consumed ingredients
export const usedItems = pgTable("used_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name").notNull(),
  quantity: varchar("quantity"),
  unit: varchar("unit"),
  category: varchar("category"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  usedDate: timestamp("used_date").defaultNow(),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }), // Link to recipe if used in cooking
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  recipes: many(recipes),
  mealPlans: many(mealPlans),
  shoppingLists: many(shoppingLists),
  preferences: one(userPreferences),
  inventory: many(userInventory),
  receipts: many(purchaseReceipts),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  mealPlans: many(mealPlans),
  ratings: many(recipeRatings),
}));

export const recipeRatingsRelations = relations(recipeRatings, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeRatings.recipeId],
    references: [recipes.id],
  }),
  user: one(users, {
    fields: [recipeRatings.userId],
    references: [users.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one }) => ({
  user: one(users, {
    fields: [shoppingLists.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const aiLearningRelations = relations(aiLearning, ({ one }) => ({
  user: one(users, {
    fields: [aiLearning.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [aiLearning.recipeId],
    references: [recipes.id],
  }),
}));

export const mealSuggestionsRelations = relations(mealSuggestions, ({ one }) => ({
  user: one(users, {
    fields: [mealSuggestions.userId],
    references: [users.id],
  }),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, {
    fields: [userInventory.userId],
    references: [users.id],
  }),
}));

export const purchaseReceiptsRelations = relations(purchaseReceipts, ({ one }) => ({
  user: one(users, {
    fields: [purchaseReceipts.userId],
    references: [users.id],
  }),
}));

// Export insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserInventorySchema = createInsertSchema(userInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeRatingSchema = createInsertSchema(recipeRatings).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseReceiptSchema = createInsertSchema(purchaseReceipts).omit({
  id: true,
  createdAt: true,
});

export const insertAiLearningSchema = createInsertSchema(aiLearning).omit({
  id: true,
  createdAt: true,
});

export const insertMealSuggestionsSchema = createInsertSchema(mealSuggestions).omit({
  id: true,
  createdAt: true,
});

// Plan limits constants
export const PLAN_LIMITS = {
  free: {
    maxRecipes: 50,
    maxShoppingLists: 5,
    features: ['basic_recipes', 'basic_meal_planning']
  },
  pro: {
    maxRecipes: -1, // unlimited
    maxShoppingLists: -1, // unlimited  
    features: ['unlimited_recipes', 'ai_recommendations', 'advanced_meal_planning', 'nutritional_analysis', 'recipe_import', 'family_sharing_4']
  },
  family: {
    maxRecipes: -1, // unlimited
    maxShoppingLists: -1, // unlimited
    features: ['everything_in_pro', 'unlimited_family_members', 'kids_cooking_mode', 'dietary_restriction_management', 'priority_support']
  }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Export types
// Dietary and cuisine preference constants
export const DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan', 
  'gluten-free',
  'dairy-free',
  'keto',
  'paleo',
  'low-carb',
  'low-fat',
  'low-sodium',
  'sugar-free',
  'kosher',
  'halal',
  'pescatarian',
  'raw-food',
  'whole30',
  'mediterranean',
  'diabetic-friendly'
] as const;

export const COMMON_ALLERGIES = [
  'peanuts',
  'tree-nuts',
  'milk',
  'eggs', 
  'wheat',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'sulfites',
  'corn',
  'coconut'
] as const;

export const CUISINE_TYPES = [
  'american',
  'italian',
  'mexican',
  'chinese',
  'japanese',
  'thai',
  'indian',
  'french',
  'mediterranean',
  'greek',
  'korean',
  'vietnamese',
  'spanish',
  'german',
  'british',
  'middle-eastern',
  'african',
  'caribbean',
  'latin-american',
  'scandinavian'
] as const;

export const COOKING_GOALS = [
  'lose-weight',
  'gain-muscle',
  'eat-healthier',
  'save-money',
  'save-time',
  'learn-new-cuisines',
  'cook-for-family',
  'meal-prep',
  'special-occasions',
  'dietary-restrictions'
] as const;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type WastedItem = typeof wastedItems.$inferSelect;
export type InsertWastedItem = typeof wastedItems.$inferInsert;
export type UsedItem = typeof usedItems.$inferSelect;
export type InsertUsedItem = typeof usedItems.$inferInsert;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipeRating = z.infer<typeof insertRecipeRatingSchema>;
export type RecipeRating = typeof recipeRatings.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;
export type InsertPurchaseReceipt = z.infer<typeof insertPurchaseReceiptSchema>;
export type PurchaseReceipt = typeof purchaseReceipts.$inferSelect;
export type InsertAiLearning = z.infer<typeof insertAiLearningSchema>;
export type AiLearning = typeof aiLearning.$inferSelect;
export type InsertMealSuggestions = z.infer<typeof insertMealSuggestionsSchema>;
export type MealSuggestions = typeof mealSuggestions.$inferSelect;
