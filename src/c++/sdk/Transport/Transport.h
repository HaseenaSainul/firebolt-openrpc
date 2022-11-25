/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2022 Metrological
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#pragma once

#include "Module.h"

namespace WPEFramework {

namespace Transport {

    using namespace Core::TypeTraits;

    template<typename SOCKETTYPE, typename INTERFACE, typename CLIENT, typename MESSAGETYPE>
    class CommunicationChannel {
    public:
        typedef std::function<void(const INTERFACE&)> Callback;
        class Entry {
        private:
            Entry(const Entry&) = delete;
            Entry& operator=(const Entry&) = delete;
            struct Synchronous {
                Synchronous()
                    : _signal(false, true)
                    , _response()
                {
                }
                Core::Event _signal;
                Core::ProxyType<INTERFACE> _response;
            };
            struct ASynchronous {
                ASynchronous(const uint32_t waitTime, const Callback& completed)
                    : _waitTime(Core::Time::Now().Add(waitTime).Ticks())
                    , _completed(completed)
                {
                }
                uint64_t _waitTime;
                Callback _completed;
           };

        public:
            Entry()
                : _synchronous(true)
                , _info()
            {
            }
            Entry(const uint32_t waitTime, const Callback& completed)
                : _synchronous(false)
                , _info(waitTime, completed)
            {
            }
            ~Entry()
            {
                if (_synchronous == true) {
                    _info.sync.~Synchronous();
                }
                else {
                    _info.async.~ASynchronous();
                }
            }

        public:
            const Core::ProxyType<INTERFACE>& Response() const
            {
                return (_info.sync._response);
            }
            bool Signal(const Core::ProxyType<MESSAGETYPE>& response)
            {
                if (_synchronous == true) {
                    _info.sync._response = response;
                    _info.sync._signal.SetEvent();
                }
                else {
                    _info.async._completed(*response);
                }

                return (_synchronous == false);
            }
            const uint64_t& Expiry() const
            {
                return (_info.async._waitTime);
            }
            void Abort(const uint32_t id)
            {
                if (_synchronous == true) {
                    _info.sync._signal.SetEvent();
                }
                else {
                    MESSAGETYPE message;
                    ToMessage(id, message, Core::ERROR_ASYNC_ABORTED);
                    _info.async._completed(message);
                }
            }
            bool Expired(const uint32_t id, const uint64_t& currentTime, uint64_t& nextTime)
            {
                bool expired = false;

                if (_synchronous == false) {
                    if (_info.async._waitTime > currentTime) {
                        if (_info.async._waitTime < nextTime) {
                            nextTime = _info.async._waitTime;
                        }
                    }
                    else {
                        MESSAGETYPE message;
                        ToMessage(id, message, Core::ERROR_TIMEDOUT);
                        _info.async._completed(message);
                        expired = true;
                    }
                }
                return (expired);
            }
            bool WaitForResponse(const uint32_t waitTime)
            {
                return (_info.sync._signal.Lock(waitTime) == Core::ERROR_NONE);
            }

        private:
            void ToMessage(const uint32_t id, Core::JSONRPC::Message& message, uint32_t error)
            {
                 message.Id = id;
                 message.Error.Code = error;
                 switch (error) {
                 case Core::ERROR_ASYNC_ABORTED: {
                     message.Error.Text = _T("Pending a-sync call has been aborted");
                     break;
                 }
                 case Core::ERROR_TIMEDOUT: {
                     message.Error.Text = _T("Pending a-sync call has timed out");
                     break;
                 }
                 }
            }

            bool _synchronous;
            union Info {
            public:
                Info()
                    : sync()
                {
                }
                Info(const uint32_t waitTime, const Callback& completed)
                    : async(waitTime, completed)
                {
                }
                ~Info()
                {
                }
                Synchronous sync;
                ASynchronous async;
            } _info;
        };



    private:
        class FactoryImpl {
        private:
            FactoryImpl(const FactoryImpl&) = delete;
            FactoryImpl& operator=(const FactoryImpl&) = delete;

