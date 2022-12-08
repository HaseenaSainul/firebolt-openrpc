#pragma once
#include "Module.h"
#include "Accessor/Accessor.h"

namespace FireboltSDK {

    static constexpr uint32_t DefaultWaitTime = 1000;

    class Event : public IEventHandler {
    private:
        using InvokeFunction = WPEFramework::Core::JSONRPC::InvokeFunction;
   
        class Response : public WPEFramework::Core::JSON::Container {
        public:
            Response& operator=(const Response&) = delete;
            Response()
                : WPEFramework::Core::JSON::Container()
                , Listening(false)
            {
                Add(_T("listening"), &Listening);
            }
            Response(const Response& copy)
                : WPEFramework::Core::JSON::Container()
                , Listening(copy.Listening)
            {
                Add(_T("listening"), &Listening);
            }
            ~Response() override = default;
        public:
            WPEFramework::Core::JSON::Boolean Listening;
        };

    public:
        Event()
            : _transport(nullptr)
            , _handler([&](const uint32_t, const string&, const string&) {}, {2})
        {
            ASSERT(_singleton == nullptr);
            Configure();
            _singleton = this;
        }
        virtual ~Event() {
            ASSERT(_singleton!=nullptr);
            _singleton = nullptr;
        }

    public:
        static Event& Instance()
        {
            if (_singleton == nullptr) {
                _singleton = new Event;
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

        template <typename PARAMETERS, typename CALLBACK>
        uint32_t Register(const string& eventName, const CALLBACK& callback, bool& enabled)
        {
            uint32_t status = Error::Unavailable;
            if (_transport != nullptr) {

                string eventNameForRegister = EventNameForRegister(eventName);
                Assign<PARAMETERS, CALLBACK>(eventNameForRegister, callback);
                const string parameters("{\"listen\":true}");
                Response response;
                status = _transport->RegisterEvent(eventName, parameters, response);

                if (status != Error::None) {
                    Revoke(eventName);
                } else if (response.Listening.IsSet() == true) {
                    enabled = response.Listening.Value();
                }
            }

            return (status);
        }

        void Unregister(const string& eventName)
        {
            uint32_t status = Error::Unavailable;
            Transport<WPEFramework::Core::JSON::IElement>* transport = Accessor::Instance().GetTransport();
            if (transport != nullptr) {
 
                const string parameters("{\"listen\":false}");
                WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message> response;

                uint32_t status = _transport->Invoke(eventName, parameters, response);

                if ((status != Error::None) || (response.IsValid() == false) || (response->Error.IsSet() == true)) {
                    if ((status == Error::None) && (response->Error.IsSet() == true)) {
                        status = response->Error.Code.Value();
                    }
                }

                Revoke(eventName);
            }
        }

    private:
        void Configure()
        {
            _transport = Accessor::Instance().GetTransport();
            _transport->SetEventHandler(this);
        }

        void Revoke(const string& eventName)
        {
            _handler.Unregister(EventNameForRegister(eventName));
            _transport->Revoke(eventName);
        }

        inline string EventNameForRegister(const string& eventName)
        {
            string eventNameForRegister = eventName;
            eventNameForRegister.erase(
                std::remove(eventNameForRegister.begin(), eventNameForRegister.end(), '.'),
                eventNameForRegister.end());
            return eventNameForRegister;
        }

        template <typename PARAMETERS, typename CALLBACK>
        void Assign(const string& eventName, const CALLBACK& callback)
        {
            std::function<void(const PARAMETERS& parameters)> actualMethod = callback;
            InvokeFunction implementation = [actualMethod](const WPEFramework::Core::JSONRPC::Context&, const string&, const string& parameters, string& result) -> uint32_t {
                PARAMETERS inbound;
                inbound.FromString(parameters);
                actualMethod(inbound);
                result.clear();
                return (Error::None);
            };
            _handler.Register(eventName, implementation);
        }

        uint32_t ValidateResponse(const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse, bool& enabled) override
        {
            uint32_t result = Error::General;
            Response response;
            _transport->FromMessage((WPEFramework::Core::JSON::IElement*)&response, *jsonResponse);
            if (response.Listening.IsSet() == true) {
                result = Error::None;
                enabled = response.Listening.Value();
            }
            return result;
        }

        uint32_t Invoke(const string& eventName, const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse)
        {
            string response;
            _handler.Invoke(WPEFramework::Core::JSONRPC::Context(), EventNameForRegister(eventName), jsonResponse->Result.Value(), response);
            return Error::None;;
        }


    private:
        Transport<WPEFramework::Core::JSON::IElement>* _transport;
        WPEFramework::Core::JSONRPC::Handler _handler;
        static Event* _singleton;
    };
}
