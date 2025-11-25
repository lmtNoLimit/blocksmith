# Phase 03: Feature Flag Configuration System

**Phase ID**: phase-03-feature-flag-system
**Parent Plan**: [plan.md](plan.md)
**Priority**: Medium
**Status**: Pending

## Context Links

- **Parent Plan**: [251124-2325 App Structure & UI Mock Data](plan.md)
- **Previous Phase**: [Phase 02: Mock Service Layer](phase-02-mock-service-layer.md)
- **Next Phase**: [Phase 04: UI Component Extraction](phase-04-ui-components.md)
- **Research**: [Architecture Patterns](research/researcher-02-architecture-patterns.md)

## Overview

**Date**: 2025-11-24
**Description**: Enhance service configuration with runtime feature flags for gradual rollout and A/B testing during mock-to-real transition.

**Implementation Status**: Not Started (0%)
**Review Status**: Not Reviewed

## Key Insights from Research

From researcher-01-ui-mock-patterns.md:
- Feature flags toggle APIs at single config point
- 3-phase transition strategy: mock → conditional → production
- Environment checks should be centralized

From researcher-02-architecture-patterns.md:
- Service configuration should be injectable
- Runtime config enables testing without restarts
- Logging essential for debugging mode switches

## Requirements

### Functional Requirements
1. Runtime feature flag system for service modes
2. Per-feature granular control (AI, themes separately)
3. Admin UI to view/toggle flags (future)
4. Flag state logging for debugging
5. Default safe values (mock mode)

### Non-Functional Requirements
- Zero performance impact when flags disabled
- Type-safe flag definitions
- Clear documentation for each flag
- Graceful degradation on flag errors

## Architecture Changes

### New Files
```
app/
├── services/
│   ├── flags/
│   │   ├── feature-flags.ts         # Flag definitions & state
│   │   ├── flag-provider.tsx        # React context (optional)
│   │   └── flag-utils.ts            # Helper functions
│   └── config.server.ts (enhance)   # Add flag integration
```

### Modified Files
- `app/services/config.server.ts` - Add flag system
- `app/services/adapters/*.ts` - Use flags for routing
- `app/routes/app.tsx` - Add flag context provider (optional)

## Related Code Files

### Files to Modify
1. `/app/services/config.server.ts` - Configuration
2. `/app/services/adapters/theme-adapter.ts` - Flag-based routing
3. `/app/services/adapters/ai-adapter.ts` - Flag-based routing

### New Files
- Feature flag definitions
- Flag provider/context
- Utility functions

## Implementation Steps

### Step 1: Create Feature Flag Definitions (45 min)
**File**: `app/services/flags/feature-flags.ts`

```typescript
/**
 * Feature Flag System
 * Controls which features are enabled/disabled at runtime
 */

export type FlagValue = boolean | string | number;

export interface FeatureFlag {
  key: string;
  description: string;
  defaultValue: FlagValue;
  currentValue?: FlagValue;
}

export enum FeatureFlagKey {
  // Service Mode Flags
  USE_MOCK_THEMES = 'use_mock_themes',
  USE_MOCK_AI = 'use_mock_ai',

  // Feature Flags
  ENABLE_SECTION_HISTORY = 'enable_section_history',
  ENABLE_TEMPLATE_LIBRARY = 'enable_template_library',
  ENABLE_AI_SETTINGS = 'enable_ai_settings',

  // Performance Flags
  SIMULATE_API_LATENCY = 'simulate_api_latency',
  CACHE_THEME_LIST = 'cache_theme_list',

  // Debug Flags
  VERBOSE_LOGGING = 'verbose_logging',
  SHOW_SERVICE_MODE = 'show_service_mode',
}

export const featureFlags: Record<FeatureFlagKey, FeatureFlag> = {
  [FeatureFlagKey.USE_MOCK_THEMES]: {
    key: FeatureFlagKey.USE_MOCK_THEMES,
    description: 'Use mock theme service instead of Shopify API',
    defaultValue: true // Default to mock until write_themes approved
  },
  [FeatureFlagKey.USE_MOCK_AI]: {
    key: FeatureFlagKey.USE_MOCK_AI,
    description: 'Use mock AI service instead of Google Gemini',
    defaultValue: false // Use real Gemini if API key available
  },
  [FeatureFlagKey.ENABLE_SECTION_HISTORY]: {
    key: FeatureFlagKey.ENABLE_SECTION_HISTORY,
    description: 'Enable section generation history feature',
    defaultValue: false // Not implemented yet
  },
  [FeatureFlagKey.ENABLE_TEMPLATE_LIBRARY]: {
    key: FeatureFlagKey.ENABLE_TEMPLATE_LIBRARY,
    description: 'Enable section template library',
    defaultValue: false // Not implemented yet
  },
  [FeatureFlagKey.ENABLE_AI_SETTINGS]: {
    key: FeatureFlagKey.ENABLE_AI_SETTINGS,
    description: 'Enable AI configuration settings (model, temperature)',
    defaultValue: false // Not implemented yet
  },
  [FeatureFlagKey.SIMULATE_API_LATENCY]: {
    key: FeatureFlagKey.SIMULATE_API_LATENCY,
    description: 'Simulate API latency in mock services',
    defaultValue: false
  },
  [FeatureFlagKey.CACHE_THEME_LIST]: {
    key: FeatureFlagKey.CACHE_THEME_LIST,
    description: 'Cache theme list to reduce API calls',
    defaultValue: false // Future performance enhancement
  },
  [FeatureFlagKey.VERBOSE_LOGGING]: {
    key: FeatureFlagKey.VERBOSE_LOGGING,
    description: 'Enable detailed service logging',
    defaultValue: process.env.NODE_ENV !== 'production'
  },
  [FeatureFlagKey.SHOW_SERVICE_MODE]: {
    key: FeatureFlagKey.SHOW_SERVICE_MODE,
    description: 'Show service mode indicator in UI',
    defaultValue: process.env.NODE_ENV !== 'production'
  }
};
```