            class WatchDog {
            private:
                WatchDog() = delete;
                WatchDog& operator=(const WatchDog&) = delete;

            public:
                WatchDog(CLIENT* client)
                    : _client(client)
                {
                }
                WatchDog(const WatchDog& copy)
                    : _client(copy._client)
                {
                }
                ~WatchDog()
                {
                }

                bool operator==(const WatchDog& rhs) const
                {
                    return (rhs._client == _client);
                }
                bool operator!=(const WatchDog& rhs) const
                {
                    return (!operator==(rhs));
                }

            public:
                uint64_t Timed(const uint64_t scheduledTime) {
                    return (_client->Timed());
                }

            private:
                CLIENT* _client;
            };

            friend Core::SingletonType<FactoryImpl>;

            FactoryImpl()
                : _messageFactory(2)
                , _watchDog(Core::Thread::DefaultStackSize(), _T("TransportCleaner"))
            {
            }

        public:
            static FactoryImpl& Instance()
            {
                static FactoryImpl& _singleton = Core::SingletonType<FactoryImpl>::Instance();
                return (_singleton);
            }

            ~FactoryImpl()
            {
            }

        public:
            Core::ProxyType<MESSAGETYPE> Element(const string&)
            {
                return (_messageFactory.Element());
            }
            void Trigger(const uint64_t& time, CLIENT* client)
            {
                _watchDog.Trigger(time, client);
            }
            void Revoke(CLIENT* client)
            {
                _watchDog.Revoke(client);
            }
        private:
            Core::ProxyPoolType<MESSAGETYPE> _messageFactory;
            Core::TimerType<WatchDog> _watchDog;
        };

        class ChannelImpl : public Core::StreamJSONType<Web::WebSocketClientType<SOCKETTYPE>, FactoryImpl&, INTERFACE> {
        private:
            ChannelImpl(const ChannelImpl&) = delete;
            ChannelImpl& operator=(const ChannelImpl&) = delete;

            typedef Core::StreamJSONType<Web::WebSocketClientType<SOCKETTYPE>, FactoryImpl&, INTERFACE> BaseClass;

        public:
            ChannelImpl(CommunicationChannel* parent, const Core::NodeId& remoteNode, const string& path, const string& query, const bool mask)
                : BaseClass(5, FactoryImpl::Instance(), path, _T("JSON"), query, "", false, mask, false, remoteNode.AnyInterface(), remoteNode, 256, 256)
                  , _parent(*parent)
            {
            }

            ~ChannelImpl() override = default;

        public:
            virtual void Received(Core::ProxyType<INTERFACE>& response) override
            {
                Core::ProxyType<MESSAGETYPE> inbound(response);

                ASSERT(inbound.IsValid() == true);
                if (inbound.IsValid() == true) {
                    _parent.Inbound(inbound);
                }
            }
            virtual void Send(Core::ProxyType<INTERFACE>& msg) override
            {
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
#ifdef __DEBUG__
                string message;
                ToMessage(msg, message);
                TRACE_L1("Message: %s send", message.c_str());
#endif
            }
            virtual void StateChange() override
            {
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                _parent.StateChange();
            }
            virtual bool IsIdle() const
            {
                return (true);
            }

        private:
            void ToMessage(const Core::ProxyType<Core::JSON::IElement>& jsonObject, string& message) const
            {
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                Core::ProxyType<Core::JSONRPC::Message> inbound(jsonObject);

                ASSERT(inbound.IsValid() == true);
                if (inbound.IsValid() == true) {
                    inbound->ToString(message);
                }
            }
            void ToMessage(const Core::ProxyType<Core::JSON::IMessagePack>& jsonObject, string& message) const
            {
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                Core::ProxyType<Core::JSONRPC::Message> inbound(jsonObject);

                ASSERT(inbound.IsValid() == true);
                if (inbound.IsValid() == true) {
                    std::vector<uint8_t> values;
                    inbound->ToBuffer(values);
                    if (values.empty() != true) {
                        Core::ToString(values.data(), static_cast<uint16_t>(values.size()), false, message);
                    }
                }
            }

        private:
            CommunicationChannel& _parent;
        };

