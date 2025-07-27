import { v4 as uuidv4 } from 'uuid';

class DataService {
  constructor() {
    this.storageKey = 'chef-mikes-data';
    this.data = {
      recipes: [],
      mealPlans: [],
      userPreferences: {
        dietary_restrictions: [],
        allergies: []
      }
    };
  }

  async initialize() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      // Start with empty data if loading fails
    }
  }

  _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }

  // Recipe methods
  async getRecipes() {
    return [...this.data.recipes];
  }

  async getRecipe(id) {
    return this.data.recipes.find(recipe => recipe.id === id);
  }

  async addRecipe(recipeData) {
    const recipe = {
      id: uuidv4(),
      ...recipeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.data.recipes.push(recipe);
    this._save();
    return recipe;
  }

  async updateRecipe(id, updates) {
    const index = this.data.recipes.findIndex(recipe => recipe.id === id);
    if (index === -1) {
      throw new Error('Recipe not found');
    }
    
    this.data.recipes[index] = {
      ...this.data.recipes[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this._save();
    return this.data.recipes[index];
  }

  async deleteRecipe(id) {
    const index = this.data.recipes.findIndex(recipe => recipe.id === id);
    if (index === -1) {
      throw new Error('Recipe not found');
    }
    
    this.data.recipes.splice(index, 1);
    
    // Also remove any meal plans using this recipe
    this.data.mealPlans = this.data.mealPlans.filter(plan => plan.recipe_id !== id);
    
    this._save();
    return true;
  }

  // Meal plan methods
  async getMealPlans() {
    return [...this.data.mealPlans];
  }

  async getMealPlansForDateRange(startDate, endDate) {
    return this.data.mealPlans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate >= new Date(startDate) && planDate <= new Date(endDate);
    });
  }

  async addMealPlan(mealPlanData) {
    const mealPlan = {
      id: uuidv4(),
      ...mealPlanData,
      created_at: new Date().toISOString()
    };
    
    this.data.mealPlans.push(mealPlan);
    this._save();
    return mealPlan;
  }

  async updateMealPlan(id, updates) {
    const index = this.data.mealPlans.findIndex(plan => plan.id === id);
    if (index === -1) {
      throw new Error('Meal plan not found');
    }
    
    this.data.mealPlans[index] = {
      ...this.data.mealPlans[index],
      ...updates
    };
    
    this._save();
    return this.data.mealPlans[index];
  }

  async deleteMealPlan(id) {
    const index = this.data.mealPlans.findIndex(plan => plan.id === id);
    if (index === -1) {
      throw new Error('Meal plan not found');
    }
    
    this.data.mealPlans.splice(index, 1);
    this._save();
    return true;
  }

  // Shopping list methods
  async generateShoppingList(startDate, endDate) {
    const mealPlans = await this.getMealPlansForDateRange(startDate, endDate);
    const ingredientMap = new Map();
    
    for (const plan of mealPlans) {
      const recipe = await this.getRecipe(plan.recipe_id);
      if (recipe && recipe.ingredients) {
        for (const ingredient of recipe.ingredients) {
          if (ingredient.notes === 'header') continue; // Skip header rows
          
          const key = `${ingredient.item}|${ingredient.unit || ''}`;
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            const newAmount = parseFloat(ingredient.amount || 0);
            const existingAmount = parseFloat(existing.amount || 0);
            existing.amount = (existingAmount + newAmount).toString();
            existing.recipes.push(recipe.title);
          } else {
            ingredientMap.set(key, {
              item: ingredient.item,
              amount: ingredient.amount || '',
              unit: ingredient.unit || '',
              notes: ingredient.notes || '',
              recipes: [recipe.title],
              checked: false
            });
          }
        }
      }
    }
    
    return Array.from(ingredientMap.values());
  }

  // User preferences methods
  async getUserPreferences() {
    return { ...this.data.userPreferences };
  }

  async updateUserPreferences(preferences) {
    this.data.userPreferences = {
      ...this.data.userPreferences,
      ...preferences
    };
    this._save();
    return this.data.userPreferences;
  }

  // Image processing utility
  async processImage(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize to max width 800px while maintaining aspect ratio
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('Failed to process image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // URL image processing
  async processImageUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize to max width 800px while maintaining aspect ratio
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };
      
      img.onerror = () => resolve(url); // Return original URL if processing fails
      img.src = url;
    });
  }

  // Search and filter utilities
  searchRecipes(query) {
    if (!query.trim()) return this.getRecipes();
    
    const searchTerm = query.toLowerCase();
    return this.data.recipes.filter(recipe => 
      recipe.title.toLowerCase().includes(searchTerm) ||
      recipe.description?.toLowerCase().includes(searchTerm) ||
      recipe.ingredients?.some(ing => ing.item.toLowerCase().includes(searchTerm))
    );
  }

  filterRecipesByCategory(category) {
    if (!category) return this.getRecipes();
    // This could be extended with recipe categories in the future
    return this.getRecipes();
  }

  // Export/Import functionality
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      this.data = {
        recipes: imported.recipes || [],
        mealPlans: imported.mealPlans || [],
        userPreferences: imported.userPreferences || {
          dietary_restrictions: [],
          allergies: []
        }
      };
      this._save();
      return true;
    } catch (error) {
      throw new Error('Invalid data format');
    }
  }
}

// Create and export singleton instance
export const dataService = new DataService();