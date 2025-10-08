#!/usr/bin/env bash
# Exit immediately if a command fails.
set -o errexit

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Installing SDKMAN, Java, and Groovy into a persistent directory..."
# Export the install directory to be inside our project folder
export SDKMAN_DIR="$PWD/.sdkman"
# Download and install SDKMAN
curl -s "https://get.sdkman.io" | bash
# Source the script to make the 'sdk' command available
source "$SDKMAN_DIR/bin/sdkman-init.sh"
# Install Java and Groovy
yes | sdk install java 17.0.10-tem
yes | sdk install groovy 4.0.27

echo "==> Build complete."