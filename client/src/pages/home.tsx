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
  Edit2,
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
  X,
  Link,
  FileText,
  Import,
  Eye,
  Lightbulb,
  ImageIcon,
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Timer,
  Pause,
  RotateCcw
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
  const [mealPlannerView, setMealPlannerView] = useState<'day' | 'week' | 'month'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  });
  const [mealPlanData, setMealPlanData] = useState<Record<string, Record<string, any>>>({});
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({ 
    name: "", 
    quantity: "", 
    unit: "", 
    category: "", 
    upcBarcode: "", 
    pricePerUnit: "", 
    totalCost: "",
    expiryDate: ""
  });
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [isReceiptScanning, setIsReceiptScanning] = useState(false);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [spendingReport, setSpendingReport] = useState<any>(null);
  const [recipeIngredients, setRecipeIngredients] = useState([{ unit: '', amount: '', item: '', notes: '' }]);
  const [recipeInstructions, setRecipeInstructions] = useState(['']);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMealType, setFilterMealType] = useState('');
  const [imageOption, setImageOption] = useState('upload'); // 'upload' or 'url'
  const [minRating, setMinRating] = useState<number | undefined>();
  const [maxRating, setMaxRating] = useState<number | undefined>();
  const [selectedRecipeRating, setSelectedRecipeRating] = useState<number>(0);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [recipeToRate, setRecipeToRate] = useState<Recipe | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importProgress, setImportProgress] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

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

  // Fetch recipes with search and rating filters
  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes", { search: searchQuery, minRating, maxRating }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (minRating) params.append('minRating', minRating.toString());
      if (maxRating) params.append('maxRating', maxRating.toString());
      
      const query = params.toString();
      const url = query ? `/api/recipes?${query}` : '/api/recipes';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }
      
      return response.json();
    },
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

  // Add inventory item mutation
  const addInventoryMutation = useMutation({
    mutationFn: async (itemData: { 
      ingredientName: string; 
      quantity: string; 
      unit: string; 
      category: string;
      upcBarcode?: string;
      pricePerUnit?: string;
      totalCost?: string;
      expiryDate?: string;
    }) => {
      await apiRequest("POST", "/api/inventory", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setNewInventoryItem({ 
        name: "", 
        quantity: "", 
        unit: "", 
        category: "", 
        upcBarcode: "", 
        pricePerUnit: "", 
        totalCost: "",
        expiryDate: ""
      });
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

  // Mark item as wasted mutation
  const markWastedMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("POST", `/api/inventory/${itemId}/mark-wasted`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Marked as Wasted",
        description: "Item has been marked as wasted for cost tracking",
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
        description: "Failed to mark item as wasted",
        variant: "destructive",
      });
    },
  });

  // Add meal plan mutation
  const addMealPlanMutation = useMutation({
    mutationFn: async (data: { recipeId: number; date: string; mealType: string }) => {
      return await apiRequest("POST", "/api/meal-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
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
      console.error("Failed to add meal plan:", error);
    }
  });

  // Mark item as used mutation
  const markUsedMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("PATCH", `/api/inventory/${itemId}/used`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Marked as Used",
        description: "Item has been removed from inventory",
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
        description: "Failed to mark item as used",
        variant: "destructive",
      });
    },
  });

  // Delete inventory item mutation
  const deleteInventoryMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("DELETE", `/api/inventory/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Deleted",
        description: "Item has been removed from inventory",
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
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Check for missing ingredients and add to shopping list
  const checkMissingIngredients = async (recipe: any) => {
    try {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) return;
      
      const missingItems: string[] = [];
      
      // Check each recipe ingredient against inventory
      recipe.ingredients.forEach((ingredient: any) => {
        const ingredientName = ingredient.item?.toLowerCase() || '';
        const hasInInventory = inventory?.some(inv => 
          inv.ingredientName.toLowerCase().includes(ingredientName) ||
          ingredientName.includes(inv.ingredientName.toLowerCase())
        );
        
        if (!hasInInventory && ingredientName) {
          missingItems.push(ingredient.item);
        }
      });
      
      // Add missing items to shopping list if any
      if (missingItems.length > 0) {
        const existingList = shoppingLists?.[0];
        if (existingList) {
          // Update existing shopping list
          const currentItems = existingList.items || [];
          const newItems = missingItems.map(item => ({ 
            item, 
            amount: '1', 
            unit: 'item',
            notes: `Added from ${recipe.title}`
          }));
          
          await apiRequest("PUT", `/api/shopping-lists/${existingList.id}`, {
            items: [...currentItems, ...newItems]
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
          
          toast({
            title: "Missing Ingredients Added",
            description: `${missingItems.length} missing ingredients added to shopping list`,
          });
        } else {
          // Create new shopping list
          await apiRequest("POST", "/api/shopping-lists", {
            name: `Ingredients for ${recipe.title}`,
            items: missingItems.map(item => ({ 
              item, 
              amount: '1', 
              unit: 'item',
              notes: `From ${recipe.title}`
            }))
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
          
          toast({
            title: "Shopping List Created",
            description: `New shopping list created with ${missingItems.length} ingredients`,
          });
        }
      }
    } catch (error) {
      console.error('Error checking missing ingredients:', error);
    }
  };

  const handleProcessReceipt = async (items: any[]) => {
    // This would process the receipt items and add them to inventory
    setIsReceiptScanning(false);
    toast({
      title: "Demo Mode",
      description: "Receipt processing would add multiple items to inventory with cost tracking",
    });
  };

  // Receipt scanning mutation
  const receiptMutation = useMutation({
    mutationFn: async (receiptData: { storeName: string; purchaseDate: string; totalAmount: number; items: any[] }) => {
      await apiRequest("POST", "/api/receipts", receiptData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      setIsReceiptScanning(false);
      setReceiptItems([]);
      toast({
        title: "Success",
        description: "Receipt processed and items added to inventory!",
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
        description: "Failed to process receipt",
        variant: "destructive",
      });
    },
  });



  // Fetch spending report
  const { data: reports } = useQuery({
    queryKey: ["/api/reports/spending"],
    queryFn: () => fetch("/api/reports/spending", { credentials: 'include' }).then(res => res.json()),
    retry: false,
    enabled: isReportsOpen
  });

  // Recipe rating mutation
  const rateRecipeMutation = useMutation({
    mutationFn: async ({ recipeId, rating }: { recipeId: number; rating: number }) => {
      return await apiRequest("POST", `/api/recipes/${recipeId}/rating`, { rating });
    },
    onSuccess: () => {
      // Close dialog and reset state first
      setIsRatingDialogOpen(false);
      setRecipeToRate(null);
      setSelectedRecipeRating(0);
      
      // Then invalidate queries and show success message
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Success",
        description: "Recipe rated successfully!",
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
        description: "Failed to rate recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enhanced AI recipe generation mutation
  const generateAIRecipeMutation = useMutation({
    mutationFn: async (requestData: { preferences?: UserPreferences; inventory: UserInventory[] }) => {
      const response = await apiRequest("POST", "/api/recommendations", requestData);
      return await response.json();
    },
    onSuccess: (response: any) => {
      // Display smart recommendations with ingredient matching info
      console.log("AI Response received:", response);
      console.log("Response keys:", Object.keys(response || {}));
      
      // Handle different response structures
      let recommendations = [];
      if (response?.recommendations && Array.isArray(response.recommendations)) {
        recommendations = response.recommendations;
      } else if (Array.isArray(response)) {
        recommendations = response;
      } else if (response && typeof response === 'object') {
        // Try to find an array in the response object
        const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          recommendations = possibleArrays[0] as any[];
        }
      }
      
      console.log("Final processed recommendations:", recommendations);
      console.log("Recommendations length:", recommendations.length);
      
      if (recommendations.length > 0) {
        setAiRecommendations(recommendations);
        toast({
          title: "Smart Recommendations Generated!",
          description: `Found ${recommendations.length} personalized recipes based on your inventory and preferences.`,
        });
      } else {
        toast({
          title: "No Recommendations Found",
          description: "Unable to generate recommendations. Try adding more inventory items or check your preferences.",
          variant: "destructive"
        });
      }
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

  // Import from URL mutation
  const importFromUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      setImportProgress('Fetching recipe from URL...');
      const response = await apiRequest("POST", "/api/recipes/import-url", { url });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsImportUrlOpen(false);
      setImportUrl('');
      setImportProgress('');
      toast({
        title: "Success",
        description: "Recipe imported successfully from URL!",
      });
    },
    onError: (error) => {
      setImportProgress('');
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
        description: "Failed to import recipe from URL. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  // Import from CSV mutation
  const importFromCsvMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setImportProgress('Processing CSV file...');
      const response = await apiRequest("POST", "/api/recipes/import-csv", formData);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsImportCsvOpen(false);
      setImportProgress('');
      toast({
        title: "Success",
        description: `Successfully imported ${data.count || 'multiple'} recipes from CSV!`,
      });
    },
    onError: (error) => {
      setImportProgress('');
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
        description: "Failed to import recipes from CSV. Please check the file format and try again.",
        variant: "destructive",
      });
    },
  });

  const handleImportFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    importFromUrlMutation.mutate(importUrl.trim());
  };

  const handleImportFromCsv = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    importFromCsvMutation.mutate(formData);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    // Populate form with recipe data for editing
    setRecipeIngredients(recipe.ingredients || [{ unit: '', amount: '', item: '', notes: '' }]);
    setRecipeInstructions(recipe.instructions || ['']);
    setSelectedCuisine(recipe.cuisine || '');
    setSelectedMealType(recipe.mealType || '');
    setImageUrl(recipe.imageUrl || '');
    setIsAddRecipeOpen(true);
  };

  const handleStartCookingMode = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentStep(0);
    setIsCookingModeOpen(true);
  };

  const nextStep = () => {
    if (selectedRecipe && currentStep < selectedRecipe.instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Timer functionality
  const startTimer = () => {
    if (timerMinutes > 0 || timerSeconds > 0) {
      const totalSeconds = timerMinutes * 60 + timerSeconds;
      setTimeRemaining(totalSeconds);
      setIsTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);
    setTimerMinutes(0);
    setTimerSeconds(0);
  };

  const playTimerSound = () => {
    // Create audio notification
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Repeat the sound 3 times
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(800, audioContext.currentTime);
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.5);
    }, 600);
    
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.setValueAtTime(800, audioContext.currentTime);
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc3.start();
      osc3.stop(audioContext.currentTime + 0.5);
    }, 1200);
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playTimerSound();
            toast({
              title: "Timer Complete!",
              description: "Your cooking timer has finished.",
              duration: 5000,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeRemaining, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteRecipe = (recipeId: number) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCuisine = !filterCuisine || filterCuisine === 'all' || recipe.cuisine === filterCuisine;
    const matchesMealType = !filterMealType || filterMealType === 'all' || recipe.mealType === filterMealType;
    
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
                        placeholder="Search recipes by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-80"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Rating:</Label>
                      <Select value={minRating?.toString() || ""} onValueChange={(value) => setMinRating(value && value !== "none" ? parseInt(value) : undefined)}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any</SelectItem>
                          {[1,2,3,4,5,6,7,8,9,10].map(rating => (
                            <SelectItem key={rating} value={rating.toString()}>{rating}+</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-500">to</span>
                      <Select value={maxRating?.toString() || ""} onValueChange={(value) => setMaxRating(value && value !== "none" ? parseInt(value) : undefined)}>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Max" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any</SelectItem>
                          {[1,2,3,4,5,6,7,8,9,10].map(rating => (
                            <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  
                  <div className="flex gap-2">
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

                  {/* Import from URL Dialog */}
                  <Dialog open={isImportUrlOpen} onOpenChange={setIsImportUrlOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Import from URL
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Link className="h-5 w-5" />
                          Import Recipe from URL
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleImportFromUrl} className="space-y-4">
                        <div>
                          <Label htmlFor="importUrl">Recipe URL</Label>
                          <Input 
                            id="importUrl"
                            placeholder="https://example.com/recipe"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            required
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            Paste a URL from popular recipe sites
                          </p>
                        </div>
                        
                        {importProgress && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                            {importProgress}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setIsImportUrlOpen(false);
                            setImportUrl('');
                            setImportProgress('');
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={importFromUrlMutation.isPending}>
                            {importFromUrlMutation.isPending ? (
                              <>
                                <Import className="h-4 w-4 mr-2 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Import className="h-4 w-4 mr-2" />
                                Import Recipe
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Import from CSV Dialog */}
                  <Dialog open={isImportCsvOpen} onOpenChange={setIsImportCsvOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Import CSV
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Import Recipes from CSV
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleImportFromCsv} className="space-y-4">
                        <div>
                          <Label htmlFor="csvFile">CSV File</Label>
                          <Input 
                            id="csvFile"
                            name="csvFile"
                            type="file"
                            accept=".csv"
                            required
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            Upload a CSV file with recipe data
                          </p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                          <p className="font-medium mb-2">Expected CSV format:</p>
                          <code className="text-xs bg-white p-2 rounded block">
                            title,description,ingredients,instructions,cuisine,prepTime,cookTime,servings
                          </code>
                        </div>
                        
                        {importProgress && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                            {importProgress}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setIsImportCsvOpen(false);
                            setImportProgress('');
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={importFromCsvMutation.isPending}>
                            {importFromCsvMutation.isPending ? (
                              <>
                                <Upload className="h-4 w-4 mr-2 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Import CSV
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>

                {/* Recipe Detail Modal */}
                <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <ChefHat className="h-6 w-6" />
                        {selectedRecipe?.title}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedRecipe && (
                      <div className="space-y-6">
                        {/* Recipe Image */}
                        {selectedRecipe.imageUrl && (
                          <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={selectedRecipe.imageUrl} 
                              alt={selectedRecipe.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Recipe Info */}
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Recipe Details</h3>
                            {selectedRecipe.description && (
                              <p className="text-gray-600 mb-4">{selectedRecipe.description}</p>
                            )}
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-4 text-sm">
                                {selectedRecipe.servings && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {selectedRecipe.servings} servings
                                  </span>
                                )}
                                {selectedRecipe.prepTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {selectedRecipe.prepTime}m prep
                                  </span>
                                )}
                                {selectedRecipe.cookTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {selectedRecipe.cookTime}m cook
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {selectedRecipe.cuisine && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                    {selectedRecipe.cuisine}
                                  </span>
                                )}
                                {selectedRecipe.mealType && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                    {selectedRecipe.mealType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ingredients */}
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                            <div className="space-y-2">
                              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                                selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                    <span>
                                      {ingredient.amount} {ingredient.unit} {ingredient.item}
                                      {ingredient.notes && (
                                        <span className="text-gray-500 ml-1">({ingredient.notes})</span>
                                      )}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-sm">No ingredients listed</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                          <div className="space-y-3">
                            {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                              selectedRecipe.instructions.map((instruction: string, index: number) => (
                                <div key={index} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </span>
                                  <p className="text-gray-700">{instruction}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500">No instructions available</p>
                            )}
                          </div>
                        </div>

                        {/* Nutrition Info */}
                        {selectedRecipe.nutritionInfo && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Nutrition Information</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {selectedRecipe.nutritionInfo.calories && (
                                  <div>
                                    <span className="font-medium">Calories:</span>
                                    <span className="ml-1">{selectedRecipe.nutritionInfo.calories}</span>
                                  </div>
                                )}
                                {selectedRecipe.nutritionInfo.protein && (
                                  <div>
                                    <span className="font-medium">Protein:</span>
                                    <span className="ml-1">{selectedRecipe.nutritionInfo.protein}g</span>
                                  </div>
                                )}
                                {selectedRecipe.nutritionInfo.carbs && (
                                  <div>
                                    <span className="font-medium">Carbs:</span>
                                    <span className="ml-1">{selectedRecipe.nutritionInfo.carbs}g</span>
                                  </div>
                                )}
                                {selectedRecipe.nutritionInfo.fat && (
                                  <div>
                                    <span className="font-medium">Fat:</span>
                                    <span className="ml-1">{selectedRecipe.nutritionInfo.fat}g</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedRecipe.tags.map((tag: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Source URL */}
                        {selectedRecipe.sourceUrl && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Source</h3>
                            <a 
                              href={selectedRecipe.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View Original Recipe
                            </a>
                          </div>
                        )}

                        {/* Kitchen Timer */}
                        <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Timer className="h-4 w-4" />
                              Kitchen Timer
                            </h4>
                            
                            {!isTimerRunning && timeRemaining === 0 ? (
                              <div className="space-y-3">
                                <div className="flex gap-2 items-center">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="99"
                                      value={timerMinutes || ''}
                                      onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-16 text-center"
                                    />
                                    <span className="text-sm text-gray-600">min</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={timerSeconds || ''}
                                      onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-16 text-center"
                                    />
                                    <span className="text-sm text-gray-600">sec</span>
                                  </div>
                                  <Button 
                                    onClick={startTimer}
                                    disabled={timerMinutes === 0 && timerSeconds === 0}
                                    size="sm"
                                  >
                                    Start
                                  </Button>
                                </div>
                                
                                {/* Quick Timer Buttons */}
                                <div className="flex gap-1 flex-wrap">
                                  {[1, 5, 10, 15, 20, 30].map((mins) => (
                                    <Button
                                      key={mins}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setTimerMinutes(mins);
                                        setTimerSeconds(0);
                                      }}
                                      className="text-xs"
                                    >
                                      {mins}m
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center space-y-3">
                                <div className="text-3xl font-mono font-bold text-blue-600">
                                  {formatTime(timeRemaining)}
                                </div>
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    onClick={isTimerRunning ? pauseTimer : startTimer}
                                    variant={isTimerRunning ? "outline" : "default"}
                                    size="sm"
                                  >
                                    {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button onClick={resetTimer} variant="outline" size="sm">
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button 
                            onClick={() => {
                              setIsRecipeModalOpen(false);
                              handleStartCookingMode(selectedRecipe);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Start Cooking
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setIsRecipeModalOpen(false);
                              handleEditRecipe(selectedRecipe);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Recipe
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setIsRecipeModalOpen(false)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Cooking Mode Modal */}
                <Dialog open={isCookingModeOpen} onOpenChange={setIsCookingModeOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Play className="h-6 w-6" />
                        Cooking Mode: {selectedRecipe?.title}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedRecipe && (
                      <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / selectedRecipe.instructions.length) * 100}%` }}
                          ></div>
                        </div>

                        {/* Step Counter */}
                        <div className="text-center">
                          <span className="text-lg font-medium">
                            Step {currentStep + 1} of {selectedRecipe.instructions.length}
                          </span>
                        </div>

                        {/* Current Step */}
                        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                          <div className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                              {currentStep + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-lg text-gray-800 leading-relaxed">
                                {selectedRecipe.instructions[currentStep]}
                              </p>
                            </div>
                          </div>
                        </Card>

                        {/* Ingredients Reference */}
                        <Card className="p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Ingredients Reference
                          </h4>
                          <div className="grid md:grid-cols-2 gap-2 text-sm">
                            {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                <span>
                                  {ingredient.amount} {ingredient.unit} {ingredient.item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Recipe Info and Timer Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          {selectedRecipe.prepTime && (
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <Clock className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                              <div className="font-medium">Prep Time</div>
                              <div className="text-gray-600">{selectedRecipe.prepTime}m</div>
                            </div>
                          )}
                          {selectedRecipe.cookTime && (
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <Clock className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                              <div className="font-medium">Cook Time</div>
                              <div className="text-gray-600">{selectedRecipe.cookTime}m</div>
                            </div>
                          )}
                          {selectedRecipe.servings && (
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <Users className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                              <div className="font-medium">Servings</div>
                              <div className="text-gray-600">{selectedRecipe.servings}</div>
                            </div>
                          )}
                          
                          {/* Compact Timer */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-center">
                              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                              <div className="font-medium text-blue-800">Kitchen Timer</div>
                              {isTimerRunning || timeRemaining > 0 ? (
                                <div className="text-lg font-mono font-bold text-blue-600">
                                  {formatTime(timeRemaining)}
                                </div>
                              ) : (
                                <div className="flex gap-1 mt-1">
                                  {[5, 10, 15].map((mins) => (
                                    <Button
                                      key={mins}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setTimerMinutes(mins);
                                        setTimerSeconds(0);
                                        startTimer();
                                      }}
                                      className="text-xs h-6 px-2"
                                    >
                                      {mins}m
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center pt-4 border-t">
                          <Button 
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="flex items-center gap-2"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous Step
                          </Button>

                          <div className="text-center">
                            {currentStep === selectedRecipe.instructions.length - 1 ? (
                              <Button 
                                onClick={() => setIsCookingModeOpen(false)}
                                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Cooking Complete!
                              </Button>
                            ) : (
                              <Button 
                                onClick={nextStep}
                                className="flex items-center gap-2"
                              >
                                Next Step
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* Cooking Mode Timer */}
                            {isTimerRunning || timeRemaining > 0 ? (
                              <div className="bg-blue-100 px-3 py-2 rounded-lg flex items-center gap-2">
                                <Timer className="h-4 w-4 text-blue-600" />
                                <span className="font-mono font-bold text-blue-600">
                                  {formatTime(timeRemaining)}
                                </span>
                                <Button
                                  onClick={isTimerRunning ? pauseTimer : startTimer}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  {isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                </Button>
                              </div>
                            ) : null}
                            
                            <Button 
                              variant="outline"
                              onClick={() => setIsCookingModeOpen(false)}
                            >
                              Exit Cooking Mode
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

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
                          <SelectItem value="all">All Cuisines</SelectItem>
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
                          <SelectItem value="all">All Meal Times</SelectItem>
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
                    {(filterCuisine && filterCuisine !== 'all') || (filterMealType && filterMealType !== 'all') ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setFilterCuisine('all');
                          setFilterMealType('all');
                        }}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    ) : null}

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
                  <div key={recipe.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                    {/* Recipe Image Thumbnail */}
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {recipe.imageUrl ? (
                        <img 
                          src={recipe.imageUrl} 
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${recipe.imageUrl ? 'hidden' : ''} absolute inset-0 flex items-center justify-center bg-gray-100`}>
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                      
                      {/* Action buttons overlay */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecipeToRate(recipe);
                            setIsRatingDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-yellow-500 hover:text-yellow-600"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRecipe(recipe);
                          }}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRecipe(recipe);
                          }}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecipe(recipe.id);
                          }}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div 
                      className="p-4"
                      onClick={() => handleViewRecipe(recipe)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 group-hover:text-blue-600 transition-colors">{recipe.title}</h3>
                      </div>
                      
                      {recipe.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {recipe.cuisine && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {recipe.cuisine}
                          </span>
                        )}
                        {recipe.mealType && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {recipe.mealType}
                          </span>
                        )}
                      </div>
                      
                      {/* Recipe Rating Display */}
                      {recipe.averageRating && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(10)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Number(recipe.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {Number(recipe.averageRating).toFixed(1)} ({recipe.ratingCount || 0} rating{(recipe.ratingCount || 0) !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          {recipe.prepTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {recipe.prepTime}m prep
                            </span>
                          )}
                          {recipe.cookTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {recipe.cookTime}m cook
                            </span>
                          )}
                        </div>
                        {recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {recipe.servings}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Smart Recipe Recommendations</h4>
                      <p className="text-sm text-blue-700">
                        Our AI will analyze your inventory and preferences to suggest recipes you can make right now, 
                        plus recipes where you're only missing a few ingredients.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Available Ingredients</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    {inventory.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {inventory.map((item) => (
                          <Badge key={item.id} variant="secondary" className="bg-green-100 text-green-800">
                            {item.ingredientName} ({item.quantity} {item.unit})
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
                    inventory
                  })}
                  disabled={generateAIRecipeMutation.isPending}
                  className="w-full flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {generateAIRecipeMutation.isPending ? 'Generating Smart Recommendations...' : 'Generate Smart Recipe Recommendations'}
                </Button>
              </CardContent>
            </Card>

            {/* AI Recommendations Results */}
            {console.log("Current aiRecommendations state:", aiRecommendations)}
            {Array.isArray(aiRecommendations) && aiRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Smart Recipe Recommendations
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Recipes tailored to your inventory and preferences, sorted by ingredient match
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {aiRecommendations.map((recipe, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900">{recipe.title}</h3>
                            <p className="text-gray-600 mt-1">{recipe.description}</p>
                            
                            {/* Recipe Info */}
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {recipe.prepTime + recipe.cookTime}m total
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {recipe.servings} servings
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {recipe.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {recipe.cuisine}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Ingredient Match Indicator */}
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              recipe.inventoryMatch >= 80 ? 'text-green-600' : 
                              recipe.inventoryMatch >= 50 ? 'text-yellow-600' : 'text-orange-600'
                            }`}>
                              {recipe.inventoryMatch}% Match
                            </div>
                            <div className="text-xs text-gray-500">
                              {recipe.matchType === 'full' ? 'Ready to cook!' : 'Few items needed'}
                            </div>
                          </div>
                        </div>

                        {/* Missing Ingredients & Shopping List */}
                        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-yellow-800 mb-2">Missing Ingredients:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {recipe.missingIngredients.map((ingredient: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="bg-yellow-100 text-yellow-800">
                                      {ingredient}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                                onClick={async () => {
                                  try {
                                    // Add missing ingredients to shopping list
                                    const response = await apiRequest("POST", "/api/shopping-lists", {
                                      name: `${recipe.title} - Missing Items`,
                                      items: recipe.missingIngredients.map((ingredient: string) => ({
                                        name: ingredient,
                                        quantity: 1,
                                        unit: "item",
                                        category: "Missing Ingredient",
                                        purchased: false
                                      }))
                                    });
                                    
                                    if (response.ok) {
                                      toast({
                                        title: "Added to Shopping List",
                                        description: `Added ${recipe.missingIngredients.length} missing ingredients to your shopping list.`,
                                      });
                                      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to add items to shopping list.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Add to Shopping List
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Match Reason */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 mb-1">Why this recipe?</h4>
                          <p className="text-sm text-blue-700">{recipe.matchReason}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              console.log("Looking for recipe:", recipe.title);
                              console.log("Available recipes:", recipes?.map(r => r.title));
                              
                              // Remove "(Your Recipe)" suffix and find exact match
                              const cleanTitle = recipe.title.replace(' (Your Recipe)', '');
                              const actualRecipe = recipes?.find(r => r.title === cleanTitle);
                              
                              console.log("Clean title:", cleanTitle);
                              console.log("Found recipe:", actualRecipe);
                              
                              if (actualRecipe) {
                                setSelectedRecipe(actualRecipe);
                                setIsRecipeModalOpen(true);
                              } else {
                                toast({
                                  title: "Recipe Not Found",
                                  description: `Unable to find recipe "${cleanTitle}" in your collection.`,
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Recipe
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Household Inventory */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Package className="h-8 w-8" />
                  Smart Inventory Management
                </h1>
                <p className="text-gray-600">Track your pantry with barcode scanning, receipt processing, and cost analytics</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsReceiptScanning(true)} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Scan Receipt
                </Button>
                <Button onClick={() => setIsReportsOpen(true)} variant="outline">
                  <Brain className="h-4 w-4 mr-2" />
                  Cost Reports
                </Button>
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
                    addInventoryMutation.mutate({
                      ingredientName: newInventoryItem.name,
                      quantity: newInventoryItem.quantity,
                      unit: newInventoryItem.unit,
                      category: newInventoryItem.category,
                      upcBarcode: newInventoryItem.upcBarcode || undefined,
                      pricePerUnit: newInventoryItem.pricePerUnit || undefined,
                      totalCost: newInventoryItem.totalCost || undefined,
                      expiryDate: newInventoryItem.expiryDate || undefined
                    });
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
                          <SelectItem value="seafood">Seafood</SelectItem>
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

                  {/* Enhanced Fields for Price Tracking */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="barcode">UPC Barcode (Optional)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="barcode" 
                          placeholder="123456789012"
                          value={newInventoryItem.upcBarcode}
                          onChange={(e) => setNewInventoryItem({...newInventoryItem, upcBarcode: e.target.value})}
                        />
                        <Button type="button" size="sm" onClick={() => setIsBarcodeScanning(true)}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="price-per-unit">Price per Unit ($)</Label>
                      <Input 
                        id="price-per-unit" 
                        placeholder="2.99"
                        type="number"
                        step="0.01"
                        value={newInventoryItem.pricePerUnit}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, pricePerUnit: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="total-cost">Total Cost ($)</Label>
                      <Input 
                        id="total-cost" 
                        placeholder="17.94"
                        type="number"
                        step="0.01"
                        value={newInventoryItem.totalCost}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, totalCost: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
                      <Input 
                        id="expiry-date" 
                        type="date"
                        value={newInventoryItem.expiryDate}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, expiryDate: e.target.value})}
                      />
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
                    {['produce', 'meat', 'seafood', 'dairy', 'pantry', 'spices', 'frozen', 'beverages'].map((category) => {
                      const categoryItems = inventory.filter(item => item.category === category);
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <div key={category} className="border-b pb-4 last:border-b-0">
                          <h4 className="font-semibold text-lg text-gray-900 mb-3 capitalize">
                            {category === 'meat' ? 'Meat & Poultry' : category === 'spices' ? 'Spices & Herbs' : category === 'seafood' ? 'Seafood' : category}
                          </h4>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryItems.map((item) => (
                              <div key={item.id} className="p-4 bg-gray-50 rounded-lg border">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{item.ingredientName}</div>
                                    <div className="text-sm text-gray-500">{item.quantity} {item.unit}</div>
                                    {item.totalCost && (
                                      <div className="text-sm text-green-600 font-medium">${item.totalCost}</div>
                                    )}
                                    {item.expiryDate && (
                                      <div className="text-xs text-orange-600">
                                        Expires: {new Date(item.expiryDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => markUsedMutation.mutate(item.id)}
                                      className="text-green-600 hover:text-green-800"
                                      title="Mark as used (consumed)"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => markWastedMutation.mutate(item.id)}
                                      className="text-orange-600 hover:text-orange-800"
                                      title="Mark as wasted"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => deleteInventoryMutation.mutate(item.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Delete item"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {item.upcBarcode && (
                                  <div className="text-xs text-gray-400 font-mono">UPC: {item.upcBarcode}</div>
                                )}
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
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-8 w-8" />
                Meal Planner
              </h1>
              <div className="flex items-center gap-4">
                {/* View Toggle */}
                <div className="flex items-center gap-2">
                  <Label>View:</Label>
                  <Select value={mealPlannerView} onValueChange={(value: 'day' | 'week' | 'month') => setMealPlannerView(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-6 h-[800px]">
              {/* Left Sidebar - Recipe Library */}
              <Card className="w-80 flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recipe Library</CardTitle>
                  <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Search recipes..." 
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="appetizer">Appetizers</SelectItem>
                        <SelectItem value="main-course">Main Course</SelectItem>
                        <SelectItem value="side-dish">Side Dishes</SelectItem>
                        <SelectItem value="dessert">Desserts</SelectItem>
                        <SelectItem value="beverage">Beverages</SelectItem>
                        <SelectItem value="soup">Soups</SelectItem>
                        <SelectItem value="salad">Salads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[650px] overflow-y-auto">
                    {recipes?.map((recipe: Recipe) => (
                      <div
                        key={recipe.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(recipe));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors select-none"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs">
                            {recipe.imageUrl ? (
                              <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <ChefHat className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{recipe.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {recipe.prepTime + recipe.cookTime}m
                              <Users className="h-3 w-3 ml-1" />
                              {recipe.servings}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Main Calendar Area */}
              <div className="flex-1 min-w-0">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {mealPlannerView === 'day' && `Day View - ${selectedDate.toLocaleDateString()}`}
                        {mealPlannerView === 'week' && `Week View - ${currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                        {mealPlannerView === 'month' && `Month View - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (mealPlannerView === 'week') {
                              const newStart = new Date(currentWeekStart);
                              newStart.setDate(newStart.getDate() - 7);
                              setCurrentWeekStart(newStart);
                            }
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (mealPlannerView === 'week') {
                              const today = new Date();
                              const start = new Date(today);
                              start.setDate(today.getDate() - today.getDay());
                              setCurrentWeekStart(start);
                            }
                          }}
                        >
                          Today
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (mealPlannerView === 'week') {
                              const newStart = new Date(currentWeekStart);
                              newStart.setDate(newStart.getDate() + 7);
                              setCurrentWeekStart(newStart);
                            }
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Render different views based on selection */}
                    {mealPlannerView === 'week' && (
                      <div className="grid grid-cols-7 h-[680px]">
                        {/* Week View - Day Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                          const date = new Date(currentWeekStart);
                          date.setDate(currentWeekStart.getDate() + index);
                          const isToday = date.toDateString() === new Date().toDateString();
                          const dateStr = date.toISOString().split('T')[0];
                          
                          // Get meal plans for this date
                          const dayMealPlans = mealPlans?.filter(plan => plan.date === dateStr) || [];
                          const breakfastPlans = dayMealPlans.filter(plan => plan.mealType === 'breakfast');
                          const lunchPlans = dayMealPlans.filter(plan => plan.mealType === 'lunch');
                          const dinnerPlans = dayMealPlans.filter(plan => plan.mealType === 'dinner');
                          const snackPlans = dayMealPlans.filter(plan => plan.mealType === 'snack');
                          
                          return (
                            <div key={day} className="border-r border-gray-200 last:border-r-0">
                              <div className={`p-3 text-center border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <div className="text-sm font-medium text-gray-900">{day}</div>
                                <div className={`text-xs mt-1 ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                  {date.getDate()}
                                </div>
                              </div>
                            
                            {/* Meal Slots */}
                            <div className="h-[600px] flex flex-col">
                              {/* Breakfast */}
                              <div 
                                className="flex-1 border-b border-gray-100 p-2"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                  try {
                                    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
                                    addMealPlanMutation.mutate({
                                      recipeId: recipe.id,
                                      date: date.toISOString().split('T')[0],
                                      mealType: 'breakfast'
                                    });
                                    
                                    // Check for missing ingredients and add to shopping list
                                    checkMissingIngredients(recipe);
                                    
                                    toast({
                                      title: "Recipe Added",
                                      description: `${recipe.title} added to breakfast on ${date.toLocaleDateString()}`,
                                    });
                                  } catch (error) {
                                    console.error('Error parsing dropped recipe:', error);
                                  }
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">🌅 Breakfast</div>
                                <div className="min-h-[40px] bg-gray-50 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-xs text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-colors p-1">
                                  {breakfastPlans.length > 0 ? (
                                    breakfastPlans.map((plan) => {
                                      const recipe = recipes?.find(r => r.id === plan.recipeId);
                                      return (
                                        <div key={plan.id} className="bg-blue-100 text-blue-800 rounded px-2 py-1 mb-1 text-xs truncate w-full text-center">
                                          {recipe?.title || 'Recipe'}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    'Drop recipe here'
                                  )}
                                </div>
                              </div>
                              
                              {/* Lunch */}
                              <div 
                                className="flex-1 border-b border-gray-100 p-2"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                  try {
                                    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
                                    addMealPlanMutation.mutate({
                                      recipeId: recipe.id,
                                      date: date.toISOString().split('T')[0],
                                      mealType: 'lunch'
                                    });
                                    
                                    // Check for missing ingredients and add to shopping list
                                    checkMissingIngredients(recipe);
                                    
                                    toast({
                                      title: "Recipe Added",
                                      description: `${recipe.title} added to lunch on ${date.toLocaleDateString()}`,
                                    });
                                  } catch (error) {
                                    console.error('Error parsing dropped recipe:', error);
                                  }
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">☀️ Lunch</div>
                                <div className="min-h-[40px] bg-gray-50 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-xs text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-colors p-1">
                                  {lunchPlans.length > 0 ? (
                                    lunchPlans.map((plan) => {
                                      const recipe = recipes?.find(r => r.id === plan.recipeId);
                                      return (
                                        <div key={plan.id} className="bg-green-100 text-green-800 rounded px-2 py-1 mb-1 text-xs truncate w-full text-center">
                                          {recipe?.title || 'Recipe'}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    'Drop recipe here'
                                  )}
                                </div>
                              </div>
                              
                              {/* Dinner */}
                              <div 
                                className="flex-1 border-b border-gray-100 p-2"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                  try {
                                    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
                                    addMealPlanMutation.mutate({
                                      recipeId: recipe.id,
                                      date: date.toISOString().split('T')[0],
                                      mealType: 'dinner'
                                    });
                                    
                                    // Check for missing ingredients and add to shopping list
                                    checkMissingIngredients(recipe);
                                    
                                    toast({
                                      title: "Recipe Added",
                                      description: `${recipe.title} added to dinner on ${date.toLocaleDateString()}`,
                                    });
                                  } catch (error) {
                                    console.error('Error parsing dropped recipe:', error);
                                  }
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">🌙 Dinner</div>
                                <div className="min-h-[40px] bg-gray-50 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-xs text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-colors p-1">
                                  {dinnerPlans.length > 0 ? (
                                    dinnerPlans.map((plan) => {
                                      const recipe = recipes?.find(r => r.id === plan.recipeId);
                                      return (
                                        <div key={plan.id} className="bg-orange-100 text-orange-800 rounded px-2 py-1 mb-1 text-xs truncate w-full text-center">
                                          {recipe?.title || 'Recipe'}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    'Drop recipe here'
                                  )}
                                </div>
                              </div>
                              
                              {/* Snacks */}
                              <div 
                                className="flex-1 p-2"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                  try {
                                    const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
                                    addMealPlanMutation.mutate({
                                      recipeId: recipe.id,
                                      date: date.toISOString().split('T')[0],
                                      mealType: 'snack'
                                    });
                                    
                                    // Check for missing ingredients and add to shopping list
                                    checkMissingIngredients(recipe);
                                    
                                    toast({
                                      title: "Recipe Added",
                                      description: `${recipe.title} added to snacks on ${date.toLocaleDateString()}`,
                                    });
                                  } catch (error) {
                                    console.error('Error parsing dropped recipe:', error);
                                  }
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">🍎 Snacks</div>
                                <div className="min-h-[40px] bg-gray-50 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-xs text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-colors p-1">
                                  {snackPlans.length > 0 ? (
                                    snackPlans.map((plan) => {
                                      const recipe = recipes?.find(r => r.id === plan.recipeId);
                                      return (
                                        <div key={plan.id} className="bg-purple-100 text-purple-800 rounded px-2 py-1 mb-1 text-xs truncate w-full text-center">
                                          {recipe?.title || 'Recipe'}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    'Drop recipe here'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}

                    {/* Day View */}
                    {mealPlannerView === 'day' && (
                      <div className="p-6 space-y-6">
                        <h3 className="text-xl font-semibold">Meals for {selectedDate.toLocaleDateString()}</h3>
                        {/* Day view content would go here */}
                        <div className="text-gray-500 text-center py-12">
                          Day view coming soon - use the calendar to select a date
                        </div>
                      </div>
                    )}

                    {/* Month View */}
                    {mealPlannerView === 'month' && (
                      <div className="p-6">
                        <div className="text-gray-500 text-center py-12">
                          Month view coming soon - showing condensed calendar view
                        </div>
                      </div>
                    )}
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

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="rating-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Rate Recipe
            </DialogTitle>
          </DialogHeader>
          {recipeToRate && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{recipeToRate.title}</h3>
                <p id="rating-dialog-description" className="text-sm text-gray-600">How would you rate this recipe? Click the stars to select your rating from 1 to 10.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Rating (1-10):</Label>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedRecipeRating(i + 1)}
                      className={`p-1 rounded transition-colors ${
                        i < selectedRecipeRating
                          ? 'text-yellow-400 hover:text-yellow-500'
                          : 'text-gray-300 hover:text-gray-400'
                      }`}
                    >
                      <Star className={`h-6 w-6 ${i < selectedRecipeRating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  {selectedRecipeRating > 0 ? `${selectedRecipeRating}/10` : 'Select rating'}
                </span>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRatingDialogOpen(false);
                    setRecipeToRate(null);
                    setSelectedRecipeRating(0);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedRecipeRating > 0) {
                      rateRecipeMutation.mutate({
                        recipeId: recipeToRate.id,
                        rating: selectedRecipeRating
                      });
                    }
                  }}
                  disabled={selectedRecipeRating === 0 || rateRecipeMutation.isPending}
                  className="flex-1"
                >
                  {rateRecipeMutation.isPending ? 'Rating...' : 'Submit Rating'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isBarcodeScanning} onOpenChange={setIsBarcodeScanning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Position barcode in front of camera</p>
              <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Camera preview would appear here</p>
              </div>
            </div>
            <Input 
              placeholder="Or enter barcode manually" 
              value={newInventoryItem.upcBarcode}
              onChange={(e) => setNewInventoryItem({...newInventoryItem, upcBarcode: e.target.value})}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBarcodeScanning(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setIsBarcodeScanning(false);
                  toast({
                    title: "Barcode Added",
                    description: "Barcode has been added to the item form",
                  });
                }}
                className="flex-1"
              >
                Use Barcode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Scanner Dialog */}
      <Dialog open={isReceiptScanning} onOpenChange={setIsReceiptScanning}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Store Name</Label>
                <Input placeholder="e.g., Whole Foods" />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Take a photo of your receipt or upload an image</p>
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Receipt photo would appear here</p>
              </div>
              <Button variant="outline" className="mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt Photo
              </Button>
            </div>

            {/* Manual Item Entry */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Or Add Items Manually</h4>
              <div className="space-y-3">
                {receiptItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input placeholder="Item name" />
                    <Input placeholder="Qty" type="number" />
                    <Input placeholder="Unit" />
                    <Input placeholder="Price" type="number" step="0.01" />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setReceiptItems([...receiptItems, {}])}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsReceiptScanning(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (receiptItems.length > 0) {
                    handleProcessReceipt(receiptItems);
                  } else {
                    setIsReceiptScanning(false);
                    toast({
                      title: "Demo Mode",
                      description: "Receipt processing would analyze the image and add items to inventory",
                    });
                  }
                }}
                className="flex-1"
              >
                Process Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Reports Dialog */}
      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Food Cost Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">$127.43</div>
                  <div className="text-sm text-gray-600">This Month's Spending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">$23.89</div>
                  <div className="text-sm text-gray-600">Food Waste Cost</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">$3.21</div>
                  <div className="text-sm text-gray-600">Avg Cost Per Meal</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { category: 'Produce', amount: 45.23, percentage: 35 },
                      { category: 'Meat & Poultry', amount: 38.67, percentage: 30 },
                      { category: 'Dairy', amount: 25.44, percentage: 20 },
                      { category: 'Pantry', amount: 18.09, percentage: 15 }
                    ].map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${item.amount}</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Most Wasted Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { item: 'Lettuce', waste: 6, cost: 12.34 },
                      { item: 'Bananas', waste: 4, cost: 8.99 },
                      { item: 'Bread', waste: 2, cost: 7.48 },
                      { item: 'Yogurt', waste: 3, cost: 5.67 }
                    ].map((item) => (
                      <div key={item.item} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{item.item}</div>
                          <div className="text-xs text-gray-500">{item.waste} times wasted</div>
                        </div>
                        <div className="text-sm text-red-600 font-medium">
                          ${item.cost}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {[120, 135, 98, 142, 127, 156].map((amount, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-blue-500 w-8 rounded-t"
                        style={{ height: `${(amount / 180) * 200}px` }}
                      ></div>
                      <div className="text-xs text-gray-600 mt-2">
                        {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setIsReportsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
