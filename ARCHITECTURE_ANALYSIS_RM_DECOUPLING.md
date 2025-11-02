# Architecture Analysis: RM Frontend Decoupling for Multi-LOS Support

**Date**: 2024-11-01  
**Objective**: Analyze current architecture and propose changes to enable RM frontend to work with both our LOS and third-party LOS backends

---

## Executive Summary

The current architecture has the frontend tightly coupled to the backend through a single API configuration. To enable RM frontend to work with multiple LOS backends (ours or third-party), we need to:

1. **Decouple RM frontend** from Admin/Operations frontend
2. **Make API endpoints configurable** (environment-based or runtime config)
3. **Standardize API contracts** (document all endpoints RM frontend needs)
4. **Make authentication provider-agnostic** (JWT/OAuth that works with any LOS)
5. **Create independent build/deployment** for RM frontend

**Feasibility**: ✅ **Highly Feasible** with moderate architectural changes

---

## Current Architecture Analysis

### 1. Frontend Structure

**Current State**:
```
web/src/
├── pages/
│   ├── Dashboard.tsx (generic)
│   ├── Applications.tsx (generic)
│   ├── Login.tsx (Keycloak-based)
│   └── ... (mixed Admin/RM/Operations)
├── components/
│   └── ... (shared components)
└── lib/
    ├── api.ts (hardcoded API base URLs)
    └── auth.ts (Keycloak-specific)
```

**Issues Identified**:
- ❌ Single React app serving all personas (Admin, RM, Operations)
- ❌ API base URLs hardcoded in `api.ts`
- ❌ Authentication tightly coupled to Keycloak
- ❌ No separation between RM-specific and shared components
- ❌ Routes are not persona-specific

---

### 2. API Configuration

**Current Implementation** (`web/src/lib/api.ts`):
```typescript
// Current - Hardcoded API base URLs
const API_BASE = {
  gateway: 'http://localhost:3000',
  application: 'http://localhost:3001',
  kyc: 'http://localhost:3002',
  // ... hardcoded endpoints
};

export const api = {
  applications: getClient(`${API_BASE.gateway}/api/applications`),
  // ...
};
```

**Issues**:
- ❌ URLs are hardcoded
- ❌ No environment-based configuration
- ❌ Cannot switch backend dynamically
- ❌ Gateway dependency (won't work with third-party LOS directly)

---

### 3. Authentication

**Current Implementation** (`web/src/lib/auth.ts`):
- Uses Keycloak OIDC
- Hardcoded Keycloak configuration
- Not compatible with generic JWT/OAuth

**Issues**:
- ❌ Keycloak-specific implementation
- ❌ Cannot work with third-party LOS authentication
- ❌ No fallback to generic JWT

---

### 4. Routing

**Current Implementation** (`web/src/ui/App.tsx`):
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/applications" element={<Applications />} />
  // ... All personas use same routes
</Routes>
```

**Issues**:
- ❌ No persona-based routing
- ❌ Same routes for Admin, RM, and Operations
- ❌ Cannot deploy RM-only routes

---

## Required Architecture Changes

### Phase 1: Frontend Separation (High Priority)

#### 1.1: Split Frontend into Persona-Based Modules

**New Structure**:
```
web/
├── src/
│   ├── shared/                    # Shared across all personas
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── rm/                        # RM-specific
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   └── routes.tsx
│   ├── admin/                     # Admin-specific
│   │   ├── pages/
│   │   ├── components/
│   │   └── routes.tsx
│   ├── operations/                # Operations-specific
│   │   ├── pages/
│   │   ├── components/
│   │   └── routes.tsx
│   ├── App.tsx                    # Main app router (persona selector)
│   └── main.tsx
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Can build RM-only bundle
- ✅ Independent deployment possible

---

#### 1.2: Create Configurable API Client

**New Implementation** (`web/src/shared/lib/api-client.ts`):
```typescript
// API Configuration (runtime/configurable)
interface APIConfig {
  baseURL: string;              // e.g., 'https://api.los.example.com' or 'https://third-party-los.com/api'
  apiVersion?: string;          // e.g., 'v1'
  authProvider?: 'keycloak' | 'jwt' | 'oauth2' | 'custom';
  headers?: Record<string, string>;
}

class APIClient {
  private config: APIConfig;
  
  constructor(config: APIConfig) {
    this.config = config;
  }
  
  // Generic HTTP methods
  async get(endpoint: string, options?: RequestInit) {
    return fetch(`${this.config.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...this.config.headers,
        ...options?.headers,
      },
    });
  }
  
  // ... post, put, delete methods
  
  private getAuthHeaders(): Record<string, string> {
    // Get token from auth provider (keycloak, jwt, etc.)
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  private getAuthToken(): string | null {
    // Works with any auth provider
    // 1. Try Keycloak token (if configured)
    // 2. Try JWT from localStorage (if configured)
    // 3. Try custom auth (if configured)
    return null;
  }
}
```

**Usage**:
```typescript
// RM-specific API client
const rmAPI = new APIClient({
  baseURL: import.meta.env.VITE_RM_API_BASE_URL || 'http://localhost:3000',
  authProvider: import.meta.env.VITE_AUTH_PROVIDER || 'jwt',
});

