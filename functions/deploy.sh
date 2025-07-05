#!/bin/bash

echo "🚀 Firebase Functions Deployment Script"
echo "========================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

echo "📦 Building Functions..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "🔧 Setting up environment variables..."
echo "Please enter your OpenAI API key:"
read -s OPENAI_API_KEY

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OpenAI API key is required."
    exit 1
fi

# Set Firebase Functions environment variable
echo "Setting OPENAI_API_KEY environment variable..."
firebase functions:config:set openai.api_key="$OPENAI_API_KEY"

echo "📋 Current configuration:"
firebase functions:config:get

echo "🚀 Deploying Functions..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your endpoints should now be accessible at:"
    echo "https://YOUR_PROJECT_ID.cloudfunctions.net/voiceAssistant/health"
    echo "https://YOUR_PROJECT_ID.cloudfunctions.net/voiceAssistant/api/session"
    echo "https://YOUR_PROJECT_ID.cloudfunctions.net/voiceAssistant/api/responses"
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi

echo "🔍 Testing health endpoint..."
echo "You can test your function with:"
echo "curl https://YOUR_PROJECT_ID.cloudfunctions.net/voiceAssistant/health"

cd .. 