import { getPath, getSchema } from './json-schema.mjs'
import deepmerge from 'deepmerge'
import { getSchemaType, capitalize, getTypeName,getModuleName } from "./nativehelpers.mjs"

const getSdkNameSpace = () => 'FireboltSdk'
const getNameSpaceOpen = (module = {}) => `namespace ${getSdkNameSpace()} {\n` + `namespace ${capitalize(getModuleName(module))} {`
const getNameSpaceClose = (module = {}) => `}//namespace ${capitalize(getModuleName(module))}\n}//namespace ${getSdkNameSpace()}`

const getJsonDataStructName = (modName, name) => `${capitalize(modName)}::${capitalize(name)}`

const getJsonNativeType = json => {
    let type
    let jsonType = json.const ? typeof json.const : json.type

    if (jsonType === 'string') {
        type = 'WPEFramework::Core::JSON::String'
    }
    else if (jsonType === 'number' || json.type === 'integer') { //Lets keep it simple for now
        type = 'WPEFramework::Core::JSON::Number'
    }
    else if (jsonType === 'boolean') {
      type = 'WPEFramework::Core::JSON::Boolean'
    }
    else {
        throw 'Unknown JSON Native Type !!!'
    }
    return type
}

function getJsonType(module = {}, json = {}, name = '', schemas = {}, options = {descriptions: false, level: 0}) {

  if (json.schema) {
    json = json.schema
  }
  //console.log(`name - ${name}, schema - ${JSON.stringify(json, null, 4)}, title - ${options.title}`)

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = []

  if (json['$ref']) {
    if (json['$ref'][0] === '#') {
      //Ref points to local schema 
      //Get Path to ref in this module and getSchemaType
      let definition = getPath(json['$ref'], module, schemas)
      let tName = definition.title || json['$ref'].split('/').pop()
      const res = getJsonType(module, definition, tName, schemas, {descriptions: options.descriptions, level: options.level})
      structure.deps = res.deps
      structure.type = res.type
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
      const res = getJsonType(schema, definition, tName, schemas, {descriptions: options.descriptions, level: options.level})
      //We are only interested in the type definition for external modules
      structure.type = res.type
      return structure
    }
  }
  else if (json.const) {
    structure.type = getJsonNativeType(json)
    return structure
  }
  else if (json['x-method']) {
    return structure
    //throw "x-methods not supported yet"
  }
  else if (json.type === 'string' && json.enum) {
    //Enum
    let t = getSchemaType(module, json, name, schemas).type
    t = 'WPEFramework::Core::JSON::EnumType<::' + t[0] +'>'
    structure.type.push(t)
    return structure
  }
  else if (Array.isArray(json.type)) {
    let type = json.type.find(t => t !== 'null')
    console.log(`WARNING UNHANDLED: type is an array containing ${json.type}`)
  }
  else if (json.type === 'array' && json.items) { 
    let res
    if (Array.isArray(json.items)) {
      //TODO
      const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
      if (!IsHomogenous(json.items)) {
        throw 'Heterogenous Arrays not supported yet'
      }
      res = getJsonType(module, json.items[0],'',schemas)
    }
    else {
      // grab the type for the non-array schema
      res = getJsonType(module, json.items, '', schemas)
    }

    structure.deps = res.deps
    let n = capitalize(name || json.title)
    structure.type.push(`WPEFramework::Core::JSON::ArrayType<${res.type}>`)
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
    return getJsonType(module, union, '',schemas, options)
  }
  else if (json.oneOf || json.anyOf) {
    return structure
    //TODO
  }
  else if (json.type === 'object') { 
    let res = getJsonDefinition(module, json, schemas, json.title || name, {descriptions: options.descriptions, level: 0})
    structure.deps = res.deps
    structure.deps.add(res.type.join('\n'))
    structure.type.push(getJsonDataStructName(getModuleName(module), json.title || name))
    return structure
    //TODO
  }
  else if (json.type) {
    structure.type = getJsonNativeType(json)
    return structure
  }
  return structure

}

function getJsonContainerDefinition (name, props = []) {
  name = capitalize(name)
  let c = `    class ${name}: public Core::JSON::Container {
        public:
            ${name}(const ${name}&) = delete;
            ${name}& operator=(const ${name}&) = delete;
            ~${name}() override = default;

        public:
            ${name}()
                : Core::JSON::Container()
            {`

    props.forEach(prop => {
        c += `\n                Add(_T("${prop.name}"), &${capitalize(prop.name)};`
    })

    c += `\n            }\n\n       public:`

    props.forEach(prop => {
        c += `\n            ${prop.type} ${capitalize(prop.name)};`
    })

    c += '\n    };'
    return c
}

function getJsonDefinition(moduleJson = {}, json = {}, schemas = {}, name = '', options = {level: 0, descriptions: true}) {

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = []

  console.log (`Incoming - ${name} - ${json.type}`)

  if (json.type === 'object') {
    if (json.properties) {
        let tName = capitalize( name)
        let props = []
        Object.entries(json.properties).forEach(([pname, prop]) => {
        if(prop.type === 'array') {
            let res
            if (Array.isArray(prop.items)) {
            //TODO
                const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
                if (!IsHomogenous(prop.items)) {
                    throw 'Heterogenous Arrays not supported yet'
                }
                res = getJsonType(moduleJson, prop.items[0],pname, schemas )
            }
            else {
                // grab the type for the non-array schema
                res = getJsonType(moduleJson, prop.items, pname, schemas )
            }
            if(res.type && res.type.length > 0) {
                props.push({name: `${pname}`, type: `WPEFramework::Core::JSON::ArrayType<${res.type}>`})
            }
            else {
                console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
        } else {
            let res = getJsonType(moduleJson, prop, pname,schemas)
            if(res.type && res.type.length > 0) {
                props.push({name: `${pname}`, type: `${res.type}`})
            }
            else {
                console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
        }
        })
        console.log(`Props - ${JSON.stringify(props, null, 4)}`)
        structure.type.push(getJsonContainerDefinition(tName, props))
        console.log(`Object - ${JSON.stringify(structure, null, 4)}`)
    }
    else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
      //This is a map of string to type in schema
      //Get the Type
      let type = getJsonType(moduleJson, json.additionalProperties, name,schemas)
      if(type.type && type.type.length > 0) {
      
      }
      else {
        console.log(`WARNING: Type undetermined for ${name}`)
      }
    }
  }
  else if (json.anyOf) {

  }
  else if (json.oneOf) {
  
  }
  else if (json.allOf) {
    let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], moduleJson, schemas) || x : x)], options)
    if (json.title) {
      union['title'] = json.title
    }
    else {
      union['title'] = name
    }
    delete union['$ref']
    return getJsonDefinition(moduleJson, union, schemas, name, options)
  }
  console.log(`Returning - ${JSON.stringify(structure, null, 4)}`)
  return structure
}

const getObjectHandleImpl = (varName, jsonDataName) => {

  let result = `
${varName}Handle ${varName}Handle_Create(void) {
    WPEFramework::Core::ProxyType<${jsonDataName}>* type = new WPEFramework::Core::ProxyType<${jsonDataName}>();
    *type = WPEFramework::Core::ProxyType<${jsonDataName}>::Create();
    return (static_cast<${varName}Handle>(type));
}
void ${varName}Handle_Addref(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());
    var->AddRef();
}
void ${varName}Handle_Release(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    var->Release();
    if(var->IsValid() != true) {
        delete var;
    }
}
bool ${varName}Handle_IsValid(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());
    return var->IsValid();
}
`
  return result
}

/*
const getObjectPropertyAccessors = (objName, propertyName, jsonDataName, propertyType, json = {}, options = {readonly:false, optional:false}) => {

  let result = `${propertyType} ${objName}_Get_${propertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());`
    if (json.type === 'string') {
      result += `
    return static_cast<${propertyType}>((*var)->${propertyName}.Value().c_str());` + '\n'
    }
    else if (json.type === 'object') {
    result += `WPEFramework::Core::ProxyType<${jsonDataName}::${propertyName}>* object = new WPEFramework::Core::ProxyType<${jsonDataName}::${propertyName}>();
    *object = WPEFramework::Core::ProxyType<${jsonDataName}::${propertyName}>::Create();
    *(*object) = (*var)->${propertyName};
    return (static_cast<${propertyType}>(object));` + '\n'
    }
    else {
     result += `
    return static_cast<${propertyType}>((*var)->${propertyName}.Value());` + '\n'
   }

result += `
}` + '\n'

  if (!options.readonly) {
    result += `${Indent.repeat(options.level)}void ${objName}_Set_${propertyName}(${objName}Handle handle, ${propertyType} ${propertyName.toLowerCase()}) {
   ASSERT(handle != NULL);
   WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
   ASSERT(var->IsValid());` + '\n'
   if (json.type === 'object') {
     result += `
    WPEFramework::Core::ProxyType<${jsonDataName}::${propertyName}>* object = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}::${propertyName}>*>(${propertyName.toLowerCase()});
    (*var)->${propertyName} = *(*object);` + '\n'
   }
   else {
     result += `(*var)->${propertyName} = static_cast<${propertyType}>(${propertyName.toLowerCase()});
}` + '\n'
   }

  if (options.optional === true) {
    result += `${Indent.repeat(options.level)}bool ${objName}_has_${propertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());
    return ((*var)->${propertyName}.IsSet());
}` + '\n'
    result += `${Indent.repeat(options.level)}void ${objName}_clear_${propertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());
    ((*var)->${propertyName}.Clear());
}` + '\n'
  }
`
  return result
}

const getMapAccessors = (typeName, nativeType, jsonDataName) => {

  let res

  res = `uint32_t ${typeName}_KeysCount(${typeName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${jsonDataName}>* var = static_cast<WPEFramework::Core::ProxyType<${jsonDataName}>*>(handle);
    ASSERT(var->IsValid());

  }` + '\n'
  res += `void ${typeName}_AddKey(${typeName}Handle handle, char* key, ${nativeType} value);` + '\n'
  res += `void ${typeName}_RemoveKey(${typeName}Handle handle, char* key);` + '\n'
  res += `${nativeType} ${typeName}_FindKey(${typeName}Handle handle, char* key);` + '\n'

  return res
}
*/
/*
function getImplForSchema(moduleJson = {}, json = {}, schemas = {}, name = '', options = {level: 0, descriptions: true}) {
    json = JSON.parse(JSON.stringify(json))
    let level = options.level 
    let descriptions = options.descriptions

    let structure = {}
    structure["deps"] = new Set() //To avoid duplication of local ref definitions
    structure["type"] = []

    //console.log(`name - ${name}, json - ${JSON.stringify(json, null, 4)}`)

    if (json['$ref']) {
      if (json['$ref'][0] === '#') {
        //Ref points to local schema 
        //Get Path to ref in this module and getSchemaType
        
        const schema = getPath(json['$ref'], module, schemas)
        const tname = schema.title || json['$ref'].split('/').pop()
        res = getImplForSchema(module, schema, schemas, tname, {descriptions: descriptions, level: level})
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
  
        res = getImplForSchema(schema, definition, schemas, pname,{descriptions: descriptions, level: level})
        //We are only interested in the type definition for external modules
        structure.type = res.type
      }
    }
    //If the schema is a const, 
    else if (json.hasOwnProperty('const')) { 
      if (level > 0) {
        structure.type.push(description(name, json.description))
        typeName = getTypeName(getModuleName(moduleJson), name)
        structure.type.push(getPropertyAccessors(typeName, capitalize(name), typeof json.const, {level: level, readonly:true, optional:false}))
      }
    }
    else if (json.type === 'object') {

      if (json.properties) {
        let tName = getTypeName(getModuleName(moduleJson), name)
        let t = description(name, json.description)
        t += '\n' +  getObjectHandleManagement(tName)
        Object.entries(json.properties).forEach(([pname, prop]) => {
          t += '\n' + description(pname, prop.description)
          let res
          if(prop.type === 'array') {
            if (Array.isArray(prop.items)) {
              //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              res = getSchemaType(moduleJson, prop.items[0],pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
            }
            else {
              // grab the type for the non-array schema
              res = getSchemaType(moduleJson, prop.items, pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
            }
            if(res.type && res.type.length > 0) {
              let n = tName + '_' + capitalize(pname || prop.title) 
              let def = getArrayAccessors(n + 'Array', res.type)
              t += '\n' + def
            }
            else {
              console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
          } else {
            res = getSchemaType(moduleJson, prop, pname,schemas, {descriptions: descriptions, level: level + 1, title: true})
            if(res.type && res.type.length > 0) {
              t += '\n' + getPropertyAccessors(tName, capitalize(pname), res.type, {level: level, readonly:false, optional:isOptional(pname, json)})
            }
            else {
              console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
          }
          res.deps.forEach(dep => structure.deps.add(dep))
        })
        structure.type.push(t)
      }
      else if (json.propertyNames && json.propertyNames.enum) {
        //propertyNames in object not handled yet
      }
      else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
        //This is a map of string to type in schema
        //Get the Type
        let type = getSchemaType(moduleJson, json.additionalProperties, name,schemas)
        if(type.type && type.type.length > 0) {
          let tName = getTypeName(getModuleName(moduleJson), name)
          structure.deps = type.deps
          let t = description(name, json.description)
          t += '\n' + getObjectHandleManagement(tName) + '\n'
          t += getMapAccessors(getTypeName(getModuleName(moduleJson), name), type.type,{descriptions: descriptions, level: level})
          structure.type.push(t)
        }
        else {
          console.log(`WARNING: Type undetermined for ${name}`)
        }
      }
      else if (json.patternProperties) {
        throw "patternProperties are not supported by Firebolt"
      }
    }
    else if (json.anyOf) {

    }
    else if (json.oneOf) {
      
    }
    else if (json.allOf) {
      let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], moduleJson, schemas) || x : x)], options)
      if (json.title) {
        union['title'] = json.title
      }
      else {
        union['title'] = name
      }
      delete union['$ref']
      return getSchemaShape(moduleJson, union, schemas, name, options)

    }
    else if (json.type === 'array') {
      let res = getSchemaType(moduleJson, json, name, schemas, {level: 0, descriptions: descriptions})
      structure.deps = res.deps
    }
    else{
      let res = getSchemaType(moduleJson, json, name, schemas, {level: level, descriptions: descriptions})
      structure.deps = res.deps
    }
    return structure
  }
*/


export {
    getSdkNameSpace,
    getNameSpaceOpen,
    getNameSpaceClose,
    getJsonDefinition,
    getJsonType
}
