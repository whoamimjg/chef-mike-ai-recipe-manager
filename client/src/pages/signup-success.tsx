import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ChefHat, Sparkles, ArrowRight } from "lucide-react";

export default function SignupSuccess() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">Chef Mike's Culinary Classroom</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Success Content */}
      <div className="container mx-auto px-4 pt-20">
        <div className="max-w-md mx-auto text-center">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-gray-900 mb-2">Welcome to the Kitchen!</CardTitle>
              <p className="text-gray-600">
                Your account has been successfully created and your subscription is now active.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">What's Next?</h3>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Set up your dietary preferences</li>
                  <li>• Add your first recipes</li>
                  <li>• Start planning your meals</li>
                  <li>• Get AI-powered recommendations</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = "/api/login"}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  size="lg"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Cooking
                </Button>
                
                <p className="text-sm text-gray-500">
                  Redirecting automatically in {countdown} seconds...
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need help getting started? Check out our{" "}
                  <a href="/help" className="text-orange-600 hover:underline">
                    quick start guide
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}