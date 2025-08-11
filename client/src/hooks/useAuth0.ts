import { useQuery } from "@tanstack/react-query";

export function useAuth0() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth0/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginWithRedirect: () => {
      window.location.href = "/auth0/login";
    },
    logout: () => {
      window.location.href = "/auth0/logout";
    },
  };
}