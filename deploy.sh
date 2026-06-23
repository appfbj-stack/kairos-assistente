#!/bin/bash
# =============================================================
# Kairos Assistente - Script de Deploy Completo
# Executa no VPS: bash deploy.sh
# =============================================================
set -e

REPO_DIR="/root/kairos-assistente"
CADDY_FILE="/etc/caddy/Caddyfile"

echo "======================================================"
echo "  KAIROS ASSISTENTE - DEPLOY"
echo "======================================================"

# 1. Pull do GitHub
echo ""
echo "[1/5] Atualizando codigo do GitHub..."
cd "$REPO_DIR"
git pull origin main
echo "OK - codigo atualizado"

# 2. Rebuild e restart dos containers
echo ""
echo "[2/5] Rebuilding containers Docker..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
echo "OK - containers rodando"

# 3. Verifica saude dos containers
echo ""
echo "[3/5] Verificando containers..."
sleep 5
docker compose ps
echo "OK"

# 4. Atualiza Caddyfile com novo dominio
echo ""
echo "[4/5] Atualizando Caddyfile..."
cp "$REPO_DIR/Caddyfile" "$CADDY_FILE"
systemctl reload caddy
echo "OK - Caddy recarregado com dominio assistentetop.fbautomacao.space"

# 5. Verifica dominio
echo ""
echo "[5/5] Verificando dominios..."
curl -s -o /dev/null -w "admin.fbautomacao.space: %{http_code}\n" https://admin.fbautomacao.space
curl -s -o /dev/null -w "assistentetop.fbautomacao.space: %{http_code}\n" https://assistentetop.fbautomacao.space

echo ""
echo "======================================================"
echo "  DEPLOY CONCLUIDO!"
echo ""
echo "  Painel Admin:  https://admin.fbautomacao.space"
echo "  Chat IA:       https://assistentetop.fbautomacao.space/assistente/{slug}"
echo "======================================================"
