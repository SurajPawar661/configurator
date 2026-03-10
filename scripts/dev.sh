#!/bin/bash
# Antigravity GCS Dev Launcher
# Source user profile to ensure npm/node are in PATH
[[ -s "$HOME/.bash_profile" ]] && source "$HOME/.bash_profile"
[[ -s "$HOME/.bashrc" ]] && source "$HOME/.bashrc"
[[ -s "$HOME/.profile" ]] && source "$HOME/.profile"

echo "--- Industrial GCS Startup Sequence ---"
cd "/home/spawar/Desktop/configurator" || exit

if ! command -v npm &> /dev/null; then
    echo "ERROR: 'npm' not found in PATH."
    echo "Current PATH: $PATH"
    echo "Please ensure Node.js is installed."
    read -p "Press Enter to close..."
    exit 1
fi

echo "Starting Tauri Development Server..."
npm run tauri dev

if [ $? -ne 0 ]; then
    echo "ERROR: Application crashed or failed to start."
    read -p "Press Enter to close..."
fi
