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
        ${FIREBOLT_NAMESPACE}SDK
)

target_include_directories(${TARGET}
    PRIVATE
    $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/src>
)

set_target_properties(${TARGET} PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    LINK_WHAT_YOU_USE TRUE
    FRAMEWORK FALSE
)

install(
    TARGETS ${TARGET} EXPORT ${TARGET}Targets
    LIBRARY DESTINATION lib COMPONENT libs
     PUBLIC_HEADER DESTINATION include/${FIREBOLT_NAMESPACE}Test COMPONENT devel   # headers for mac (note the different component -> different package)
        INCLUDES DESTINATION include/${FIREBOLT_NAMESPACE}Test # headers
)

InstallCMakeConfig(TARGETS ${TARGET})
InstallCMakeConfigs(TARGET ${TARGET} DESTINATION ${FIREBOLT_NAMESPACE})
InstallHeaders(TARGET ${TARGET} HEADERS . NAMESPACE ${FIREBOLT_NAMESPACE} DESTINATION FireboltTest)
InstallLibraries(TARGET ${TARGET} LIBRARIES ${TARGET} DESTINATION ${FIREBOLT_NAMESPACE})

add_subdirectory(App)
