import { getPath, getSchema } from '../../shared/json-schema.mjs'
import deepmerge from 'deepmerge'
import { getSchemaType, capitalize, getTypeName,getModuleName, description, getArrayElementSchema,
         isOptional, enumValue, getPropertyGetterSignature, getPropertySetterSignature,getFireboltStringType} from "./nativehelpers.mjs"

const getSdkNameSpace = () => 'FireboltSDK'
const wpeJsonNameSpace = () => 'WPEFramework::Core::JSON'
const getNameSpaceOpen = (module = {}) => {
  let result = `
namespace ${getSdkNameSpace()} {`
  if (JSON.stringify(module) !== '{}') {
    result += '\n' + `namespace ${capitalize(getModuleName(module))} {`
  }
  result += '\n'
  return result
}
const getNameSpaceClose = (module = {}) => {
  let result = ''
  if (JSON.stringify(module) !== '{}') {
    result +=  `} // ${capitalize(getModuleName(module))}\n`
  }
  result += `} // ${getSdkNameSpace()}`
  return result
}

const getJsonDataStructName = (modName, name) => `${capitalize(modName)}::${capitalize(name)}`

const getJsonNativeType = json => {
    let type
    let jsonType = json.const ? typeof json.const : json.type

    if (jsonType === 'string') {
        type = 'JSON::String'
    }
    else if (jsonType === 'number' || json.type === 'integer') { //Lets keep it simple for now
        type = 'WPEFramework::Core::JSON::DecUInt32'
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
   else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
      //This is a map of string to type in schema
      //Get the Type
      let type = getJsonType(module, json.additionalProperties, name,schemas)
      if (type.type && type.type.length > 0) {
          structure.type = 'WPEFramework::Core::JSON::VariantContainer';
          return structure
      }
      else {
        console.log(`WARNING: Type undetermined for ${name}`)
      }
    }
  else if (json.type === 'string' && json.enum) {
    //Enum
    let t = getSchemaType(module, json, name, schemas).type
    t = 'WPEFramework::Core::JSON::EnumType<' + getModuleName(module) + '_' + capitalize(name) + '>'
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
  let c = `    class ${name} : public WPEFramework::Core::JSON::Container {
    public:
        ~${name}() override = default;

    public:
        ${name}()
            : WPEFramework::Core::JSON::Container()
        {`

    props.forEach(prop => {
        c += `\n            Add(_T("${prop.name}"), &${capitalize(prop.name)});`
    })

    c += `\n        }\n`
    c += `\n        ${name}(const ${name}& copy)
	{`
    props.forEach(prop => {
        c += `\n            ${capitalize(prop.name)} = copy.${capitalize(prop.name)};`
    })
    c += `
        }\n
        ${name}& operator=(const ${name}& rhs)
        {`
    props.forEach(prop => {
        c += `\n            ${capitalize(prop.name)} = rhs.${capitalize(prop.name)};`
    })
    c += `\n            return (*this);
        }\n
    public:`

    props.forEach(prop => {
        c += `\n        ${prop.type} ${capitalize(prop.name)};`
    })

    c += '\n    };\n'
    return c
}

function getJsonDefinition(moduleJson = {}, json = {}, schemas = {}, name = '', options = {level: 0, descriptions: true}) {

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = []
  structure["fwd"] = new Set()

  if (json.type === 'object') {
    if (json.properties) {
        let tName = capitalize( name)
        let props = []
        Object.entries(json.properties).forEach(([pname, prop]) => {
        if (prop.type === 'array') {
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
            if (res.type && res.type.length > 0) {
                props.push({name: `${pname}`, type: `WPEFramework::Core::JSON::ArrayType<${res.type}>`})
                res.deps.forEach(t => structure.deps.add(t))
            }
            else {
                console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}:${pname}`)
            }
        }
        else {
            if (prop.type === 'object' && !prop.properties) {
                console.log(`WARNING: getJsonDefinition: properties undetermined for ${pname}`)
            }
            else {
                let res = getJsonType(moduleJson, prop, pname, schemas)
                if (res.type && res.type.length > 0) {
                    props.push({name: `${pname}`, type: `${res.type}`})
                    res.deps.forEach(t => structure.deps.add(t))
                }
                else {
                    console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}:${pname}`)
                }
            }
        }
        })
        structure.type.push(getJsonContainerDefinition(tName, props))

        structure.fwd.add(`class ${tName};`)
    }
    else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
      //This is a map of string to type in schema
      //Get the Type
      let type = getJsonType(moduleJson, json.additionalProperties, name, schemas)
      if (!type.type || type.type.length > 0) {
        console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}`)
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
    structure = getJsonDefinition(moduleJson, union, schemas, name, options)
  }
  return structure
}

const getObjectHandleImpl = (varName, jsonDataName) => {

  let containerName = (jsonDataName.includes(wpeJsonNameSpace()) === true) ? `${jsonDataName}` : `${getSdkNameSpace()}::${jsonDataName}`

  let result = `${varName}Handle ${varName}Handle_Create(void) {
    WPEFramework::Core::ProxyType<${containerName}>* type = new WPEFramework::Core::ProxyType<${containerName}>();
    *type = WPEFramework::Core::ProxyType<${containerName}>::Create();
    return (static_cast<${varName}Handle>(type));
}
void ${varName}Handle_Addref(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
    var->AddRef();
}
void ${varName}Handle_Release(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    var->Release();
    if (var->IsValid() != true) {
        delete var;
    }
}
bool ${varName}Handle_IsValid(${varName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
    return var->IsValid();
}
`
  return result
}

const getObjectPropertyAccessorsImpl = (objName, moduleName, modulePropertyType, subPropertyType, subPropertyName, accessorPropertyType, subPropertyNameSpace, json = {}, options = {readonly:false, optional:false}) => {

  let moduleNameSpace = (modulePropertyType.includes(wpeJsonNameSpace()) === true) ? `${moduleName}` : `${getSdkNameSpace()}::${moduleName}`
  let result = ''
  result += `${accessorPropertyType} ${objName}_Get_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'
  if (json.type === 'object') {

    result += `    WPEFramework::Core::ProxyType<${subPropertyNameSpace}::${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyNameSpace}::${subPropertyType}>();
    *element = WPEFramework::Core::ProxyType<${subPropertyNameSpace}::${subPropertyType}>::Create();
    *(*element) = (*var)->${subPropertyName};
    return (static_cast<${accessorPropertyType}>(element));` + '\n'
  }
  else if (json.type === 'array' && json.items) {
    result += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyNameSpace}::${subPropertyType}>>* element = new WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyNameSpace}::${subPropertyType}>>();
    *element = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyNameSpace}::${subPropertyType}>>::Create();
    *(*element) = (*var)->${subPropertyName}.Element();
    return (static_cast<${accessorPropertyType}>(element));` + '\n'
  }
  else {
    if (json.type === 'string' && !json.enum) {
      result += `    return (const_cast<${accessorPropertyType}>((*var)->${subPropertyName}.Value().c_str()));` + '\n'
    }
    else {
      result += `    return (static_cast<${accessorPropertyType}>((*var)->${subPropertyName}.Value()));` + '\n'
    }
  }
  result += `}` + '\n'

  if (!options.readonly) {
    result += `void ${objName}_Set_${subPropertyName}(${objName}Handle handle, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if (json.type === 'object') {
      result += `    WPEFramework::Core::ProxyType<${subPropertyNameSpace}::${subPropertyType}>* object = static_cast<WPEFramework::Core::ProxyType<${subPropertyNameSpace}::${subPropertyType}>*>(value);
    (*var)->${subPropertyName} = *(*object);` + '\n'
    }
    else if (json.type === 'array' && json.items) {
      result += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyNameSpace}::${subPropertyType}>>* object = static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyNameSpace}::${subPropertyType}>>*>(value).Element();
    (*var)->${subPropertyName} = *(*object);` + '\n'
    }
    else {
      result += `    (*var)->${subPropertyName} = value;` + '\n'
    }
    result += `}` + '\n'
  }

  if (options.optional === true) {
    result += `bool ${objName}_Has_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());

    return ((*var)->${subPropertyName}.IsSet());
}` + '\n'
    result += `void ${objName}_Clear_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${moduleNameSpace}::${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
    ((*var)->${subPropertyName}.Clear());
}` + '\n'
  }

  return result
}

const getArrayAccessorsImpl = (objName, moduleName, modulePropertyType, moduleNameSpace, objHandleType, subPropertyType, subPropertyName, accessorPropertyType, json = {}) => {

  let propertyName
  if (subPropertyName) {
     propertyName = '(*var)->' + `${subPropertyName}`
     objName = objName + '_' + subPropertyName
  }
  else {
     propertyName = '(*(*var))'
  }

  let result = `uint32_t ${objName}Array_Size(${objHandleType} handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());

    return (${propertyName}.Length());
}` + '\n'

  result += `${accessorPropertyType} ${objName}Array_Get(${objHandleType} handle, uint32_t index) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());` + '\n'

  if (json.type === 'object') {
    result += `WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>* object = new WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>();
    *object = WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>::Create();
    *(*object) = ${propertyName}.Get(index);

    return (static_cast<${accessorPropertyType}>(object));` + '\n'
  } else if (json.type === 'array') {
    result += `WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>* object = new WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>();
    *object = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>::Create();
    *(*object) = ${propertyName}.Get(index);

    return (static_cast<${accessorPropertyType}>(object));` + '\n'
  }
  else {
    if (json.type === 'string' && !json.enum) {
      result += `    return (const_cast<${accessorPropertyType}>(${propertyName}.Get(index).Value().c_str()));` + '\n'
    }
    else {
      result += `    return (static_cast<${accessorPropertyType}>(${propertyName}.Get(index)));` + '\n'
    }
  }
  result += `}` + '\n'

  result += `void ${objName}Array_Add(${objHandleType} handle, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());` + '\n'

  if (json.type === 'object') {
    result += `    ${moduleNameSpace}::${subPropertyType}& element = *(*(static_cast<WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>*>(value)));` + '\n'
  } else if (json.type === 'array') {
    result += `    WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>& element = *(static_cast<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>*>(value));` + '\n'
  }
  else if (json.type === 'string') {
    if (json.enum) {
      result += `    WPEFramework::Core::JSON::EnumType<${moduleName}_${subPropertyType}> element(value);` + '\n'
    }
    else {
      result += `    WPEFramework::Core::JSON::String element(value);` + '\n'
    }
  }
  else if ((json.type === 'number') || (json.type === 'integer')) {
    result += `    WPEFramework::Core::JSON::DecUInt32 element(value);` + '\n'
  }
  else if (json.type === 'boolean') {
    result += `    WPEFramework::Core::JSON::Boolean element(value);` + '\n'
  }
  result += `
    ${propertyName}.Add(element);
}` + '\n'

  result += `void ${objName}Array_Clear(${objHandleType} handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());

    ${propertyName}.Clear();
}` + '\n'

  return result
}

const getMapAccessorsImpl = (objName, moduleName, containerType, subPropertyType, accessorPropertyType, json = {}) => {
  let containerName = (containerType.includes(wpeJsonNameSpace()) === true) ? `${containerType}` : `${getSdkNameSpace()}::${containerType}`

  let result = `uint32_t ${objName}_KeysCount(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
    ${containerName}::Iterator elements = (*var)->Variants();
    uint32_t count = 0;
    while (elements.Next()) {
        count++;
    }
    return (count);
}`  + '\n'
  result += `void ${objName}_AddKey(${objName}Handle handle, char* key, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if (json.type === 'object') {
      result += `    WPEFramework::Core::ProxyType<${objName}::${subPropertyType}>& element = *(static_cast<WPEFramework::Core::ProxyType<${objName}::${subPropertyType}>*>(value));` + '\n'
    }
    else if (json.type === 'array' && json.items) {
      result += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${objName}::${subPropertyType}>>& element = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${objName}::${subPropertyType}>>*>(value));` + '\n'
    }
    else if (json.type === 'string') {
      if (json.enum) {
        result += `    WPEFramework::Core::JSON::EnumType<${objName}::${subPropertyType}> element(value);` + '\n'
      }
      else {
        result += `    WPEFramework::Core::JSON::String element(value);` + '\n'
      }
    }
    else if (json.type === 'boolean') {
      result += `    WPEFramework::Core::JSON::Boolean element(value);` + '\n'
    }
    else if ((json.type === 'number') || (json.type === 'integer')) {
      result += `    WPEFramework::Core::JSON::DecUInt32 element(value);` + '\n'
    }
    result += `    (*var)->Add(const_cast<const char*>(key), &element);
}` + '\n'

  result += `void ${objName}_RemoveKey(${objName}Handle handle, char* key) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
 
    (*var)->Remove(key);
}` + '\n'

    result += `${accessorPropertyType} ${objName}_FindKey(${objName}Handle handle, char* key) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
    if ((*var)->HasLabel(key) == true) {`
    if (json.type === 'object') {
      result += `
        WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>();
       *element = WPEFramework::Core::ProxyType<${moduleNameSpace}::${subPropertyType}>::Create();
       *(*element) = (*var)->Get(key).Object();
       return (static_cast<${accessorPropertyType}>(object));` + '\n'
    }
    else if (json.type === 'array' && json.items) {
      result += `
        WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>* element = new WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>();
        *element = WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${moduleNameSpace}::${subPropertyType}>>::Create();
        *(*element) = (*var)->Get(key).Array();
        return (static_cast<${accessorPropertyType}>(element));` + '\n'
    }
    else {
      if (json.type === 'string') {
        if (json.enum) {
          result += `
          return (const_cast<${accessorPropertyType}>((*var)->Get(key).));` + '\n'
        }
        else {
          result += `
          return (const_cast<${accessorPropertyType}>((*var)->Get(key).String().c_str()));` + '\n'
        }
      }
      else if (json.type === 'boolean') {
        result += `
        return (static_cast<${accessorPropertyType}>((*var)->Get(key).Boolean()));` + '\n'
      }
      else if ((json.type === 'number') || (json.type === 'integer')) {
        result += `
        return (static_cast<${accessorPropertyType}>((*var)->Get(key).Number()));` + '\n' 
      }
    }
  result += `    }
}`

  return result
}

function getEnumConversionImpl(name, json) {
  let res = ''
  if (json.enum) {
    res += `\nENUM_CONVERSION_BEGIN(${name})\n`
    res += json.enum.map(e => `    { ${enumValue(e, name)}, _T("${e}") }`).join(',\n')
    res += `,\nENUM_CONVERSION_END(${name})`
  }
  return res
}


function getImplForSchema(moduleJson = {}, json = {}, schemas = {}, name = '', options = {level: 0, descriptions: true}) {
    json = JSON.parse(JSON.stringify(json))
    let level = options.level 
    let descriptions = options.descriptions

    let structure = {}
    structure["deps"] = new Set() //To avoid duplication of local ref definitions
    structure["type"] = []
    structure["enums"] = new Set()

    if (json['$ref']) {
      if (json['$ref'][0] === '#') {
        //Ref points to local schema 
        //Get Path to ref in this module and getSchemaType
        
        const schema = getPath(json['$ref'], moduleJson, schemas)
        const tname = schema.title || json['$ref'].split('/').pop()
        let res = getImplForSchema(moduleJson, schema, schemas, tname, {descriptions: descriptions, level: level})
        res.deps.forEach(dep => structure.deps.add(dep))
        res.enums.forEach(e => structure.enums.add(e))
        structure.type = res.type
      }
      else {
        //External schemas - No action
      }
    }
    //If the schema is a const, 
    else if (json.hasOwnProperty('const')) {
      if (level > 0) {
        let impl = description(name, json.description)
        typeName = getTypeName(getModuleName(moduleJson), name)
        impl += getObjectPropertyAccessorsImpl(typeName, getModuleName(moduleJson), capitalize(name), '', '', '', '', typeof json.const, {level: level, readonly:true, optional:false})
        structure.type.push(impl)
      }
    }
    else if (json.type === 'string' && json.enum) {
      //Enum
      let typeName = getTypeName(getModuleName(moduleJson), name || json.title)
      let res = description(capitalize(name || json.title), json.description) + getEnumConversionImpl(typeName, json)
      structure.enums.add(res)
      return structure
    }
    else if (json.type === 'object') {

      if (json.properties) {
        let tName = getTypeName(getModuleName(moduleJson), name)
        let t = getObjectHandleImpl(tName, getJsonDataStructName(getModuleName(moduleJson), name))
        Object.entries(json.properties).forEach(([pname, prop]) => {
          let desc = '\n' + description(pname, prop.description)
          let nativeType
          let j
          if (prop.type === 'array') {
            if (Array.isArray(prop.items)) {
              //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              nativeType = getSchemaType(moduleJson, prop.items[0],pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
              j = prop.items[0]
            }
            else {
              // grab the type for the non-array schema
              nativeType = getSchemaType(moduleJson, prop.items, pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
              j = prop.items
              if (prop.type === 'string' && prop.enum) {
                //Enum
                let typeName = getTypeName(getModuleName(moduleJson), pname || prop.title)
                let res = description((capitalize(name) + "::" + capitalize(pname)), prop.description) + getEnumConversionImpl(typeName, prop)
                structure.enums.add(res)
              }
            }
            if (nativeType.type && nativeType.type.length > 0) {
              let type = getArrayElementSchema(json, moduleJson, schemas)
              let moduleName = getModuleName(moduleJson)
              let moduleNameSpace = (capitalize(json.title || name).includes(wpeJsonNameSpace() === true) ? `${moduleName}` : `${getSdkNameSpace()}::${moduleName}`)
              let modulePropertyName = `${moduleNameSpace}` + '::' + capitalize(json.title || name)
              let def = getArrayAccessorsImpl(tName, moduleName, modulePropertyName, moduleNameSpace, (tName + 'Handle'), nativeType.name, capitalize(pname || prop.title), nativeType.type, type)
              t += desc + '\n' + def
            }
            else {
              console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
          }
          else {

            if (prop.type === 'object' && !prop.properties) {
                console.log(`WARNING: properties undetermined for ${pname}`)
            }
            else {

              nativeType = getSchemaType(moduleJson, prop, pname, schemas, {descriptions: descriptions, level: level + 1, title: true})
              if (nativeType.type && nativeType.type.length > 0) {
                let jtype = getJsonType(moduleJson, prop, pname, schemas)
                let subPropertyName = ((pname.length !== 0) ? capitalize(pname) : nativeType.name)
                let subPropertyType = ((!prop.title) ? nativeType.name : capitalize(prop.title))

                let nativeTypeNameSpace = (`${getSdkNameSpace()}` + '::' + nativeType.namespace)
                t += desc + '\n' + getObjectPropertyAccessorsImpl(tName, getModuleName(moduleJson), capitalize(name), subPropertyType, subPropertyName, nativeType.type, nativeTypeNameSpace, nativeType.json, {readonly:false, optional:isOptional(pname, json)})

              }
              else {
                console.log(`WARNING: Type undetermined for ${name}:${pname}`)
              }
            }
            if (prop.type === 'object' && prop.properties) {
              let res = getImplForSchema(moduleJson, prop, schemas, (prop.title || pname), {descriptions: descriptions, level: level})
              res.type.forEach(t => structure.deps.add(t))
              res.enums.forEach(e => structure.enums.add(e))
            }
            else if (prop.type === 'string' && prop.enum) {
              //Enum
              let typeName = getTypeName(getModuleName(moduleJson), pname || prop.title)
              let res = description((capitalize(name) + "::" + capitalize(pname)), prop.description) + getEnumConversionImpl(typeName, prop)
              structure.enums.add(res)
            }
          }
        })
        structure.type.push(t)
      }
      else if (json.parameterNames && json.parameterNames.enum) {
        // parameterNames in object not handled yet
      }
      else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
        //This is a map of string to type in schema
        //Get the Type
        let type = getSchemaType(moduleJson, json.additionalProperties, name,schemas)
        if (type.type && type.type.length > 0) {
          let tName = getTypeName(getModuleName(moduleJson), name)
          structure.deps = type.deps
          let t = description(name, json.description)
          let containerType = 'WPEFramework::Core::JSON::VariantContainer'
          t += getObjectHandleImpl(tName, containerType) + '\n'
          t += getMapAccessorsImpl(tName, getModuleName(moduleJson), containerType, type.name, type.type, json.additionalProperties)
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
      return getImplForSchema(moduleJson, union, schemas, name, options)

    }
    else if (json.type === 'array') {
      let j
      if (Array.isArray(json.items)) {
        //TODO
        const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
        if (!IsHomogenous(json.items)) {
          throw 'Heterogenous Arrays not supported yet'
        }
        j = json.items[0]
      }
      else {
        j = json.items
      }
  
      let res = getSchemaType(moduleJson, j,'',schemas)
      let jsonType = getJsonType(moduleJson, j, '', schemas)
      let n = getTypeName(getModuleName(moduleJson), name || json.title)
      let def = ''
      let modulePropertyName = `WPEFramework::Core::JSON::ArrayType<${jsonType.type}>`

      if (options.level === 0) {
        def += description(name || json.title, json.description) + '\n'
        def += getObjectHandleImpl(n + 'Array', modulePropertyName) + '\n'
      }
      let moduleName = getModuleName(moduleJson)
      let moduleNameSpace = (capitalize(name).includes(wpeJsonNameSpace() === true) ? `${moduleName}` : `${getSdkNameSpace()}::${moduleName}`)

      def += getArrayAccessorsImpl(n, moduleName, modulePropertyName, moduleNameSpace, (n + 'ArrayHandle'), res.name, "", res.type, j)
      structure.type.push(def)
      return structure
    }
    else{
        //TODO
    }
    return structure
  }

function getContainerName(property, module, schemas, propType) {
  let resJson = propType.json
  if (propType.json && (propType.json.type === 'array')) {
    if (Array.isArray(propType.json.items)) {
      resJson = propType.json.items[0]
    }
    else {
      resJson = propType.json.items
    }
  }
  let t = getJsonType(module, resJson, property.result.name || property.name, schemas)
  let containerType = t && t.type
  return (containerType.includes(wpeJsonNameSpace()) === true) ? `${containerType}` : `${getSdkNameSpace()}::${containerType}`
}

function getPropertyGetterImpl(property, module, schemas = {}) {
  let methodName = getModuleName(module).toLowerCase() + '.' + property.name
  let moduleName = capitalize(getModuleName(module))
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let containerName = getContainerName(property, module, schemas, propType);

  let impl = `${getPropertyGetterSignature(property, module, propType.type)} {\n`
  impl += `    const string method = _T("${methodName}");` + '\n'

  if (propType.json && (propType.json.type === 'array') && (propType.json.items)) {
    impl += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${containerName}>>* result = new WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${containerName}>>();`
  }
  else {
    impl += `    WPEFramework::Core::ProxyType<${containerName}>* result = new WPEFramework::Core::ProxyType<${containerName}>();`
  }
  
  impl += `\n\n    uint32_t status = ${getSdkNameSpace()}::Properties::Get(method, *result);
    if (status == FireboltSDKErrorNone) {
        ASSERT(result->IsValid() == true);\n`
  if (propType.json) {
    if ((propType.json.type === 'string') && (propType.type === 'char*')) {
      impl += `        *${property.name || property.result.name} = static_cast<${getFireboltStringType()}>(result);` + '\n'
    } else if ((propType.json.type === 'number') || (propType.json.const === 'enum')) {
      impl += `        *${property.name || property.result.name} = static_cast<${propType.type}>((*result)->Value());` + '\n'
    } else {
      impl += `        *${property.name || property.result.name} = static_cast<${propType.type}>(result);` + '\n'
    }
  }
  impl += '    }' + '\n'
  impl += '    return status;' + '\n'

  impl += `}`

  return impl
}

