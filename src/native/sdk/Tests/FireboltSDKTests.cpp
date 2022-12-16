
#include "Module.h"
#include "FireboltSDKTests.h"
#include "SDKHeaders.h"

namespace WPEFramework {

ENUM_CONVERSION_BEGIN(::JsonValue::type)

    { JsonValue::type::EMPTY, _TXT("empty") },
    { JsonValue::type::BOOLEAN, _TXT("boolean") },
    { JsonValue::type::NUMBER, _TXT("number") },
    { JsonValue::type::STRING, _TXT("string") },

ENUM_CONVERSION_END(::JsonValue::type)

}
namespace FireboltSDK {
    Tests::Tests()
    {
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("SubscribeEventWithMultipleCallback"),
                             std::forward_as_tuple(&SubscribeEventWithMultipleCallback));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("SubscribeEvent"),
                             std::forward_as_tuple(&SubscribeEvent));

        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set UnKnown Method"),
                             std::forward_as_tuple(&SetUnKnownMethod));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set LifeCycle Close"),
                             std::forward_as_tuple(&SetLifeCycleClose));

        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get UnKnown Method"),
                             std::forward_as_tuple(&GetUnKnownMethod));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Discovery Policy"),
                             std::forward_as_tuple(&GetDiscoveryPolicy));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Device Version"),
                             std::forward_as_tuple(&GetDeviceVersion));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Device Id"),
                             std::forward_as_tuple(&GetDeviceId));
    }
    Tests::~Tests()
    {
        FireboltSDK::Accessor::Dispose();
    }

    /* static */ void Tests::PrintJsonObject(const JsonObject::Iterator& iterator)
    {
        JsonObject::Iterator index = iterator;
        while (index.Next() == true) {
            printf("Element [%s]: <%s> = \"%s\"\n",
            index.Label(),
            WPEFramework::Core::EnumerateType<JsonValue::type>(index.Current().Content()).Data(),
            index.Current().Value().c_str());
        }
    }

    /* static */ uint32_t Tests::GetDeviceId()
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

    /*static */ uint32_t Tests::GetDeviceVersion()
    {
        const string method = _T("device.version");
        WPEFramework::Core::ProxyType<JsonObject> response;
        uint32_t status = FireboltSDK::Properties::Get(method, response);

        EXPECT_EQ(status, Error::None);
        if (status == Error::None) {
            printf("\nDeviceVersion :\n");
            PrintJsonObject(response->Variants());
        } else {
            printf("\nGet %s status = %d", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::GetDiscoveryPolicy()
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

    /* static */ uint32_t Tests::GetUnKnownMethod()
    {
        const string method = _T("get.unknownMethod");
        WPEFramework::Core::ProxyType<JsonObject> response;
        uint32_t status = FireboltSDK::Properties::Get(method, response);

        EXPECT_NE(status, Error::None);
        if (status != Error::None) {
            printf("\n Get %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetLifeCycleClose()
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

    /* static */ uint32_t Tests::SetUnKnownMethod()
    {
        const string method = _T("set.unknownMethod");
        JsonObject parameters;
        uint32_t status = FireboltSDK::Properties::Set(method, parameters);

        EXPECT_NE(status, Error::None);
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
    /* static */ uint32_t Tests::SubscribeEvent()
    {
        const string eventName = _T("device.onNameChanged");
        const char* test = "deviceNameChangeCallback";
        const void* userdata = test;
        uint32_t id = 0;

        uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered successfully\n", __func__);
        }

        if (status == Error::None) {
            eventNotTriggered = true;
            do {
            }  while(eventNotTriggered);
        }
        EXPECT_EQ(Properties::Unregister(eventName, id), Error::None);

        return status;
    }

    template <typename CALLBACK>
    /* static */ uint32_t Tests::SubscribeEventForC(const string& eventName, CALLBACK& callbackFunc, const void* userdata, uint32_t& id)
    {
        uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, callbackFunc, userdata, id);

        printf("%s:%s:%d \n", __FILE__, __func__, __LINE__, status);
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

    /* static */ uint32_t Tests::SubscribeEventWithMultipleCallback()
    {
        const string eventName = _T("device.onNameChanged");
        const char* test = "deviceNameChangeCallback";
        const void* userdata = test;
        uint32_t id1 = 0, id2 = 0;

        eventNotTriggered = true;
        eventMultiEventNotTriggered = true;

        uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id1);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered successfully\n", __func__);
        }
        test = "deviceNameChangeMultipleCallback";
        userdata = test;

        status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeMultipleCallback, userdata, id2);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered second callback also successfully\n", __func__);
        }

        if (status == Error::None) {
            do {
            }  while(eventNotTriggered || eventMultiEventNotTriggered);
        }
        EXPECT_EQ(Properties::Unregister(eventName, id1), Error::None);
        EXPECT_EQ(Properties::Unregister(eventName, id2), Error::None);

        return status;
    }

    uint32_t Tests::Main()
    {
        FireboltSDK::Tests fireboltSDKTest;
        for (auto i = fireboltSDKTest.TestList().begin(); i != fireboltSDKTest.TestList().end(); i++) {
            EXECUTE(i->first.c_str(), i->second);
        }

        printf("TOTAL: %i tests; %i PASSED, %i FAILED\n", TotalTests, TotalTestsPassed, (TotalTests - TotalTestsPassed));

        return 0;
    }

}
extern "C" {

uint32_t test_firebolt_create_instance()
{
    FireboltSDK::Accessor::Instance();
}
uint32_t test_firebolt_dispose_instance()
{
    FireboltSDK::Accessor::Dispose();
}

uint32_t test_firebolt_main()
{
    return FireboltSDK::Tests::Main();
}

uint32_t test_properties_get_device_id()
{
    const string method = _T("device.id");
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response;
    uint32_t status = FireboltSDK::Properties::Get(method, response);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status == FireboltSDK::Error::None) {
        printf("\nDeviceId : %s", response->Value().c_str());
    } else {
        printf("\nGet %s status = %d\n", method.c_str(), status);
    }

    return status;
}

uint32_t test_properties_get_policy()
{
    const string method = _T("discovery.policy");
    WPEFramework::Core::ProxyType<FireboltSDK::Policy> response;
    uint32_t status = FireboltSDK::Properties::Get(method, response);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status == FireboltSDK::Error::None) {
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

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status != FireboltSDK::Error::None) {
        printf("\n Set %s status = %d\n", method.c_str(), status);
    }

    return status;
}

