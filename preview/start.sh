#!/bin/bash
# 通用启动脚本（终端运行：bash start.sh）
cd "$(dirname "$0")"

PORT="${1:-5520}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ 未找到 python3，请先安装"
  exit 1
fi

if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ℹ️  端口 $PORT 已被占用"
  echo "   访问：http://localhost:$PORT/index.html"
  exit 0
fi

echo "🚀 H5 预览启动（端口 $PORT）"
echo "   访问：http://localhost:$PORT/index.html"
echo "   按 Ctrl+C 停止"
python3 -m http.server $PORT
