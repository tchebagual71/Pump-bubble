#!/bin/bash

# Launcher script for X virtual framebuffer
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting X virtual framebuffer..."
exec "$SCRIPT_DIR/start-xscreen.sh"