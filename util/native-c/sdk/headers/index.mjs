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

/**
 * 1. Add License text
 * 2. Get Module name and generate include gaurd
 * 3. Add C++ Style guard open
 * 4. Generate Macros (if any)
 * 5. Generate types
 * 6. Generate function prototypes
 * 7. Add C++ Style guard close
 * 8. Add Include Guard Close 
 *
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
import { description, getHeaderText, getIncludeGuardOpen, getStyleGuardOpen, getStyleGuardClose,
         getIncludeGuardClose, getIncludeDefinitions, getSchemaShape, getSchemaType,
         getPropertySetterSignature, getPropertyGetterSignature, getPropertyEventSignature,
         getPropertyEventCallbackSignature, getEventSignature, getEventCallbackSignature,
         getModuleName, capitalize, getMethodSignature, getPolymorphicMethodSignature,
         getPolymorphicReducedParamSchema, getPolymorphicEventCallbackSignature,
         getPolymorphicEventSignature, getTemporalSetMethodSignature } from '../../shared/nativehelpers.mjs'
import { getSchemas } from '../../../shared/modules.mjs'
import { getNameSpaceOpen, getNameSpaceClose, getJsonDefinition, getImplForSchema } from '../../shared/cpphelpers.mjs'




// Maybe an array of <key, value> from the schema
const getDefinitions = compose(
  option([]),
  chain(safe(isArray)),
  map(Object.entries), // Maybe Array<Array<key, value>>
  chain(safe(isObject)), // Maybe Object
  getPath(['definitions']) // Maybe any
)

const isUnUsed = (name, unUsedSchemas = []) => unUsedSchemas.includes(name)

const generateHeaderForDefinitions = (obj = {}, schemas = {}, unUsedSchemas = []) => {
  const code = []

  const shape = generateTypesForDefinitions(obj, schemas ,unUsedSchemas)
  code.push(getHeaderText())
  code.push(getIncludeGuardOpen(obj, 'common'))
  const i = getIncludeDefinitions(obj, schemas)
  code.push(i.join('\n'))
  if (shape.deps.size || shape.type.length || shape.enum.length) {
    code.push(getStyleGuardOpen(obj))
    shape.enum.length ? code.push(shape.enum.join('\n')) : null
    shape.type.forEach(type => shape.deps.add(type))
    shape.deps.size ? code.push([...shape.deps].join('\n')) : null
    code.join('\n')
    code.push(getStyleGuardClose())
  }
  code.push('\n' + getIncludeGuardClose())
  code.join('\n')
  return code
}

const generateHeaderForModules = (obj = {}, schemas = {}, unUsedSchemas=[]) => {
  const code = []

  const shape = generateTypesForModules(obj, schemas, unUsedSchemas)
  const m = generateMethodPrototypes(obj, schemas)

  if (m.deps.size || m.type.length || m.enum.length || shape.type.length || shape.enum.length || shape.deps.size) {
    code.push(getHeaderText())
    code.push(getIncludeGuardOpen(obj))
    const i = getIncludeDefinitions(obj, schemas)
    code.push(i.join('\n'))
    code.push(getStyleGuardOpen(obj))

    shape.enum.length ? code.push(shape.enum.join('\n')) : null
    m.enum.length ? code.push(m.enum && m.enum.join('\n')) : null

    m.deps.forEach(dep => shape.deps.add(dep))
    shape.type.forEach(type => shape.deps.add(type))
    shape.deps.size ? code.push([...shape.deps].join('\n')) : null

    m.type.length ? code.push(m.type && m.type.join('\n')) : null

    code.push(getStyleGuardClose())
    code.push('\n' + getIncludeGuardClose())
    code.join('\n')
  }
  return code
}
const generateJsonDataHeaderForDefinitions = (obj = {}, schemas = {}, unUsedSchemas=[]) => {
  const code = []
  const shape = generateJsonTypesForDefinitons(obj, schemas, unUsedSchemas)
  if (shape.deps.size > 0 || shape.type.length > 0) {
    code.push(getHeaderText())
    code.push('#pragma once' + '\n')
    const i = getIncludeDefinitions(obj, schemas)
    code.push(i.join('\n'))
    code.push(getNameSpaceOpen(obj))
    shape.deps.size ? code.push([...shape.deps].join('\n') + '\n') : null
    shape.type.length ? code.push(shape.type && shape.type.join('\n')) : null
    code.push(getNameSpaceClose(obj))
  }
  return code
}

const generateCppForDefinitions = (obj = {}, schemas = {}, srcDir = {}, unUsedSchemas=[]) => {
  const code = []
  const header = []
  header.push(getHeaderText())
  const i = getIncludeDefinitions(obj, schemas, true, srcDir, true)

  header.push(i.join('\n'))
  const shape = generateImplForDefinitions(obj, schemas, unUsedSchemas)

  if (shape.enums.size) {
      code.push(header.join('\n'))
      code.push(`\nnamespace WPEFramework {\n`)
      code.push([...shape.enums].join('\n'))
      code.push(`\n}`)
  }
  if (shape.deps.size > 0 || shape.type.length > 0)  {
    code.length === 0 ? code.push(header.join('\n')) : null

    code.push(getStyleGuardOpen(obj))
    shape.deps.size ? code.push([...shape.deps].join('\n')) : null
    code.push(shape.type.join('\n'))
    code.push(getStyleGuardClose())
  }

  return code
}

//For each schema object, 
const generateImplForDefinitions = (json, schemas = {}, unUsedSchemas = []) => compose(
  reduce((acc, val) => {
    const shape = getImplForSchema(json, val[1], schemas, val[0])
    shape.type.length ? acc.type.push(shape.type.join('\n')) : null
    shape.deps.forEach(dep => acc.deps.add(dep))
    shape.enums.forEach(e => acc.enums.add(e))
    return acc
  }, {type: [], deps: new Set(), enums: new Set()}),
  filter(x => !x[1].anyOf),
  filter(x => !isUnUsed('#/definitions/' + x[0], unUsedSchemas)),
  getDefinitions //Get schema under Definitions
)(json)


//For each schema object, 
const generateTypesForDefinitions = (json, schemas = {}, unUsedSchemas = []) => compose(
  reduce((acc, val) => {
    const shape = getSchemaShape(json, val[1], schemas, val[0])
    shape.type.length ? acc.type.push(shape.type.join('\n')) : null
    shape.deps.forEach(dep => acc.deps.add(dep))
    shape.enum.forEach(enm => { (acc.enum.includes(enm) === false) ? acc.enum.push(enm) : acc.enum})
    return acc
  }, {type: [], enum: [], deps: new Set()}),
  filter(x => !x[1].anyOf),
  filter(x => !isUnUsed('#/definitions/' + x[0], unUsedSchemas)),
  getDefinitions //Get schema under Definitions
)(json)

const generateTypesForModules = (json,  schemas = {}, unUsedSchemas = []) => compose(
  reduce((acc, val) => {
    const shape = getSchemaShape(json, val[1], schemas, val[0])
    shape.type.length ? acc.type.push(shape.type.join('\n')) : null
    shape.deps.forEach(dep => acc.deps.add(dep))
    shape.enum.forEach(enm => { (acc.enum.includes(enm) === false) ? acc.enum.push(enm) : acc.enum})
    return acc
  }, {type: [], enum: [], deps: new Set()}),
  filter(x => !x[1].anyOf),
  filter(x => !isUnUsed('#/components/schemas/' + x[0], unUsedSchemas)),
  getSchemas //Get schema under Definitions
)(json)

const generateJsonTypesForDefinitons = (json, schemas = {}, unUsedSchemas = []) => compose(
  reduce((acc, val) => {
    const shape = getJsonDefinition(json, val[1], schemas, val[0])
    if (shape.type.length > 0) {
      shape.type.forEach(type => { (acc.deps.has(type) === false) ? acc.type.push(type) : acc.type})
      shape.deps.forEach(dep => { (acc.type.includes(dep) === false) ? acc.deps.add(dep) : acc.deps})
    }
    return acc
  }, {type: [], deps: new Set()}),
  filter(x => !x[1].anyOf),
  filter(x => !isUnUsed('#/definitions/' + x[0], unUsedSchemas)),
  getDefinitions //Get schema under Definitions
)(json)

const generateMethodPrototypes = (json, schemas = {}) => {

  let sig = {type: [], enum: [], deps: new Set()}

  const properties = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('property'))) || []
  
  properties.forEach(property => {
    const event = m => m.tags.find(t => t.name === 'property:readonly' || t.name === 'property')
    const setter = m => m.tags.find(t => t.name === 'property')
    
    let res = getSchemaType(json, property.result.schema, property.result.name || property.name, schemas, '', {descriptions: true, level: 0})
    res.deps.forEach(dep => sig.deps.add(dep))
    res.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
    sig.type.push(`${description(property.name, property.summary)}`)
    {
      let structure = getPropertyGetterSignature(property, json, schemas)
      structure.signature && sig.type.push(structure.signature + ';\n')
    }
    if (event(property)) {
      sig.type.push(`${description(property.name, 'Listen to updates')}`)
      let structure = getPropertyEventCallbackSignature(property, json, schemas)
      structure.signature && sig.type.push(structure.signature + ';\n')

      structure = getPropertyEventSignature(property, json, schemas)
      structure.registersig && sig.type.push(structure.registersig + ';\n')
      structure.unregistersig && sig.type.push(structure.unregistersig + ';\n')
    }
    if (setter(property)) {
      let structure = getPropertySetterSignature(property, json, schemas)
      structure.signature && sig.type.push(structure.signature + ';\n')
    }
  })

  const events = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('event'))) || []
  events.forEach(event => {
    let res = getSchemaType(json, event.result.schema, event.result.name || event.name, schemas, '', {descriptions: true, level: 0})
    if (res.type && res.type.length > 0) {
      let structure = getEventCallbackSignature(event, json, schemas)
      structure.signature && sig.type.push(structure.signature + ';\n')
      structure = getEventSignature(event, json, schemas)
      structure.registersig && sig.type.push(structure.registersig + ';\n')
      structure.unregistersig && sig.type.push(structure.unregistersig + ';\n')
    }
  })

  {
    //Generate methods that are not tagged with any of the below tags
    const excludeTagNames = ['property', 'property:readonly', 'property:immutable', 'property::immutable', 'polymorphic-pull', 'polymorphic-reducer', 'temporal-set', 'event']
    const getNamesFromTags = tags => tags && tags.map(t => t.name)
    const methods = json.methods.filter( m => {
      const tNames = getNamesFromTags(m.tags)
      if (tNames) {
        return !(tNames.some(t => excludeTagNames.includes(t)))
      }
      return true
    }) || []

    methods.forEach(method => {
      let structure = getMethodSignature(method, json, schemas)
      structure.deps.forEach(dep => sig.deps.add(dep))
      structure.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      structure.signature && sig.type.push(structure.signature + ';\n')
    })
  }
  {
    const methods = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('polymorphic-pull')))
    methods.forEach(method => {
      let structure = getPolymorphicMethodSignature(method, json, schemas)
      structure.deps.forEach(dep => sig.deps.add(dep))
      structure.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      structure.signature && sig.type.push(structure.signature + ';')

      structure = getPolymorphicEventCallbackSignature(method, json, schemas)
      structure.deps.forEach(dep => sig.deps.add(dep))
      structure.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      structure.signature && sig.type.push(structure.signature + ';')

      sig.type.push(getPolymorphicEventSignature(method, json, schemas) + ';\n')
   })
  }
  {
    //Generate Polymorphic Reducer Methods - Generate single method that take an array of all params listed
    const reducerMethods = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('polymorphic-reducer'))) || []

    reducerMethods.forEach(method => {
      method.params = [getPolymorphicReducedParamSchema(method)]

      let structure = getMethodSignature(method, json, schemas)
      structure.deps.forEach(dep => sig.deps.add(dep))
      structure.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      structure.signature && sig.type.push(structure.signature + ';\n')
    })
  }
  {
    const methods = json.methods.filter( m => m.tags && m.tags.find(t => t.name.includes('temporal-set')))
    methods.forEach(method => {
      let res = getSchemaType(json, method.result.schema, method.result.name || method.name, schemas, '', {descriptions: true, level: 0})
      res.deps.forEach(dep => sig.deps.add(dep))
      res.enum.forEach(enm => { (sig.enum.includes(enm) === false) ? sig.enum.push(enm) : null})
      sig.type.push(`${description(method.name, method.summary)}`)

      let structure = getTemporalSetMethodSignature(method, json, schemas)
      structure.signature && sig.type.push(structure.signature + ';')
      structure.availablesig && sig.type.push(structure.availablesig + ';')
      structure.unavailablesig && sig.type.push(structure.unavailablesig + ';')
      structure.startsig && sig.type.push(structure.startsig + ';')
      structure.stopsig && sig.type.push(structure.stopsig + ';')
   })
  }

  return sig
}


export {
  generateHeaderForDefinitions,
  generateHeaderForModules,
  generateJsonDataHeaderForDefinitions,
  generateCppForDefinitions
}
