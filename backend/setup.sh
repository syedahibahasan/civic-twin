#!/bin/bash

echo "🚀 Setting up Replicant Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Supabase credentials"
    echo "   - SUPABASE_URL: Your Supabase project URL"
    echo "   - SUPABASE_ANON_KEY: Your Supabase anonymous key"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key"
    echo "   - JWT_SECRET: A secure random string for JWT signing"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Supabase credentials"
echo "2. Create the users table in your Supabase database (see README.md)"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "📚 For more information, see README.md" 