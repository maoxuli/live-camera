#!/usr/bin/env bash
set -e 

# Helper script to update the live camera software, 
# support checking, downloading, and installation of the software. 

VERSION_URL="https://raw.githubusercontent.com/maoxuli/live-camera/refs/heads/master"
echo "VERSION_URL: ${VERSION_URL}" 

PACKAGE_URL="https://github.com/maoxuli/live-camera/releases/download"
echo "PACKAGE_URL: ${PACKAGE_URL}" 

SOFTWARE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
echo "SOFTWARE_DIR: ${SOFTWARE_DIR}" 

UPDATES_DIR="$(cd "${SOFTWARE_DIR}/updates" && pwd)" 
echo "UPDATES_DIR: ${UPDATES_DIR}" 

VERSION_FILE="VERSION.txt"
echo "VERSION_FILE: ${VERSION_FILE}" 

# "1.1.1.1" is expanded to decimal number string "01010101"
# so each version element support two decimal digits in [0, 99]  
ver() {
    printf "%02d%02d%02d%02d" ${1//./ }
}

# download version file 
check_updates () {
    UPDATES_URL=${1:-$VERSION_URL}
    echo "Download version file from ${UPDATES_URL}"

    echo "Downloading vesion file ${UPDATES_URL}/${VERSION_FILE}"
    STATUS_CODE=$(curl -L --write-out '%{http_code}' --output "${UPDATES_DIR}/${VERSION_FILE}" "${UPDATES_URL}/${VERSION_FILE}")
    echo "STATUS_CODE: ${STATUS_CODE}" 
    if [ ${STATUS_CODE} -ne 200 ]; then
        echo "Failed downloading version file: ${STATUS_CODE}" >&2  
        rm -f "${UPDATES_DIR}/${VERSION_FILE}"
        return 1 
    fi 
    
    echo "Downloaded version file ${UPDATES_DIR}/${VERSION_FILE}" 
    source "${UPDATES_DIR}/${VERSION_FILE}" 
    echo "CURRENT_VERSION: ${CURRENT_VERSION}"
    echo "FALLBACK_VERSION: ${FALLBACK_VERSION}"
} 

# download software package  
download_software () {
    VERSION=${1:-""}
    if [ -z "${VERSION}" ]; then 
        echo "Not set software version" >&2
        return 1
    fi 
    echo "Download software version ${VERSION}"

    UPDATES_URL=${2:-$PACKAGE_URL}
    echo "Download software package from ${UPDATES_URL}"

    # only keep latest download 
    echo "Clean old software package(s) in ${UPDATES_DIR}" 
    rm -f "${UPDATES_DIR}"/live-camera-*.tar.xz

    PACKAGE="live-camera-${VERSION}.tar.xz" 
    echo "Downloading software package ${UPDATES_URL}/v${VERSION}/${PACKAGE}" 
    STATUS_CODE=$(curl -L --write-out '%{http_code}' --output "${UPDATES_DIR}/${PACKAGE}" "${UPDATES_URL}/v${VERSION}/${PACKAGE}")
    echo "STATUS_CODE: ${STATUS_CODE}" 
    if [ ${STATUS_CODE} -ne 200 ]; then
        echo "Failed downloading software package: ${STATUS_CODE}" >&2 
        rm -f "${UPDATES_DIR}/${PACKAGE}"
        return 2
    fi
    echo "Downloaded software package ${UPDATES_DIR}/${PACKAGE}"
}

# install the downloaded software 
install_software () {
    VERSION=${1:-""}
    if [ -z "${VERSION}" ]; then 
        echo "Not set software version" >&2
        return 1
    fi 
    echo "Install software version ${VERSION}"

    source "${SOFTWARE_DIR}/${VERSION_FILE}" 
    echo "CURRENT_VERSION: ${CURRENT_VERSION}" 
    if [ $(ver "${VERSION}") -eq $(ver "${CURRENT_VERSION}") ]; then 
        echo "Current version is already ${VERSION}" 
        return 0
    fi 

    PACKAGE="live-camera-${VERSION}.tar.xz" 
    if [ ! -f "${UPDATES_DIR}/${PACKAGE}" ]; then 
        download_software "$@" 
        if [ $? -ne 0 ]; then 
            echo "Error downloading software" >&2
            return 2
        fi 
    fi 

    echo "Prepare software package ${PACKAGE}" 
    VERSION_DIR="${UPDATES_DIR}/live-camera-${VERSION}" 
    mkdir -p "${VERSION_DIR}"
    tar -xf "${UPDATES_DIR}/${PACKAGE}" -C "${VERSION_DIR}" 
    if [ $? -ne 0 ]; then 
        echo "Failed prepare software package ${PACKAGE}" >&2
        return 3
    fi  

    if [ -d "${VERSION_DIR}/network" ]; then 
        echo "Install network package" 
        rm -rf "${SOFTWARE_DIR}/network" 
        mv -f "${VERSION_DIR}/network" "${SOFTWARE_DIR}/network" 
        bash "${SOFTWARE_DIR}/network/network-init.sh" 
    fi 

    if [ -d "${VERSION_DIR}/system" ]; then 
        echo "Install system package" 
        rm -rf "${SOFTWARE_DIR}/system" 
        mv -f "${VERSION_DIR}/system" "${SOFTWARE_DIR}/system" 
        bash "${SOFTWARE_DIR}/system/system-init.sh"     
    fi 

    if [ -d "${VERSION_DIR}/camera" ]; then 
        echo "Install camera package" 
        rm -rf "${SOFTWARE_DIR}/camera" 
        mv -f "${VERSION_DIR}/camera" "${SOFTWARE_DIR}/camera"
    fi 

    if [ -f "${VERSION_DIR}/updates.sh" ]; then 
        mv -f "${VERSION_DIR}/updates.sh" "${SOFTWARE_DIR}/updates.sh"
    fi 
    if [ -f "${VERSION_DIR}/VERSION.txt" ]; then 
        mv -f "${VERSION_DIR}/VERSION.txt" "${SOFTWARE_DIR}/VERSION.txt"
    fi 
    if [ -f "${VERSION_DIR}/CHANGES.md" ]; then 
        mv -f "${VERSION_DIR}/CHANGES.md" "${SOFTWARE_DIR}/CHANGES.md"
    fi 
    if [ -f "${VERSION_DIR}/README.md" ]; then 
        mv -f "${VERSION_DIR}/README.md" "${SOFTWARE_DIR}/README.md"
    fi 
    rm -rf "${VERSION_DIR}" 
    echo "Installed software package ${PACKAGE}"
}

case "$1" in
  "") 
    echo "Usage: $(basename $0) {check|download|install}"
    exit 1
    ;;
  check) 
    shift 
    check_updates "$@"
    ;;
  download) 
    shift 
    download_software "$@"
    ;;
  install) 
    shift 
    install_software "$@"
    ;;
  *) 
    echo "Unknown command: $(basename $0) $1"
    exit 2
    ;;
esac 
        