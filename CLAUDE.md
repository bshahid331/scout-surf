# Poof V2.0.0 TEMPLATE GUIDELINES

This is the official template for generating full-stack AI-powered dApps on poof.new. This template gets copied and customized by the claude-agents SDK to create production-ready applications.

## V2 TEMPLATE ARCHITECTURE OVERVIEW

This is a **dual-package monorepo** with completely decoupled frontend and backend:

- **Frontend**: React 19.2.0 + Vite 6.4.1 + TypeScript 5.9.3 application (`/src`)
  - Own `package.json` with 82+ dependencies
  - Strict TypeScript (`strict: true`)
  - Auto-generated SDK from backend routes
  - Three-layer CSS system (globals.css, base.css, poof-styling.css)

- **Backend**: Hono 4.10.4 + PartyServer 0.0.75 REST API (`/partyserver`)
  - Own `package.json` with 100+ dependencies
  - Lenient TypeScript (`strict: false` for AI flexibility)
  - Route registry pattern for auto-SDK generation
  - Cloudflare Workers deployment

**Key Architecture Principles:**

- Frontend and backend communicate via auto-generated TypeScript SDK
- Backend routes are defined in registry → SDK is auto-generated → Frontend imports SDK
- All API responses use exactly 5 standardized status codes (200, 400, 401, 404, 500)
- Environment-aware configuration with smart defaults

## PROJECT STRUCTURE

### Root Configuration Files

