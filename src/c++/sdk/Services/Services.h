#pragma once
#include "Module.h"
#include "Transport/Transport.h"

namespace WPEFramework {
namespace OpenRPC {
    class Services {
    private:
        static constexpr uint8_t JSONVersion = 2;
        static constexpr const TCHAR* ConfigFile = _T("/etc/OpenRPCNativeSDK.json");
        static constexpr uint32_t DefaultWaitTime = 1000;

    public:
        Services(const Services&) = delete;
        Services& operator= (const Services&) = delete;

        Services();
        ~Services();

        static Services& Instance()
        {
            if (_singleton == nullptr) {
                _singleton = new Services;
            }
            ASSERT(_singleton != nullptr);
            return *_singleton;
        }

        static void Dispose()
        {
            ASSERT(_singleton != nullptr);

            if (_singleton != nullptr) {
                delete _singleton;
            }
        }
        void InitSDK();
        uint32_t CreateTransport(const string& path, const string& query);
        uint32_t DestroyTransport();
        Transport::JsonRpc<Core::JSON::IElement>* GetTransport();
        uint32_t WaitForLinkReady(Transport::JsonRpc<Core::JSON::IElement>* transport, const uint32_t waitTime);

    private:
        void LoadConfigs();

    private:
        string _endpoint;
        static Services* _singleton;
        Transport::JsonRpc<Core::JSON::IElement>* _transport;
    };
}
}
