#pragma once
#include "Accessor/Accessor.h"
#include "Event/Event.h"

namespace FireboltSDK {

    class Properties {
    public:
        Properties(const Properties&) = delete;
        Properties& operator= (const Properties&) = delete;

        Properties() = default;
        ~Properties() = default;

    public:
        template <typename RESPONSETYPE>
        static uint32_t Get(const string& propertyName, WPEFramework::Core::ProxyType<RESPONSETYPE>& response)
        {
            uint32_t status = Error::Unavailable;
            Transport<WPEFramework::Core::JSON::IElement>* transport = Accessor::Instance().GetTransport();
            if (transport != nullptr) {
                JsonObject parameters;
                RESPONSETYPE responseType;
                status = transport->Invoke(propertyName, parameters, responseType);
                if (status == Error::None) {
                    ASSERT(response.IsValid() == false);
                    if (response.IsValid() == true) {
                        response.Release();
                    }
                    response = WPEFramework::Core::ProxyType<RESPONSETYPE>::Create();
                    (*response) = responseType;
                }
            } else {
                printf("%s:%s:%d Error in getting Transport err = %d \n", __FILE__, __func__, __LINE__, status);
            }
 
            return status;
        }

        template <typename PARAMETERS>
        static uint32_t Set(const string& propertyName, const PARAMETERS& parameters)
        {
            uint32_t status = Error::Unavailable;
            Transport<WPEFramework::Core::JSON::IElement>* transport = Accessor::Instance().GetTransport();
            if (transport != nullptr) {
                JsonObject responseType;
                status = transport->Invoke(propertyName, parameters, responseType);
            } else {
                printf("%s:%s:%d Error in getting Transport err = %d \n", __FILE__, __func__, __LINE__, status);
            }

            return status;
        }

        template <typename PARAMETERS, typename CALLBACK>
        static uint32_t Subscribe(const string& propertyName, const CALLBACK& callback, const void* userdata, uint32_t& id)
        {
            return Event::Instance().Subscribe<PARAMETERS, CALLBACK>(EventName(propertyName), callback, userdata, id);
        }

        static uint32_t Unsubscribe(const string& propertyName, const uint32_t id)
        {
            return Event::Instance().Unsubscribe(EventName(propertyName), id);
        }
    private:
        static inline string EventName(const string& propertyName) {
            size_t pos = propertyName.find_first_of('.');
            return string(propertyName.substr(0, pos + 1) + "on" + propertyName.substr(pos + 1) + "Changed");
        }
    };
}
