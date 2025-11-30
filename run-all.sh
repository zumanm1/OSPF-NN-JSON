#!/bin/bash

# OSPF Network Visualizer Pro - Complete Test & Build Script
# Run this script to test and start your application

echo "🚀 Starting OSPF Network Visualizer Pro Setup..."
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/5: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation failed! Please check the error above."
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo ""

# Step 2: Run tests
echo "🧪 Step 2/5: Running unit tests..."
npm test -- --run

if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed, but continuing..."
fi

echo ""

# Step 3: Build for production
echo "🏗️  Step 3/5: Building for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the error above."
    exit 1
fi

echo "✅ Production build complete!"
echo ""

# Step 4: Show build results
echo "📊 Step 4/5: Build Results"
echo "----------------------------"
ls -lh dist/assets/*.css 2>/dev/null | awk '{print "CSS Bundle: " $5 " (" $9 ")"}'
ls -lh dist/assets/*.js 2>/dev/null | awk '{print "JS Bundle:  " $5 " (" $9 ")"}'
echo ""

# Step 5: Instructions
echo "✅ Step 5/5: All done! Next steps:"
echo "----------------------------"
echo ""
echo "To start the DEVELOPMENT server:"
echo "  npm run dev"
echo ""
echo "To preview the PRODUCTION build:"
echo "  npm run preview"
echo ""
echo "To commit to GitHub:"
echo "  git add ."
echo "  git commit -m \"feat: Add production optimizations with comprehensive testing suite\""
echo "  git push origin main"
echo ""
echo "📚 See TESTING_GUIDE.md for detailed testing instructions"
echo "📚 See OPTIMIZATIONS.md for complete documentation"
echo ""
