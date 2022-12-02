#pragma once
#include "Module.h"

namespace FireboltSDK {

    class WorkerPoolImplementation : public WPEFramework::Core::WorkerPool {
    public:
        WorkerPoolImplementation() = delete;
        WorkerPoolImplementation(const WorkerPoolImplementation&) = delete;
        WorkerPoolImplementation& operator=(const WorkerPoolImplementation&) = delete;

        WorkerPoolImplementation(const uint8_t threads, const uint32_t stackSize, const uint32_t queueSize)
            : WorkerPool(threads, stackSize, queueSize, &_dispatcher)
        {
        }

        ~WorkerPoolImplementation()
        {
            // Diable the queue so the minions can stop, even if they are processing and waiting for work..
            Stop();
            WPEFramework::Core::Singleton::Dispose();
        }

    public:
        void Stop()
        {
            WPEFramework::Core::WorkerPool::Stop();
        }

        void Run()
        {
            WPEFramework::Core::WorkerPool::Run();
            printf("%s:%s:%d thread = %x\n", __FILE__, __func__, __LINE__, pthread_self());
        }

    private:
        class Dispatcher : public WPEFramework::Core::ThreadPool::IDispatcher {
        public:
            Dispatcher(const Dispatcher&) = delete;
            Dispatcher& operator=(const Dispatcher&) = delete;

            Dispatcher() = default;
            ~Dispatcher() override = default;

        private:
            void Initialize() override { }
            void Deinitialize() override { }
            void Dispatch(WPEFramework::Core::IDispatch* job) override
            { job->Dispatch(); }
        };

        Dispatcher _dispatcher;
    };

}
