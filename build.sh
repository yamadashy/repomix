#!/bin/bash
set -e
echo "Starting Repomixer GUI build process..."
echo "Step 1: Bundling repomix CLI (placeholder)..."
if [ -f "build_prep/bundle_repomix_placeholder.sh" ]; then
    bash build_prep/bundle_repomix_placeholder.sh
else
    echo "Error: bundle_repomix_placeholder.sh not found!"
    exit 1
fi
echo "Repomix CLI bundling simulation complete."
echo "Step 2: Bundling PySide6 application with PyInstaller..."
if [ -f "repomixer_gui.spec" ]; then
    pyinstaller --noconfirm repomixer_gui.spec
else
    echo "Error: repomixer_gui.spec not found!"
    exit 1
fi
echo "PySide6 application bundling complete."
echo "Build process finished. Output: dist/RepomixerGUI_App"
