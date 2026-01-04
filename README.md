# AI Section Generator (Blocksmith)

Generate custom Shopify Liquid theme sections using AI. Describe what you want in natural language, get production-ready Liquid code, and save directly to your theme.

**Built with**: React Router 7, TypeScript, Prisma, Google Gemini 2.5 Flash, MongoDB, Shopify Polaris

## What is this?

Blocksmith is a Shopify embedded app that enables merchants to create custom theme sections without coding:

1. **Describe** - Tell the AI what you want ("A testimonials section with 3 columns")
2. **Generate** - AI creates complete Liquid code with schema, styles, and markup
3. **Preview** - See how it looks with real shop context
4. **Save** - Publish directly to your theme with one click

## Core Features

- **AI-Powered Generation** - Google Gemini 2.5 Flash generates production-ready Liquid
- **Interactive Chat** - Refine sections via conversation with streaming updates
- **Live Preview** - See changes in real-time with Shopify context (products, collections, etc.)
- **Theme Integration** - Save sections directly to merchant Shopify themes
- **Dual-Action Save** - Save as Draft or Publish to Theme with toast notifications
- **Section Editing** - Edit and regenerate sections while preserving drafts
- **Billing System** - Hybrid pricing with base recurring + usage-based charges
- **Polaris Web Components** - Native Shopify admin UX with `<s-*>` elements

## Documentation

**For developers**, start with these:
- [Quick Start](#quick-start) - Setup and local development
- [Project Overview & PDR](docs/project-overview-pdr.md) - Product scope, requirements, roadmap
- [Codebase Summary](docs/codebase-summary.md) - Structure, components, services (235 app files, 28 routes, 107 components)
- [Code Standards](docs/code-standards.md) - Development guidelines and patterns
- [System Architecture](docs/system-architecture.md) - Technical design and data flow

## Project Status

**Current Version**: 1.0-beta - Phase 4 Complete + Phase 1 Auto-Save

**Implemented**:
- ✅ AI section generation (Google Gemini 2.5 Flash)
- ✅ Interactive chat with streaming via SSE
- ✅ Live preview with 18 context drops + filters/tags
- ✅ Theme selection and direct save to Shopify
- ✅ Dual-action save (Draft + Publish)
- ✅ Section editing with auto-save on AI generation
- ✅ Auto-save draft when AI applies version (Phase 1)
- ✅ Hybrid billing (recurring + usage-based)
- ✅ Multi-tenant shop isolation
- ✅ TypeScript strict mode, 30+ test suites
- ✅ 107 React components, 25 services, 11 database models

**Pending**: Production deployment, Shopify write_themes scope approval

**Future**: Template library, versioning, marketplace, batch generation

## Quick Start

### Prerequisites

- **Node.js**: >= 20.19 or >= 22.12
- **Shopify Partner Account**: [Create here](https://partners.shopify.com/signup)
- **Test Store**: Development store or Plus sandbox
- **Shopify CLI**: [Install here](https://shopify.dev/docs/apps/tools/cli)

### Local Development

```bash
npm install              # Install dependencies
npm run dev              # Start dev server with tunnel
npm run build            # Build for production
npm test                 # Run tests
npm run lint             # Check code quality
npm run deploy           # Deploy to Shopify
```

Local development uses Shopify CLI tunnel for HTTPS. Open the app URL shown in CLI output.

### Environment Variables

```bash
# Required for AI section generation
GEMINI_API_KEY=your_google_api_key

# Optional feature flags
FLAG_VERBOSE_LOGGING=true    # Enable debug logging
FLAG_USE_MOCK_AI=false       # Use mock AI in development
FLAG_USE_MOCK_THEMES=false   # Use mock themes in development

# Shopify (auto-configured by CLI)
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
DATABASE_URL=file:dev.sqlite  # Dev uses SQLite, production uses PostgreSQL/MySQL
```

See [Code Standards](docs/code-standards.md#environment-variables-standards) for full reference.

## Shopify Dev MCP

This template is configured with the Shopify Dev MCP. This instructs [Cursor](https://cursor.com/), [GitHub Copilot](https://github.com/features/copilot) and [Claude Code](https://claude.com/product/claude-code) and [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) to use the Shopify Dev MCP.  

For more information on the Shopify Dev MCP please read [the  documentation](https://shopify.dev/docs/apps/build/devmcp).

## Deployment

**Database**: SQLite for development, PostgreSQL/MySQL/MongoDB for production
**Hosting Options**: Google Cloud Run, Fly.io, Render, or custom Docker deployment
**Configuration**: See [Deployment Guide](docs/deployment-guide.md) for detailed setup instructions

Key requirements:
- `NODE_ENV=production` environment variable
- MongoDB or PostgreSQL database connection
- Shopify app credentials and scopes
- Google Gemini API key for production

## Troubleshooting

**Database tables don't exist**
- Run `npm run setup` or `npx prisma migrate dev`

**Embedded app navigation breaks**
- Use `Link` from react-router, not `<a>` tags
- Use `redirect` from `authenticate.admin`, not react-router

**Webhooks not updating**
- Define webhooks in `shopify.app.toml` instead of in code
- Run `npm run deploy` to sync

**Gemini API failing**
- Check `GEMINI_API_KEY` is set in `.env`
- App falls back to mock sections if key is missing

**See full troubleshooting**: [Code Standards](docs/code-standards.md) & [Deployment Guide](docs/deployment-guide.md)

## Resources

- [React Router docs](https://reactrouter.com/)
- [Shopify App Framework](https://shopify.dev/docs/api/shopify-app-react-router)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Polaris Components](https://shopify.dev/docs/api/app-home/polaris-web-components)
- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [Google Gemini API](https://ai.google.dev/)
