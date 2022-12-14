cmake_minimum_required(VERSION 3.3)

project(FireboltSDK)
project_version(1.0.0)
set(TARGET ${PROJECT_NAME})
message("Setup ${TARGET} v${PROJECT_VERSION}")

add_library(${TARGET} SHARED
    Transport/Transport.cpp
    Accessor/Accessor.cpp
    Event/Event.cpp
    Module.cpp)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)
find_package(${NAMESPACE}Core CONFIG REQUIRED)
find_package(${NAMESPACE}COM CONFIG REQUIRED)
find_package(${NAMESPACE}WebSocket CONFIG REQUIRED)
target_link_libraries(${TARGET}
    PUBLIC
        ${NAMESPACE}COM::${NAMESPACE}COM
        ${NAMESPACE}Core::${NAMESPACE}Core
        ${NAMESPACE}WebSocket::${NAMESPACE}WebSocket
)

target_include_directories(${TARGET}
    PRIVATE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}>
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

install(
    TARGETS ${TARGET} EXPORT ${TARGET}Targets
    LIBRARY DESTINATION lib COMPONENT libs
    PUBLIC_HEADER DESTINATION include/openrpc
    INCLUDES DESTINATION include/openrpc
)

InstallPackageConfig(TARGETS ${TARGET} DESCRIPTION "Firebolt SDK Library")

include(Config.cmake)
