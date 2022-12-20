#include "Module.h"
#include "Types.h"

#ifdef __cplusplus
extern "C" {
#endif

void FireboltTypes_Uint8Handle_Addref(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    type.AddRef();
}
void FireboltTypes_Uint8Handle_Release(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    type.Release();
}
bool FireboltTypes_Uint8Handle_IsValid(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    return type.IsValid();
}
const uint8_t FireboltTypes_Uint8(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    return type->Value();
}
void FireboltTypes_Uint8_SetValue(FireboltTypes_Uint8Handle handle, const uint8_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    *type = value;

}
bool FireboltTypes_Uint8_HasValue(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    return type->IsSet();
}
void FireboltTypes_Uint8_ClearValue(FireboltTypes_Uint8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt8>*>(handle));
    type->Clear();
}

void FireboltTypes_Int8Handle_Addref(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    type.AddRef();
}
void FireboltTypes_Int8Handle_Release(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    type.Release();
}
bool FireboltTypes_Int8Handle_IsValid(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    return (type.IsValid());
}
const int8_t FireboltTypes_Int8(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    return (type->Value());
}
void FireboltTypes_int8_SetValue(FireboltTypes_Int8Handle handle, const int8_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    *type = value;
}
bool FireboltTypes_Int8_HasValue(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Int38_ClearValue(FireboltTypes_Int8Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt8>*>(handle));
    type->Clear();
}

void FireboltTypes_Uint16Handle_Addref(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    type.AddRef();
}
void FireboltTypes_Uint16Handle_Release(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    type.Release();
}
bool FireboltTypes_Uint16Handle_IsValid(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    return (type.IsValid());
}
const uint16_t FireboltTypes_Uint16(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    return (type->Value());
}
void FireboltTypes_Uint16_SetValue(FireboltTypes_Uint16Handle handle, const uint16_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    *type = value;
}
bool FireboltTypes_Uint16_HasValue(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Uint16_ClearValue(FireboltTypes_Uint16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt16>*>(handle));
    type->Clear();
}

void FireboltTypes_Int16Handle_Addref(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    type.AddRef();
}
void FireboltTypes_Int16Handle_Release(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    type.Release();
}
bool FireboltTypes_Int16Handle_IsValid(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    return (type.IsValid());
}
const int16_t FireboltTypes_Int16(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    return (type->Value());
}
void FireboltTypes_Int16_SetValue(FireboltTypes_Int16Handle handle, const int16_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    *type = value;
}
bool FireboltTypes_Int16_HasValue(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Int16_ClearValue(FireboltTypes_Int16Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt16>*>(handle));
    type->Clear();
}

void FireboltTypes_Uint32Handle_Addref(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    type.AddRef();
}
void FireboltTypes_Uint32Handle_Release(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    type.Release();
}
bool FireboltTypes_Uint32Handle_IsValid(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    return (type.IsValid());
}
const uint32_t FireboltTypes_Uint32(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    return (type->Value());
}
void FireboltTypes_Uint32_SetValue(FireboltTypes_Uint32Handle handle, const uint32_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    *type = value;
}
bool FireboltTypes_Uint32_HasValue(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Uint32_ClearValue(FireboltTypes_Uint32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt32>*>(handle));
    type->Clear();
}

void FireboltTypes_Int32Handle_Addref(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    type.AddRef();
}
void FireboltTypes_Int32Handle_Release(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    type.Release();
}
bool FireboltTypes_Int32Handle_IsValid(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    return (type.IsValid());
}
const int32_t FireboltTypes_Int32(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    return (type->Value());
}
void FireboltTypes_Int32_SetValue(FireboltTypes_Int32Handle handle, const int32_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    *type = value;
}
bool FireboltTypes_Int32_HasValue(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Int32_ClearValue(FireboltTypes_Int32Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt32>*>(handle));
    type->Clear();
}

void FireboltTypes_Uint64Handle_Addref(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    type.AddRef();
}
void FireboltTypes_Uint64Handle_Release(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    type.Release();
}
bool FireboltTypes_Uint64Handle_IsValid(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    return (type.IsValid());
}
const uint64_t FireboltTypes_Uint64(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    return (type->Value());
}
void FireboltTypes_Uint64_SetValue(FireboltTypes_Uint64Handle handle, const uint64_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    *type = value;
}
bool FireboltTypes_Uint64_HasValue(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Uint64_ClearValue(FireboltTypes_Uint64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecUInt64>*>(handle));
    type->Clear();
}

