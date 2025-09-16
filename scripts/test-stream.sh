#!/bin/bash

# Quick launcher for testing the streaming setup manually
# Run this script to test streaming without systemd

set -e

echo "24/7 RTMP Streamer - Manual Test Launch"
echo "========================================"

# Configuration
DISPLAY_NUM=99
APP_URL=${APP_URL:-"http://localhost:3000"}
RTMP_URL=${RTMP_URL:-"rtmp://live.twitch.tv/live/YOUR_STREAM_KEY"}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root for testing"
   exit 1
fi

# Kill existing processes
echo "Cleaning up existing processes..."
pkill -f "Xvfb :$DISPLAY_NUM" || true
pkill -f chromium-browser || true
pkill -f ffmpeg || true
sleep 2

# Start Xvfb in background
echo "Starting Xvfb..."
Xvfb ":$DISPLAY_NUM" -screen 0 1920x1080x24 -ac -nolisten tcp -dpi 96 &
XVFB_PID=$!

# Set DISPLAY
export DISPLAY=":$DISPLAY_NUM"

# Wait for Xvfb
sleep 3

# Start Chromium in background
echo "Starting Chromium..."
mkdir -p /tmp/chrome-test
chromium-browser \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-setuid-sandbox \
    --kiosk \
    --user-data-dir="/tmp/chrome-test" \
    "$APP_URL" &
CHROME_PID=$!

# Wait for Chrome
sleep 5

# Start FFmpeg
echo "Starting FFmpeg stream to $RTMP_URL"
echo "Press Ctrl+C to stop streaming..."

# Cleanup function
cleanup() {
    echo "Stopping all processes..."
    kill $CHROME_PID 2>/dev/null || true
    kill $XVFB_PID 2>/dev/null || true
    pkill -f ffmpeg || true
    exit 0
}

trap cleanup SIGTERM SIGINT

ffmpeg \
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
    "$RTMP_URL"