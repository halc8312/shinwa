# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production (includes prisma generate)
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate  # Generate Prisma client
npx prisma migrate dev --name <migration-name>  # Create and apply migrations
npx prisma studio    # Open Prisma Studio for database inspection
```

## Architecture Overview

Shinwa is an AI-powered novel writing engine built with Next.js 14 (App Router), TypeScript, and PostgreSQL. The system uses a flow-driven approach to generate novels while maintaining narrative consistency.

### Core Architecture Patterns

1. **Service Layer Pattern**: Business logic is encapsulated in service classes under `/src/lib/services/`. Each service handles a specific domain (projects, chapters, characters) and uses static methods for stateless operations.

2. **AI Provider Abstraction**: All AI providers (OpenAI, Anthropic) implement a common `AIProvider` interface in `/src/lib/ai/`. The `AIManager` handles provider selection and configuration. New providers can be added by implementing this interface.

3. **Flow Engine System**: Novel generation follows defined flows in `/src/data/flows/`. The `FlowEngine` orchestrates multi-step writing processes, with each step performing specific tasks (analyze, write, validate).

4. **Dual Storage System**: Currently uses localStorage for client-side project data and PostgreSQL for user/auth data. Migration to full database storage is planned.

### Key Services and Their Responsibilities

- **ProjectService**: Project CRUD operations, settings management
- **ChapterService**: Chapter generation, content management, structure planning
- **CharacterService**: Character profiles, development tracking
- **WorldService**: World-building, state tracking, timeline management
- **FlowEngine/FlowExecutor**: Orchestrates AI-driven writing workflows
- **AIUsageService**: Tracks and limits AI usage for subscription tiers

### Database Schema

Uses Prisma ORM with PostgreSQL. Key models:
- User → Projects (one-to-many)
- Project → Chapters, Characters (one-to-many)  
- User → Subscription (one-to-one, Stripe integration)
- User → AIUsage (tracks monthly generation limits)

### Authentication & Payments

- NextAuth.js with Google OAuth and credentials providers
- Stripe integration for subscriptions (Free: 10 chapters/month, Pro/Enterprise: unlimited)
- Webhook handling in `/src/app/api/webhooks/stripe/`

### Type System

Comprehensive TypeScript types in `/src/lib/types/index.ts` define all data structures. Always use these types when working with story elements, AI responses, and service methods.

## Development Guidelines

1. **Adding New AI Features**: Implement feature-specific methods in AI providers, update the `AIProvider` interface, and add corresponding UI in `/src/components/ai/`

2. **Creating New Services**: Follow the pattern in existing services - use static methods, handle errors gracefully, and maintain type safety throughout

3. **Working with Flows**: Flows define multi-step processes. Modify existing flows in `/src/data/flows/` or create new ones following the existing structure

4. **API Routes**: Use Next.js App Router conventions. API routes are in `/src/app/api/`. Always validate inputs and handle authentication

5. **Component Structure**: Components are organized by feature in `/src/components/`. Use server components where possible, client components for interactivity

6. **State Management**: Use localStorage through service layer for client-side project data. Server state uses Prisma. No global state management library currently

## Common Tasks

### Add a New AI Provider
1. Create provider class in `/src/lib/ai/providers/`
2. Implement the `AIProvider` interface
3. Add provider to `AIManager`
4. Update UI in model selection components

### Modify Chapter Generation
1. Update flow definition in `/src/data/flows/novel-writing-flow.ts`
2. Modify `FlowExecutor` step handlers if needed
3. Update `ChapterService` for any data structure changes

### Add New Subscription Features
1. Update subscription tiers in `/src/lib/services/subscription.ts`
2. Add feature checks where needed
3. Update pricing page UI
4. Test with Stripe webhook events

### Database Migrations
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive-name`
3. Update corresponding TypeScript types
4. Update service methods to handle new fields

## Important Considerations

- The app is primarily in Japanese - maintain Japanese UI text
- AI usage is tracked and limited for free users - always check limits before AI calls
- Project data in localStorage must be migrated carefully when moving to database
- Stripe webhooks must be handled for subscription state synchronization
- AI streaming responses require proper error handling and cleanup