#!/bin/bash

# Installation script for 24/7 RTMP streaming setup
# Run as root on Ubuntu

set -e

echo "Installing 24/7 RTMP streaming setup..."

# Install required packages
apt-get update
apt-get install -y xvfb chromium-browser ffmpeg

# Create stream user
if ! id "stream" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/pump-bubble stream
fi

# Create installation directory
mkdir -p /opt/pump-bubble
cp -r scripts systemd /opt/pump-bubble/

# Set permissions
chown -R stream:stream /opt/pump-bubble
chmod +x /opt/pump-bubble/scripts/*.sh

# Install systemd services
cp /opt/pump-bubble/systemd/*.service /etc/systemd/system/
systemctl daemon-reload

# Enable services
systemctl enable xscreen.service
systemctl enable stream.service

echo "Installation complete!"
echo "Configure APP_URL and RTMP_URL in /etc/systemd/system/stream.service"
echo "Then run: systemctl start xscreen.service && systemctl start stream.service"