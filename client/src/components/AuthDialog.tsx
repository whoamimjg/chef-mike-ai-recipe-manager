import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthProviderButton } from "./AuthProviderButton";
import { Separator } from "@/components/ui/separator";
import { ChefHat } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function AuthDialog({ open, onOpenChange, title = "Sign in to your account" }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <ChefHat className="h-6 w-6 text-orange-600" />
          </div>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <p className="text-gray-600">Choose your preferred sign-in method</p>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {/* Primary OAuth Options */}
          <AuthProviderButton
            provider="replit"
            onClick={() => window.location.href = '/api/login'}
            className="w-full justify-start"
            size="lg"
          />
          
          <AuthProviderButton
            provider="auth0"
            onClick={() => window.location.href = '/auth0/login'}
            className="w-full justify-start"
            size="lg"
          />
          
          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
              OR
            </span>
          </div>
          
          {/* Local Account Option */}
          <AuthProviderButton
            provider="local"
            onClick={() => window.location.href = '/login'}
            className="w-full justify-start"
            size="lg"
          >
            Sign in with Local Account
          </AuthProviderButton>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={() => window.location.href = '/signup'}
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            Create one now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}