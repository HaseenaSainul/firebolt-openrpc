#include "Module.h"
#include "Types.h"

#ifdef __cplusplus
extern "C" {
#endif

// String Type Handler Interfaces
const char* FireboltTypes_String(FireboltTypes_StringHandle handle)
{
    FireboltSDK::String* str = static_cast<FireboltSDK::String*>(handle);
    return (str->Value().c_str());
}
void FireboltTypes_StringHandle_Release(FireboltTypes_StringHandle handle)
{
    FireboltSDK::String* str = static_cast<FireboltSDK::String*>(handle);
    delete str;
}

#ifdef __cplusplus
}
#endif
