# Admin Management Portal

## Overview

The Admin Management Portal provides comprehensive administrative capabilities for Chef Mike's AI Recipe Manager. This portal allows administrators to manage users, subscriptions, payments, and system operations through a secure web interface.

## Access

**URL**: `/admin/` or `admin.airecipemanager.com`
**Login**: `/admin/login.html`

## Features

### Dashboard
- **Real-time Statistics**: Total users, active subscriptions, monthly revenue, failed payments
- **Recent Activity Log**: User signups, subscription changes, payment events
- **System Status**: Database, Stripe, and OpenAI connectivity status

### User Management
- **User Search**: Find users by email, name, or other criteria
- **User Details**: View and edit user profiles, subscription status, and account information
- **Account Actions**: 
  - Reset user passwords
  - Suspend/reactivate accounts
  - Update subscription plans
  - View user activity history

### Subscription Management
- **Active Subscriptions**: View all active subscriptions with renewal dates
- **Subscription Actions**:
  - Cancel subscriptions
  - Update billing cycles
  - Change subscription plans
  - View subscription history

### Payment Management
- **Payment History**: Complete transaction log with Stripe details
- **Payment Actions**:
  - Process refunds
  - View payment details
  - Handle failed payments
  - Export payment reports

### System Administration
- **Password Reset Tools**: Send password reset emails to users
- **Data Export**: Export user and system data for backup/analysis
- **Cache Management**: Clear system caches
- **Stripe Synchronization**: Sync subscription data between Stripe and local database

## Configuration

### Environment Variables

Required environment variables for admin functionality:

```bash
# Admin Portal Authentication
ADMIN_EMAIL=admin@airecipemanager.com
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_TOKEN=your_secure_admin_token

# Stripe Integration (for payment/subscription management)
STRIPE_SECRET_KEY=sk_live_...

# Database Connection
DATABASE_URL=your_database_connection_string
```

### Security

- **Token-based Authentication**: Admin access requires valid token authentication
- **Session Management**: Secure session handling with auto-logout
- **Access Logging**: All admin actions are logged for security auditing
- **Role-based Permissions**: Future-ready for multiple admin role levels

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login with credentials
- `GET /api/admin/logout` - Admin logout

### Statistics & Monitoring
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/activity` - Recent activity log

### User Management
- `GET /api/admin/users` - List all users (with search)
- `GET /api/admin/users/:id` - Get specific user details
- `PUT /api/admin/users/:id` - Update user information
- `POST /api/admin/users/:id/reset-password` - Reset user password
- `POST /api/admin/users/:id/suspend` - Suspend user account

### Subscription Management
- `GET /api/admin/subscriptions` - List all subscriptions
- `POST /api/admin/subscriptions/:id/cancel` - Cancel subscription

### Payment Management
- `GET /api/admin/payments` - List all payments
- `POST /api/admin/payments/:id/refund` - Process payment refund

### System Operations
- `POST /api/admin/send-password-reset` - Send password reset email
- `POST /api/admin/export-data` - Export system data
- `POST /api/admin/clear-cache` - Clear system caches
- `POST /api/admin/sync-stripe` - Synchronize Stripe data

## Installation & Setup

1. **Environment Setup**: Configure all required environment variables
2. **Admin Credentials**: Set secure admin email, password, and token
3. **Database Access**: Ensure admin operations have appropriate database permissions
4. **Stripe Configuration**: Configure Stripe webhook endpoints for real-time updates

## Security Considerations

- **Strong Authentication**: Use complex passwords and secure tokens
- **HTTPS Only**: Always serve admin portal over HTTPS in production
- **IP Restrictions**: Consider implementing IP whitelisting for admin access
- **Regular Token Rotation**: Periodically update admin tokens
- **Audit Logging**: Monitor and log all administrative actions

## Future Enhancements

- **Role-based Access Control**: Multiple admin permission levels
- **Advanced Analytics**: Detailed user behavior and system performance metrics  
- **Automated Reporting**: Scheduled reports for key business metrics
- **Integration APIs**: Connect with external business intelligence tools
- **Mobile Admin App**: Native mobile application for admin operations

## Support

For technical support or questions about the admin portal, contact the development team or refer to the main application documentation.