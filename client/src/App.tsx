import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Account from "@/pages/account";
import SignUp from "@/pages/signup";
import SignupSuccess from "@/pages/signup-success";
import Login from "@/pages/login";
import VerifyEmail from "@/pages/verify-email";
import NotFound from "@/pages/not-found";
import Contact from "@/pages/contact";
import Help from "@/pages/help";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/signup" component={SignUp} />
          <Route path="/signup/success" component={SignupSuccess} />
          <Route path="/login">
            {() => {
              window.location.href = "/api/login";
              return null;
            }}
          </Route>
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/contact" component={Contact} />
          <Route path="/help" component={Help} />
          {/* Redirect protected routes to login */}
          <Route path="/account">
            {() => {
              window.location.href = "/api/login";
              return null;
            }}
          </Route>
          <Route path="/admin">
            {() => {
              window.location.href = "/api/login";
              return null;
            }}
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/app" component={Home} />
          <Route path="/account" component={Account} />
          <Route path="/admin" component={Admin} />
          <Route path="/contact" component={Contact} />
          <Route path="/help" component={Help} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