    protected:
        CommunicationChannel(const Core::NodeId& remoteNode, const string& path, const string& query, const bool mask)
            : _channel(this, remoteNode, path, query, mask)
            , _sequence(0)
        {
        }

    public:
        virtual ~CommunicationChannel() = default;
        static Core::ProxyType<CommunicationChannel> Instance(const Core::NodeId& remoteNode, const string& path, const string& query, const bool mask = true)
        {
            static Core::ProxyMapType<string, CommunicationChannel> channelMap;

            string searchLine = remoteNode.HostAddress() + '@' + path;

            return (channelMap.template Instance<CommunicationChannel>(searchLine, remoteNode, path, query, mask));
        }

    public:
        static void Trigger(const uint64_t& time, CLIENT* client)
        {
            FactoryImpl::Instance().Trigger(time, client);
        }
        static Core::ProxyType<MESSAGETYPE> Message()
        {
            return (FactoryImpl::Instance().Element(string()));
        }
        uint32_t Sequence() const
        {
            return (++_sequence);
        }
        void Register(CLIENT& client)
        {
            _adminLock.Lock();
            ASSERT(std::find(_observers.begin(), _observers.end(), &client) == _observers.end());
            _observers.push_back(&client);
            if (_channel.IsOpen() == true) {
                client.Opened();
            }
            _adminLock.Unlock();
        }
        void Unregister(CLIENT& client)
        {
            _adminLock.Lock();
            typename std::list<CLIENT* >::iterator index(std::find(_observers.begin(), _observers.end(), &client));
            if (index != _observers.end()) {
                    _observers.erase(index);
            }
            FactoryImpl::Instance().Revoke(&client);
            _adminLock.Unlock();
        }

        void Submit(const Core::ProxyType<INTERFACE>& message)
        {
            //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
            _channel.Submit(message);
        }
        bool IsSuspended() const
        {
            return (_channel.IsSuspended());
        }
        uint32_t Initialize()
        {
            return (Open(0));
        }
        void Deinitialize()
        {
            Close();
        }
        bool IsOpen()
        {
            return (_channel.IsOpen() == true);
        }

    protected:
        void StateChange()
        {
            _adminLock.Lock();
            typename std::list<CLIENT* >::iterator index(_observers.begin());
            while (index != _observers.end()) {
                if (_channel.IsOpen() == true) {
                    (*index)->Opened();
                }
                else {
                    (*index)->Closed();
                }
                index++;
            }
            _adminLock.Unlock();
        }
        bool Open(const uint32_t waitTime)
        {
            bool result = true;
            if (_channel.IsClosed() == true) {
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                result = (_channel.Open(waitTime) == Core::ERROR_NONE);
                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
            }
            return (result);
        }
        void Close()
        {
            //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
            _channel.Close(Core::infinite);
        }

    private:
        uint32_t Inbound(const Core::ProxyType<MESSAGETYPE>& inbound)
        {
            uint32_t result = Core::ERROR_UNAVAILABLE;
            _adminLock.Lock();
            typename std::list<CLIENT*>::iterator index(_observers.begin());
            while ((result != Core::ERROR_NONE) && (index != _observers.end())) {
                result = (*index)->Inbound(inbound);
                index++;
            }
            _adminLock.Unlock();

            return (result);
        }

    private:
        Core::CriticalSection _adminLock;
        ChannelImpl _channel;
        mutable std::atomic<uint32_t> _sequence;
        std::list<CLIENT*> _observers;
    };

    template<typename INTERFACE>
    class JsonRpc {
    private:
        using Channel = CommunicationChannel<Core::SocketStream, INTERFACE, JsonRpc, Core::JSONRPC::Message>;
        using Entry = typename CommunicationChannel<Core::SocketStream, INTERFACE, JsonRpc, Core::JSONRPC::Message>::Entry;
        using PendingMap = std::unordered_map<uint32_t, Entry>;
        using InvokeFunction = Core::JSONRPC::InvokeFunction;

    protected:
        static constexpr uint32_t DefaultWaitTime = 10000;

        inline void Announce() {
            _channel->Register(*this);
        }

