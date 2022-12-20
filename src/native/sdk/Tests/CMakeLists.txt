cmake_minimum_required(VERSION 3.3)

project(FireboltSDKTests)
project_version(1.0.0)

set(TARGET ${PROJECT_NAME})

message("Setup ${TARGET} v${PROJECT_VERSION}")

set(CMAKE_POSITION_INDEPENDENT_CODE ON)
find_package(${NAMESPACE}Core CONFIG REQUIRED)

add_library(${TARGET} STATIC FireboltSDKTests.cpp)

target_link_libraries(${TARGET}
    PUBLIC
        ${NAMESPACE}Core::${NAMESPACE}Core
        FireboltSDK
)

target_include_directories(${TARGET}
    PRIVATE
    $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/Source>
)

set_target_properties(${TARGET} PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    LINK_WHAT_YOU_USE TRUE
    FRAMEWORK FALSE
)

add_subdirectory(App)
