#!/bin/bash

# 24/7 RTMP Streamer - Main Streaming Script
# Captures Chromium kiosk mode and streams to RTMP

set -e

# Configuration
DISPLAY_NUM=${DISPLAY_NUM:-99}
APP_URL=${APP_URL:-"http://localhost:3000"}
RTMP_URL=${RTMP_URL:-"rtmp://live.twitch.tv/live/YOUR_STREAM_KEY"}
LOG_FILE=${LOG_FILE:-/var/log/rtmp-streamer/stream.log}
CHROME_USER_DATA_DIR=${CHROME_USER_DATA_DIR:-/tmp/chrome-streaming}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Set DISPLAY
export DISPLAY=":$DISPLAY_NUM"

# Clean up function
cleanup() {
    echo "Stopping stream..." | tee -a "$LOG_FILE"
    pkill -f chromium-browser || true
    pkill -f ffmpeg || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for Xvfb to be ready
sleep 5

# Start Chromium in kiosk mode
echo "Starting Chromium in kiosk mode on $APP_URL" | tee -a "$LOG_FILE"
mkdir -p "$CHROME_USER_DATA_DIR"

chromium-browser \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-setuid-sandbox \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=TranslateUI \
    --disable-component-extensions-with-background-pages \
    --disable-extensions \
    --disable-plugins \
    --disable-sync \
    --no-first-run \
    --no-default-browser-check \
    --disable-infobars \
    --disable-notifications \
    --disable-popup-blocking \
    --kiosk \
    --user-data-dir="$CHROME_USER_DATA_DIR" \
    "$APP_URL" &

# Wait for Chrome to start
sleep 10

# Start FFmpeg streaming
echo "Starting FFmpeg stream to $RTMP_URL" | tee -a "$LOG_FILE"
exec ffmpeg \
    -f x11grab \
    -video_size 1920x1080 \
    -framerate 30 \
    -i "$DISPLAY" \
    -f pulse \
    -i default \
    -c:v libx264 \
    -preset veryfast \
    -maxrate 3000k \
    -bufsize 6000k \
    -pix_fmt yuv420p \
    -g 50 \
    -c:a aac \
    -b:a 128k \
    -ac 2 \
    -ar 44100 \
    -f flv \
    "$RTMP_URL" 2>&1 | tee -a "$LOG_FILE"