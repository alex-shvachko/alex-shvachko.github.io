@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Preview Website.ps1"
if errorlevel 1 pause