// RM API methods
export const rmAPI = {
  applications: {
    list: () => rmAPI.get('/api/applications'),
    create: (data) => rmAPI.post('/api/applications', data),
    // ... RM-specific endpoints only
  },
};
```

---

#### 1.3: Environment-Based Configuration

**New Files**:
```
web/
├── .env.example
├── .env.local
├── .env.production
└── src/
    └── config/
        ├── api.ts              # API configuration
        ├── auth.ts             # Auth configuration
        └── persona.ts          # Persona-specific config
```

**.env.example**:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1

# Authentication
VITE_AUTH_PROVIDER=keycloak  # or 'jwt', 'oauth2', 'custom'
VITE_AUTH_ENABLED=true

# Keycloak (if using Keycloak)
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=los
VITE_KEYCLOAK_CLIENT_ID=los-frontend

# JWT (if using JWT)
VITE_JWT_STORAGE_KEY=los_token

# Persona
VITE_PERSONA=rm  # or 'admin', 'operations', 'all'

# Third-party LOS Integration
VITE_THIRD_PARTY_LOS_API_URL=
VITE_THIRD_PARTY_LOS_API_KEY=
```

**Runtime Configuration** (for third-party LOS):
```typescript
// web/src/config/api.ts
export const apiConfig = {
  baseURL: 
    window.__LOS_CONFIG__?.apiBaseURL ||           // Runtime config (from HTML)
    import.meta.env.VITE_API_BASE_URL ||           // Build-time env
    'http://localhost:3000',                       // Default
    
  authProvider:
    window.__LOS_CONFIG__?.authProvider ||
    import.meta.env.VITE_AUTH_PROVIDER ||
    'jwt',
    
  endpoints: {
    // Standard LOS API endpoints (works with any LOS)
    applications: '/api/applications',
    applicants: '/api/applicants',
    documents: '/api/documents',
    integrations: {
      pan: '/api/integrations/pan/validate',
      aadhaar: '/api/integrations/ekyc/start',
      bank: '/api/integrations/bank/verify',
      cibil: '/api/integrations/bureau/pull',
    },
  },
};
```

---

### Phase 2: Authentication Abstraction (High Priority)

#### 2.1: Create Auth Provider Interface

**New Implementation** (`web/src/shared/lib/auth/providers/base.ts`):
```typescript
// Abstract auth provider interface
export interface AuthProvider {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  getUser(): Promise<User | null>;
}

// Keycloak provider
export class KeycloakAuthProvider implements AuthProvider {
  // ... Keycloak implementation
}

// JWT provider (works with any LOS)
export class JWTAuthProvider implements AuthProvider {
  private apiBaseURL: string;
  
  async login(credentials: { username: string; password: string }) {
    const response = await fetch(`${this.apiBaseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const { accessToken, refreshToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return { token: accessToken };
  }
  
  async getToken() {
    return localStorage.getItem('accessToken');
  }
  
  // ... other methods
}

