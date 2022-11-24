cmake_minimum_required(VERSION 3.3)
project(NativeSDK)

set(THUNDER_ROOT_PATH "/home/haseenasainul/thunder-repos/firebolt/firebolt-openrpc/thunder")

set(CMAKE_PREFIX_PATH "${THUNDER_ROOT_PATH}/install/usr/lib/cmake")
list(APPEND CMAKE_MODULE_PATH
     "${THUNDER_ROOT_PATH}/install/usr/lib/cmake"
     "${THUNDER_ROOT_PATH}/install/tools/cmake")

add_subdirectory(Transport)
