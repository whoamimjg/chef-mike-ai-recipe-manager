import { useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Users, Shield, Clock } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ selectedPlan }: { selectedPlan: 'starter' | 'family' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to Chef Mike's Culinary Classroom!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe}>
        {selectedPlan === 'starter' ? 'Start Free Trial' : 'Subscribe to Family Plan'}
      </Button>
    </form>
  );
};

export default function SignUp() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'family'>('starter');
  const [clientSecret, setClientSecret] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (showCheckout && selectedPlan === 'family') {
      // Create subscription for family plan
      apiRequest("POST", "/api/create-subscription", { plan: 'family' })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error('Error creating subscription:', error);
        });
    }
  }, [showCheckout, selectedPlan]);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for getting started with recipe management',
      features: [
        'Up to 50 recipes',
        'Basic meal planning',
        'Shopping list generation',
        'Mobile app access'
      ],
      buttonText: 'Get Started Free',
      popular: false
    },
    {
      id: 'family',
      name: 'Family',
      price: '$15/month',
      description: 'Everything you need for family meal planning',
      features: [
        'Everything in Starter',
        'Unlimited recipes',
        'Advanced AI recommendations',
        'Family meal planning',
        'Dietary restriction management',
        'Priority support',
        'Recipe sharing',
        'Cost tracking & analytics'
      ],
      buttonText: 'Start Free Trial',
      popular: true
    }
  ];

  const handlePlanSelect = (planId: 'starter' | 'family') => {
    setSelectedPlan(planId);
    if (planId === 'starter') {
      // Redirect to login for free plan
      window.location.href = "/api/login";
    } else {
      setShowCheckout(true);
    }
  };

  if (showCheckout && selectedPlan === 'family') {
    if (!clientSecret) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Complete Your Family Plan Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm selectedPlan={selectedPlan} />
                </Elements>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Master Your Kitchen
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From recipe discovery to meal execution, our platform guides you through every step
            of your culinary journey.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Chef Assistant</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get personalized recipe recommendations based on your inventory, dietary
                preferences, and cooking history. Our AI learns from your preferences to suggest
                perfect meals.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Cooking Mode</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Step-by-step guided cooking with built-in timers, video tutorials, and voice commands
                for hands-free operation. Perfect for learning new techniques.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Sharing</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Share recipes and meal plans with family members. Collaborative planning makes
                cooking together easier than ever. Build family traditions around food.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-2 border-blue-500' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-blue-600">{plan.price}</div>
                <p className="text-gray-600 dark:text-gray-300">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handlePlanSelect(plan.id as 'starter' | 'family')}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Start Your Free Trial
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Enter your email address and create a password to get started
          </p>
          <div className="max-w-md mx-auto">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Create a password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button onClick={() => handlePlanSelect('starter')} className="w-full" size="lg">
                🚀 Start Your Free Trial
              </Button>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-center items-center gap-8 text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span>4.9★ Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>10,000+ Happy Cooks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}