#!/bin/bash

export THUNDER_ROOT="`pwd`"
# Export and create thunder install path if not exist
export THUNDER_INSTALL_DIR="${THUNDER_ROOT}/../../../firebolt/"
mkdir -p ${THUNDER_INSTALL_DIR}

ThunderToolsPath=src/ThunderTools
ThunderFlags="-DMESSAGING=ON"
if [ ! -d "${ThunderToolsPath}" ]; then
ThunderToolsPath=src/Thunder/Tools
ThunderFlags="-DMESSAGING=OFF -DWEBSOCKET=ON -DTRACING=ON"
fi

if [ ! -d "${THUNDER_ROOT}/build/ThunderTools" ]; then
echo "Build tools"
# Build and install tools
cmake -H${ThunderToolsPath} -Bbuild/ThunderTools \
      -DCMAKE_INSTALL_PREFIX=${THUNDER_INSTALL_DIR}/usr \
      -DCMAKE_MODULE_PATH=${THUNDER_INSTALL_DIR}/tools/cmake \
      -DGENERIC_CMAKE_MODULE_PATH=${THUNDER_INSTALL_DIR}/tools/cmake
make -C build/ThunderTools && make -C build/ThunderTools install
fi
if [ ! -d "${THUNDER_ROOT}/build/Thunder" ]; then
echo "building thunder----"
# Build and install Thunder
cmake -Hsrc/Thunder -Bbuild/Thunder \
      -DCMAKE_INSTALL_PREFIX=${THUNDER_INSTALL_DIR}/usr \
      -DCMAKE_MODULE_PATH=${THUNDER_INSTALL_DIR}/tools/cmake \
      -DCMAKE_BUILD_TYPE=Debug -DBINDING=127.0.0.1 -DPORT=55555 -DENABLE_CODE_COVERAGE=no -DHIDE_NON_EXTERNAL_SYMBOLS=OFF ${ThunderFlags} -DBUILD_LIB_AS_STATIC=OFF -DPROCESS=OFF -DPLUGINS=OFF -DEXECUTABLE=OFF -DCOM=OFF
fi

make -C build/Thunder && make -C build/Thunder install