| File                                | Purpose                 | Key Details                                                                                    |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| **CLAUDE.md**                       | Template documentation  | This file - comprehensive guidelines                                                           |
| **README.md**                       | Project overview        | Quick start and basic usage                                                                    |
| **README-PARTYSERVER.md**           | Backend documentation   | PartyServer-specific setup                                                                     |
| **package.json**                    | Frontend dependencies   | v2.0.0, React 19.2.0, Vite 6.4.1, 82+ dependencies                                             |
| **bun.lock**                        | Dependency lock file    | Ensures consistent installs                                                                    |
| **bunfig.toml**                     | Bun configuration       | Workspace settings, install options, cache configuration                                       |
| **tsconfig.json**                   | TypeScript root config  | References app & node configs, path aliases for @tarobase                                      |
| **tsconfig.app.json**               | App TypeScript config   | `strict: true`, target: ES2020, jsx: react-jsx                                                 |
| **tsconfig.node.json**              | Node/build config       | For vite.config.ts, target: ES2022                                                             |
| **vite.config.ts**                  | Vite dev bundler config | React plugin, node polyfills, CommonJS support                                                 |
| **vite.config.prod.ts**             | Vite production config  | Production-specific optimizations                                                              |
| **vite.config.d.ts**                | Vite config types       | TypeScript declarations                                                                        |
| **vite-plugin-build-notifier.d.ts** | Build notifier types    | Custom Vite plugin types                                                                       |
| **tailwind.config.ts**              | Tailwind CSS config     | Shadcn theme system, HSL color variables, animations                                           |
| **tailwind.config.d.ts**            | Tailwind types          | TypeScript declarations                                                                        |
| **eslint.config.js**                | ESLint v9 flat config   | TypeScript rules, React hooks, type-checked linting                                            |
| **.eslintrc.js**                    | ESLint legacy config    | Classic ESLint configuration (coexists with flat config)                                       |
| **eslint-polyfill.cjs**             | ESLint polyfills        | Node.js compatibility shims                                                                    |
| **.prettierrc**                     | Prettier config         | 2 spaces, 100 char width, single quotes, trailing commas                                       |
| **postcss.config.cjs**              | PostCSS config          | Tailwind CSS processing                                                                        |
| **.bun-version**                    | Bun version             | 1.3.1 (exact required version)                                                                 |
| **.nvmrc**                          | Node version            | 22.14.0 (for Node.js compatibility)                                                            |
| **components.json**                 | Shadcn/UI config        | Component aliases, Tailwind paths, Lucide icons                                                |
| **index.html**                      | HTML entry point        | Poof preview favicon, loads /src/main.tsx                                                      |
| **docs/**                           | Documentation           | API docs organized by technology (tarobase/, partyserver/, d3/, three.js/, solana/, uniblock/) |
| **public/**                         | Static assets           | vite.svg and other public files                                                                |
| **partyserver/**                    | Backend code            | See Backend Structure section below                                                            |

### Frontend Structure (`/src`)

```
src/
├── components/           # All React components (FLAT STRUCTURE)
│   ├── ui/              # Shadcn/UI components (auto-generated, DO NOT EDIT manually)
│   │   ├── *.tsx        # UI component implementations
│   │   └── *.d.ts       # TypeScript declarations for each component
│   ├── HomePage.tsx     # Main landing page
│   ├── AdminPage.tsx    # Admin panel
│   ├── Header.tsx       # Navigation component
│   ├── FeatureCard.tsx  # Reusable feature card component
│   └── types.ts         # Shared component types
├── hooks/               # React hooks
│   ├── use-tarobase-data.tsx    # Real-time data subscription (IMPLEMENTATION)
│   ├── usePartyServerAuth.tsx   # PartyServer authentication (IMPLEMENTATION)
│   ├── use-mobile.tsx           # Responsive detection (IMPLEMENTATION)
│   ├── use-toast.d.ts           # Toast hook types (TYPE DECLARATIONS ONLY - no .ts file)
│   ├── use-mobile.d.ts          # Mobile hook types
│   └── [others].d.ts            # Other hook type declarations
├── lib/                 # Core utilities and configuration
│   ├── config.ts        # Centralized configuration (PartyServer, Tarobase)
│   ├── constants.ts     # App-specific constants (AUTO-INJECTED)
│   ├── tarobase.ts      # Auto-generated Tarobase SDK (NOT PRESENT until generated)
│   ├── api-client.ts    # Auto-generated backend API client (NOT PRESENT until generated)
│   ├── utils.ts         # Utility functions (cn, etc.)
│   ├── utils.d.ts       # Utils type declarations
│   └── errorReporting.ts # Global error handling with circuit breaker
├── styles/
│   └── base.css         # Base styles (font imports, defaults)
├── assets/              # Static assets (logos, images)
│   ├── poof-logo.png    # Poof platform logo
│   ├── poof-preview-logo.png  # Preview logo
│   └── react.svg        # React logo
├── App.tsx              # Main app with routing
├── App.d.ts             # App type declarations
├── main.tsx             # Application entry point
├── main.d.ts            # Main type declarations
├── ErrorBoundary.tsx    # Error boundary component
├── globals.css          # Global styles and theme (USER-EDITABLE)
├── poof-styling.css     # Poof platform styles (POOF-OWNED, DO NOT EDIT)
├── index.html           # Secondary HTML file (primary at root)
├── store.d.ts           # Store type declarations
└── vite-env.d.ts        # Vite environment types
```

**Note on `.d.ts` Files:**
Many files in the template have corresponding `.d.ts` (TypeScript declaration) files. These provide type definitions but no runtime implementation:

- **UI components** (`src/components/ui/*.d.ts`) - Type declarations for Shadcn components
- **Hooks** (`src/hooks/*.d.ts`) - Type declarations (some hooks like `use-toast` ONLY have .d.ts, no implementation file)
- **Utils** (`src/lib/utils.d.ts`) - Type declarations for utilities
- **Config files** (`*.d.ts` at root) - Type declarations for configuration

These `.d.ts` files are for TypeScript type checking and editor autocomplete. Do not attempt to import from them directly - import from the `.ts` or `.tsx` implementation files instead.

### Backend Structure (`/partyserver`)

```
partyserver/
├── src/
│   ├── index.ts                  # Main Hono server + PartyServer setup
│   ├── auth_check.ts             # Auth validation examples
│   ├── jws.ts                    # JWT utilities
│   ├── types/
│   │   └── api.ts                # API endpoint config types & schemas
│   ├── lib/                      # Core utilities
│   │   ├── tarobase-auth.ts      # Tarobase auth validation
│   │   ├── cors-helpers.ts       # CORS middleware
│   │   ├── api-response.ts       # Standardized responses
│   │   ├── health-utils.ts       # Health check logic
│   │   ├── request-logger.ts     # HTTP logging middleware
│   │   └── type-generation.ts    # SDK generation utilities
│   ├── utils/                    # Helper utilities
│   │   ├── auth-helpers.ts       # Auth middleware patterns
│   │   └── message-handler.ts    # WebSocket message routing
│   └── routes/                   # API endpoint definitions
│       ├── index.ts              # Route registry (CENTRAL HUB)
│       ├── health.ts             # Health check endpoint example
│       └── README.md             # Route documentation
├── scripts/
│   ├── generate-simple-sdk.ts    # Generates frontend TypeScript SDK
│   └── generate-api-spec.ts      # Generates API documentation
├── package.json                  # Backend dependencies (100+ packages)
├── bun.lock                      # Dependency lock file
├── tsconfig.json                 # TypeScript config (strict: false for AI flexibility)
├── jest.config.js                # Jest test configuration
├── wrangler.toml.template        # Cloudflare Workers deployment template
└── README.md                     # Backend-specific documentation
```

## TECHNOLOGY STACK

### Frontend Core

- **Framework**: React 19.2.0 + TypeScript 5.9.3 + Vite 6.4.1
- **Routing**: React Router 7.9.5
- **Styling**: Tailwind CSS 3.4.18 + Shadcn/UI + Framer Motion 12.23.24
- **Icons**: Lucide React 0.548.0
- **State**: React Hooks + Context API + Zustand 5.0.8
- **Forms**: React Hook Form 7.65.0 + Zod 4.1.12
- **Notifications**: Sonner 2.0.7 (preferred over react-hot-toast)

### Visualization & 3D

- **Data Viz**: D3.js 7.9.0 (complex), Recharts 3.3.0 (standard)
- **3D Graphics**: Three.js 0.180.0 (WebGL/3D scenes)
- **Markdown**: React-Markdown 10.1.0

### Blockchain Integration

- **Solana**: @solana/web3.js 1.98.4
- **Wallet**: @wagmi/core 2.22.1
- **DEX**: https://plugin.jup.ag/plugin-v1.js
- **Token Bonding**: @meteora-ag/dynamic-bonding-curve-sdk 1.4.5
- **Auth/Data**: @pooflabs/web 0.0.3 (via Tarobase SDK)

### Backend Core

- **Framework**: Hono 4.10.4 + PartyServer 0.0.75
- **Integration**: Hono-Party 0.0.17
- **Deployment**: Cloudflare Workers (via Wrangler 4.45.2)
- **Runtime**: Node.js with ES2020 modules

### AI/LLM Providers

- **Unified SDK**: Vercel AI SDK
- **Providers**: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/deepseek, @ai-sdk/mistral, @ai-sdk/groq

### External Integrations

- **Payments**: Stripe 19.2.0, PayPal SDKs
- **Communication**: Twilio 5.10.4, Nodemailer 7.0.10, SendGrid 8.1.6
- **Social**: Discord.js 14.24.1, @slack/bolt 4.6.0, Twitter API v2 1.27.0
- **Security**: Jose 6.1.0 (JWT), BCrypt 6.0.0, Crypto-JS 4.2.0

## BUILD & DEVELOPMENT COMMANDS

### Frontend (Root Directory)

```bash
bun dev          # Start dev server (uses $PORT env var or fallback port from directory name)
bun run build        # Full build: ESLint → TypeScript check → Vite build
bun check-types  # TypeScript type checking only (no emit)
bun lint         # ESLint (ignores src/components/ui/ folder)
bun format       # Prettier format check
bun preview      # Preview production build
```

**Build Output:**

- `dist/` - Production build artifacts
- Linting ignores auto-generated Shadcn components in `src/components/ui/`

### Backend (partyserver/ Directory)

```bash
cd partyserver
bun dev             # Start local dev server (port 1999)
bun run build           # Full build: Compile TS → Generate SDK → Generate API spec
bun test            # Run Jest tests
bun generate-sdk    # Generate frontend TypeScript SDK only
bun generate-spec   # Generate API documentation only
bun run deploy          # Deploy to Cloudflare Workers with --dispatch-namespace poof_apps
```

**Build Outputs:**

- `partyserver/dist/` - Compiled JavaScript for Cloudflare Workers
- `partyserver/generated/api-client.ts` - Auto-generated TypeScript SDK for frontend
- `partyserver/generated/api-spec.json` - Machine-readable API specification
- `partyserver/generated/API_DOCUMENTATION.md` - Human-readable API documentation

**SDK Generation Workflow:**

1. Define routes in `partyserver/src/routes/[name].ts`
2. Register in `partyserver/src/routes/index.ts`
3. Run `bun run build` in partyserver/
4. SDK is auto-generated in `partyserver/generated/api-client.ts`
5. Frontend imports SDK: `import { api } from './generated/api-client'`

## V2 TEMPLATE SPECIFIC PATTERNS

### Three-Layer CSS System

The V2 template uses a three-layer CSS architecture:

1. **src/globals.css** (USER-EDITABLE) - Theme colors, dark/light mode
2. **src/styles/base.css** (BASE STYLES) - Font imports, default styles
3. **src/poof-styling.css** (POOF-OWNED, DO NOT EDIT) - Platform chrome

**CRITICAL**: Never modify `poof-styling.css` - it's managed by the Poof platform.

**Note**: Detailed CSS patterns, styling guidelines, and component structure are provided to the ui-generator agent.

### Frontend Configuration Pattern

Smart defaults with environment variable overrides in `src/lib/config.ts`:

- Auto-detects PartyServer URL based on environment
- Protocol detection (ws for localhost, wss for production)
- Helper functions for WebSocket URL generation with JWT tokens

**Note**: Complete configuration patterns and helper functions are provided to the ui-generator agent.

### Custom Frontend Hooks

The template includes custom hooks for data and WebSocket management. For complete hook implementations and usage examples, refer to the 'using-tarobase' skill for Tarobase-related hooks.

### Error Reporting Pattern (Circuit Breaker)

The template includes intelligent error reporting with:

- 10-minute circuit breaker timeout to prevent spam
- Error deduplication by hash
- Global handlers for uncaught exceptions and promise rejections

### Backend Route Registry Pattern

All backend routes MUST be registered in `partyserver/src/routes/index.ts` for:

- Auto-registration with Hono app
- TypeScript SDK generation
- API documentation generation
- Type-safe frontend/backend communication

**Note**: Complete route registry patterns, authentication strategies, and API endpoint creation are provided to the backend-generator agent.

## CODE STYLE & CONVENTIONS

### General TypeScript

- Use strict typing (`strict: true` in frontend)
- Avoid `any` types when possible
- **Optional chaining** for all object property access: `object?.property`
- **Nullish coalescing** for defaults: `value ?? defaultValue`
- 2-space indentation
- 80-100 character line length
- Trailing commas in objects/arrays
- ESM modules (`type: "module"`)

### Null Safety Guidelines (CRITICAL)

1. ALWAYS use optional chaining: `object?.property`, `object?.method?.()`
2. ALWAYS provide defaults: `value ?? defaultValue`
3. NEVER directly access properties of potentially undefined objects

Example: `const name = user?.name ?? 'Unknown';` NOT `const name = user.name;`

### Console Logging Best Practices

Log critical actions and errors with `JSON.stringify(data, null, 2)`. Never leak sensitive data.

### Naming Conventions

- **Components**: PascalCase (e.g., `HomePage.tsx`, `FeatureCard.tsx`)
- **Page Components**: Suffix with "Page" (e.g., `HomePage`, `AdminPage`)
- **Functions/Variables**: camelCase (e.g., `getUserData`, `isAuthenticated`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase with `I` prefix optional (e.g., `UserData`, `IApiResponse`)

### Import Patterns

- Use `@/` alias for src folder imports: `import { Component } from '@/components/ui'`
- Group imports: React → External → Internal → Types → Styles
- For Tarobase SDK imports, refer to the 'using-tarobase' skill

### Component Structure

Components should follow this structure:

1. Imports (React → External → Internal → Types)
2. Types/Interfaces
3. Component function (Hooks → Handlers → Render)

**Note**: Complete component structure template is provided to the ui-generator agent.

### Styling Guidelines

- Use Tailwind utility classes (PREFERRED)
- Theme colors via CSS variables from `globals.css`
- Dark mode with `dark:` prefix
- Responsive with breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Use Lucide React icons
- One React component per file

**Note**: Detailed styling patterns, Tailwind usage, and theme customization are provided to the ui-generator agent.

### File Organization

- **Frontend**: Flat component structure (no feature folders)
- **Backend**: Modular with clear separation (types, lib, routes, utils)
- Keep files focused and single-responsibility
- Avoid files longer than 500 lines

## AUTHENTICATION & SECURITY

### Authentication

For all authentication patterns (frontend wallet integration, backend validation, protected routes, etc.), refer to the 'using-tarobase' skill.

### Security Best Practices

- Always validate input with Zod schemas
- Never expose sensitive data in client-side code
- Use environment variables for secrets
- Implement rate limiting on sensitive endpoints
- Log authentication attempts for audit trails
- Use HTTPS in production (auto-handled by Cloudflare)

## API ENDPOINT PATTERNS

### Creating New Endpoints

To create a new API endpoint:

1. Create route file in `/partyserver/src/routes/` with config and handler
2. Register in `/partyserver/src/routes/index.ts`
3. Run `bun generate-sdk` in partyserver directory to create TypeScript client
4. Frontend imports from `../partyserver/generated/api-client` (or copy to `/src/lib/` if preferred)

### API Response Standards

The V2 template uses standardized responses:

**Success**: `sendSuccess(c, data, 200)`
**Errors**:

- `ApiErrors.badRequest(c, msg)` - 400
- `ApiErrors.unauthorized(c, msg)` - 401
- `ApiErrors.notFound(c, msg)` - 404
- `ApiErrors.internal(c, msg)` - 500

**CRITICAL**: V2 template ONLY allows these 5 status codes (200, 400, 401, 404, 500). Using other codes will break API consistency.

## REAL-TIME FEATURES (PARTYSERVER)

Use `getPartyServerWsUrl({ room, token? })` from `@/lib/config`. URL resolution: Custom URL → `{appId}-api.poof.new` (prod) → `localhost:1999` (dev). Message patterns in `partyserver/src/utils/message-handler.ts`.

## TAROBASE SDK INTEGRATION

**⚠️ CRITICAL: Agents do NOT have Tarobase knowledge built-in.**

**MANDATORY WORKFLOW:**

1. Before ANY Tarobase work, invoke: `Skill({ command: "using-tarobase" })`
2. Read the skill response
3. Implement based on that information

**The skill provides:** SDK usage, authentication, policies, data handling, imports, best practices.

**Making assumptions without using the skill will result in broken code.**

## ERROR HANDLING

**Frontend:** ErrorBoundary in `App.tsx`, try/catch for async, toast notifications with Sonner (`toast.success/error/info/loading`).

**Backend:** Use `ApiErrors.badRequest/unauthorized/notFound/internal` and `sendSuccess` from `./lib/api-response`. Zod validation for inputs.

**Note**: Complete error handling patterns are provided to the ui-generator and backend-generator agents.

## TESTING PRACTICES

Frontend: Vitest/Jest for utils and components. Backend: Jest configured in `partyserver/jest.config.js`. Test API endpoints, auth flows, WebSocket handling. See `/partyserver/src/__tests__/` for examples.

## ENVIRONMENT VARIABLES

### Frontend (.env)

```bash
# REQUIRED
VITE_TAROBASE_APP_ID=your-app-id

# OPTIONAL (with smart defaults)
VITE_PARTYSERVER_URL=custom-domain.com     # Default: {appId}-api.poof.new or localhost:1999
VITE_CHAIN=solana_mainnet                  # Default: solana_devnet
VITE_RPC_URL=https://your-rpc.com          # Default: Helius devnet RPC
VITE_AUTH_METHOD=privy                     # Default: privy
VITE_ERROR_REPORT_URL=https://...          # Optional: error reporting endpoint

# ADVANCED (usually use defaults)
VITE_WS_API_URL=wss://ws.tarobase.com      # Default: wss://ws.tarobase.com
VITE_API_URL=https://api.tarobase.com      # Default: https://api.tarobase.com
VITE_AUTH_API_URL=https://auth.tarobase.com # Default: https://auth.tarobase.com
```

### Backend (wrangler.toml.template)

```toml
name = "{{TAROBASE_APP_NAME}}"
main = "src/index.ts"
account_id = "{{CLOUDFLARE_ACCOUNT_ID}}"
workers_dev = false
compatibility_date = "2025-08-15"
compatibility_flags = [
  "nodejs_compat",
  "nodejs_compat_populate_process_env"
]
tail_consumers = [{ service = "poof-log-tail" }]

[vars]
TAROBASE_APP_ID = "{{TAROBASE_APP_ID}}"
ENV = "{{ENV}}"                   # LIVE, PREVIEW, etc.
JWT_ISSUER = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Y2DTcFzKs"

[limits]
cpu_ms = 300_000  # 5 minutes max CPU time

[[dispatch_namespaces]]
binding = "not_used_locally"
namespace = "poof_apps"
```

**Template Variables:**

- `{{TAROBASE_APP_NAME}}` - Cloudflare Worker name
- `{{CLOUDFLARE_ACCOUNT_ID}}` - Cloudflare account identifier
- `{{TAROBASE_APP_ID}}` - Tarobase app identifier
- `{{ENV}}` - Environment (LIVE, PREVIEW, etc.)

**Cloudflare Secrets (set via cloudflareBackendBootstrap):**

- `CRON_API_KEY` - API key for cron route authentication (random UUID, set automatically during backend bootstrap)
- `PROJECT_VAULT_PRIVATE_KEY` - Project vault private key for server-side transactions

## VERSION REQUIREMENTS

### Critical Version Dependencies

| Package                   | Version | Constraint           | Notes                               |
| ------------------------- | ------- | -------------------- | ----------------------------------- |
| **Bun**                   | 1.3.1   | Exact (.bun-version) | Required for development            |
| **Node.js**               | 22.14.0 | Exact (.nvmrc)       | For Node.js compatibility           |
| **React**                 | 19.2.0  | ^19.2.0              | Latest React (forced via overrides) |
| **React DOM**             | 19.2.0  | ^19.2.0              | Must match React version            |
| **Vite**                  | 6.4.1   | ^6.4.1               | Latest Vite (forced via overrides)  |
| **TypeScript (Frontend)** | 5.9.3   | ~5.9.3               | Strict mode enabled                 |
| **TypeScript (Backend)**  | 5.9.3   | ^5.9.3               | Lenient mode for AI                 |
| **Hono**                  | 4.10.4  | ^4.10.4              | Lightweight web framework           |
| **PartyServer**           | 0.0.75  | ^0.0.75              | Durable Objects wrapper             |
| **Hono-Party**            | 0.0.17  | ^0.0.17              | Hono + PartyServer integration      |
| **Tailwind CSS**          | 3.4.18  | ^3.4.18              | Utility-first CSS                   |
| **Wrangler**              | 4.45.2  | ^4.45.2              | Cloudflare Workers CLI              |
| **@pooflabs/web**         | 0.0.3   | 0.0.3                | Tarobase frontend SDK               |
| **@pooflabs/server**      | 0.0.2   | ^0.0.2               | Tarobase backend SDK                |

### Package Overrides (Root package.json)

```json
"overrides": {
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "vite": "^6.1.0"
}
```

This ensures all dependencies use React 19 and Vite 6, even if sub-dependencies specify older versions.

### TypeScript Configuration Differences

**Frontend (strict mode for safety):**

- `strict: true` - Full type safety
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

**Backend (lenient mode for AI flexibility):**

- `strict: false` - More permissive for AI-generated code
- `noImplicitAny: false`
- `strictNullChecks: false`

**Rationale**: Backend code is often AI-generated and benefits from more flexibility during rapid development.

## DEPLOYMENT

### Frontend Deployment

The frontend can be deployed to any static hosting provider:

- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- Cloudflare Pages: `wrangler pages deploy dist`

Build command: `bun run build`
Output directory: `dist`

### Backend Deployment

Deploy to Cloudflare Workers:

```bash
cd partyserver
bun run deploy
```

This uses Wrangler to deploy to Cloudflare with Durable Objects enabled.

## ADDING NEW FEATURES

### Homepage-First Approach (CRITICAL RULE)

**Unless explicitly specified, ALWAYS make changes to the homepage** rather than creating new pages.

- Add features directly to homepage
- Use tabs/sections for multiple views
- Only create new pages when user explicitly requests (e.g., "create an admin page")

**Note**: Complete homepage-first guidelines with examples are provided to the ui-generator agent.

### Adding a New Page (When Explicitly Requested)

1. Create component in `/src/components/MyNewPage.tsx`
2. Add route in `/src/App.tsx`
3. If creating admin page, add visible link on homepage for admin users

### Adding a New API Endpoint

1. Create route file in `/partyserver/src/routes/my-feature.ts`
2. Define config and handler (see API Endpoint Patterns)
3. Register in `/partyserver/src/routes/index.ts`
4. Run `bun generate-sdk` to create TypeScript client
5. Import and use in frontend: `import { myFeature } from '@/lib/api-client'`

### Adding External Services

**Payments:** Stripe (`stripe`), PayPal (`@paypal/checkout-server-sdk`). **Email:** SendGrid (`@sendgrid/mail`), Nodemailer (`nodemailer`). **Social:** Discord.js (`discord.js`), Slack Bolt (`@slack/bolt`), Twitter API (`twitter-api-v2`). See AVAILABLE BACKEND DEPENDENCIES section for full list.

### Cron Job Generation Guidelines

Create cron routes for server-side scheduled tasks (admin transactions, data cleanup, reports). Use `@cron true` + `@admin true` in JSDoc + `cronExpression` in config. Implement dual auth (API key OR admin). Min 5min interval. Expressions: "every 5min" → `"*/5 * * * *"`, "hourly" → `"0 * * * *"`, "daily 8am" → `"0 8 * * *"`.

