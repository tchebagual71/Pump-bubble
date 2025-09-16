#!/bin/bash

# Service management commands for RTMP streamer

case "$1" in
    start)
        echo "Starting RTMP streamer services..."
        sudo systemctl start xscreen.service
        sudo systemctl start stream.service
        ;;
    stop)
        echo "Stopping RTMP streamer services..."
        sudo systemctl stop stream.service
        sudo systemctl stop xscreen.service
        ;;
    restart)
        echo "Restarting RTMP streamer services..."
        sudo systemctl restart xscreen.service
        sudo systemctl restart stream.service
        ;;
    status)
        echo "RTMP streamer service status:"
        sudo systemctl status xscreen.service stream.service
        ;;
    logs)
        echo "Following RTMP streamer logs..."
        sudo journalctl -u xscreen.service -u stream.service -f
        ;;
    enable)
        echo "Enabling RTMP streamer services..."
        sudo systemctl enable xscreen.service
        sudo systemctl enable stream.service
        ;;
    disable)
        echo "Disabling RTMP streamer services..."
        sudo systemctl disable stream.service
        sudo systemctl disable xscreen.service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
        echo ""
        echo "Commands:"
        echo "  start    - Start both services"
        echo "  stop     - Stop both services"
        echo "  restart  - Restart both services"
        echo "  status   - Show service status"
        echo "  logs     - Follow service logs"
        echo "  enable   - Enable services for auto-start"
        echo "  disable  - Disable services"
        exit 1
        ;;
esac