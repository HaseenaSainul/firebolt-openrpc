#!/bin/bash

ReleasePath=./build/sdk/native-c/release
rm -rf ${ReleasePath}
mkdir -p ${ReleasePath}
cp -ar ./src/native-c/src ${ReleasePath}
cp -ar ./src/native-c/include ${ReleasePath}
cp -ar ./src/native-c/cmake ${ReleasePath}
cp -ar ./src/native-c/test ${ReleasePath}
cp -a ./src/native-c/build-openrpc.sh ${ReleasePath}

cp -ar ./src/native-c/CMakeLists.txt ${ReleasePath}
