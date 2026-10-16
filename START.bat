@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Xưởng Hiệu Ứng Ma Thuật - Tháp Phù Văn
echo ========================================
echo   XƯỞNG HIỆU ỨNG MA THUẬT - THÁP PHÙ VĂN
echo ========================================
where node >nul 2>&1
if errorlevel 1 (
  echo [LỖI] Chưa cài Node.js hoặc chưa thêm vào PATH.
  echo Hãy cài Node.js phiên bản hỗ trợ dài hạn.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [LỖI] Không tìm thấy npm.cmd. Hãy cài lại Node.js phiên bản hỗ trợ dài hạn.
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo [1/2] Đang cài các thư viện cần thiết...
  call npm.cmd install
  if errorlevel 1 (
    echo [LỖI] Cài thư viện thất bại.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Các thư viện đã được cài đặt.
)
echo [2/2] Đang khởi chạy máy chủ...
echo Trình duyệt sẽ mở tại một cổng nội bộ còn trống.
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ports=5173..5190; for($i=0;$i -lt 90;$i++){foreach($p in $ports){try{$r=Invoke-WebRequest -UseBasicParsing -Uri ('http://localhost:'+$p+'/') -TimeoutSec 1; if($r.StatusCode -eq 200){Start-Process ('http://localhost:'+$p+'/'); exit}}catch{}}; Start-Sleep -Seconds 1}"
call npm.cmd run dev
if errorlevel 1 (
  echo [LỖI] Máy chủ đã dừng do gặp sự cố.
  pause
)
endlocal
