
//#include "SDKHeaders.h"
#include <unistd.h>
//extern "C" {
//#include "FireboltSDKTests.h"
//}
uint32_t test_properties_get_device_id()
{
    const string method = _T("device.id");
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response;
    uint32_t status = FireboltSDK::Properties::Get(method, response);

    EXPECT_EQ(status, Error::None);
    if (status == Error::None) {
        printf("\nDeviceId : %s", response->Value().c_str());
    } else {
        printf("\nGet %s status = %d\n", method.c_str(), status);
    }

    return status;
}
#if 0
uint32_t test_properties_get_policy()
{
        const string method = _T("discovery.policy");
        WPEFramework::Core::ProxyType<Policy> response;
        uint32_t status = FireboltSDK::Properties::Get(method, response);

        EXPECT_EQ(status, Error::None);
        if (status == Error::None) {
            printf("\nEnableRecommendations : %d", response->EnableRecommendations.Value());
            printf("\nShareWatchHistory : %d", response->ShareWatchHistory.Value());
            printf("\nRememberWatchedPrograms : %d", response->RememberWatchedPrograms.Value());
        } else {
            printf("\nGet %s status = %d\n", method.c_str(), status);
        }

        return status;
    }


uint32_t test_properties_set()
{
    const string method = _T("lifecycle.close");
    JsonObject parameters;
    parameters["reason"] = "remoteButton";
    uint32_t status = FireboltSDK::Properties::Set(method, parameters);

    EXPECT_EQ(status, Error::None);
    if (status != Error::None) {
        printf("\n Set %s status = %d\n", method.c_str(), status);
    }

    return status;
}

bool eventNotTriggered = true;
static void deviceNameChangeCallback(const void* userData, WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response)
{
    printf("Received a new event: %s\n", response->Value().c_str());
    if (userData != nullptr) {
        printf("userData = %s\n", (const char*)userData);
    }
    eventNotTriggered = false;
}
uint32_t test_eventregister()
{
    JsonObject parameters;

    const string eventName = _T("device.onNameChanged");
    const char* test = "deviceNameChangeCallback";
    const void* userdata = test;
    uint32_t id = 0;

    uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id);

    EXPECT_EQ(status, Error::None);
    if (status != Error::None) {
        printf("\n Set %s status = %d\n", eventName.c_str(), status);
    } else {
        printf(" Yes registered successfully\n");
    }

    if (status == Error::None) {
        eventNotTriggered = true;
        do {
        }  while(eventNotTriggered);
    }
    EXPECT_EQ(Properties::Unregister(eventName, id), Error::None);

    return status;
}

bool eventMultiEventNotTriggered = true;
static void deviceNameChangeMultipleCallback(const void* userData, WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response)
{
    printf("Received a new event from deviceNameChangeMultipleCallback: %s\n", response->Value().c_str());
    if (userData != nullptr) {
        printf("userData = %s\n", (const char*)userData);
    }
    eventMultiEventNotTriggered = false;
}

uint32_t test_eventregister_with_multiple_callback()
{
    JsonObject parameters;

    const string eventName = _T("device.onNameChanged");
    const char* test = "deviceNameChangeCallback";
    const void* userdata = test;
    uint32_t id1 = 0, id2 = 0;

    uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id1);

    EXPECT_EQ(status, Error::None);
    if (status != Error::None) {
        printf("\n Set %s status = %d\n", eventName.c_str(), status);
    } else {
        printf(" Yes registered successfully\n");
    }
    test = "deviceNameChangeMultipleCallback";
    userdata = test;

    status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeMultipleCallback, userdata, id2);

    EXPECT_EQ(status, Error::None);
    if (status != Error::None) {
        printf("\n Set %s status = %d\n", eventName.c_str(), status);
    } else {
        printf(" Yes registered second also successfully\n");
    }

    if (status == Error::None) {
        eventNotTriggered = true;
        eventMultiEventNotTriggered = true;
        do {
        }  while(eventNotTriggered || eventMultiEventNotTriggered);
    }
    EXPECT_EQ(Properties::Unregister(eventName, id1), Error::None);
    EXPECT_EQ(Properties::Unregister(eventName, id2), Error::None);

    return status;
}
#endif
