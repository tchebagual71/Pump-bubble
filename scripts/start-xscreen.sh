#!/bin/bash

# 24/7 RTMP Streamer - Virtual Display Setup
# Starts Xvfb virtual display for headless streaming

set -e

# Configuration
DISPLAY_NUM=${DISPLAY_NUM:-99}
SCREEN_RESOLUTION=${SCREEN_RESOLUTION:-1920x1080x24}
LOG_FILE=${LOG_FILE:-/var/log/rtmp-streamer/xscreen.log}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Kill existing Xvfb on the display
pkill -f "Xvfb :$DISPLAY_NUM" || true

# Start Xvfb
echo "Starting Xvfb on display :$DISPLAY_NUM with resolution $SCREEN_RESOLUTION" | tee -a "$LOG_FILE"
exec Xvfb ":$DISPLAY_NUM" -screen 0 "$SCREEN_RESOLUTION" -ac -nolisten tcp -dpi 96 2>&1 | tee -a "$LOG_FILE"