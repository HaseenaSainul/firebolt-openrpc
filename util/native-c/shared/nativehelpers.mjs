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
import pointfree from 'crocks/pointfree/index.js'
const { chain, filter, reduce, option, map } = pointfree
import predicates from 'crocks/predicates/index.js'
import { getPath, getSchema, getExternalRefs } from '../../shared/json-schema.mjs'
import { fsReadFile } from '../../shared/helpers.mjs'
import deepmerge from 'deepmerge'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const { isObject, isArray, propEq, pathSatisfies, hasProp, propSatisfies } = predicates

const getModuleName = json => getPathOr(null, ['info', 'title'], json) || json.title || 'missing'

const getFireboltStringType = () => 'FireboltTypes_StringHandle'

const areParamsValid = (params) => params.every(p => p.type && (p.type.length > 0))
const getOptionalParamCount = (params) => {
  let count = 0
  params.every(p => {
     count += (p.type && !p.required) ? 1 : 0
     return true
  })
  return count
}

const getAnyOfSchema = (param, module, schemas) => {
  let schema
  if (param.schema.anyOf) {
    schema = param.schema
  }
  else {
    let sch = param['$ref'] ? param['$ref'] : param.schema['$ref'] ? param.schema['$ref'] : null
    if (sch) {
      let refSchema = getPath(sch, module, schemas)
      schema = refSchema.anyOf ? refSchema : schema
    }
  }
  return schema
}

const getParamsSignature = (structure, signature, method) => {
  signature += '( '
  if (areParamsValid(structure.params)) {
    signature += structure.params.map(p => ` ${p.type} ${p.name}`).join(',')
  }
  if (structure["result"] && (structure["result"].length > 0) && (IsResultBooleanSuccess(method) !== true)) {
    if (structure.params.length > 0) {
      signature += ','
    }
    signature += ` ${structure["result"]}* ${method.result.name || method.name}`
  }
  signature += ' )'
  structure.signatures.push(signature)
  return structure
}

const IsResultBooleanSuccess = (method) => (method && method.result && method.result.name === 'success' && (method.result.schema.type === 'boolean' || method.result.schema.const))

const IsCallsMetricsMethod = (method) => (method && method.tags && method.tags.find(t => t.name === 'calls-metrics') ? true : false)
const hasCallsMetricsMethods = (json) => {
  let callsMetricsMethods = json.methods && json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('calls-metrics')))
  return (callsMetricsMethods && (callsMetricsMethods.length > 0))
}

const hasProperties = (prop) => {
  let hasProperty = false
  if (prop.properties) {
     hasProperty = true
  } else if (prop.additionalProperties && ( prop.additionalProperties.type && (((prop.additionalProperties.type === 'object') && prop.additionalProperties.properties) || (prop.additionalProperties.type !== 'object')))) {
     hasProperty = true
  }
  return hasProperty
}

const getSchemaRef = (name) => {
  let schema = {}
  schema['$ref'] = '#/components/schemas/' + name
  return schema
}

const getPolymorphicSchema = (method, name) => {
  let schema = {}
  method.params.every(param => {
    if (param.name === 'result') {
      schema = getSchemaRef(name)
      return false
    }
    return true
  })

  return schema
}

function union(schemas, module, commonSchemas) {

  const result = {};
  for (const schema of schemas) {
    for (const [key, value] of Object.entries(schema)) {
      if (!result.hasOwnProperty(key)) {
        // If the key does not already exist in the result schema, add it
        if (value && value.anyOf) {
          result[key] = union(value.anyOf, module, commonSchemas)
        } else if (key === 'title' || key === 'description' || key === 'required') {
          console.warn(`Ignoring "${key}"`)
        } else {
          result[key] = value;
        }
      } else if (key === 'type') {
        // If the key is 'type', merge the types of the two schemas
        if(result[key] === value) {
          console.warn(`Ignoring "${key}" that is already present and same`)
        } else {
          console.warn(`ERROR "${key}" is not same -${JSON.stringify(result, null, 4)} ${key} ${result[key]} - ${value}`);
          throw "ERROR: type is not same"
        }
      } else {
        //If the Key is a const then merge them into an enum
        if(value && value.const) {
          if(result[key].enum) {
            result[key].enum = Array.from(new Set([...result[key].enum, value.const]))
          }
          else {
            result[key].enum = Array.from(new Set([result[key].const, value.const]))
            delete result[key].const
          }
        }
        // If the key exists in both schemas and is not 'type', merge the values
        else if (Array.isArray(result[key])) {
          // If the value is an array, concatenate the arrays and remove duplicates
          result[key] = Array.from(new Set([...result[key], ...value]))
        } else if (result[key] && result[key].enum && value && value.enum) {
          //If the value is an enum, merge the enums together and remove duplicates
          result[key].enum = Array.from(new Set([...result[key].enum, ...value.enum]))
        } else if (typeof result[key] === 'object' && typeof value === 'object') {
          // If the value is an object, recursively merge the objects
          result[key] = union([result[key], value], module, commonSchemas);
        } else if (result[key] !== value) {
          // If the value is a primitive and is not the same in both schemas, ignore it
          console.warn(`Ignoring conflicting value for key "${key}"`)
        }
      }
    }
  }
  return result;
}


