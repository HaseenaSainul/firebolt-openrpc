
#include "Transport/Transport.h"
#include "Event.h"

namespace FireboltSDK {
    Event* Event::_singleton = nullptr;
    Event::Event()
        : _id(0)
        , _eventMap()
        , _adminLock()
        , _transport(nullptr)
    {
        ASSERT(_singleton == nullptr);
        _singleton = this;
    }

    Event::~Event() /* override */
    {
        _transport->SetEventHandler(nullptr);
        _transport = nullptr;

        _singleton = nullptr;
    }

    /* static */ Event& Event::Instance()
    {
        static Event *instance = new Event();
        ASSERT(instance != nullptr);
        return *instance;
    }

    /* static */ void Event::Dispose()
    {
        ASSERT(_singleton != nullptr);

        if (_singleton != nullptr) {
            delete _singleton;
        }
    }

    void Event::Configure(Transport<WPEFramework::Core::JSON::IElement>* transport)
    {
        _transport = transport;
        _transport->SetEventHandler(this);
    }

    uint32_t Event::Unsubscribe(const string& eventName, const uint32_t id)
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

    uint32_t Event::ValidateResponse(const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse, bool& enabled) /* override */
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

    uint32_t Event::Dispatch(const string& eventName, const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse) /* override */
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

    uint32_t Event::Revoke(const string& eventName, const uint32_t id)
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
}
