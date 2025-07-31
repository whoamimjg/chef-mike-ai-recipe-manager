import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PlanUsage {
  plan: string;
  usage: {
    recipes: {
      current: number;
      limit: number;
      percentage: number;
    };
    shoppingLists: {
      current: number;
      limit: number;
      percentage: number;
    };
  };
  features: string[];
}

export function usePlanLimits() {
  const { toast } = useToast();
  
  const { data: usage, isLoading } = useQuery<PlanUsage>({
    queryKey: ['/api/plan/usage'],
  });

  const checkRecipeLimit = () => {
    if (!usage || usage.usage.recipes.limit === -1) return true;
    
    const isAtLimit = usage.usage.recipes.current >= usage.usage.recipes.limit;
    
    if (isAtLimit) {
      toast({
        title: "Recipe Limit Reached",
        description: `You've reached your limit of ${usage.usage.recipes.limit} recipes. Upgrade to Pro for unlimited recipes!`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const checkShoppingListLimit = () => {
    if (!usage || usage.usage.shoppingLists.limit === -1) return true;
    
    const isAtLimit = usage.usage.shoppingLists.current >= usage.usage.shoppingLists.limit;
    
    if (isAtLimit) {
      toast({
        title: "Shopping List Limit Reached",
        description: `You've reached your limit of ${usage.usage.shoppingLists.limit} shopping lists. Upgrade to Pro for unlimited lists!`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const showUpgradePrompt = (feature: string) => {
    toast({
      title: "Upgrade Required",
      description: `${feature} requires a Pro or Family plan. Upgrade now to unlock this feature!`,
      variant: "default",
    });
  };

  return {
    usage,
    isLoading,
    checkRecipeLimit,
    checkShoppingListLimit,
    showUpgradePrompt,
    isPro: usage?.plan === 'pro' || usage?.plan === 'family',
    isFree: usage?.plan === 'free'
  };
}