const getPolymorphicReducedParamSchema = (method) => {
  let reducedParamSchema = {
    name: `${method.name}Params`,
    schema: {
      type: "array",
      items: {
        title: `${method.name}Param`,
        type: "object",
        properties: {}
      }
    },
    required: true
  }
  method.params.forEach(p => reducedParamSchema.schema.items.properties[p.name] = p)
  return reducedParamSchema
}

const getPolymorphicSchemaType = (method, module, federatedType, schemas) => {
  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["param"] = []
  structure["enum"] = []
  structure["json"] = {}

  let name =  capitalize(method.name + federatedType)
  let schema = getPolymorphicSchema(method, name)
  if (schema['$ref']) {
    let schemaType = getSchemaType(module, schema, name, schemas)
    schemaType.deps.forEach(d => structure.deps.add(d))
    schemaType.enum.forEach(enm => { (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : null})
    if (schemaType.type && (schemaType.type.length > 0)) {
      let p = {}
      p["type"] = getParamType(schemaType)
      p["name"] = name
      structure.param = p
      structure.json = schemaType.json
    }
    if (method.result.schema) {
      let result = getSchemaType(module, method.result.schema, method.result.name || method.name, schemas, method.name)
      result.deps.forEach(dep => structure.deps.add(dep))
      result.enum.forEach(enm => { (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : null})
      structure["result"] = getParamType(result)
    }
  }

  return structure
}

const getHeaderText = () => {

    return `/*
 *  Copyright 2022 Comcast
 *
 *  Auto Generated using firebolt-openrpc tools. DO NOT EDIT.
 *
 */
`
}
    
const getIncludeGuardOpen = (json, prefix=null) => {
  prefix = prefix ? `${prefix.toUpperCase()}_` : ''
    return `#ifndef _${prefix}${getModuleName(json).toUpperCase()}_H
#define _${prefix}${getModuleName(json).toUpperCase()}_H
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
#endif`
}

const getIncludeGuardClose = () => {
    return `#endif // Header Include Guard`
}

const capitalize = str => str[0].toUpperCase() + str.substr(1)
const description = (title, str='') => '/* ' + title + (str.length > 0 ? ' - ' + str : '') + ' */'
const isOptional = (prop, json) => (!json.required || !json.required.includes(prop))

const SdkTypesPrefix = 'Firebolt'

const Indent = '    '

const getParamType = (type) => {
    let res = {}
    if ((type.json && (type.json.type === 'object') && (!type.json.properties) && (!type.json.additionalProperties)) || (type.type === 'char*')) {
      res = getFireboltStringType()
    }
    else {
      res = type.type
    }
    return res;
}

const getNativeType = json => {
    let type
    let jsonType = json.const ? typeof json.const : json.type
    if (jsonType === 'string') {
        type = 'char*'
    }
    else if (jsonType === 'number') {
        type = 'float'
    }
    else if (jsonType === 'integer') {
        type = 'int32_t'
    }
    else if (jsonType === 'boolean') {
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

  if (!options.readonly) {
    result += `${Indent.repeat(options.level)}void ${objName}_Set_${propertyName}(${objName}Handle handle, ${propertyType} ${propertyName.toLowerCase()});` + '\n'
  }

  if (options.optional === true) {
    result += `${Indent.repeat(options.level)}bool ${objName}_Has_${propertyName}(${objName}Handle handle);` + '\n'
    result += `${Indent.repeat(options.level)}void ${objName}_Clear_${propertyName}(${objName}Handle handle);` + '\n'
  }

  return result
}

const getMapAccessors = (typeName, nativeType,  level=0) => {

  let res

  res = `${Indent.repeat(level)}uint32_t ${typeName}_KeysCount(${typeName}Handle handle);` + '\n'
  res += `${Indent.repeat(level)}void ${typeName}_AddKey(${typeName}Handle handle, char* key, ${nativeType} value);` + '\n'
  res += `${Indent.repeat(level)}void ${typeName}_RemoveKey(${typeName}Handle handle, char* key);` + '\n'
  res += `${Indent.repeat(level)}${nativeType} ${typeName}_FindKey(${typeName}Handle handle, char* key);` + '\n'

  return res
}

const getTypeName = (moduleName, varName, prefixName = '', upperCase = false) => {
  let mName = upperCase ? moduleName.toUpperCase() : capitalize(moduleName)
  let vName = upperCase ? varName.toUpperCase() : capitalize(varName)
  prefixName = (prefixName.length > 0) ? (upperCase ? prefixName.toUpperCase() : capitalize(prefixName)) : prefixName
  let name = (prefixName.length > 0) ? `${mName}_${prefixName}_${vName}` : `${mName}_${vName}`
  return name
}

const getArrayAccessors = (arrayName, propertyName, propertyType, valueType) => {

  let res = `uint32_t ${arrayName}_${propertyName}Array_Size(${propertyType}Handle handle);` + '\n'
  res += `${valueType} ${arrayName}_${propertyName}Array_Get(${propertyType}Handle handle, uint32_t index);` + '\n'
  res += `void ${arrayName}_${propertyName}Array_Add(${propertyType}Handle handle, ${valueType} value);` + '\n'
  res += `void ${arrayName}_${propertyName}Array_Clear(${propertyType}Handle handle);` + '\n'

  return res
}

const enumValue = (val,prefix) => {
  const keyName = val.replace(/[\.\-:]/g, '_').replace(/\+/g, '_plus').replace(/([a-z])([A-Z0-9])/g, '$1_$2').toUpperCase()
  return `${prefix.toUpperCase()}_${keyName.toUpperCase()}`
}

const generateEnum = (schema, prefix)=> {
  if (!schema.enum) {
    return ''
  }
  else {
    let str = `typedef enum {\n`
    str += schema.enum.map(e => `    ${enumValue(e, prefix)}`).join(',\n')
    str += `\n} ${prefix};\n`
    return str
  }
}

const getArrayElementSchema = (json, module, schemas = {}, name) => {
  let result = ''
  if (json.type === 'array' && json.items) {
    if (Array.isArray(json.items)) {
      result = json.items[0]
    }
    else {
      // grab the type for the non-array schema
      result = json.items
    }
    if (result['$ref']) {
      result = getPath(result['$ref'], module, schemas)
    }
  }
  else if (json.type == 'object') {
    if (json.properties) {
      Object.entries(json.properties).every(([pname, prop]) => {
        if (prop.type === 'array') {
          result = getArrayElementSchema(prop, module, schemas)
          if (name === capitalize(pname)) {
             return false
          }
        }
        return true
      })
    }
  }

  return result
}

const getIncludeDefinitions = (json = {}, schemas = {}, cpp = false, srcDir = {}, common = false) => {
  let internal = []
  const headers = []
  if (cpp == true) {
    headers.push(`#include "FireboltSDK.h"`)
    if (hasCallsMetricsMethods(json) === true) {
      headers.push(`#include "Metrics.h"`)
    }
    internal.push((common === true) ? `#include "Common/${capitalize(getModuleName(json))}.h"` : `#include "${capitalize(getModuleName(json))}.h"`)
    if ((common === true) && (fs.existsSync(srcDir + `/JsonData_${capitalize(getModuleName(json))}.h`) === true)) {
      internal.push(`#include "JsonData_${capitalize(getModuleName(json))}.h"`)
    }
  } else {
    headers.push(`#include "Firebolt.h"`)
  }

  let externalHeaders = (getExternalRefs(json)
    .map(ref => {
      const mod = getModuleName(getSchema(ref.split('#')[0], schemas))
      
      let i = `#include "Common/${capitalize(mod)}.h"`
      if (cpp === true) {
        if (fs.existsSync(srcDir + `/JsonData_${capitalize(mod)}.h`) === true) {
          i += '\n' + `#include "JsonData_${capitalize(mod)}.h"`
        }
      }
      return i
    })
    .filter((item, index, arr) => arr.indexOf(item) === index))

  if (externalHeaders.length) {
    externalHeaders.forEach((header) => {
      var external = header.split('\n')
      external.forEach(header => (headers.includes(header) === false) ? headers.push(header) : null)
    })
  }
  internal.forEach((header) => (headers.includes(header) === false) ? headers.push(header) : null)

  return headers
}

function validJsonObjectProperties(json = {}) {

  let valid = true
  if (json.type === 'object' || (json.additonalProperties && typeof json.additonalProperties.type === 'object')) {
    if (json.properties || json.additonalProperties) {
      Object.entries(json.properties || json.additonalProperties).every(([pname, prop]) => {
        if (!prop['$ref'] && (pname !== 'additionalProperties') &&
           ((!prop.type && !prop.const && (prop.schema && !prop.schema.type)) || (Array.isArray(prop.type) && (prop.type.find(t => t === 'null'))))) {
          valid = false
        }
        return valid
      })
    }
  }
  return valid
}

function getSchemaType(module = {}, json = {}, name = '', schemas = {}, prefixName = '', options = {level: 0, descriptions: true, title: false}) {
  if (json.schema) {
    json = json.schema
  }

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = ''
  structure["json"] = []
  structure["enum"] = []
  structure["name"] = {}
  structure["namespace"] = {}

  if (json['$ref']) {
    if (json['$ref'][0] === '#') {
      //Ref points to local schema 
      //Get Path to ref in this module and getSchemaType
      let definition = getPath(json['$ref'], module, schemas)
      let tName = definition.title || json['$ref'].split('/').pop()
      const res = getSchemaType(module, definition, tName, schemas, '', {descriptions: options.descriptions, level: options.level})
      res.deps.forEach(dep => structure.deps.add(dep))
      structure.type = res.type
      structure.json = res.json
      structure.name = res.name
      structure.namespace = res.namespace
      return structure
    }
    else {
      // External dependency.
      // e.g, "https://meta.comcast.com/firebolt/entertainment#/definitions/ProgramType"

      //Get the module of this definition
      const schema = getSchema(json['$ref'].split('#')[0], schemas) || module

      //Get the schema of the definition
      const definition = getPath(json['$ref'], module, schemas)
      let tName = definition.title || json['$ref'].split('/').pop()
      const res = getSchemaType(schema, definition, tName, schemas, '', {descriptions: options.descriptions, level: options.level})
      //We are only interested in the type definition for external modules
      structure.type = res.type
      structure.json = res.json
      structure.name = res.name
      structure.namespace = res.namespace
      return structure
    }
  }
  else if (json.const) {
    structure.type = getNativeType(json)
    structure.json = json
    return structure
  }
  else if (json['x-method']) {
    console.log(`WARNING UNHANDLED: x-method in ${name}`)
    return structure
    //throw "x-methods not supported yet"
  }
  else if (json.type === 'string' && json.enum) {
    //Enum
    if (name) {
       structure.name = capitalize(name)
    }
    let typeName = getTypeName(getModuleName(module), name || json.title, prefixName)
    let res = description(capitalize(name || json.title), json.description) + '\n' + generateEnum(json, typeName)
    structure.json = json
    structure.type = typeName
    structure.namespace = getModuleName(module)
    res.length ? ((structure.enum.includes(res) === false) ? structure.enum.push(res): null) : null
    return structure
  }
  else if (Array.isArray(json.type)) {
    let type = json.type.find(t => t !== 'null')
    console.log(`WARNING UNHANDLED: type is an array containing ${json.type}`)
  }
  else if (json.type === 'array' && json.items && (validJsonObjectProperties(json) === true)) {
    let res
    if (Array.isArray(json.items)) {
      //TODO
      const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
      if (!IsHomogenous(json.items)) {
        throw 'Heterogenous Arrays not supported yet'
      }
      res = getSchemaType(module, json.items[0], json.items[0].name || name, schemas, prefixName)
    }
    else {
      // grab the type for the non-array schema
      res = getSchemaType(module, json.items, json.items.name || name, schemas, prefixName)
    }

    res.deps.forEach(dep => structure.deps.add(dep))
    let arrayName = capitalize(res.name) + capitalize(res.json.type)
    let n = getTypeName(getModuleName(module), arrayName, prefixName)
    let def = description(arrayName, json.description) + '\n'
    if (options.level === 0) {
      def += getObjectHandleManagement(n + 'Array') + '\n'
    }

    def += getArrayAccessors(getModuleName(module), arrayName, (n + 'Array'), res.type)
    structure.name = res.name || name && (capitalize(name))
    structure.deps.add(def)
    structure.type = n + 'ArrayHandle'
    structure.json = json
    structure.enum = res.enum
    structure.namespace = getModuleName(module)
    return structure
  }
  else if (json.allOf) {
    let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x)])
    if (json.title) {
      union['title'] = json.title
    }
    else {
      union['title'] = name
    }
    delete union['$ref']
    return getSchemaType(module, union, '', schemas, prefixName, options)
  }
  else if (json.oneOf) {
    structure.type = 'char*'
    structure.json.type = 'string'
    return structure
  }
  else if (json.anyOf) {
    console.log("json.anyOf = ------> name = " + name);
    let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)

    let refsResolved = [...json.anyOf.map(x => x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x)]
    let allOfsResolved = [...refsResolved.map(sch => { 
      let schema = sch.allOf ? deepmerge.all([...sch.allOf.map(x => {
        let schema1 = x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x
        return schema1
      })]) : sch
      schema.title = !schema.title ? sch.title : schema.title
      return schema
    })]

    let mergedSchema = union(allOfsResolved, module, schemas)
    if (json.title) {
      mergedSchema['title'] = json.title
    }
    else {
      mergedSchema['title'] = name
    }

    if (mergedSchema.properties.data)
    delete mergedSchema['$ref']
    
    return getSchemaType(module, mergedSchema, '', schemas, prefix, options)
  }
  else if (json.type === 'object') {
    structure.json = json
    if (hasProperties(json)) {
      let res = getSchemaShape(module, json, schemas, json.title || name, prefixName, {descriptions: options.descriptions, level: 0})
      res.deps.forEach(dep => structure.deps.add(dep))
      res.type.forEach(t => structure.deps.add(t))
      structure.type = getTypeName(getModuleName(module), json.title || name, prefixName) + 'Handle'
      res.enum.forEach(enm => (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : structure.enum)
      structure.namespace = (json.namespace ? json.namespace : getModuleName(module))
    } else {
      structure.type = getFireboltStringType()
    }
    if (name) {
      structure.name = capitalize(name)
    }

    return structure
  }
  else if (json.type) {
    structure.type = getNativeType(json)
    structure.json = json
    if (name || json.title) {
      structure.name = capitalize(name || json.title)
    }
    structure.namespace = getModuleName(module)
    return structure
  }
  return structure
}

