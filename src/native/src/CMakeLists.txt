cmake_minimum_required(VERSION 3.3)

project(FireboltSDK)
project_version(1.0.0)
set(TARGET ${PROJECT_NAME})
message("Setup ${TARGET} v${PROJECT_VERSION}")

add_library(${TARGET} SHARED
    Types.cpp
    Module.cpp
    Logger/Logger.cpp
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
        $<BUILD_INTERFACE:${GENERATED_CODE_PATH}/include/
        $<BUILD_INTERFACE:${CMAKE_CURRENT_LIST_DIR}>
)

set_target_properties(${TARGET} PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    FRAMEWORK FALSE
    LINK_WHAT_YOU_USE TRUE
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

install(
    TARGETS ${TARGET} EXPORT ${TARGET}Targets
    LIBRARY DESTINATION lib COMPONENT libs
     PUBLIC_HEADER DESTINATION include/${FIREBOLT_NAMESPACE} COMPONENT devel   # headers for mac (note the different component -> different package)
        INCLUDES DESTINATION include/${FIREBOLT_NAMESPACE} # headers
)

InstallCMakeConfig(TARGETS ${TARGET})
InstallPackageConfig(TARGETS ${TARGET} DESCRIPTION "Firebolt SDK Library")

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Headers ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Accessor
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Accessor/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Accessor
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Transport
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Transport/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Transport
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Event
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Event/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Event
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Properties
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_LIST_DIR}/Properties/*.h ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/include/${FIREBOLT_NAMESPACE}/Properties
)
add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing Libraries ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so.${PROJECT_VERSION} ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib
    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so.${PROJECT_VERSION_MAJOR}" -D "DESTINATION=${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib" -P ${CMAKE_SOURCE_DIR}/cmake/CopySymlink.cmake
    COMMAND ${CMAKE_COMMAND} -D "LIBRARY=${CMAKE_BINARY_DIR}/Release/lib${TARGET}.so" -D "DESTINATION=${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib" -P ${CMAKE_CURRENT_SOURCE_DIR}/cmake/CopySymlink.cmake
...
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing CMakeConfigs ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET}Config*.cmake ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/Export/lib/cmake/${TARGET}/${TARGET}Targets*.cmake ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${TARGET}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/pkgconfig
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.pc ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/pkgconfig
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing JsonConfig ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/etc/${FIREBOLT_NAMESPACE}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/config/${TARGET}.json ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/etc/${FIREBOLT_NAMESPACE}/config.json
)

add_custom_command(
    TARGET ${TARGET}
    POST_BUILD
    COMMENT "=================== Installing FireboltConfig ======================"
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${FIREBOLT_NAMESPACE}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}Config.cmake ${CMAKE_BINARY_DIR}/${FIREBOLT_NAMESPACE}/usr/lib/cmake/${FIREBOLT_NAMESPACE}
)


include(Config.cmake)
