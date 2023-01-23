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

import { getHeaderText, getStyleGuardOpen, getIncludeDefinitions, getStyleGuardClose,
         getIncludeGuardClose, getSchemaShape, getSchemaType, getPropertySetterSignature, getPropertyGetterSignature,
         getPropertyEventCallbackSignature, getPropertyEventSignature } from '../../../shared/nativehelpers.mjs'
import { getSchemas } from '../../../shared/modules.mjs'
import { getNameSpaceOpen,getNameSpaceClose, getJsonDefinition, getImplForSchema } from '../../../shared/cpphelpers.mjs'


const generateCppForSchemas = (obj = {}, schemas = {}) => {
  const code = []

  code.push(getHeaderText())
  const i = getIncludeDefinitions(obj, true)
  code.push(i.join('\n'))
  const shape = generateImplForSchemas(obj, schemas)
  if(shape.enums) {
    code.push('\n')
    code.push([...shape.enums].join('\n\n'))
    code.push('\n')
  }
  code.push(getStyleGuardOpen(obj))
  code.push([...shape.deps].join('\n'))
  code.join('\n')
  code.push(shape.type.join('\n'))
  code.push(getStyleGuardClose())
  code.join('\n')
  return code
}


//For each schema object, 
const generateImplForSchemas = (json, schemas = {}) => compose(
  reduce((acc, val) => {
    const shape = getImplForSchema(json, val[1], schemas, val[0])
    acc.type.push(shape.type.join('\n'))
    shape.deps.forEach(dep => acc.deps.add(dep))
    shape.enums.forEach(e => acc.enums.add(e))
    return acc
  }, {type: [], deps: new Set(), enums: new Set()}),
  getSchemas //Get schema under Components/Schemas
)(json)


export {
  generateCppForSchemas
}
