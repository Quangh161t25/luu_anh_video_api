@echo off
chcp 65001 >nul
title May Chu Luu Tru Video & Tu Dong Luu Google Sheet DATA
cd /d "%~dp0"
echo ======================================================================
echo   🚀 DANG KHOI CHAY VIDEO HUB & GOOGLE SHEET SYNC SERVER
echo   📊 Google Sheet: luu_anh_video_api (Sheet: DATA)
echo   📧 Service Account: ca-nhan@h161-508101.iam.gserviceaccount.com
echo   🌐 Giao dien Web: http://localhost:5000
echo ======================================================================
echo.
start "" "http://localhost:5000"
node server.js
pause
