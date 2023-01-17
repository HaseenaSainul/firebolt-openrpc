/*
*  Copyright 2022 Comcast
*
*  Auto Generated using firebolt-openrpc tools. DO NOT EDIT.
*
*/



#ifndef _PROVIDER_H
#define _PROVIDER_H


#include "Common/Types.h"
#include "Firebolt/Types.h"

#ifdef __cplusplus
extern "C" {
#endif


/* Last */
typedef enum {
    PROVIDER_LAST_FOO,
    PROVIDER_LAST_BAR
} Provider_Last;

/* NoResponseParametes - The result of the provider response. */
typedef void* Provider_NoResponseParametesHandle;
Provider_NoResponseParametesHandle Provider_NoResponseParametesHandle_Create(void);
void Provider_NoResponseParametesHandle_Addref(Provider_NoResponseParametesHandle handle);
void Provider_NoResponseParametesHandle_Release(Provider_NoResponseParametesHandle handle);
bool Provider_NoResponseParametesHandle_IsValid(Provider_NoResponseParametesHandle handle);

/* first */
bool Provider_NoResponseParametes_Get_First(Provider_NoResponseParametesHandle handle);
void Provider_NoResponseParametes_Set_First(Provider_NoResponseParametesHandle handle, bool first);
bool Provider_NoResponseParametes_has_First(Provider_NoResponseParametesHandle handle);
void Provider_NoResponseParametes_clear_First(Provider_NoResponseParametesHandle handle);

/* second */
uint32_t Provider_NoResponseParametes_SecondArray_Size(Provider_NoResponseParametes_SecondArrayHandle handle);
uint32_t Provider_NoResponseParametes_SecondArray_Get(Provider_NoResponseParametes_SecondArrayHandle handle, uint32_t index);
void Provider_NoResponseParametes_SecondArray_Add(Provider_NoResponseParametes_SecondArrayHandle handle, uint32_t value);
void Provider_NoResponseParametes_SecondArray_Clear(Provider_NoResponseParametes_SecondArrayHandle handle);

/* last */
Provider_Last Provider_NoResponseParametes_Get_Last(Provider_NoResponseParametesHandle handle);
void Provider_NoResponseParametes_Set_Last(Provider_NoResponseParametesHandle handle, Provider_Last last);
bool Provider_NoResponseParametes_has_Last(Provider_NoResponseParametesHandle handle);
void Provider_NoResponseParametes_clear_Last(Provider_NoResponseParametesHandle handle);

/* SimpleProviderRequest */
typedef void* Provider_SimpleProviderRequestHandle;
Provider_SimpleProviderRequestHandle Provider_SimpleProviderRequestHandle_Create(void);
void Provider_SimpleProviderRequestHandle_Addref(Provider_SimpleProviderRequestHandle handle);
void Provider_SimpleProviderRequestHandle_Release(Provider_SimpleProviderRequestHandle handle);
bool Provider_SimpleProviderRequestHandle_IsValid(Provider_SimpleProviderRequestHandle handle);

/* correlationId - The id that was passed in to the event that triggered a provider method to be called */
char* Provider_SimpleProviderRequest_Get_CorrelationId(Provider_SimpleProviderRequestHandle handle);
void Provider_SimpleProviderRequest_Set_CorrelationId(Provider_SimpleProviderRequestHandle handle, char* correlationid);

/* parameters - The result of the provider response. */
/* NoResponseProviderRequest */
typedef void* Provider_NoResponseProviderRequestHandle;
Provider_NoResponseProviderRequestHandle Provider_NoResponseProviderRequestHandle_Create(void);
void Provider_NoResponseProviderRequestHandle_Addref(Provider_NoResponseProviderRequestHandle handle);
void Provider_NoResponseProviderRequestHandle_Release(Provider_NoResponseProviderRequestHandle handle);
bool Provider_NoResponseProviderRequestHandle_IsValid(Provider_NoResponseProviderRequestHandle handle);

/* correlationId - The id that was passed in to the event that triggered a provider method to be called */
char* Provider_NoResponseProviderRequest_Get_CorrelationId(Provider_NoResponseProviderRequestHandle handle);
void Provider_NoResponseProviderRequest_Set_CorrelationId(Provider_NoResponseProviderRequestHandle handle, char* correlationid);

/* parameters - The result of the provider response. */
Provider_NoResponseParametesHandle Provider_NoResponseProviderRequest_Get_Parameters(Provider_NoResponseProviderRequestHandle handle);
void Provider_NoResponseProviderRequest_Set_Parameters(Provider_NoResponseProviderRequestHandle handle, Provider_NoResponseParametesHandle parameters);
bool Provider_NoResponseProviderRequest_has_Parameters(Provider_NoResponseProviderRequestHandle handle);
void Provider_NoResponseProviderRequest_clear_Parameters(Provider_NoResponseProviderRequestHandle handle);




#ifdef __cplusplus
}
#endif



#endif // Header Include Guard
