import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, AlertTriangle } from "lucide-react";

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

export function PlanUsageWidget() {
  const { data: usage, isLoading } = useQuery<PlanUsage>({
    queryKey: ['/api/plan/usage'],
  });

  if (isLoading || !usage) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isNearLimit = (percentage: number) => percentage >= 80;
  const isAtLimit = (percentage: number) => percentage >= 100;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {usage.plan === 'free' ? (
              <>
                <span>Free Plan</span>
                <Badge variant="secondary">Current</Badge>
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="capitalize">{usage.plan} Plan</span>
                <Badge variant="default">Active</Badge>
              </>
            )}
          </CardTitle>
          {usage.plan === 'free' && (
            <Button 
              size="sm" 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => window.location.href = '/signup'}
            >
              Upgrade
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipe Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Recipes</span>
            <span className="text-muted-foreground">
              {usage.usage.recipes.current}
              {usage.usage.recipes.limit === -1 ? '' : ` / ${usage.usage.recipes.limit}`}
            </span>
          </div>
          {usage.usage.recipes.limit !== -1 && (
            <>
              <Progress 
                value={usage.usage.recipes.percentage} 
                className="h-2"
              />
              {isNearLimit(usage.usage.recipes.percentage) && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    {isAtLimit(usage.usage.recipes.percentage) 
                      ? "Recipe limit reached! Upgrade to add more."
                      : "Approaching recipe limit"
                    }
                  </span>
                </div>
              )}
            </>
          )}
          {usage.usage.recipes.limit === -1 && (
            <div className="text-xs text-green-600 font-medium">Unlimited</div>
          )}
        </div>

        {/* Shopping Lists Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Shopping Lists</span>
            <span className="text-muted-foreground">
              {usage.usage.shoppingLists.current}
              {usage.usage.shoppingLists.limit === -1 ? '' : ` / ${usage.usage.shoppingLists.limit}`}
            </span>
          </div>
          {usage.usage.shoppingLists.limit !== -1 && (
            <>
              <Progress 
                value={usage.usage.shoppingLists.percentage} 
                className="h-2"
              />
              {isNearLimit(usage.usage.shoppingLists.percentage) && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    {isAtLimit(usage.usage.shoppingLists.percentage) 
                      ? "Shopping list limit reached! Upgrade to add more."
                      : "Approaching shopping list limit"
                    }
                  </span>
                </div>
              )}
            </>
          )}
          {usage.usage.shoppingLists.limit === -1 && (
            <div className="text-xs text-green-600 font-medium">Unlimited</div>
          )}
        </div>

        {/* Upgrade prompt for free users */}
        {usage.plan === 'free' && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">
              Upgrade to Pro for unlimited recipes, AI recommendations, and more!
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/api/login'}
            >
              View Plans
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}