**Note**: Complete cron job patterns are provided to the backend-generator agent.

## AI/LLM INTEGRATION

Vercel AI SDK with `generateText`/`streamText`. Providers: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `@ai-sdk/mistral`, `@ai-sdk/groq`. Import from `ai` package.

## UNIBLOCK API (BLOCKCHAIN DATA)

Functions in `@/lib/tarobase`: `getWalletTokenBalance`, `getTokenPrice`, `getTokenHistoricalPrice`, `getWalletNFTBalance`, `getNFTMetadata`. Values are **human-readable** (no conversion needed). Use as fallback; prefer Tarobase QueryFor functions. Handle rate limits gracefully.

## SOLANA BLOCKCHAIN INTEGRATION

Jupiter: `https://plugin.jup.ag/plugin-v1.js`. Web3.js: `@solana/web3.js` with `Connection`, `PublicKey`, `clusterApiUrl`. See `/docs/solana/` for examples.

## DATA VISUALIZATION

The template includes three visualization libraries:

- **D3.js (v7.9.0)** - Complex custom visualizations and interactive charts
- **Recharts (v2.15.1)** - Standard charts (LineChart, BarChart, etc.)
- **Three.js (v0.174.0)** - 3D graphics and WebGL scenes

**Note**: Complete visualization examples and usage patterns are provided to the ui-generator agent.

