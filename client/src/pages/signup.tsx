import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChefHat, 
  Check,
  Crown,
  Sparkles,
  ArrowLeft,
  CreditCard,
  User,
  Mail,
  Shield
} from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { 
  DIETARY_RESTRICTIONS,
  COMMON_ALLERGIES,
  CUISINE_TYPES,
  COOKING_GOALS
} from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface Plan {
  id: 'free' | 'pro' | 'premium';
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  badge?: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Perfect for getting started with recipe management',
    features: [
      '50 recipes maximum',
      '5 shopping lists',
      'Basic meal planning',
      'Recipe search & rating',
      'Mobile app access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'Ideal for serious home cooks and meal planners',
    features: [
      'Unlimited recipes',
      'Unlimited shopping lists',
      'AI recipe recommendations',
      'Advanced meal planning',
      'Inventory management',
      'Recipe cost tracking',
      'Priority support'
    ],
    badge: 'Most Popular',
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: 'month',
    description: 'Complete culinary experience with all features',
    features: [
      'Everything in Pro',
      'Receipt scanning & OCR',
      'UPC barcode scanning',
      'Advanced analytics',
      'Custom dietary profiles',
      'Bulk recipe import',
      'API access',
      '1-on-1 cooking consultations'
    ],
    badge: 'Best Value'
  }
];

const FreeCheckoutForm = ({ userInfo, selectedPlan }: { userInfo: any, selectedPlan: Plan }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const rawResponse = await apiRequest("POST", "/api/auth/signup", {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        password: userInfo.password,
        plan: selectedPlan.id
      });
      
      const response = await rawResponse.json();
      
      if (response && response.success) {
        toast({
          title: "Account Created!",
          description: "Your account has been created successfully. Please sign in with your credentials.",
        });
        
        // Redirect to login page
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: (response && response.message) || "Failed to create account. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Something went wrong. Please try again.";
      
      // Check if it's a 400 error (user already exists)
      if (error.message && error.message.includes("400:")) {
        const errorText = error.message.split("400:")[1]?.trim();
        if (errorText && errorText.includes("User already exists")) {
          errorMessage = "An account with this email already exists. Please try signing in instead.";
        } else {
          errorMessage = errorText || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? "Creating Account..." : "Create Free Account"}
      </Button>
    </form>
  );
};

const CheckoutForm = ({ userInfo, selectedPlan }: { userInfo: any, selectedPlan: Plan }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {

      // For paid plans, process payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/signup/success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {selectedPlan.id !== 'free' && (
        <div className="space-y-4">
          <Label className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Information
          </Label>
          <PaymentElement />
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          "Processing..."
        ) : selectedPlan.id === 'free' ? (
          "Create Free Account"
        ) : (
          `Subscribe to ${selectedPlan.name} - $${selectedPlan.price}/${selectedPlan.period}`
        )}
      </Button>
    </form>
  );
};

export default function Signup() {
  const [step, setStep] = useState<'plan' | 'details' | 'payment'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const { toast } = useToast();

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('details');
  };

  const handleUserInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInfo.firstName || !userInfo.lastName || !userInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userInfo.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlan?.id === 'free') {
      // For free plan, go directly to payment step (which handles account creation)
      setStep('payment');
    } else {
      try {
        // Create payment intent for paid plans
        const rawResponse = await apiRequest("POST", "/api/create-payment-intent", {
          plan: selectedPlan?.id,
          amount: selectedPlan?.price,
          userInfo
        });
        const response = await rawResponse.json();
        if (response && response.clientSecret) {
          setClientSecret(response.clientSecret);
        } else {
          throw new Error("Failed to get payment details");
        }
        setStep('payment');
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const renderPlanSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Chef Mike's Culinary Classroom</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Start your culinary journey with the perfect plan for your cooking needs
        </p>
      </div>

      {/* OAuth Sign-up Options */}
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Quick Sign Up</CardTitle>
            <p className="text-gray-600">
              Sign up instantly with your existing account
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/auth/google"}
                className="w-full flex items-center justify-center gap-2"
              >
                <FaGoogle className="h-4 w-4 text-red-500" />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/auth/facebook"}
                className="w-full flex items-center justify-center gap-2"
              >
                <FaFacebook className="h-4 w-4 text-blue-600" />
                Continue with Facebook
              </Button>
            </div>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or choose a plan below</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold"
                  onClick={() => window.location.href = "/login"}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              plan.popular ? 'ring-2 ring-orange-500 scale-105' : ''
            }`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-orange-500 text-white px-3 py-1">
                  {plan.badge}
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {plan.id === 'free' && <ChefHat className="h-8 w-8 text-gray-600" />}
                {plan.id === 'pro' && <Sparkles className="h-8 w-8 text-orange-500" />}
                {plan.id === 'premium' && <Crown className="h-8 w-8 text-purple-600" />}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-4xl font-bold text-gray-900">
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
                {plan.price > 0 && <span className="text-lg text-gray-600">/{plan.period}</span>}
              </div>
              <p className="text-gray-600 text-sm">{plan.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full ${plan.popular ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {plan.price === 0 ? 'Get Started Free' : 'Choose Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderUserDetails = () => (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={() => setStep('plan')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
        <p className="text-gray-600">
          You've selected the <span className="font-semibold text-orange-600">{selectedPlan?.name}</span> plan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUserInfoSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={userInfo.firstName}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={userInfo.lastName}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={userInfo.password || ''}
                onChange={(e) => setUserInfo(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Create a secure password"
                required
              />
            </div>

            <Separator />

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Plan Summary</h3>
              <div className="flex justify-between items-center">
                <span>{selectedPlan?.name} Plan</span>
                <span className="font-bold">
                  {selectedPlan?.price === 0 ? 'Free' : `$${selectedPlan?.price}/${selectedPlan?.period}`}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Continue to {selectedPlan?.price === 0 ? 'Account Creation' : 'Payment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={() => setStep('details')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {selectedPlan?.price === 0 ? 'Create Account' : 'Complete Payment'}
        </h1>
        <p className="text-gray-600">
          {selectedPlan?.price === 0 
            ? 'Finalizing your free account setup'
            : `Subscribing to ${selectedPlan?.name} plan`
          }
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedPlan?.price === 0 ? (
              <>
                <Shield className="h-5 w-5" />
                Account Creation
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Payment Details
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{userInfo.firstName} {userInfo.lastName}</span>
              <span className="text-sm text-gray-600">{userInfo.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{selectedPlan?.name} Plan</span>
              <span className="font-bold text-lg">
                {selectedPlan?.price === 0 ? 'Free' : `$${selectedPlan?.price}/${selectedPlan?.period}`}
              </span>
            </div>
          </div>

          {selectedPlan && (
            selectedPlan.price === 0 ? (
              <FreeCheckoutForm userInfo={userInfo} selectedPlan={selectedPlan} />
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm userInfo={userInfo} selectedPlan={selectedPlan} />
              </Elements>
            ) : (
              <div className="text-center p-4">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Initializing payment...</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">Chef Mike's Culinary Classroom</h1>
            </div>
            <Button variant="ghost" onClick={() => window.location.href = "/"}>
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {step === 'plan' && renderPlanSelection()}
        {step === 'details' && renderUserDetails()}
        {step === 'payment' && renderPayment()}
      </div>
    </div>
  );
}