bool eventNotTriggeredFromC = true;
static void deviceNameChangeCallbackForC(const void* userData, WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response)
{
    printf("Received a new event--->: %s\n", response->Value().c_str());
    if (userData != nullptr) {
        printf("userData = %s\n", (const char*)userData);
    }
    eventNotTriggeredFromC = false;
}

uint32_t test_eventregister()
{
    JsonObject parameters;

    const string eventName = _T("device.onNameChanged");
    const char* test = "deviceNameChangeCallbackForC";
    const void* userdata = test;
    uint32_t id = 0;

    eventNotTriggeredFromC = true;
    uint32_t status = FireboltSDK::Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallbackForC, userdata, id);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status != FireboltSDK::Error::None) {
        printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
    } else {
        printf("%s Yes registered successfully\n", __func__);
    }

/*    if (status == FireboltSDK::Error::None) {
        do {
        }  while(eventNotTriggeredFromC);
    }*/
    EXPECT_EQ(FireboltSDK::Properties::Unregister(eventName, id), FireboltSDK::Error::None);

    return status;
}

uint32_t test_eventregister_by_providing_callback()
{
    const string eventName = _T("device.onNameChanged");
    const char* test = "deviceNameChangeCallbackForCWithCallbackParam";
    const void* userdata = test;
    uint32_t id = 0;

    eventNotTriggeredFromC = true;
    uint32_t status = FireboltSDK::Tests::SubscribeEventForC(eventName, deviceNameChangeCallbackForC, userdata, id);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status != FireboltSDK::Error::None) {
        printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
    } else {
        printf("%s Yes registered successfully\n", __func__);
    }

    /*if (status == FireboltSDK::Error::None) {
        do {
        }  while(eventNotTriggeredFromC);
    }*/
    EXPECT_EQ(FireboltSDK::Properties::Unregister(eventName, id), FireboltSDK::Error::None);
}

}
