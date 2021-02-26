#!/usr/bin/env bash
set -euxo pipefail

DIR=$(dirname $(cd -P "$(dirname "$BASH_SOURCE")"; pwd))"/"
ELECTRON_DIR=$(node ${DIR}.bin/download-electron.js)
ELECTRON_PLATFORM=$(printf "${ELECTRON_PLATFORM:-$(uname -s)}" | tr "[A-Z]" "[a-z]")
RESOURCES_PATH="resources/app/"
if [ ${ELECTRON_PLATFORM} == "darwin" ]; then
	RESOURCES_PATH="Electron.app/Contents/Resources/app/"
fi

DIST_ELECTRON="${DIR}dist/electron/"
DIST_RESOURCES="${DIST_ELECTRON}${RESOURCES_PATH}"

rm -r "${DIST_ELECTRON}" || true
cp -r "${ELECTRON_DIR}" "${DIST_ELECTRON}"

mkdir -p "${DIST_RESOURCES}dist"
cp -r "${DIR}dist/main" "${DIST_RESOURCES}dist/main"
cp -r "${DIR}dist/renderer" "${DIST_RESOURCES}dist/renderer"
cp -r "${DIR}dist/node" "${DIST_RESOURCES}dist/node"

cp "${DIR}package.json" "${DIST_RESOURCES}package.json"
