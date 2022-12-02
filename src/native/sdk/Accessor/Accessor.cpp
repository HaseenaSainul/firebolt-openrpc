#include "Accessor.h"

namespace FireboltSDK {

    Accessor* Accessor::_singleton = nullptr;
    Accessor::Accessor()
        : _threadCount(DefaultThreadCount)
        , _queueSize(DefaultQueueSize)
        , _workerPool()
        , _transport(nullptr)
    {
        Config config;
        LoadConfigs(config);
        printf("%s:%s:%d URL = %s \n", __FILE__, __func__, __LINE__, config.Url.Value().c_str());
        CreateTransport(config.Url.Value(), config.WaitTime.Value());

        _workerPool = WPEFramework::Core::ProxyType<WorkerPoolImplementation>::Create(_threadCount, WPEFramework::Core::Thread::DefaultStackSize(), _queueSize);
        WPEFramework::Core::WorkerPool::Assign(&(*_workerPool));
        _workerPool->Run();
    }

    Accessor::~Accessor()
    {
        WPEFramework::Core::IWorkerPool::Assign(nullptr);
        DestroyTransport();
        _workerPool->Stop();
    }

    void Accessor::LoadConfigs(Config& config)
    {
        string prefixPath;
        WPEFramework::Core::SystemInfo::GetEnvironment("OPENRPC_NATIVE_SDK_PREFIX", prefixPath);
        string configFilePath = (prefixPath.empty() != true) ?
                                (prefixPath + '/' + Accessor::ConfigFile) : Accessor::ConfigFile;
        WPEFramework::Core::File configFile(configFilePath);
        printf("%s:%s:%d ConfigFile = %s\n", __FILE__, __func__, __LINE__, configFilePath.c_str());

        if (configFile.Open(true) == true) {
            WPEFramework::Core::OptionalType<WPEFramework::Core::JSON::Error> error;
            config.IElement::FromFile(configFile, error);
            if (error.IsSet() == true) {
                printf("Error in reading config\n");
            }
        }
    }

    uint32_t Accessor::CreateTransport(const string& url, const uint32_t waitTime)
    {
        if (_transport != nullptr) {
            delete _transport;
        }

        _transport = new Transport<WPEFramework::Core::JSON::IElement>(static_cast<WPEFramework::Core::URL>(url), waitTime);
        if (WaitForLinkReady(_transport, DefaultWaitTime) != FireboltError::None) {
            delete _transport;
            _transport = nullptr;
        }

        ASSERT(_transport != nullptr);
        return ((_transport != nullptr) ? FireboltError::None : FireboltError::Unavailable);
    }

    uint32_t Accessor::DestroyTransport()
    {
        if (_transport != nullptr) {
            delete _transport;
            _transport = nullptr;
        }
        return FireboltError::None;
    }

    Transport<WPEFramework::Core::JSON::IElement>* Accessor::GetTransport()
    {
        ASSERT(_transport != nullptr);
        return _transport;
    }

    uint32_t Accessor::WaitForLinkReady(Transport<WPEFramework::Core::JSON::IElement>* transport, const uint32_t waitTime = DefaultWaitTime) {
        uint32_t waiting = (waitTime == WPEFramework::Core::infinite ? WPEFramework::Core::infinite : waitTime);
        static constexpr uint32_t SLEEPSLOT_TIME = 100;

        // Right, a wait till connection is closed is requested..
        while ((waiting > 0) && (transport->IsOpen() == false)) {

            uint32_t sleepSlot = (waiting > SLEEPSLOT_TIME ? SLEEPSLOT_TIME : waiting);

            // Right, lets sleep in slices of 100 ms
            SleepMs(sleepSlot);

            waiting -= (waiting == WPEFramework::Core::infinite ? 0 : sleepSlot);
        }
        return (((waiting == 0) || (transport->IsOpen() == true)) ? FireboltError::None : FireboltError::Timedout);
    }


}
