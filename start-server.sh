#!/bin/bash

echo "🏰 Starting Discipline Dungeon Mobile Server..."
echo "📱 Mobile URL: http://192.168.0.102:3002/mobile"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run database migrations if needed
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  Setting up database..."
    npx prisma migrate dev --name init
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo ""
echo "🚀 Starting development server on port 3002..."
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
