import { Button } from "@/components/ui/button";
import { SiAuth0, SiReplit, SiGoogle, SiFacebook, SiGithub } from "react-icons/si";
import { ChefHat, User } from "lucide-react";

interface AuthProviderButtonProps {
  provider: 'replit' | 'auth0' | 'local' | 'google' | 'facebook' | 'github';
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  children?: React.ReactNode;
}

const providerConfig = {
  replit: {
    icon: SiReplit,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    name: 'Replit'
  },
  auth0: {
    icon: SiAuth0,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    name: 'Auth0'
  },
  local: {
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    name: 'Local Account'
  },
  google: {
    icon: SiGoogle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
    name: 'Google'
  },
  facebook: {
    icon: SiFacebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    name: 'Facebook'
  },
  github: {
    icon: SiGithub,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    name: 'GitHub'
  }
};

export function AuthProviderButton({
  provider,
  onClick,
  className = '',
  size = 'default',
  variant = 'outline',
  children
}: AuthProviderButtonProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={`flex items-center gap-3 ${config.bgColor} border ${className}`}
    >
      <Icon className={`w-5 h-5 ${config.color}`} />
      {children || `Sign in with ${config.name}`}
    </Button>
  );
}