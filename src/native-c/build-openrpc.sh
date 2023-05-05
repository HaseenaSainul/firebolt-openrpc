#!/bin/bash
rm -rf build
cmake -B./build -S. -DSYSROOT_PATH=${SYSROOT_PATH} -DENABLE_TESTS="ON"
cmake --build ./build/
