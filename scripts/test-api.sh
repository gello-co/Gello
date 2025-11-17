#!/usr/bin/env bash

set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000}
AUTH_TOKEN=${AUTH_TOKEN:-""}

function info() {
	printf '==> %s\n' "$*" >&2
}

function run_curl() {
	local method=$1
	local path=$2
	shift 2
	local url="$BASE_URL$path"
	local headers=(-H 'Content-Type: application/json')
	if [[ -n $AUTH_TOKEN ]]; then
		headers+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
	fi
	info "$method $url"
	curl -sS "${headers[@]}" -X "$method" "$url" "$@"
	printf '\n'
}

function require_id() {
	local id=$1
	local param_name=$2
	local command_name=$3

	if [[ -z "$id" ]]; then
		echo "Error: $command_name requires non-empty <$param_name>" >&2
		exit 1
	fi
}

function usage() {
	cat <<'EOF'
Manual API smoke tester for Gello backend.

Usage:
  ./scripts/test-api.sh <command> [options]

Environment:
  BASE_URL   Base http(s) endpoint (default: http://localhost:3000)
  AUTH_TOKEN JWT access token for protected routes

Commands:
  auth:login                - Log in with email/password (expects JSON body)
  auth:session              - Fetch current session
  teams:list                - List teams (manager/admin)
  teams:create              - Create a team (manager/admin)
  boards:list <teamId>      - List boards for a given team
  tasks:list <listId>       - List tasks inside a list
  tasks:create <listId>     - Create a task (reads JSON body from stdin)
  leaderboard               - Fetch leaderboard snapshot

Examples:
  AUTH_TOKEN=$(./scripts/test-api.sh auth:login '{"email":"ada.admin@example.com","password":"password"}' | jq -r '.token')
  ./scripts/test-api.sh teams:list | jq
EOF
}

command=${1:-""}
shift || true

case "$command" in
	auth:login)
		run_curl POST "/api/auth/login" --data "${1:-'{}'}"
		;;
	auth:session)
		run_curl GET "/api/auth/session"
		;;
	teams:list)
		run_curl GET "/api/teams"
		;;
	teams:create)
		run_curl POST "/api/teams" --data "${1:-'{}'}"
		;;
	boards:list)
		if [[ $# -lt 1 ]]; then
			echo "boards:list requires <teamId>" >&2
			exit 1
		fi
		require_id "$1" "teamId" "boards:list"
		run_curl GET "/api/teams/$1/boards"
		;;
	tasks:list)
		if [[ $# -lt 1 ]]; then
			echo "tasks:list requires <listId>" >&2
			exit 1
		fi
		require_id "$1" "listId" "tasks:list"
		run_curl GET "/api/lists/$1/tasks"
		;;
	tasks:create)
		if [[ $# -lt 1 ]]; then
			echo "tasks:create requires <listId>" >&2
			exit 1
		fi
		require_id "$1" "listId" "tasks:create"
		run_curl POST "/api/lists/$1/tasks" --data "${2:-'{}'}"
		;;
	leaderboard)
		run_curl GET "/api/leaderboard"
		;;
	""|-h|--help|help)
		usage
		;;
	*)
		echo "Unknown command: $command" >&2
		usage
		exit 1
		;;
esac

