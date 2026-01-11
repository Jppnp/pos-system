# POS System - ระบบขายหน้าร้าน

A local-first Progressive Web Application (PWA) for point of sale operations in Thailand.

## Features

- 🏪 Local-first architecture with offline support
- 🇹🇭 Thai language interface with Kanit font
- 💾 Local database using Dexie.js (IndexedDB)
- ☁️ Cloud backup with Supabase
- 📱 Progressive Web App (PWA) support
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Cloud Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **PWA**: vite-plugin-pwa
- **Hosting**: Cloudflare Pages

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

## Deployment

The app is configured for deployment on Cloudflare Pages with automatic SPA routing support via the `_redirects` file.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── lib/                # Database and external service configurations
├── services/           # Business logic services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## Requirements

This project implements the requirements specified in `.kiro/specs/pos-system/requirements.md`.