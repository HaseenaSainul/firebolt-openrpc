
#include "Module.h"
#include "Firebolt.h"
#include "FireboltSDKTests.h"

enum TestingEnum {
    Test1,
    Test2,
    Test3
};

namespace WPEFramework {

ENUM_CONVERSION_BEGIN(::JsonValue::type)

    { JsonValue::type::EMPTY, _TXT("empty") },
    { JsonValue::type::BOOLEAN, _TXT("boolean") },
    { JsonValue::type::NUMBER, _TXT("number") },
    { JsonValue::type::STRING, _TXT("string") },

ENUM_CONVERSION_END(::JsonValue::type)

ENUM_CONVERSION_BEGIN(TestingEnum)
    { TestingEnum::Test1, _TXT("test1") },
    { TestingEnum::Test2, _TXT("test2") },
    { TestingEnum::Test3, _TXT("test3") },
ENUM_CONVERSION_END(TestingEnum);

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

    static void deviceNameChangeCallback(const void* userData, void* response)
    {
        WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(response));
        printf("Received a new event: %s\n", jsonResponse->Value().c_str());
        jsonResponse.Release();
        FireboltSDK::Tests::EventControl* eventControl = reinterpret_cast<FireboltSDK::Tests::EventControl*>(const_cast<void*>(userData));
        eventControl->NotifyEvent();
    }

    /* static */ uint32_t Tests::SubscribeEvent()
    {
        FireboltSDK::Tests::EventControl* eventControl = new FireboltSDK::Tests::EventControl();
        const string eventName = _T("device.Name");
        const void* userdata = static_cast<void*>(eventControl);

        uint32_t id = 0;

        eventControl->ResetEvent();
        uint32_t status = Properties::Subscribe<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered successfully\n", __func__);
            eventControl->WaitForEvent(WPEFramework::Core::infinite);
        }

        EXPECT_EQ(Properties::Unsubscribe(eventName, id), Error::None);
        delete eventControl;

        return status;
    }

    template <typename CALLBACK>
    /* static */ uint32_t Tests::SubscribeEventForC(const string& eventName, CALLBACK& callbackFunc, const void* userdata, uint32_t& id)
    {
        uint32_t status = Properties::Subscribe<WPEFramework::Core::JSON::String>(eventName, callbackFunc, userdata, id);

        printf("%s:%s:%d \n", __FILE__, __func__, __LINE__, status);
        return status;
    }

    static void deviceNameChangeMultipleCallback(const void* userData, void* response)
    {
        WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(response));
        printf("Received a new event from deviceNameChangeMultipleCallback: %s\n", jsonResponse->Value().c_str());
        jsonResponse.Release();
        FireboltSDK::Tests::EventControl* eventControl = reinterpret_cast<FireboltSDK::Tests::EventControl*>(const_cast<void*>(userData));
        eventControl->NotifyEvent();
    }

    /* static */ uint32_t Tests::SubscribeEventWithMultipleCallback()
    {
        FireboltSDK::Tests::EventControl* eventControl = new FireboltSDK::Tests::EventControl();
        const string eventName = _T("device.Name");
        const void* userdata = static_cast<void*>(eventControl);
        uint32_t id1 = 0, id2 = 0;

        eventControl->ResetEvent();
        uint32_t status = Properties::Subscribe<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, userdata, id1);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered successfully\n", __func__);
            eventControl->WaitForEvent(WPEFramework::Core::infinite);
        }

        status = Properties::Subscribe<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeMultipleCallback, userdata, id2);

        EXPECT_EQ(status, Error::None);
        if (status != Error::None) {
            printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
        } else {
            printf("%s Yes registered second callback also successfully\n", __func__);
            eventControl->WaitForEvent(WPEFramework::Core::infinite);
        }

        EXPECT_EQ(Properties::Unsubscribe(eventName, id1), Error::None);
        EXPECT_EQ(Properties::Unsubscribe(eventName, id2), Error::None);

        delete eventControl;
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

#ifdef __cplusplus
extern "C" {
#endif

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

static void deviceNameChangeCallbackForC(const void* userData, void* response)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(response));
    printf("Received a new event--->: %s\n", jsonResponse->Value().c_str());
    jsonResponse.Release();

    FireboltSDK::Tests::EventControl* eventControl = reinterpret_cast<FireboltSDK::Tests::EventControl*>(const_cast<void*>(userData));
    eventControl->NotifyEvent();
}

uint32_t test_eventregister()
{
    FireboltSDK::Tests::EventControl* eventControl = new FireboltSDK::Tests::EventControl();
    JsonObject parameters;

    const string eventName = _T("device.Name");
    const void* userdata = static_cast<void*>(eventControl);
    uint32_t id = 0;

    eventControl->ResetEvent();
    uint32_t status = FireboltSDK::Properties::Subscribe<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallbackForC, userdata, id);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status != FireboltSDK::Error::None) {
        printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
    } else {
        printf("%s Yes registered successfully\n", __func__);
        eventControl->WaitForEvent(WPEFramework::Core::infinite);
    }

    delete eventControl;
    EXPECT_EQ(FireboltSDK::Properties::Unsubscribe(eventName, id), FireboltSDK::Error::None);

    return status;
}

