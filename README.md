# Chef Mike's AI Recipe Manager

A comprehensive recipe management and AI-powered cooking companion platform that transforms home cooking experiences through intelligent meal planning, personalized recommendations, and smart kitchen management.

![Chef Mike's AI Recipe Manager](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Node](https://img.shields.io/badge/Node-18+-brightgreen.svg)

## 🚀 Features

### Core Functionality
- **Recipe Management**: Create, edit, and organize recipes with image upload support
- **AI-Powered Recommendations**: OpenAI integration for personalized recipe suggestions
- **Smart Meal Planning**: Calendar-based interface for scheduling meals
- **Intelligent Shopping Lists**: Auto-generated lists with 15+ grocery store categories
- **Barcode Scanning**: Camera integration for inventory management
- **Real-time Pricing**: Live Kroger API integration for authentic grocery pricing
- **Cost Analytics**: Track food waste and usage costs with detailed reporting

### Advanced Features
- **Multi-Site Recipe Import**: Extract recipes from 25+ popular cooking websites
- **Dietary Management**: Comprehensive dietary restrictions and allergy tracking
- **Kitchen Timer**: Multi-timer functionality for cooking assistance
- **Print-Optimized Lists**: Clean printing for physical shopping trips
- **CSV Data Backup**: Export and restore functionality
- **Mobile-Responsive**: Optimized for all device sizes

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **ShadCN/UI** component library
- **TanStack Query** for state management
- **Wouter** for routing
- **React Hook Form** with Zod validation

### Backend
- **Node.js/Express** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Replit Auth** for authentication
- **OpenAI API** for AI features
- **Stripe** for payment processing
- **Multer** for file uploads

### External APIs
- **Kroger API**: Real grocery store pricing
- **OpenAI API**: Recipe recommendations and AI features
- **@zxing/library**: Barcode scanning
- **Nodemailer**: Email functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chef-mike-ai-recipe-manager.git
   cd chef-mike-ai-recipe-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/chef_mike_db
   PGHOST=localhost
   PGPORT=5432
   PGUSER=your_username
   PGPASSWORD=your_password
   PGDATABASE=chef_mike_db

   # Authentication
   SESSION_SECRET=your_super_secure_session_secret
   REPLIT_DOMAINS=your-replit-domain.replit.dev

   # OAuth (Optional)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # AI Features
   OPENAI_API_KEY=sk-your_openai_api_key

   # Payment Processing
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

   # Email (Optional)
   SENDGRID_API_KEY=your_sendgrid_api_key
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
chef-mike-ai-recipe-manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── pages/         # Page components
├── server/                # Express backend
│   ├── storage.ts         # Database operations
│   ├── routes.ts          # API routes
│   └── replitAuth.ts      # Authentication setup
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema definitions
├── uploads/               # File uploads directory
└── package.json           # Project dependencies
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Push database schema changes
npm run db:studio    # Open Drizzle Studio
npm test            # Run tests (if configured)
```

## 🌟 Key Features Deep Dive

### AI Recipe Recommendations
- Personalized suggestions based on inventory and preferences
- Dietary restriction awareness
- Cuisine preference matching
- Ingredient-based recommendations

### Smart Shopping Lists
- Automatically categorized by grocery store sections
- Real-time pricing from Kroger API
- Print-optimized layouts
- Meal plan integration

### Barcode Scanning
- Camera integration for inventory management
- UPC code recognition
- Automatic product information lookup
- Mobile-optimized interface

### Cost Analytics
- Track spending by category
- Food waste analysis
- Price comparison across stores
- Monthly/weekly reporting

## 🚀 Deployment

### Replit Deployment
This project is optimized for Replit deployment:

1. Import the repository to Replit
2. Configure environment variables in Replit Secrets
3. The project will automatically deploy with the included configuration

### Traditional Deployment
For deployment to other platforms:

1. Build the project: `npm run build`
2. Set up PostgreSQL database
3. Configure environment variables
4. Start the server: `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Replit for hosting and authentication
- ShadCN for the beautiful UI components
- The open-source community for the amazing tools and libraries

## 📧 Contact

For support or inquiries, please contact: mike@chefmikesculinaryclass.com

---

**Chef Mike's AI Recipe Manager** - Transforming home cooking with AI-powered intelligence.