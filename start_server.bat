@echo off
echo ========================================================
echo  Starting SkinFairness-AI Server on http://localhost:8080
echo ========================================================
cd /d "%~dp0"
start "" "http://localhost:8080"
python serve.py
pause