    public:
        JsonRpc() = delete;
        JsonRpc(const JsonRpc&) = delete;
        JsonRpc& operator=(JsonRpc&) = delete;
        JsonRpc(const string& endpoint, const string& path, const string& query, const uint8_t version = 2)
            : _adminLock()
            , _connectId(Core::NodeId(endpoint.c_str()))
            , _channel(Channel::Instance(_connectId, path, query, true))
            , _handler([&](const uint32_t, const string&, const string&) {}, {version})
            , _pendingQueue()
            , _scheduledTime(0)
        {
            _channel->Register(*this);
        }

        virtual ~JsonRpc()
        {
            _channel->Unregister(*this);

            for (auto& element : _pendingQueue) {
                element.second.Abort(element.first);
            }
        }

    public:
        inline Core::JSONRPC::Handler::EventIterator Events() const
        {
            return (_handler.Events());
        }

        inline bool IsOpen()
        {
            _channel->IsOpen();
        }

        template <typename INBOUND, typename METHOD>
        void Assign(const string& eventName, const METHOD& method)
        {
            std::function<void(const INBOUND& parameters)> actualMethod = method;
            InvokeFunction implementation = [actualMethod](const Core::JSONRPC::Context&, const string&, const string& parameters, string& result) -> uint32_t {
                INBOUND inbound;
                inbound.FromString(parameters);
                actualMethod(inbound);
                result.clear();
                return (Core::ERROR_NONE);
            };

            _handler.Register(eventName, implementation);
        }

        template <typename INBOUND, typename METHOD, typename REALOBJECT>
        void Assign(const string& eventName, const METHOD& method, REALOBJECT* objectPtr)
        {
            // using INBOUND = typename Core::TypeTraits::func_traits<METHOD>::template argument<0>::type;
            std::function<void(INBOUND parameters)> actualMethod = std::bind(method, objectPtr, std::placeholders::_1);
            InvokeFunction implementation = [actualMethod](const Core::JSONRPC::Context&, const string&, const string& parameters, string& result) -> uint32_t {
                INBOUND inbound;
                inbound.FromString(parameters);
                actualMethod(inbound);
                result.clear();
                return (Core::ERROR_NONE);
            };
            _handler.Register(eventName, implementation);
        }

        void Revoke(const string& eventName)
        {
            _handler.Unregister(eventName);
        }

        template <typename INBOUND, typename METHOD>
        uint32_t Subscribe(const uint32_t waitTime, const string& eventName, const METHOD& method)
        {
            Assign<INBOUND, METHOD>(eventName, method);

            const string parameters;//("{ \"event\": \"" + eventName + "\", \"id\": \"" + _localSpace + "\"}");
            Core::ProxyType<Core::JSONRPC::Message> response;

            uint32_t result = Send(waitTime, "register", parameters, response);

            if ((result != Core::ERROR_NONE) || (response.IsValid() == false) || (response->Error.IsSet() == true)) {
                _handler.Unregister(eventName);
                if ((result == Core::ERROR_NONE) && (response->Error.IsSet() == true)) {
                    result = response->Error.Code.Value();
                }
            }

            return (result);
        }

        template <typename INBOUND, typename METHOD, typename REALOBJECT>
        uint32_t Subscribe(const uint32_t waitTime, const string& eventName, const METHOD& method, REALOBJECT* objectPtr)
        {
            Assign<INBOUND, METHOD, REALOBJECT>(eventName, method, objectPtr);
            const string parameters;//("{ \"event\": \"" + eventName + "\", \"id\": \"" + _localSpace + "\"}");
            Core::ProxyType<Core::JSONRPC::Message> response;

            uint32_t result = Send(waitTime, "register", parameters, response);

            if ((result != Core::ERROR_NONE) || (response.IsValid() == false) || (response->Error.IsSet() == true)) {
                _handler.Unregister(eventName);
                if ((result == Core::ERROR_NONE) && (response->Error.IsSet() == true)) {
                    result = response->Error.Code.Value();
                }
            }

            return (result);
        }

