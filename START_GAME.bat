@echo off
setlocal
cd /d "%~dp0"
title Attack of the Saiyans III - Cell Saga
set "NODE_EXE=%~dp0runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" --version >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20+ from nodejs.org, or use the player ZIP that bundles runtime\node.exe.
  pause
  exit /b 1
)
if not exist dist\index.html (
  echo dist\index.html is missing. In the source package run: npm ci ^&^& npm run build
  pause
  exit /b 1
)
rem The launcher starts the server, waits until it answers, and only then opens the browser.
"%NODE_EXE%" tools\launch.mjs
pause
