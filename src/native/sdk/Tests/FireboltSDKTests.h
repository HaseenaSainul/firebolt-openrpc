#pragma once

#include "Tests.h"

namespace FireboltSDK {
    typedef uint32_t (*Func)();

    class Tests {
    private:
        typedef std::unordered_map<std::string, Func> TestFunctionMap;

    public:
        Tests();
        ~Tests();

        inline TestFunctionMap& TestList()
        {
            return _functionMap;
        }

    private:
        static void PrintJsonObject(const JsonObject::Iterator& iterator);
        static uint32_t GetDeviceId();
        static uint32_t GetDeviceVersion();
        static uint32_t GetAuthenticationToken();
        static uint32_t GetUnKnownMethod();

        static uint32_t SetLifeCycleClose();
        static uint32_t SetMetricsStopContent();
        static uint32_t SetUnKnownMethod();

        static uint32_t SubscribeEvent();

    protected:
        std::list<string> menu;
        TestFunctionMap _functionMap;
   };
}
