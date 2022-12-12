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
import { generateHeaderForDefinitions } from './headers/index.mjs'
import fs from 'fs'

const cpp = ({
  source: srcFolderArg,
  output: outputFolderArg,
  'shared-schemas': sharedSchemasFolderArg,
  'static-modules': staticModulesArg
}) => {
  const sharedSchemasFolder = sharedSchemasFolderArg
  const schemasFolder = path.join(srcFolderArg, 'schemas')
  const combinedSchemas = combineStreamObjects(schemaFetcher(sharedSchemasFolder), schemaFetcher(schemasFolder))
 
  logHeader(`Generating CPP SDK into: ${trimPath(outputFolderArg)}`)
  return h()
}

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

  logHeader(`Generating C Headers in: ${trimPath(headerDir)}`)

  const combinedSchemas = combineStreamObjects(schemaFetcher(sharedSchemasFolder), schemaFetcher(schemasFolder))

  return fsMkDirP(headerDir)
    .tap(_ => logSuccess(`Created folder: ${trimPath(headerDir)}`))
    .flatMap(_ => combinedSchemas
      .map(schemas => Object.values(schemas))
      .flatten()
      .filter(schema => schema.title != 'FireboltOpenRPC')
      .map(schema =>  ({title : schema.title, contents : generateHeaderForDefinitions(schema, combinedSchemas)}))
      .map(fileContent => {
          fsWriteFile(path.join(headerDir, `${fileContent.title}.h`) , fileContent.contents.join('\n')).done(() => console.log(`File ${path.join(headerDir, `${fileContent.title}.h`)} written`))
        })
      )
}


export {
  cpp,
  generateHeaders
}
