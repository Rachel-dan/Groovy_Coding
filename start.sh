#!/usr/bin/env bash

# Install SDKMAN and Groovy
# This will run every time your service starts up.
echo "--- Installing SDKMAN and Groovy for the runtime environment ---"
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
yes | sdk install groovy 4.0.27

# Start the Gunicorn server
echo "--- Starting Gunicorn server ---"
gunicorn app:app