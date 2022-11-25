cmake_minimum_required(VERSION 3.3)

project(Services)
set(TARGET ${PROJECT_NAME})
message("Setup ${TARGET} v${PROJECT_VERSION}")

set(OPENRPC_CONFIG_FILE "/root/config.json" CACHE STRING "configuration file for firebolt openrpc sdk information")

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(${TARGET} OBJECT Services.cpp)

find_package(${NAMESPACE}Core CONFIG REQUIRED)
target_link_libraries(${TARGET}
    PUBLIC
        ${NAMESPACE}Core::${NAMESPACE}Core
)

target_include_directories(${TARGET}
    PRIVATE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}/../>
)
set_target_properties(${TARGET} PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    FRAMEWORK FALSE
    LINK_WHAT_YOU_USE TRUE
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

