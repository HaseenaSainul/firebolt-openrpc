
#include "Module.h"
#include "OpenRPCTests.h"
#include "SDKHeaders.h"

namespace WPEFramework {

ENUM_CONVERSION_BEGIN(::JsonValue::type)

    { JsonValue::type::EMPTY, _TXT("empty") },
    { JsonValue::type::BOOLEAN, _TXT("boolean") },
    { JsonValue::type::NUMBER, _TXT("number") },
    { JsonValue::type::STRING, _TXT("string") },

ENUM_CONVERSION_END(::JsonValue::type)

}
namespace OpenRPC {
    Tests::Tests()
    {
        WPEFramework::OpenRPC::Services::Instance().InitSDK();
        WPEFramework::OpenRPC::Services::Instance().CreateTransport("/openrpc", "appId=MyAppId");
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set UnKnown Method"),
                             std::forward_as_tuple(&SetUnKnownMethod));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set Metrics StopContent"),
                             std::forward_as_tuple(&SetMetricsStopContent));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Set LifeCycle Close"),
                             std::forward_as_tuple(&SetLifeCycleClose));

        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get UnKnown Method"),
                             std::forward_as_tuple(&GetUnKnownMethod));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Authentication Token"),
                             std::forward_as_tuple(&GetAuthenticationToken));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Device Version"),
                             std::forward_as_tuple(&GetDeviceVersion));
        _functionMap.emplace(std::piecewise_construct, std::forward_as_tuple("Get Device Id"),
                             std::forward_as_tuple(&GetDeviceId));
    }
    Tests::~Tests()
    {
        WPEFramework::OpenRPC::Services::Dispose();
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
        WPEFramework::OpenRPC::Properties properties;

        const string method = _T("device.id");
        WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String> response;
        uint32_t status = properties.Get(method, response, 1000);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
            printf("\nDeviceId : %s", response->Value().c_str());
        } else {
            printf("\nGet %s status = %d", method.c_str(), status);
        }

        return status;
    }

    /*static */ uint32_t Tests::GetDeviceVersion()
    {
        WPEFramework::OpenRPC::Properties properties;

        const string method = _T("device.version");
        WPEFramework::Core::ProxyType<JsonObject> response;
        uint32_t status = properties.Get(method, response, 1000);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
            printf("\nDeviceVersion :\n");
            PrintJsonObject(response->Variants());
        } else {
            printf("\nGet %s status = %d", method.c_str(), status);
        }

        return status;
    }

    /*static */ uint32_t Tests::GetAuthenticationToken()
    {
        WPEFramework::OpenRPC::Properties properties;

        JsonObject parameters;
        parameters["type"] = "device";

        const string method = _T("authentication.token");
        WPEFramework::Core::ProxyType<JsonObject> response;
        uint32_t status = properties.Get(method, parameters, response, 1000);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status == WPEFramework::Core::ERROR_NONE) {
            printf("\nAuthenticationToken :\n");
            PrintJsonObject(response->Variants());
        } else {
            printf("\nGet %s status = %d", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::GetUnKnownMethod()
    {
        WPEFramework::OpenRPC::Properties properties;

        const string method = _T("get.unknownMethod");
        WPEFramework::Core::ProxyType<JsonObject> response;
        uint32_t status = properties.Get(method, response, 1000);

        EXPECT_NE(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Get %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetLifeCycleClose()
    {
        WPEFramework::OpenRPC::Properties properties;

        JsonObject parameters;
        parameters["reason"] = "remoteButton";

        const string method = _T("lifecycle.close");
        uint32_t status = properties.Set(method, parameters, 1000);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetMetricsStopContent()
    {
        WPEFramework::OpenRPC::Properties properties;

        JsonObject parameters;
        parameters["entityId"] = "abs";

        const string method = _T("metrics.stopContent");
        uint32_t status = properties.Set(method, parameters, 1000);

        EXPECT_EQ(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", method.c_str(), status);
        }

        return status;
    }

    /* static */ uint32_t Tests::SetUnKnownMethod()
    {
        WPEFramework::OpenRPC::Properties properties;

        JsonObject parameters;

        const string method = _T("set.unknownMethod");
        uint32_t status = properties.Set(method, parameters, 1000);

        EXPECT_NE(status, WPEFramework::Core::ERROR_NONE);
        if (status != WPEFramework::Core::ERROR_NONE) {
            printf("\n Set %s status = %d\n", method.c_str(), status);
        }

        return status;
    }
}