## DOCUMENTATION RESOURCES

The `/docs` directory contains comprehensive guides:

- **Tarobase**: `/docs/tarobase/` - SDK usage, auth, real-time features
- **PartyServer**: `/docs/partyserver/` - WebSocket integration
- **Solana**: `/docs/solana/` - Jupiter DEX integration
- **D3.js**: `/docs/d3/` - Data visualization examples
- **Three.js**: `/docs/three.js/` - 3D graphics guides
- **Uniblock**: `/docs/uniblock/` - Blockchain data API specs

## AVAILABLE BACKEND DEPENDENCIES

The template includes a comprehensive set of backend dependencies pre-installed and ready to use.

**⚠️ CRITICAL: The AI system CANNOT add new dependencies. ONLY use the dependencies listed below.**

### AI & Machine Learning

- **Vercel AI SDK** (v5.0.82) - Unified interface: `generateText`, `streamText`
- **OpenAI** (v6.7.0) - Direct SDK access
- **Anthropic** (v0.68.0) - Claude AI SDK
- **Provider Adapters**: @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/mistral, @ai-sdk/groq, @ai-sdk/xai, @ai-sdk/deepseek, @ai-sdk/perplexity, @ai-sdk/vercel
- **Cloud Providers**: @ai-sdk/amazon-bedrock, @ai-sdk/google-vertex, @ai-sdk/azure
- **Audio & Speech**: @ai-sdk/elevenlabs, @ai-sdk/lmnt, @ai-sdk/deepgram, @ai-sdk/assemblyai, @ai-sdk/revai, @ai-sdk/gladia, @ai-sdk/hume

