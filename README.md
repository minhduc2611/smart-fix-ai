# Smart Fix AI

Smart Fix AI is a modern web application that combines AI-powered analysis with real-time webcam capture capabilities. The project is built with React, TypeScript, and Express, featuring a beautiful UI powered by Tailwind CSS and Radix UI components.

## Features

- Real-time webcam capture and analysis
- AI-powered image processing
- Modern, responsive UI with dark mode support
- Offline support with service workers
- Secure authentication system
- Real-time updates using WebSocket
- Database integration with Drizzle ORM

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Radix UI Components
  - React Query
  - Wouter (Routing)
  - Vite (Build tool)

- **Backend:**
  - Express.js
  - TypeScript
  - WebSocket
  - Drizzle ORM
  - Passport.js (Authentication)
  - Google Generative AI

- **Database:**
  - Neon Database (PostgreSQL)

## Prerequisites

- Node.js (v18 or higher)
- Yarn or npm
- PostgreSQL database (or Neon Database account)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-fix-ai
   ```

2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL=your_database_url

   # Google AI
   GOOGLE_AI_API_KEY=your_google_ai_api_key

   # Session
   SESSION_SECRET=your_session_secret

   # Server
   PORT=3000
   ```

4. Set up the database:
   ```bash
   yarn db:push
   # or
   npm run db:push
   ```

## Development

1. Start the development server:
   ```bash
   # Terminal 1 - Backend
   yarn dev
   # or
   npm run dev

   # Terminal 2 - Frontend
   yarn dev:client
   # or
   npm run dev:client
   ```

2. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Building for Production

1. Build the application:
   ```bash
   yarn build
   # or
   npm run build
   ```

2. Start the production server:
   ```bash
   yarn start
   # or
   npm start
   ```

## Project Structure

```
smart-fix-ai/
├── client/             # Frontend React application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/     # Page components
│   │   └── ...
│   └── public/        # Static assets
├── server/            # Backend Express application
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   └── ...
├── shared/           # Shared types and utilities
└── uploads/         # File upload directory
```
