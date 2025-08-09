import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Calendar, ShoppingCart, Brain, Clock, Users } from "lucide-react";
import chefMikeImage from "@assets/AdobeStock_779778898_1753990317537.jpeg";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      {/* Navigation */}
      <nav className="relative z-10 bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8" style={{ color: '#ffffff' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>Chef Mike's AI Recipe Manager</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="transition-colors hover:text-white" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Features</a>
                <a href="#pricing" className="transition-colors hover:text-white" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Pricing</a>
                <a href="/help" className="transition-colors hover:text-white" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Help</a>
                <a href="/contact" className="transition-colors hover:text-white" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Contact</a>
              </div>
              <Button onClick={handleSignIn} variant="secondary" className="bg-white hover:bg-gray-100" style={{ color: '#ea580c', backgroundColor: '#ffffff' }}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="hero-text text-white">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Cook Smarter,</span><br/>
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Plan Better
              </span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Transform your cooking experience with AI-powered recipe management, smart meal planning, intelligent grocery lists, and personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => window.location.href = "/signup"}
                size="lg" 
                className="bg-white hover:bg-gray-100 text-lg px-8 py-4 font-semibold"
                style={{ color: '#ea580c', backgroundColor: '#ffffff' }}
              >
                🚀 Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 hover:bg-white/10 text-lg px-8 py-4"
                style={{ color: '#ffffff', borderColor: '#ffffff', backgroundColor: 'transparent' }}
              >
                📹 Watch Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-8" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span style={{ color: '#ffffff' }}>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                <span style={{ color: '#ffffff' }}>No credit card required</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Card className="overflow-hidden shadow-2xl">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                  alt="Modern kitchen with organized ingredients and digital meal planning" 
                  className="w-full h-80 object-cover"
                />
              </CardContent>
            </Card>
            
            {/* Feature highlights */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Card className="p-4 shadow-lg bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary-600" />
                  <div>
                    <div className="font-semibold text-gray-800">Smart Recommendations</div>
                    <div className="text-sm text-gray-600">Based on your inventory</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 shadow-lg bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary-600" />
                  <div>
                    <div className="font-semibold text-gray-800">Weekly Planned</div>
                    <div className="text-sm text-gray-600">7 meals ready</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Master Your Kitchen</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">From recipe discovery to meal execution, our platform guides you through every step of your culinary journey.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Recipe Management */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <img 
                  src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                  alt="Organized recipe collection with colorful ingredients laid out" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="flex items-center gap-2 mb-4">
                  <ChefHat className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Smart Recipe Library</h3>
                </div>
                <p className="text-gray-600 mb-6">Store, organize, and discover recipes with AI-powered tagging and smart search. Import from any website or create your own.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>One-click recipe imports from any website</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>AI-powered smart categorization and tagging</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Automatic nutritional analysis and dietary info</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Recipe scaling for any serving size</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Image uploads with auto-optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Meal Planning */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <img 
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                  alt="Weekly meal planning calendar with organized meal schedule" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Visual Meal Planning</h3>
                </div>
                <p className="text-gray-600 mb-6">Drag-and-drop meal planning with calendar integration. Plan weeks in advance and never wonder "what's for dinner" again.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Interactive drag & drop meal planning interface</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Leftover tracking and meal rotation planning</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Calendar sync with Google Calendar and Apple</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Batch cooking and meal prep scheduling</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Family meal coordination and preferences</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Shopping Lists */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                  alt="Organized grocery shopping list with fresh ingredients in basket" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Smart Shopping Lists</h3>
                </div>
                <p className="text-gray-600 mb-6">Auto-generated shopping lists organized by store layout. Check off items as you shop and track your grocery budget.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Smart organization by grocery store aisle layout</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Price tracking and budget management tools</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Mobile-optimized grocery shopping mode</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Automatic quantity consolidation and scaling</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Share lists with family members in real-time</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="hover:shadow-lg transition-shadow duration-300 feature-card">
              <CardContent className="p-8">
                <img 
                  src={chefMikeImage} 
                  alt="Chef Mike Greene demonstrating AI-powered cooking assistance" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">AI Chef Assistant</h3>
                </div>
                <p className="text-gray-600 mb-6">Get personalized recipe recommendations based on your inventory, dietary preferences, and cooking history. Our AI learns from your preferences to suggest perfect meals.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Smart inventory-based recipe suggestions</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Dietary restriction and allergy awareness</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Machine learning-powered preference adaptation</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Seasonal ingredient recommendations</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Nutritional goal optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Interactive Cooking */}
            <Card className="hover:shadow-lg transition-shadow duration-300 feature-card">
              <CardContent className="p-8">
                <img 
                  src="https://images.unsplash.com/photo-1574484284002-952d92456975?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80" 
                  alt="Interactive cooking mode with step-by-step guidance and timer" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1556909123-94d5ba4eaf28?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80";
                  }}
                />
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Interactive Cooking Mode</h3>
                </div>
                <p className="text-gray-600 mb-6">Step-by-step guided cooking with built-in timers, video tutorials, and voice commands for hands-free operation. Perfect for learning new techniques.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Hands-free voice control for cooking</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Multiple built-in cooking timers</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Integrated video tutorial library</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Step-by-step cooking guidance</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Temperature and doneness alerts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Family Features */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <img 
                  src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
                  alt="Family cooking together sharing recipes and meal planning" 
                  className="w-full h-48 object-cover rounded-xl mb-6"
                />
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-6 w-6 text-primary-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Family Sharing</h3>
                </div>
                <p className="text-gray-600 mb-6">Share recipes and meal plans with family members. Collaborative planning makes cooking together easier than ever. Build family traditions around food.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Family recipe sharing and collaboration</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Collaborative meal planning calendars</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Kid-friendly cooking mode with safety tips</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Shared grocery lists and task assignments</span>
                  </li>
                  <li className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Family cooking challenges and achievements</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you're ready to unlock advanced features</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-6">Free</div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Up to 50 recipes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Basic meal planning</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Shopping list generation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Mobile app access</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => window.location.href = "/signup"}
                  variant="outline" 
                  className="w-full border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-2 border-primary-300 shadow-xl">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black">
                Most Popular
              </Badge>
              <CardContent className="p-8">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-8 rounded-lg">
                  <h3 className="text-2xl font-bold mb-2">Chef Pro</h3>
                  <div className="text-4xl font-bold mb-6">$9<span className="text-lg">/month</span></div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">Unlimited recipes</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">AI recipe recommendations</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">Advanced meal planning</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">Nutritional analysis</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">Recipe import from web</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-300 rounded-full flex-shrink-0"></div>
                      <span className="text-white">Family sharing (4 members)</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={() => window.location.href = "/signup"}
                    className="w-full bg-white hover:bg-gray-100"
                    style={{ color: '#ea580c', backgroundColor: '#ffffff' }}
                  >
                    Start Free Trial
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Family Plan */}
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Family</h3>
                <div className="text-4xl font-bold text-gray-900 mb-6">$15<span className="text-lg">/month</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Everything in Chef Pro</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Unlimited family members</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Kids cooking mode</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Dietary restriction management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => window.location.href = "/signup"}
                  variant="outline" 
                  className="w-full border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Meet Chef Mike Greene</h2>
              <p className="text-xl text-gray-600 mb-6">
                With over 15 years of culinary experience and a passion for teaching, Chef Mike Greene has helped thousands of home cooks master their kitchens.
              </p>
              <p className="text-gray-600 mb-6">
                After working in Michelin-starred restaurants and teaching at culinary schools, Chef Mike realized that the real magic happens when families cook together at home. That's why he created this platform - to bring professional cooking techniques and smart organization to your everyday kitchen.
              </p>
              <p className="text-gray-600 mb-8">
                "Cooking should be joyful, not stressful. With the right tools and guidance, anyone can create amazing meals that bring their family together." - Chef Mike Greene
              </p>
              <div className="flex items-center gap-4">
                <img 
                  src={chefMikeImage} 
                  alt="Chef Mike Greene in his kitchen"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-gray-900">Chef Mike Greene</div>
                  <div className="text-sm text-gray-600">Founder & Head Chef</div>
                  <div className="text-sm text-gray-600">chefmike@cmcc.com</div>
                </div>
              </div>
            </div>
            <div>
              <img 
                src={chefMikeImage} 
                alt="Chef Mike Greene teaching cooking in a modern kitchen classroom"
                className="w-full h-96 object-cover rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of families who've transformed their cooking experience</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                  ))}
                </div>
                <p className="text-gray-600 mb-6">"This app completely changed how we meal plan! The AI recommendations are spot on, and my kids actually ask to help cook now."</p>
                <div className="flex items-center gap-3">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108755-2616b612b5bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50&q=80" 
                    alt="Sarah M."
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Sarah M.</div>
                    <div className="text-sm text-gray-600">Mom of 3</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                  ))}
                </div>
                <p className="text-gray-600 mb-6">"The shopping lists organized by store layout save me so much time! I can get in and out of the grocery store in half the time."</p>
                <div className="flex items-center gap-3">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50&q=80" 
                    alt="David K."
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">David K.</div>
                    <div className="text-sm text-gray-600">Busy Professional</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                  ))}
                </div>
                <p className="text-gray-600 mb-6">"As someone with multiple food allergies, the dietary restriction warnings are a lifesaver. I finally feel confident trying new recipes!"</p>
                <div className="flex items-center gap-3">
                  <img 
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50&q=80" 
                    alt="Emily R."
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Emily R.</div>
                    <div className="text-sm text-gray-600">Food Allergy Warrior</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sign Up CTA */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-red-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6" style={{ color: '#ffffff' }}>Ready to Transform Your Kitchen?</h2>
          <p className="text-xl mb-8" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Join thousands of home cooks who've already simplified their meal planning and discovered new favorite recipes.</p>
          
          <Card className="max-w-md mx-auto bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8">
              <div className="space-y-4">
                <Input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="bg-white border-0 text-gray-900 placeholder-gray-500"
                />
                <Input 
                  type="password" 
                  placeholder="Create a password" 
                  className="bg-white border-0 text-gray-900 placeholder-gray-500"
                />
                <Button 
                  onClick={() => window.location.href = "/signup"}
                  className="w-full bg-white hover:bg-gray-100 text-lg font-semibold"
                  style={{ color: '#ea580c', backgroundColor: '#ffffff' }}
                >
                  🚀 Start Your Free Trial
                </Button>
              </div>
              <p className="text-sm mt-4" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>14-day free trial • No credit card required</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ChefHat className="h-6 w-6" />
                <span className="text-xl font-bold">Chef Mike's</span>
              </div>
              <p className="text-gray-400 mb-4">Making home cooking easier, smarter, and more enjoyable for families everywhere.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Chef Mike's Culinary Classroom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
