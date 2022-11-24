#include "Module.h"

namespace WPEFramework {
namespace Transport {
    class JsonRpc {
    public:
        JsonRpc(const JsonRpc&) = delete;
        JsonRpc& operator= (const JsonRpc&) = delete;

        JsonRpc()
            : remoteObject(_T("JsonRpcPlugin.2"), _T("client.events.88"))
        {
        }
        ~JsonRpc()
        {
        }
        template <typename PARAMETERS>
        uint32_t Get(const uint32_t waitTime, const string& method, PARAMETERS& value)
        {
            remoteObject.Get<PARAMETERS>(waitTime, method, value);
        }

    private:
        JSONRPC::LinkType<Core::JSON::IElement> remoteObject;
    };
}
}
