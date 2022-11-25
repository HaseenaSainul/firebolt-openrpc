cmake_minimum_required(VERSION 3.3)

project(Properties)

set(TARGET ${PROJECT_NAME})

message("Setup ${TARGET} v${PROJECT_VERSION}")


set(CMAKE_POSITION_INDEPENDENT_CODE ON)
find_package(${NAMESPACE}Core CONFIG REQUIRED)
find_package(${NAMESPACE}COM CONFIG REQUIRED)
find_package(${NAMESPACE}WebSocket CONFIG REQUIRED)

add_library(${TARGET} OBJECT Properties.cpp)

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
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

