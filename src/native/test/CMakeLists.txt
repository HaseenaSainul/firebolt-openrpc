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

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Headers ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/FireboltTest
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/FireboltTest
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing CMakeConfigs ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET}Config*.cmake ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/Export/lib/cmake/${TARGET}/${TARGET}Targets*.cmake ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/pkgconfig
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Libraries ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/lib${FIREBOLT_NAMESPACE}SDKTests.a ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib
)


add_subdirectory(App)
