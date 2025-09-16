# Pump-bubble

24/7 RTMP streaming setup for web applications using Xvfb, Chromium, and ffmpeg.

## Installation

```bash
sudo ./install.sh
```

## Configuration

Edit `/etc/systemd/system/stream.service` to set:
- `APP_URL`: Your web application URL
- `RTMP_URL`: Your RTMP streaming endpoint

## Usage

```bash
# Start streaming
./scripts/stream-control.sh start

# Stop streaming
./scripts/stream-control.sh stop

# Check status
./scripts/stream-control.sh status

# View logs
./scripts/stream-control.sh logs
```

## Services

- `xscreen.service`: Virtual X framebuffer (Xvfb)
- `stream.service`: Chromium + ffmpeg RTMP streaming