### Payments & E-commerce

- **Stripe** (v19.2.0) - Payment processing
- **PayPal SDK** (v1.1.0) - PayPal server SDK
- **Shopify** (v3.15.0) - Shopify API client
- **WooCommerce API** (v1.0.2) - WooCommerce REST API
- **CoinGecko** (v1.0.10) - Cryptocurrency market data

### Social Media & Communication

- **Twitter API v2** (v1.27.0) - Twitter/X integration
- **Discord.js** (v14.24.1) - Discord bot framework
- **Slack Bolt** (v4.6.0) - Slack app framework
- **SendGrid** (v8.1.6) - Email service
- **Nodemailer** (v7.0.10) - Email sending
- **Twilio** (v5.10.4) - SMS/Voice/Video

### Security & Authentication

- **jsonwebtoken** (v9.0.2) - JWT creation and verification
- **bcrypt** (v6.0.0) - Password hashing
- **jose** (v6.1.0) - JWT utilities (already in use)

### HTTP & Utilities

- **axios** (v1.13.1) - HTTP client
- **zod** (v4.1.12) - Schema validation (already in use)
- **dotenv** (v17.2.3) - Environment configuration

## WHEN TO USE BACKEND VS FRONTEND-ONLY

### DON'T Use Backend For (Tarobase Handles These)

