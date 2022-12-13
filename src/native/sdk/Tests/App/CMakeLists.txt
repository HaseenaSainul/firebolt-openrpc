cmake_minimum_required(VERSION 3.3)

project(FireboltSDKTestApp)
project_version(1.0.0)

set(TARGET ${PROJECT_NAME})

message("Setup ${TARGET} v${PROJECT_VERSION}")
find_package(${NAMESPACE}Core CONFIG REQUIRED)

add_executable(${TARGET} FireboltSDKTestsMain.c Module.cpp)

target_link_libraries(${TARGET}
    PRIVATE
       FireboltSDKTests
    PUBLIC
       ${NAMESPACE}Core::${NAMESPACE}Core
       FireboltSDK
)

target_include_directories(${TARGET}
    PRIVATE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}/../>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}/../../>
)