// Factory
export function createAuthProvider(config: AuthConfig): AuthProvider {
  switch (config.provider) {
    case 'keycloak':
      return new KeycloakAuthProvider(config.keycloak);
    case 'jwt':
      return new JWTAuthProvider(config.jwt);
    case 'oauth2':
      return new OAuth2AuthProvider(config.oauth2);
    default:
      return new JWTAuthProvider(config.jwt);
  }
}
```

---

#### 2.2: Update Auth Hook

**New Implementation** (`web/src/shared/hooks/useAuth.ts`):
```typescript
import { createAuthProvider, AuthProvider } from '../lib/auth/providers';

const authProvider = createAuthProvider({
  provider: import.meta.env.VITE_AUTH_PROVIDER || 'jwt',
  // ... config
});

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use authProvider (works with any provider)
  const login = async (credentials) => {
    const result = await authProvider.login(credentials);
    setUser(await authProvider.getUser());
  };
  
  return { user, login, logout, isAuthenticated };
}
```

---

### Phase 3: API Contract Standardization (High Priority)

#### 3.1: Define RM API Contract

**New File** (`RM_API_CONTRACT.md`):
```markdown
# RM Frontend - Required API Contract

The RM frontend requires the following API endpoints to function.
Any LOS backend (ours or third-party) must implement these endpoints.

## Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

## Applications
- `GET /api/applications` - List applications (with filters: assignedTo, status, etc.)
- `POST /api/applications` - Create new application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application (if Draft)
- `POST /api/applications/:id/submit` - Submit application
- `GET /api/applications/:id/completeness` - Check completeness
- `GET /api/applications/:id/timeline` - Get status timeline
- `PATCH /api/applications/:id/assign` - Assign to RM

## Applicants
- `PUT /api/applications/:id/applicant` - Update applicant info
- `GET /api/applicants/:id` - Get applicant details

## Documents
- `POST /api/applications/:id/documents` - Upload document
- `GET /api/applications/:id/documents` - List documents
- `GET /api/applications/:id/documents/checklist` - Get document checklist
- `DELETE /api/documents/:id` - Delete document

## Integrations
- `POST /api/integrations/pan/validate` - Validate PAN
- `POST /api/integrations/ekyc/start` - Start Aadhaar eKYC
- `POST /api/integrations/ekyc/:sessionId/submit-otp` - Submit OTP
- `POST /api/integrations/bank/verify-name` - Verify bank account name
- `POST /api/integrations/bank/penny-drop` - Initiate penny drop
- `POST /api/integrations/bureau/pull` - Pull CIBIL report
- `GET /api/integrations/bureau/:requestId/report` - Get CIBIL report

## Property Details (if applicable)
- `POST /api/applications/:id/property` - Create/update property details
- `GET /api/applications/:id/property` - Get property details

## Dashboard
- `GET /api/applications/rm/dashboard` - RM dashboard stats
```

---

#### 3.2: Create API Adapter Pattern

**For Third-Party LOS Integration**:
```typescript
// web/src/rm/lib/api-adapter.ts
// Adapts third-party LOS APIs to our contract

export class ThirdPartyLOSAdapter {
  constructor(private config: ThirdPartyLOSConfig) {}
  
  // Map third-party endpoints to our contract
  async listApplications(filters: ApplicationFilters) {
    // Call third-party API: GET /v2/loans?status=...
    // Transform response to match our Application type
    const response = await this.client.get('/v2/loans', { params: filters });
    return this.transformApplications(response.data);
  }
  
  private transformApplications(thirdPartyApps: any[]): Application[] {
    // Transform third-party format to our format
    return thirdPartyApps.map(app => ({
      application_id: app.loanId,
      applicant_id: app.customerId,
      status: this.mapStatus(app.status),
      // ... other mappings
    }));
  }
  