- ❌ Standard CRUD operations - Creating, reading, updating, deleting data
- ❌ User authentication - Wallet connections, login/logout
- ❌ File uploads/downloads - Tarobase handles file storage
- ❌ Data fetching - Getting lists, search results, individual records
- ❌ User-controlled transactions - Tarobase handles onchain TX when user-controlled
- ❌ Basic form submissions - User registration, profile updates, settings

### DO Use Backend For

- ✅ Server-controlled transactions - Using `ADMIN_SOLANA_PRIVATE_KEY` for admin actions
- ✅ Complex business logic - Calculations, validations that must be server-side
- ✅ External API integrations - Third-party services, webhooks, API calls
- ✅ Payment processing - Stripe/PayPal server-side validation
- ✅ Custom algorithms - Game mechanics, matching algorithms, complex computations
- ✅ Multiplayer games - Real-time game state, player movements
- ✅ Live chat/messaging - Instant messaging, group chats
- ✅ Collaborative editing - Multiple users editing same document
- ✅ Live dashboards - Real-time metrics that update frequently
- ✅ Trading/auction systems - Live price updates, bid notifications
- ✅ Scheduled tasks - Cron jobs for maintenance, reports, notifications

### Key Principle

- **Frontend + Tarobase** handles 90% of app functionality
- **Backend APIs** only for server-side logic that can't be done client-side
- **Server transactions** use `ADMIN_SOLANA_PRIVATE_KEY` for admin-controlled actions

