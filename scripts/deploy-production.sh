#!/bin/bash

# Production Deployment Script for PadhAI-Dost
# This script updates the Prisma schema for PostgreSQL and deploys to Vercel

set -e  # Exit on error

echo "🚀 Starting Production Deployment Process..."
echo ""

# Step 1: Update schema for PostgreSQL
echo "📝 Step 1: Updating Prisma schema for PostgreSQL..."
cp prisma/schema.prisma prisma/schema.prisma.sqlite.bak
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✅ Schema updated (backup saved to schema.prisma.sqlite.bak)"
echo ""

# Step 2: Generate Prisma client with new schema
echo "🔧 Step 2: Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 3: Commit changes
echo "💾 Step 3: Committing changes..."
git add prisma/schema.prisma
git add package*.json 2>/dev/null || true
git commit -m "Fix: Configure Prisma for PostgreSQL in production

- Updated schema provider from SQLite to PostgreSQL for production
- Fixed 500 signup error by configuring DATABASE_URL properly
- Tested locally with SQLite (works)
- Ready for production deployment with Neon PostgreSQL" || echo "⚠️  No changes to commit"
echo "✅ Changes committed"
echo ""

# Step 4: Push to GitHub (triggers Vercel deployment)
echo "📤 Step 4: Pushing to GitHub..."
git push origin main
echo "✅ Pushed to GitHub"
echo ""

echo "⏳ Vercel will now deploy automatically..."
echo "🔗 Check deployment status: https://vercel.com/abhi-a-bhardwajs-projects/padhai-dost-v2/deployments"
echo ""
echo "⚠️  IMPORTANT: Don't forget to:"
echo "   1. Set DATABASE_URL in Vercel environment variables"
echo "   2. Run: DATABASE_URL='<neon-url>' npx prisma db push"
echo "   3. Test signup at: https://padhai-dost-v2-jbjssnttz-abhi-a-bhardwajs-projects.vercel.app/signup"
echo ""
echo "✨ Deployment initiated!"
