#!/usr/bin/env bash
set -e 

# Helper script to update camera software, 
# support checking, downloading, and installation of the software. 

DEFAULT_URL="https://github.com/maoxuli/live-camera/releases"
echo "DEFAULT_URL: ${DEFAULT_URL}" 

UPDATES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
echo "UPDATE_DIR: ${UPDATES_DIR}" 

SOFTWARE_DIR="$(cd "${UPDATES_DIR}/.." && pwd)" 
echo "SOFTWARE_DIR: ${SOFTWARE_DIR}" 

# "1.1.1.1" is expanded to decimal number string "01010101"
# so each version element support two decimal digits in [0, 99]  
ver() {
    printf "%02d%02d%02d%02d" ${1//./ }
}

# download software versions file 
check_updates () {
    UPDATES_URL=${1:-$DEFAULT_URL}
    echo "Download software versions file from ${UPDATES_URL}"

    # check if the file exist
    VERSIONS=${2:-"versions.json"} 
    echo "Checking software versions file ${VERSIONS}"
    RESPONSE=$(curl --write-out '%{http_code}' --silent --output /dev/null "${UPDATES_URL}/${VERSIONS}")
    if [ ${STATUSCODE} -ne 200 ]; then
        echo "Failed checking software versions file: ${STATUSCODE}"
        return 1
    fi

    echo "Download software vesions file ${VERSIONS}"
    curl --output "${UPDATES_DIR}/${VERSIONS}" "${UPDATES_URL}/${VERSIONS}"

    if [ ! -f "${UPDATES_DIR}/${VERSIONS}" ]; then 
        echo "Failed download software versions file ${VERSIONS}" 
        return 2 
    fi 
    echo "Downloaded software versions file ${VERSIONS}"
} 

# download software package  
download_software () {
    UPDATES_URL=${1:-$DEFAULT_URL}
    echo "Download software package from ${UPDATES_URL}"

    VERSION=${2:-""}
    if [ -z "${VERSION}" ]; then 
        echo "Invalid software version ${VERSION}"
        return 1
    fi 

    PACKAGE="camera-${VERSION}.tar.xz" 
    echo "Checking software package ${PACKAGE}" 
    RESPONSE=$(curl --write-out '%{http_code}' --silent --output /dev/null "${UPDATES_URL}/${PACKAGE}")
    if [ ${STATUSCODE} -ne 200]; then
        echo "Failed checking software package: ${STATUSCODE}"
        return 2
    fi

    echo "Download software package ${PACKAGE}"
    curl --output "${UPDATES_DIR}/${PACKAGE}" "${UPDATES_URL}/${PACKAGE}"

    if [ ! -f "${UPDATES_DIR}/${PACKAGE}" ]; then 
        echo "Failed download software package ${PACKAGE}" 
        return 3 
    fi 
    echo "Downloaded software package ${PACKAGE}"
}

# install the downloaded software 
install_software () {
    VERSION=${1:-""}
    if [ -z "${VERSION}" ]; then 
        echo "Invalid software version ${VERSION}"
        return 1
    fi 

    PACKAGE="camera-${VERSION}.tar.xz" 
    if [ ! -f "${UPDATES_DIR}/${PACKAGE}" ]; then 
        echo "Unavailable software package ${PACKAGE}"
        return 2
    fi 

    echo "Prepare software package ${PACKAGE}" 
    tar -xzf "${UPDATES_DIR}/${PACKAGE}" -C "${UPDATES_DIR}" 
    if [ ! -d "${UPDATES_DIR}/camera" ]; then 
        echo "Failed prepare software package ${PACKAGE}" 
        return 3
    fi 

    if [ -d "${UPDATES_DIR}/network" ]; then 
        echo "Install network package" 
        rm -rf "${SOFTWARE_DIR}/network" 
        mv -f "${UPDATES_DIR}/network" "${SOFTWARE_DIR}/network" 
        bash "${SOFTWARE_DIR}/network/network-init.sh"     
    fi 

    if [ -d "${UPDATES_DIR}/system" ]; then 
        echo "Install system package" 
        rm -rf "${SOFTWARE_DIR}/system" 
        mv -f "${UPDATES_DIR}/system" "${SOFTWARE_DIR}/system" 
        bash "${SOFTWARE_DIR}/system/camera-init.sh"     
    fi 

    if [ -d "${UPDATES_DIR}/camera" ]; then 
        echo "Install camera package" 
        rm -rf "${SOFTWARE_DIR}/camera" 
        mv -f "${UPDATES_DIR}/camera" "${SOFTWARE_DIR}/camera"
    fi 

    echo "Installed software package ${PACKAGE}"
}

case "$1" in
  "") 
    echo "Usage: $(basename $0) {check|download|install}"
    exit 1
    ;;
  check) 
    shift 
    software_check "$@"
    ;;
  download) 
    shift 
    software_download "$@"
    ;;
  install) 
    shift 
    software_install "$@"
    ;;
  *) 
    echo "Unknown command: $(basename $0) $1"
    exit 2
    ;;
esac 
        