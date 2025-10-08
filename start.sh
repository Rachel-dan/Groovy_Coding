#!/usr/bin/env bash
# This ensures that the script will exit immediately if any command fails.
set -o errexit

echo "--- Installing SDKMAN and Groovy for the runtime environment ---"
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
yes | sdk install groovy 4.0.27

# Find the exact path to the groovy executable and export it.
echo "--- Finding and exporting Groovy path ---"
export GROOVY_EXEC_PATH=$(which groovy)
echo "Groovy found at: $GROOVY_EXEC_PATH"

# Start the Gunicorn server. It will now have access to the GROOVY_EXEC_PATH variable.
echo "--- Starting Gunicorn server ---"
gunicorn app:app