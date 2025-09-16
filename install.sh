#!/bin/bash

# Installation script for 24/7 RTMP Streamer
# Run as root on Ubuntu

set -e

echo "Installing 24/7 RTMP Streamer..."

# Update package list
apt-get update

# Install required packages
apt-get install -y \
    xvfb \
    chromium-browser \
    ffmpeg \
    pulseaudio \
    alsa-utils

# Create user for streaming
if ! id -u rtmpstreamer > /dev/null 2>&1; then
    useradd -r -s /bin/bash -d /opt/rtmp-streamer rtmpstreamer
fi

# Create directories
mkdir -p /opt/rtmp-streamer/scripts
mkdir -p /var/log/rtmp-streamer
chown rtmpstreamer:rtmpstreamer /var/log/rtmp-streamer

# Copy scripts
cp scripts/start-xscreen.sh /opt/rtmp-streamer/scripts/
cp scripts/start-stream.sh /opt/rtmp-streamer/scripts/
chmod +x /opt/rtmp-streamer/scripts/*.sh
chown -R rtmpstreamer:rtmpstreamer /opt/rtmp-streamer

# Copy systemd service files
cp systemd/xscreen.service /etc/systemd/system/
cp systemd/stream.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable services
systemctl enable xscreen.service
systemctl enable stream.service

echo "Installation complete!"
echo ""
echo "To configure:"
echo "1. Edit /etc/systemd/system/stream.service to set APP_URL and RTMP_URL"
echo "2. Start services: systemctl start xscreen.service stream.service"
echo "3. Check status: systemctl status xscreen.service stream.service"
echo "4. View logs: journalctl -u xscreen.service -u stream.service -f"