## ROUTE TYPE SYSTEM

All routes MUST be classified into exactly ONE type using JSDoc annotations:

1. **User** - `@public false`, `@admin false` - Protected routes for authenticated users
2. **Admin** - `@public false`, `@admin true` - Admin-only routes
3. **Public** - `@public true`, `@admin false` - No authentication needed
4. **Cron** - `@cron true` + `@admin true` + cronExpression - Scheduled tasks

**CRITICAL**: Exactly ONE flag must be `true`. For Cron routes, also set `cronExpression` in ApiEndpointConfig.

**Note**: Complete route type system with authentication table is provided to the backend-generator agent.

## CRITICAL IMPLEMENTATION GUIDELINES

### Stay Within Scope

**CRITICAL:** Implement EXACTLY what's requested, nothing more. No over-engineering, no anticipating features, no "nice-to-haves". Simplest version only. Ask for clarification if ambiguous.

Example: "Add a button" = add button only, not validation/loading/success messages unless asked.

### Use Existing Hooks ONLY (CRITICAL)

**NEVER create new hook files.** Use existing hooks from the template.

**NEVER** create/modify/duplicate hook files. This BREAKS the app. For Tarobase hook usage, refer to the 'using-tarobase' skill.

## AI SYSTEM LIMITATIONS