  private mapStatus(thirdPartyStatus: string): string {
    // Map third-party statuses to our statuses
    const statusMap = {
      'NEW': 'Draft',
      'SUBMITTED': 'Submitted',
      // ...
    };
    return statusMap[thirdPartyStatus] || thirdPartyStatus;
  }
}
```

---

### Phase 4: Build & Deployment (Medium Priority)

#### 4.1: Separate Build Configurations

**Vite Config** (`web/vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build configurations for different personas
const personaBuilds = {
  rm: {
    entry: 'src/rm/main.tsx',
    outDir: 'dist/rm',
    base: '/rm/',
  },
  admin: {
    entry: 'src/admin/main.tsx',
    outDir: 'dist/admin',
    base: '/admin/',
  },
  operations: {
    entry: 'src/operations/main.tsx',
    outDir: 'dist/operations',
    base: '/operations/',
  },
  all: {
    entry: 'src/main.tsx',
    outDir: 'dist',
    base: '/',
  },
};

export default defineConfig(({ mode }) => {
  const persona = process.env.VITE_PERSONA || 'all';
  const buildConfig = personaBuilds[persona] || personaBuilds.all;
  
  return {
    plugins: [react()],
    build: {
      outDir: buildConfig.outDir,
      rollupOptions: {
        input: buildConfig.entry,
      },
    },
    base: buildConfig.base,
  };
});
```

**Build Scripts** (`web/package.json`):
```json
{
  "scripts": {
    "build": "vite build",
    "build:rm": "VITE_PERSONA=rm vite build",
    "build:admin": "VITE_PERSONA=admin vite build",
    "build:operations": "VITE_PERSONA=operations vite build",
    "build:all": "vite build"
  }
}
```

---

#### 4.2: Deployment Scenarios

**Scenario 1: Full Stack Deployment**
```bash
# Build all personas
npm run build:all

# Deploy backend + frontend together
docker-compose up
```

**Scenario 2: RM-Only Frontend (Our Backend)**
```bash
# Build RM frontend only
npm run build:rm

# Deploy RM frontend (connects to our backend)
# Set VITE_API_BASE_URL=https://our-los-backend.com
```

**Scenario 3: RM-Only Frontend (Third-Party LOS)**
```bash
# Build RM frontend only
npm run build:rm

# Deploy RM frontend with runtime config
# In HTML:
<script>
  window.__LOS_CONFIG__ = {
    apiBaseURL: 'https://third-party-los.com/api',
    authProvider: 'jwt',
    endpoints: {
      // Map third-party endpoints
    }
  };
</script>
```

---

### Phase 5: Routing Separation (Medium Priority)

#### 5.1: Persona-Based Routing

**New Implementation** (`web/src/rm/routes.tsx`):
```typescript
import { Routes, Route } from 'react-router-dom';
import RMDashboard from './pages/Dashboard';
import RMApplicationsList from './pages/ApplicationsList';
import RMPersonalInformation from './pages/PersonalInformation';
// ... RM-specific routes only

export function RMRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RMDashboard />} />
      <Route path="/applications" element={<RMApplicationsList />} />
      <Route path="/applications/:id/personal" element={<RMPersonalInformation />} />
      {/* ... RM routes only */}
    </Routes>
  );
}
```

**Main App Router** (`web/src/App.tsx`):
```typescript
import { useAuth } from './shared/hooks/useAuth';
import { RMRoutes } from './rm/routes';
import { AdminRoutes } from './admin/routes';
import { OperationsRoutes } from './operations/routes';

