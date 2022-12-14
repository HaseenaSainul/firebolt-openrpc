cmake_minimum_required(VERSION 3.3)

set(FIREBOLT_TRANSPORT_WAITTIME 1000 CACHE STRING "Maximum time to wait for Transport layer to get response")
option(ENABLE_TESTS "Build openrpc native test" OFF)

list(APPEND CMAKE_MODULE_PATH
	"${THUNDER_INSTALL_PATH}/usr/lib/cmake"
	"${THUNDER_INSTALL_PATH}/tools/cmake")
find_package(WPEFramework)

add_subdirectory(Source)

if (ENABLE_TESTS)
   add_subdirectory(Tests)
endif()

