#----------------------------------------------------------------
# Generated CMake target import file for configuration "Debug".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "FireboltSDKTests::FireboltSDKTests" for configuration "Debug"
set_property(TARGET FireboltSDKTests::FireboltSDKTests APPEND PROPERTY IMPORTED_CONFIGURATIONS DEBUG)
set_target_properties(FireboltSDKTests::FireboltSDKTests PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_DEBUG "CXX"
  IMPORTED_LOCATION_DEBUG "${_IMPORT_PREFIX}/lib/libFireboltSDKTests.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS FireboltSDKTests::FireboltSDKTests )
list(APPEND _IMPORT_CHECK_FILES_FOR_FireboltSDKTests::FireboltSDKTests "${_IMPORT_PREFIX}/lib/libFireboltSDKTests.a" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