export default function App() {
  const { user } = useAuth();
  const persona = user?.roles?.includes('rm') ? 'rm' : 
                  user?.roles?.includes('admin') ? 'admin' : 
                  'operations';
  
  // Or based on VITE_PERSONA env var
  const persona = import.meta.env.VITE_PERSONA || 'all';
  
  if (persona === 'rm') {
    return <RMRoutes />;
  } else if (persona === 'admin') {
    return <AdminRoutes />;
  } else if (persona === 'operations') {
    return <OperationsRoutes />;
  } else {
    // Show all personas (full app)
    return (
      <Routes>
        <Route path="/rm/*" element={<RMRoutes />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/operations/*" element={<OperationsRoutes />} />
      </Routes>
    );
  }
}
```

---

## Implementation Roadmap

### Step 1: Create Shared Foundation (Week 1)
1. ✅ Create `shared/` directory structure
2. ✅ Create configurable API client
3. ✅ Create auth provider abstraction
4. ✅ Move shared components to `shared/`

### Step 2: Extract RM Module (Week 1-2)
1. ✅ Create `rm/` directory
2. ✅ Move RM-specific pages to `rm/pages/`
3. ✅ Create RM-specific API client
4. ✅ Create RM routes

### Step 3: Configuration System (Week 2)
1. ✅ Environment variable configuration
2. ✅ Runtime configuration support
3. ✅ API contract documentation

### Step 4: Build & Deployment (Week 2-3)
1. ✅ Separate build configurations
2. ✅ Create deployment scripts
3. ✅ Test with mock third-party LOS

### Step 5: Admin & Operations Separation (Week 3-4)
1. ✅ Extract Admin module
2. ✅ Extract Operations module
3. ✅ Update main router

---

## Migration Strategy

### Current → New Architecture

**Phase A: Preparation** (No breaking changes)
1. Create new directory structure alongside existing
2. Implement new API client (parallel to old one)
3. Implement new auth provider (parallel to old one)

**Phase B: Migration** (Gradual)
1. Move RM pages to `rm/` one by one
2. Update imports gradually
3. Test each migration

**Phase C: Cleanup** (After migration complete)
1. Remove old code
2. Update documentation
3. Update deployment processes

---

## Configuration Examples

### Example 1: RM Frontend with Our Backend
```bash
# .env
VITE_API_BASE_URL=https://our-los-backend.com
VITE_AUTH_PROVIDER=jwt
VITE_PERSONA=rm
```

### Example 2: RM Frontend with Third-Party LOS
```bash
# .env
VITE_API_BASE_URL=https://third-party-los.com/api
VITE_AUTH_PROVIDER=jwt
VITE_PERSONA=rm

# Runtime config (injected via HTML)
<script>
  window.__LOS_CONFIG__ = {
    apiBaseURL: 'https://bank-existing-los.com/api',
    authProvider: 'oauth2',
    authConfig: {
      tokenEndpoint: '/oauth/token',
      clientId: 'rm-frontend',
    },
    endpoints: {
      applications: '/v2/loan-applications',  // Custom mapping
      pan: '/kyc/pan/verify',                  // Custom mapping
    },
  };
</script>
```

---

## Benefits of This Architecture

1. ✅ **Independent Deployment**: RM frontend can be deployed separately
2. ✅ **Third-Party Integration**: Works with any LOS backend via API
3. ✅ **Maintainability**: Clear separation of personas
4. ✅ **Scalability**: Can scale RM frontend independently
5. ✅ **Flexibility**: Easy to add new personas or LOS backends
6. ✅ **Backward Compatible**: Can still deploy full stack

---

## Risks & Mitigation

### Risk 1: API Contract Mismatch
**Mitigation**: 
- Document API contract clearly
- Create adapter layer for third-party LOS
- Use API versioning

### Risk 2: Authentication Compatibility
**Mitigation**:
- Support multiple auth providers (JWT, OAuth2, Keycloak)
- Abstract auth logic behind interface
- Test with multiple auth systems

### Risk 3: Build Complexity
**Mitigation**:
- Use Vite's multi-entry build
- Create clear build scripts
- Document deployment process

---

## Recommendations

1. **Start with RM Module Extraction** - Highest priority
2. **Implement Configurable API Client** - Enables third-party integration
3. **Create API Contract Documentation** - Required for third-party integration
4. **Support Multiple Auth Providers** - Essential for compatibility
5. **Build Adapter Pattern** - For third-party LOS integration

---

## Next Steps

1. ✅ Review this architecture analysis
2. ✅ Approve architecture changes
3. ✅ Start with Phase 1 (Frontend Separation)
4. ✅ Create API contract documentation
5. ✅ Implement configurable API client

---

**Status**: Ready for Review and Approval

