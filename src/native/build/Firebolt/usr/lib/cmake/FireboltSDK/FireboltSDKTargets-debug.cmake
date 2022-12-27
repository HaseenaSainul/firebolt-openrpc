#----------------------------------------------------------------
# Generated CMake target import file for configuration "Debug".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "FireboltSDK::FireboltSDK" for configuration "Debug"
set_property(TARGET FireboltSDK::FireboltSDK APPEND PROPERTY IMPORTED_CONFIGURATIONS DEBUG)
set_target_properties(FireboltSDK::FireboltSDK PROPERTIES
  IMPORTED_LOCATION_DEBUG "${_IMPORT_PREFIX}/lib/libFireboltSDK.so.1.0.0"
  IMPORTED_SONAME_DEBUG "libFireboltSDK.so.1"
  )

list(APPEND _IMPORT_CHECK_TARGETS FireboltSDK::FireboltSDK )
list(APPEND _IMPORT_CHECK_FILES_FOR_FireboltSDK::FireboltSDK "${_IMPORT_PREFIX}/lib/libFireboltSDK.so.1.0.0" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
