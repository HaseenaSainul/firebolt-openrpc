/*
 * Copyright 2021 Comcast Cable Communications Management, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import helpers from 'crocks/helpers/index.js'
const { compose, getPathOr } = helpers
import safe from 'crocks/Maybe/safe.js'
import find from 'crocks/Maybe/find.js'
import getPath from 'crocks/Maybe/getPath.js'
import pointfree from 'crocks/pointfree/index.js'
const { chain, filter, option, map } = pointfree
import logic from 'crocks/logic/index.js'
import isEmpty from 'crocks/core/isEmpty.js'
const { and, not } = logic
import isString from 'crocks/core/isString.js'
import predicates from 'crocks/predicates/index.js'
import { getSchema, isNull, localizeDependencies } from './json-schema.mjs'
import { str } from 'ajv'
import def from 'ajv/dist/vocabularies/applicator/additionalItems.js'
const { isObject, isArray, propEq, pathSatisfies, hasProp, propSatisfies } = predicates

const getModuleName = json => getPathOr(null, ['info', 'title'], json) || json.title || 'missing'

const getHeaderText = () => {

    return `/*
*  Copyright 2022 Comcast
*
*  Auto Generated using firebolt-openrpc tools. DO NOT EDIT.
*
*/

`
}
    
const getIncludeGuardOpen = (json) => {
    return `
#ifndef _${getModuleName(json).toUpperCase()}_H
#define _${getModuleName(json).toUpperCase()}_H

`
}
    
const getStyleGuardOpen = () => {
    return `
#ifdef __cplusplus
extern "C" {
#endif

`
}
    
const getStyleGuardClose = () => {
    return `

#ifdef __cplusplus
}
#endif

`
}
    
const getIncludeGuardClose = () => {
    return `
#endif // Header Include Guard
`
}

const capitalize = str => str[0].toUpperCase() + str.substr(1)

const SdkTypesPrefix = 'Firebolt'

const Indent = '    '

// Maybe an array of <key, value> from the schema
const getDefinitions = compose(
  option([]),
  chain(safe(isArray)),
  map(Object.entries), // Maybe Array<Array<key, value>>
  chain(safe(isObject)), // Maybe Object
  getPath(['definitions']) // Maybe any
)

const getNativeType = json => {
    let type

    if(json.const) {
      if(typeof json.const === 'string') {
        type = 'char *'
      }
      else if(typeof json.const === 'number') {
        type = 'uint32_t'
        if(json.const < 0)
            type = 'int32_t'
      } else if (typeof json.const === 'boolean'){
        type = 'bool'
      }
    }
    if(json.type === 'string') {
        type = 'char *'
    }
    else if (json.type === 'number' || json.type === 'integer') { //Lets keep it simple for now
        type = 'uint32_t'
        if ((json.minimum && json.minimum < 0)
             || (json.exclusiveMinimum && json.exclusiveMinimum < 0)) {
            type = 'int32_t'
        }
    }
    else if (json.type === 'boolean') {
      type = 'bool'
    }
    return type
}


const getObjectHandleManagement = varName => {

    let result = `typedef void* ${varName}Handle;