### Step 2: Create Flag State Manager (60 min)
**File**: `app/services/flags/flag-utils.ts`

```typescript
import { featureFlags, FeatureFlagKey, type FlagValue } from './feature-flags';

class FeatureFlagManager {
  private overrides: Map<string, FlagValue> = new Map();

  /**
   * Get flag value with environment variable override
   */
  getFlag(key: FeatureFlagKey): FlagValue {
    // Check for override first
    if (this.overrides.has(key)) {
      return this.overrides.get(key)!;
    }

    // Check environment variable
    const envKey = `FLAG_${key.toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      return this.parseEnvValue(envValue);
    }

    // Return default
    return featureFlags[key].defaultValue;
  }

  /**
   * Check if flag is enabled (boolean flags only)
   */
  isEnabled(key: FeatureFlagKey): boolean {
    const value = this.getFlag(key);
    return value === true || value === 'true';
  }

  /**
   * Override flag value at runtime (for testing)
   */
  setOverride(key: FeatureFlagKey, value: FlagValue): void {
    this.overrides.set(key, value);
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides.clear();
  }

  /**
   * Get all flags with current values
   */
  getAllFlags(): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    Object.keys(featureFlags).forEach((key) => {
      result[key] = this.getFlag(key as FeatureFlagKey);
    });
    return result;
  }

  /**
   * Log all active flags
   */
  logFlags(): void {
    if (!this.isEnabled(FeatureFlagKey.VERBOSE_LOGGING)) {
      return;
    }

    console.log('=== Feature Flags ===');
    Object.entries(featureFlags).forEach(([key, flag]) => {
      const value = this.getFlag(key as FeatureFlagKey);
      const isDefault = value === flag.defaultValue;
      console.log(`  ${flag.key}: ${value} ${isDefault ? '(default)' : '(overridden)'}`);
    });
    console.log('====================');
  }

  private parseEnvValue(value: string): FlagValue {
    // Parse boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse number
    const num = Number(value);
    if (!isNaN(num)) return num;

    // Return as string
    return value;
  }
}

export const flagManager = new FeatureFlagManager();

// Convenience functions
export const isEnabled = (key: FeatureFlagKey) => flagManager.isEnabled(key);
export const getFlag = (key: FeatureFlagKey) => flagManager.getFlag(key);
```

### Step 3: Update Service Configuration (30 min)
**File**: `app/services/config.server.ts` (enhance)

```typescript
import { flagManager, FeatureFlagKey } from './flags/flag-utils';

export type ServiceMode = 'mock' | 'real';

export interface ServiceConfig {
  themeMode: ServiceMode;
  aiMode: ServiceMode;
  enableLogging: boolean;
  simulateLatency: boolean;
  showModeInUI: boolean;
}

function getThemeMode(): ServiceMode {
  // Flag takes precedence
  if (flagManager.isEnabled(FeatureFlagKey.USE_MOCK_THEMES)) {
    return 'mock';
  }

  // Fallback to SERVICE_MODE env var
  const mode = process.env.SERVICE_MODE?.toLowerCase();
  if (mode === 'real') {
    return 'real';
  }

  return 'mock'; // Safe default
}

function getAIMode(): ServiceMode {
  // Flag takes precedence
  if (flagManager.isEnabled(FeatureFlagKey.USE_MOCK_AI)) {
    return 'mock';
  }

  // Check if Gemini API key exists
  if (process.env.GEMINI_API_KEY) {
    return 'real';
  }

  return 'mock';
}

