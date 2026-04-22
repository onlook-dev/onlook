#!/bin/bash
# Onlook 扩展打包脚本
# 在 monorepo 环境中将扩展打包为 .vsix 文件
#
# 用法：
#   ./scripts/package.sh          # 打包
#   ./scripts/package.sh --install # 打包并安装到 Cursor
#   ./scripts/package.sh --install-vscode # 打包并安装到 VSCode

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="/tmp/onlook-extension-build"
Vsix_OUTPUT="$EXT_DIR/onlook-local-0.1.0.vsix"

echo "=== Onlook Extension Package Script ==="

# 1. 编译
echo "[1/5] 编译 TypeScript..."
cd "$EXT_DIR"
npm run build

# 2. 清理临时目录
echo "[2/5] 准备临时打包目录..."
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# 3. 复制必要文件
echo "[3/5] 复制文件..."
cp -r "$EXT_DIR/dist" "$TMP_DIR/dist"
cp "$EXT_DIR/package.json" "$TMP_DIR/"
cp "$EXT_DIR/README.md" "$TMP_DIR/"

# 创建 .vscodeignore
cat > "$TMP_DIR/.vscodeignore" << 'EOF'
.vscode/**
src/**
tsconfig.json
EOF

# 4. 安装生产依赖并打包
echo "[4/5] 安装依赖并打包..."
cd "$TMP_DIR"
npm install --omit=dev --silent 2>/dev/null

# 初始化独立 git 仓库（vsce 需要）
git init -q
git add -A
git commit -m "build" -q

npx vsce package --allow-missing-repository 2>&1 | grep -v "^ WARNING"

# 5. 复制 .vsix 回项目目录
echo "[5/5] 复制 .vsix 文件..."
cp "$TMP_DIR/onlook-local-0.1.0.vsix" "$Vsix_OUTPUT"

# 清理
rm -rf "$TMP_DIR"

echo ""
echo "=== 打包完成 ==="
echo "输出文件: $Vsix_OUTPUT"
echo "大小: $(ls -lh "$Vsix_OUTPUT" | awk '{print $5}')"

# 可选：安装
if [ "$1" = "--install" ]; then
    echo ""
    echo "正在安装到 Cursor..."
    cursor --install-extension "$Vsix_OUTPUT" 2>/dev/null && echo "安装成功！请重启 Cursor。" || echo "安装失败，请手动安装: cursor --install-extension $Vsix_OUTPUT"
elif [ "$1" = "--install-vscode" ]; then
    echo ""
    echo "正在安装到 VSCode..."
    code --install-extension "$Vsix_OUTPUT" 2>/dev/null && echo "安装成功！请重启 VSCode。" || echo "安装失败，请手动安装: code --install-extension $Vsix_OUTPUT"
else
    echo ""
    echo "安装方式："
    echo "  Cursor:  cursor --install-extension $Vsix_OUTPUT"
    echo "  VSCode:  code --install-extension $Vsix_OUTPUT"
fi
