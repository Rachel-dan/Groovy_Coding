#!/usr/bin/env bash
set -o errexit

echo "==> Installing SDKMAN..."
curl -s "https://get.sdkman.io" | bash

echo "==> Sourcing SDKMAN script..."
source "$HOME/.sdkman/bin/sdkman-init.sh"

echo "==> Installing Java..."
yes | sdk install java 17.0.10-tem

echo "==> Installing Groovy..."
yes | sdk install groovy 4.0.27

GROOVY_EXEC_PATH="$HOME/.sdkman/candidates/groovy/current/bin/groovy"
echo "==> Groovy executable path is: $GROOVY_EXEC_PATH"

echo "==> Starting Gunicorn server with a 120-second timeout..."
GROOVY_EXEC_PATH=$GROOVY_EXEC_PATH gunicorn --timeout 120 app:app