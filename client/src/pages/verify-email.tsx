import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | 'sending'>('pending');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const { toast } = useToast();

  // Check URL parameters for verification token or success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    
    if (verified === 'true') {
      setVerificationStatus('success');
    }
  }, []);

  const sendVerificationEmail = async () => {
    if (!email || !firstName) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and first name",
        variant: "destructive",
      });
      return;
    }

    setVerificationStatus('sending');
    
    try {
      await apiRequest('POST', '/api/auth/send-verification', {
        email,
        firstName
      });
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your email and click the verification link",
      });
      
      setVerificationStatus('pending');
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
      setVerificationStatus('error');
    }
  };

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Email Verified!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 text-center">
              To complete your registration, please verify your email address.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your first name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <Button 
              onClick={sendVerificationEmail}
              disabled={verificationStatus === 'sending'}
              className="w-full"
            >
              {verificationStatus === 'sending' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Email...
                </>
              ) : (
                'Send Verification Email'
              )}
            </Button>

            {verificationStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to send verification email. Please try again.</span>
              </div>
            )}
            
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => window.location.href = '/login'}
                className="text-sm"
              >
                Already verified? Log in
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}