function getPropertySetterImpl(property, module, schemas = {}) {
  let methodName = getModuleName(module).toLowerCase() + '.' + property.name
  let paramName = property.name || property.result.name
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let containerName = getContainerName(property, module, schemas, propType);

  let impl = `${getPropertySetterSignature(property, module, propType.type)} {\n`

  impl += `    const string method = _T("${methodName}");` + '\n'

  if (propType.json) {
    if (propType.json.type === 'object'){
      impl += `    ${containerName}& parameters = *(*(static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(${paramName})));`
    }
    else {
      //ToDo Map?
      impl += `    WPEFramework::Core::JSON::VariantContainer parameters;` + '\n'
      if ((propType.json.type === 'array') && (propType.json.items))  {
        impl += `    WPEFramework::Core::JSON::ArrayType<${containerName}> param = *(*(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${containerName}>>*>(${paramName})));`
      } else {
        if (propType.json.type === 'string' && propType.json.enum) {
          impl += `    WPEFramework::Core::JSON::Variant param(${containerType}(${paramName}));`
        }
        else {
          impl += `    WPEFramework::Core::JSON::Variant param(${paramName});`
        }
      }
      impl += `\n    parameters.Add(_T("${paramName}"), &param);`
    }
  }
  impl += `\n\n    return ${getSdkNameSpace()}::Properties::Set(method, parameters);`
  impl += `\n}`

  return impl
}

