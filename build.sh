#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Installing Python Dependencies ---"
pip install -r requirements.txt

echo "--- Installing SDKMAN and Groovy ---"
# Download and install SDKMAN (a tool for managing SDKs like Groovy)
curl -s "https://get.sdkman.io" | bash
# Source the SDKMAN script to make it available in this session
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install a specific version of Groovy. The 'yes' command automatically answers any prompts.
yes | sdk install groovy 4.0.27

echo "--- Build Complete ---"