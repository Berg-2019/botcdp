#!/bin/bash
# =============================================================================
# Script de deploy com senhas seguras — BotCDP
# Executa: parar, remover volume MySQL, rebuild e restart
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Carrega as credenciais reais do .env (nunca hardcode senha neste script)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "============================================="
echo "  BotCDP — Deploy com Senhas Seguras"
echo "============================================="

# 1. Parar todos os containers
echo ""
echo "⏹  Parando containers..."
docker compose down --timeout 30

# 2. Remover volume MySQL antigo (ATENÇÃO: apaga dados!)
echo ""
echo "🗑  Removendo volume MySQL antigo (senhas desatualizadas)..."
docker volume rm botcdp_mysql_data 2>/dev/null || echo "   Volume já removido ou não existe."

# 3. Rebuild das imagens (backend + frontend)
echo ""
echo "🔨 Reconstruindo imagens (backend com dist atualizado + frontend)..."
docker compose build --no-cache

# 4. Subir tudo
echo ""
echo "🚀 Subindo containers..."
docker compose up -d

# 5. Aguardar MySQL ficar healthy
echo ""
echo "⏳ Aguardando MySQL ficar healthy..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' botcdp-mysql-1 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ MySQL healthy!"
    break
  fi
  echo "   Tentativa $i/30 — status: $STATUS"
  sleep 5
done

# 6. Aguardar backend subir
echo ""
echo "⏳ Aguardando backend..."
for i in $(seq 1 20); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/api/ 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" != "000" ]; then
    echo "   ✅ Backend respondendo (HTTP $HTTP_CODE)"
    break
  fi
  echo "   Tentativa $i/20..."
  sleep 3
done

# 6.1 Reseed — só roda se a tabela Users estiver vazia (volume acabou de ser
# apagado no passo 2). Nunca reseeda um banco que já tem usuários reais.
echo ""
echo "🌱 Verificando se precisa reseedar dados padrão..."
USER_COUNT=$(docker exec botcdp-mysql-1 mysql -u"${MYSQL_APP_USER:-botcdp_app}" -p"${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD não definido no .env}" "${MYSQL_DATABASE:-botcdp}" -N -e "SELECT COUNT(*) FROM Users;" 2>/dev/null || echo "-1")
if [ "$USER_COUNT" = "0" ]; then
  echo "   Tabela Users vazia — rodando seeds..."
  docker exec botcdp-backend-1 npx sequelize db:seed:all
  echo "   ✅ Seeds aplicados. Veja acima as senhas geradas para as contas padrão (só aparecem uma vez no log)."
else
  echo "   Users já tem $USER_COUNT registro(s) — pulando reseed."
fi

# 7. Verificações
echo ""
echo "============================================="
echo "  Verificações Finais"
echo "============================================="
echo ""
echo "📦 Containers:"
docker compose ps
echo ""
echo "🗄  Tabelas no banco:"
docker exec botcdp-mysql-1 mysql -u"${MYSQL_APP_USER:-botcdp_app}" -p"${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD não definido no .env}" "${MYSQL_DATABASE:-botcdp}" -e "SHOW TABLES;" 2>/dev/null || echo "   ⚠️  Verifique manualmente"
echo ""
echo "============================================="
echo "  ✅ Deploy concluído!"
echo "  Frontend: http://localhost:9001"
echo "  Backend:  http://localhost:9000/api/"
echo "============================================="
