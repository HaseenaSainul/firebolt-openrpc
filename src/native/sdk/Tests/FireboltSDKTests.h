#pragma once
#include "Tests.h"
#include "fireboltsdktest.h"

namespace FireboltSDK {
    typedef uint32_t (*Func)();

    class Policy : public WPEFramework::Core::JSON::Container {
    public:
        Policy(const Policy& copy) = delete;
        Policy()
            : WPEFramework::Core::JSON::Container()
            , EnableRecommendations(false)
            , ShareWatchHistory(false)
            , RememberWatchedPrograms(false)
        {
            Add(_T("enableRecommendations"), &EnableRecommendations);
            Add(_T("shareWatchHistory"), &ShareWatchHistory);
            Add(_T("rememberWatchedPrograms"), &RememberWatchedPrograms);
        }
        Policy& operator=(const Policy& RHS)
        {
           EnableRecommendations = RHS.EnableRecommendations;
           ShareWatchHistory = RHS.ShareWatchHistory;
           RememberWatchedPrograms = RHS.RememberWatchedPrograms;

           return (*this);
        }

       ~Policy() override = default;

    public:
        WPEFramework::Core::JSON::Boolean EnableRecommendations;
        WPEFramework::Core::JSON::Boolean ShareWatchHistory;
        WPEFramework::Core::JSON::Boolean RememberWatchedPrograms;
    };

    class Tests {
    public:
        class EventControl {
        public:
            EventControl()
               : _event(false, true)
            {
            }
            ~EventControl() = default;

        public:
            void NotifyEvent()
            {
                _event.SetEvent();
            }
            uint32_t WaitForEvent(uint32_t waitTime)
            {
                return _event.Lock(waitTime);
            }
            void ResetEvent()
            {
                _event.ResetEvent();
            }
        private:
            WPEFramework::Core::Event _event;
        };

    private:
        typedef std::unordered_map<std::string, Func> TestFunctionMap;

    public:
        Tests();
        ~Tests();

        inline TestFunctionMap& TestList()
        {
            return _functionMap;
        }
        static uint32_t Main();
        static uint32_t GetDeviceId();
        static uint32_t GetDeviceVersion();
        static uint32_t GetDiscoveryPolicy();
        static uint32_t GetUnKnownMethod();

        static uint32_t SetDiscoveryPolicy();
        static uint32_t SetLifeCycleClose();
        static uint32_t SetUnKnownMethod();

        static uint32_t SubscribeEvent();
        static uint32_t SubscribeEventWithMultipleCallback();

        template <typename CALLBACK>
        static uint32_t SubscribeEventForC(const string& eventName, CALLBACK& callbackFunc, const void* userdata, uint32_t& id);

    private:
        static void PrintJsonObject(const JsonObject::Iterator& iterator);

    protected:
        std::list<string> menu;
        TestFunctionMap _functionMap;
    };
}
