
set(SERVER_PORT 9998 CACHE STRING "The port of the server")
set(SERVER_ADDRESS "127.0.0.1" CACHE STRING "The address of the server")

    #[[ ================================ Add additional config above this line  ================================ ]]


find_package(ConfigGenerator REQUIRED)

write_config(
    SKIP_COMPARE
    SKIP_CLASSNAME
    SKIP_LOCATOR
    DISABLE_LEGACY_GENERATOR
    CUSTOM_PARAMS_WHITELIST "${CMAKE_CURRENT_LIST_DIR}/Params.config"
    INSTALL_PATH "${CMAKE_INSTALL_PREFIX}/../etc/"
    INSTALL_NAME "config.json"
)

