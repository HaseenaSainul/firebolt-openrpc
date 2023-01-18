#!/usr/bin/env node

import {javascript, generateHeaders, generateCppFiles} from '../util/sdk/index.js'
import docs from '../util/docs/index.mjs'
import validate from '../util/validate/index.mjs'
import openrpc from '../util/openrpc/index.mjs'
import declarations from '../util/declarations/index.mjs'
import nopt from 'nopt'
import path from 'path'

const knownOpts = {
  'task': [String, null],
  'lang': String,
  'source': [path],
  'template': [path],
  'output': [path],
  'shared-schemas': [path],
  'as-path': Boolean,
  'static-modules': String
}
const shortHands = {
  't': '--task',
  'l': '--lang',
  's': '--source',
  'tm': '--template',
  'tm': '--template',
  'o': '--output',
  'ap': '--as-path',
  'sm': '--static-modules',
  'ss': '--shared-schemas'
}
// Last 2 arguments are the defaults.
const parsedArgs = nopt(knownOpts, shortHands, process.argv, 2)
const signOff = () => console.log('\nThis has been a presentation of \x1b[38;5;202mFirebolt\x1b[0m \u{1F525} \u{1F529}\n')

const util = parsedArgs.task

if (util === 'sdk') {
  if(parsedArgs.lang === 'javascript') {
    javascript(parsedArgs).done(signOff)
  } 
  else if (parsedArgs.lang === 'native-c') {
    generateHeaders(parsedArgs).done(signOff)
    generateCppFiles(parsedArgs).done(signOff)
  }
}
else if (util === 'docs') {
    docs(parsedArgs).done(signOff)
}
else if (util === 'validate') {
    validate(parsedArgs).done(signOff)
}
else if (util === 'openrpc') {
    openrpc(parsedArgs).done(signOff)
}
else if (util === 'declarations') {
    declarations(parsedArgs).done(signOff)
} else {
  console.log("Invalid build type")
}