export const serviceConfig: ServiceConfig = {
  themeMode: getThemeMode(),
  aiMode: getAIMode(),
  enableLogging: flagManager.isEnabled(FeatureFlagKey.VERBOSE_LOGGING),
  simulateLatency: flagManager.isEnabled(FeatureFlagKey.SIMULATE_API_LATENCY),
  showModeInUI: flagManager.isEnabled(FeatureFlagKey.SHOW_SERVICE_MODE)
};

export function isUsingMockThemes(): boolean {
  return serviceConfig.themeMode === 'mock';
}

export function isUsingMockAI(): boolean {
  return serviceConfig.aiMode === 'mock';
}

export function logServiceConfig(): void {
  if (!serviceConfig.enableLogging) return;

  console.log('[SERVICE CONFIG] Theme Mode:', serviceConfig.themeMode);
  console.log('[SERVICE CONFIG] AI Mode:', serviceConfig.aiMode);
  console.log('[SERVICE CONFIG] Simulate Latency:', serviceConfig.simulateLatency);

  flagManager.logFlags();
}
```

### Step 4: Update Adapters with Flags (30 min)
**File**: `app/services/adapters/theme-adapter.ts` (enhance)

```typescript
import type { ThemeServiceInterface } from '../../types/service.types';
import { serviceConfig, logServiceConfig } from '../config.server';
import { themeService } from '../theme.server';
import { mockThemeService } from '../mocks/mock-theme.server';

class ThemeAdapter implements ThemeServiceInterface {
  private service: ThemeServiceInterface;

  constructor() {
    logServiceConfig();
    this.service = serviceConfig.themeMode === 'mock'
      ? mockThemeService
      : themeService;
  }

  async getThemes(request: Request) {
    return this.service.getThemes(request);
  }

  async createSection(
    request: Request,
    themeId: string,
    fileName: string,
    content: string
  ) {
    return this.service.createSection(request, themeId, fileName, content);
  }

  // Utility method to check current mode
  getCurrentMode(): 'mock' | 'real' {
    return serviceConfig.themeMode;
  }
}

export const themeAdapter = new ThemeAdapter();
```

**File**: `app/services/adapters/ai-adapter.ts` (enhance)

```typescript
import type { AIServiceInterface } from '../../types/service.types';
import { serviceConfig, logServiceConfig } from '../config.server';
import { aiService } from '../ai.server';
import { mockAIService } from '../mocks/mock-ai.server';

class AIAdapter implements AIServiceInterface {
  private service: AIServiceInterface;

  constructor() {
    logServiceConfig();
    this.service = serviceConfig.aiMode === 'mock'
      ? mockAIService
      : aiService;
  }

  async generateSection(prompt: string) {
    return this.service.generateSection(prompt);
  }

  getMockSection(prompt: string) {
    return this.service.getMockSection(prompt);
  }

  getCurrentMode(): 'mock' | 'real' {
    return serviceConfig.aiMode;
  }
}

export const aiAdapter = new AIAdapter();
```

### Step 5: Add Service Mode Indicator (Optional, 30 min)
**File**: `app/components/ServiceModeIndicator.tsx` (new)

```typescript
import { serviceConfig } from '../services/config.server';

export interface ServiceModeIndicatorProps {
  themeMode: 'mock' | 'real';
  aiMode: 'mock' | 'real';
}

export function ServiceModeIndicator({ themeMode, aiMode }: ServiceModeIndicatorProps) {
  if (!serviceConfig.showModeInUI) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#f0f0f0',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      border: '1px solid #ccc'
    }}>
      <div><strong>Service Mode</strong></div>
      <div>Theme: <span style={{ color: themeMode === 'mock' ? 'orange' : 'green' }}>
        {themeMode.toUpperCase()}
      </span></div>
      <div>AI: <span style={{ color: aiMode === 'mock' ? 'orange' : 'green' }}>
        {aiMode.toUpperCase()}
      </span></div>
    </div>
  );
}
```

**Update**: `app/routes/app.generate.tsx`

```typescript
import { ServiceModeIndicator } from '../components/ServiceModeIndicator';
import { serviceConfig } from '../services/config.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const themes = await themeAdapter.getThemes(request);
  return {
    themes,
    serviceMode: {
      themeMode: serviceConfig.themeMode,
      aiMode: serviceConfig.aiMode
    }
  };
}

export default function Generate() {
  const { themes, serviceMode } = useLoaderData<typeof loader>();

  return (
    <>
      <s-page title="Generate Section">
        {/* ... existing UI ... */}
      </s-page>

      <ServiceModeIndicator
        themeMode={serviceMode.themeMode}
        aiMode={serviceMode.aiMode}
      />
    </>
  );
}
```

### Step 6: Environment Variable Documentation (15 min)
**Update**: `.env.example`

```bash
# Service Mode Configuration
# Legacy: Use SERVICE_MODE for both services
SERVICE_MODE=mock

