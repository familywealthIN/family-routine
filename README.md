# Routine Notes

A family routine and goal management application with AI-powered features, built with Vue.js 2 and a GraphQL backend deployed on AWS Lambda.

## Tech Stack

* **Frontend**: Vue.js 2.6, Vuetify 1.x, Apollo Client
* **Backend**: Express + GraphQL, MongoDB (Mongoose)
* **Auth**: Google OAuth 2.0 with JWT
* **AI**: Gemini / OpenRouter integration
* **Deployment**: Netlify (frontend), AWS Lambda via Serverless Framework v4 (backend)
* **Component Design**: Atomic Design methodology (atoms, molecules, organisms, templates)
* **Testing**: Jest
* **Component Dev**: Storybook

## Prerequisites

* Node.js 18+
* Yarn
* MongoDB (local or Atlas)
* Google OAuth credentials
* AWS credentials (for serverless deployment)

## Project Setup

```bash
# Install dependencies
yarn install

# Set up encryption keys
yarn setup-encryption

# Copy and configure secrets
cp secrets.example.json secrets.json
# Edit secrets.json with your credentials
```

## Development

```bash
# Start frontend dev server
yarn serve

# Start backend GraphQL server (port 3000)
yarn serve:server

# Start MCP server
yarn mcp:server

# Run both frontend and backend in separate terminals
```

## Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:unit

# Run tests in watch mode
yarn test:watch
```

## Storybook

```bash
# Start Storybook dev server
yarn storybook

# Build static Storybook
yarn build-storybook
```

## Build & Deployment

### Frontend (Netlify)

```bash
# Production build
yarn build
```

Deployed automatically from the main branch via Netlify.

### Backend (AWS Lambda)

```bash
# Deploy to dev stage
serverless deploy

# Deploy to production
serverless deploy --stage prod
```

The Serverless Framework v4 uses built-in ESBuild to bundle the Lambda functions ( `handler.js` and `serverless-mcp.js` ).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/graphql` | GraphQL API |
| GET | `/mcp` | MCP server info |
| POST | `/mcp/call` | MCP tool calls |
| GET | `/mcp/resources` | MCP resources |
| GET | `/mcp/tools` | MCP available tools |
| POST | `/mcp/graphql` | MCP GraphQL proxy |

## Project Structure

```
src/
├── components/          # UI Components (Atomic Design)
│   ├── atoms/           # Smallest reusable components
│   ├── molecules/       # Combinations of atoms
│   ├── organisms/       # Complex functional components
│   └── templates/       # Page layouts
├── composables/         # Vue composition utilities
├── constants/           # App constants and configs
├── containers/          # Container components (data + presentation)
├── layouts/             # Desktop/Mobile layout wrappers
├── pages/               # Page-level components
├── plugins/             # Vue plugins
├── server/              # Backend GraphQL server
│   ├── schema/          # GraphQL type definitions
│   ├── resolvers/       # GraphQL resolvers
│   └── utils/           # Server utilities
├── utils/               # Frontend utility functions
└── views/               # Route view components
```

## Environment Variables

See `secrets.example.json` for required backend variables. Frontend environment variables are injected at build time via `scripts/create-env.js` .

## Linting

```bash
yarn lint
```
