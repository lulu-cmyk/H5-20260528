#!/bin/bash
# ============================================================
# H5 预览工具一键启动（macOS / Linux）
# 双击此文件即可在浏览器打开预览
# ============================================================

cd "$(dirname "$0")"

PORT=5520

# 检查 Python 3
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ 未检测到 Python 3"
  echo "请先安装 Python 3：https://www.python.org/downloads/"
  read -p "按回车键关闭..."
  exit 1
fi

# 检查端口是否被占用
if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ℹ️  端口 $PORT 已被占用，跳过启动新服务"
else
  echo "🚀 启动 H5 预览服务（端口 $PORT）..."
  python3 -m http.server $PORT >/tmp/h5preview.log 2>&1 &
  sleep 1
fi

URL="http://localhost:$PORT/index.html"
echo "✅ 服务已启动"
echo "   访问地址：$URL"

# 自动用默认浏览器打开
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo ""
echo "ℹ️  关闭此终端窗口将停止预览服务"
echo "   如需手动停止：lsof -ti:$PORT | xargs kill"
echo ""

# 保持终端不退出，让 Python 服务继续跑
wait
