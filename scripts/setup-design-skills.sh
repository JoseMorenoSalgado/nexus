#!/usr/bin/env bash
# Development workspace only. Run with: bash scripts/setup-design-skills.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${CI:-}" == "true" || "${NODE_ENV:-}" == "production" ]]; then
  echo "Estas Skills son para el agente de desarrollo, no para producción/CI." >&2
  exit 1
fi
command -v node >/dev/null || { echo "Node.js 22+ es necesario"; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' || { echo "Usa Node.js 22 o superior."; exit 1; }

echo "Instalando Taste Skill v2 en el entorno de desarrollo..."
npx --yes skills@latest add Leonxlnx/taste-skill --skill design-taste-frontend -y

echo "Instalando las Skills de Emil Kowalski (UI y móvil)..."
npx --yes skills@latest add emilkowalski/skills --skill emil-design-eng -y
npx --yes skills@latest add emilkowalski/skills --skill mobile-native -y
npx --yes skills@latest add emilkowalski/skills --skill break-ui -y

echo "Instalando Impeccable para Codex en este proyecto..."
npx --yes impeccable@latest install --providers=codex --scope=project

echo "Instalación terminada. Reinicia el agente Codex y revisa/autoriza los hooks en /hooks."
echo "Después revisa PRODUCT.md, DESIGN.md y docs/APLICACION-SKILLS-UI.md."
