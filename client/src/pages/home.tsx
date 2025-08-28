import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { PlanUsageWidget } from "@/components/PlanUsageWidget";
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
import { BrowserMultiFormatReader } from '@zxing/library';
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
  Pause,
  RotateCcw,
  Menu,
  AlertTriangle,
  DollarSign,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Calendar as CalendarClock
} from "lucide-react";
import type { Recipe, MealPlan, ShoppingList, UserPreferences, UserInventory } from "@shared/schema";
import { categorizeIngredient, categoryDisplayNames } from "@/utils/ingredientCategorizer";
import KitchenTimer from '@/components/KitchenTimer';



export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { checkRecipeLimit, checkShoppingListLimit, showUpgradePrompt } = usePlanLimits();
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
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('other');
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [selectedRecipePopup, setSelectedRecipePopup] = useState<Recipe | null>(null);
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
    expiryDate: "",
    addAsWaste: false
  });
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Barcode scanning functions
  const startScanning = async () => {
    try {
      setIsScanning(true);
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found');
      }

      // Use the back camera if available, otherwise use the first available camera
      const selectedDevice = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      ) || videoInputDevices[0];

      const previewElem = videoRef.current;
      if (!previewElem) return;

      codeReaderRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        previewElem,
        (result, err) => {
          if (result) {
            const barcodeText = result.getText();
            setNewInventoryItem({...newInventoryItem, upcBarcode: barcodeText});
            stopScanning();
            toast({
              title: "Barcode Scanned!",
              description: `Found barcode: ${barcodeText}`,
            });
          }
        }
      );
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
  };

  // Cleanup camera when component unmounts
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);
  const [isReceiptScanning, setIsReceiptScanning] = useState(false);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState({ storeName: '', purchaseDate: new Date().toISOString().split('T')[0] });
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [spendingReport, setSpendingReport] = useState<any>(null);
  const [recipeIngredients, setRecipeIngredients] = useState([{ unit: '', amount: '', item: '', notes: '' }]);
  const [recipeInstructions, setRecipeInstructions] = useState(['']);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipePrepTime, setRecipePrepTime] = useState('');
  const [recipeCookTime, setRecipeCookTime] = useState('');
  const [recipeServings, setRecipeServings] = useState('');
  const [recipeDifficulty, setRecipeDifficulty] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
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

  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [shoppingListStartDate, setShoppingListStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [shoppingListEndDate, setShoppingListEndDate] = useState(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [shoppingListName, setShoppingListName] = useState(`Week of ${new Date().toLocaleDateString()}`);
  const [isAddManualItemOpen, setIsAddManualItemOpen] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all'); // 'all', 'kroger', 'target', 'walmart', etc.

  // Fetch pricing data for the current shopping list
  const fetchPricingData = async () => {
    if (!shoppingLists || shoppingLists.length === 0) return;
    
    const currentList = shoppingLists[0]; // Get the first/most recent shopping list
    if (!currentList) return;
    
    try {
      console.log(`Fetching pricing data for list ${currentList.id} from store: ${selectedStore}`);
      const response = await apiRequest("GET", `/api/shopping-lists/${currentList.id}/pricing?store=${selectedStore}`);
      const data = await response.json();
      console.log('Pricing data received:', data);
      console.log('Pricing data structure:', {
        hasItems: !!data?.items,
        itemsCount: data?.items?.length || 0,
        totalEstimate: data?.totalEstimate,
        sampleItem: data?.items?.[0]
      });
      setPricingData(data);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      toast({
        title: "Pricing Error",
        description: "Could not fetch pricing information from Kroger API",
        variant: "destructive",
      });
    }
  };
  const [manualItem, setManualItem] = useState({
    name: '',
    quantity: '',
    unit: 'item',
    category: 'produce'
  });
  const [tempPreferences, setTempPreferences] = useState({
    dietaryRestrictions: [] as string[],
    allergies: [] as string[]
  });

  // Store-specific category organization
  const getStoreCategoryOrder = (store: string) => {
    const categoryOrders: Record<string, string[]> = {
      'kroger': [
        'produce', 'deli', 'bakery', 'meat-poultry', 'seafood', 'dairy', 'frozen',
        'pantry', 'canned-goods', 'condiments', 'snacks', 'beverages', 'personal-care', 'household', 'other'
      ],
      'target': [
        'produce', 'meat-poultry', 'dairy', 'frozen', 'pantry', 'canned-goods', 
        'snacks', 'beverages', 'personal-care', 'household', 'deli', 'bakery', 'other'
      ],
      'walmart': [
        'produce', 'meat-poultry', 'dairy', 'frozen', 'pantry', 'canned-goods',
        'condiments', 'snacks', 'beverages', 'household', 'personal-care', 'deli', 'bakery', 'other'
      ],
      'safeway': [
        'produce', 'deli', 'bakery', 'meat-poultry', 'seafood', 'dairy', 'frozen',
        'pantry', 'canned-goods', 'condiments', 'snacks', 'beverages', 'personal-care', 'household', 'other'
      ],
      'costco': [
        'produce', 'meat-poultry', 'dairy', 'frozen', 'pantry', 'canned-goods',
        'snacks', 'beverages', 'household', 'personal-care', 'deli', 'bakery', 'other'
      ],
      'wholefoods': [
        'produce', 'deli', 'bakery', 'meat-poultry', 'seafood', 'dairy', 'frozen',
        'pantry', 'canned-goods', 'condiments', 'snacks', 'beverages', 'personal-care', 'household', 'other'
      ],
      'all': [
        'produce', 'deli', 'bakery', 'meat-poultry', 'seafood', 'dairy', 'frozen',
        'pantry', 'canned-goods', 'condiments', 'snacks', 'beverages', 'personal-care', 'household', 'other'
      ]
    };
    
    return categoryOrders[store] || categoryOrders['all'];
  };

  const getStoreCategoryName = (category: string, store: string) => {
    const categoryNames: Record<string, Record<string, string>> = {
      'kroger': {
        'produce': '🥬 Fresh Produce',
        'deli': '🥪 Deli & Prepared Foods',
        'bakery': '🥖 Bakery',
        'meat-poultry': '🥩 Meat & Poultry',
        'seafood': '🐟 Seafood',
        'dairy': '🥛 Dairy & Eggs',
        'frozen': '🧊 Frozen Foods',
        'pantry': '🍞 Pantry Staples',
        'canned-goods': '🥫 Canned & Jarred',
        'condiments': '🍯 Condiments & Sauces',
        'snacks': '🍿 Snacks & Candy',
        'beverages': '🥤 Beverages',
        'personal-care': '🧴 Personal Care',
        'household': '🧽 Household Items',
        'other': '📦 Other Items'
      },
      'target': {
        'produce': '🥬 Fresh Market',
        'meat-poultry': '🥩 Fresh Meat',
        'dairy': '🥛 Dairy Cooler',
        'frozen': '🧊 Frozen Aisles',
        'pantry': '🍞 Grocery Essentials',
        'canned-goods': '🥫 Pantry Items',
        'snacks': '🍿 Snacks & Treats',
        'beverages': '🥤 Beverages',
        'personal-care': '🧴 Beauty & Personal Care',
        'household': '🧽 Household Essentials',
        'deli': '🥪 Deli',
        'bakery': '🥖 Bakery',
        'other': '📦 Other'
      },
      'walmart': {
        'produce': '🥬 Fresh Produce',
        'meat-poultry': '🥩 Fresh Meat & Seafood',
        'dairy': '🥛 Dairy & Eggs',
        'frozen': '🧊 Frozen',
        'pantry': '🍞 Pantry',
        'canned-goods': '🥫 Canned Goods',
        'condiments': '🍯 Condiments',
        'snacks': '🍿 Snacks',
        'beverages': '🥤 Beverages',
        'household': '🧽 Household',
        'personal-care': '🧴 Health & Beauty',
        'deli': '🥪 Deli',
        'bakery': '🥖 Bakery',
        'other': '📦 Other'
      }
    };
    
    const storeCategories = categoryNames[store] || categoryNames['kroger'];
    return storeCategories[category] || `📦 ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element;
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const hamburgerButton = document.querySelector('[data-hamburger-button]');
        
        if (mobileMenu && hamburgerButton && 
            !mobileMenu.contains(target) && 
            !hamburgerButton.contains(target)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

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

  // Fetch user inventory with timestamp-based query key to prevent caching issues
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(Date.now());
  const { data: inventory = [], isLoading: inventoryLoading, refetch: refetchInventory } = useQuery<UserInventory[]>({
    queryKey: ["/api/inventory", inventoryRefreshKey],
    retry: false,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (renamed from cacheTime in v5)
  });

  // Force inventory refresh when switching to AI Generator tab
  useEffect(() => {
    if (activeTab === 'ai-generator') {
      console.log("Switching to AI Generator, forcing fresh inventory fetch...");
      setInventoryRefreshKey(Date.now()); // This will trigger a new query
    }
  }, [activeTab]);

  // Initialize temp preferences when preferences data loads
  useEffect(() => {
    if (preferences) {
      setTempPreferences({
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        allergies: preferences.allergies || []
      });
    }
  }, [preferences]);

  // Generate calendar links for meal planning
  const generateCalendarLink = (recipe: Recipe, date: Date, mealType: string) => {
    const startDate = new Date(date);
    startDate.setHours(mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 12 : 18, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const title = encodeURIComponent(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${recipe.title}`);
    const description = encodeURIComponent(`Recipe: ${recipe.title}\nIngredients: ${recipe.ingredients?.slice(0, 3).join(', ')}${recipe.ingredients?.length > 3 ? '...' : ''}\nCook time: ${recipe.cookTime || 'Not specified'}\n\nView full recipe: ${window.location.origin}`);
    
    const startTime = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${description}`,
      apple: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.origin}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${decodeURIComponent(title)}
DESCRIPTION:${decodeURIComponent(description)}
END:VEVENT
END:VCALENDAR`
    };
  };

  // Handle data export as CSV
  const handleExportData = async () => {
    try {
      // Gather all user data
      const allData = {
        recipes: recipes || [],
        mealPlans: mealPlans || [],
        shoppingLists: shoppingLists || [],
        inventory: inventory || [],
        preferences: preferences || {}
      };

      // Convert to CSV format
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Export recipes
      if (allData.recipes.length > 0) {
        csvContent += "RECIPES\n";
        csvContent += "Title,Description,Ingredients,Instructions,PrepTime,CookTime,Servings,Rating\n";
        allData.recipes.forEach(recipe => {
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.join('; ') : '';
          const instructions = Array.isArray(recipe.instructions) ? recipe.instructions.join('; ') : '';
          csvContent += `"${recipe.title || ''}","${recipe.description || ''}","${ingredients}","${instructions}","${recipe.prepTime || ''}","${recipe.cookTime || ''}","${recipe.servings || ''}","${recipe.rating || ''}"\n`;
        });
        csvContent += "\n";
      }

      // Export meal plans
      if (allData.mealPlans.length > 0) {
        csvContent += "MEAL PLANS\n";
        csvContent += "Date,MealType,RecipeId,RecipeTitle\n";
        allData.mealPlans.forEach(plan => {
          const recipe = allData.recipes.find(r => r.id === plan.recipeId);
          csvContent += `"${plan.date}","${plan.mealType}","${plan.recipeId}","${recipe?.title || 'Unknown Recipe'}"\n`;
        });
        csvContent += "\n";
      }

      // Export inventory
      if (allData.inventory.length > 0) {
        csvContent += "INVENTORY\n";
        csvContent += "Name,Quantity,Unit,Category,ExpiryDate,PricePerUnit,TotalCost\n";
        allData.inventory.forEach(item => {
          csvContent += `"${item.ingredientName || ''}","${item.quantity || ''}","${item.unit || ''}","${item.category || ''}","${item.expiryDate || ''}","${item.pricePerUnit || ''}","${item.totalCost || ''}"\n`;
        });
        csvContent += "\n";
      }

      // Export preferences
      if (allData.preferences && Object.keys(allData.preferences).length > 0) {
        csvContent += "PREFERENCES\n";
        csvContent += "DietaryRestrictions,Allergies\n";
        const restrictions = Array.isArray((allData.preferences as any).dietaryRestrictions) ? (allData.preferences as any).dietaryRestrictions.join('; ') : '';
        const allergies = Array.isArray((allData.preferences as any).allergies) ? (allData.preferences as any).allergies.join('; ') : '';
        csvContent += `"${restrictions}","${allergies}"\n`;
      }

      // Create and download file
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `chef-mikes-backup-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Your data has been downloaded as a CSV file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data",
        variant: "destructive",
      });
    }
  };

  // Handle data import from CSV
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        toast({
          title: "CSV Import",
          description: "CSV import functionality is ready for development. This would parse and restore your data.",
        });
        console.log("CSV data received:", csvData);
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "There was an error reading the CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const isEditing = editingRecipeId !== null;
      console.log(isEditing ? "Updating recipe with FormData:" : "Creating recipe with FormData:", Object.fromEntries(formData.entries()));
      
      if (isEditing) {
        await apiRequest("PUT", `/api/recipes/${editingRecipeId}`, formData);
      } else {
        await apiRequest("POST", "/api/recipes", formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan/usage"] }); // Update usage stats
      setIsAddRecipeOpen(false);
      resetRecipeForm();
      toast({
        title: "Success",
        description: editingRecipeId ? "Recipe updated successfully!" : "Recipe created successfully!",
      });
    },
    onError: (error) => {
      console.error("Recipe creation error:", error);
      
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
      
      // Check if this is a plan limit error
      if (error.message.includes("Recipe limit reached")) {
        const errorData = JSON.parse(error.message.split(": ")[1] || "{}");
        toast({
          title: "Recipe Limit Reached",
          description: `You've reached your limit of ${errorData.limit} recipes. Upgrade to Pro for unlimited recipes!`,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to create recipe: ${error.message}`,
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
    mutationFn: async (data: { startDate: string; endDate: string; name: string; items?: any[] }) => {
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

  // Update shopping list mutation
  const updateShoppingListMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/shopping-lists/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
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
        description: "Failed to update shopping list",
        variant: "destructive",
      });
    },
  });

  // Helper function to categorize items
  const getItemCategory = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Skip plain water unless it's specifically bottled/gallon water
    if (name === 'water' || (name.includes('water') && !name.includes('bottled') && !name.includes('gallon') && !name.includes('sparkling') && !name.includes('coconut'))) {
      return 'skip'; // Special category to exclude from shopping lists
    }
    
    // Produce - Fresh fruits and vegetables
    const produceItems = ['lettuce', 'tomato', 'onion', 'carrot', 'banana', 'apple', 'potato', 'garlic', 'celery', 'bell pepper', 'broccoli', 'spinach', 'cucumber', 'zucchini', 'mushroom', 'avocado', 'lime', 'lemon', 'orange', 'strawberry', 'grape', 'pear', 'peach', 'mango', 'pineapple', 'cabbage', 'cauliflower', 'asparagus', 'corn', 'green bean', 'pea', 'radish', 'beet', 'turnip', 'parsnip', 'sweet potato', 'kale', 'arugula', 'cilantro', 'parsley', 'basil', 'mint', 'dill', 'rosemary', 'thyme', 'sage', 'oregano', 'chive', 'scallion', 'leek', 'shallot', 'ginger', 'jalapeño', 'serrano', 'habanero', 'poblano'];
    
    // Dairy - Milk products and eggs
    const dairyItems = ['milk', 'yogurt', 'butter', 'eggs', 'cream', 'sour cream', 'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'swiss', 'goat cheese', 'feta', 'brie', 'camembert', 'blue cheese', 'cream cheese', 'half and half', 'heavy cream', 'whipping cream', 'buttermilk', 'condensed milk', 'evaporated milk'];
    
    // Dry Goods - Non-perishable pantry staples
    const dryGoodsItems = ['flour', 'sugar', 'salt', 'pepper', 'rice', 'pasta', 'orzo', 'quinoa', 'barley', 'oats', 'lentil', 'chickpea', 'black bean', 'kidney bean', 'pinto bean', 'navy bean', 'split pea', 'couscous', 'bulgur', 'farro', 'millet', 'amaranth', 'buckwheat', 'cornmeal', 'corn starch', 'cornstarch', 'breadcrumb', 'panko', 'baking powder', 'baking soda', 'vanilla extract', 'almond extract', 'coconut extract', 'vinegar', 'olive oil', 'vegetable oil', 'canola oil', 'sesame oil', 'coconut oil', 'honey', 'maple syrup', 'molasses', 'brown sugar', 'powdered sugar', 'cocoa powder', 'chocolate chip', 'raisin', 'date', 'fig', 'apricot', 'cranberry', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'peanut', 'sunflower seed', 'pumpkin seed', 'chia seed', 'flax seed', 'sesame seed'];
    
    // Canned Goods - Shelf-stable canned/jarred items
    const cannedGoodsItems = ['canned', 'sauce', 'tomato sauce', 'tomato paste', 'diced tomato', 'crushed tomato', 'tomato puree', 'marinara', 'salsa', 'bean', 'corn', 'pea', 'carrot', 'green bean', 'artichoke', 'olive', 'pickle', 'jam', 'jelly', 'preserve', 'peanut butter', 'almond butter', 'tahini', 'hummus', 'coconut milk', 'broth', 'stock', 'soup', 'chili', 'tuna', 'salmon', 'sardine', 'anchovy', 'chicken broth', 'beef broth', 'vegetable broth'];
    
    // Meat categories
    const poultryItems = ['chicken', 'turkey', 'duck', 'goose', 'cornish hen', 'chicken breast', 'chicken thigh', 'chicken wing', 'chicken leg', 'ground chicken', 'ground turkey', 'turkey breast', 'turkey leg'];
    const porkItems = ['pork', 'bacon', 'ham', 'sausage', 'pork chop', 'pork loin', 'pork shoulder', 'pork belly', 'ground pork', 'chorizo', 'pepperoni', 'salami', 'prosciutto', 'pancetta'];
    const redMeatItems = ['beef', 'steak', 'ground beef', 'roast beef', 'brisket', 'ribs', 'lamb', 'veal', 'venison', 'sirloin', 'ribeye', 'filet mignon', 'chuck roast', 'round roast'];
    const seafoodItems = ['fish', 'salmon', 'shrimp', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster', 'cod', 'halibut', 'mahi mahi', 'tilapia', 'trout', 'bass', 'snapper', 'sole', 'flounder', 'mackerel', 'herring'];
    
    // Deli items
    const deliItems = ['deli', 'sliced', 'lunch meat', 'cold cut', 'roast beef', 'roast turkey', 'pastrami', 'corned beef', 'mortadella', 'bologna', 'liverwurst'];
    
    // Other categories
    const frozenItems = ['frozen', 'ice cream', 'gelato', 'sorbet', 'popsicle', 'frozen yogurt', 'frozen fruit', 'frozen vegetable', 'frozen meal', 'frozen pizza', 'frozen waffle', 'frozen berries'];
    const beverageItems = ['juice', 'soda', 'bottled water', 'gallon water', 'coffee', 'tea', 'beer', 'wine', 'liquor', 'energy drink', 'sports drink', 'kombucha', 'sparkling water', 'coconut water'];
    const snackItems = ['chips', 'crackers', 'nuts', 'popcorn', 'pretzel', 'granola bar', 'energy bar', 'trail mix', 'dried fruit', 'jerky', 'candy', 'chocolate', 'cookie', 'cake', 'muffin', 'donut'];
    const breadItems = ['bread', 'bagel', 'muffin', 'bun', 'roll', 'baguette', 'croissant', 'pita', 'tortilla', 'wrap', 'naan', 'flatbread', 'sourdough', 'whole wheat', 'rye bread', 'pumpernickel'];
    const ethnicItems = ['soy sauce', 'fish sauce', 'miso', 'kimchi', 'wasabi', 'nori', 'mirin', 'sake', 'sriracha', 'gochujang', 'curry powder', 'garam masala', 'turmeric', 'cumin', 'coriander', 'cardamom', 'cinnamon', 'nutmeg', 'allspice', 'bay leaf', 'paprika', 'chili powder', 'cayenne', 'red pepper flake'];
    const householdItems = ['soap', 'shampoo', 'paper', 'toilet paper', 'paper towel', 'napkin', 'tissue', 'aluminum foil', 'plastic wrap', 'garbage bag', 'storage bag', 'laundry detergent', 'fabric softener', 'dish soap', 'hand soap', 'body wash', 'toothpaste', 'toothbrush', 'deodorant', 'shaving cream', 'razor'];
    const cleaningItems = ['detergent', 'cleaner', 'bleach', 'disinfectant', 'window cleaner', 'floor cleaner', 'bathroom cleaner', 'kitchen cleaner', 'all purpose cleaner', 'scrub brush', 'sponge', 'mop', 'broom', 'vacuum bag'];
    const petItems = ['dog', 'cat', 'pet', 'dog food', 'cat food', 'pet food', 'dog treat', 'cat treat', 'pet treat', 'cat litter', 'dog toy', 'cat toy', 'pet toy', 'leash', 'collar'];
    
    // Check each category
    if (produceItems.some(item => name.includes(item))) return 'produce';
    if (dairyItems.some(item => name.includes(item))) return 'dairy';
    if (dryGoodsItems.some(item => name.includes(item))) return 'dry-goods';
    if (cannedGoodsItems.some(item => name.includes(item))) return 'canned-goods';
    if (poultryItems.some(item => name.includes(item))) return 'poultry';
    if (porkItems.some(item => name.includes(item))) return 'pork';
    if (redMeatItems.some(item => name.includes(item))) return 'red-meat';
    if (seafoodItems.some(item => name.includes(item))) return 'seafood';
    if (deliItems.some(item => name.includes(item))) return 'deli';
    if (frozenItems.some(item => name.includes(item))) return 'frozen';
    if (beverageItems.some(item => name.includes(item))) return 'beverages';
    if (snackItems.some(item => name.includes(item))) return 'snacks';
    if (breadItems.some(item => name.includes(item))) return 'bread';
    if (ethnicItems.some(item => name.includes(item))) return 'ethnic-foods';
    if (householdItems.some(item => name.includes(item))) return 'household-goods';
    if (cleaningItems.some(item => name.includes(item))) return 'cleaning-supplies';
    if (petItems.some(item => name.includes(item))) return 'pets';
    
    return 'produce'; // Default category
  };

  const handleGenerateShoppingList = () => {
    generateShoppingListMutation.mutate({
      startDate: shoppingListStartDate,
      endDate: shoppingListEndDate,
      name: shoppingListName || `Shopping List ${new Date().toLocaleDateString()}`
    });
  };

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
      setInventoryRefreshKey(Date.now()); // Force fresh query
      setNewInventoryItem({ 
        name: "", 
        quantity: "", 
        unit: "", 
        category: "", 
        upcBarcode: "", 
        pricePerUnit: "", 
        totalCost: "",
        expiryDate: "",
        addAsWaste: false
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

  // Add waste item mutation (for directly adding items as waste)
  const addWasteItemMutation = useMutation({
    mutationFn: async (itemData: {
      ingredientName: string;
      quantity: string;
      unit: string;
      category: string;
      totalCost?: string;
      wasteReason: string;
    }) => {
      await apiRequest("POST", "/api/waste-items", itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/spending"] });
      setNewInventoryItem({
        name: "", 
        quantity: "", 
        unit: "", 
        category: "", 
        upcBarcode: "", 
        pricePerUnit: "", 
        totalCost: "",
        expiryDate: "",
        addAsWaste: false
      });
      toast({
        title: "Waste Item Added",
        description: "Item has been added to waste tracking for cost analysis",
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
        description: "Failed to add waste item",
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
      queryClient.refetchQueries({ queryKey: ["/api/inventory"] });
      setInventoryRefreshKey(Date.now()); // Force fresh query
      queryClient.invalidateQueries({ queryKey: ["/api/reports/spending"] });
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

  // Delete meal plan mutation
  const deleteMealPlanMutation = useMutation({
    mutationFn: async (mealPlanId: number) => {
      return await apiRequest("DELETE", `/api/meal-plans/${mealPlanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({
        title: "Recipe Removed",
        description: "Recipe has been removed from meal plan",
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
        description: "Failed to remove recipe from meal plan",
        variant: "destructive",
      });
    }
  });

  // Mark item as used mutation
  const markUsedMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("PATCH", `/api/inventory/${itemId}/used`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.refetchQueries({ queryKey: ["/api/inventory"] });
      setInventoryRefreshKey(Date.now()); // Force fresh query
      queryClient.invalidateQueries({ queryKey: ["/api/reports/spending"] });
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
      queryClient.refetchQueries({ queryKey: ["/api/inventory"] });
      setInventoryRefreshKey(Date.now()); // Force fresh query
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

  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Clear all cached data and local storage
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      
      // Make a fetch request to logout endpoint first
      const response = await fetch("/api/logout", {
        method: "GET",
        credentials: "include",
        redirect: "manual" // Prevent automatic redirect
      });
      
      console.log("Logout response:", response.status);
      
      // Redirect to landing page regardless of response
      window.location.href = "https://airecipemanager.com/";
      
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: clear everything and redirect to main site
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "https://airecipemanager.com/";
    }
  };

  // Check for missing ingredients and add to shopping list
  const checkMissingIngredients = async (recipe: any) => {
    try {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        console.log('No ingredients found in recipe:', recipe.title);
        return;
      }
      
      console.log(`Processing ${recipe.ingredients.length} ingredients for recipe "${recipe.title}":`, recipe.ingredients);
      
      const missingItems: Array<{name: string; quantity: string; unit: string}> = [];
      
      // Check each recipe ingredient against inventory
      recipe.ingredients.forEach((ingredient: any, index: number) => {
        console.log(`Processing ingredient ${index}:`, ingredient);
        
        let ingredientName = '';
        let quantity = '1';
        let unit = 'item';
        
        // Handle different ingredient formats
        if (typeof ingredient === 'string') {
          ingredientName = ingredient.trim();
        } else if (typeof ingredient === 'object' && ingredient !== null) {
          // Try different possible property names
          ingredientName = ingredient.item || ingredient.name || ingredient.ingredientName || '';
          quantity = ingredient.amount || ingredient.quantity || '1';
          unit = ingredient.unit || 'item';
        }
        
        // Skip if no valid ingredient name
        if (!ingredientName || ingredientName.trim() === '') {
          console.log(`Skipping ingredient ${index} - no name found`);
          return;
        }
        
        const ingredientNameLower = ingredientName.toLowerCase();
        const hasInInventory = inventory?.some(inv => {
          const invNameLower = inv.ingredientName.toLowerCase();
          return invNameLower.includes(ingredientNameLower) ||
                 ingredientNameLower.includes(invNameLower);
        });
        
        if (!hasInInventory) {
          console.log(`Ingredient "${ingredientName}" not found in inventory, adding to missing items`);
          missingItems.push({
            name: ingredientName,
            quantity: quantity.toString(),
            unit: unit
          });
        } else {
          console.log(`Ingredient "${ingredientName}" found in inventory`);
        }
      });
      
      console.log(`Found ${missingItems.length} missing ingredients:`, missingItems.map(item => item.name));
      
      // Add missing items to shopping list if any
      if (missingItems.length > 0) {
        const existingList = shoppingLists?.[0];
        if (existingList) {
          // Update existing shopping list
          const currentItems = existingList.items || [];
          
          // Create new items in the correct format
          const newItems = missingItems.map(item => {
            let category = 'produce'; // default fallback
            try {
              category = categorizeIngredient(item.name);
            } catch (e) {
              console.log('Error categorizing ingredient:', item.name, e);
            }
            return {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: category,
              checked: false,
              manuallyAdded: false
            };
          });
          
          // Filter out items that already exist in the shopping list
          const itemsToAdd = newItems.filter(newItem => 
            !currentItems.some((existingItem: any) => 
              existingItem.name?.toLowerCase() === newItem.name.toLowerCase()
            )
          );
          
          if (itemsToAdd.length > 0) {
            await apiRequest("PUT", `/api/shopping-lists/${existingList.id}`, {
              items: [...currentItems, ...itemsToAdd]
            });
            
            queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
            
            toast({
              title: "Missing Ingredients Added",
              description: `${itemsToAdd.length} missing ingredients added to shopping list`,
            });
          } else {
            toast({
              title: "All Ingredients Present",
              description: "All ingredients are either in inventory or already on the shopping list",
            });
          }
        } else {
          // Create new shopping list with proper format
          const newListItems = missingItems.map(item => {
            let category = 'produce'; // default fallback
            try {
              category = categorizeIngredient(item.name);
            } catch (e) {
              console.log('Error categorizing ingredient:', item.name, e);
            }
            return {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: category,
              checked: false,
              manuallyAdded: false
            };
          });
          
          await apiRequest("POST", "/api/shopping-lists", {
            name: `Ingredients for ${recipe.title}`,
            items: newListItems
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
          
          toast({
            title: "Shopping List Created",
            description: `New shopping list created with ${newListItems.length} ingredients`,
          });
        }
      } else {
        toast({
          title: "All Ingredients Available",
          description: "All ingredients for this recipe are in your inventory",
        });
      }
    } catch (error) {
      console.error('Error checking missing ingredients:', error);
      toast({
        title: "Error",
        description: "Failed to check missing ingredients",
        variant: "destructive",
      });
    }
  };

  const handleProcessReceipt = async () => {
    try {
      if (receiptItems.length === 0) {
        toast({
          title: "No Items",
          description: "Please add at least one item to the receipt",
          variant: "destructive",
        });
        return;
      }

      const totalAmount = receiptItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
      
      const itemsToSave = receiptItems
        .filter(item => {
          // More thorough filtering
          const hasName = item.name && typeof item.name === 'string' && item.name.trim().length > 0;
          if (!hasName) {
            console.log('Filtering out item with invalid name:', item);
            return false;
          }
          return true;
        })
        .map((item, index) => {
          // Add category here in frontend for better tracking
          let category = 'uncategorized';
          try {
            category = categorizeIngredient(item.name.trim());
          } catch (e) {
            console.error(`Failed to categorize item ${index}: "${item.name}"`, e);
          }
          
          const processedItem = {
            ...item,
            name: item.name.trim(), // Clean up name
            quantity: item.quantity || "1", // Default to 1 if quantity is missing
            unit: item.unit || "each", // Default to each if unit is missing
            price: parseFloat(item.price) || 0, // Ensure price is a number
            category: category
          };
          
          return processedItem;
        });
      
      console.log('Items being sent to inventory:', itemsToSave.length, itemsToSave);
      console.log('Receipt data being sent:', {
        storeName: receiptData.storeName || "Unknown Store",
        purchaseDate: receiptData.purchaseDate,
        totalAmount,
        items: itemsToSave
      });
      
      const result = await receiptMutation.mutateAsync({
        storeName: receiptData.storeName || "Unknown Store",
        purchaseDate: receiptData.purchaseDate,
        totalAmount,
        items: itemsToSave
      });
      console.log('Receipt mutation result:', result);
    } catch (error) {
      // Error handling is in the mutation
    }
  };

  const handleReceiptFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      
      // Process the image with OCR
      try {
        toast({
          title: "Processing Receipt",
          description: "Analyzing receipt image with AI...",
        });

        const formData = new FormData();
        formData.append('receipt', file);

        const response = await fetch('/api/receipts/process-image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            // Don't set Content-Type for FormData, browser will set it automatically with boundary
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required - 401');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to process receipt (${response.status})`);
        }

        const receiptData = await response.json();
        
        // Update form data with OCR results
        setReceiptData({
          storeName: receiptData.storeName,
          purchaseDate: receiptData.purchaseDate
        });
        
        // Set the extracted items
        const extractedItems = receiptData.items || [];
        console.log('OCR extracted items:', extractedItems.length, extractedItems);
        setReceiptItems(extractedItems);
        
        toast({
          title: "Receipt Processed!",
          description: `Found ${extractedItems.length} items. Review and edit as needed.`,
        });

      } catch (error) {
        console.error('OCR processing failed:', error);
        
        // Check if it's an authentication error
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('Authentication required'))) {
          toast({
            title: "Authentication Required",
            description: "Please log in to use receipt scanning.",
            variant: "destructive",
          });
          // Redirect to login
          window.location.href = "/api/login";
          return;
        }
        
        toast({
          title: "OCR Failed",
          description: "Could not process receipt automatically. Please add items manually.",
          variant: "destructive",
        });
        
        // Start with one empty item for manual entry
        if (receiptItems.length === 0) {
          setReceiptItems([{ name: '', quantity: '', unit: '', price: '', category: 'uncategorized' }]);
        }
      }
    }
  };

  // Receipt scanning mutation
  const receiptMutation = useMutation({
    mutationFn: async (receiptData: { storeName: string; purchaseDate: string; totalAmount: number; items: any[] }) => {
      console.log('Making API request to /api/receipts with data:', receiptData);
      const response = await apiRequest("POST", "/api/receipts", receiptData);
      console.log('API response:', response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setInventoryRefreshKey(Date.now()); // Force fresh query
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      setIsReceiptScanning(false);
      setReceiptItems([]);
      toast({
        title: "Success",
        description: "Receipt processed and items added to inventory!",
      });
    },
    onError: (error) => {
      console.error('Receipt mutation error:', error);
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
        description: `Failed to process receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    mutationFn: async (requestData: { preferences?: UserPreferences }) => {
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

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferencesData: { dietaryRestrictions: string[], allergies: string[] }) => {
      await apiRequest('POST', '/api/preferences', preferencesData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      toast({
        title: "Success",
        description: "Dietary preferences saved successfully!",
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
        description: "Failed to save preferences. Please try again.",
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

  const moveInstructionUp = (index: number) => {
    if (index > 0) {
      const updated = [...recipeInstructions];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      setRecipeInstructions(updated);
    }
  };

  const moveInstructionDown = (index: number) => {
    if (index < recipeInstructions.length - 1) {
      const updated = [...recipeInstructions];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setRecipeInstructions(updated);
    }
  };

  const resetRecipeForm = () => {
    setRecipeIngredients([{ unit: '', amount: '', item: '', notes: '' }]);
    setRecipeInstructions(['']);
    setSelectedCuisine('');
    setSelectedMealType('');
    setRecipeTitle('');
    setRecipeDescription('');
    setRecipePrepTime('');
    setRecipeCookTime('');
    setRecipeServings('');
    setRecipeDifficulty('');
    setImageOption('upload');
    setImageUrl('');
    setEditingRecipeId(null);
  };

  const handleAddRecipe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Check recipe limit before proceeding
    if (!checkRecipeLimit()) {
      return;
    }
    
    const formData = new FormData();
    
    // Add all recipe data from state variables
    formData.set("title", recipeTitle);
    formData.set("description", recipeDescription);
    formData.set("prepTime", recipePrepTime);
    formData.set("cookTime", recipeCookTime);
    formData.set("servings", recipeServings);
    formData.set("difficulty", recipeDifficulty);
    formData.set("cuisine", selectedCuisine);
    formData.set("mealType", selectedMealType);
    
    // Filter out empty ingredients and instructions
    const validIngredients = recipeIngredients.filter(ing => ing.item.trim());
    const validInstructions = recipeInstructions.filter(inst => inst.trim());
    
    formData.set("ingredients", JSON.stringify(validIngredients));
    formData.set("instructions", JSON.stringify(validInstructions));
    formData.set("tags", JSON.stringify([]));

    // Handle image file from form if uploaded
    const form = event.currentTarget;
    const imageFile = form.image as HTMLInputElement;
    if (imageFile && imageFile.files && imageFile.files[0]) {
      formData.set("image", imageFile.files[0]);
    }

    // Handle image URL if selected
    if (imageOption === 'url' && imageUrl.trim()) {
      formData.set("imageUrl", imageUrl);
    }

    // If editing, add the ID
    if (editingRecipeId) {
      formData.set("id", editingRecipeId.toString());
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
    setEditingRecipeId(recipe.id);
    setRecipeTitle(recipe.title || '');
    setRecipeDescription(recipe.description || '');
    setRecipePrepTime(recipe.prepTime ? recipe.prepTime.toString() : '');
    setRecipeCookTime(recipe.cookTime ? recipe.cookTime.toString() : '');
    setRecipeServings(recipe.servings ? recipe.servings.toString() : '');
    setRecipeDifficulty(recipe.difficulty || '');
    setRecipeIngredients(Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => ({
      unit: ing.unit || '',
      amount: ing.amount || '',
      item: ing.item || '',
      notes: ing.notes || ''
    })) : [{ unit: '', amount: '', item: '', notes: '' }]);
    setRecipeInstructions(recipe.instructions || ['']);
    setSelectedCuisine(recipe.cuisine || '');
    setSelectedMealType(recipe.mealType || '');
    setImageUrl(recipe.imageUrl || '');
    setImageOption(recipe.imageUrl ? 'url' : 'upload');
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





  const handleDeleteRecipe = (recipeId: number) => {
    deleteRecipeMutation.mutate(recipeId);
  };

  // Recipe dietary warnings function
  const checkRecipeWarnings = (recipe: Recipe) => {
    if (!preferences) return { hasWarnings: false, warnings: [] };
    
    const warnings: string[] = [];
    const ingredients = recipe.ingredients?.map(ing => ing.item.toLowerCase()) || [];
    const recipeTitle = recipe.title.toLowerCase();
    const recipeDescription = recipe.description?.toLowerCase() || '';
    
    // Check allergies
    preferences.allergies?.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      
      // Common allergen checks
      if (allergyLower.includes('peanut') && ingredients.some(ing => ing.includes('peanut'))) {
        warnings.push(`Contains peanuts (${allergy} allergy)`);
      }
      if (allergyLower.includes('nuts') && ingredients.some(ing => 
        ing.includes('nuts') || ing.includes('almond') || ing.includes('walnut') || 
        ing.includes('cashew') || ing.includes('pecan') || ing.includes('hazelnut'))) {
        warnings.push(`Contains tree nuts (${allergy} allergy)`);
      }
      if (allergyLower.includes('milk') && ingredients.some(ing => 
        ing.includes('milk') || ing.includes('cream') || ing.includes('butter') || 
        ing.includes('cheese') || ing.includes('yogurt'))) {
        warnings.push(`Contains dairy (${allergy} allergy)`);
      }
      if (allergyLower.includes('eggs') && ingredients.some(ing => ing.includes('egg'))) {
        warnings.push(`Contains eggs (${allergy} allergy)`);
      }
      if (allergyLower.includes('wheat') && ingredients.some(ing => 
        ing.includes('wheat') || ing.includes('flour') || ing.includes('bread'))) {
        warnings.push(`Contains wheat (${allergy} allergy)`);
      }
      if (allergyLower.includes('soy') && ingredients.some(ing => ing.includes('soy'))) {
        warnings.push(`Contains soy (${allergy} allergy)`);
      }
      if (allergyLower.includes('fish') && ingredients.some(ing => 
        ing.includes('fish') || ing.includes('salmon') || ing.includes('tuna') || 
        ing.includes('cod') || ing.includes('tilapia'))) {
        warnings.push(`Contains fish (${allergy} allergy)`);
      }
      if (allergyLower.includes('shellfish') && ingredients.some(ing => 
        ing.includes('shrimp') || ing.includes('crab') || ing.includes('lobster') || 
        ing.includes('clam') || ing.includes('oyster'))) {
        warnings.push(`Contains shellfish (${allergy} allergy)`);
      }
    });
    
    // Check dietary restrictions
    preferences.dietaryRestrictions?.forEach(restriction => {
      const restrictionLower = restriction.toLowerCase();
      
      if (restrictionLower.includes('vegetarian') && ingredients.some(ing => 
        ing.includes('meat') || ing.includes('chicken') || ing.includes('beef') || 
        ing.includes('pork') || ing.includes('fish') || ing.includes('seafood'))) {
        warnings.push(`Contains meat (conflicts with ${restriction})`);
      }
      if (restrictionLower.includes('vegan') && ingredients.some(ing => 
        ing.includes('meat') || ing.includes('chicken') || ing.includes('beef') || 
        ing.includes('pork') || ing.includes('fish') || ing.includes('seafood') || 
        ing.includes('milk') || ing.includes('cream') || ing.includes('butter') || 
        ing.includes('cheese') || ing.includes('yogurt') || ing.includes('egg') || 
        ing.includes('honey'))) {
        warnings.push(`Contains animal products (conflicts with ${restriction})`);
      }
      if (restrictionLower.includes('gluten-free') && ingredients.some(ing => 
        ing.includes('wheat') || ing.includes('flour') || ing.includes('bread') || 
        ing.includes('pasta') || ing.includes('barley') || ing.includes('rye'))) {
        warnings.push(`Contains gluten (conflicts with ${restriction})`);
      }
      if (restrictionLower.includes('dairy-free') && ingredients.some(ing => 
        ing.includes('milk') || ing.includes('cream') || ing.includes('butter') || 
        ing.includes('cheese') || ing.includes('yogurt'))) {
        warnings.push(`Contains dairy (conflicts with ${restriction})`);
      }
      if (restrictionLower.includes('keto') && ingredients.some(ing => 
        ing.includes('rice') || ing.includes('pasta') || ing.includes('bread') || 
        ing.includes('potato') || ing.includes('sugar') || ing.includes('flour'))) {
        warnings.push(`Contains high-carb ingredients (conflicts with ${restriction})`);
      }
    });
    
    return {
      hasWarnings: warnings.length > 0,
      warnings: warnings
    };
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
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Chef Mike's AI Recipe Manager</h1>
            </div>
            
            {/* Desktop Navigation */}
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
                <CalendarClock className="h-4 w-4" />
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

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-gray-600">Welcome, {user?.firstName || 'Chef'}!</span>
              <Avatar>
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || 'C'}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || 'C'}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
                data-hamburger-button
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white shadow-lg" data-mobile-menu>
              <div className="px-4 py-3 space-y-2">
                <Button
                  variant={activeTab === "recipes" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("recipes");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <ChefHat className="h-4 w-4" />
                  Recipes
                </Button>
                <Button
                  variant={activeTab === "ai-generator" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("ai-generator");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  AI Generator
                </Button>
                <Button
                  variant={activeTab === "inventory" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("inventory");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Package className="h-4 w-4" />
                  Inventory
                </Button>
                <Button
                  variant={activeTab === "meal-planner" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("meal-planner");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <CalendarClock className="h-4 w-4" />
                  Meal Planner
                </Button>
                <Button
                  variant={activeTab === "shopping-list" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("shopping-list");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Shopping List
                </Button>

                <Button
                  variant={activeTab === "account" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("account");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <User className="h-4 w-4" />
                  Account
                </Button>
                {/* Plan Usage Widget */}
                <div className="px-3 py-2">
                  <PlanUsageWidget />
                </div>

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-sm text-gray-600 px-3 py-1">
                    Welcome, {user?.firstName || 'Chef'}!
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-red-600"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                              <Input 
                                id="title" 
                                name="title" 
                                placeholder="e.g., Grandma's Chocolate Chip Cookies" 
                                value={recipeTitle}
                                onChange={(e) => setRecipeTitle(e.target.value)}
                                required 
                              />
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
                              <Select value={recipeDifficulty} onValueChange={setRecipeDifficulty}>
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
                              value={recipeDescription}
                              onChange={(e) => setRecipeDescription(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="prepTime">Prep Time (min)</Label>
                              <Input 
                                id="prepTime" 
                                name="prepTime" 
                                type="number" 
                                placeholder="15" 
                                value={recipePrepTime}
                                onChange={(e) => setRecipePrepTime(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="cookTime">Cook Time (min)</Label>
                              <Input 
                                id="cookTime" 
                                name="cookTime" 
                                type="number" 
                                placeholder="30" 
                                value={recipeCookTime}
                                onChange={(e) => setRecipeCookTime(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="servings">Servings</Label>
                              <Input 
                                id="servings" 
                                name="servings" 
                                type="number" 
                                placeholder="4" 
                                value={recipeServings}
                                onChange={(e) => setRecipeServings(e.target.value)}
                              />
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
                                    <SelectItem value="each">Each</SelectItem>
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
                              <div className="flex flex-col gap-1 mt-1">
                                <Button 
                                  type="button" 
                                  onClick={() => moveInstructionUp(index)}
                                  variant="outline" 
                                  size="sm"
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                  title="Move up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button 
                                  type="button" 
                                  onClick={() => moveInstructionDown(index)}
                                  variant="outline" 
                                  size="sm"
                                  disabled={index === recipeInstructions.length - 1}
                                  className="h-6 w-6 p-0"
                                  title="Move down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
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

                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Expected CSV format:</p>
                          <div className="bg-background p-3 rounded border text-xs font-mono overflow-x-auto">
                            title,description,ingredients,instructions,cuisine,prepTime,cookTime,servings
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            • Ingredients should be JSON array format<br/>
                            • Instructions should be JSON array format<br/>
                            • Times should be in minutes
                          </p>
                        </div>
                        
                        {importProgress && (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">{importProgress}</p>
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
                        {/* Dietary Warnings */}
                        {(() => {
                          const warnings = checkRecipeWarnings(selectedRecipe);
                          return warnings.hasWarnings ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="font-semibold text-orange-800 mb-2">Dietary Warnings</h4>
                                  <ul className="space-y-1">
                                    {warnings.warnings.map((warning, index) => (
                                      <li key={index} className="text-sm text-orange-700">
                                        • {warning}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="text-xs text-orange-600 mt-2">
                                    Please review the ingredients carefully if you have dietary restrictions or allergies.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}

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

                        </div>

                        {/* Kitchen Timer Section */}
                        <Card className="p-4">
                          <KitchenTimer 
                            recipeName={selectedRecipe.title}
                            presetMinutes={selectedRecipe.cookTime || 15}
                          />
                        </Card>

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
                {filteredRecipes.map((recipe: Recipe) => {
                  const recipeWarnings = checkRecipeWarnings(recipe);
                  return (
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
                        {recipeWarnings.hasWarnings && (
                          <div className="flex items-center gap-1 ml-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-orange-600 font-medium">
                              {recipeWarnings.warnings.length} warning{recipeWarnings.warnings.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
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
                  );
                })}
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
                    {(() => {
                      console.log("Rendering Available Ingredients. Current inventory:", inventory);
                      console.log("Inventory count:", inventory.length);
                      return inventory.length > 0 ? (
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
                      );
                    })()}
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
                    preferences
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
                    if (newInventoryItem.addAsWaste) {
                      // Add directly to waste tracking
                      addWasteItemMutation.mutate({
                        ingredientName: newInventoryItem.name,
                        quantity: newInventoryItem.quantity,
                        unit: newInventoryItem.unit,
                        category: newInventoryItem.category,
                        totalCost: newInventoryItem.totalCost || undefined,
                        wasteReason: 'added_as_waste'
                      });
                    } else {
                      // Add to regular inventory
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
                    }
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
                        type="number"
                        step="0.01"
                        value={newInventoryItem.quantity}
                        onChange={(e) => {
                          const quantity = e.target.value;
                          const pricePerUnit = parseFloat(newInventoryItem.pricePerUnit) || 0;
                          const qty = parseFloat(quantity) || 0;
                          const totalCost = qty * pricePerUnit;
                          setNewInventoryItem({
                            ...newInventoryItem, 
                            quantity,
                            totalCost: totalCost > 0 ? totalCost.toFixed(2) : ""
                          });
                        }}
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
                        onChange={(e) => {
                          const pricePerUnit = e.target.value;
                          const quantity = parseFloat(newInventoryItem.quantity) || 0;
                          const price = parseFloat(pricePerUnit) || 0;
                          const totalCost = quantity * price;
                          setNewInventoryItem({
                            ...newInventoryItem, 
                            pricePerUnit,
                            totalCost: totalCost > 0 ? totalCost.toFixed(2) : ""
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="total-cost">Total Cost ($) - Auto-calculated</Label>
                      <Input 
                        id="total-cost" 
                        placeholder="Auto-calculated from quantity × price per unit"
                        type="number"
                        step="0.01"
                        value={newInventoryItem.totalCost}
                        onChange={(e) => setNewInventoryItem({...newInventoryItem, totalCost: e.target.value})}
                        className="bg-gray-50 text-gray-700"
                        readOnly
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
                  
                  {/* Add as Waste Option */}
                  <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="add-as-waste"
                      checked={newInventoryItem.addAsWaste || false}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, addAsWaste: e.target.checked})}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <Label htmlFor="add-as-waste" className="text-sm text-gray-700">
                      <span className="font-medium">Add as waste item</span> - for items that are already spoiled or expired
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={addInventoryMutation.isPending}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {addInventoryMutation.isPending ? 'Adding...' : (newInventoryItem.addAsWaste ? 'Add to Waste Tracking' : 'Add to Inventory')}
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
                              {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m
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
                            } else if (mealPlannerView === 'day') {
                              const newDate = new Date(selectedDate);
                              newDate.setDate(newDate.getDate() - 1);
                              setSelectedDate(newDate);
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
                            } else if (mealPlannerView === 'day') {
                              setSelectedDate(new Date());
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
                            } else if (mealPlannerView === 'day') {
                              const newDate = new Date(selectedDate);
                              newDate.setDate(newDate.getDate() + 1);
                              setSelectedDate(newDate);
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
                                      return recipe ? (
                                        <div key={plan.id} className="bg-blue-100 text-blue-800 rounded px-2 py-1 mb-1 text-xs w-full">
                                          <div className="flex items-center justify-between">
                                            <span 
                                              className="truncate cursor-pointer hover:underline transition-colors" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRecipePopup(recipe);
                                              }}
                                              title="Click to view recipe details"
                                            >
                                              {recipe.title}
                                            </span>
                                            <div className="flex gap-1 ml-2">
                                              <button
                                                onClick={() => {
                                                  const links = generateCalendarLink(recipe, date, 'breakfast');
                                                  window.open(links.google, '_blank');
                                                }}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Add to Google Calendar"
                                                data-testid={`button-google-calendar-${plan.id}`}
                                              >
                                                📅
                                              </button>
                                              <a
                                                href={generateCalendarLink(recipe, date, 'breakfast').apple}
                                                download={`breakfast-${recipe.title.replace(/\s+/g, '-').toLowerCase()}.ics`}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Add to Apple Calendar"
                                                data-testid={`link-apple-calendar-${plan.id}`}
                                              >
                                                🍎
                                              </a>
                                              <button
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Remove from meal plan"
                                                data-testid={`button-delete-${plan.id}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null;
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
                                      return recipe ? (
                                        <div key={plan.id} className="bg-green-100 text-green-800 rounded px-2 py-1 mb-1 text-xs w-full">
                                          <div className="flex items-center justify-between">
                                            <span 
                                              className="truncate cursor-pointer hover:underline transition-colors" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRecipePopup(recipe);
                                              }}
                                              title="Click to view recipe details"
                                            >
                                              {recipe.title}
                                            </span>
                                            <div className="flex gap-1 ml-2">
                                              <button
                                                onClick={() => {
                                                  const links = generateCalendarLink(recipe, date, 'lunch');
                                                  window.open(links.google, '_blank');
                                                }}
                                                className="text-green-600 hover:text-green-800"
                                                title="Add to Google Calendar"
                                                data-testid={`button-google-calendar-${plan.id}`}
                                              >
                                                📅
                                              </button>
                                              <a
                                                href={generateCalendarLink(recipe, date, 'lunch').apple}
                                                download={`lunch-${recipe.title.replace(/\s+/g, '-').toLowerCase()}.ics`}
                                                className="text-green-600 hover:text-green-800"
                                                title="Add to Apple Calendar"
                                                data-testid={`link-apple-calendar-${plan.id}`}
                                              >
                                                🍎
                                              </a>
                                              <button
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Remove from meal plan"
                                                data-testid={`button-delete-${plan.id}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null;
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
                                      return recipe ? (
                                        <div key={plan.id} className="bg-orange-100 text-orange-800 rounded px-2 py-1 mb-1 text-xs w-full">
                                          <div className="flex items-center justify-between">
                                            <span 
                                              className="truncate cursor-pointer hover:underline transition-colors" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRecipePopup(recipe);
                                              }}
                                              title="Click to view recipe details"
                                            >
                                              {recipe.title}
                                            </span>
                                            <div className="flex gap-1 ml-2">
                                              <button
                                                onClick={() => {
                                                  const links = generateCalendarLink(recipe, date, 'dinner');
                                                  window.open(links.google, '_blank');
                                                }}
                                                className="text-orange-600 hover:text-orange-800"
                                                title="Add to Google Calendar"
                                                data-testid={`button-google-calendar-${plan.id}`}
                                              >
                                                📅
                                              </button>
                                              <a
                                                href={generateCalendarLink(recipe, date, 'dinner').apple}
                                                download={`dinner-${recipe.title.replace(/\s+/g, '-').toLowerCase()}.ics`}
                                                className="text-orange-600 hover:text-orange-800"
                                                title="Add to Apple Calendar"
                                                data-testid={`link-apple-calendar-${plan.id}`}
                                              >
                                                🍎
                                              </a>
                                              <button
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Remove from meal plan"
                                                data-testid={`button-delete-${plan.id}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : null;
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
                                        <div key={plan.id} className="bg-purple-100 text-purple-800 rounded px-2 py-1 mb-1 text-xs w-full">
                                          <div className="flex items-center justify-between">
                                            <span className="truncate">{recipe?.title || 'Recipe'}</span>
                                            <div className="flex gap-1 ml-2">
                                              {recipe && (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      const links = generateCalendarLink(recipe, date, 'snack');
                                                      window.open(links.google, '_blank');
                                                    }}
                                                    className="text-purple-600 hover:text-purple-800"
                                                    title="Add to Google Calendar"
                                                    data-testid={`button-google-calendar-${plan.id}`}
                                                  >
                                                    📅
                                                  </button>
                                                  <a
                                                    href={generateCalendarLink(recipe, date, 'snack').apple}
                                                    download={`snack-${recipe?.title?.replace(/\s+/g, '-').toLowerCase() || 'snack'}.ics`}
                                                    className="text-purple-600 hover:text-purple-800"
                                                    title="Add to Apple Calendar"
                                                    data-testid={`link-apple-calendar-${plan.id}`}
                                                  >
                                                    🍎
                                                  </a>
                                                </>
                                              )}
                                              <button
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Remove from meal plan"
                                                data-testid={`button-delete-${plan.id}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
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
                      <div className="p-4">
                        <div className="grid grid-cols-1 gap-4">
                          {/* Day View - Single Day Layout */}
                          {(() => {
                            const dayMealPlans = mealPlans?.filter(plan => plan.date === selectedDate.toISOString().split('T')[0]) || [];
                            const breakfastPlans = dayMealPlans.filter(plan => plan.mealType === 'breakfast');
                            const lunchPlans = dayMealPlans.filter(plan => plan.mealType === 'lunch');
                            const dinnerPlans = dayMealPlans.filter(plan => plan.mealType === 'dinner');
                            const snackPlans = dayMealPlans.filter(plan => plan.mealType === 'snack');

                            return (
                              <>
                                {/* Breakfast */}
                                <div className="border rounded p-4">
                                  <h3 className="font-semibold text-lg mb-3 text-orange-600">🌅 Breakfast</h3>
                                  <div 
                                    className="min-h-[120px] border-2 border-dashed border-gray-200 rounded p-3"
                                    onDragOver={(e) => {
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
                                          date: selectedDate.toISOString().split('T')[0],
                                          mealType: 'breakfast'
                                        });
                                        checkMissingIngredients(recipe);
                                        toast({
                                          title: "Recipe Added",
                                          description: `${recipe.title} added to breakfast`,
                                        });
                                      } catch (error) {
                                        console.error('Error parsing dropped recipe:', error);
                                      }
                                    }}
                                  >
                                    {breakfastPlans.length === 0 ? (
                                      <p className="text-gray-400 text-center">Drop recipes here for breakfast</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {breakfastPlans.map(plan => {
                                          const recipe = recipes?.find(r => r.id === plan.recipeId);
                                          return recipe ? (
                                            <div key={plan.id} className="bg-orange-50 p-2 rounded flex justify-between items-center">
                                              <span 
                                                className="font-medium cursor-pointer hover:underline transition-colors" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRecipePopup(recipe);
                                                }}
                                                title="Click to view recipe details"
                                              >
                                                {recipe.title}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Lunch */}
                                <div className="border rounded p-4">
                                  <h3 className="font-semibold text-lg mb-3 text-blue-600">☀️ Lunch</h3>
                                  <div 
                                    className="min-h-[120px] border-2 border-dashed border-gray-200 rounded p-3"
                                    onDragOver={(e) => {
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
                                          date: selectedDate.toISOString().split('T')[0],
                                          mealType: 'lunch'
                                        });
                                        checkMissingIngredients(recipe);
                                        toast({
                                          title: "Recipe Added",
                                          description: `${recipe.title} added to lunch`,
                                        });
                                      } catch (error) {
                                        console.error('Error parsing dropped recipe:', error);
                                      }
                                    }}
                                  >
                                    {lunchPlans.length === 0 ? (
                                      <p className="text-gray-400 text-center">Drop recipes here for lunch</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {lunchPlans.map(plan => {
                                          const recipe = recipes?.find(r => r.id === plan.recipeId);
                                          return recipe ? (
                                            <div key={plan.id} className="bg-blue-50 p-2 rounded flex justify-between items-center">
                                              <span 
                                                className="font-medium cursor-pointer hover:underline transition-colors" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRecipePopup(recipe);
                                                }}
                                                title="Click to view recipe details"
                                              >
                                                {recipe.title}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Dinner */}
                                <div className="border rounded p-4">
                                  <h3 className="font-semibold text-lg mb-3 text-purple-600">🌙 Dinner</h3>
                                  <div 
                                    className="min-h-[120px] border-2 border-dashed border-gray-200 rounded p-3"
                                    onDragOver={(e) => {
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
                                          date: selectedDate.toISOString().split('T')[0],
                                          mealType: 'dinner'
                                        });
                                        checkMissingIngredients(recipe);
                                        toast({
                                          title: "Recipe Added",
                                          description: `${recipe.title} added to dinner`,
                                        });
                                      } catch (error) {
                                        console.error('Error parsing dropped recipe:', error);
                                      }
                                    }}
                                  >
                                    {dinnerPlans.length === 0 ? (
                                      <p className="text-gray-400 text-center">Drop recipes here for dinner</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {dinnerPlans.map(plan => {
                                          const recipe = recipes?.find(r => r.id === plan.recipeId);
                                          return recipe ? (
                                            <div key={plan.id} className="bg-purple-50 p-2 rounded flex justify-between items-center">
                                              <span 
                                                className="font-medium cursor-pointer hover:underline transition-colors" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRecipePopup(recipe);
                                                }}
                                                title="Click to view recipe details"
                                              >
                                                {recipe.title}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Snacks */}
                                <div className="border rounded p-4">
                                  <h3 className="font-semibold text-lg mb-3 text-green-600">🍿 Snacks</h3>
                                  <div 
                                    className="min-h-[120px] border-2 border-dashed border-gray-200 rounded p-3"
                                    onDragOver={(e) => {
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
                                          date: selectedDate.toISOString().split('T')[0],
                                          mealType: 'snack'
                                        });
                                        checkMissingIngredients(recipe);
                                        toast({
                                          title: "Recipe Added",
                                          description: `${recipe.title} added to snacks`,
                                        });
                                      } catch (error) {
                                        console.error('Error parsing dropped recipe:', error);
                                      }
                                    }}
                                  >
                                    {snackPlans.length === 0 ? (
                                      <p className="text-gray-400 text-center">Drop recipes here for snacks</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {snackPlans.map(plan => {
                                          const recipe = recipes?.find(r => r.id === plan.recipeId);
                                          return recipe ? (
                                            <div key={plan.id} className="bg-green-50 p-2 rounded flex justify-between items-center">
                                              <span 
                                                className="font-medium cursor-pointer hover:underline transition-colors" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRecipePopup(recipe);
                                                }}
                                                title="Click to view recipe details"
                                              >
                                                {recipe.title}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteMealPlanMutation.mutate(plan.id)}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Month View */}
                    {mealPlannerView === 'month' && (
                      <div className="p-4">
                        {(() => {
                          const today = new Date();
                          const currentMonth = today.getMonth();
                          const currentYear = today.getFullYear();
                          const firstDay = new Date(currentYear, currentMonth, 1);
                          const lastDay = new Date(currentYear, currentMonth + 1, 0);
                          const startDate = new Date(firstDay);
                          startDate.setDate(startDate.getDate() - firstDay.getDay());
                          
                          const days = [];
                          const current = new Date(startDate);
                          
                          for (let i = 0; i < 42; i++) {
                            days.push(new Date(current));
                            current.setDate(current.getDate() + 1);
                          }

                          return (
                            <div className="grid grid-cols-7 gap-1 h-[600px]">
                              {/* Week headers */}
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-100">
                                  {day}
                                </div>
                              ))}
                              
                              {/* Calendar days */}
                              {days.map((date, index) => {
                                const isCurrentMonth = date.getMonth() === currentMonth;
                                const isToday = date.toDateString() === today.toDateString();
                                const dateStr = date.toISOString().split('T')[0];
                                const dayMealPlans = mealPlans?.filter(plan => plan.date === dateStr) || [];
                                
                                return (
                                  <div
                                    key={index}
                                    className={`border p-1 min-h-[80px] ${
                                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                                    } ${isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      if (isCurrentMonth) {
                                        e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                      if (!isCurrentMonth) return;
                                      
                                      try {
                                        const recipe = JSON.parse(e.dataTransfer.getData('application/json'));
                                        addMealPlanMutation.mutate({
                                          recipeId: recipe.id,
                                          date: dateStr,
                                          mealType: 'dinner' // Default to dinner for month view
                                        });
                                        checkMissingIngredients(recipe);
                                        toast({
                                          title: "Recipe Added",
                                          description: `${recipe.title} added to ${date.toLocaleDateString()}`,
                                        });
                                      } catch (error) {
                                        console.error('Error parsing dropped recipe:', error);
                                      }
                                    }}
                                  >
                                    <div className="text-sm font-medium mb-1">
                                      {date.getDate()}
                                    </div>
                                    <div className="space-y-1">
                                      {dayMealPlans.slice(0, 2).map(plan => {
                                        const recipe = recipes?.find(r => r.id === plan.recipeId);
                                        return recipe ? (
                                          <div
                                            key={plan.id}
                                            className="text-xs bg-orange-100 text-orange-800 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-orange-200 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRecipePopup(recipe);
                                            }}
                                            title="Click to view recipe details"
                                          >
                                            {recipe.title}
                                          </div>
                                        ) : null;
                                      })}
                                      {dayMealPlans.length > 2 && (
                                        <div className="text-xs text-gray-500">
                                          +{dayMealPlans.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Shopping List */}
          <TabsContent value="shopping-list" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-8 w-8" />
                  Smart Shopping List
                </h1>
                <p className="text-gray-600">Organized by {selectedStore === 'all' ? 'grocery store' : selectedStore.charAt(0).toUpperCase() + selectedStore.slice(1)} sections with meal planning integration</p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Store Selection Dropdown */}
                {showPricing && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="store-select" className="text-sm font-medium whitespace-nowrap">Store:</Label>
                    <Select 
                      value={selectedStore} 
                      onValueChange={(value) => {
                        setSelectedStore(value);
                        // Refresh pricing when store changes
                        if (shoppingLists && shoppingLists.length > 0) {
                          fetchPricingData();
                        }
                      }}
                    >
                      <SelectTrigger className="w-40" id="store-select">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        <SelectItem value="kroger">Kroger</SelectItem>
                        <SelectItem value="target">Target - Coming Soon</SelectItem>
                        <SelectItem value="walmart">Walmart - Coming Soon</SelectItem>
                        <SelectItem value="safeway">Safeway - Coming Soon</SelectItem>
                        <SelectItem value="meijer">Meijer - Coming Soon</SelectItem>
                        <SelectItem value="giant-eagle">Giant Eagle - Coming Soon</SelectItem>
                        <SelectItem value="costco">Costco - Coming Soon</SelectItem>
                        <SelectItem value="wholefoods">Whole Foods - Coming Soon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPricing(!showPricing);
                    if (!showPricing && !pricingData) {
                      fetchPricingData();
                    }
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {showPricing ? 'Hide' : 'Show'} Prices
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="h-4 w-4 mr-2" />
                  Print List
                </Button>
                <Button onClick={() => setIsAddManualItemOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
            
            {/* Generate Shopping List from Meal Plans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Generate from Meal Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="shoppingStartDate">From Date</Label>
                    <Input 
                      type="date" 
                      id="shoppingStartDate" 
                      value={shoppingListStartDate}
                      onChange={(e) => setShoppingListStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoppingEndDate">To Date</Label>
                    <Input 
                      type="date" 
                      id="shoppingEndDate" 
                      value={shoppingListEndDate}
                      onChange={(e) => setShoppingListEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoppingListName">List Name</Label>
                    <Input 
                      id="shoppingListName" 
                      placeholder="Weekly Shopping List" 
                      value={shoppingListName}
                      onChange={(e) => setShoppingListName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleGenerateShoppingList}
                      disabled={generateShoppingListMutation.isPending}
                      className="w-full"
                    >
                      {generateShoppingListMutation.isPending ? "Generating..." : "Generate List"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      setShoppingListStartDate(today.toISOString().split('T')[0]);
                      setShoppingListEndDate(nextWeek.toISOString().split('T')[0]);
                      setShoppingListName(`Next 7 Days`);
                    }}
                  >
                    Next 7 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const twoWeeks = new Date(today);
                      twoWeeks.setDate(today.getDate() + 14);
                      setShoppingListStartDate(today.toISOString().split('T')[0]);
                      setShoppingListEndDate(twoWeeks.toISOString().split('T')[0]);
                      setShoppingListName(`Next 2 Weeks`);
                    }}
                  >
                    Next 2 Weeks
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const nextMonth = new Date(today);
                      nextMonth.setMonth(today.getMonth() + 1);
                      setShoppingListStartDate(today.toISOString().split('T')[0]);
                      setShoppingListEndDate(nextMonth.toISOString().split('T')[0]);
                      setShoppingListName(`Next Month`);
                    }}
                  >
                    Next Month
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shopping Lists Display */}
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
                  <p className="text-gray-600">Generate your first shopping list from your meal plans or add items manually</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {shoppingLists.slice(0, 1).map((list: ShoppingList) => {
                  // Parse items from JSON string if needed
                  const listItems = typeof list.items === 'string' 
                    ? JSON.parse(list.items || '[]') 
                    : (Array.isArray(list.items) ? list.items : []);
                  
                  return (
                    <div key={list.id} className="grid lg:grid-cols-4 gap-6">
                      {/* Meal Planning Sidebar */}
                      <Card className="lg:col-span-1">
                        <CardHeader>
                          <CardTitle className="text-lg">Planned Meals</CardTitle>
                          <p className="text-sm text-gray-600">
                            {list.startDate && list.endDate 
                              ? `${new Date(list.startDate).toLocaleDateString()} - ${new Date(list.endDate).toLocaleDateString()}`
                              : 'Custom List'
                            }
                          </p>
                        </CardHeader>
                      <CardContent className="space-y-3">
                        {list.mealPlanIds && list.mealPlanIds.length > 0 ? (
                          mealPlans
                            .filter(plan => list.mealPlanIds?.includes(plan.id))
                            .map(plan => {
                              const recipe = recipes.find(r => r.id === plan.recipeId);
                              return (
                                <div key={plan.id} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="text-sm font-medium">
                                    {new Date(plan.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-sm text-gray-600 capitalize">{plan.mealType}</div>
                                  <div className="text-sm text-gray-900">
                                    {recipe?.title || plan.customMeal || 'Unknown meal'}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            No meal plans linked
                          </div>
                        )}
                        
                        {/* Add Item Form */}
                        <div className="border-t pt-3 mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Add Item</h4>
                          <div className="space-y-2">
                            <Input
                              placeholder="Item name"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Qty"
                                value={newItemQuantity}
                                onChange={(e) => setNewItemQuantity(e.target.value)}
                                className="text-sm"
                              />
                              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="produce">Produce</SelectItem>
                                  <SelectItem value="deli">Deli</SelectItem>
                                  <SelectItem value="poultry">Poultry</SelectItem>
                                  <SelectItem value="red-meat">Red Meat</SelectItem>
                                  <SelectItem value="dairy">Dairy</SelectItem>
                                  <SelectItem value="canned-goods">Canned Goods</SelectItem>
                                  <SelectItem value="ethnic-foods">Ethnic Foods</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={async () => {
                                if (!newItemName.trim()) return;
                                
                                const category = getItemCategory(newItemName.trim());
                                if (category === 'skip') {
                                  toast({
                                    title: "Item Skipped",
                                    description: `${newItemName.trim()} is typically not needed on shopping lists.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                try {
                                  const newItem = {
                                    id: Date.now().toString(),
                                    name: newItemName.trim(),
                                    quantity: newItemQuantity || '1',
                                    unit: 'item',
                                    category: newItemCategory || category,
                                    checked: false,
                                    manuallyAdded: true
                                  };
                                  
                                  const currentItems = typeof list.items === 'string' 
                                    ? JSON.parse(list.items || '[]') 
                                    : (Array.isArray(list.items) ? list.items : []);
                                  
                                  await updateShoppingListMutation.mutateAsync({
                                    ...list,
                                    items: JSON.stringify([...currentItems, newItem])
                                  });
                                  
                                  // Reset form
                                  setNewItemName('');
                                  setNewItemQuantity('');
                                  setNewItemCategory('other');
                                  
                                  // Refresh shopping lists
                                  queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
                                  
                                  toast({
                                    title: "Item Added",
                                    description: `${newItem.name} added to your shopping list!`,
                                  });
                                } catch (error) {
                                  console.error('Failed to add item:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to add item to shopping list",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={!newItemName.trim()}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Item
                            </Button>
                          </div>
                        </div>

                        {/* Frequent Items Suggestions */}
                        <div className="border-t pt-3 mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Add</h4>
                          <div className="space-y-1">
                            {['Milk', 'Eggs', 'Bread', 'Bananas', 'Chicken'].map(item => (
                              <Button
                                key={item}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={async () => {
                                  try {
                                    const category = getItemCategory(item);
                                    if (category === 'skip') {
                                      toast({
                                        title: "Item Skipped",
                                        description: `${item} is typically not needed on shopping lists.`,
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    const newItem = {
                                      id: Date.now().toString(),
                                      name: item,
                                      quantity: '1',
                                      unit: 'item',
                                      category: category,
                                      checked: false,
                                      manuallyAdded: true
                                    };
                                    
                                    const currentItems = typeof list.items === 'string' 
                                      ? JSON.parse(list.items || '[]') 
                                      : (Array.isArray(list.items) ? list.items : []);
                                    
                                    await updateShoppingListMutation.mutateAsync({
                                      ...list,
                                      items: JSON.stringify([...currentItems, newItem])
                                    });
                                    
                                    // Refresh shopping lists
                                    queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
                                    
                                    toast({
                                      title: "Item Added",
                                      description: `${item} added to your shopping list!`,
                                    });
                                  } catch (error) {
                                    console.error('Failed to add item:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to add item to shopping list",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {item}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Pricing Summary */}
                        {showPricing && pricingData?.items && (
                          <div className="border-t pt-3 mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Price Summary</h4>
                            <div className="space-y-2">
                              {(() => {
                                const uncheckedItems = listItems.filter(item => !item.checked);
                                const categoryOrder = getStoreCategoryOrder(selectedStore);
                                
                                // Group items by category and calculate totals
                                const itemsByCategory = uncheckedItems.reduce((acc, item) => {
                                  const category = item.category || 'other';
                                  if (!acc[category]) acc[category] = [];
                                  acc[category].push(item);
                                  return acc;
                                }, {} as Record<string, typeof uncheckedItems>);

                                let grandTotal = 0;
                                // Get all categories that actually have items, plus the predefined order  
                                const allCategoriesWithItems = Object.keys(itemsByCategory);
                                const orderedCategories = [...new Set([...categoryOrder, ...allCategoriesWithItems])];
                                
                                const categoryTotals = orderedCategories.map(category => {
                                  const categoryItems = itemsByCategory[category] || [];
                                  if (categoryItems.length === 0) return null;
                                  
                                  const categoryTotal = categoryItems.reduce((total, item) => {
                                    const pricingItem = pricingData.items.find((p: any) => p.name.toLowerCase() === item.name.toLowerCase());
                                    if (pricingItem?.pricing?.length > 0) {
                                      const bestPrice = pricingItem.pricing.reduce((min: any, store: any) => 
                                        store.inStock && store.price < min.price ? store : min, 
                                        pricingItem.pricing.find((p: any) => p.inStock) || pricingItem.pricing[0]
                                      );
                                      return total + (bestPrice.price || 0);
                                    }
                                    return total;
                                  }, 0);
                                  
                                  grandTotal += categoryTotal;
                                  
                                  if (categoryTotal > 0) {
                                    return (
                                      <div key={category} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">
                                          {getStoreCategoryName(category, selectedStore)}
                                        </span>
                                        <span className="font-medium text-green-700">
                                          ${categoryTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }).filter(Boolean);
                                
                                return (
                                  <>
                                    {categoryTotals}
                                    <div className="border-t pt-2 mt-2">
                                      <div className="flex justify-between items-center font-semibold">
                                        <span className="text-gray-900">Total Estimate:</span>
                                        <span className="text-lg text-green-700">
                                          ${grandTotal.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Based on best prices across stores
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Checked Items */}
                        {(() => {
                          const checkedItems = listItems.filter(item => item.checked);
                          if (checkedItems.length === 0) return null;
                          
                          return (
                            <div className="border-t pt-3 mt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Checked Items ({checkedItems.length})
                              </h4>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {checkedItems.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-green-50 rounded border text-xs"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium text-green-800 line-through">
                                        {item.name}
                                      </div>
                                      <div className="text-green-600">
                                        {item.quantity} {item.unit}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updatedItems = listItems.map(i => 
                                          i.id === item.id ? { ...i, checked: false } : i
                                        );
                                        updateShoppingListMutation.mutate({
                                          ...list,
                                          items: JSON.stringify(updatedItems)
                                        });
                                      }}
                                      className="text-green-700 hover:text-green-900 h-6 w-6 p-0"
                                      title="Uncheck item"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Shopping List - Grocery Store Layout */}
                    <Card className="lg:col-span-3">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{list.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {listItems.filter(i => !i.checked).length} items left
                            </Badge>
                            <Badge variant={listItems.filter(i => i.checked).length > 0 ? "default" : "secondary"}>
                              {listItems.filter(i => i.checked).length} completed
                            </Badge>
                            {showPricing && pricingData?.totalEstimate && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Est. ${pricingData.totalEstimate}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="shopping-list-printable">
                          <div className="print-only hidden print:block mb-6">
                            <h1 className="text-2xl font-bold mb-2">{list.name}</h1>
                            <p className="text-gray-600">
                              {list.startDate && list.endDate 
                                ? `${new Date(list.startDate).toLocaleDateString()} - ${new Date(list.endDate).toLocaleDateString()}`
                                : 'Shopping List'
                              }
                            </p>
                          </div>
                        {/* Store-Organized Shopping List */}
                        <div className="space-y-6">
                          {(() => {
                            const uncheckedItems = listItems.filter(item => !item.checked);
                            const categoryOrder = getStoreCategoryOrder(selectedStore);
                            
                            // Group items by category
                            const itemsByCategory = uncheckedItems.reduce((acc, item) => {
                              const category = item.category || 'other';
                              if (!acc[category]) acc[category] = [];
                              acc[category].push(item);
                              return acc;
                            }, {} as Record<string, typeof uncheckedItems>);

                            // Get all categories that actually have items, plus the predefined order
                            const allCategoriesWithItems = Object.keys(itemsByCategory);
                            const orderedCategories = [...new Set([...categoryOrder, ...allCategoriesWithItems])];

                            return orderedCategories.map(category => {
                              const categoryItems = itemsByCategory[category] || [];
                              if (categoryItems.length === 0) return null;

                              return (
                                <div key={category} className="category-section">
                                  <div className="category-header mb-3 pb-2 border-b-2 border-orange-200">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-800 print:text-black">
                                          {getStoreCategoryName(category, selectedStore)}
                                        </h3>
                                        <p className="text-sm text-gray-500 print:text-gray-700">
                                          {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      {showPricing && pricingData?.items && (() => {
                                        // Calculate category total
                                        const categoryTotal = categoryItems.reduce((total, item) => {
                                          const pricingItem = pricingData.items.find((p: any) => p.name.toLowerCase() === item.name.toLowerCase());
                                          if (pricingItem?.pricing?.length > 0) {
                                            const bestPrice = pricingItem.pricing.reduce((min: any, store: any) => 
                                              store.inStock && store.price < min.price ? store : min, 
                                              pricingItem.pricing.find((p: any) => p.inStock) || pricingItem.pricing[0]
                                            );
                                            return total + (bestPrice.price || 0);
                                          }
                                          return total;
                                        }, 0);
                                        
                                        if (categoryTotal > 0) {
                                          return (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 print:hidden">
                                              ${categoryTotal.toFixed(2)}
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {categoryItems.map((item) => (
                                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 print-item">
                              <Checkbox 
                                checked={item.checked}
                                onCheckedChange={(checked) => {
                                  const updatedItems = listItems.map(i => 
                                    i.id === item.id ? { ...i, checked: !!checked } : i
                                  );
                                  updateShoppingListMutation.mutate({
                                    ...list,
                                    items: JSON.stringify(updatedItems)
                                  });
                                }}
                                className="print:hidden"
                              />
                              <div className={`flex-1 ${item.checked ? "opacity-50 line-through" : ""}`}>
                                <div className="font-medium print-item-name">• {item.name}</div>
                                <div className="text-sm text-gray-500 print-item-details print:text-black">
                                  {item.quantity} {item.unit}
                                </div>
                                <div className="flex items-center gap-2 mt-1 print:hidden">
                                  <span className="text-xs text-gray-400">Category:</span>
                                  <Select 
                                    value={item.category || 'other'} 
                                    onValueChange={(newCategory) => {
                                      const updatedItems = listItems.map(i => 
                                        i.id === item.id ? { ...i, category: newCategory } : i
                                      );
                                      updateShoppingListMutation.mutate({
                                        ...list,
                                        items: JSON.stringify(updatedItems)
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-6 w-auto min-w-24 text-xs bg-transparent border-0 shadow-none p-1">
                                      <SelectValue>
                                        <span className="text-orange-600 font-medium text-xs">
                                          {categoryDisplayNames[item.category] || item.category}
                                        </span>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(categoryDisplayNames).map(([value, label]) => (
                                        <SelectItem key={value} value={value} className="text-xs">
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {showPricing && pricingData?.items && (() => {
                                  const pricingItem = pricingData.items.find((p: any) => p.name.toLowerCase() === item.name.toLowerCase());
                                  if (pricingItem?.pricing?.length > 0) {
                                    const bestPrice = pricingItem.pricing.reduce((min: any, store: any) => 
                                      store.inStock && store.price < min.price ? store : min, 
                                      pricingItem.pricing.find((p: any) => p.inStock) || pricingItem.pricing[0]
                                    );
                                    return (
                                      <div className="text-xs text-green-600 mt-1 print:hidden">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-lg">${bestPrice.price}</span>
                                          <span className="text-gray-500">at {bestPrice.storeName}</span>
                                          {bestPrice.onSale && <Badge variant="destructive" className="text-xs">Sale</Badge>}
                                          {!bestPrice.inStock && <Badge variant="outline" className="text-xs">Out of Stock</Badge>}
                                        </div>
                                        {pricingItem.pricing.length > 1 && (
                                          <div className="text-gray-400 text-xs">
                                            {pricingItem.pricing.length - 1} other store{pricingItem.pricing.length > 2 ? 's' : ''} available
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedItems = listItems.filter(i => i.id !== item.id);
                                  updateShoppingListMutation.mutate({
                                    ...list,
                                    items: JSON.stringify(updatedItems)
                                  });
                                }}
                                className="text-red-600 hover:text-red-800 h-6 w-6 p-0 print:hidden"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }).filter(Boolean);
                          })()}
                          
                          {listItems.filter(item => !item.checked).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                              <p>All items checked off!</p>
                            </div>
                          )}
                        </div>
                        </div>
                        
                        {/* Completed Items Section */}
                        {listItems.filter(i => i.checked).length > 0 && (
                          <div className="border-t mt-6 pt-4">
                            <Button
                              variant="ghost"
                              onClick={() => setShowCompletedItems(!showCompletedItems)}
                              className="mb-3"
                            >
                              {showCompletedItems ? 'Hide' : 'Show'} Completed Items ({listItems.filter(i => i.checked).length})
                            </Button>
                            
                            {showCompletedItems && (
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {listItems.filter(i => i.checked).map((item) => (
                                  <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded opacity-75">
                                    <Checkbox 
                                      checked={true}
                                      onCheckedChange={() => {
                                        const updatedItems = listItems.map(i => 
                                          i.id === item.id ? { ...i, checked: false } : i
                                        );
                                        updateShoppingListMutation.mutate({
                                          ...list,
                                          items: JSON.stringify(updatedItems)
                                        });
                                      }}
                                    />
                                    <div className="flex-1 line-through">
                                      <div className="font-medium text-sm">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.quantity} {item.unit}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                <User className="h-8 w-8" />
                Account Settings
              </h1>
              <Button variant="outline" onClick={() => setActiveTab("meal-planner")} data-testid="button-back-to-app">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to App
              </Button>
            </div>
            
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
                    <Select onValueChange={(value) => {
                      if (value && !tempPreferences.dietaryRestrictions.includes(value)) {
                        setTempPreferences(prev => ({
                          ...prev,
                          dietaryRestrictions: [...prev.dietaryRestrictions, value]
                        }));
                      }
                    }}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select dietary restrictions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                        <SelectItem value="dairy-free">Dairy-Free</SelectItem>
                        <SelectItem value="keto">Keto</SelectItem>
                        <SelectItem value="paleo">Paleo</SelectItem>
                        <SelectItem value="low-carb">Low-Carb</SelectItem>
                        <SelectItem value="low-fat">Low-Fat</SelectItem>
                        <SelectItem value="low-sodium">Low-Sodium</SelectItem>
                        <SelectItem value="sugar-free">Sugar-Free</SelectItem>
                        <SelectItem value="kosher">Kosher</SelectItem>
                        <SelectItem value="halal">Halal</SelectItem>
                        <SelectItem value="pescatarian">Pescatarian</SelectItem>
                        <SelectItem value="raw-food">Raw Food</SelectItem>
                        <SelectItem value="whole30">Whole30</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tempPreferences.dietaryRestrictions.map((restriction, index) => (
                        <Badge key={index} variant="secondary" className="gap-2">
                          {restriction}
                          <button 
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => {
                              setTempPreferences(prev => ({
                                ...prev,
                                dietaryRestrictions: prev.dietaryRestrictions.filter(r => r !== restriction)
                              }));
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Allergies</Label>
                    <Select onValueChange={(value) => {
                      if (value && !tempPreferences.allergies.includes(value)) {
                        setTempPreferences(prev => ({
                          ...prev,
                          allergies: [...prev.allergies, value]
                        }));
                      }
                    }}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select allergies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peanuts">Peanuts</SelectItem>
                        <SelectItem value="tree-nuts">Tree Nuts</SelectItem>
                        <SelectItem value="milk">Milk</SelectItem>
                        <SelectItem value="eggs">Eggs</SelectItem>
                        <SelectItem value="wheat">Wheat</SelectItem>
                        <SelectItem value="soy">Soy</SelectItem>
                        <SelectItem value="fish">Fish</SelectItem>
                        <SelectItem value="shellfish">Shellfish</SelectItem>
                        <SelectItem value="sesame">Sesame</SelectItem>
                        <SelectItem value="mustard">Mustard</SelectItem>
                        <SelectItem value="celery">Celery</SelectItem>
                        <SelectItem value="lupin">Lupin</SelectItem>
                        <SelectItem value="sulfites">Sulfites</SelectItem>
                        <SelectItem value="corn">Corn</SelectItem>
                        <SelectItem value="coconut">Coconut</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tempPreferences.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="gap-2">
                          {allergy}
                          <button 
                            className="text-red-200 hover:text-red-100"
                            onClick={() => {
                              setTempPreferences(prev => ({
                                ...prev,
                                allergies: prev.allergies.filter(a => a !== allergy)
                              }));
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => savePreferencesMutation.mutate(tempPreferences)}
                    disabled={savePreferencesMutation.isPending}
                  >
                    {savePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
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
                      Download all your recipes, meal plans, and preferences as a CSV file.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleExportData}
                      data-testid="button-download-backup"
                    >
                      Download CSV Backup
                    </Button>
                  </div>
                  
                  {/* Import */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import Data
                    </h4>
                    <p className="text-gray-600 text-sm mb-4">
                      Upload a CSV file to restore your data from a previous backup.
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportData}
                      className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      data-testid="input-import-csv"
                    />
                    <div className="text-xs text-gray-500">
                      Select a CSV file exported from this app
                    </div>
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
        <DialogContent className="max-w-lg" aria-describedby="rating-dialog-description">
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
              
              <div className="space-y-3">
                <Label>Rating (1-10):</Label>
                <div className="flex items-center justify-center gap-1 flex-wrap">
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
                      data-testid={`star-${i + 1}`}
                    >
                      <Star className={`h-5 w-5 ${i < selectedRecipeRating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">
                    {selectedRecipeRating > 0 ? `${selectedRecipeRating}/10 stars` : 'Select rating'}
                  </span>
                </div>
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
                  data-testid="button-cancel-rating"
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
                  data-testid="button-submit-rating"
                >
                  {rateRecipeMutation.isPending ? 'Rating...' : 'Submit Rating'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isBarcodeScanning} onOpenChange={(open) => {
        setIsBarcodeScanning(open);
        if (!open) {
          stopScanning();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
              {isScanning ? (
                <>
                  <p className="text-gray-600 mb-4">Position barcode in front of camera</p>
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video 
                      ref={videoRef}
                      className="w-full h-64 object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-white rounded-lg"></div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={stopScanning}
                    className="mt-4"
                  >
                    Stop Scanning
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Start camera to scan barcodes</p>
                  <Button 
                    onClick={startScanning}
                    className="mb-4"
                  >
                    Start Camera
                  </Button>
                </>
              )}
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
                  stopScanning();
                  if (newInventoryItem.upcBarcode) {
                    toast({
                      title: "Barcode Added",
                      description: `Barcode ${newInventoryItem.upcBarcode} has been added to the item form`,
                    });
                  }
                }}
                className="flex-1"
                disabled={!newInventoryItem.upcBarcode}
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
                <Input 
                  placeholder="e.g., Whole Foods" 
                  value={receiptData.storeName}
                  onChange={(e) => setReceiptData(prev => ({ ...prev, storeName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input 
                  type="date" 
                  value={receiptData.purchaseDate}
                  onChange={(e) => setReceiptData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Upload a receipt image</p>
              <p className="text-xs text-gray-500 mb-4">Note: For PDF receipts, please convert to image format first</p>
              {receiptFile ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">{receiptFile.name}</p>
                  <p className="text-sm text-green-600">File uploaded successfully</p>
                </div>
              ) : (
                <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No file selected</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => document.getElementById('receipt-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt Photo
              </Button>
            </div>

            {/* Manual Item Entry */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Items Found ({receiptItems.length})</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {receiptItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2">
                    <Input 
                      placeholder="Item name" 
                      value={item.name || ''}
                      onChange={(e) => {
                        const newItems = [...receiptItems];
                        newItems[index] = { ...newItems[index], name: e.target.value };
                        setReceiptItems(newItems);
                      }}
                    />
                    <Input 
                      placeholder="Qty" 
                      type="number" 
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const newItems = [...receiptItems];
                        newItems[index] = { ...newItems[index], quantity: e.target.value };
                        setReceiptItems(newItems);
                      }}
                    />
                    <Input 
                      placeholder="Unit" 
                      value={item.unit || ''}
                      onChange={(e) => {
                        const newItems = [...receiptItems];
                        newItems[index] = { ...newItems[index], unit: e.target.value };
                        setReceiptItems(newItems);
                      }}
                    />
                    <Input 
                      placeholder="Price" 
                      type="number" 
                      step="0.01" 
                      value={item.price || ''}
                      onChange={(e) => {
                        const newItems = [...receiptItems];
                        newItems[index] = { ...newItems[index], price: e.target.value };
                        setReceiptItems(newItems);
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newItems = receiptItems.filter((_, i) => i !== index);
                        setReceiptItems(newItems);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setReceiptItems([...receiptItems, { name: '', quantity: '', unit: '', price: '', category: 'uncategorized' }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsReceiptScanning(false);
                  setReceiptItems([]);
                  setReceiptFile(null);
                  setReceiptData({ storeName: '', purchaseDate: new Date().toISOString().split('T')[0] });
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleProcessReceipt}
                disabled={receiptMutation.isPending || receiptItems.length === 0}
                className="flex-1"
              >
                {receiptMutation.isPending ? 'Processing...' : 'Process Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Item Dialog */}
      <Dialog open={isAddManualItemOpen} onOpenChange={setIsAddManualItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                placeholder="e.g., Milk, Bananas, Chicken Breast"
                value={manualItem.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const suggestedCategory = categorizeIngredient(newName);
                  setManualItem({ 
                    ...manualItem, 
                    name: newName,
                    category: suggestedCategory
                  });
                }}
              />
              {manualItem.name && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-categorized as: <span className="font-medium text-orange-600">
                    {categoryDisplayNames[manualItem.category] || manualItem.category}
                  </span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemQuantity">Quantity</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="1"
                  value={manualItem.quantity}
                  onChange={(e) => setManualItem({ ...manualItem, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="itemUnit">Unit</Label>
                <Select value={manualItem.unit} onValueChange={(value) => setManualItem({ ...manualItem, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">item</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="tsp">tsp</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                    <SelectItem value="gallon">gallon</SelectItem>
                    <SelectItem value="quart">quart</SelectItem>
                    <SelectItem value="pint">pint</SelectItem>
                    <SelectItem value="package">package</SelectItem>
                    <SelectItem value="can">can</SelectItem>
                    <SelectItem value="bottle">bottle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="itemCategory">Store Section</Label>
              <Select value={manualItem.category} onValueChange={(value) => setManualItem({ ...manualItem, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryDisplayNames).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddManualItemOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    // Add item to most recent shopping list or create new one
                    if (shoppingLists && shoppingLists.length > 0) {
                      const latestList = shoppingLists[0];
                      const newItem = {
                        id: Date.now().toString(),
                        name: manualItem.name,
                        quantity: manualItem.quantity,
                        unit: manualItem.unit,
                        category: manualItem.category,
                        checked: false,
                        manuallyAdded: true
                      };
                      
                      const currentItems = typeof latestList.items === 'string' 
                        ? JSON.parse(latestList.items || '[]') 
                        : (Array.isArray(latestList.items) ? latestList.items : []);
                      
                      await updateShoppingListMutation.mutateAsync({
                        ...latestList,
                        items: JSON.stringify([...currentItems, newItem])
                      });
                      
                      toast({
                        title: "Item Added",
                        description: `${manualItem.name} added to your shopping list!`,
                      });
                    } else {
                      // Create new shopping list with the item
                      await generateShoppingListMutation.mutateAsync({
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0],
                        name: "Quick Shopping List",
                        items: [{
                          id: Date.now().toString(),
                          name: manualItem.name,
                          quantity: manualItem.quantity,
                          unit: manualItem.unit,
                          category: manualItem.category,
                          checked: false,
                          manuallyAdded: true
                        }]
                      });
                      
                      toast({
                        title: "Shopping List Created",
                        description: `New shopping list created with ${manualItem.name}!`,
                      });
                    }
                    
                    setManualItem({ name: '', quantity: '1', unit: 'item', category: 'produce' });
                    setIsAddManualItemOpen(false);
                  } catch (error) {
                    console.error('Error adding manual item:', error);
                    toast({
                      title: "Error",
                      description: "Failed to add item to shopping list",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!manualItem.name.trim() || updateShoppingListMutation.isPending || generateShoppingListMutation.isPending}
                className="flex-1"
              >
                {updateShoppingListMutation.isPending || generateShoppingListMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Reports Dialog */}
      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Food Cost Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ${reports?.totalSpent?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Total Spending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    ${reports?.mostWastedItems?.reduce((sum, item) => sum + item.totalWasted, 0)?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Food Waste Cost</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    ${reports?.mostUsedItems?.reduce((sum, item) => sum + item.totalUsed, 0)?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Used Items Cost</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Purchased Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {reports?.mostFrequentItems?.length > 0 ? (
                      reports.mostFrequentItems.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.count} purchases</div>
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            ${item.totalSpent.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No purchase data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Most Wasted Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {reports?.mostWastedItems?.length > 0 ? (
                      reports.mostWastedItems.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.count} times wasted</div>
                          </div>
                          <div className="text-sm text-red-600 font-medium">
                            ${item.totalWasted.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No waste data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Most Used Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {reports?.mostUsedItems?.length > 0 ? (
                      reports.mostUsedItems.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.count} times used</div>
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            ${item.totalUsed.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No usage data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {reports?.categoryBreakdown?.length > 0 ? (
                    reports.categoryBreakdown.map((item, index) => {
                      const totalSpent = reports.totalSpent || 1;
                      const percentage = ((item.totalSpent / totalSpent) * 100).toFixed(1);
                      return (
                        <div key={`${item.category}-${index}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm capitalize">{item.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">${item.totalSpent.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No category data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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

          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsReportsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Recipe Popup Dialog for Mobile & Touch */}
      <Dialog open={!!selectedRecipePopup} onOpenChange={(open) => !open && setSelectedRecipePopup(null)}>
        <DialogContent className="sm:max-w-lg max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {selectedRecipePopup?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecipePopup && (
            <div className="space-y-4">
              {selectedRecipePopup.description && (
                <p className="text-sm text-gray-600">{selectedRecipePopup.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {selectedRecipePopup.prepTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedRecipePopup.prepTime}m prep
                  </span>
                )}
                {selectedRecipePopup.cookTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedRecipePopup.cookTime}m cook
                  </span>
                )}
                {selectedRecipePopup.servings && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedRecipePopup.servings} servings
                  </span>
                )}
              </div>
              
              {selectedRecipePopup.ingredients && selectedRecipePopup.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Ingredients:</h4>
                  <div className="text-sm text-gray-600">
                    {selectedRecipePopup.ingredients.slice(0, 6).map(ing => ing.item).join(', ')}
                    {selectedRecipePopup.ingredients.length > 6 && '...'}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (selectedRecipePopup) {
                      setSelectedRecipe(selectedRecipePopup);
                      setIsRecipeModalOpen(true);
                      setSelectedRecipePopup(null);
                    }
                  }}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Recipe
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedRecipePopup(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