        void Unsubscribe(const uint32_t waitTime, const string& eventName)
        {
            const string parameters;//("{ \"event\": \"" + eventName + "\", \"id\": \"" + _localSpace + "\"}");
            Core::ProxyType<Core::JSONRPC::Message> response;

            Send(waitTime, "unregister", parameters, response);

            _handler.Unregister(eventName);
        }

        template <typename PARAMETERS, typename... TYPES>
        uint32_t Set(const uint32_t waitTime, const string& method, const TYPES&&... args)
        {
            PARAMETERS sendObject(args...);
            return (Set<PARAMETERS>(waitTime, method, sendObject));
        }

        template <typename PARAMETERS>
        uint32_t Set(const uint32_t waitTime, const string& method, const PARAMETERS& sendObject)
        {
            Core::ProxyType<Core::JSONRPC::Message> response;
            uint32_t result = Send(waitTime, method, sendObject, response);
            if ((result == Core::ERROR_NONE) && (response->Error.IsSet() == true)) {
                result = response->Error.Code.Value();
            }
            return (result);
        }

        template <typename PARAMETERS>
        uint32_t Get(const uint32_t waitTime, const string& method, PARAMETERS& sendObject)
        {
            Core::ProxyType<Core::JSONRPC::Message> response;
            string emptyString(EMPTY_STRING);
            uint32_t result = Send(waitTime, method, emptyString, response);
            if (result == Core::ERROR_NONE) {
                if (response->Error.IsSet() == true) {
                    result = response->Error.Code.Value();
                }
                else if ((response->Result.IsSet() == true) && (response->Result.Value().empty() == false)) {
                    sendObject.Clear();
                    FromMessage((INTERFACE*)&sendObject, *response);
                }
            }
            return (result);
        }

        template <typename PARAMETERS, typename RESPONSE>
        uint32_t Get(const uint32_t waitTime, const string& method, const PARAMETERS& parameters, RESPONSE& inbound)
        {
            Core::ProxyType<Core::JSONRPC::Message> response;
            uint32_t result = Send(waitTime, method, parameters, response);
            if (result == Core::ERROR_NONE) {
                if (response->Error.IsSet() == true) {
                    result = response->Error.Code.Value();
                }
                else if ((response->Result.IsSet() == true)
                    && (response->Result.Value().empty() == false)) {
                    FromMessage((INTERFACE*)&inbound, *response);
                }
            }

            return (result);
        }

    private:
        friend Channel;

        uint64_t Timed()
        {
            uint64_t result = ~0;
            uint64_t currentTime = Core::Time::Now().Ticks();

            // Lets see if some callback are expire. If so trigger and remove...
            _adminLock.Lock();

            typename PendingMap::iterator index = _pendingQueue.begin();

            while (index != _pendingQueue.end()) {

                if (index->second.Expired(index->first, currentTime, result) == true) {
                    index = _pendingQueue.erase(index);
                }
                else {
                    index++;
                }
            }
            _scheduledTime = (result != static_cast<uint64_t>(~0) ? result : 0);

            _adminLock.Unlock();

            return (_scheduledTime);
        }

        virtual void Opened()
        {
            // Nice to know :-)
        }

        void Closed()
        {
            // Abort any in progress RPC command:
            _adminLock.Lock();

            // See if we issued anything, if so abort it..
            while (_pendingQueue.size() != 0) {

                //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                _pendingQueue.begin()->second.Abort(_pendingQueue.begin()->first);
                _pendingQueue.erase(_pendingQueue.begin());
            }

            _adminLock.Unlock();
        }

