import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/contact', data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you soon!",
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Chef Mike's AI Recipe Manager
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions, suggestions, or need help? We'd love to hear from you!
            Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">mike@chefmikesculinaryclass.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">Available via email</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Support Hours</p>
                    <p className="text-gray-600">Mon-Fri, 9 AM - 6 PM EST</p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 mt-6">
                  <h3 className="font-semibold text-orange-900 mb-2">Quick Response</h3>
                  <p className="text-sm text-orange-800">
                    We typically respond to messages within 24 hours during business days.
                    For urgent issues, please mark your subject as "URGENT".
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={handleChange('name')}
                        placeholder="Your full name"
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange('email')}
                        placeholder="your.email@example.com"
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={handleChange('subject')}
                      placeholder="What's this about?"
                      data-testid="input-contact-subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={handleChange('message')}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      required
                      data-testid="textarea-contact-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    data-testid="button-send-message"
                  >
                    {contactMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Looking for quick answers? Check out our Help Center with frequently asked questions.
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/help'}
            data-testid="button-visit-help"
          >
            Visit Help Center
          </Button>
        </div>
      </div>
    </div>
  );
}