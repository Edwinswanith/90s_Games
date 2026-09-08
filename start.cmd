@echo off
cd /d "%~dp0"
if exist .runtime\node\node.exe (
  .runtime\node\node.exe scripts\local.mjs
) else (
  node scripts\setup.mjs
  if not errorlevel 1 .runtime\node\node.exe scripts\local.mjs
)
