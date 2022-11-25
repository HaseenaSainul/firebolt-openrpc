cmake_minimum_required(VERSION 3.3)

#set(THUNDER__PATH "/home/haseenasainul/thunder-repos/firebolt/firebolt-openrpc/thunder")
#set(CMAKE_PREFIX_PATH "${THUNDER_INSTALL_PATH}/usr/lib/cmake")
option(ENABLE_TESTS "Build openrpc native test" OFF)

list(APPEND CMAKE_MODULE_PATH
	"${THUNDER_INSTALL_PATH}/usr/lib/cmake"
	"${THUNDER_INSTALL_PATH}/tools/cmake")
find_package(WPEFramework)

project(OpenRPCNativeSDK)
project_version(1.0.0)
set(TARGET ${PROJECT_NAME})
message("Setup ${TARGET} v${PROJECT_VERSION}")

add_subdirectory(Transport)
add_subdirectory(Properties)
add_subdirectory(Services)
add_library(${TARGET} SHARED
    $<TARGET_OBJECTS:Transport>
    $<TARGET_OBJECTS:Services>
    $<TARGET_OBJECTS:Properties>
    Module.cpp)

find_package(${NAMESPACE}Core CONFIG REQUIRED)
find_package(${NAMESPACE}COM CONFIG REQUIRED)
find_package(${NAMESPACE}WebSocket CONFIG REQUIRED)
target_link_libraries(${TARGET}
    PUBLIC
        ${NAMESPACE}COM::${NAMESPACE}COM
        ${NAMESPACE}Core::${NAMESPACE}Core
        ${NAMESPACE}WebSocket::${NAMESPACE}WebSocket
)

set_target_properties(${TARGET} PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    FRAMEWORK FALSE
    LINK_WHAT_YOU_USE TRUE
    PUBLIC_HEADER "${PUBLIC_HEADERS}"
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

if (ENABLE_TESTS)
   add_subdirectory(Tests)
endif()

install(
    TARGETS ${TARGET} EXPORT ${TARGET}Targets
    LIBRARY DESTINATION lib COMPONENT libs
    PUBLIC_HEADER DESTINATION include/openrpc
    INCLUDES DESTINATION include/openrpc
)

InstallPackageConfig(TARGETS ${TARGET} DESCRIPTION "OpenRPCNative SDK Library")
include(Config.cmake)
