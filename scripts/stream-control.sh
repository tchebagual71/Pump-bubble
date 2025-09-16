#!/bin/bash

# Service control script

case "$1" in
    start)
        echo "Starting streaming services..."
        sudo systemctl start xscreen.service
        sleep 5
        sudo systemctl start stream.service
        ;;
    stop)
        echo "Stopping streaming services..."
        sudo systemctl stop stream.service
        sudo systemctl stop xscreen.service
        ;;
    restart)
        echo "Restarting streaming services..."
        sudo systemctl restart xscreen.service
        sleep 5
        sudo systemctl restart stream.service
        ;;
    status)
        echo "=== X Screen Service ==="
        sudo systemctl status xscreen.service --no-pager
        echo ""
        echo "=== Stream Service ==="
        sudo systemctl status stream.service --no-pager
        ;;
    logs)
        echo "=== X Screen Logs ==="
        sudo journalctl -u xscreen.service --no-pager -n 20
        echo ""
        echo "=== Stream Logs ==="
        sudo journalctl -u stream.service --no-pager -n 20
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac