
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
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("SubscribeEvent"),
                             std::forward_as_tuple(&SubscribeEvent));

        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set UnKnown Method"),
                             std::forward_as_tuple(&SetUnKnownMethod));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set LifeCycle Close"),
                             std::forward_as_tuple(&SetLifeCycleClose));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set Discovery Policy"),
                             std::forward_as_tuple(&SetDiscoveryPolicy));

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

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
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

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
            printf("\nDeviceVersion :\n");
            PrintJsonObject(response->Variants());
        } else {
            printf("\nGet %s status = %d", method.c_str(), status);
        }

        return status;
    }

    class Policy : public WPEFramework::Core::JSON::Container {
    public:
        Policy(const Policy& copy) = delete;
        Policy()
            : WPEFramework::Core::JSON::Container()
            , EnableRecommendations(false)
            , ShareWatchHistory(false)
            , RememberWatchedPrograms(false)
        {
            Add(_T("enableRecommendations"), &EnableRecommendations);
            Add(_T("shareWatchHistory"), &ShareWatchHistory);
            Add(_T("rememberWatchedPrograms"), &RememberWatchedPrograms);
        }
        Policy& operator=(const Policy& RHS)
        {
            EnableRecommendations = RHS.EnableRecommendations;
            ShareWatchHistory = RHS.ShareWatchHistory;
            RememberWatchedPrograms = RHS.RememberWatchedPrograms;

            return (*this);
        }

        ~Policy() override = default;

    public:
        WPEFramework::Core::JSON::Boolean EnableRecommendations;
        WPEFramework::Core::JSON::Boolean ShareWatchHistory;
        WPEFramework::Core::JSON::Boolean RememberWatchedPrograms;
    };

    /* static */ uint32_t Tests::GetDiscoveryPolicy()
    {
        const string method = _T("discovery.policy");
        WPEFramework::Core::ProxyType<Policy> response;
        uint32_t status = FireboltSDK::Properties::Get(method, response);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
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

        EXPECT_NE(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Get %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetDiscoveryPolicy()
    {

        const string method = _T("discovery.policy");
        Policy policy;
        policy.EnableRecommendations = true;
        policy.ShareWatchHistory = false;
        policy.RememberWatchedPrograms = false;
        uint32_t status = FireboltSDK::Properties::Set(method, policy);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
            WPEFramework::Core::ProxyType<Policy> response;
            status = FireboltSDK::Properties::Get(method, response);
            printf("\nEnableRecommendations : %d, %s", response->EnableRecommendations.Value(), ((response->EnableRecommendations.Value() == policy.EnableRecommendations) ? "is same set" : "is not same set"));
            printf("\nShareWatchHistory : %d, %s", response->ShareWatchHistory.Value(), ((response->ShareWatchHistory.Value() == policy.ShareWatchHistory) ? "is same set" : "is not same set"));
            printf("\nRememberWatchedPrograms : %d, %s", response->ShareWatchHistory.Value(), ((response->ShareWatchHistory.Value() == policy.RememberWatchedPrograms) ? "is same set" : "is not same set"));

        } else {
            printf("\nGet %s status = %d\n", method.c_str(), status);
        }

        return status;


    }

    /* static */ uint32_t Tests::SetLifeCycleClose()
    {
        const string method = _T("lifecycle.close");
        JsonObject parameters;
        parameters["reason"] = "remoteButton";
        uint32_t status = FireboltSDK::Properties::Set(method, parameters);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetUnKnownMethod()
    {
        const string method = _T("set.unknownMethod");
        JsonObject parameters;
        uint32_t status = FireboltSDK::Properties::Set(method, parameters);

        EXPECT_NE(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    bool eventNotTriggered = true;
    static void deviceNameChangeCallback(const WPEFramework::Core::JSON::String& parameters)
    {
        printf("Received a new event: %s\n", parameters.Value().c_str());
        eventNotTriggered = false;
    }

    /* static */ uint32_t Tests::SubscribeEvent()
    {
        JsonObject parameters;
        bool response = false;

        const string eventName = _T("device.onNameChanged");
        uint32_t status = Properties::Register<WPEFramework::Core::JSON::String>(eventName, deviceNameChangeCallback, response);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", eventName.c_str(), status);
        } else {
            printf(" Yes registered = %d\n", response);
        }

        if (response == true) {
            eventNotTriggered = true;
            do {
            }  while(eventNotTriggered);
        }
        return status;
    }
}
