#!/usr/bin/env bash
# Back up an EXISTING WebAppECloud Docker/Dockploy installation.
# Intended for the Docker HOST, not for GitHub Actions or the app container.
# This script does NOT change source, containers, databases or deployment settings.
set -Eeuo pipefail
umask 077

fail(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info(){ printf '%s\n' "$*"; }

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
WebAppECloud read-only backup for a Dockploy Docker HOST.

Required, set only in your private SSH session:
  APP_CONTAINER=<running WebAppECloud app container>
  DB_CONTAINER=<running database container currently serving this app>
  DB_ENGINE=mariadb|mysql|postgresql
  BACKUP_DIR=<private absolute directory outside Docker and public websites>
  CONFIRM_DB_MATCH=yes

Confirm manually that DB_CONTAINER is the database used by APP_CONTAINER.
Works only when the database runs in a local Docker container exposing
MARIADB_USER/MARIADB_PASSWORD/MARIADB_DATABASE (MariaDB/MySQL) or
POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB (PostgreSQL).

The script backs up the database logically, plus /app/.runtime from the
running app, with hashes and archive-integrity checks. It does NOT prove
that a full database restore succeeds; restore into isolated staging to verify.
NEVER publish or commit the resulting backups; they contain SQL secrets and
the application's installation configuration.
EOF
  exit 0
fi

for bin in docker tar gzip sha256sum mktemp date; do
  command -v "$bin" >/dev/null 2>&1 || fail "Falta el comando $bin."
done
[[ -n "${APP_CONTAINER:-}" ]] || fail "Especifica APP_CONTAINER."
[[ -n "${DB_CONTAINER:-}" ]] || fail "Especifica DB_CONTAINER."
[[ -n "${BACKUP_DIR:-}" ]] || fail "Especifica BACKUP_DIR."
[[ "${BACKUP_DIR:0:1}" == "/" ]] || fail "BACKUP_DIR debe ser una ruta absoluta."
[[ "$BACKUP_DIR" != "/" ]] || fail "No guardes respaldos en la raíz del disco."
[[ "${CONFIRM_DB_MATCH:-}" == "yes" ]] || fail "Primero confirma qué contenedor SQL atiende a esta app. Usa CONFIRM_DB_MATCH=yes."
[[ "$APP_CONTAINER" != "$DB_CONTAINER" ]] || fail "App y SQL deben ser contenedores diferentes."
case "${DB_ENGINE:-}" in
  mariadb|mysql|postgresql) ;;
  *) fail "DB_ENGINE debe ser mariadb, mysql o postgresql.";;
esac

docker inspect -f '{{.State.Running}}' "$APP_CONTAINER" | grep -qx true || fail "El contenedor app no está ejecutándose."
docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" | grep -qx true || fail "El contenedor de base de datos no está ejecutándose."

app_mount="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/.runtime"}}{{.Type}}:{{.Source}}{{end}}{{end}}' "$APP_CONTAINER")"
[[ -n "$app_mount" ]] || fail "No hay volumen persistente montado en /app/.runtime. Detener lanzamiento hasta corregirlo."
case "$DB_ENGINE" in
  postgresql) db_path="/var/lib/postgresql/data";;
  *) db_path="/var/lib/mysql";;
esac
db_mount="$(docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$db_path\"}}{{.Type}}:{{.Source}}{{end}}{{end}}" "$DB_CONTAINER")"
[[ -n "$db_mount" ]] || fail "No se detecta almacenamiento persistente SQL en $db_path. Revisar antes del lanzamiento."

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" || fail "No se pudo proteger BACKUP_DIR."
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d "$BACKUP_DIR/.webappecloud-$stamp.XXXXXXXX")"
cleanup(){ [[ ! -d "${work:-}" ]] || rm -rf "$work"; }
trap cleanup EXIT
trap 'fail "Respaldo interrumpido o incompleto."' ERR

info "Respaldando SQL (sin imprimir contraseñas)..."
case "$DB_ENGINE" in
  mariadb|mysql)
    docker exec "$DB_CONTAINER" sh -eu -c '
      export MYSQL_PWD="${MARIADB_PASSWORD:?Variable MARIADB_PASSWORD no disponible}"
      exec mariadb-dump --single-transaction --quick --routines --events --triggers --hex-blob \
       -u "${MARIADB_USER:?}" "${MARIADB_DATABASE:?}"
    ' | gzip -9 > "$work/database.sql.gz"
    gzip -t "$work/database.sql.gz" || fail "Copia SQL dañada."
    [[ -s "$work/database.sql.gz" ]] || fail "El volcado SQL está vacío."
    ;;
  postgresql)
    docker exec "$DB_CONTAINER" sh -eu -c '
      export PGPASSWORD="${POSTGRES_PASSWORD:?Variable POSTGRES_PASSWORD no disponible}"
      exec pg_dump --format=custom -U "${POSTGRES_USER:?}" "${POSTGRES_DB:?}"
    ' > "$work/database.pgdump"
    [[ -s "$work/database.pgdump" ]] || fail "El volcado PostgreSQL está vacío."
    # pg_restore is available on the official PostgreSQL image.
    docker exec -i "$DB_CONTAINER" sh -ceu 'pg_restore --list /dev/stdin >/dev/null' < "$work/database.pgdump" \
      || fail "El volcado PostgreSQL no puede listar su contenido."
    ;;
esac

info "Copiando archivos persistentes privados..."
# docker cp copies the mounted /app/.runtime subtree, including page-images.
# Use a maintenance window if clients may currently be writing content.
docker cp "$APP_CONTAINER:/app/.runtime" "$work/runtime" || fail "No se pudo copiar el volumen de la aplicación."
[[ -d "$work/runtime" ]] || fail "No se copió /app/.runtime."
tar -C "$work" -czf "$work/runtime.tar.gz" runtime
tar -tzf "$work/runtime.tar.gz" >/dev/null || fail "Archivo de configuración/medios inválido."
rm -rf "$work/runtime"

# Do not expose credentials or installation.json in logs/manifest.
{
  printf 'UTC=%s\n' "$(date -u +%FT%TZ)"
  printf 'DatabaseEngine=%s\n' "$DB_ENGINE"
  printf 'AppMountPresent=yes\nDatabaseMountPresent=yes\n'
  printf 'AppContainerIdentified=yes\nDatabaseContainerIdentified=yes\n'
  printf 'DatabaseIdentity=confirmed-by-operator\n'
  printf 'RestoreTest=NOT_PERFORMED\n'
} > "$work/manifest.txt"
(
  cd "$work"
  sha256sum database.* runtime.tar.gz manifest.txt > SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)
chmod 700 "$work"
chmod 600 "$work"/*

final="$BACKUP_DIR/webappecloud-$stamp"
[[ ! -e "$final" ]] || fail "Destino $final ya existe."
mv "$work" "$final"
trap - EXIT
info "RESPALDO CREADO: $final"
info "Hashes verificados. TODAVÍA SE REQUIERE UNA PRUEBA DE RESTAURACIÓN en staging."
info "Cifra y copia el respaldo fuera del servidor antes de aprobar producción."
