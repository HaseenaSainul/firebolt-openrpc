#pragma once
#include <stdint.h>
#include<stdbool.h>

namespace Firebolt {
    class EnumType {
    public:
        EnumType()
            : _name()
            , _value(~0)
        {
        }
        EnumType(int32_t value, string name)
            : _name(name)
            , _value(value)
        {
        }
        EnumType(const EnumType& copy)
            : _name(copy._name)
            , _value(copy._value)
        {
            
        }
        inline ~EnumType() = default;
        EnumType& operator=(const EnumType& RHS)
        {
            _value = RHS._value;
            _name = RHS._name;
            return (*this);
        }

    public:
        bool IsSet()
        {
            return (_name.empty() != true);
        }
        void Clear()
        {
            _name.clear();
            _value = (~0);
        }
        string Data() const
        {
            return _name;
        }
        void Data(const string& name)
        {
            _name = name;
        }
        int32_t Value() const
        {
            return _value;
        }
        void Value(const int32_t value)
        {
            _value = value;
        }

    private:
        string _name;
        int32_t _value;
    };
}
#ifdef __cplusplus
extern "C" {
#endif

typedef void* FireboltTypes_Uint8Handle;
void FireboltTypes_Uint8Handle_Addref(FireboltTypes_Uint8Handle handle);
void FireboltTypes_Uint8Handle_Release(FireboltTypes_Uint8Handle handle);
bool FireboltTypes_Uint8Handle_IsValid(FireboltTypes_Uint8Handle handle);
const uint8_t FireboltTypes_Uint8(FireboltTypes_Uint8Handle handle);
void FireboltTypes_Uint8_SetValue(FireboltTypes_Uint8Handle handle, const uint8_t value);
bool FireboltTypes_Uint8_HasValue(FireboltTypes_Uint8Handle handle);
void FireboltTypes_Uint8_ClearValue(FireboltTypes_Uint8Handle handle);

typedef void* FireboltTypes_Int8Handle;
void FireboltTypes_Int8Handle_Addref(FireboltTypes_Int8Handle handle);
void FireboltTypes_Int8Handle_Release(FireboltTypes_Int8Handle handle);
bool FireboltTypes_Int8Handle_IsValid(FireboltTypes_Int8Handle handle);
const int8_t FireboltTypes_Int8(FireboltTypes_Int8Handle handle);
void FireboltTypes_int8_SetValue(FireboltTypes_Int8Handle handle, const int8_t value);
bool FireboltTypes_Int8_HasValue(FireboltTypes_Int8Handle handle);
void FireboltTypes_Int38_ClearValue(FireboltTypes_Int8Handle handle);

typedef void* FireboltTypes_Uint16Handle;
void FireboltTypes_Uint16Handle_Addref(FireboltTypes_Uint16Handle handle);
void FireboltTypes_Uint16Handle_Release(FireboltTypes_Uint16Handle handle);
bool FireboltTypes_Uint16Handle_IsValid(FireboltTypes_Uint16Handle handle);
const uint16_t FireboltTypes_Uint16(FireboltTypes_Uint16Handle handle);
void FireboltTypes_Uint16_SetValue(FireboltTypes_Uint16Handle handle, const uint16_t value);
bool FireboltTypes_Uint16_HasValue(FireboltTypes_Uint16Handle handle);
void FireboltTypes_Uint16_ClearValue(FireboltTypes_Uint16Handle handle);

typedef void* FireboltTypes_Int16Handle;
void FireboltTypes_Int16Handle_Addref(FireboltTypes_Int16Handle handle);
void FireboltTypes_Int16Handle_Release(FireboltTypes_Int16Handle handle);
bool FireboltTypes_Int16Handle_IsValid(FireboltTypes_Int16Handle handle);
const int16_t FireboltTypes_Int16(FireboltTypes_Int16Handle handle);
void FireboltTypes_Int16_SetValue(FireboltTypes_Int16Handle handle, const int16_t value);
bool FireboltTypes_Int16_HasValue(FireboltTypes_Int16Handle handle);
void FireboltTypes_Int16_ClearValue(FireboltTypes_Int16Handle handle);

typedef void* FireboltTypes_Uint32Handle;
void FireboltTypes_Uint32Handle_Addref(FireboltTypes_Uint32Handle handle);
void FireboltTypes_Uint32Handle_Release(FireboltTypes_Uint32Handle handle);
bool FireboltTypes_Uint32Handle_IsValid(FireboltTypes_Uint32Handle handle);
const uint32_t FireboltTypes_Uint32(FireboltTypes_Uint32Handle handle);
void FireboltTypes_Uint32_SetValue(FireboltTypes_Uint32Handle handle, const uint32_t value);
bool FireboltTypes_Uint32_HasValue(FireboltTypes_Uint32Handle handle);
void FireboltTypes_Uint32_ClearValue(FireboltTypes_Uint32Handle handle);

typedef void* FireboltTypes_Int32Handle;
void FireboltTypes_Int32Handle_Addref(FireboltTypes_Int32Handle handle);
void FireboltTypes_Int32Handle_Release(FireboltTypes_Int32Handle handle);
bool FireboltTypes_Int32Handle_IsValid(FireboltTypes_Int32Handle handle);
const int32_t FireboltTypes_Int32(FireboltTypes_Int32Handle handle);
void FireboltTypes_Int32_SetValue(FireboltTypes_Int32Handle handle, const int32_t value);
bool FireboltTypes_Int32_HasValue(FireboltTypes_Int32Handle handle);
void FireboltTypes_Int32_ClearValue(FireboltTypes_Int32Handle handle);

typedef void* FireboltTypes_Uint64Handle;
void FireboltTypes_Uint64Handle_Addref(FireboltTypes_Uint64Handle handle);
void FireboltTypes_Uint64Handle_Release(FireboltTypes_Uint64Handle handle);
bool FireboltTypes_Uint64Handle_IsValid(FireboltTypes_Uint64Handle handle);
const uint64_t FireboltTypes_Uint64(FireboltTypes_Uint64Handle handle);
void FireboltTypes_Uint64_SetValue(FireboltTypes_Uint64Handle handle, const uint64_t value);
bool FireboltTypes_Uint64_HasValue(FireboltTypes_Uint64Handle handle);
void FireboltTypes_Uint64_ClearValue(FireboltTypes_Uint64Handle handle);

typedef void* FireboltTypes_Int64Handle;
void FireboltTypes_Int64Handle_Addref(FireboltTypes_Int64Handle handle);
void FireboltTypes_Int64Handle_Release(FireboltTypes_Int64Handle handle);
bool FireboltTypes_Int64Handle_IsValid(FireboltTypes_Int64Handle handle);
const int64_t FireboltTypes_Int64(FireboltTypes_Int64Handle handle);
void FireboltTypes_Int64_SetValue(FireboltTypes_Int64Handle handle, const int64_t value);
bool FireboltTypes_Int64_HasValue(FireboltTypes_Int64Handle handle);
void FireboltTypes_Int64_ClearValue(FireboltTypes_Int64Handle handle);

typedef void* FireboltTypes_FloatHandle;
void FireboltTypes_FloatHandle_Addref(FireboltTypes_FloatHandle handle);
void FireboltTypes_FloatHandle_Release(FireboltTypes_FloatHandle handle);
bool FireboltTypes_FloatHandle_IsValid(FireboltTypes_FloatHandle handle);
const float FireboltTypes_Float(FireboltTypes_FloatHandle handle);
void FireboltTypes_Float_SetValue(FireboltTypes_FloatHandle handle, const float value);
bool FireboltTypes_Float_HasValue(FireboltTypes_FloatHandle handle);
void FireboltTypes_Float_ClearValue(FireboltTypes_FloatHandle handle);

typedef void* FireboltTypes_DoubleHandle;
void FireboltTypes_DoubleHandle_Addref(FireboltTypes_DoubleHandle handle);
void FireboltTypes_DoubleHandle_Release(FireboltTypes_DoubleHandle handle);
bool FireboltTypes_DoubleHandle_IsValid(FireboltTypes_DoubleHandle handle);
const double FireboltTypes_Double(FireboltTypes_DoubleHandle handle);
void FireboltTypes_Double_SetValue(FireboltTypes_DoubleHandle handle, const double value);
bool FireboltTypes_Double_HasValue(FireboltTypes_DoubleHandle handle);
void FireboltTypes_Double_ClearValue(FireboltTypes_DoubleHandle handle);

typedef void* FireboltTypes_BoolHandle;
void FireboltTypes_BoolHandle_Addref(FireboltTypes_BoolHandle handle);
void FireboltTypes_BoolHandle_Release(FireboltTypes_BoolHandle handle);
bool FireboltTypes_BoolHandle_IsValid(FireboltTypes_BoolHandle handle);
const bool FireboltTypes_Bool(FireboltTypes_BoolHandle handle);
void FireboltTypes_Bool_SetValue(FireboltTypes_BoolHandle handle, const bool value);
bool FireboltTypes_Bool_HasValue(FireboltTypes_BoolHandle handle);
void FireboltTypes_Bool_ClearValue(FireboltTypes_BoolHandle handle);

typedef void* FireboltTypes_StringHandle;
void FireboltTypes_StringHandle_Addref(FireboltTypes_StringHandle handle);
void FireboltTypes_StringHandle_Release(FireboltTypes_StringHandle handle);
bool FireboltTypes_StringHandle_IsValid(FireboltTypes_StringHandle handle);
const char* FireboltTypes_String(FireboltTypes_StringHandle handle);
void FireboltTypes_String_SetValue(FireboltTypes_StringHandle handle, const char* value);
bool FireboltTypes_String_HasValue(FireboltTypes_StringHandle handle);
void FireboltTypes_String_ClearValue(FireboltTypes_StringHandle handle);

typedef void* FireboltTypes_EnumHandle;
void FireboltTypes_EnumHandle_Addref(FireboltTypes_EnumHandle handle);
void FireboltTypes_EnumHandle_Release(FireboltTypes_EnumHandle handle);
bool FireboltTypes_EnumHandle_IsValid(FireboltTypes_EnumHandle handle);
const char* FireboltTypes_Enum(FireboltTypes_EnumHandle handle);
void FireboltTypes_EnumHandle_SetValue(FireboltTypes_EnumHandle handle, const char* value);
bool FireboltTypes_EnumHandle_HasValue(FireboltTypes_EnumHandle handle);
void FireboltTypes_EnumHandle_ClearValue(FireboltTypes_EnumHandle handle);

#ifdef __cplusplus
}
#endif
