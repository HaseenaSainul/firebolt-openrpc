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
#if 0
uint32_t test_eventregister_with_multiple_callback();
#endif

#ifdef __cplusplus
}
#endif
