/*
*  Copyright 2022 Comcast
*
*  Auto Generated using firebolt-openrpc tools. DO NOT EDIT.
*
*/



#ifndef _ADVANCED_H
#define _ADVANCED_H


#include "Firebolt/Types.h"

#ifdef __cplusplus
extern "C" {
#endif


/* Advanced */
typedef void* Advanced_AdvancedHandle;
Advanced_AdvancedHandle Advanced_AdvancedHandle_Create(void);
void Advanced_AdvancedHandle_Addref(Advanced_AdvancedHandle handle);
void Advanced_AdvancedHandle_Release(Advanced_AdvancedHandle handle);
bool Advanced_AdvancedHandle_IsValid(Advanced_AdvancedHandle handle);

/* aString */
char* Advanced_Advanced_Get_AString(Advanced_AdvancedHandle handle);
void Advanced_Advanced_Set_AString(Advanced_AdvancedHandle handle, char* astring);
bool Advanced_Advanced_has_AString(Advanced_AdvancedHandle handle);
void Advanced_Advanced_clear_AString(Advanced_AdvancedHandle handle);

/* aMethod */



#ifdef __cplusplus
}
#endif



#endif // Header Include Guard
