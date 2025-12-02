# Discipline Dungeon Mobile - Quick Start

## Starting the Server from Terminal

### Option 1: Using the Startup Script (Recommended)

```bash
cd ~/Desktop/Projects/Discipline\ Dungeon/discipline-dungeon-mobile
./start-server.sh
```

The script will automatically:
- Install dependencies if needed
- Run database migrations if needed
- Seed the database if it's new
- Start the dev server on port 3002

### Option 2: Using npm directly

```bash
cd ~/Desktop/Projects/Discipline\ Dungeon/discipline-dungeon-mobile
npm install          # First time only
npm run dev          # Starts on port 3002
```

## Accessing the App

Once running, access the mobile app at:
- **Mobile Dashboard**: http://localhost:3002/mobile
- **Or on your phone**: http://192.168.0.102:3002/mobile

## Database Commands

```bash
# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Port Configuration

The mobile app runs on **port 3002** by default (configured in package.json).
This is separate from the main desktop app to avoid conflicts.

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.
