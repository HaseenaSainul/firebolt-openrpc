#include "fireboltsdktest.h"

int __cnt = 0;
int __pass = 0;

int TotalTests = 0;
int TotalTestsPassed = 0;

int main()
{
    test_firebolt_create_instance();
    test_firebolt_main();

    // Calling C function sequences
    printf("%s:%s:%d Calling C function tests\n", __FILE__, __func__, __LINE__);
    EXECUTE("test_properties_get_device_id", test_properties_get_device_id);
    EXECUTE("test_properties_get_policy", test_properties_get_policy);
    EXECUTE("test_properties_set", test_properties_set);
    EXECUTE("test_eventregister_by_providing_callback", test_eventregister_by_providing_callback);
    EXECUTE("test_eventregister", test_eventregister);
    EXECUTE("test_string_set_get_value", test_string_set_get_value);

    test_firebolt_dispose_instance();

    printf("TOTAL: %i tests; %i PASSED, %i FAILED\n", TotalTests, TotalTestsPassed, (TotalTests - TotalTestsPassed));
}