function getPropertyEventCallbackImpl(property, module, schemas) {
  let moduleName = capitalize(getModuleName(module));
  let methodName = moduleName + capitalize(property.name)
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let containerName = getContainerName(property, module, schemas, propType)
  let paramType = (propType.type === 'char*') ? getFireboltStringType() : propType.type

  let impl = `static void ${methodName}ChangedCallback(const void* userCB, const void* userData, void* response)
{`
  if ((propType.json.type === 'array') && (propType.json.items)) {
    impl +=`    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${containerName}>>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${containerName}>>*>(response));`
  } else {
    impl +=`    WPEFramework::Core::ProxyType<${containerName}>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(response));`
  }
  impl +=`
    ASSERT(jsonResponse.IsValid() == true);
    if (jsonResponse.IsValid() == true) {
        On${methodName}Changed on${methodName}Changed = reinterpret_cast<On${methodName}Changed>(userCB);` + '\n'
  if (propType.json) {
    if ((propType.json.type === 'number') || (propType.json.const === 'enum')) {
      impl += `        on${methodName}Changed(userData, static_cast<${paramType}>(jsonResponse->Value()));` + '\n'
    } else {
      impl += `        on${methodName}Changed(userData, static_cast<${paramType}>(response));` + '\n'
    }
  }
  impl += `    }
}`
  return impl;
}

