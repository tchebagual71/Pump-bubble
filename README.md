# Pump-bubble

24/7 RTMP Streamer - Production-ready scripts for streaming web applications 24/7 to RTMP destinations using Xvfb, Chromium kiosk mode, and FFmpeg.

## Features

- Headless streaming using Xvfb virtual display
- Chromium kiosk mode for web application capture
- FFmpeg for video encoding and RTMP streaming
- Systemd services with automatic restart
- Comprehensive logging
- Ubuntu optimized

## Installation

1. Run the installation script as root:
```bash
sudo ./install.sh
```

2. Configure the streaming settings:
```bash
sudo systemctl edit stream.service
```

Add your configuration:
```ini
[Service]
Environment=APP_URL=https://your-app.com
Environment=RTMP_URL=rtmp://live.twitch.tv/live/YOUR_STREAM_KEY
```

3. Start the services:
```bash
sudo systemctl start xscreen.service
sudo systemctl start stream.service
```

## Manual Testing

Test the streaming setup without systemd:
```bash
APP_URL=https://your-app.com RTMP_URL=rtmp://your-rtmp-url ./scripts/test-stream.sh
```

## Monitoring

View service status:
```bash
sudo systemctl status xscreen.service stream.service
```

View logs:
```bash
sudo journalctl -u xscreen.service -u stream.service -f
```

## Configuration

- **APP_URL**: The web application URL to stream
- **RTMP_URL**: The RTMP destination URL with stream key
- **DISPLAY_NUM**: Virtual display number (default: 99)
- **SCREEN_RESOLUTION**: Display resolution (default: 1920x1080x24)

## Services

- **xscreen.service**: Manages the Xvfb virtual display
- **stream.service**: Manages the Chromium + FFmpeg streaming pipeline

Both services are configured with `Restart=always` for 24/7 operation.

## Requirements

- Ubuntu 18.04+
- Xvfb
- Chromium browser
- FFmpeg
- PulseAudio