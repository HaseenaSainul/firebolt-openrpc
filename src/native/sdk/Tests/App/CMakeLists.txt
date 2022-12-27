cmake_minimum_required(VERSION 3.3)

project(FireboltSDKTestApp)
project_version(1.0.0)

set(TARGET ${PROJECT_NAME})

message("Setup ${TARGET} v${PROJECT_VERSION}")

add_executable(${TARGET} FireboltSDKTestsMain.c Module.cpp)

target_link_libraries(${TARGET}
    PRIVATE
       FireboltSDKTests
)

target_include_directories(${TARGET}
    PRIVATE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}/../>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}/../../>
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing TestApp ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/bin
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET} ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/bin
)

