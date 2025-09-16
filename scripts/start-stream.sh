#!/bin/bash

# Configuration
DISPLAY_NUM=99
APP_URL="${APP_URL:-http://localhost:3000}"
RTMP_URL="${RTMP_URL:-rtmp://localhost/live/stream}"
RESOLUTION="1920x1080"
FRAMERATE=30

# Set display
export DISPLAY=:$DISPLAY_NUM

# Wait for Xvfb to be ready
sleep 5

# Kill existing Chrome processes
pkill -f "chromium-browser.*--kiosk"

# Wait for processes to die
sleep 2

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --no-first-run \
    --no-default-browser-check \
    --disable-infobars \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --disable-software-rasterizer \
    --disable-gpu \
    --no-sandbox \
    --window-size=1920,1080 \
    --window-position=0,0 \
    "$APP_URL" &

# Wait for Chrome to load
sleep 10

# Start ffmpeg RTMP stream
exec ffmpeg \
    -f x11grab \
    -video_size $RESOLUTION \
    -framerate $FRAMERATE \
    -i :$DISPLAY_NUM \
    -vcodec libx264 \
    -preset fast \
    -maxrate 3000k \
    -bufsize 6000k \
    -pix_fmt yuv420p \
    -g 50 \
    -c:a aac \
    -b:a 160k \
    -ac 2 \
    -ar 44100 \
    -f flv \
    "$RTMP_URL"