${varName}Handle ${varName}Handle_Create(void);
void ${varName}Handle_Addref(${varName}Handle handle);
void ${varName}Handle_Release(${varName}Handle handle);
bool ${varName}Handle_IsValid(${varName}Handle handle);
`
    return result
}

const getPropertyAccessors = (objName, propertyName, propertyType,  options = {level:0, readonly:false, optional:false}) => {

  let result = `${Indent.repeat(options.level)}${propertyType} ${objName}_Get_${propertyName}(${objName}Handle handle);` + '\n'

  if(!options.readonly) {
    result += `${Indent.repeat(options.level)}void ${propertyType} ${objName}_Set_${propertyName}(${objName}Handle handle, ${propertyType} ${propertyName.toLowerCase()});` + '\n'
  }

  if(options.optional === true) {
    result += `${Indent.repeat(options.level)}bool ${objName}_has_${propertyName}(${objName}Handle handle);` + '\n'
    result += `${Indent.repeat(options.level)}void ${objName}_clear_${propertyName}(${objName}Handle handle);` + '\n'
  }

  return result
}

const getMapAccessors = (typeName, nativeType,  level=0) => {

  let res

  res = `${Indent.repeat(level)}uint32_t ${typeName}_KeysCount(${typeName}Handle handle);` + '\n'
  res += `${Indent.repeat(level)}void ${typeName}_AddKey(${typeName}Handle handle, char* key, ${nativeType} value);` + '\n'
  res += `${Indent.repeat(level)}void ${typeName}_RemoveKey(${typeName}Handle handle, char* key;` + '\n'
  res += `${Indent.repeat(level)}${nativeType} ${typeName}_FindKey(${typeName}Handle handle, char* key;` + '\n'

  return res
}


const getTypeName = (moduleName, varName, upperCase = false) => {
  let mName = upperCase ? moduleName.toUpperCase() : capitalize(moduleName)
  let vName = upperCase ? varName.toUpperCase() : capitalize(varName) 

  return `${mName}_${vName}`
}

const getArrayAccessors = (arrayName, valueType) => {

  let res = `${arrayName}_Size(${arrayName}Handle handle);` + '\n'
  res += `${valueType} ${arrayName}_Get(${arrayName}Handle handle, uint32_t index);` + '\n'
  res += `${arrayName}_Add(${arrayName}Handle handle, ${valueType} value);` + '\n'
  res += `${arrayName}_Clear(${arrayName}Handle handle);` + '\n'

  return res
}

const enumValue = (val,prefix) => {
  const keyName = val.replace(/[\.\-]/g, '_').replace(/\+/g, '_plus').replace(/([a-z])([A-Z0-9])/g, '$1_$2').toUpperCase()
  return `    ${prefix.toUpperCase()}_${keyName.toUpperCase()}`
}

const generateEnum = (schema, prefix)=> {
  if (!schema.enum) {
    return ''
  }
  else {
    let str = `typedef enum {\n`
    str += schema.enum.map(e => enumValue(e, prefix)).join(',\n')
    str += `\n} ${prefix};\n`
    return str
  }
}

function getSchemaType(module, json, name = '', schemas = {}, options = {level: 0, descriptions: true}) {
  if (json.schema) {
    json = json.schema
  }

  console.log(`name - ${name}, schema - ${JSON.stringify(json, null, 4)}`)

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = []

  if (json['$ref']) {
    if (json['$ref'][0] === '#') {
      //Ref points to local schema 
      //Get Path to ref in this module and getSchemaType
      res = getSchemaType(module, getPath(json['$ref'], module, schemas), json, schemas, {descriptions: descriptions, level: level+1})
      structure.deps = res.deps
      structure.type = res.type
      return structure
    }
    else {
      // External dependency. Return only type
      // e.g, "https://meta.comcast.com/firebolt/entertainment#/definitions/ProgramType"

      //Get the module of this definition
      const schema = getSchema(json['$ref'].split('#')[0], schemas) || module

      //Get the schema of the definition
      const definition = getPath(json['$ref'], schema, schemas)
      const name = definition.title || json['$ref'].split('/').pop()

      res = getSchemaType(schema, definition, json, schemas, {descriptions: descriptions, level: level+1})
      //We are only interested in the type definition for external modules
      structure.type = res.type
      return structure
    }
  }
  else if (json.const) {
    structure.type = getNativeType(json)
    return structure
  }
  else if (json['x-method']) {
    return structure
    //throw "x-methods not supported yet"
  }
  else if (json.type === 'string' && json.enum) {
    //Enum
    let typeName = getTypeName(getModuleName(module), name || json.title) 
    structure.deps.add(generateEnum(json, typeName))
    structure.type.push(typeName)
    return structure
  }
  else if (json.type === 'array' && json.items) {
    //Array examples
    /*1. "Resolution": {
        "type": "array",
        "items": [
          {
            "type": "integer"
          },
          {
            "type": "integer"
          }
        ],
        "additionalItems": false,
        "minItems": 2,
        "maxItems": 2
      }

      2. "waysToWatch": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WayToWatch"
            },
            "description": "An array of ways a user is might watch this entity, regardless of entitlements."
          }

      3. "videoQuality": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["SD", "HD", "UHD"]
            },
            "description": "List of the video qualities available via the WayToWatch."
          }

      4. "audioLanguages": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of audio track languages available on the WayToWatch. The first is considered the primary language. Languages are expressed as ISO 639 1/2 codes."
          }
    */ 
    if (Array.isArray(json.items)) {
      //TODO
      const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
      if (!IsHomogenous(json.items)) {
        throw 'Heterogenous Arrays not supported yet'
      }
      let res = getSchemaType(module, json.items[0],schemas)
    }
    else {
      // grab the type for the non-array schema
      let res = getSchemaType(module, json.items, name, schemas)
    }
    structure.deps = res.deps
    let n = getTypeName(getModuleName(module), name || json.title) 
    let def = getObjectHandleManagement(n + 'Array')
    def += getArrayAccessors(n + 'Array', res.type)
    structure.deps.add(def)
    structure.type.push(n + '_ArrayHandle')
    return structure
  }
  else if (json.allOf) {
    let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x)])
    if (json.title) {
      union.title = json.title
    }
    return getSchemaType(module, union, schemas, options)
  }
  else if (json.oneOf || json.anyOf) {
    return structure
    //TODO
  }
  else if (json.type === 'object' && json.title) {
    return structure
    //TODO
  }
  else if (json.type) {
    structure.type = getNativeType(json)
    return structure
  }
  return structure
}

const isOptional = (prop, json) => (!json.required || !json.required.includes(prop)) 


function getSchemaShape(moduleJson = {}, json = {}, schemas = {}, name, options = {level: 0, descriptions: true}) {
    json = JSON.parse(JSON.stringify(json))
    let level = options.level 
    let descriptions = options.descriptions

    let structure = {}
    structure["deps"] = new Set() //To avoid duplication of local ref definitions
    structure["type"] = []

    console.log(`name - ${name}, schema - ${JSON.stringify(json, null, 4)}`)

    if (json['$ref']) {
      if (json['$ref'][0] === '#') {
        //Ref points to local schema 
        //Get Path to ref in this module and getSchemaType
        
        schema = getPath(json['$ref'], module, schemas)
        const name = schema.title || json['$ref'].split('/').pop()
        res = getSchemaType(module, getPath(json['$ref'], module, schemas), json, schemas, name, {descriptions: descriptions, level: level+1})
        structure.deps = res.deps
        structure.type = res.type
      }
      else {
        // External dependency. Return only type
        // e.g, "https://meta.comcast.com/firebolt/entertainment#/definitions/ProgramType"
  
        //Get the module of this definition
        const schema = getSchema(json['$ref'].split('#')[0], schemas) || module
  
        //Get the schema of the definition
        const definition = getPath(json['$ref'], schema, schemas)
        const pname = (json.title || name) + (definition.title || json['$ref'].split('/').pop())
  
        res = getSchemaShape(schema, definition, schemas, pname,{descriptions: descriptions, level: level})
        //We are only interested in the type definition for external modules
        structure.type = res.type
      }
    }
    //If the schema is a const, 
    else if (json.hasOwnProperty('const')) { 
      if (level > 0) {
        typeName = getTypeName(getModuleName(module), name)
        structure.type.push(getPropertyAccessors(typeName, capitalize(name), typeof json.const, {level: level, readonly:true, optional:false}))
      }
    }
    else if (json.type === 'object') {

      if (json.properties) {
        let tName = getTypeName(getModuleName(moduleJson), name)
        structure.type.push(getObjectHandleManagement(tName) + '\n')
        Object.entries(json.properties).forEach(([pname, prop]) => {
          const res = getSchemaType(moduleJson, prop, schemas, pname, {descriptions: descriptions, level: level, title: true})
          structure.type.push(getPropertyAccessors(tName, capitalize(pname), res.type, {level: level, readonly:false, optional:isOptional(pname, json)}))
          structure.deps = new Set([...structure.deps, ...res.deps])
        })
      }
      else if (json.propertyNames && json.propertyNames.enum) {
        //propertyNames in object not handled yet
      }
      else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
        //This is a map of string to type in schema
        //Get the Type
        let type = getSchemaType(moduleJson, json.additionalProperties, schemas)
        let tName = getTypeName(getModuleName(moduleJson), name)
        structure.deps = type.deps
        let res = getObjectHandleManagement(tName) + '\n'
        res += getMapAccessors(getTypeName(getModuleName(moduleJson), name), type.type,{descriptions: descriptions, level: level})
        structure.deps.add(res)

      }
      else if (json.patternProperties) {
        throw "patternProperties are not supported by Firebolt"
      }
    }
    else if (json.anyOf) {
      //return '  '.repeat(level) + `${prefix}${title}${operator} ` + json.anyOf.map(s => getSchemaType(moduleJson, s, schemas, options)).join(' | ')
    }
    else if (json.oneOf) {
      //return '  '.repeat(level) + `${prefix}${title}${operator} ` + json.oneOf.map(s => getSchemaType(moduleJson, s, schemas, options)).join(' | ')
    }
    else if (json.allOf) {
      let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], moduleJson, schemas) || x : x), options])
      if (json.title) {
        union.title = json.title
      }
      delete union['$ref']

      return getSchemaShape(moduleJson, union, schemas, name, options)
    }
    else if (json.type === 'array') {
      const isArrayWithSchemaForItems = json.type === 'array' && json.items && !Array.isArray(json.items)
      const isArrayWithSpecificItems = json.type === 'array' && json.items && Array.isArray(json.items)
      
  
      if (isArrayWithSchemaForItems) {
        
      }
      else if (isArrayWithSpecificItems) {
        
      }
    }
    else{
      let res = getSchemaType(moduleJson, json, name, schemas, {level: level, descriptions: descriptions})
      structure.deps = res.deps
    }
    return structure
  }

  export {
    getHeaderText,
    getIncludeGuardOpen,
    getStyleGuardOpen,
    getStyleGuardClose,
    getIncludeGuardClose,
    getDefinitions,
    getNativeType,
    getSchemaType,
    getSchemaShape
  }