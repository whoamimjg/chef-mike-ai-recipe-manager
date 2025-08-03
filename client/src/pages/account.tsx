import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Shield, 
  CreditCard, 
  Settings,
  Save,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { 
  DIETARY_RESTRICTIONS,
  COMMON_ALLERGIES,
  CUISINE_TYPES,
  COOKING_GOALS
} from "@shared/schema";

export function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    dietaryRestrictions: user?.dietaryRestrictions || [],
    allergies: user?.allergies || [],
    cuisinePreferences: user?.cuisinePreferences || [],
    dislikedIngredients: user?.dislikedIngredients || [],
    cookingExperience: user?.cookingExperience || '',
    cookingGoals: user?.cookingGoals || []
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your account information has been saved successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear server session
      await fetch("/api/auth/logout", { 
        method: "GET",
        credentials: "include" 
      });
      // Clear client cache
      queryClient.clear();
      // Redirect to homepage
      window.location.href = "/";
    } catch (error) {
      // If logout fails, still redirect to homepage
      queryClient.clear();
      window.location.href = "/";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your profile and dietary preferences
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={updateProfileMutation.isPending}
                data-testid={isEditing ? "button-save-profile" : "button-edit-profile"}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled={true} // Email changes require verification
                    className="flex-1"
                    data-testid="input-email"
                  />
                  {user.emailVerified && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Contact support to change your email address
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.plan === 'free' ? 'secondary' : 'default'}>
                      {user.plan === 'free' ? 'Free Plan' : `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan`}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {user.plan === 'free' 
                      ? 'Upgrade to unlock unlimited recipes and AI recommendations'
                      : 'Thank you for being a premium member!'
                    }
                  </p>
                </div>
                {user.plan === 'free' && (
                  <Button onClick={() => window.location.href = '/signup'} data-testid="button-upgrade">
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dietary Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Preferences</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Help us personalize your recipe recommendations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Cooking Experience</Label>
                <Select
                  value={profileData.cookingExperience}
                  onValueChange={(value) => setProfileData(prev => ({ ...prev, cookingExperience: value }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger data-testid="select-cooking-experience">
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner - Just getting started</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Comfortable with basics</SelectItem>
                    <SelectItem value="advanced">Advanced - Experienced home cook</SelectItem>
                    <SelectItem value="professional">Professional - Culinary background</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label>Dietary Restrictions</Label>
                <p className="text-sm text-gray-500 mb-2">Current: {profileData.dietaryRestrictions?.length || 0} selected</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {DIETARY_RESTRICTIONS.map((restriction) => (
                    <Button
                      key={restriction}
                      variant={profileData.dietaryRestrictions?.includes(restriction) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (!isEditing) return;
                        const current = profileData.dietaryRestrictions || [];
                        const updated = current.includes(restriction)
                          ? current.filter(r => r !== restriction)
                          : [...current, restriction];
                        setProfileData(prev => ({ ...prev, dietaryRestrictions: updated }));
                      }}
                      disabled={!isEditing}
                      className="justify-start text-left"
                      data-testid={`dietary-restriction-${restriction.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {restriction}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label>Food Allergies</Label>
                <p className="text-sm text-gray-500 mb-2">Current: {profileData.allergies?.length || 0} selected</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <Button
                      key={allergy}
                      variant={profileData.allergies?.includes(allergy) ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (!isEditing) return;
                        const current = profileData.allergies || [];
                        const updated = current.includes(allergy)
                          ? current.filter(a => a !== allergy)
                          : [...current, allergy];
                        setProfileData(prev => ({ ...prev, allergies: updated }));
                      }}
                      disabled={!isEditing}
                      className="justify-start text-left"
                      data-testid={`allergy-${allergy.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {allergy}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Account;