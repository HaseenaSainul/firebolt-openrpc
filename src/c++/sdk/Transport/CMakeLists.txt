cmake_minimum_required(VERSION 3.3)

message("before ----> CMAKE_MODULE_PATH = " ${CMAKE_MODULE_PATH})
message("----> CMAKE_MODULE_PATH = " ${CMAKE_MODULE_PATH})
message("----> THUNDER_ROOT_PATH =" ${THUNDER_ROOT_PATH})
find_package(WPEFramework CONFIG REQUIRED)
project(Transport)
project_version(1.0.0)

set(TARGET ${PROJECT_NAME})

message("Setup ${TARGET} v${PROJECT_VERSION}")


set(CMAKE_POSITION_INDEPENDENT_CODE ON)
find_package(${NAMESPACE}Core CONFIG REQUIRED)
find_package(${NAMESPACE}COM CONFIG REQUIRED)

add_library(${TARGET} SHARED
	JsonRpcTransport.cpp
	Module.cpp
        )
target_link_libraries(${TARGET}
        PRIVATE
            ${NAMESPACE}Core::${NAMESPACE}Core
            ${NAMESPACE}COM::${NAMESPACE}COM
        )

set_target_properties(${TARGET} PROPERTIES
        CXX_STANDARD 11
        CXX_STANDARD_REQUIRED YES
        FRAMEWORK FALSE
        VERSION ${PROJECT_VERSION}
        SOVERSION ${PROJECT_VERSION_MAJOR}
        )

install(
        TARGETS ${TARGET}  EXPORT ${TARGET}Targets  # for downstream dependencies
        ARCHIVE DESTINATION lib COMPONENT libs      # static lib
        LIBRARY DESTINATION lib COMPONENT libs      # shared lib
        RUNTIME DESTINATION bin COMPONENT libs      # binaries
        FRAMEWORK DESTINATION bin COMPONENT libs    # for mac
        PUBLIC_HEADER DESTINATION include/${NAMESPACE}/websocket
        INCLUDES DESTINATION include/${NAMESPACE}   # default include path
)
