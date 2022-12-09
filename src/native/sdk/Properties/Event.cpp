#include "Properties.h"

namespace FireboltSDK {

    uint32_t Event::Register(const string& eventName, const Callback& callback, const void* userdata, WPEFramework::Core::JSON::IElement& parameter, uint32_t& id)
    {
        uint32_t status = Error::Unavailable;
        if (_transport != nullptr) {

            id = Assign(eventName, callback, userdata, parameter);
            const string parameters("{\"listen\":true}");
            Response response;
            status = _transport->Register(eventName, parameters, response);

            if (status != Error::None) {
                Revoke(eventName, id);
            } else if ((response.Listening.IsSet() == true) &&
                       (response.Listening.Value() == true)) {
                status = Error::None;
            } else {
                status = Error::NotRegistered;
            }
        }

        return (status);
    }

    uint32_t Event::Unregister(const string& eventName, const uint32_t id)
    {
        uint32_t status = Error::Unavailable;

        if (Revoke(eventName, id) == Error::None) {
            Transport<WPEFramework::Core::JSON::IElement>* transport = Accessor::Instance().GetTransport();
            if (transport != nullptr) {

                const string parameters("{\"listen\":false}");
                WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message> response;

                uint32_t status = _transport->Unregister(eventName, parameters, response);

                if ((status != Error::None) ||
                    (response.IsValid() == false) ||
                    (response->Error.IsSet() == true)) {
                    if ((status == Error::None) && (response->Error.IsSet() == true)) {
                        status = response->Error.Code.Value();
                    }
                }
            }
        }
    }

    uint32_t Event::Revoke(const string& eventName, const uint32_t id)
    {
        uint32_t status = Error::None;
        Event::EventMap::iterator eventIndex = _eventMap.find(eventName);
        if (eventIndex != _eventMap.end()) {
            Event::IdMap::iterator idIndex = eventIndex->second.find(id);
            if (idIndex != eventIndex->second.end()) {
                eventIndex->second.erase(idIndex);
            }
            if (eventIndex->second.size() == 0) {
                _eventMap.erase(eventIndex);
            } else {
                status = Error::InUse;
            }
        }

        return status;
    }

    uint32_t Event::Assign(const string& eventName, const Callback& callback, const void* userdata, WPEFramework::Core::JSON::IElement& parameter)
    {
        uint32_t id = Id();
        CallbackData callbackData = {callback, userdata, parameter};

        Event::EventMap::iterator eventIndex = _eventMap.find(eventName);
        if (eventIndex != _eventMap.end()) {
            eventIndex->second.emplace(std::piecewise_construct, std::forward_as_tuple(id), std::forward_as_tuple(callbackData));
        } else {

            Event::IdMap idmap;
            idmap.emplace(std::piecewise_construct, std::forward_as_tuple(id), std::forward_as_tuple(callbackData));
            _eventMap.emplace(std::piecewise_construct, std::forward_as_tuple(eventName), std::forward_as_tuple(idmap));
        }
        return id;
    }

    uint32_t Event::ValidateResponse(const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse, bool& enabled)
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

     uint32_t Event::Invoke(const string& eventName, const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse)
     {
        string response = jsonResponse->Result.Value();
        Event::EventMap::iterator eventIndex = _eventMap.find(eventName);
        if (eventIndex != _eventMap.end()) {
            Event::IdMap::iterator idIndex = eventIndex->second.begin();
            while(idIndex != eventIndex->second.end()) {

                idIndex->second.parameter.FromString(jsonResponse->Result.Value());
                idIndex->second.callback(idIndex->second.userdata, (idIndex->second.parameter));
                idIndex++;
            }
        }

        return Error::None;;
    }

    Event* Event::_singleton = nullptr;
}
