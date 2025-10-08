#!/usr/bin/env bash
set -o errexit

echo "--- Installing Java and Groovy ---"
# Source sdkman to make it available
source "$HOME/.sdkman/bin/sdkman-init.sh" || true
# Install Java and Groovy
yes | sdk install java 17.0.10-tem
yes | sdk install groovy 4.0.27

echo "--- Starting Gunicorn server ---"
gunicorn app:app