# Feature Flags (override defaults)
# Format: FLAG_<FLAG_NAME>=true|false|value

# Service Mode Flags
FLAG_USE_MOCK_THEMES=true     # Use mock theme service
FLAG_USE_MOCK_AI=false         # Use mock AI (false = use Gemini if key available)

# Feature Flags
FLAG_ENABLE_SECTION_HISTORY=false
FLAG_ENABLE_TEMPLATE_LIBRARY=false
FLAG_ENABLE_AI_SETTINGS=false

# Performance Flags
FLAG_SIMULATE_API_LATENCY=false  # Add delay to mock responses
FLAG_CACHE_THEME_LIST=false

# Debug Flags
FLAG_VERBOSE_LOGGING=true        # Detailed console logging
FLAG_SHOW_SERVICE_MODE=true      # Show mode indicator in UI

# Shopify Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Google Gemini API
GEMINI_API_KEY=your_gemini_key
```

### Step 7: Testing (45 min)

**Create test file**: `app/services/flags/__tests__/flag-utils.test.ts`

```typescript
import { flagManager, FeatureFlagKey } from '../flag-utils';

describe('FeatureFlagManager', () => {
  beforeEach(() => {
    flagManager.clearOverrides();
  });

  it('returns default values', () => {
    const value = flagManager.getFlag(FeatureFlagKey.USE_MOCK_THEMES);
    expect(value).toBe(true); // Default is true
  });

  it('respects runtime overrides', () => {
    flagManager.setOverride(FeatureFlagKey.USE_MOCK_THEMES, false);
    expect(flagManager.isEnabled(FeatureFlagKey.USE_MOCK_THEMES)).toBe(false);
  });

  it('clears overrides', () => {
    flagManager.setOverride(FeatureFlagKey.USE_MOCK_THEMES, false);
    flagManager.clearOverrides();
    expect(flagManager.isEnabled(FeatureFlagKey.USE_MOCK_THEMES)).toBe(true);
  });

  it('gets all flags', () => {
    const flags = flagManager.getAllFlags();
    expect(Object.keys(flags).length).toBeGreaterThan(0);
  });
});
```

Manual testing scenarios:
```bash
# Scenario 1: All mock
export FLAG_USE_MOCK_THEMES=true
export FLAG_USE_MOCK_AI=true
npm run dev
# Expected: Both services in mock mode

# Scenario 2: Real AI, mock themes
export FLAG_USE_MOCK_THEMES=true
export FLAG_USE_MOCK_AI=false
export GEMINI_API_KEY=your_key
npm run dev
# Expected: AI uses Gemini, themes use mock

# Scenario 3: All real (when approved)
export FLAG_USE_MOCK_THEMES=false
export FLAG_USE_MOCK_AI=false
export GEMINI_API_KEY=your_key
npm run dev
# Expected: Both services use real APIs
```

## Todo List

- [ ] Create app/services/flags/feature-flags.ts
- [ ] Create app/services/flags/flag-utils.ts
- [ ] Update app/services/config.server.ts with flag integration
- [ ] Update app/services/adapters/theme-adapter.ts
- [ ] Update app/services/adapters/ai-adapter.ts
- [ ] Create app/components/ServiceModeIndicator.tsx
- [ ] Update app/routes/app.generate.tsx with mode indicator
- [ ] Update .env.example with flag documentation
- [ ] Create flag-utils tests
- [ ] Test flag override functionality
- [ ] Test environment variable parsing
- [ ] Manual test all flag combinations
- [ ] Verify mode indicator displays correctly
- [ ] Commit: "feat: add feature flag system for service mode control"

## Success Criteria

- [ ] Flags control service routing independently
- [ ] Environment variables override defaults
- [ ] Runtime overrides work for testing
- [ ] Mode indicator visible in dev mode
- [ ] Logging clearly shows active flags
- [ ] No performance impact in production
- [ ] Documentation clear for all flags
- [ ] Tests verify flag behavior

## Risk Assessment

**Low Risk**: Flag complexity grows unmaintainable
**Mitigation**: Keep flags minimal, document clearly, remove obsolete flags

**Low Risk**: Flag state inconsistency
**Mitigation**: Singleton manager, immutable during request

## Security Considerations

- Do not expose sensitive flag values to client
- Validate flag values from environment
- Ensure production defaults are secure

## Next Steps

After completion, proceed to:
- [Phase 04: UI Component Extraction](phase-04-ui-components.md)

## Notes

- Keep flag count minimal (YAGNI)
- Remove flags once features stable
- Consider LaunchDarkly/Split.io for production scale
- Flag system enables gradual rollout strategy
