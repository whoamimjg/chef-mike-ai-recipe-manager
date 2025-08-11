import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import type { Express } from 'express';

export function setupClerk(app: Express) {
  // Clerk webhook for user creation/updates
  app.post('/api/clerk/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      // Verify the webhook signature
      // Implementation depends on your webhook setup
      
      const event = JSON.parse(req.body.toString());
      
      if (event.type === 'user.created' || event.type === 'user.updated') {
        const userData = event.data;
        
        await storage.upsertUser({
          id: userData.id,
          email: userData.email_addresses[0]?.email_address || '',
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          profileImageUrl: userData.profile_image_url || '',
        });
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Clerk webhook error:', error);
      res.status(400).json({ error: 'Invalid webhook' });
    }
  });

  // Protected route example
  app.get('/api/clerk/user', ClerkExpressRequireAuth(), async (req, res) => {
    try {
      const userId = req.auth.userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
}