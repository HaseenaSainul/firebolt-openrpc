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
import getPath from 'crocks/Maybe/getPath.js'
import pointfree from 'crocks/pointfree/index.js'
const { chain, filter, reduce, option, map } = pointfree
import logic from 'crocks/logic/index.js'
const { not } = logic
import safe from 'crocks/Maybe/safe.js'
import predicates from 'crocks/predicates/index.js'
const { isObject, isArray, propEq, pathSatisfies, hasProp, propSatisfies } = predicates

import { getHeaderText, getStyleGuardOpen, getIncludeDefinitions,
         getStyleGuardClose } from '../../shared/nativehelpers.mjs'
import { getSchemas } from '../../../shared/modules.mjs'
import { getNameSpaceOpen, getNameSpaceClose, getJsonDefinition, getImplForSchema,
         getEventCallbackImpl, getEventImpl, getPropertyEventCallbackImpl, getPropertyEventImpl,
         getPropertyGetterImpl, getPropertySetterImpl } from '../../shared/cpphelpers.mjs'

const generateCppForSchemas = (obj = {}, schemas = {}, srcDir = {}) => {
  const code = []
  const header = []

  header.push(getHeaderText())
  const jsonDefs = generateJsonTypesForSchemas(obj, schemas)
  const i = getIncludeDefinitions(obj, schemas, true, srcDir);
  header.push(i.join('\n'))

  const shape = generateImplForSchemas(obj, schemas)
  const methods = generateMethods(obj, schemas)
  let jsonData = new Set([...jsonDefs.deps, ...methods.jsonData])
  if (jsonDefs.type.length > 0) {
    jsonDefs.type.forEach(j => jsonData.add(j))
  }

  if (jsonData.size > 0) {
    code.length === 0 ? code.push(header.join('\n')) : null
    code.push(getNameSpaceOpen(obj))
    code.push([...jsonData].join('\n'))
    code.push(getNameSpaceClose(obj))
  }

  let enums = new Set ([...shape.enums, ...methods.enums])
  if (enums.size > 0) {
    code.length === 0 ? code.push(header.join('\n')) : null
    code.push(`\nnamespace WPEFramework {\n`)
    code.push([...enums].join('\n\n'))
    code.push(`\n}`)
  }
  let deps = new Set ([...shape.deps, ...methods.deps])
  if (deps.size || shape.type.length || methods.type.length) {
    code.length === 0 ? code.push(header.join('\n')) : null
    code.push(getStyleGuardOpen())
    deps.size ? code.push([...deps].join('\n')) : null
    code.join('\n')
    shape.type.length ? code.push(shape.type.join('\n')) : null
    methods.type.length ? code.push(methods.type.join('\n')) : null
    code.push(getStyleGuardClose() + '\n')
  }

  return code
}


//For each schema object, 
const generateImplForSchemas = (json, schemas = {}) => compose(
  reduce((acc, val) => {
    const shape = getImplForSchema(json, val[1], schemas, val[0])
    shape.type.length ? acc.type.push(shape.type.join('\n')) : null
    shape.deps.forEach(dep => acc.deps.add(dep))
    shape.enums.forEach(e => acc.enums.add(e))
    return acc
  }, {type: [], deps: new Set(), enums: new Set()}),
  getSchemas //Get schema under Components/Schemas
)(json)

const generateJsonTypesForSchemas = (json, schemas = {}) => compose(
  reduce((acc, val) => {
    const shape = getJsonDefinition(json, val[1], schemas, val[0])
    shape.type.length ? acc.type.push(shape.type.join('\n')) : null
    shape.deps.forEach(dep => acc.deps.add(dep))
    return acc
  }, {type: [], deps: new Set()}),
  getSchemas //Get schema under Definitions
)(json)


const generateMethods = (json, schemas = {}) => {
  
  let sig = {type: [], deps: new Set(), enums: new Set(), jsonData: new Set()}

  const properties = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('property'))) || []
  
  properties.forEach(property => {

    const event = m => m.tags.find(t => t.name === 'property:readonly' || t.name === 'property')
    const setter = m => m.tags.find(t => t.name === 'property')
    
    //Lets get the implementation for Result Schema if it is of type object
    //If it is array then get Impl for the Array element if it is an object
    let resJson = property.result.schema
    if (property.result.schema.type === 'array' ) {
      if (Array.isArray(json.items)) {
        resJson = json.items[0]
      }
      else {
        resJson = json.items
      }
    }
    let res = {}
    if ((resJson['$ref'] === undefined) || (resJson['$ref'][0] !== '#')) {
      res = getImplForSchema(json, resJson, schemas, property.result.name || property.name, {descriptions: true, level: 0})
      res.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
      res.deps.forEach(dep => sig.deps.add(dep))
      res.enums.forEach(e => sig.enums.add(e))
    }

    //Get the JsonData definition for the result schema
    let jType = getJsonDefinition(json, resJson, schemas, property.result.name || property.name, {descriptions: true, level: 0})
    jType.deps.forEach(j => sig.jsonData.add(j))
    jType.type.forEach(t => sig.jsonData.add(t))

    //Get the Implementation for the method
    res.type = getPropertyGetterImpl(property, json, schemas)
    sig.type.includes(res.type) === false ?  sig.type.push(res.type) : null

    if (event(property)) {
      sig.type.push(getPropertyEventCallbackImpl(property, json, schemas))
      sig.type.push(getPropertyEventImpl(property, json, schemas))
    }

    if (setter(property)) {
      sig.type.push(getPropertySetterImpl(property, json, schemas))
    }
  })

  const events = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('event'))) || []
  events.forEach(event => {
    sig.type.push(getEventCallbackImpl(event, json, schemas))
    sig.type.push(getEventImpl(event, json, schemas))
  })

  return sig
}

export {
  generateCppForSchemas,
  generateMethods
}
