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

import { getHeaderText, getStyleGuardOpen, getIncludeDefinitions, getEventContextParamSchema,
         getStyleGuardClose, getPolymorphicReducedParamSchema } from '../../shared/nativehelpers.mjs'
import { getSchemas } from '../../../shared/modules.mjs'

import { getNameSpaceOpen, getNameSpaceClose, getJsonDefinition, getImplForSchema,
         getEventCallbackImpl, getEventImpl, getPropertyEventCallbackImpl, getPropertyEventImpl,
         getPropertyGetterImpl, getPropertySetterImpl, getImplForMethodParam, getMethodImpl,
         getImplForPolymorphicMethodParam, getPolymorphicMethodImpl, getPolymorphicEventImpl,
         getImplForEventContextParams, getPolymorphicEventCallbackImpl } from '../../shared/cpphelpers.mjs'

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
    
    //Lets get the implementation for result schema
    let impl = getImplForMethodParam(property.result, json, property.result.name || property.name, schemas)
    impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
    impl.deps.forEach(dep => sig.deps.add(dep))
    impl.enums.forEach(e => sig.enums.add(e))
    impl.jsonData.forEach(j => sig.jsonData.add(j))

    //Get the Implementation for the method
    sig.type.push(getPropertyGetterImpl(property, json, schemas))

    if (event(property)) {
/*      property.result = (property.params.length > 0) ? getEventContextParamSchema(property) : property.result
      console.log(property.result)

      //Lets get the implementation for each param schema
      let impl = getImplForEventContextParams(property.result, json, property.result.name, schemas)
      console.log(impl)
      impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
      impl.deps.forEach(dep => sig.deps.add(dep))
      impl.enums.forEach(e => sig.enums.add(e))
      impl.jsonData.forEach(j => sig.jsonData.add(j))*/

      sig.type.push(getPropertyEventCallbackImpl(property, json, schemas))
      sig.type.push(getPropertyEventImpl(property, json, schemas))
    }

    if (setter(property)) {
      sig.type.push(getPropertySetterImpl(property, json, schemas))
    }
  })

  const events = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('event'))) || []
  events.forEach(event => {
/*    event.result = (event.params.length > 0) ? getEventContextParamSchema(event) : event.result

    //Lets get the implementation for each param schema
    let impl = getImplForEventContextParams(event.result, json, event.result.name, schemas)
    impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
    impl.deps.forEach(dep => sig.deps.add(dep))
    impl.enums.forEach(e => sig.enums.add(e))
    impl.jsonData.forEach(j => sig.jsonData.add(j))*/

    sig.type.push(getEventCallbackImpl(event, json, schemas))
    sig.type.push(getEventImpl(event, json, schemas))
  })
 
  {
    //Generate methods that are not tagged with any of the below tags
    const excludeTagNames = ['property','property:readonly','property:immutable', 'property::immutable', 'polymorphic-pull', 'polymorphic-reducer', 'event']
    const getNamesFromTags = tags => tags && tags.map(t => t.name)
    const methods = json.methods.filter( m => {
      const tNames = getNamesFromTags(m.tags)
      if (tNames) {
        return !(tNames.some(t => excludeTagNames.includes(t)))
      }
      return true
    }) || []
    methods.forEach(method => {
      //Lets get the implementation for each param schema
      method.params.forEach(param => {
        let impl = getImplForMethodParam(param, json, param.name, schemas)
        impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
        impl.deps.forEach(dep => sig.deps.add(dep))
        impl.enums.forEach(e => sig.enums.add(e))
        impl.jsonData.forEach(j => sig.jsonData.add(j))
      })

      //Lets get the implementation for result schema
      let impl = getImplForMethodParam(method.result, json, method.result.name, schemas, method.name)
      impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
      impl.deps.forEach(dep => sig.deps.add(dep))
      impl.enums.forEach(e => sig.enums.add(e))
      impl.jsonData.forEach(j => sig.jsonData.add(j))

      let mImpl = getMethodImpl(method, json, schemas)
      sig.type.push(mImpl)
    })
  }

  {
    const getNamesFromTags = tags => tags && tags.map(t => t.name)
    const methods = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('polymorphic-pull')))
    methods.forEach(method => {
      //Lets get the implementation for params schema
      let impl = getImplForPolymorphicMethodParam(method, json, schemas)
      impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
      impl.deps.forEach(dep => sig.deps.add(dep))
      impl.enums.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      impl.jsonData.forEach(j => sig.jsonData.add(j))

      let mImpl = getPolymorphicMethodImpl(method, json, schemas)
      sig.type.push(mImpl)
      mImpl = getPolymorphicEventCallbackImpl(method, json, schemas)
      sig.type.push(mImpl)
      mImpl = getPolymorphicEventImpl(method, json, schemas)
      sig.type.push(mImpl)
    })
  }
  {
    //Generate Polymorphic Reducer Methods - Generate single method that take an array of all params listed
    const reducerMethods = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('polymorphic-reducer'))) || []

    reducerMethods.forEach(method => {
      method.params = [getPolymorphicReducedParamSchema(method)]

      //Lets get the implementation for each param schema
      method.params.forEach(param => {
        let impl = getImplForMethodParam(param, json, param.name, schemas)
        impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
        impl.deps.forEach(dep => sig.deps.add(dep))
        impl.enums.forEach(e => sig.enums.add(e))
        impl.jsonData.forEach(j => sig.jsonData.add(j))
      })

      //Lets get the implementation for result schema
      let impl = getImplForMethodParam(method.result, json, method.result.name, schemas, method.name)
      impl.type.forEach(type => (sig.type.includes(type) === false) ?  sig.type.push(type) : null)
      impl.deps.forEach(dep => sig.deps.add(dep))
      impl.enums.forEach(e => sig.enums.add(e))
      impl.jsonData.forEach(j => sig.jsonData.add(j))

      let mImpl = getMethodImpl(method, json, schemas)
      sig.type.push(mImpl)
    })
  }

  return sig
}

export {
  generateCppForSchemas,
  generateMethods
}