void FireboltTypes_Int64Handle_Addref(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    type.AddRef();
}
void FireboltTypes_Int64Handle_Release(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    type.Release();
}
bool FireboltTypes_Int64Handle_IsValid(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    return (type.IsValid());
}
const int64_t FireboltTypes_Int64(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    return (type->Value());
}
void FireboltTypes_Int64_SetValue(FireboltTypes_Int64Handle handle, const int64_t value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    *type = value;
}
bool FireboltTypes_Int64_HasValue(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Int64_ClearValue(FireboltTypes_Int64Handle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::DecSInt64>*>(handle));
    type->Clear();
}

void FireboltTypes_FloatHandle_Addref(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    type.AddRef();
}
void FireboltTypes_FloatHandle_Release(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    type.Release();
}
bool FireboltTypes_FloatHandle_IsValid(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    return (type.IsValid());
}
const float FireboltTypes_Float(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    return (type->Value());
}
void FireboltTypes_Float_SetValue(FireboltTypes_FloatHandle handle, const float value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    *type = value;
}
bool FireboltTypes_Float_HasValue(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Float_ClearValue(FireboltTypes_FloatHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Float>*>(handle));
    type->Clear();
}

void FireboltTypes_DoubleHandle_Addref(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    type.AddRef();
}
void FireboltTypes_DoubleHandle_Release(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    type.Release();
}
bool FireboltTypes_DoubleHandle_IsValid(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    return (type.IsValid());
}
const double FireboltTypes_Double(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    return (type->Value());
}
void FireboltTypes_Double_SetValue(FireboltTypes_DoubleHandle handle, const double value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    *type = value;
}
bool FireboltTypes_Double_HasValue(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Double_ClearValue(FireboltTypes_DoubleHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Double>*>(handle));
    type->Clear();
}

void FireboltTypes_BoolHandle_Addref(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    type.AddRef();
}
void FireboltTypes_BoolHandle_Release(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    type.Release();
}
bool FireboltTypes_BoolHandle_IsValid(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    return (type.IsValid());
}
const bool FireboltTypes_Bool(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    return (type->Value());
}
void FireboltTypes_Bool_SetValue(FireboltTypes_BoolHandle handle, const bool value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    *type = value;
}
bool FireboltTypes_Bool_HasValue(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_Bool_ClearValue(FireboltTypes_BoolHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::Boolean>*>(handle));
    type->Clear();
}

void FireboltTypes_StringHandle_Addref(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    type.AddRef();
}
void FireboltTypes_StringHandle_Release(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    type.Release();
}
bool FireboltTypes_StringHandle_IsValid(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    return (type.IsValid());
}
const char* FireboltTypes_String(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    return (type->Value().c_str());
}
void FireboltTypes_String_SetValue(FireboltTypes_StringHandle handle, const char* value)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    *type = value;
}
bool FireboltTypes_String_HasValue(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_String_ClearValue(FireboltTypes_StringHandle handle)
{
    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>& type = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::String>*>(handle));
    type->Clear();
}

void FireboltTypes_EnumHandle_Addref(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    type.AddRef();
}
void FireboltTypes_EnumHandle_Release(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    type.Release();
}
bool FireboltTypes_EnumHandle_IsValid(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    return (type.IsValid());
}
const char* FireboltTypes_Enum(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    return (type->Data().c_str());
}
void FireboltTypes_EnumHandle_SetValue(FireboltTypes_EnumHandle handle, const char* value)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    type->Data(value);
}
bool FireboltTypes_EnumHandle_HasValue(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    return (type->IsSet());
}
void FireboltTypes_EnumHandle_ClearValue(FireboltTypes_EnumHandle handle)
{
    WPEFramework::Core::ProxyType<Firebolt::EnumType>& type = *(static_cast<WPEFramework::Core::ProxyType<Firebolt::EnumType>*>(handle));
    type->Clear();
}

#ifdef __cplusplus
}
#endif
