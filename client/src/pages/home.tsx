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
  Upload
} from "lucide-react";
import type { Recipe, MealPlan, ShoppingList, UserPreferences } from "@shared/schema";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("recipes");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);

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

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await apiRequest("POST", "/api/recipes", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsAddRecipeOpen(false);
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

  const handleAddRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // Parse ingredients and instructions from textarea
    const ingredientsText = formData.get("ingredients") as string;
    const instructionsText = formData.get("instructions") as string;
    
    const ingredients = ingredientsText.split('\n').filter(item => item.trim());
    const instructions = instructionsText.split('\n').filter(item => item.trim());
    
    formData.set("ingredients", JSON.stringify(ingredients));
    formData.set("instructions", JSON.stringify(instructions));
    formData.set("tags", JSON.stringify([]));

    createRecipeMutation.mutate(formData);
  };

  const handleDeleteRecipe = (recipeId: number) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  const filteredRecipes = recipes.filter((recipe: Recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Recipe</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddRecipe} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="title">Recipe Title</Label>
                            <Input id="title" name="title" required />
                          </div>
                          <div>
                            <Label htmlFor="cuisine">Cuisine</Label>
                            <Input id="cuisine" name="cuisine" />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" name="description" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="prepTime">Prep Time (min)</Label>
                            <Input id="prepTime" name="prepTime" type="number" />
                          </div>
                          <div>
                            <Label htmlFor="cookTime">Cook Time (min)</Label>
                            <Input id="cookTime" name="cookTime" type="number" />
                          </div>
                          <div>
                            <Label htmlFor="servings">Servings</Label>
                            <Input id="servings" name="servings" type="number" />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="ingredients">Ingredients (one per line)</Label>
                          <Textarea 
                            id="ingredients" 
                            name="ingredients" 
                            placeholder="1 cup flour&#10;2 eggs&#10;1/2 cup milk"
                            rows={6}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="instructions">Instructions (one per line)</Label>
                          <Textarea 
                            id="instructions" 
                            name="instructions" 
                            placeholder="Mix dry ingredients&#10;Add wet ingredients&#10;Bake for 30 minutes"
                            rows={6}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="image">Recipe Image</Label>
                          <Input id="image" name="image" type="file" accept="image/*" />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddRecipeOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createRecipeMutation.isPending}>
                            {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
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

            {/* Recipe Grid */}
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
                    {searchQuery ? "Try adjusting your search terms" : "Start building your recipe collection"}
                  </p>
                  <Button onClick={() => setIsAddRecipeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
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
