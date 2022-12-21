#pragma once
#include "Module.h"

namespace FireboltSDK {

    static constexpr uint32_t DefaultWaitTime = 1000;

    class Event : public IEventHandler {
    public:
        typedef std::function<uint32_t(const void*, const string& parameters)> DispatchFunction;
    private:
        enum State : uint8_t {
            IDLE,
            EXECUTING,
            REVOKED
        };

        struct CallbackData {
            const DispatchFunction lambda;
            const void* userdata;
            State state;
        };
        using IdMap = std::map<uint32_t, CallbackData>;
        using EventMap = std::map<string, IdMap>;
  

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
            : _id(0)
            , _eventMap()
            , _adminLock()
            , _transport(nullptr)
        {
            ASSERT(_singleton == nullptr);
        }

        virtual ~Event() {
            _transport->SetEventHandler(nullptr);
            _transport = nullptr;

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
                _singleton = nullptr;
            }
        }

        void Configure(Transport<WPEFramework::Core::JSON::IElement>* transport)
        {
            _transport = transport;
            _transport->SetEventHandler(this);
        }

        template <typename PARAMETERS, typename CALLBACK>
        uint32_t Subscribe(const string& eventName, const CALLBACK& callback, const void* userdata, uint32_t& id)
        {
            uint32_t status = Error::Unavailable;
            if (_transport != nullptr) {

                status = Assign<PARAMETERS, CALLBACK>(eventName, callback, userdata, id);
                if (status == Error::None) {
                    const string parameters("{\"listen\":true}");
                    Response response;
                    status = _transport->Subscribe(eventName, parameters, response);

                    if (status != Error::None) {
                        Revoke(eventName, id);
                    } else if ((response.Listening.IsSet() == true) &&
                              (response.Listening.Value() == true)) {
                        status = Error::None;
                    } else {
                        status = Error::NotSubscribed;
                    }
                }
            }

            return ((status == Error::InUse) ? Error::None: status);
        }

        uint32_t Unsubscribe(const string& eventName, const uint32_t id)
        {
            uint32_t status = Revoke(eventName, id); 

            if (status == Error::None) {
                if (_transport != nullptr) {
 
                    const string parameters("{\"listen\":false}");

                    status = _transport->Unsubscribe(eventName, parameters);
                }
            }

            return ((status == Error::InUse) ? Error::None: status);
        }

    private:
        uint32_t Id() const
        {
            return (++_id);
        }

        uint32_t Revoke(const string& eventName, const uint32_t id)
        {
            uint32_t status = Error::None;
            _adminLock.Lock();
            EventMap::iterator eventIndex = _eventMap.find(eventName);
            if (eventIndex != _eventMap.end()) {
                IdMap::iterator idIndex = eventIndex->second.find(id);
                if (idIndex->second.state != State::EXECUTING) {
                    if (idIndex != eventIndex->second.end()) {
                        eventIndex->second.erase(idIndex);
                    }
                } else {
                    idIndex->second.state = State::REVOKED;
                }
                if (eventIndex->second.size() == 0) {
                    _eventMap.erase(eventIndex);
                } else {
                    status = Error::InUse;
                }
            }
            _adminLock.Unlock();

            return status;
        }

        template <typename PARAMETERS, typename CALLBACK>
        uint32_t Assign(const string& eventName, const CALLBACK& callback, const void* userdata, uint32_t& id)
        {
            uint32_t status = Error::None;
            id = Id();
            std::function<void(const void* userdata, void* parameters)> actualCallback = callback;
            DispatchFunction implementation = [actualCallback](const void* userdata, const string& parameters) -> uint32_t {

                WPEFramework::Core::ProxyType<PARAMETERS> inbound = WPEFramework::Core::ProxyType<PARAMETERS>::Create();
                inbound->FromString(parameters);
                actualCallback(userdata, static_cast<void*>(&inbound));
                return (Error::None);
            };
            CallbackData callbackData = {implementation, userdata, State::IDLE};

            _adminLock.Lock();
            EventMap::iterator eventIndex = _eventMap.find(eventName);
            if (eventIndex != _eventMap.end()) {
                // Already registered, no need to register again;
                status = Error::InUse;
                eventIndex->second.emplace(std::piecewise_construct, std::forward_as_tuple(id), std::forward_as_tuple(callbackData));
            } else {

                IdMap idMap;
                idMap.emplace(std::piecewise_construct, std::forward_as_tuple(id), std::forward_as_tuple(callbackData));
                _eventMap.emplace(std::piecewise_construct, std::forward_as_tuple(eventName), std::forward_as_tuple(idMap));

            }

            _adminLock.Unlock();
            return status;
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

        uint32_t Dispatch(const string& eventName, const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse)
        {
            string response = jsonResponse->Result.Value();
            _adminLock.Lock();
            EventMap::iterator eventIndex = _eventMap.find(eventName);
            if (eventIndex != _eventMap.end()) {
                IdMap::iterator idIndex = eventIndex->second.begin();
                while(idIndex != eventIndex->second.end()) {
                    State state;
                    if (idIndex->second.state != State::REVOKED) {
                        idIndex->second.state = State::EXECUTING;
                    }
                    state = idIndex->second.state;
                    _adminLock.Unlock();
                    if (state == State::EXECUTING) {
                        idIndex->second.lambda(idIndex->second.userdata, (jsonResponse->Result.Value()));
                    }
                    _adminLock.Lock();
                    if (idIndex->second.state == State::REVOKED) {
                        idIndex = eventIndex->second.erase(idIndex);
                        if (eventIndex->second.size() == 0) {
                            _eventMap.erase(eventIndex);
                        }
                    } else {
                        idIndex->second.state = State::IDLE;
                        idIndex++;
                    }
                }
            }
            _adminLock.Unlock();

            return Error::None;;
        }


    private:
        mutable std::atomic<uint32_t> _id;
        EventMap _eventMap;
        WPEFramework::Core::CriticalSection _adminLock;
        Transport<WPEFramework::Core::JSON::IElement>* _transport;

        static Event* _singleton;
    };
}
