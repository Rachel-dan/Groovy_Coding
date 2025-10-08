#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -o errexit

# STEP 1: Install SDKMAN
# This must be done every time the server starts.
echo "==> Installing SDKMAN..."
curl -s "https://get.sdkman.io" | bash

# STEP 2: Source the SDKMAN script to make its commands available
# This is crucial.
echo "==> Sourcing SDKMAN script..."
source "$HOME/.sdkman/bin/sdkman-init.sh"

# STEP 3: Install Java. SDKMAN will automatically set JAVA_HOME.
echo "==> Installing Java..."
yes | sdk install java 17.0.10-tem

# STEP 4: Install Groovy
echo "==> Installing Groovy..."
yes | sdk install groovy 4.0.27

# STEP 5: Define the absolute path to the Groovy executable.
# We use this to avoid any PATH issues with Gunicorn.
GROOVY_EXEC_PATH="$HOME/.sdkman/candidates/groovy/current/bin/groovy"
echo "==> Groovy executable path is: $GROOVY_EXEC_PATH"

# STEP 6: Run the Python application.
# We pass the Groovy path to it as an environment variable.
echo "==> Starting Gunicorn server..."
GROOVY_EXEC_PATH=$GROOVY_EXEC_PATH gunicorn app:app