import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Shield, 
  Heart, 
  Utensils, 
  AlertTriangle, 
  ChefHat,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import { 
  DIETARY_RESTRICTIONS,
  COMMON_ALLERGIES,
  CUISINE_TYPES,
  COOKING_GOALS,
  type User as UserType
} from "@shared/schema";

export default function Account() {
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [dietaryForm, setDietaryForm] = useState({
    dietaryRestrictions: [] as string[],
    allergies: [] as string[],
    cuisinePreferences: [] as string[],
    dislikedIngredients: [] as string[],
    cookingExperience: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    cookingGoals: [] as string[]
  });
  const [dislikedInput, setDislikedInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user", { credentials: 'include' });
        if (!response.ok) {
          toast({
            title: "Unauthorized",
            description: "Please log in to access your account settings.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
        }
      } catch (error) {
        window.location.href = "/login";
      }
    };
    checkAuth();
  }, [toast]);

  // Fetch user data
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Update forms when user data loads
  useEffect(() => {
    if (user) {
      setUserForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setDietaryForm({
        dietaryRestrictions: user.dietaryRestrictions || [],
        allergies: user.allergies || [],
        cuisinePreferences: user.cuisinePreferences || [],
        dislikedIngredients: user.dislikedIngredients || [],
        cookingExperience: user.cookingExperience || 'beginner',
        cookingGoals: user.cookingGoals || []
      });
    }
  }, [user]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Update dietary preferences mutation
  const updateDietaryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/auth/dietary-preferences", data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your dietary preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dietary preferences.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords if changing
    if (userForm.newPassword && userForm.newPassword !== userForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      email: userForm.email
    };

    if (userForm.newPassword) {
      updateData.currentPassword = userForm.currentPassword;
      updateData.newPassword = userForm.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleDietarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDietaryMutation.mutate(dietaryForm);
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const addDislikedIngredient = () => {
    if (dislikedInput.trim() && !dietaryForm.dislikedIngredients.includes(dislikedInput.trim())) {
      setDietaryForm(prev => ({
        ...prev,
        dislikedIngredients: [...prev.dislikedIngredients, dislikedInput.trim()]
      }));
      setDislikedInput("");
    }
  };

  const removeDislikedIngredient = (ingredient: string) => {
    setDietaryForm(prev => ({
      ...prev,
      dislikedIngredients: prev.dislikedIngredients.filter(i => i !== ingredient)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-gray-600 mt-2">Manage your profile and preferences</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
                className="flex items-center gap-2"
              >
                <ChefHat className="h-4 w-4" />
                Back to App
              </Button>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="dietary" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Dietary Preferences
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Subscription
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={userForm.firstName}
                          onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={userForm.lastName}
                          onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-4">Change Password</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPassword ? "text" : "password"}
                              value={userForm.currentPassword}
                              onChange={(e) => setUserForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="Enter current password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={userForm.newPassword}
                            onChange={(e) => setUserForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter new password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={userForm.confirmPassword}
                            onChange={(e) => setUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dietary Preferences Tab */}
            <TabsContent value="dietary">
              <form onSubmit={handleDietarySubmit} className="space-y-6">
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
                            checked={dietaryForm.dietaryRestrictions.includes(restriction)}
                            onCheckedChange={() => 
                              setDietaryForm(prev => ({
                                ...prev,
                                dietaryRestrictions: toggleArrayItem(prev.dietaryRestrictions, restriction)
                              }))
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
                            checked={dietaryForm.allergies.includes(allergy)}
                            onCheckedChange={() => 
                              setDietaryForm(prev => ({
                                ...prev,
                                allergies: toggleArrayItem(prev.allergies, allergy)
                              }))
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
                            checked={dietaryForm.cuisinePreferences.includes(cuisine)}
                            onCheckedChange={() => 
                              setDietaryForm(prev => ({
                                ...prev,
                                cuisinePreferences: toggleArrayItem(prev.cuisinePreferences, cuisine)
                              }))
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
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDislikedIngredient())}
                        />
                        <Button type="button" onClick={addDislikedIngredient} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dietaryForm.dislikedIngredients.map((ingredient) => (
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
                        value={dietaryForm.cookingExperience}
                        onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                          setDietaryForm(prev => ({ ...prev, cookingExperience: value }))
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
                              checked={dietaryForm.cookingGoals.includes(goal)}
                              onCheckedChange={() => 
                                setDietaryForm(prev => ({
                                  ...prev,
                                  cookingGoals: toggleArrayItem(prev.cookingGoals, goal)
                                }))
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

                <Button 
                  type="submit" 
                  disabled={updateDietaryMutation.isPending}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Save className="h-4 w-4" />
                  {updateDietaryMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </form>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Current Plan</Label>
                      <p className="text-lg font-semibold capitalize">{user?.plan || 'Free'}</p>
                    </div>
                    {user?.plan === 'free' && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800">
                          Upgrade to Pro or Premium to unlock advanced features like AI recommendations and unlimited recipes.
                        </p>
                        <Button 
                          className="mt-3"
                          onClick={() => window.location.href = "/signup"}
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}