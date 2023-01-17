/*
*  Copyright 2022 Comcast
*
*  Auto Generated using firebolt-openrpc tools. DO NOT EDIT.
*
*/



#ifndef _COMMON_TYPES_H
#define _COMMON_TYPES_H


#include "Firebolt/Types.h"

#ifdef __cplusplus
extern "C" {
#endif


/* AudioProfile */
typedef enum {
    TYPES_AUDIOPROFILE_STEREO,
    TYPES_AUDIOPROFILE_DOLBY_DIGITAL_5_1,
    TYPES_AUDIOPROFILE_DOLBY_DIGITAL_7_1,
    TYPES_AUDIOPROFILE_DOLBY_DIGITAL_5_1_PLUS,
    TYPES_AUDIOPROFILE_DOLBY_DIGITAL_7_1_PLUS,
    TYPES_AUDIOPROFILE_DOLBY_ATMOS
} Types_AudioProfile;

/* SemanticVersion */
typedef void* Types_SemanticVersionHandle;
Types_SemanticVersionHandle Types_SemanticVersionHandle_Create(void);
void Types_SemanticVersionHandle_Addref(Types_SemanticVersionHandle handle);
void Types_SemanticVersionHandle_Release(Types_SemanticVersionHandle handle);
bool Types_SemanticVersionHandle_IsValid(Types_SemanticVersionHandle handle);

/* major */
uint32_t Types_SemanticVersion_Get_Major(Types_SemanticVersionHandle handle);
void Types_SemanticVersion_Set_Major(Types_SemanticVersionHandle handle, uint32_t major);

/* minor */
uint32_t Types_SemanticVersion_Get_Minor(Types_SemanticVersionHandle handle);
void Types_SemanticVersion_Set_Minor(Types_SemanticVersionHandle handle, uint32_t minor);

/* patch */
uint32_t Types_SemanticVersion_Get_Patch(Types_SemanticVersionHandle handle);
void Types_SemanticVersion_Set_Patch(Types_SemanticVersionHandle handle, uint32_t patch);

/* readable */
char* Types_SemanticVersion_Get_Readable(Types_SemanticVersionHandle handle);
void Types_SemanticVersion_Set_Readable(Types_SemanticVersionHandle handle, char* readable);


/* BooleanMap */
typedef void* Types_BooleanMapHandle;
Types_BooleanMapHandle Types_BooleanMapHandle_Create(void);
void Types_BooleanMapHandle_Addref(Types_BooleanMapHandle handle);
void Types_BooleanMapHandle_Release(Types_BooleanMapHandle handle);
bool Types_BooleanMapHandle_IsValid(Types_BooleanMapHandle handle);

uint32_t Types_BooleanMap_KeysCount(Types_BooleanMapHandle handle);
void Types_BooleanMap_AddKey(Types_BooleanMapHandle handle, char* key, bool value);
void Types_BooleanMap_RemoveKey(Types_BooleanMapHandle handle, char* key);
bool Types_BooleanMap_FindKey(Types_BooleanMapHandle handle, char* key);

/* ListenResponse */
typedef void* Types_ListenResponseHandle;
Types_ListenResponseHandle Types_ListenResponseHandle_Create(void);
void Types_ListenResponseHandle_Addref(Types_ListenResponseHandle handle);
void Types_ListenResponseHandle_Release(Types_ListenResponseHandle handle);
bool Types_ListenResponseHandle_IsValid(Types_ListenResponseHandle handle);

/* event */
char* Types_ListenResponse_Get_Event(Types_ListenResponseHandle handle);
void Types_ListenResponse_Set_Event(Types_ListenResponseHandle handle, char* event);

/* listening */
bool Types_ListenResponse_Get_Listening(Types_ListenResponseHandle handle);
void Types_ListenResponse_Set_Listening(Types_ListenResponseHandle handle, bool listening);

/* ProviderRequest */
typedef void* Types_ProviderRequestHandle;
Types_ProviderRequestHandle Types_ProviderRequestHandle_Create(void);
void Types_ProviderRequestHandle_Addref(Types_ProviderRequestHandle handle);
void Types_ProviderRequestHandle_Release(Types_ProviderRequestHandle handle);
bool Types_ProviderRequestHandle_IsValid(Types_ProviderRequestHandle handle);

/* correlationId - The id that was passed in to the event that triggered a provider method to be called */
char* Types_ProviderRequest_Get_CorrelationId(Types_ProviderRequestHandle handle);
void Types_ProviderRequest_Set_CorrelationId(Types_ProviderRequestHandle handle, char* correlationid);

/* parameters - The result of the provider response. */
/* ProviderResponse */
typedef void* Types_ProviderResponseHandle;
Types_ProviderResponseHandle Types_ProviderResponseHandle_Create(void);
void Types_ProviderResponseHandle_Addref(Types_ProviderResponseHandle handle);
void Types_ProviderResponseHandle_Release(Types_ProviderResponseHandle handle);
bool Types_ProviderResponseHandle_IsValid(Types_ProviderResponseHandle handle);

/* correlationId - The id that was passed in to the event that triggered a provider method to be called */
char* Types_ProviderResponse_Get_CorrelationId(Types_ProviderResponseHandle handle);
void Types_ProviderResponse_Set_CorrelationId(Types_ProviderResponseHandle handle, char* correlationid);

/* result - The result of the provider response. */


#ifdef __cplusplus
}
#endif



#endif // Header Include Guard