function getPropertyEventImpl(property, module, schemas) {
  let eventName = getModuleName(module).toLowerCase() + '.' + property.name
  let moduleName = capitalize(getModuleName(module))
  let methodName = moduleName + capitalize(property.name)
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let containerName = getContainerName(property, module, schemas, propType)

  let impl = `${description(property.name, 'Listen to updates')}\n` + `uint32_t ${moduleName}_Listen${capitalize(property.name)}Update(On${methodName}Changed userCB, const void* userData, uint32_t* listenerId)
{
    const string eventName = _T("${eventName}");
    uint32_t status = FireboltSDKErrorNone;
    if (userCB != nullptr) {` + '\n'
  if ((propType.json.type === 'array') && (propType.json.items)) {
    impl += `    status = ${getSdkNameSpace()}::Properties::Subscribe<WPEFramework::Core::JSON::ArrayType<${containerName}>>(eventName, ${methodName}ChangedCallback, reinterpret_cast<void*>(userCB), userData, *listenerId);`
  } else {
    impl += `    status = ${getSdkNameSpace()}::Properties::Subscribe<${containerName}>(eventName, ${methodName}ChangedCallback, reinterpret_cast<void*>(userCB), userData, *listenerId);`
  }
  impl += `
    } else {
        status = ${getSdkNameSpace()}::Properties::Unsubscribe(eventName, *listenerId);
    }
    return status;
}`
  return impl
}

export {
    getSdkNameSpace,
    getNameSpaceOpen,
    getNameSpaceClose,
    getJsonDefinition,
    getJsonType,
    getImplForSchema,
    getPropertyGetterImpl,
    getPropertySetterImpl,
    getPropertyEventCallbackImpl,
    getPropertyEventImpl
}
