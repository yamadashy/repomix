@echo off
setlocal
echo Starting Repomixer GUI build process...
echo Step 1: Bundling repomix CLI (placeholder)...
if exist "build_prep\\bundle_repomix_placeholder.sh" (
    echo Running bundle_repomix_placeholder.sh (requires bash)...
    bash "build_prep\\bundle_repomix_placeholder.sh"
    if errorlevel 1 (
        echo Error during repomix bundling simulation.
        exit /b 1
    )
) else (
    echo Error: build_prep\\bundle_repomix_placeholder.sh not found!
    exit /b 1
)
echo Repomix CLI bundling simulation complete.
echo Step 2: Bundling PySide6 application with PyInstaller...
if exist "repomixer_gui.spec" (
    pyinstaller --noconfirm repomixer_gui.spec
    if errorlevel 1 (
        echo Error during PyInstaller bundling.
        exit /b 1
    )
) else (
    echo Error: repomixer_gui.spec not found!
    exit /b 1
)
echo PySide6 application bundling complete.
echo Build process finished. Output: dist\\RepomixerGUI_App
endlocal