        template <typename PARAMETERS>
        uint32_t Send(const uint32_t waitTime, const string& method, const PARAMETERS& parameters, Core::ProxyType<Core::JSONRPC::Message>& response)
        {
            uint32_t result = Core::ERROR_UNAVAILABLE;

            if ((_channel.IsValid() == true) && (_channel->IsSuspended() == true)) {
                result = Core::ERROR_ASYNC_FAILED;
            }
            else if (_channel.IsValid() == true) {

                result = Core::ERROR_ASYNC_FAILED;

                Core::ProxyType<Core::JSONRPC::Message> message(Channel::Message());
                uint32_t id = _channel->Sequence();
                message->Id = id;
                message->Designator = method;
                ToMessage(parameters, message);

                _adminLock.Lock();

                typename std::pair< typename PendingMap::iterator, bool> newElement =
                        _pendingQueue.emplace(std::piecewise_construct,
                                              std::forward_as_tuple(id),
                                              std::forward_as_tuple());
                ASSERT(newElement.second == true);

                if (newElement.second == true) {

                      Entry& slot(newElement.first->second);

                    _adminLock.Unlock();

                    _channel->Submit(Core::ProxyType<INTERFACE>(message));

                    message.Release();
                    //printf("%s:%s:%d waitTime = %d\n", __FILE__, __func__, __LINE__, waitTime);

                    if (slot.WaitForResponse(waitTime) == true) {
                        //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                        response = slot.Response();

                        // See if we have a response, maybe it was just the connection
                        // that closed?
                        if (response.IsValid() == true) {
                            result = Core::ERROR_NONE;
                        }
                    }
                    else {
                        //printf("%s:%s:%d \n", __FILE__, __func__, __LINE__);
                        result = Core::ERROR_TIMEDOUT;
                    }

                    _adminLock.Lock();

                    _pendingQueue.erase(id);
                }

                _adminLock.Unlock();
            }

            return (result);
        }

        uint32_t Inbound(const Core::ProxyType<Core::JSONRPC::Message>& inbound)
        {
            uint32_t result = Core::ERROR_INVALID_SIGNATURE;

            ASSERT(inbound.IsValid() == true);

            if ((inbound->Id.IsSet() == true) && (inbound->Result.IsSet() || inbound->Error.IsSet())) {
                // Looks like this is a response..
                ASSERT(inbound->Parameters.IsSet() == false);
                ASSERT(inbound->Designator.IsSet() == false);

                _adminLock.Lock();

                // See if we issued this..
                typename PendingMap::iterator index = _pendingQueue.find(inbound->Id.Value());

                if (index != _pendingQueue.end()) {

                    if (index->second.Signal(inbound) == true) {
                        _pendingQueue.erase(index);
                    }

                     result = Core::ERROR_NONE;
                }

                _adminLock.Unlock();
            }

            return (result);
        }

    private:
        void ToMessage(const string& parameters, Core::ProxyType<Core::JSONRPC::Message>& message) const
        {
            if (parameters.empty() != true) {
                message->Parameters = parameters;
            }
        }

        template <typename PARAMETERS>
        void ToMessage(PARAMETERS& parameters, Core::ProxyType<Core::JSONRPC::Message>& message) const
        {
            ToMessage((INTERFACE*)(&parameters), message);
            return;
        }

        void ToMessage(Core::JSON::IMessagePack* parameters, Core::ProxyType<Core::JSONRPC::Message>& message) const
        {
            std::vector<uint8_t> values;
            parameters->ToBuffer(values);
            if (values.empty() != true) {
                string strValues(values.begin(), values.end());
                message->Parameters = strValues;
            }
            return;
        }

        void ToMessage(Core::JSON::IElement* parameters, Core::ProxyType<Core::JSONRPC::Message>& message) const
        {
            string values;
            parameters->ToString(values);
            if (values.empty() != true) {
                message->Parameters = values;
            }
            return;
        }

        void FromMessage(Core::JSON::IElement* response, const Core::JSONRPC::Message& message)
        {
            response->FromString(message.Result.Value());
        }

        void FromMessage(Core::JSON::IMessagePack* response, const Core::JSONRPC::Message& message)
        {
            string value = message.Result.Value();
            std::vector<uint8_t> result(value.begin(), value.end());
            response->FromBuffer(result);
        }

    private:
        Core::CriticalSection _adminLock;
        Core::NodeId _connectId;
        Core::ProxyType<Channel> _channel;
        Core::JSONRPC::Handler _handler;
        PendingMap _pendingQueue;
        uint64_t _scheduledTime;
    };
}
} // namespace WPEFramework::JSONRPC
