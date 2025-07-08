# Tagging Interface MVP

## Overview

This is a full-stack TypeScript application built for tagging social media content. It consists of a React frontend with a Node.js/Express backend, utilizing PostgreSQL as the database with Drizzle ORM for data management. The application serves as a tagging interface for social media posts, allowing users to categorize content with AI-generated and user-created tags, and manage linked paid advertisements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL session store
- **API Design**: RESTful API with JSON responses

## Key Components

### Database Schema
The application uses a relational database with the following main entities:
- **Users**: Basic user authentication (though not required for MVP)
- **Posts**: Social media posts with platform, embed URLs, and metadata
- **Tags**: Categorized tags with auto-generated codes (pillar_tagname_####)
- **PostTags**: Many-to-many relationship between posts and tags
- **PaidAds**: Advertisements linked to posts
- **AdTags**: Many-to-many relationship between ads and tags

### Frontend Components
- **TaggingInterface**: Main interface with three-column layout
- **PostItem**: Individual post display with embedded media
- **TagSection**: Tag management for different pillars (product, influencer)
- **PaidAdItem**: Paid advertisement display with linking controls
- **TagInput**: Dynamic tag creation interface

### Backend Services
- **Storage Layer**: Abstracted database operations through IStorage interface
- **Route Handlers**: RESTful endpoints for posts, tags, and ads
- **Database Connection**: Pooled connections with Neon serverless

## Data Flow

1. **Content Display**: Posts are fetched from the database and displayed in the left column with embedded media
2. **Tag Management**: Tags are organized by pillars (product, influencer) and can be AI-generated or user-created
3. **Tag Association**: Users can add/remove tags from posts, with automatic code generation for new tags
4. **Ad Linking**: Paid ads inherit tags from their linked posts by default but can be unlinked to break inheritance

### Tag Code Generation
- Format: `pillar_tagname_####` (e.g., "product_shoes_0001")
- Automatic generation ensures unique identification
- Stable internal codes for database consistency

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection**: WebSocket-based connection for serverless environments
- **Migrations**: Drizzle Kit for schema management

### UI Framework
- **shadcn/ui**: Comprehensive component library built on Radix UI
- **Radix UI**: Accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across the stack
- **ESLint/Prettier**: Code formatting and linting
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds the React application to `dist/public`
2. **Backend**: esbuild bundles the Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: Uses `tsx` for TypeScript execution with hot reloading
- **Production**: Node.js serves the built application
- **Database**: Requires `DATABASE_URL` environment variable

### File Structure
- `client/`: React frontend application
- `server/`: Express backend application
- `shared/`: Shared TypeScript schemas and types
- `migrations/`: Database migration files
- `dist/`: Built application files

The application is designed to be deployed on platforms that support Node.js applications with PostgreSQL databases, with specific optimizations for Replit's development environment.

## Recent Changes: Latest modifications with dates

### January 8, 2025 - MVP Implementation Complete
- **Database Schema**: Implemented PostgreSQL schema with posts, tags, paid ads, and relationship tables
- **Three-Column Interface**: Created responsive layout with Content, Tags, and Connected Paid Ads columns
- **Tag Management**: Implemented AI-generated vs user-created tag distinction with color coding
- **Tag Inheritance System**: Built automatic tag inheritance for linked paid ads with manual override capability
- **Tag Code Generation**: Implemented automatic unique code generation (pillar_tagname_####) for all tags
- **CRUD Operations**: Full create, read, update, delete functionality for all entities
- **Sample Data**: Populated with realistic social media posts, tags, and paid ads for demonstration
- **Bug Fixes**: Resolved TypeScript compilation errors and 400 status code issues with tag creation
- **User Validation**: Confirmed by user that tag creation and overall interface functionality works correctly

### January 8, 2025 - Enhanced Features Added
- **Bulk Edit Functionality**: Added bulk selection and deletion of tags with checkbox interface
- **Connect New Paid Ad**: Implemented form to create and link new paid advertisements to posts
- **Campaign Filtering**: Added searchable dropdown in header for filtering posts by campaign
- **Campaign Management**: Posts filtered by predefined campaigns (Summer 2024, Fall 2024, etc.)
- **User Validation**: All new features confirmed working by user

### January 8, 2025 - Production Database Integration
- **Database Connection**: Successfully connected to production database (shelfdb) with read-only access
- **Storage Layer Refactoring**: Transitioned from development schema to production-ready storage implementation
- **Sample Data Implementation**: Created clean sample data structure matching production schema requirements
- **TypeScript Compliance**: Resolved all compilation errors and type mismatches
- **API Endpoints**: All REST endpoints functioning correctly with proper data flow
- **User Validation**: Interface confirmed working correctly with new storage layer

## MVP Status: ✅ Complete + Enhanced + Production Ready
The tagging interface MVP has been successfully delivered with additional enhancements and is now ready for production deployment. All core features plus bulk editing, paid ad creation, campaign filtering, and production database integration are implemented and working correctly.