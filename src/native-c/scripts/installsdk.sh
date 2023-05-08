#!/bin/bash

ReleasePath=./build/sdk/native-c/firebolt-openrpc-native-sdk
rm -rf ${ReleasePath}
mkdir -p ${ReleasePath}
cp -ar ./src/native-c/src ${ReleasePath}
cp -ar ./src/native-c/include ${ReleasePath}
cp -ar ./src/native-c/cmake ${ReleasePath}

cp -ar ./src/native-c/CMakeLists.txt ${ReleasePath}
