import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Search, 
  ChefHat, 
  Calendar, 
  ShoppingCart, 
  CreditCard, 
  Settings, 
  HelpCircle,
  Book,
  MessageCircle
} from "lucide-react";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <ChefHat className="h-5 w-5" />,
      faqs: [
        {
          question: "How do I create my first recipe?",
          answer: "To create a recipe, go to the Recipes tab and click 'Add Recipe'. Fill in the title, ingredients, and instructions. You can also import recipes from URLs or upload images for ingredient recognition."
        },
        {
          question: "How do I set up my dietary preferences?",
          answer: "Go to the Account tab and scroll to User Preferences. Select your dietary restrictions, allergies, and cuisine preferences. This helps our AI provide better meal recommendations."
        },
        {
          question: "Can I import recipes from other websites?",
          answer: "Yes! Use the 'Import from URL' feature to automatically extract recipe data from popular cooking websites like AllRecipes, Food Network, and many food blogs."
        }
      ]
    },
    {
      id: "meal-planning",
      title: "Meal Planning",
      icon: <Calendar className="h-5 w-5" />,
      faqs: [
        {
          question: "How do I plan meals for the week?",
          answer: "Go to the Meal Planner tab, select a date, and drag recipes from your collection onto breakfast, lunch, or dinner slots. You can plan meals up to a month in advance."
        },
        {
          question: "Can I add meals to my Google Calendar?",
          answer: "Yes! When you schedule a meal, you'll see calendar icons (📅 for Google, 🍎 for Apple) next to planned meals. Click them to add the meal to your external calendar."
        },
        {
          question: "How do I change or remove a planned meal?",
          answer: "Click the X button next to any planned meal to remove it. To change a meal, simply drag a different recipe to replace it."
        }
      ]
    },
    {
      id: "shopping-lists",
      title: "Shopping Lists",
      icon: <ShoppingCart className="h-5 w-5" />,
      faqs: [
        {
          question: "How are shopping lists generated?",
          answer: "Shopping lists are automatically created from your meal plans. Select a date range and the system will combine all ingredients, organize them by grocery store category, and remove duplicates."
        },
        {
          question: "Why do I see real grocery prices?",
          answer: "We integrate with major grocery store APIs (Kroger, Target, Walmart) to provide real-time pricing from stores near you. This helps you budget and find the best deals."
        },
        {
          question: "Can I print my shopping list?",
          answer: "Yes! Use the print button to get a clean, organized shopping list perfect for taking to the store. It's organized by grocery store sections for efficient shopping."
        },
        {
          question: "How do I add items manually to my shopping list?",
          answer: "In the Shopping List tab, use the 'Add Item' button to manually add any items not covered by your meal plans."
        }
      ]
    },
    {
      id: "ai-features",
      title: "AI Features",
      icon: <HelpCircle className="h-5 w-5" />,
      faqs: [
        {
          question: "How does the AI recipe generator work?",
          answer: "Our AI uses your dietary preferences, available ingredients, and cooking history to suggest personalized recipes. The more you use the app, the better the recommendations become."
        },
        {
          question: "Can the AI help me use ingredients I already have?",
          answer: "Yes! Add items to your Inventory tab, and the AI will suggest recipes that use ingredients you already have, reducing food waste and saving money."
        },
        {
          question: "How accurate is the ingredient recognition from photos?",
          answer: "Our AI can identify most common ingredients from photos with high accuracy. For best results, take clear photos with good lighting and separate ingredients when possible."
        }
      ]
    },
    {
      id: "account-billing",
      title: "Account & Billing",
      icon: <CreditCard className="h-5 w-5" />,
      faqs: [
        {
          question: "What's included in the free plan?",
          answer: "The free plan includes up to 5 recipes, 3 shopping lists, basic meal planning, and limited AI features. Perfect for trying out the platform."
        },
        {
          question: "What do I get with Core ($20/month)?",
          answer: "Core includes unlimited recipes, shopping lists, advanced AI features, real-time grocery pricing, calendar integration, and priority support."
        },
        {
          question: "How do I upgrade my plan?",
          answer: "Go to the Account tab and click 'Upgrade Plan'. You'll be taken to a secure payment page where you can choose your plan and enter payment details."
        },
        {
          question: "Can I cancel my subscription anytime?",
          answer: "Yes, you can cancel anytime from your Account settings. Your subscription will remain active until the end of your billing period."
        }
      ]
    },
    {
      id: "data-privacy",
      title: "Data & Privacy",
      icon: <Settings className="h-5 w-5" />,
      faqs: [
        {
          question: "How do I backup my recipes?",
          answer: "Go to Account → Data Management and click 'Download CSV Backup'. This creates a complete backup of your recipes, meal plans, and preferences."
        },
        {
          question: "Is my recipe data secure?",
          answer: "Yes, all data is encrypted and stored securely. We use industry-standard security practices and never share your personal recipes with third parties."
        },
        {
          question: "Can I import my recipes from other apps?",
          answer: "Yes, you can import recipes via CSV files or by copying and pasting from other recipe apps. We support most common recipe formats."
        }
      ]
    }
  ];

  const filteredFAQs = categories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help Center
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Find answers to common questions about Chef Mike's AI Recipe Manager
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-help-search"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Book className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Video Tutorials</h3>
              <p className="text-sm text-gray-600 mb-4">
                Watch step-by-step guides for all features
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <MessageCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Contact Support</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get personalized help from our team
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/contact'}
                data-testid="button-contact-support"
              >
                Contact Us
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <HelpCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Feature Requests</h3>
              <p className="text-sm text-gray-600 mb-4">
                Suggest new features and improvements
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/contact?subject=Feature Request'}
                data-testid="button-feature-request"
              >
                Share Ideas
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Categories */}
        <div className="max-w-4xl mx-auto">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  Try different keywords or browse the categories below
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {filteredFAQs.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.faqs.map((faq, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${category.id}-${index}`}
                        >
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-600">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Still Need Help */}
        <div className="text-center mt-16">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
              <p className="text-gray-600 mb-6">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = '/contact'}
                data-testid="button-contact-help"
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}