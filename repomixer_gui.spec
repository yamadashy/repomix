# repomixer_gui.spec
# -*- mode: python ; coding: utf-8 -*-

import os # Required for os.path.join

block_cipher = None

# --- Adjust these paths as necessary ---
# Path to your main application script
main_script = 'desktop_app/src/main_window.py'

# Path to the directory containing the (simulated) bundled repomix executables
# These are the files created by the (simulated) 'pkg' process
# In our simulation, they are in build_prep/repomix_cli/dist/
repomix_binaries_source_dir = 'build_prep/repomix_cli/dist'

# The subdirectory name within the bundled app where repomix binaries will be placed
# This MUST match what get_bundled_repomix_path() expects for frozen apps.
repomix_binaries_dest_subdir = 'bundled_repomix_bin'
# --- End Path Adjustments ---

# Collect the repomix binaries to be bundled
# This creates a list of tuples: (source_path, destination_in_bundle)
added_files = [
    (os.path.join(repomix_binaries_source_dir, 'repomix-placeholder-standalone-win.exe'), repomix_binaries_dest_subdir),
    (os.path.join(repomix_binaries_source_dir, 'repomix-placeholder-standalone-macos'), repomix_binaries_dest_subdir),
    (os.path.join(repomix_binaries_source_dir, 'repomix-placeholder-standalone-linux'), repomix_binaries_dest_subdir),
]

a = Analysis(
    [main_script],
    pathex=['.'], # Add project root to Python path
    binaries=[],
    datas=added_files, # Add our repomix executables here
    hiddenimports=['PySide6.QtCore', 'PySide6.QtGui', 'PySide6.QtWidgets', 'PySide6.QtSvg'], # Common PySide6 modules
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='RepomixerGUI', # Name of the final executable
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True, # UPX compression can reduce file size, if UPX is installed
    console=False, # False for GUI applications (no console window on Windows)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None, # TODO: Add path to an application icon if available
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas, # This includes our added_files
    strip=False,
    upx=True,
    upx_exclude=[],
    name='RepomixerGUI_App', # Name of the output directory
)
