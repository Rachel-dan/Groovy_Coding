#!/usr/bin/env bash
# This ensures that the script will exit immediately if any command fails.
set -o errexit

echo "--- Installing SDKMAN, Java, and Groovy for the runtime environment ---"
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java (JDK). This will automatically set JAVA_HOME.
echo "--- Installing Java ---"
yes | sdk install java 17.0.10-tem

# Install Groovy
echo "--- Installing Groovy ---"
yes | sdk install groovy 4.0.27

# Use the known, absolute path to the Groovy executable and export it.
echo "--- Setting absolute Groovy path ---"
export GROOVY_EXEC_PATH="$HOME/.sdkman/candidates/groovy/current/bin/groovy"
echo "Groovy path set to: $GROOVY_EXEC_PATH"

# Start the Gunicorn server.
echo "--- Starting Gunicorn server ---"
gunicorn app:app