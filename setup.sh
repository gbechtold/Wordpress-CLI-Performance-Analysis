#!/bin/bash

# Check if Homebrew is installed
if ! command -v brew &> /dev/null
then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew is already installed."
fi

# Create Brewfile if it doesn't exist
if [ ! -f "Brewfile" ]; then
    echo "Creating Brewfile..."
    cat > Brewfile << EOL
# Taps
tap "homebrew/cask"

# Formulae
brew "node"

# Casks
cask "google-chrome"
EOL
    echo "Brewfile created."
fi

# Install dependencies using Brewfile
echo "Installing dependencies..."
brew bundle

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please ensure you're in the correct directory."
    exit 1
fi

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file from .env-example if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env-example ]; then
        echo "Creating .env file..."
        cp .env-example .env
        echo "Please edit .env file with your specific configuration."
    else
        echo "Error: .env-example file not found. Please create a .env file manually."
    fi
else
    echo ".env file already exists."
fi

echo "Setup complete! Remember to edit your .env file with your specific configuration if you haven't already."