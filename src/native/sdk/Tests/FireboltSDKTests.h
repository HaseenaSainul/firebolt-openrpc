#pragma once
#include "Tests.h"
#include "Firebolt.h"
#include "fireboltsdktest.h"

namespace FireboltSDK {
    typedef uint32_t (*Func)();

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

        template<typename TESTS>
        static uint32_t Main()
        {
            TESTS fireboltTest;
            for (auto i = fireboltTest.TestList().begin(); i != fireboltTest.TestList().end(); i++) {
                EXECUTE(i->first.c_str(), i->second);
            }

            printf("TOTAL: %i tests; %i PASSED, %i FAILED\n", TotalTests, TotalTestsPassed, (TotalTests - TotalTestsPassed));

            return 0;
        }

        static uint32_t GetDeviceId();
        static uint32_t GetDeviceVersion();
        static uint32_t GetUnKnownMethod();

        static uint32_t SetLifeCycleClose();
        static uint32_t SetUnKnownMethod();

        static uint32_t SubscribeEvent();
        static uint32_t SubscribeEventWithMultipleCallback();

        template <typename CALLBACK>
        static uint32_t SubscribeEventForC(const string& eventName, CALLBACK& callbackFunc, const void* userdata, uint32_t& id);

    protected:
        static void PrintJsonObject(const JsonObject::Iterator& iterator);

    protected:
        std::list<string> menu;
        TestFunctionMap _functionMap;
    };
}
