import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Utensils, Heart, AlertTriangle, ChefHat } from "lucide-react";
import { 
  DIETARY_RESTRICTIONS,
  COMMON_ALLERGIES,
  CUISINE_TYPES,
  COOKING_GOALS
} from "@shared/schema";

interface DietaryPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  cuisinePreferences: string[];
  dislikedIngredients: string[];
  cookingExperience: 'beginner' | 'intermediate' | 'advanced';
  cookingGoals: string[];
}

interface DietaryPreferencesStepProps {
  preferences: DietaryPreferences;
  onUpdate: (preferences: DietaryPreferences) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function DietaryPreferencesStep({ 
  preferences, 
  onUpdate, 
  onNext, 
  onBack, 
  isLoading = false 
}: DietaryPreferencesStepProps) {
  const [dislikedInput, setDislikedInput] = useState("");

  const updatePreference = <K extends keyof DietaryPreferences>(
    key: K,
    value: DietaryPreferences[K]
  ) => {
    onUpdate({ ...preferences, [key]: value });
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const addDislikedIngredient = () => {
    if (dislikedInput.trim() && !preferences.dislikedIngredients.includes(dislikedInput.trim())) {
      updatePreference('dislikedIngredients', [...preferences.dislikedIngredients, dislikedInput.trim()]);
      setDislikedInput("");
    }
  };

  const removeDislikedIngredient = (ingredient: string) => {
    updatePreference('dislikedIngredients', preferences.dislikedIngredients.filter(i => i !== ingredient));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tell us about your food preferences</h1>
            <p className="text-gray-600">Help us personalize your culinary experience</p>
          </div>

          <div className="grid gap-6">
            {/* Dietary Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  Dietary Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {DIETARY_RESTRICTIONS.map((restriction) => (
                    <div key={restriction} className="flex items-center space-x-2">
                      <Checkbox
                        id={restriction}
                        checked={preferences.dietaryRestrictions.includes(restriction)}
                        onCheckedChange={() => 
                          updatePreference('dietaryRestrictions', 
                            toggleArrayItem(preferences.dietaryRestrictions, restriction)
                          )
                        }
                      />
                      <Label htmlFor={restriction} className="text-sm capitalize cursor-pointer">
                        {restriction.replace('-', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Food Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-2">
                      <Checkbox
                        id={allergy}
                        checked={preferences.allergies.includes(allergy)}
                        onCheckedChange={() => 
                          updatePreference('allergies', 
                            toggleArrayItem(preferences.allergies, allergy)
                          )
                        }
                      />
                      <Label htmlFor={allergy} className="text-sm capitalize cursor-pointer">
                        {allergy.replace('-', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cuisine Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-blue-600" />
                  Favorite Cuisines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {CUISINE_TYPES.map((cuisine) => (
                    <div key={cuisine} className="flex items-center space-x-2">
                      <Checkbox
                        id={cuisine}
                        checked={preferences.cuisinePreferences.includes(cuisine)}
                        onCheckedChange={() => 
                          updatePreference('cuisinePreferences', 
                            toggleArrayItem(preferences.cuisinePreferences, cuisine)
                          )
                        }
                      />
                      <Label htmlFor={cuisine} className="text-sm capitalize cursor-pointer">
                        {cuisine.replace('-', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Disliked Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle>Ingredients You Dislike</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an ingredient you don't like..."
                      value={dislikedInput}
                      onChange={(e) => setDislikedInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addDislikedIngredient()}
                    />
                    <Button onClick={addDislikedIngredient} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.dislikedIngredients.map((ingredient) => (
                      <Badge 
                        key={ingredient} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeDislikedIngredient(ingredient)}
                      >
                        {ingredient} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cooking Experience & Goals */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-purple-600" />
                    Cooking Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={preferences.cookingExperience}
                    onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                      updatePreference('cookingExperience', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - I'm just starting out</SelectItem>
                      <SelectItem value="intermediate">Intermediate - I can handle most recipes</SelectItem>
                      <SelectItem value="advanced">Advanced - I love complex cooking</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cooking Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {COOKING_GOALS.map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={goal}
                          checked={preferences.cookingGoals.includes(goal)}
                          onCheckedChange={() => 
                            updatePreference('cookingGoals', 
                              toggleArrayItem(preferences.cookingGoals, goal)
                            )
                          }
                        />
                        <Label htmlFor={goal} className="text-sm capitalize cursor-pointer">
                          {goal.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={onNext}
              disabled={isLoading}
              size="lg"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}