function getSchemaShape(moduleJson = {}, json = {}, schemas = {}, name = '', prefixName = '', options = {level: 0, descriptions: true}) {
    json = JSON.parse(JSON.stringify(json))
    let level = options.level
    let descriptions = options.descriptions
    let structure = {}
    structure["deps"] = new Set() //To avoid duplication of local ref definitions
    structure["type"] = []
    structure["enum"] = []

    if (json['$ref']) {
      if (json['$ref'][0] === '#') {
        //Ref points to local schema 
        //Get Path to ref in this module and getSchemaType
        const schema = getPath(json['$ref'], module, schemas)
        const tname = schema.title || json['$ref'].split('/').pop()
        res = getSchemaShape(module, schema, schemas, tname, prefixName, {descriptions: descriptions, level: level})
        res.deps.forEach(dep => structure.deps.add(dep))
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
  
        res = getSchemaShape(schema, definition, schemas, pname, prefixName, {descriptions: descriptions, level: level})
        //We are only interested in the type definition for external modules
        structure.type = res.type
      }
    }
    //If the schema is a const,
    else if (json.hasOwnProperty('const')) {
      if (level > 0) {

        let t = description(name, json.description)
        typeName = getTypeName(getModuleName(moduleJson), name, prefixName)
        t += getPropertyAccessors(typeName, capitalize(name), typeof json.const, {level: level, readonly:true, optional:false})
        structure.type.push(t)
      }
    }
    else if (json.type === 'object') {

      if (json.properties && (validJsonObjectProperties(json) === true)) {
        let tName = getTypeName(getModuleName(moduleJson), name, prefixName)
        let t = description(name, json.description)
        t += '\n' +  getObjectHandleManagement(tName)
        Object.entries(json.properties).forEach(([pname, prop]) => {
          let res
          var desc = '\n' + description(pname, prop.description)
          if (prop.type === 'array') {
            if (Array.isArray(prop.items)) {
              //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              res = getSchemaType(moduleJson, prop.items[0], pname, schemas, prefixName, {level : options.level, descriptions: options.descriptions, title: true})
            }
            else {
              // grab the type for the non-array schema
              res = getSchemaType(moduleJson, prop.items, pname, schemas, prefixName, {level : options.level, descriptions: options.descriptions, title: true})
            }
            if (res.type && res.type.length > 0) {

              let def = getArrayAccessors(tName, capitalize(prop.title || pname), tName, res.type)
              t += desc + '\n' + def
            }
            else {
              console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
          } else {
            res = getSchemaType(moduleJson, prop, pname, schemas, prefixName, {descriptions: descriptions, level: level + 1, title: true})
            if (res.type && res.type.length > 0) {
              if (res.json.type === 'object' && !res.json.properties) {
                res.type = getParamType(res)
              }
              t += desc + '\n' + getPropertyAccessors(tName, capitalize(pname), res.type, {level: level, readonly:false, optional:isOptional(pname, json)})
            }
            else {
            }
          }
          res.deps.forEach(dep => structure.deps.add(dep))
          res.enum.forEach(enm => (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : null)
        })
        structure.type.push(t)
      }
      else if (json.propertyNames && json.propertyNames.enum) {
        //propertyNames in object not handled yet
      }
      else if (json.additionalProperties && (typeof json.additionalProperties === 'object') && (validJsonObjectProperties(json) === true)) {
        //This is a map of string to type in schema
        //Get the Type
        let type = getSchemaType(moduleJson, json.additionalProperties, name, schemas, prefixName)
        if (!type.type || (type.type.length === 0)) {
            type.type = 'char*'
        }

        let tName = getTypeName(getModuleName(moduleJson), name, prefixName)
        type.deps.forEach(dep => structure.deps.add(dep))

        let t = description(name, json.description)
        t += '\n' + getObjectHandleManagement(tName) + '\n'
        t += getMapAccessors(getTypeName(getModuleName(moduleJson), name, prefixName), type.type, {descriptions: descriptions, level: level})
        structure.type.push(t)
        type.enum.forEach(enm => (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : structure.enum)
      }
      else if (json.patternProperties) {
        console.log(`WARNING: patternProperties are not supported by Firebolt(inside getModuleName(moduleJson):${name})`)
      }
    }
    else if (json.anyOf) {
      console.log("json.anyOf = ------> name = " + name);
      let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)

      let refsResolved = [...json.anyOf.map(x => x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x)]
      let allOfsResolved = [...refsResolved.map(sch => sch.allOf ? deepmerge.all([...sch.allOf.map(x => x['$ref'] ? getPath(x['$ref'], module, schemas) || x : x)]) : sch)]

      let mergedSchema = union(allOfsResolved, module, schemas)
      if (json.title) {
        mergedSchema['title'] = json.title
      }
      else {
        mergedSchema['title'] = name
      }
  
      delete mergedSchema['$ref']

      return getSchemaShape(moduleJson, mergedSchema, schemas, name, prefix, options)
    }
    else if (json.oneOf) {
      //Just ignore schema shape, since this has to be treated as string
    }
    else if (json.allOf) {
      let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], moduleJson, schemas) || x : x)], options)
      if (json.title) {
        union['title'] = json.title
      }
      else {
        union['title'] = name
      }
      let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)

      delete union['$ref']
      return getSchemaShape(moduleJson, union, schemas, name, prefix, options)
    }
    else if (json.type === 'array') {
      let res = getSchemaType(moduleJson, json, name, schemas, prefixName, {level: 0, descriptions: descriptions})
      res.deps.forEach(dep => structure.deps.add(dep))
      res.enum.forEach(enm => (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : structure.enum)
    }
    else {
      let res = getSchemaType(moduleJson, json, name, schemas, prefixName, {level: level, descriptions: descriptions})
      res.deps.forEach(dep => structure.deps.add(dep))
      structure.enum = res.enum
      res.enum.forEach(enm => (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : structure.enum)
    }
    return structure
  }

  function getResultName(method, module, schemas) {
     let name = method.result.name
     if (method.result.schema) {
        let schemaType = getSchemaType(module, method.result.schema, method.result.name, schemas)
        name = schemaType.name || (method.result.schema.items && method.result.schema.items.title)
     }
     return name
  }

  function isAnyofType(type, module, schemas) {
    let anyOfType = false
    if (type.schema) {
      if (type.schema.anyOf) {
        anyOfType = true
      }
      else {
        let schemaType = getSchemaType(module, type.schema, type.name, schemas)
        if (schemaType.json && schemaType.json.anyOf) {
          if (!type.name && !type.title) {
             throw method + ": does not has both title and name"
          }
          anyOfType = true
        }
      }
    }
    return anyOfType
  }

  function isAnyofParamsAndResult(method, module, schemas) {
    let anyOfTypeParam = false
    method.params.every(param => {
      anyOfTypeParam = isAnyofType(param, module, schemas)
      return !anyOfTypeParam
    })
    anyOfTypeParam = (anyOfTypeParam == true) ? isAnyofType(method.result, module, schemas) : false
    return anyOfTypeParam
  }

  function validateParamsAndResult(method, module, schemas) {
    if (isAnyofParamsAndResult == true) {
      throw method.name + " : policy schema is not support, since it has anyOf type for both param(s) and result"
    }
  }

const getUnusedDefinitionsInSchema = (moduleJson, combinedSchemas) => {
  let unUsedDefinitions = []
  let local_schemas, prefix

  const isReferencedBySchema = (name = '', moduleJson = {}) => {
    let modStr = JSON.stringify(moduleJson.definitions || moduleJson)
    return (modStr.includes(name))
  }

    if (moduleJson.components && moduleJson.components.schemas && Object.values(moduleJson.components.schemas).length) {
        local_schemas = moduleJson.components.schemas
        prefix = '#/components/schemas/'
    }
    else if (moduleJson.definitions && Object.values(moduleJson.definitions).length) {
        local_schemas = moduleJson.definitions
        prefix = '#/definitions/'
    }

    if (local_schemas) {
        Object.entries(local_schemas).forEach(([n, v]) => {
          let referred = false
          Object.entries(combinedSchemas).every(([mName, module]) => {
            if (isReferencedBySchema(prefix + n, module)) {
              referred = true
              return false
            }
            return true
          })
          if (!referred) {
            unUsedDefinitions.push(prefix + n)
          }
      })
    }
    return unUsedDefinitions
  }

  function getParamsDetails(method, module, schemas, prefix) {
    let structure = {}
    structure["params"] = []

    method.params.forEach(param => {
      let anyOfSchema = getAnyOfSchema(param, module, schemas)
      if (anyOfSchema) {
        structure["anyOfParams"] = []
        for (const schema of anyOfSchema.anyOf) {
          let anyOfParam = getSchemaType(module, schema, schema.name || schema.title, schemas)
          structure.anyOfParams.push(anyOfParam)
        }
      }
      else {
        let schemaType = getSchemaType(module, param.schema, param.name, schemas)
        if (param.required !== undefined && schemaType) {
          let p = {}
          p["type"] = getParamType(schemaType)
          p["name"] = param.name
          p["required"] = param.required
          structure.params.push(p)
        }
      }
    })
    if (method.result.schema) {
      let anyOfSchema = getAnyOfSchema(method.result, module, schemas)
      if (anyOfSchema) {
        structure["anyOfResult"] = []
        for (const schema of anyOfSchema.anyOf) {
          let anyOfResult = getSchemaType(module, schema, schema.name || schema.title, schemas, prefix)
          structure.anyOfResult.push(anyOfResult)
        }

      }
      else {
        let result = getSchemaType(module, method.result.schema, method.result.name || method.name, schemas, prefix)
        structure["result"] = getParamType(result)
      }
    }
    return structure
  }

  function generateMethodParamsSignature(params) {
    let signatureParams = ''
    params.map(p => {
      signatureParams += (signatureParams.length > 0) ? ',' : ''
      if (p.required === true) {
        signatureParams += ` ${p.type} ${p.name}`
      }
      else if (p.required === false) {
        signatureParams += (p.type === getFireboltStringType() ? ` ${p.type} ${p.name}` : ` ${p.type}* ${p.name}`)
      }
    })
    return signatureParams
  }

  function generateMethodSignature(methodName, method, module, schemas, getter, prefix = '') {
    validateParamsAndResult(method, module, schemas)
    let structure = getParamsDetails(method, module, schemas, prefix)

    structure["signature"] = `uint32_t ${methodName}(`
    if (areParamsValid(structure.params)) {
      structure.signature += generateMethodParamsSignature(structure.params)
    }

    if (structure["result"] && (structure["result"].length > 0) && (IsResultBooleanSuccess(method) !== true)) {
      if (structure.params.length > 0) {
        structure.signature += ','
      }
      if (getter === true) {
        structure.signature += ` ${structure["result"]}* ${method.result.name || method.name}`
      }
      else {
        structure.signature += ` ${structure["result"]} ${method.result.name || method.name}`
      }
    }

    structure.signature += ' )'
    return structure
  }

  function generateEventCallbackSignature(methodName, method, module, schemas, prefix = '') {
    let structure = getParamsDetails(method, module, schemas, prefix)
    structure["signature"] = `typedef void ${methodName}( const void* userData`

    let params = ''
    if (areParamsValid(structure.params)) {
      params += generateMethodParamsSignature(structure.params)
      structure.signature += (params.length > 0) ? ',' : ''
      structure.signature += params
    }

    if (structure["result"] && (structure["result"].length > 0) && (IsResultBooleanSuccess(method) !== true)) {
      structure.signature += `, ${structure["result"]} ${method.result.name || method.name}`
    }
    structure.signature += ' )'

    return structure
  }

  function generateEventSignature(callbackName, method, module, schemas, prefix = '') {
    validateParamsAndResult(method, module, schemas)

    let structure = getParamsDetails(method, module, schemas, prefix)
    structure["registersig"] = `uint32_t ${capitalize(getModuleName(module))}_Register_${capitalize(method.name)}Update(`
    structure["unregistersig"] = `uint32_t ${capitalize(getModuleName(module))}_Unregister_${capitalize(method.name)}Update(`
    structure['result'] = ''

    let params = ''
    if (areParamsValid(structure.params)) {
      params += generateMethodParamsSignature(structure.params)
      structure.registersig += params
    }

    if (structure["result"] && (structure["result"].length > 0) && (IsResultBooleanSuccess(method) !== true)) {
      structure.result.push(`${structure["result"]} ${method.result.name || method.name}`)
    }
    structure.registersig += (params.length > 0) ? ',' : ''
    structure.registersig += ` ${callbackName} userCB, const void* userData )`
    structure.unregistersig += ` ${callbackName} userCB)`

    return structure
  }

  function getPropertyGetterSignature(method, module, schemas) {
    return generateMethodSignature(`${capitalize(getModuleName(module))}_Get${capitalize(method.name)}`, method, module, schemas, true)
  }

  function getPropertySetterSignature(method, module, schemas) {
    return generateMethodSignature(`${capitalize(getModuleName(module))}_Set${capitalize(method.name)}`, method, module, schemas, false)
  }

  function getPropertyEventCallbackSignature(method, module, schemas) {
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    return generateEventCallbackSignature(`(*On${methodName}Changed)`, method, module, schemas)
  }

  function getPropertyEventSignature(method, module, schemas) {
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    return generateEventSignature(`On${methodName}Changed`, method, module, schemas)
  }

  function getEventCallbackSignature(method, module, schemas) {
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    return generateEventCallbackSignature(`(*${methodName}Callback)`, method, module, schemas)
  }

  function getEventSignature(method, module, schemas, prefix = '') {
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    return generateEventSignature(`${prefix}${methodName}Callback`, method, module, schemas)
  }

  function getMethodSignature(method, module, schemas) {
    validateParamsAndResult(method, module, schemas)

    let methodName = `${capitalize(getModuleName(module))}_${capitalize(method.name)}`
    let structure = {}
    structure["deps"] = new Set() //To avoid duplication of local ref definitions
    structure["params"] = []
    structure["enum"] = []

    method.params.forEach(param => {
      let anyOfSchema = getAnyOfSchema(param, module, schemas)
      if (anyOfSchema) {
        structure["anyOfParams"] = []
        for (const schema of anyOfSchema.anyOf) {
          let anyOfParam = getSchemaType(module, schema, schema.name || schema.title, schemas)
          structure.anyOfParams.push(anyOfParam)
        }
      } else {
        let schemaType = getSchemaType(module, param.schema, param.name, schemas)
        schemaType.deps.forEach(d => structure.deps.add(d))
        let p = {}
        p["type"] = getParamType(schemaType)
        p["name"] = param.name
        structure.params.push(p)
        schemaType.enum.forEach(enm => { (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : null})
      }
    })
    if (method.result.schema) {
      let anyOfSchema = getAnyOfSchema(method.result, module, schemas)
      if (anyOfSchema) {
        structure["anyOfResults"] = []
        for (const schema of anyOfSchema.anyOf) {
          let anyOfResult = getSchemaType(module, schema, schema.name || schema.title, schemas, method.name)
          structure.anyOfResults.push(anyOfResult)
        }
      }
      else {
        let result = getSchemaType(module, method.result.schema, method.result.name || method.name, schemas, method.name)
        result.deps.forEach(dep => structure.deps.add(dep))
        result.enum.forEach(enm => { (structure.enum.includes(enm) === false) ? structure.enum.push(enm) : null})
        structure["result"] = getParamType(result)
      }
    }
    let signature = `uint32_t ${methodName}`
    structure["signatures"] = []
    if (structure.anyOfResult || structure.anyOfParams) {
      if (structure.anyOfResult) {
        structure.anyOfResult.forEach(result => {
          let sig = signature + result.json.title
          structure = getParamsSignature(structure, sig, method)
	})
      }
      else if (structure.anyOfParams) {
        structure.anyOfParams.forEach(param => {
          let sig = signature +  param.json.title
          structure = getParamsSignature(structure, sig, method)
        })
      }
    } else {
      structure = getParamsSignature(structure, signature, method)
    }
    return structure
  }

  function getPolymorphicMethodSignature(method, module, schemas) {
    validateParamsAndResult(method, module, schemas)

    let structure = getPolymorphicSchemaType(method, module, 'FederatedResponse', schemas)
    if (structure.param.type.length > 0 && structure.result.length > 0) {
      structure["signature"] = `uint32_t ${capitalize(getModuleName(module))}_Push${capitalize(method.name)}(`
      structure.signature += ` ${structure.param.type} ${structure.param.name} )`
    }
    return structure
  }

  function getPolymorphicEventCallbackSignature(method, module, schemas) {
    let structure = getPolymorphicSchemaType(method, module, 'FederatedRequest', schemas)
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    if (structure.param.type.length > 0) {
      structure["signature"] = `typedef void (*OnPull${methodName}Callback)(const void* userData, ${structure.param.type})`
    }
    return structure
  }

  function getPolymorphicEventSignature(method, module, schemas) {
    validateParamsAndResult(method, module, schemas)

    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    return `${description(method.name, 'Listen to updates')}\n` + `uint32_t ${capitalize(getModuleName(module))}_Register_${capitalize(method.name)}Pull(OnPull${methodName}Callback, const void* userData);\n` + `uint32_t ${capitalize(getModuleName(module))}_Unregister_${capitalize(method.name)}Pull(OnPull${methodName}Callback)`
  }

  function getTemporalSetMethodSignature(method, module, schemas, prefix = '') {
    validateParamsAndResult(method, module, schemas)

    let structure = getParamsDetails(method, module, schemas, prefix)
    let methodName = `${capitalize(getModuleName(module))}_${capitalize(method.name)}`

    structure["signature"] = `uint32_t ${methodName}_FirstMatch(`
    if (areParamsValid(structure.params)) {
      structure.signature += generateMethodParamsSignature(structure.params)
    }

    if (structure["result"] && (structure["result"].length > 0) && (IsResultBooleanSuccess(method) !== true)) {
      if (structure.params.length > 0) {
        structure.signature += ','
      }
      structure.signature += ` ${structure["result"]}* ${method.result.name || method.name}`

      let result = getResultName(method, module, schemas)
      let availableCB = `On${result}AvailableCB`
      let unavailableCB = `On${result}UnavailableCB`
      structure["availableCB"] = availableCB
      structure["unavailableCB"] = unavailableCB

      structure["startsig"] = `uint32_t ${methodName}_Start(${availableCB}, ${unavailableCB})`
      structure["stopsig"] = `uint32_t ${methodName}_Stop(${availableCB}, ${unavailableCB})`

      structure["availablesig"] = `typedef void (${availableCB})(`
      structure["unavailablesig"] = `typedef void (${unavailableCB})(`

      structure.availablesig += ` ${structure["result"]} ${method.result.name || method.name}`
      structure.unavailablesig += ` ${structure["result"]} ${method.result.name || method.name}`
    }

    structure.signature += ' )'
    structure.availablesig += ' )'
    structure.unavailablesig += ' )'
    return structure
  }

  export {
    getHeaderText,
    getIncludeGuardOpen,
    getStyleGuardOpen,
    getStyleGuardClose,
    getIncludeGuardClose,
    getNativeType,
    getSchemaType,
    getSchemaShape,
    getModuleName,
    getIncludeDefinitions,
    getPropertyGetterSignature,
    getPropertySetterSignature,
    getPropertyEventSignature,
    getPropertyEventCallbackSignature,
    getEventSignature,
    getEventCallbackSignature,
    capitalize,
    description,
    isOptional,
    getTypeName,
    enumValue,
    getFireboltStringType,
    getArrayElementSchema,
    getMethodSignature,
    validJsonObjectProperties,
    hasProperties,
    getSchemaRef,
    getPolymorphicSchema,
    getPolymorphicReducedParamSchema,
    getPolymorphicMethodSignature,
    getPolymorphicEventCallbackSignature,
    getPolymorphicEventSignature,
    IsResultBooleanSuccess,
    IsCallsMetricsMethod,
    getParamsDetails,
    getTemporalSetMethodSignature,
    getUnusedDefinitionsInSchema
  }
