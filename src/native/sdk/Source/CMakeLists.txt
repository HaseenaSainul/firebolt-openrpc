cmake_minimum_required(VERSION 3.3)

project(FireboltSDK)
project_version(1.0.0)
set(TARGET ${PROJECT_NAME})
message("Setup ${TARGET} v${PROJECT_VERSION}")

add_library(${TARGET} SHARED
    Types.cpp
    Module.cpp
    Transport/Transport.cpp
    Accessor/Accessor.cpp
    Event/Event.cpp)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)
find_package(${NAMESPACE}Core CONFIG REQUIRED)
find_package(${NAMESPACE}COM CONFIG REQUIRED)
find_package(${NAMESPACE}WebSocket CONFIG REQUIRED)
target_link_libraries(${TARGET}
    PUBLIC
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
)

InstallCMakeConfig(TARGETS ${TARGET})
InstallPackageConfig(TARGETS ${TARGET} DESCRIPTION "Firebolt SDK Library")

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Headers ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/*.h ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Accessor
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Accessor/*.h ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Accessor
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Transport
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Transport/*.h ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Transport
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Event
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Event/*.h ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Event
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Properties
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Properties/*.h ${CMAKE_BINARY_DIR}/${TARGET}/usr/include/FireboltSDK/Properties
)
add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Libraries ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so.${PROJECT_VERSION} ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib
    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so.${PROJECT_VERSION_MAJOR}" -D "DESTINATION=${CMAKE_BINARY_DIR}/${TARGET}/usr/lib" -P ${CMAKE_CURRENT_SOURCE_DIR}/cmake/CopySymlink.cmake
    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so" -D "DESTINATION=${CMAKE_BINARY_DIR}/${TARGET}/usr/lib" -P ${CMAKE_CURRENT_SOURCE_DIR}/cmake/CopySymlink.cmake
...
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing CMakeConfigs ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET}Config*.cmake ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/Export/lib/cmake/${TARGET}/${TARGET}Targets*.cmake ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib/pkgconfig
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.pc ${CMAKE_BINARY_DIR}/${TARGET}/usr/lib/pkgconfig
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing JsonConfig ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${TARGET}/etc/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/config/${TARGET}.json ${CMAKE_BINARY_DIR}/${TARGET}/etc/${TARGET}/config.json
)

include(Config.cmake)
