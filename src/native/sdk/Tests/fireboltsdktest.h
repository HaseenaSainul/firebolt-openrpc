#pragma once

#include "Tests.h"

#ifdef __cplusplus
extern "C" {
#endif

uint32_t test_firebolt_create_instance();
uint32_t test_firebolt_dispose_instance();

uint32_t test_firebolt_main();
uint32_t test_properties_get_device_id();
uint32_t test_properties_get_policy();
uint32_t test_properties_set();
uint32_t test_eventregister();
uint32_t test_eventregister_by_providing_callback();
uint32_t test_enum_get_value();
uint32_t test_enum_set_value();
uint32_t test_string_set_get_value();

#ifdef __cplusplus
}
#endif
