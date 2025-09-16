#!/bin/bash

# Launcher script for RTMP streaming
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting RTMP stream..."
exec "$SCRIPT_DIR/start-stream.sh"