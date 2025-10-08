#!/usr/bin/env bash
# Exit immediately if a command fails.
set -o errexit

echo "==> This script runs on every server startup."

echo "==> Installing SDKMAN, Java, and Groovy..."
# The installation will happen from scratch each time.
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
yes | sdk install java 17.0.10-tem
yes | sdk install groovy 4.0.27

# Get the absolute path to the Groovy executable to avoid any PATH issues.
GROOVY_EXEC_PATH="$HOME/.sdkman/candidates/groovy/current/bin/groovy"
echo "==> Groovy executable is at: $GROOVY_EXEC_PATH"

echo "==> Launching Gunicorn with a long timeout..."
# We pass the path as an environment variable directly to the gunicorn process
# and give it a long timeout to allow for the slow JVM startup.
GROOVY_EXEC_PATH=$GROOVY_EXEC_PATH gunicorn --timeout 300 --workers 1 app:app