uint32_t test_eventregister_by_providing_callback()
{
    FireboltSDK::Tests::EventControl* eventControl = new FireboltSDK::Tests::EventControl();

    const string eventName = _T("device.Name");
    const void* userdata = static_cast<void*>(eventControl);
    uint32_t id = 0;

    eventControl->ResetEvent();
    uint32_t status = FireboltSDK::Tests::SubscribeEventForC(eventName, deviceNameChangeCallbackForC, userdata, id);

    EXPECT_EQ(status, FireboltSDK::Error::None);
    if (status != FireboltSDK::Error::None) {
        printf("\n%s Set %s status = %d\n", __func__, eventName.c_str(), status);
    } else {
        printf("%s Yes registered successfully\n", __func__);
        eventControl->WaitForEvent(WPEFramework::Core::infinite);
    }

    delete eventControl;
    EXPECT_EQ(FireboltSDK::Properties::Unsubscribe(eventName, id), FireboltSDK::Error::None);
}

uint32_t test_enum_get_value()
{
    uint32_t status = FireboltSDK::Error::None;
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>> enumTest = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>>::Create();
    *enumTest = TestingEnum::Test2;
    WPEFramework::Core::ProxyType<Firebolt::EnumType> enumType = WPEFramework::Core::ProxyType<Firebolt::EnumType>::Create(enumTest->Data());
    enumTest.Release();
    
    void* handle = static_cast<void*>(&enumType);
    const char* name = FireboltTypes_Enum(handle);
    EXPECT_EQ(strncmp(name, enumType->Data().c_str(), enumType->Data().length()), 0);
    printf("\n ---> type name = %s\n", enumType->Data().c_str());

    enumType.Release();
    return status;
}

uint32_t test_enum_set_value()
{
    uint32_t status = FireboltSDK::Error::None;
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>> enumTest = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>>::Create();
    *enumTest = TestingEnum::Test3;
    WPEFramework::Core::ProxyType<Firebolt::EnumType> enumType = WPEFramework::Core::ProxyType<Firebolt::EnumType>::Create(enumTest->Data());
    void* handle = static_cast<void*>(&enumType);
    const char* name = FireboltTypes_Enum(handle);
    printf("\n ---> TestingEnum Name = %s\n", enumTest->Data());
    printf("\n ---> FireboltTypes_Enum = %s \n", name);
    printf("\n ---> Firebolt::EnumType name = %s\n", enumType->Data().c_str());

    EXPECT_EQ(strncmp(name, enumType->Data().c_str(), enumType->Data().length()), 0);

    *enumTest = TestingEnum::Test2;
    FireboltTypes_EnumHandle_SetValue(handle, enumTest->Data());
    enumTest.Release();

    name = FireboltTypes_Enum(handle);
    EXPECT_EQ(strncmp(name, enumType->Data().c_str(), enumType->Data().length()), 0);
    printf("\n ---> Firebolt::EnumType name = %s\n", enumType->Data().c_str());

    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>> enumTestFromFirebolt = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::EnumType<TestingEnum>>::Create();
    *enumTestFromFirebolt = WPEFramework::Core::EnumerateType<TestingEnum>(name).Value();
    printf("\n ---> TestingEnum Name = %s\n", enumTestFromFirebolt->Data());
    printf("\n ---> TestingEnum Value = %d\n", enumTestFromFirebolt->Value());
    EXPECT_EQ(strncmp(name, enumTestFromFirebolt->Data(), strlen(name)), 0);

    enumTestFromFirebolt.Release();
    enumType.Release();

    return status;
}

uint32_t test_string_set_get_value()
{
    uint32_t status = FireboltSDK::Error::None;
    FireboltTypes_StringHandle handle = FireboltTypes_StringHandle_Create();
    printf("%s:%s:%d handle = %p\n", __FILE__, __func__, __LINE__, handle);
    FireboltTypes_StringHandle_Addref(handle);

    const char* testString = "NewStringToJsonStringTesting";
    EXPECT_EQ(FireboltTypes_StringHandle_IsValid(handle), true);
    EXPECT_EQ(FireboltTypes_String_HasValue(handle), false);

    FireboltTypes_String_SetValue(handle, testString);
    EXPECT_EQ(FireboltTypes_StringHandle_IsValid(handle), true);
    EXPECT_EQ(FireboltTypes_String_HasValue(handle), true);
    const char* value = FireboltTypes_String(handle);
    EXPECT_EQ(strncmp(value,testString, strlen(testString)), 0);
    printf("\n ---> type name = %s %s\n", testString, value);

    FireboltTypes_String_ClearValue(handle);
    EXPECT_EQ(FireboltTypes_StringHandle_IsValid(handle), true);
    EXPECT_EQ(FireboltTypes_String_HasValue(handle), false);

    FireboltTypes_StringHandle_Release(handle);
    EXPECT_EQ(FireboltTypes_StringHandle_IsValid(handle), false);
    return status;
}
#ifdef __cplusplus
}
#endif
