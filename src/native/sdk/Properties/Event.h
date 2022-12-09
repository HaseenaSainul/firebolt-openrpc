#pragma once
#include "Module.h"
#include "Accessor/Accessor.h"

namespace FireboltSDK {

    static constexpr uint32_t DefaultWaitTime = 1000;

    class Event : public IEventHandler {
    public:
        typedef std::function<void(const void*, const WPEFramework::Core::JSON::IElement&)> Callback;

    private:
        struct CallbackData {
            const Callback& callback;
            const void* userdata;
            WPEFramework::Core::JSON::IElement& parameter;
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
            , _transport(nullptr)
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

        uint32_t Register(const string& eventName, const Callback& callback, const void* userdata, WPEFramework::Core::JSON::IElement& parameter, uint32_t& id);
        uint32_t Unregister(const string& eventName, const uint32_t id);

    private:
        uint32_t Id() const
        {
            return (++_id);
        }

        void Configure()
        {
            _transport = Accessor::Instance().GetTransport();
            _transport->SetEventHandler(this);
        }

        uint32_t Revoke(const string& eventName, const uint32_t id);
        uint32_t Assign(const string& eventName, const Callback& callback, const void* userdata, WPEFramework::Core::JSON::IElement& parameter);
        uint32_t ValidateResponse(const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse, bool& enabled) override;
        uint32_t Invoke(const string& eventName, const WPEFramework::Core::ProxyType<WPEFramework::Core::JSONRPC::Message>& jsonResponse) override;

    private:
        mutable std::atomic<uint32_t> _id;
        EventMap _eventMap;
        Transport<WPEFramework::Core::JSON::IElement>* _transport;

        static Event* _singleton;
    };
}
