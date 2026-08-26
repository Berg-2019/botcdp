#!/bin/bash
# =============================================================================
# Script de gerenciamento do sistema — BotCDP
# Liga, desliga, reinicia, reconstrói e mostra status/logs dos containers.
#
# Uso:
#   ./scripts/manage.sh <comando> [serviço]
#
# Comandos:
#   start       Sobe todos os containers (docker compose up -d)
#   stop        Para todos os containers, sem remover (docker compose stop)
#   down        Para e remove os containers (mantém volumes/dados)
#   restart     Reinicia [serviço] ou todos, sem rebuild (não aplica mudanças de código)
#   rebuild     Reconstrói a imagem de [serviço] (ou todos) e recria o container
#   status      Mostra o status dos containers
#   logs        Segue os logs de [serviço] (ou todos)
#   shell       Abre um shell dentro do container [serviço] (padrão: backend)
#   db          Abre um cliente mysql dentro do container do banco
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

SERVICES=(backend frontend mysql redis)

usage() {
  sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

is_known_service() {
  local svc="$1"
  for s in "${SERVICES[@]}"; do
    [ "$s" = "$svc" ] && return 0
  done
  return 1
}

wait_healthy() {
  local container="$1"
  local attempts="${2:-30}"
  for i in $(seq 1 "$attempts"); do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
      echo "   ✅ $container healthy"
      return 0
    fi
    echo "   Tentativa $i/$attempts — $container: $status"
    sleep 3
  done
  echo "   ⚠️  $container não ficou healthy a tempo — verifique com: ./scripts/manage.sh logs $container"
}

cmd_start() {
  echo "🚀 Ligando o sistema..."
  docker compose up -d
  echo ""
  echo "⏳ Aguardando banco e cache ficarem prontos..."
  wait_healthy botcdp-mysql-1
  wait_healthy botcdp-redis-1
  cmd_status
}

cmd_stop() {
  echo "⏹  Desligando o sistema (containers param, dados/volumes ficam intactos)..."
  docker compose stop
  cmd_status
}

cmd_down() {
  echo "⏹  Parando e removendo containers (volumes/dados são mantidos)..."
  docker compose down
}

cmd_restart() {
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    is_known_service "$svc" || { echo "❌ Serviço desconhecido: $svc (opções: ${SERVICES[*]})"; exit 1; }
    echo "🔁 Reiniciando $svc (sem rebuild — não aplica mudanças de código)..."
    docker compose restart "$svc"
  else
    echo "🔁 Reiniciando todos os containers (sem rebuild — não aplica mudanças de código)..."
    docker compose restart
  fi
  cmd_status
}

cmd_rebuild() {
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    is_known_service "$svc" || { echo "❌ Serviço desconhecido: $svc (opções: ${SERVICES[*]})"; exit 1; }
    echo "🔨 Reconstruindo e reiniciando $svc..."
    docker compose up -d --build "$svc"
  else
    echo "🔨 Reconstruindo e reiniciando todos os serviços com build (backend/frontend)..."
    docker compose up -d --build
  fi
  echo ""
  echo "⏳ Aguardando banco e cache ficarem prontos..."
  wait_healthy botcdp-mysql-1
  wait_healthy botcdp-redis-1
  cmd_status
}

cmd_status() {
  echo ""
  echo "📦 Status dos containers:"
  docker compose ps
}

cmd_logs() {
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    is_known_service "$svc" || { echo "❌ Serviço desconhecido: $svc (opções: ${SERVICES[*]})"; exit 1; }
    docker compose logs -f --tail=100 "$svc"
  else
    docker compose logs -f --tail=100
  fi
}

cmd_shell() {
  local svc="${1:-backend}"
  is_known_service "$svc" || { echo "❌ Serviço desconhecido: $svc (opções: ${SERVICES[*]})"; exit 1; }
  docker compose exec "$svc" sh
}

cmd_db() {
  docker compose exec mysql mysql \
    -u"${MYSQL_APP_USER:-botcdp_app}" \
    -p"${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD não definido no .env}" \
    "${MYSQL_DATABASE:-botcdp}"
}

COMMAND="${1:-}"
[ -n "$COMMAND" ] && shift || true

case "$COMMAND" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  down)    cmd_down ;;
  restart) cmd_restart "${1:-}" ;;
  rebuild) cmd_rebuild "${1:-}" ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${1:-}" ;;
  shell)   cmd_shell "${1:-}" ;;
  db)      cmd_db ;;
  *)       usage ;;
esac