### What AI CAN DO

**Frontend:** Create components, add routes, modify `globals.css`, use pre-installed deps, use existing hooks
**Backend:** Add routes, create business logic, implement auth, generate SDK, use pre-installed deps
**Cron:** Create cron routes with dual auth, convert natural language to cron syntax

### What AI CANNOT DO

**Frontend:** Add dependencies, modify `vite.config.ts`, edit Shadcn UI components
**Backend:** Modify `wrangler.toml`, add dependencies, change middleware/SDK generation
**General:** Modify template structure, change auth mechanisms

## IMPORTANT REMINDERS

**DO:** Tailwind CSS, Shadcn/UI, Lucide icons, Zod validation, `sendSuccess()`/`ApiErrors.*`, register routes, generate SDK after changes, `@/` imports, flat structure, TypeScript strict, Sonner toasts, use 'using-tarobase' skill

**DON'T:** Edit Shadcn UI manually, create custom CSS, use `any`, expose secrets, skip auth validation, nest component folders, use React Hot Toast, hard-code URLs, skip SDK generation

## COMMON PITFALLS & ANTI-PATTERNS

**Frontend:** Don't edit Shadcn UI, don't modify `poof-styling.css`, don't hardcode URLs, don't forget `enabled` flag in `useTarobaseData`

**Backend:** Only use 5 status codes (200, 400, 401, 404, 500), keep handlers thin, register routes, add `@cron true` for cron, use `.js` extensions in imports

**Config:** Edit `wrangler.toml.template` not `wrangler.toml`, use pre-installed deps only

## TROUBLESHOOTING

### Common Issues

**Frontend not connecting to backend:**

- Check `VITE_PARTYSERVER_URL` in `.env`
- Verify backend is running on correct port
- Check browser console for CORS errors
- Ensure protocol matches (ws:// for http, wss:// for https)

**Authentication failing:**

- Verify `TAROBASE_APP_ID` matches in frontend and backend
- Check wallet is connected via Privy
- Inspect JWT token in request headers (Authorization header)
- Check X-Wallet-Address header matches token

**SDK types out of sync:**

- Run `cd partyserver && bun run build`
- Copy generated SDK to frontend if needed
- Restart TypeScript server in IDE
- Check that routes are registered in route registry

**WebSocket not connecting:**

- Verify protocol (ws:// for localhost, wss:// for production)
- Check PartyServer URL in config
- Ensure Durable Objects binding in wrangler.toml
- Check for CORS issues in browser console

**Build failing:**

- Frontend: Run `bun check-types` to see TypeScript errors
- Backend: Check that all imports use .js extensions
- Ensure Bun version matches .bun-version (1.1.42)
- Check for missing dependencies

**Cron routes not working:**

- Verify `@cron true` and `@admin true` in JSDoc
- Check `cronExpression` is set in ApiEndpointConfig
- Ensure dual authentication is implemented (API key OR admin)
- Verify CRON_API_KEY is set in Cloudflare Secret

### Getting Help

- Check `/docs` directory for specific guides
- Review example endpoints in `/partyserver/src/routes/`
- Inspect browser DevTools Network tab for API errors
- Check Cloudflare Workers logs for backend errors
- Review route registry in `/partyserver/src/routes/index.ts`

## SUMMARY

This template provides a complete foundation for building AI-powered dApps with:

- Modern React frontend with Tailwind and TypeScript
- Real-time backend with Hono and PartyServer
- Tarobase SDK for authentication and data persistence
- Solana blockchain integration
- Multiple AI/LLM providers
- External service integrations (payments, email, social)
- Type-safe API client generation
- Comprehensive documentation

Follow these guidelines to maintain consistency and leverage the full power of the template.
