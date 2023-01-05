#!/usr/bin/env node

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

import h from 'highland'
import { fsWriteFile, logSuccess, fsMkDirP, logHeader, combineStreamObjects, schemaFetcher,clearDirectory, localModules, trimPath, fsReadFile } from '../../shared/helpers.mjs'
import path from 'path'
import { generateHeaderForDefinitions, generateHeaderForModules} from './headers/index.mjs'
import {getModuleName} from '../../shared/nativehelpers.mjs'
import fs from 'fs'

const generateHeaders = ({
  source,
  'shared-schemas': sharedSchemasFolderArg,
  output: outputFolderArg,
}) => {
  // Important file/directory locations
  const schemasFolder = path.join(source, 'schemas')
  const sharedSchemasFolder = sharedSchemasFolderArg
  const modulesFolder = path.join(source, 'modules')
  const headerDir = path.join(outputFolderArg, 'include')
  const allModules = localModules(modulesFolder, null, true)

  logHeader(`Generating C Headers in: ${trimPath(headerDir)}`)

  const combinedSchemas = combineStreamObjects(schemaFetcher(sharedSchemasFolder), schemaFetcher(schemasFolder))
  //Generate headers for Common schemas under 'include/common' directory
  fsMkDirP(path.join(headerDir, 'Common'))
    .tap(_ => logSuccess(`Created folder: ${trimPath(headerDir)}`))
    .flatMap(_ => combinedSchemas
      .flatMap(schemas => combinedSchemas.observe()
        .flatMap(schs => Object.values(schs))
        .flatten()
        .filter(module => getModuleName(module) !== 'FireboltOpenRPC')
        .map(schema =>  ({title : schema.title, contents : generateHeaderForDefinitions(schema, schemas)}))
        .map(fileContent => {
            fsWriteFile(path.join(headerDir, 'Common', `${fileContent.title}.h`) , fileContent.contents.join('\n')).done(() => console.log(`File ${path.join(headerDir,'Common', `${fileContent.title}.h`)} written`))
          })
      )
    )
    .done(() => console.log('\nDone Generating Schema Headers by \x1b[38;5;202mFirebolt\x1b[0m \u{1F525} \u{1F529}\n'))

  //Generate the Module headers under 'include/' directory
  return combineStreamObjects(schemaFetcher(sharedSchemasFolder), schemaFetcher(schemasFolder))
    .flatMap(schemas => allModules
      .flatMap(modules => Object.values(modules))
      .flatten()
      .map(module => ({title : getModuleName(module), contents : generateHeaderForModules(module, schemas)}))
      .map(fileContent => {
        fsWriteFile(path.join(headerDir, `${fileContent.title}.h`) , fileContent.contents.join('\n')).done(() => console.log(`File ${path.join(headerDir, `${fileContent.title}.h`)} written`))
      })
      )
}


export {
  generateHeaders
}
