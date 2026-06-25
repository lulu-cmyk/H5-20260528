@echo off
chcp 65001 >nul
REM ============================================================
REM H5 预览工具一键启动（Windows）
REM 双击此文件即可在浏览器打开预览
REM ============================================================

cd /d "%~dp0"

set PORT=5520

REM 检查 Python 3
where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo  X 未检测到 Python
  echo.
  echo  请先安装 Python 3：https://www.python.org/downloads/
  echo  安装时务必勾选「Add Python to PATH」选项
  echo.
  pause
  exit /b 1
)

echo  Starting H5 preview server on port %PORT% ...
echo.

REM 启动 HTTP 服务（独立窗口，关闭即停止）
start "H5 Preview Server" /min cmd /c "python -m http.server %PORT%"

REM 等待 1 秒
timeout /t 1 /nobreak >nul

REM 自动打开浏览器
start http://localhost:%PORT%/index.html

echo  Server started!
echo  URL: http://localhost:%PORT%/index.html
echo.
echo  Tip: To stop the server, close the minimized "H5 Preview Server" window.
echo.
pause
