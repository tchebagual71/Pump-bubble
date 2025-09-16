#!/bin/bash

# Configuration
DISPLAY_NUM=99
RESOLUTION="1920x1080"
DEPTH=24

# Kill existing Xvfb processes on this display
pkill -f "Xvfb :$DISPLAY_NUM"

# Wait for process to die
sleep 2

# Start virtual framebuffer
exec Xvfb :$DISPLAY_NUM -screen 0 ${RESOLUTION}x${DEPTH} -ac -nolisten tcp -dpi 96