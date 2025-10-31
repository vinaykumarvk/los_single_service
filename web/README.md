# LOS Web Application

Enterprise-grade React UI for the Loan Origination System.

## Features

- **Modern Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **Routing**: React Router for multi-page navigation
- **Form Validation**: React Hook Form + Zod
- **Component Library**: Custom UI components built with Tailwind
- **API Integration**: Axios-based API client with environment-aware configuration

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The app will be available at http://localhost:5173

### Configuration

By default, the app connects directly to individual services. To use the API Gateway instead:

```bash
VITE_API_GATEWAY=http://localhost:3000 pnpm dev
```

You can also configure individual service endpoints:

```bash
VITE_API_APPLICATION=http://localhost:3001/api
VITE_API_KYC=http://localhost:3002/api
VITE_API_DOCUMENT=http://localhost:3003/api
VITE_API_UNDERWRITING=http://localhost:3006/api
VITE_API_SANCTION=http://localhost:3007/api
VITE_API_PAYMENTS=http://localhost:3008/api
VITE_API_DISBURSEMENT=http://localhost:3009/api
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Pages

- **Dashboard** (`/`): Overview and quick actions
- **Applications** (`/applications`): List of all applications
- **New Application** (`/applications/new`): Create a new loan application
- **Application Detail** (`/applications/:id`): View application details and status

## Architecture

- `/src/components`: Reusable UI components
- `/src/pages`: Page components
- `/src/lib`: Utilities and API client
- `/src/ui`: App-level UI setup
