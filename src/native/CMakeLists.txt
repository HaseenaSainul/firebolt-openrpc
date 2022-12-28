cmake_minimum_required(VERSION 3.3)

project(Firebolt)

set(FIREBOLT_TRANSPORT_WAITTIME 1000 CACHE STRING "Maximum time to wait for Transport layer to get response")
set(FIREBOLT_LOGLEVEL "Info" CACHE STRING  "Log level to be enabled")

option(ENABLE_TESTS "Build openrpc native test" OFF)

list(APPEND CMAKE_MODULE_PATH
	"${SYSROOT_PATH}/usr/lib/cmake"
	"${SYSROOT_PATH}/tools/cmake")

if (NOT DEFINED CMAKE_PREFIX_PATH)
    set(CMAKE_PREFIX_PATH ${SYSROOT_PATH}/usr/lib/cmake CACHE INTERNAL "" FORCE)
endif()

set(FIREBOLT_NAMESPACE ${PROJECT_NAME} CACHE STRING "Namespace of the project")

find_package(WPEFramework CONFIG REQUIRED)

add_subdirectory(src)

if (ENABLE_TESTS)
   add_subdirectory(test)
endif()

# make sure others can make use cmake settings of Firebolt OpenRPC
configure_file( "${CMAKE_SOURCE_DIR}/cmake/project.cmake.in"
	"${CMAKE_CURRENT_BINARY_DIR}/${FIREBOLT_NAMESPACE}Config.cmake"
    @ONLY)


