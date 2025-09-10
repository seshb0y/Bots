#!/bin/bash
echo "[INFO] Checking Node.js..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js first."
    echo "You can install it using: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
else
    echo "[INFO] Node.js is already installed."
fi

# Display versions
echo "Node.js version:"
node -v
echo "npm version:"
npm -v

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "[INFO] ts-node not found. Installing globally..."
    npm install -g ts-node typescript
fi

# Run the bot
echo "[INFO] Starting the bot..."
npx ts-node src/index.ts 