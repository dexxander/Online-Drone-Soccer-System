# Tournament Master

A production-ready tournament management system built for Vercel and Firebase.

## Tech Stack
- Frontend: React 19, Vite, TanStack Router
- Styling: TailwindCSS, Radix UI, shadcn/ui components
- Backend: Firebase (Auth, Firestore, Storage)
- Deployment: Vercel (Serverless / Static)

## Prerequisites
- Node.js (v20+)
- Firebase account and project

## Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your Firebase credentials.
4. Run the development server: `npm run dev`

## Deployment
This app is configured for seamless deployment on Vercel. 
Just link your GitHub repository to Vercel and ensure you have populated the required Environment Variables in the Vercel dashboard.

## Features
- Role-based Authentication (Admin, Referee, Coach, Player, Viewer)
- Tournament & Bracket Management
- Live Score Updates
- Match Scheduling
