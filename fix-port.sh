#!/bin/bash

# Script to fix port conflicts for NeoRP

echo "🔍 Checking for processes using ports 3000 and 3001..."

# Check port 3001 (backend)
PORT_3001=$(lsof -ti:3001)
if [ ! -z "$PORT_3001" ]; then
    echo "🔴 Port 3001 is in use by process(es): $PORT_3001"
    echo "💀 Killing processes on port 3001..."
    kill -9 $PORT_3001
    echo "✅ Port 3001 freed"
else
    echo "✅ Port 3001 is available"
fi

# Check port 3000 (frontend)
PORT_3000=$(lsof -ti:3000)
if [ ! -z "$PORT_3000" ]; then
    echo "🔴 Port 3000 is in use by process(es): $PORT_3000"
    echo "💀 Killing processes on port 3000..."
    kill -9 $PORT_3000
    echo "✅ Port 3000 freed"
else
    echo "✅ Port 3000 is available"
fi

echo "🚀 Ports are ready for NeoRP!"