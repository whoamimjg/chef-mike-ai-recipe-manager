import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChefHat, 
  Calendar as CalendarIcon, 
  ShoppingCart, 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Grid,
  List,
  Clock,
  Users,
  Star,
  Brain,
  Download,
  Upload,
  Package,
  Sparkles,
  Wand2,
  Filter,
  X
} from "lucide-react";
import type { Recipe, MealPlan, ShoppingList, UserPreferences, UserInventory } from "@shared/schema";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("recipes");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({ name: "", quantity: "", unit: "", category: "" });
  const [recipeIngredients, setRecipeIngredients] = useState([{ unit: '', amount: '', item: '', notes: '' }]);
  const [recipeInstructions, setRecipeInstructions] = useState(['']);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMealType, setFilterMealType] = useState('');
  const [imageOption, setImageOption] = useState('upload'); // 'upload' or 'url'
  const [imageUrl, setImageUrl] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch recipes
  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    retry: false,
  });

  // Fetch meal plans
  const { data: mealPlans = [], isLoading: mealPlansLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
    retry: false,
  });

  // Fetch shopping lists
  const { data: shoppingLists = [], isLoading: shoppingListsLoading } = useQuery<ShoppingList[]>({
    queryKey: ["/api/shopping-lists"],
    retry: false,
  });

  // Fetch user preferences
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
    retry: false,
  });

  // Fetch user inventory
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<UserInventory[]>({
    queryKey: ["/api/inventory"],
    retry: false,
  });

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await apiRequest("POST", "/api/recipes", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsAddRecipeOpen(false);
      resetRecipeForm();
      toast({
        title: "Success",
        description: "Recipe created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      await apiRequest("DELETE", `/api/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Success",
        description: "Recipe deleted successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  // Generate shopping list mutation
  const generateShoppingListMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; name: string }) => {
      await apiRequest("POST", "/api/shopping-lists/generate", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({
        title: "Success",
        description: "Shopping list generated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate shopping list",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Add inventory item mutation
  const addInventoryMutation = useMutation({
    mutationFn: async (itemData: { name: string; quantity: string; unit: string; category: string }) => {
      await apiRequest("POST", "/api/inventory", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsAddInventoryOpen(false);
      setNewInventoryItem({ name: "", quantity: "", unit: "", category: "" });
      toast({
        title: "Success",
        description: "Inventory item added successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive",
      });
    },
  });

  // AI recipe generation mutation
  const generateAIRecipeMutation = useMutation({
    mutationFn: async (requestData: { preferences?: UserPreferences; inventory: UserInventory[]; mealType: string }) => {
      const response = await apiRequest("POST", "/api/recommendations", requestData);
      return response;
    },
    onSuccess: (recommendations) => {
      toast({
        title: "Success",
        description: "AI recipe recommendations generated!",
      });
      // You could add logic here to display recommendations in a modal or panel
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate AI recommendations",
        variant: "destructive",
      });
    },
  });

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { unit: '', amount: '', item: '', notes: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (recipeIngredients.length > 1) {
      setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const addInstruction = () => {
    setRecipeInstructions([...recipeInstructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (recipeInstructions.length > 1) {
      setRecipeInstructions(recipeInstructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...recipeInstructions];
    updated[index] = value;
    setRecipeInstructions(updated);
  };

  const resetRecipeForm = () => {
    setRecipeIngredients([{ unit: '', amount: '', item: '', notes: '' }]);
    setRecipeInstructions(['']);
    setSelectedCuisine('');
    setSelectedMealType('');
    setImageOption('upload');
    setImageUrl('');
  };

  const handleAddRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // Filter out empty ingredients and instructions
    const validIngredients = recipeIngredients.filter(ing => ing.item.trim());
    const validInstructions = recipeInstructions.filter(inst => inst.trim());
    
    formData.set("ingredients", JSON.stringify(validIngredients));
    formData.set("instructions", JSON.stringify(validInstructions));
    formData.set("cuisine", selectedCuisine);
    formData.set("mealType", selectedMealType);
    formData.set("tags", JSON.stringify([]));

    // Handle image URL if selected
    if (imageOption === 'url' && imageUrl.trim()) {
      formData.set("imageUrl", imageUrl);
    }

    createRecipeMutation.mutate(formData);
  };

  const handleDeleteRecipe = (recipeId: number) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCuisine = !filterCuisine || recipe.cuisine === filterCuisine;
    const matchesMealType = !filterMealType || recipe.mealType === filterMealType;
    
    return matchesSearch && matchesCuisine && matchesMealType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading your kitchen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Chef Mike's Culinary Classroom</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={activeTab === "recipes" ? "default" : "ghost"}
                onClick={() => setActiveTab("recipes")}
                className="flex items-center gap-2"
              >
                <ChefHat className="h-4 w-4" />
                Recipes
              </Button>
              <Button
                variant={activeTab === "ai-generator" ? "default" : "ghost"}
                onClick={() => setActiveTab("ai-generator")}
                className="flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                AI Generator
              </Button>
              <Button
                variant={activeTab === "inventory" ? "default" : "ghost"}
                onClick={() => setActiveTab("inventory")}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Inventory
              </Button>
              <Button
                variant={activeTab === "meal-planner" ? "default" : "ghost"}
                onClick={() => setActiveTab("meal-planner")}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Meal Planner
              </Button>
              <Button
                variant={activeTab === "shopping-list" ? "default" : "ghost"}
                onClick={() => setActiveTab("shopping-list")}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Shopping List
              </Button>
              <Button
                variant={activeTab === "account" ? "default" : "ghost"}
                onClick={() => setActiveTab("account")}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Account
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-600">Welcome, {user?.firstName || 'Chef'}!</span>
              <Avatar>
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || 'C'}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          
          {/* Recipe Management */}
          <TabsContent value="recipes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <ChefHat className="h-8 w-8" />
                  My Recipes
                </h1>
                <p className="text-gray-600">Organize your favorite recipes and build your culinary collection</p>
              </div>
            </div>

            {/* Search and Controls */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-80"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Dialog open={isAddRecipeOpen} onOpenChange={setIsAddRecipeOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Recipe
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                          <ChefHat className="h-6 w-6" />
                          Create New Recipe
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddRecipe} className="space-y-6">
                        {/* Basic Information */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="title">Recipe Title *</Label>
                              <Input id="title" name="title" placeholder="e.g., Grandma's Chocolate Chip Cookies" required />
                            </div>
                            <div>
                              <Label htmlFor="cuisine">Cuisine Type</Label>
                              <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cuisine..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="italian">Italian</SelectItem>
                                  <SelectItem value="mexican">Mexican</SelectItem>
                                  <SelectItem value="chinese">Chinese</SelectItem>
                                  <SelectItem value="indian">Indian</SelectItem>
                                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                                  <SelectItem value="american">American</SelectItem>
                                  <SelectItem value="french">French</SelectItem>
                                  <SelectItem value="japanese">Japanese</SelectItem>
                                  <SelectItem value="thai">Thai</SelectItem>
                                  <SelectItem value="korean">Korean</SelectItem>
                                  <SelectItem value="middle-eastern">Middle Eastern</SelectItem>
                                  <SelectItem value="fusion">Fusion</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="mealType">Meal Type</Label>
                              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select meal type..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="breakfast">Breakfast</SelectItem>
                                  <SelectItem value="lunch">Lunch</SelectItem>
                                  <SelectItem value="dinner">Dinner</SelectItem>
                                  <SelectItem value="snack">Snack</SelectItem>
                                  <SelectItem value="dessert">Dessert</SelectItem>
                                  <SelectItem value="appetizer">Appetizer</SelectItem>
                                  <SelectItem value="side-dish">Side Dish</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="difficulty">Difficulty</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea 
                              id="description" 
                              name="description" 
                              placeholder="Brief description of your recipe..."
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="prepTime">Prep Time (min)</Label>
                              <Input id="prepTime" name="prepTime" type="number" placeholder="15" />
                            </div>
                            <div>
                              <Label htmlFor="cookTime">Cook Time (min)</Label>
                              <Input id="cookTime" name="cookTime" type="number" placeholder="30" />
                            </div>
                            <div>
                              <Label htmlFor="servings">Servings</Label>
                              <Input id="servings" name="servings" type="number" placeholder="4" />
                            </div>
                          </div>
                        </div>

                        {/* Ingredients Section */}
                        <div className="bg-green-50 p-4 rounded-lg space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
                            <Button type="button" onClick={addIngredient} variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Ingredient
                            </Button>
                          </div>
                          {recipeIngredients.map((ingredient, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-2">
                                <Label htmlFor={`amount-${index}`}>Amount</Label>
                                <Input 
                                  id={`amount-${index}`}
                                  placeholder="1"
                                  value={ingredient.amount}
                                  onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label htmlFor={`unit-${index}`}>Unit</Label>
                                <Select value={ingredient.unit} onValueChange={(value) => updateIngredient(index, 'unit', value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cup">Cup</SelectItem>
                                    <SelectItem value="tbsp">Tablespoon</SelectItem>
                                    <SelectItem value="tsp">Teaspoon</SelectItem>
                                    <SelectItem value="oz">Ounce</SelectItem>
                                    <SelectItem value="lb">Pound</SelectItem>
                                    <SelectItem value="gram">Gram</SelectItem>
                                    <SelectItem value="kg">Kilogram</SelectItem>
                                    <SelectItem value="ml">Milliliter</SelectItem>
                                    <SelectItem value="liter">Liter</SelectItem>
                                    <SelectItem value="piece">Piece</SelectItem>
                                    <SelectItem value="clove">Clove</SelectItem>
                                    <SelectItem value="pinch">Pinch</SelectItem>
                                    <SelectItem value="dash">Dash</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-4">
                                <Label htmlFor={`item-${index}`}>Ingredient *</Label>
                                <Input 
                                  id={`item-${index}`}
                                  placeholder="flour, eggs, milk..."
                                  value={ingredient.item}
                                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                                  required={index === 0}
                                />
                              </div>
                              <div className="col-span-3">
                                <Label htmlFor={`notes-${index}`}>Notes</Label>
                                <Input 
                                  id={`notes-${index}`}
                                  placeholder="optional notes..."
                                  value={ingredient.notes}
                                  onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                                />
                              </div>
                              <div className="col-span-1">
                                <Button 
                                  type="button" 
                                  onClick={() => removeIngredient(index)}
                                  variant="outline" 
                                  size="sm"
                                  disabled={recipeIngredients.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Instructions Section */}
                        <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Instructions</h3>
                            <Button type="button" onClick={addInstruction} variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Step
                            </Button>
                          </div>
                          {recipeInstructions.map((instruction, index) => (
                            <div key={index} className="flex gap-2 items-start">
                              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                                {index + 1}
                              </div>
                              <Textarea 
                                placeholder={`Step ${index + 1}: Describe what to do...`}
                                value={instruction}
                                onChange={(e) => updateInstruction(index, e.target.value)}
                                rows={2}
                                className="flex-1"
                                required={index === 0}
                              />
                              <Button 
                                type="button" 
                                onClick={() => removeInstruction(index)}
                                variant="outline" 
                                size="sm"
                                disabled={recipeInstructions.length === 1}
                                className="mt-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Image Section */}
                        <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Recipe Image</h3>
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <Button 
                                type="button"
                                variant={imageOption === 'upload' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImageOption('upload')}
                              >
                                Upload Image
                              </Button>
                              <Button 
                                type="button"
                                variant={imageOption === 'url' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setImageOption('url')}
                              >
                                Image URL
                              </Button>
                            </div>
                            {imageOption === 'upload' ? (
                              <Input id="image" name="image" type="file" accept="image/*" />
                            ) : (
                              <Input 
                                placeholder="https://example.com/recipe-image.jpg"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => {
                            setIsAddRecipeOpen(false);
                            resetRecipeForm();
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createRecipeMutation.isPending} className="min-w-32">
                            {createRecipeMutation.isPending ? (
                              <>
                                <ChefHat className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Recipe
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-4">
                  <p className="text-primary-600 font-medium">
                    {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recipe Grid with Sidebar */}
            <div className="flex gap-6">
              {/* Left Sidebar - Filters */}
              <div className="w-64 flex-shrink-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filter Recipes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Cuisine Filter */}
                    <div>
                      <Label className="text-sm font-medium">Cuisine Type</Label>
                      <Select value={filterCuisine} onValueChange={setFilterCuisine}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="All cuisines" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Cuisines</SelectItem>
                          <SelectItem value="italian">Italian</SelectItem>
                          <SelectItem value="mexican">Mexican</SelectItem>
                          <SelectItem value="chinese">Chinese</SelectItem>
                          <SelectItem value="indian">Indian</SelectItem>
                          <SelectItem value="mediterranean">Mediterranean</SelectItem>
                          <SelectItem value="american">American</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                          <SelectItem value="thai">Thai</SelectItem>
                          <SelectItem value="korean">Korean</SelectItem>
                          <SelectItem value="middle-eastern">Middle Eastern</SelectItem>
                          <SelectItem value="fusion">Fusion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Meal Type Filter */}
                    <div>
                      <Label className="text-sm font-medium">Meal Time</Label>
                      <Select value={filterMealType} onValueChange={setFilterMealType}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="All meal times" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Meal Times</SelectItem>
                          <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                          <SelectItem value="lunch">☀️ Lunch</SelectItem>
                          <SelectItem value="dinner">🌙 Dinner</SelectItem>
                          <SelectItem value="snack">🍎 Snacks</SelectItem>
                          <SelectItem value="dessert">🍰 Dessert</SelectItem>
                          <SelectItem value="appetizer">🥗 Appetizer</SelectItem>
                          <SelectItem value="side-dish">🥘 Side Dish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    {(filterCuisine || filterMealType) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setFilterCuisine('');
                          setFilterMealType('');
                        }}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}

                    {/* Recipe Count */}
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">{filteredRecipes.length}</span> recipe{filteredRecipes.length !== 1 ? 's' : ''} found
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="flex-1">
                {recipesLoading ? (
                  <div className="text-center py-12">
                    <ChefHat className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
                    <p className="text-gray-600">Loading recipes...</p>
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No recipes found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery || filterCuisine || filterMealType ? "Try adjusting your search or filters" : "Start building your recipe collection"}
                      </p>
                      <Button onClick={() => setIsAddRecipeOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Your First Recipe
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
              <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                {filteredRecipes.map((recipe: Recipe) => (
                  <Card key={recipe.id} className="hover:shadow-lg transition-shadow duration-300">
                    {recipe.imageUrl && (
                      <img 
                        src={recipe.imageUrl} 
                        alt={recipe.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        {recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {recipe.servings} servings
                          </span>
                        )}
                        {recipe.prepTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {recipe.prepTime} min prep
                          </span>
                        )}
                        {recipe.cookTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {recipe.cookTime} min cook
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          disabled={deleteRecipeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* AI Recipe Generator */}
          <TabsContent value="ai-generator" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Wand2 className="h-8 w-8" />
                  AI Recipe Generator
                </h1>
                <p className="text-gray-600">Generate personalized recipes based on your preferences and available ingredients</p>
              </div>
            </div>

            {/* AI Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Recipe Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="mealType">Meal Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cuisine">Cuisine Preference</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any cuisine..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="italian">Italian</SelectItem>
                        <SelectItem value="mexican">Mexican</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="indian">Indian</SelectItem>
                        <SelectItem value="mediterranean">Mediterranean</SelectItem>
                        <SelectItem value="american">American</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Available Ingredients</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    {inventory.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {inventory.map((item) => (
                          <Badge key={item.id} variant="secondary" className="bg-green-100 text-green-800">
                            {item.name} ({item.quantity} {item.unit})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No ingredients in your inventory. Add items in the Inventory tab to get personalized recommendations.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Dietary Preferences</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    {preferences ? (
                      <div className="space-y-2">
                        {preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Restrictions: </span>
                            <span className="text-sm text-gray-600">{preferences.dietaryRestrictions.join(', ')}</span>
                          </div>
                        )}
                        {preferences.allergies && preferences.allergies.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Allergies: </span>
                            <span className="text-sm text-gray-600">{preferences.allergies.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        Set up your dietary preferences in the Account tab for better recommendations.
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => generateAIRecipeMutation.mutate({ 
                    preferences, 
                    inventory, 
                    mealType: 'dinner' 
                  })}
                  disabled={generateAIRecipeMutation.isPending}
                  className="w-full flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {generateAIRecipeMutation.isPending ? 'Generating...' : 'Generate AI Recipes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Household Inventory */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Package className="h-8 w-8" />
                  Household Inventory
                </h1>
                <p className="text-gray-600">Manage your pantry and ingredient inventory for better meal planning</p>
              </div>
            </div>

            {/* Add Inventory Item */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Inventory Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addInventoryMutation.mutate(newInventoryItem);
                  }}
                  className="space-y-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="itemName">Item Name</Label>
                      <Input
                        id="itemName"
                        value={newInventoryItem.name}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})}
                        placeholder="e.g., Tomatoes, Chicken Breast"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={newInventoryItem.category} onValueChange={(value) => setNewInventoryItem({...newInventoryItem, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="produce">Produce</SelectItem>
                          <SelectItem value="meat">Meat & Poultry</SelectItem>
                          <SelectItem value="dairy">Dairy</SelectItem>
                          <SelectItem value="pantry">Pantry Staples</SelectItem>
                          <SelectItem value="spices">Spices & Herbs</SelectItem>
                          <SelectItem value="frozen">Frozen</SelectItem>
                          <SelectItem value="beverages">Beverages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        value={newInventoryItem.quantity}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: e.target.value})}
                        placeholder="e.g., 2, 1.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={newInventoryItem.unit} onValueChange={(value) => setNewInventoryItem({...newInventoryItem, unit: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="lbs">Pounds</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="oz">Ounces</SelectItem>
                          <SelectItem value="cups">Cups</SelectItem>
                          <SelectItem value="tbsp">Tablespoons</SelectItem>
                          <SelectItem value="tsp">Teaspoons</SelectItem>
                          <SelectItem value="ml">Milliliters</SelectItem>
                          <SelectItem value="l">Liters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={addInventoryMutation.isPending}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {addInventoryMutation.isPending ? 'Adding...' : 'Add to Inventory'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Current Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryLoading ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading inventory...</p>
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Your inventory is empty</h3>
                    <p className="text-gray-600">Start adding ingredients to get personalized recipe recommendations!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {['produce', 'meat', 'dairy', 'pantry', 'spices', 'frozen', 'beverages'].map((category) => {
                      const categoryItems = inventory.filter(item => item.category === category);
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <div key={category} className="border-b pb-4 last:border-b-0">
                          <h4 className="font-semibold text-lg text-gray-900 mb-3 capitalize">
                            {category === 'meat' ? 'Meat & Poultry' : category === 'spices' ? 'Spices & Herbs' : category}
                          </h4>
                          <div className="grid md:grid-cols-3 gap-3">
                            {categoryItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">{item.quantity} {item.unit}</div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meal Planning */}
          <TabsContent value="meal-planner" className="space-y-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CalendarIcon className="h-8 w-8" />
              Meal Planner
            </h1>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Select Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {/* Daily Meal Plan */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Meals for {selectedDate.toLocaleDateString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Breakfast */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">🌅 Breakfast</h4>
                        <Select>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add recipe..." />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe: Recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        No breakfast planned
                      </div>
                    </div>

                    {/* Lunch */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">☀️ Lunch</h4>
                        <Select>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add recipe..." />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe: Recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        No lunch planned
                      </div>
                    </div>

                    {/* Dinner */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">🌙 Dinner</h4>
                        <Select>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add recipe..." />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe: Recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        No dinner planned
                      </div>
                    </div>

                    {/* Snacks */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">🍎 Snacks</h4>
                        <Select>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add recipe..." />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe: Recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                {recipe.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                        No snacks planned
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Shopping List */}
          <TabsContent value="shopping-list" className="space-y-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Shopping List
            </h1>
            
            {/* Generate Shopping List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Generate Shopping List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button variant="outline">Next 7 Days</Button>
                  <Button>Next 2 Weeks</Button>
                  <Button variant="outline">Next Month</Button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="startDate">From Date</Label>
                    <Input type="date" id="startDate" />
                  </div>
                  <div>
                    <Label htmlFor="endDate">To Date</Label>
                    <Input type="date" id="endDate" />
                  </div>
                  <div>
                    <Label htmlFor="listName">List Name</Label>
                    <Input id="listName" placeholder="Weekly Shopping List" />
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    const today = new Date();
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    
                    generateShoppingListMutation.mutate({
                      startDate: today.toISOString().split('T')[0],
                      endDate: nextWeek.toISOString().split('T')[0],
                      name: "Weekly Shopping List"
                    });
                  }}
                  disabled={generateShoppingListMutation.isPending}
                >
                  {generateShoppingListMutation.isPending ? "Generating..." : "Generate Shopping List"}
                </Button>
              </CardContent>
            </Card>

            {/* Shopping Lists */}
            {shoppingListsLoading ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
                <p className="text-gray-600">Loading shopping lists...</p>
              </div>
            ) : shoppingLists.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No shopping lists yet</h3>
                  <p className="text-gray-600">Generate your first shopping list from your meal plans</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {shoppingLists.map((list: ShoppingList) => (
                  <Card key={list.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{list.name}</CardTitle>
                        <Badge variant="secondary">
                          {list.items.length} items
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Group items by category */}
                        {Object.entries(
                          list.items.reduce((acc, item) => {
                            const category = item.category || "Other";
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(item);
                            return acc;
                          }, {} as Record<string, typeof list.items>)
                        ).map(([category, items]) => (
                          <div key={category}>
                            <h4 className="font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg mb-3">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                                  <Checkbox checked={item.checked} />
                                  <div className={`flex-1 ${item.checked ? "opacity-50 line-through" : ""}`}>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-8 w-8" />
              Account Settings
            </h1>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg">
                      {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg">{user?.email}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800">
                      <strong>Demo Mode:</strong> This is a demonstration version. In production, you would be able to edit your profile information here.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Dietary Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Dietary Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Dietary Restrictions</Label>
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="Add dietary restriction" className="flex-1" />
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {preferences?.dietaryRestrictions?.map((restriction, index) => (
                        <Badge key={index} variant="secondary" className="gap-2">
                          {restriction}
                          <button className="text-gray-500 hover:text-gray-700">×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Allergies</Label>
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="Add allergy" className="flex-1" />
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {preferences?.allergies?.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="gap-2">
                          {allergy}
                          <button className="text-red-100 hover:text-white">×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full">
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Export */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </h4>
                    <p className="text-gray-600 text-sm mb-4">
                      Download all your recipes, meal plans, and preferences as a JSON file.
                    </p>
                    <Button variant="outline" className="w-full">
                      Download Backup
                    </Button>
                  </div>
                  
                  {/* Import */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import Data
                    </h4>
                    <p className="text-gray-600 text-sm mb-4">
                      Restore your data from a previously exported JSON file.
                    </p>
                    <Textarea 
                      placeholder="Paste your exported JSON data here..." 
                      rows={4} 
                      className="mb-3"
                    />
                    <Button variant="destructive" className="w-full">
                      Import Data (Replaces Current)
                    </Button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <p className="text-yellow-800">
                    <strong>⚠️ Important:</strong> Importing data will completely replace all your current recipes, meal plans, and preferences. Make sure to export a backup first!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
