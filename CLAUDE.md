# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `yarn dev` - Starts the Next.js development server on http://localhost:3000
- **Build**: `yarn build` - Creates production build
- **Start**: `yarn start` - Starts production server
- **Lint**: `yarn lint` - Runs Next.js linting

## Architecture Overview

This is a **Next.js 15** application using the **App Router** architecture with the following key structure:

### Core Technologies
- **Next.js 15** with React 19
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling (includes dark mode support)
- **MySQL2** for database connectivity
- **Headless UI** for accessible components

### Database Architecture
- Uses MySQL database with connection pooling via `src/lib/db.ts`
- Database credentials are hardcoded (host: 190.188.150.107, port: 3307, database: 'lt')
- Main entities: viajes (travels), productos (products), terceros (third parties), transportes (transports)

### Application Structure

**Pages & Routes**:
- `/` - Home page (`src/app/page.tsx`)
- `/viajes` - Travel management page with CRUD operations
- `/productos` - Products page
- `/terceros` - Third parties page  
- `/transportes` - Transport page

**API Routes** (all in `src/app/api/`):
- `/api/viajes/GET` - Fetch travels with filtering (fechaDesde, fechaHasta, minPendientes)
- `/api/viajes/POST` - Create new travel
- `/api/viajes/[id]` - Individual travel operations (DELETE supported)
- `/api/productos/route.ts` - Products API
- `/api/terceros/route.ts` - Third parties API
- `/api/transportes/route.ts` - Transport API

**Components**:
- `ViajeModal.tsx` - Modal component for creating/editing travels

### Key Data Models

**Viaje (Travel)**:
```typescript
interface Viaje {
  id: number;
  numero: string;
  fecha: string;
  razonSocial: string;
  origen: string;
  destino: string;
  tarifa: number;
  cupos: number;
  cuposReservados: number;
  cuposPendientes: number;
  usuario: string;
  equipo: string;
  vendedor: string | null;
  articulo: string;
}
```

### UI/UX Patterns
- Uses dark mode support throughout with `dark:` Tailwind classes
- Modal-based forms for data entry
- Table-based data display with filtering capabilities
- Responsive grid layouts
- Real-time search and filtering on client-side

### Development Notes
- Client-side components use `"use client"` directive
- Database operations use connection pooling
- Form submissions trigger page reloads for data refresh
- Error handling includes user-friendly alerts
- Uses window.location.reload() for state updates after mutations