#pragma once
#include "Module.h"
#include "Services/Services.h"

namespace WPEFramework {
namespace OpenRPC {

    class Properties {
    private:
        static constexpr uint32_t DefaultWaitTime = 1000;

    public:
        Properties(const Properties&) = delete;
        Properties& operator= (const Properties&) = delete;

        Properties()
        {
        }
        ~Properties() = default;

        template <typename RESPONSETYPE>
        uint32_t Get(const string& method, Core::ProxyType<RESPONSETYPE>& response, uint32_t waitTime = DefaultWaitTime)
        {
            uint32_t status = Core::ERROR_UNAVAILABLE;
            Transport::JsonRpc<Core::JSON::IElement>* transport = Services::Instance().GetTransport();
            if (transport != nullptr) {
                RESPONSETYPE responseObject;

                status = transport->Get(waitTime, method, responseObject);
                if (status == Core::ERROR_NONE) {
                    ASSERT(response.IsValid() == false);
                    if (response.IsValid() == true) {
                        response.Release();
                    }
                    response = Core::ProxyType<RESPONSETYPE>::Create();
                    (*response) = responseObject;
                }
            } else {
                printf("%s:%s:%d Error in getting Transport err = %d \n", __FILE__, __func__, __LINE__, status);
            }
            return status;
        }

        template <typename PARAMETERS, typename RESPONSETYPE>
        uint32_t Get(const string& method, PARAMETERS& parameters, Core::ProxyType<RESPONSETYPE>& response, uint32_t waitTime = DefaultWaitTime)
        {
            uint32_t status = Core::ERROR_UNAVAILABLE;
            Transport::JsonRpc<Core::JSON::IElement>* transport = Services::Instance().GetTransport();
            if (transport != nullptr) {
                RESPONSETYPE responseObject;

                status = transport->Get(waitTime, method, parameters, responseObject);
                if (status == Core::ERROR_NONE) {
                    ASSERT(response.IsValid() == false);
                    if (response.IsValid() == true) {
                        response.Release();
                    }
                    response = Core::ProxyType<RESPONSETYPE>::Create();
                    (*response) = responseObject;
                }
            } else {
                printf("%s:%s:%d Error in getting Transport, err = %d \n", __FILE__, __func__, __LINE__, status);
            }
            return status;
        }

        template <typename PARAMETERS>
        uint32_t Set(const string& method, const PARAMETERS& parameters, uint32_t waitTime = DefaultWaitTime)
        {
            uint32_t status = Core::ERROR_UNAVAILABLE;
            Transport::JsonRpc<Core::JSON::IElement>* transport = Services::Instance().GetTransport();
            if (transport != nullptr) {
                status = transport->Set(waitTime, method, parameters);
                if (status != Core::ERROR_NONE) {
                    printf("%s:%s:%d Error in set method = %s, err = %d \n", __FILE__, __func__, __LINE__, method.c_str(), status);
                }
            } else {
                printf("%s:%s:%d Error in getting Transport, err = %d \n", __FILE__, __func__, __LINE__, status);
            }
            return status;
        }
    };
}
}
