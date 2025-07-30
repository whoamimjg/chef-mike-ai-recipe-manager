# Chef Mike's Culinary Classroom

## Overview

Chef Mike's Culinary Classroom is a full-stack recipe management and meal planning application built with React and Express.js. The application provides users with comprehensive tools for managing recipes, planning meals on a calendar, generating shopping lists, and maintaining dietary preferences. It features a modern UI with ShadCN components, PostgreSQL database integration via Drizzle ORM, and Replit authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: ShadCN/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation (via @hookform/resolvers)

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with session management
- **File Uploads**: Multer middleware for recipe image uploads
- **API Integration**: OpenAI API for AI-powered recipe recommendations

### Key Design Decisions
- **Monorepo Structure**: Shared schema definitions between client and server in `/shared` directory
- **Type Safety**: Full TypeScript implementation with Zod schemas for runtime validation
- **Modern React Patterns**: Function components with hooks, no class components
- **Component Library**: ShadCN/UI chosen for consistent, accessible components
- **Database ORM**: Drizzle chosen for type safety and performance over traditional ORMs

## Key Components

### Database Schema (`shared/schema.ts`)
- **Users**: User profiles with authentication data and subscription plans
- **Recipes**: Recipe entries with ingredients, instructions, and metadata
- **Meal Plans**: Calendar-based meal planning with date and meal type associations
- **Shopping Lists**: Generated shopping lists from meal plans with grocery store categories
- **User Preferences**: Dietary restrictions, allergies, and cooking preferences
- **User Inventory**: Pantry management for ingredient tracking with expiry dates
- **AI Learning**: User interaction tracking for personalized recommendations
- **Meal Suggestions**: Daily AI-generated meal suggestions based on user's saved recipes
- **Sessions**: Session storage for Replit authentication

### Core Application Features
- **Recipe Management**: CRUD operations for recipes with image upload support
- **Meal Planning**: Calendar-based interface for scheduling meals
- **Shopping List Generation**: Automatic list creation from planned meals organized by grocery store categories
- **User Preferences**: Dietary restrictions and allergy management
- **AI Recommendations**: Enhanced OpenAI-powered recipe suggestions with personalized dietary learning
- **Mobile Optimization**: Responsive design with hamburger menu for mobile-only navigation
- **Cost Tracking**: Real-time food waste and usage cost analytics with proper financial reporting
- **AI Learning System**: Tracks user interactions, preferences, and ratings for personalized meal suggestions
- **Smart Meal Suggestions**: AI-powered daily meal recommendations based on user's saved recipes and learning history
- **Dietary Warning System**: Comprehensive recipe warning system that checks for conflicts with user's dietary restrictions and allergies
- **Dropdown-based Preferences**: Predefined dropdown selections for dietary restrictions and allergies for consistency with proper save functionality
- **Kitchen Timer**: Multi-timer functionality available only within recipe cooking mode for focused cooking assistance

### Authentication & Authorization
- **Replit Auth**: Integrated authentication system with session management
- **User Isolation**: All data operations scoped to authenticated users
- **Admin Panel**: Administrative interface for user and system management

## Data Flow

1. **Authentication**: Users authenticate via Replit OAuth, sessions stored in PostgreSQL
2. **Recipe Management**: Users create/edit recipes, stored with user association
3. **Meal Planning**: Users assign recipes to calendar dates, creating meal plan entries
4. **Shopping Lists**: System aggregates ingredients from planned meals within date ranges
5. **AI Integration**: User preferences and inventory data sent to OpenAI for recipe recommendations
6. **File Storage**: Recipe images uploaded via Multer to server filesystem

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection driver optimized for serverless
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **openai**: Official OpenAI API client for AI features
- **multer**: File upload middleware for recipe images

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type checking and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundling for production builds

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for rapid development
- **TypeScript Checking**: Continuous type checking during development
- **Database Migrations**: Drizzle Kit for schema management

### Production Build
- **Client Build**: Vite builds optimized React bundle to `dist/public`
- **Server Build**: ESBuild bundles Express server to `dist/index.js`
- **Static Assets**: Client assets served directly by Express in production
- **Database**: PostgreSQL connection via environment variable `DATABASE_URL`

### Environment Configuration
- **NODE_ENV**: Controls development vs production behavior
- **DATABASE_URL**: PostgreSQL connection string (required)
- **OPENAI_API_KEY**: OpenAI API access for AI features
- **SESSION_SECRET**: Secure session signing key
- **REPLIT_DOMAINS**: Domain configuration for Replit auth

The application follows a modern full-stack architecture with strong type safety, user authentication, and a clean separation between client and server concerns. The shared schema approach ensures consistency between frontend and backend data handling.