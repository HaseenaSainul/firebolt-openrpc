#include "Services.h"
#include "Config.h"

namespace WPEFramework {
namespace OpenRPC {

    Services* Services::_singleton = nullptr;
    Services::Services()
        : _endpoint("")
        , _transport(nullptr)
    {
    }

    void Services::InitSDK()
    {
        LoadConfigs();
    }
    Services::~Services()
    {
        DestroyTransport();
    }

    void Services::LoadConfigs() 
    {
        string prefixPath;
        Core::SystemInfo::GetEnvironment("OPENRPC_NATIVE_SDK_PREFIX", prefixPath);
        string configFilePath = (prefixPath.empty() != true) ?
                                (prefixPath + '/' + Services::ConfigFile) : Services::ConfigFile;
        Core::File configFile(configFilePath);
        printf("%s:%s:%d ConfigFile = %s\n", __FILE__, __func__, __LINE__, configFilePath.c_str());

        if (configFile.Open(true) == true) {
            OpenRPC::Config config;
            Core::OptionalType<Core::JSON::Error> error;
            config.IElement::FromFile(configFile, error);
            if (error.IsSet() == true) {
                printf("Error in reading config\n");
            }

            _endpoint = config.Address.Value() + ":" + Core::NumberType<uint16_t>(config.Port.Value()).Text();
            printf("%s:%s:%d endpoint = %s \n", __FILE__, __func__, __LINE__, _endpoint.c_str());
        }
    }

    uint32_t Services::CreateTransport(const string& path, const string& query)
    {
        if (_transport != nullptr) {
            delete _transport;
        }
        _transport = new Transport::JsonRpc<Core::JSON::IElement>(_endpoint, path, query, JSONVersion);
        if (WaitForLinkReady(_transport, DefaultWaitTime) != Core::ERROR_NONE) {
            delete _transport;
            _transport = nullptr;
        }

        ASSERT(_transport != nullptr);
        return ((_transport != nullptr) ? Core::ERROR_NONE : Core::ERROR_UNAVAILABLE);
    }

    uint32_t Services::DestroyTransport()
    {
        if (_transport != nullptr) {
            delete _transport;
            _transport = nullptr;
        }
        return Core::ERROR_NONE;
    }

    Transport::JsonRpc<Core::JSON::IElement>* Services::GetTransport()
    {
        ASSERT(_transport != nullptr);
        return _transport;
    }

    uint32_t Services::WaitForLinkReady(Transport::JsonRpc<Core::JSON::IElement>* transport, const uint32_t waitTime = DefaultWaitTime) {
        uint32_t waiting = (waitTime == Core::infinite ? Core::infinite : waitTime);
        static constexpr uint32_t SLEEPSLOT_TIME = 100;

        // Right, a wait till connection is closed is requested..
        while ((waiting > 0) && (transport->IsOpen() == false)) {

            uint32_t sleepSlot = (waiting > SLEEPSLOT_TIME ? SLEEPSLOT_TIME : waiting);

            // Right, lets sleep in slices of 100 ms
            SleepMs(sleepSlot);

            waiting -= (waiting == Core::infinite ? 0 : sleepSlot);
        }
        return (((waiting == 0) || (transport->IsOpen() == true)) ? Core::ERROR_NONE : Core::ERROR_TIMEDOUT);
    }


}
}

