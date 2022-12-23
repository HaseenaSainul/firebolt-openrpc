#pragma once
#include <stdint.h>
#include<stdbool.h>

namespace FireboltSDK {
class String {
    public:
        String()
            : _value()
        {
        }
        String(const string& value)
            : _value(value)
        {
        }
        String(const String& copy)
            : _value(copy._value)
        {
            
        }
        inline ~String() = default;
        String& operator=(const String& RHS)
        {
            _value = RHS._value;
            return (*this);
        }

    public:
        const string& Value() const
        {
            return _value;
        }

    private:
        string _value;
    };
}

#ifdef __cplusplus
extern "C" {
#endif
typedef void* FireboltTypes_StringHandle;
const char* FireboltTypes_String(FireboltTypes_StringHandle handle);
void FireboltTypes_StringHandle_Release(FireboltTypes_StringHandle handle);
#ifdef __cplusplus
}
#endif
