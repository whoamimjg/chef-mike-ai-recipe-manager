import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Settings, 
  Users, 
  ChefHat, 
  Calendar as CalendarIcon, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  Shield,
  Database,
  Server,
  Activity
} from "lucide-react";
import type { User } from "@shared/schema";

interface UserStats {
  totalUsers: number;
  totalRecipes: number;
  totalMealPlans: number;
  monthlyRevenue: number;
}

interface PopularRecipe {
  id: number;
  title: string;
  saves: number;
  growth: number;
}

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

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

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  // Fetch all users for admin
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Mock data for charts (in production this would come from the backend)
  const userGrowthData = [
    { month: "Jan", users: 1200 },
    { month: "Feb", users: 1450 },
    { month: "Mar", users: 1800 },
    { month: "Apr", users: 2200 },
    { month: "May", users: 2500 },
    { month: "Jun", users: 2847 },
  ];

  const popularRecipes: PopularRecipe[] = [
    { id: 1, title: "Chocolate Chip Cookies", saves: 2847, growth: 24 },
    { id: 2, title: "Creamy Basil Pasta", saves: 2192, growth: 18 },
    { id: 3, title: "Mediterranean Salad", saves: 1936, growth: 12 },
  ];

  const planDistribution = [
    { name: "Free", value: 65, color: "#8884d8" },
    { name: "Pro", value: 25, color: "#82ca9d" },
    { name: "Family", value: 10, color: "#ffc658" },
  ];

  // Filter users based on search and filters
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = selectedPlan === "all" || user.plan === selectedPlan;
    
    return matchesSearch && matchesPlan;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center gap-2 text-white hover:bg-white/10"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === "users" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("users")}
                className="flex items-center gap-2 text-white hover:bg-white/10"
              >
                <Users className="h-4 w-4" />
                Users
              </Button>
              <Button
                variant={activeTab === "recipes" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("recipes")}
                className="flex items-center gap-2 text-white hover:bg-white/10"
              >
                <ChefHat className="h-4 w-4" />
                Recipes
              </Button>
              <Button
                variant={activeTab === "analytics" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("analytics")}
                className="flex items-center gap-2 text-white hover:bg-white/10"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
              <Button
                variant={activeTab === "settings" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-2 text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-300">Admin: {user?.firstName || 'User'}</span>
              <Avatar>
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-red-500">{user?.firstName?.[0] || 'A'}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          
          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="fade-in">
              <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Dashboard Overview
              </h1>
              
              {/* Stats Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +12%
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.totalUsers.toLocaleString() || "0"}
                    </h3>
                    <p className="text-gray-600">Total Users</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <ChefHat className="h-8 w-8 text-green-600" />
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +8%
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.totalRecipes.toLocaleString() || "0"}
                    </h3>
                    <p className="text-gray-600">Total Recipes</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <CalendarIcon className="h-8 w-8 text-purple-600" />
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +15%
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.totalMealPlans.toLocaleString() || "0"}
                    </h3>
                    <p className="text-gray-600">Meal Plans Created</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="h-8 w-8 text-orange-600" />
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +22%
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      ${statsLoading ? "..." : stats?.monthlyRevenue.toLocaleString() || "0"}
                    </h3>
                    <p className="text-gray-600">Monthly Revenue</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* User Growth Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="hsl(248, 77%, 70%)" 
                          strokeWidth={3}
                          dot={{ fill: "hsl(248, 77%, 70%)", strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        15% increase in active users this month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Plan Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Popular Recipes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Most Popular Recipes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {popularRecipes.map((recipe, index) => (
                      <div key={recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                          <div>
                            <div className="font-medium">{recipe.title}</div>
                            <div className="text-sm text-gray-500">{recipe.saves.toLocaleString()} saves</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{recipe.growth}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <div className="fade-in">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-8 w-8" />
                  User Management
                </h1>
                <Button className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Add User
                </Button>
              </div>

              {/* Search and Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Input 
                        placeholder="Search users..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* User Table */}
              <Card>
                <CardContent className="p-0">
                  {usersLoading ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
                      <p className="text-gray-600">Loading users...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
                      <p className="text-gray-600">
                        {searchQuery ? "Try adjusting your search terms" : "No users in the system yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Created</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredUsers.map((user: User) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={user.profileImageUrl || undefined} />
                                    <AvatarFallback>
                                      {user.firstName?.[0]}{user.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant={
                                    user.plan === "pro" ? "default" : 
                                    user.plan === "family" ? "secondary" : 
                                    "outline"
                                  }
                                  className={
                                    user.plan === "pro" ? "bg-purple-100 text-purple-800" :
                                    user.plan === "family" ? "bg-orange-100 text-orange-800" :
                                    "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {user.plan?.charAt(0).toUpperCase() + user.plan?.slice(1) || "Free"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {filteredUsers.length > 0 && (
                    <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Showing 1 to {Math.min(10, filteredUsers.length)} of {filteredUsers.length} users
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Previous</Button>
                        <Button size="sm">1</Button>
                        <Button variant="outline" size="sm">2</Button>
                        <Button variant="outline" size="sm">3</Button>
                        <Button variant="outline" size="sm">Next</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="settings" className="space-y-6">
            <div className="fade-in">
              <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="h-8 w-8" />
                System Settings
              </h1>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input id="siteName" defaultValue="Chef Mike's Culinary Classroom" />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxFreeRecipes">Max Free Recipes</Label>
                      <Input id="maxFreeRecipes" type="number" defaultValue="50" />
                    </div>
                    
                    <div>
                      <Label htmlFor="trialPeriod">Trial Period (days)</Label>
                      <Input id="trialPeriod" type="number" defaultValue="14" />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="allowRegistration" defaultChecked />
                      <Label htmlFor="allowRegistration">Allow user registration</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="enableAI" defaultChecked />
                      <Label htmlFor="enableAI">Enable AI recommendations</Label>
                    </div>
                    
                    <Button className="w-full">
                      Save Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="passwordMinLength">Password Min Length</Label>
                      <Input id="passwordMinLength" type="number" defaultValue="8" />
                    </div>
                    
                    <div>
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input id="sessionTimeout" type="number" defaultValue="30" />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="requireStrongPasswords" defaultChecked />
                      <Label htmlFor="requireStrongPasswords">Require strong passwords</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="enableTwoFactor" />
                      <Label htmlFor="enableTwoFactor">Enable two-factor authentication</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="logSecurityEvents" defaultChecked />
                      <Label htmlFor="logSecurityEvents">Log security events</Label>
                    </div>
                    
                    <Button variant="destructive" className="w-full">
                      Update Security
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Backup and Maintenance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Backup & Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <Database className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                      <h4 className="font-medium text-gray-900 mb-2">Database Backup</h4>
                      <p className="text-sm text-gray-600 mb-4">Last backup: 2 hours ago</p>
                      <Button variant="outline" className="w-full">
                        Create Backup
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <Trash2 className="h-12 w-12 mx-auto mb-3 text-orange-600" />
                      <h4 className="font-medium text-gray-900 mb-2">System Cleanup</h4>
                      <p className="text-sm text-gray-600 mb-4">Clear temporary files and logs</p>
                      <Button variant="outline" className="w-full">
                        Run Cleanup
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-3 text-green-600" />
                      <h4 className="font-medium text-gray-900 mb-2">System Health</h4>
                      <p className="text-sm text-gray-600 mb-4">All systems operational</p>
                      <Button variant="outline" className="w-full">
                        Health Check
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
