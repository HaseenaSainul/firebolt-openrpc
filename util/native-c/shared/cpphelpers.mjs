import { getPath, getSchema } from '../../shared/json-schema.mjs'
import deepmerge from 'deepmerge'
import { getSchemaType, capitalize, getTypeName,getModuleName, description, getArrayElementSchema,
         isOptional, enumValue, getPropertyGetterSignature, getPropertySetterSignature,
         getFireboltStringType, getMethodSignature} from "./nativehelpers.mjs"

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
const getJsonNativeTypeForOpaqueString = () => {
    let resultJson = {type: {}}
    resultJson.type = 'string'
    return getJsonNativeType(resultJson)
}

const getJsonDataStructName = (modName, name, prefixName = '') => {
    let result = (prefixName.length > 0) ? `${capitalize(modName)}::${capitalize(prefixName)}_${capitalize(name)}` : `${capitalize(modName)}::${capitalize(name)}`
    return result
}

const getJsonNativeType = json => {
    let type
    let jsonType = json.const ? typeof json.const : json.type

    if (jsonType === 'string') {
        type = getSdkNameSpace() + '::JSON::String'
    }
    else if (jsonType === 'number' || json.type === 'integer') { //Lets keep it simple for now
        type = 'WPEFramework::Core::JSON::DecSInt32'
    }
    else if (jsonType === 'boolean') {
      type = 'WPEFramework::Core::JSON::Boolean'
    }
    else {
        throw 'Unknown JSON Native Type !!!'
    }
    return type
}

function getJsonType(module = {}, json = {}, name = '', schemas = {}, prefixName = '', options = {descriptions: false, level: 0}) {

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
      const res = getJsonType(module, definition, tName, schemas, '', {descriptions: options.descriptions, level: options.level})
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
      const res = getJsonType(schema, definition, tName, schemas, '', {descriptions: options.descriptions, level: options.level})
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
      let type = getJsonType(module, json.additionalProperties, name, schemas, prefixName)
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
      res = getJsonType(module, json.items[0], name, schemas, prefixName) //TOBE Checked
    }
    else {
      // grab the type for the non-array schema
      res = getJsonType(module, json.items, '', schemas, prefixName)
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
    return getJsonType(module, union, '',schemas, options, prefixName)
  }
  else if (json.oneOf || json.anyOf) {
    structure.type = getJsonNativeTypeForOpaqueString()
    return structure
    //TODO
  }
  else if (json.type === 'object') {
    if (!json.properties) {
      structure.type = getJsonNativeTypeForOpaqueString()
    }
    else {
      let res = getJsonDefinition(module, json, schemas, json.title || name, {descriptions: options.descriptions, level: 0})
      structure.deps = res.deps
      structure.deps.add(res.type.join('\n'))
      let containerType = getJsonDataStructName(getModuleName(module), json.title || name, prefixName)
      structure.type.push((containerType.includes(wpeJsonNameSpace()) === true) ? `${containerType}` : `${getSdkNameSpace()}::${containerType}`)
    }
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

function getJsonDefinition(moduleJson = {}, json = {}, schemas = {}, name = '', prefixName = '', options = {level: 0, descriptions: true}) {

  let structure = {}
  structure["deps"] = new Set() //To avoid duplication of local ref definitions
  structure["type"] = []
  if (json.type === 'object' || (json.additonalProperties && typeof json.additonalProperties.type === 'object')) {
    if (json.properties || json.additonalProperties) {
        let tName = (prefixName.length > 0) ? (prefixName + '_' + capitalize(name)) : capitalize(name)
        let props = []
        Object.entries(json.properties || json.additonalProperties).forEach(([pname, prop]) => {
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
            if (prop.type === 'object' && !prop.properties && !prop.additionalProperties) {
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
    }
    else if (json.additionalProperties && (typeof json.additionalProperties === 'object')) {
      //This is a map of string to type in schema
      //Get the Type
      let type = getJsonType(moduleJson, json.additionalProperties, name, schemas)
      if (!type.type || type.type.length === 0) {
        console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}`)
      } else {
         type.deps.forEach(t => structure.type.push(t))
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

const getObjectPropertyAccessorsImpl = (objName, moduleName, modulePropertyType, subPropertyType, subPropertyName, accessorPropertyType, json = {}, options = {readonly:false, optional:false}) => {

  let result = ''
  result += `${accessorPropertyType} ${objName}_Get_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'
  if (json.type === 'object') {
// CHECK_EXECUTION_REACHED_HERE, it is executed
    result += `    WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
    *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
    *(*element) = (*var)->${subPropertyName};
    return (static_cast<${accessorPropertyType}>(element));` + '\n'
  }
  else if (json.type === 'array' && json.items) {
CHECK_EXECUTION_REACHED_HERE // Seems this flow is not required, we are not calling this method json.type array.
    result += `    WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
    *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
    *(*element) = (*var)->${subPropertyName}.Element();
    return (static_cast<${accessorPropertyType}>(element));` + '\n'
  }
  else {
    if (json.type === 'string' && !json.enum) {
//CHECK_EXECUTION_REACHED_HERE, it is executed
      result += `    return (const_cast<${accessorPropertyType}>((*var)->${subPropertyName}.Value().c_str()));` + '\n'
    }
    else {
    if (json.type !== 'integer' && json.type !== 'boolean' && json.type !== 'number' && json.type !== 'string') {
       console.log("json.type")
       console.log(json.type)
       CHECK_EXECUTION_REACHED_HERE
    }
      result += `    return (static_cast<${accessorPropertyType}>((*var)->${subPropertyName}.Value()));` + '\n'
    }
  }
  result += `}` + '\n'

  if (!options.readonly) {
    result += `void ${objName}_Set_${subPropertyName}(${objName}Handle handle, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if (json.type === 'object') {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `    WPEFramework::Core::ProxyType<${subPropertyType}>* object = static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value);
    (*var)->${subPropertyName} = *(*object);` + '\n'
    }
    else if (json.type === 'array' && json.items) {
CHECK_EXECUTION_REACHED_HERE // Seems this flow is not required, we are not calling this method json.type array.
      result += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyType}>>* object = static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${subPropertyType}>>*>(value).Element();
    (*var)->${subPropertyName} = *(*object);` + '\n'
    }
    else {
    if (json.type !== 'integer' && json.type !== 'string' && json.type !== 'boolean' && json.type !== 'number') {
       console.log("json.type")
       console.log(json.type)
       CHECK_EXECUTION_REACHED_HERE
    }

      result += `    (*var)->${subPropertyName} = value;` + '\n'
    }
    result += `}` + '\n'
  }

  if (options.optional === true) {
    result += `bool ${objName}_Has_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());

    return ((*var)->${subPropertyName}.IsSet());
}` + '\n'
    result += `void ${objName}_Clear_${subPropertyName}(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
    ((*var)->${subPropertyName}.Clear());
}` + '\n'
  }

  return result
}

const getArrayAccessorsImpl = (objName, moduleName, modulePropertyType, objHandleType, subPropertyType, subPropertyName, accessorPropertyType, json = {}) => {

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

  if ((json.type === 'object') || (json.type === 'array')) {
    if (json.type !== 'object') {
CHECK_EXECUTION_REACHED_HERE
    }
    result += `WPEFramework::Core::ProxyType<${subPropertyType}>* object = new WPEFramework::Core::ProxyType<${subPropertyType}>();
    *object = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
    *(*object) = ${propertyName}.Get(index);

    return (static_cast<${accessorPropertyType}>(object));` + '\n'
  }
  else {
    if (json.type === 'string' && !json.enum) {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `    return (const_cast<${accessorPropertyType}>(${propertyName}.Get(index).Value().c_str()));` + '\n'
    }
    else {
    if (json.type !== 'integer' && json.type !== 'string' && json.type !== 'number' && json.type !== 'boolean') {
       console.log("json.type = " + json.type)
CHECK_EXECUTION_REACHED_HERE
    }
      result += `    return (static_cast<${accessorPropertyType}>(${propertyName}.Get(index)));` + '\n'
    }
  }
  result += `}` + '\n'

  result += `void ${objName}Array_Add(${objHandleType} handle, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());` + '\n'

  if ((json.type === 'object') || (json.type === 'array')) {
    if (json.type !== 'object') {
CHECK_EXECUTION_REACHED_HERE
    }
    result += `    ${subPropertyType}& element = *(*(static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value)));` + '\n'
  }
  else {
// CHECK_EXECUTION_REACHED_HERE it is executed for string/number/integer/boolean/enum
    result += `    ${subPropertyType} element(value);` + '\n'
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

  let result = `uint32_t ${objName}_KeysCount(${objName}Handle handle) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
    ${containerType}::Iterator elements = (*var)->Variants();
    uint32_t count = 0;
    while (elements.Next()) {
        count++;
    }
    return (count);
}`  + '\n'
  result += `void ${objName}_AddKey(${objName}Handle handle, char* key, ${accessorPropertyType} value) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if ((json.type === 'object') || (json.type === 'array' && json.items)) {
// CHECK_EXECUTION_REACHED_HERE it is executed for array and object
      result += `    ${subPropertyType}& element = *(*(static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value)));` + '\n'
    }
    else if (json.type === 'string') {
      if (json.enum) {
// CHECK_EXECUTION_REACHED_HERE it is executed
        result += `    WPEFramework::Core::JSON::EnumType<${subPropertyType}> element(value);` + '\n'
      }
      else {
// CHECK_EXECUTION_REACHED_HERE it is executed
        result += `    WPEFramework::Core::JSON::String element(value);` + '\n'
      }
    }
    else if (json.type === 'boolean') {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `    WPEFramework::Core::JSON::Boolean element(value);` + '\n'
    }
    else if ((json.type === 'number') || (json.type === 'integer')) {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `    WPEFramework::Core::JSON::DecSInt32 element(value);` + '\n'
    }
    result += `    (*var)->Add(const_cast<const char*>(key), &element);
}` + '\n'

  result += `void ${objName}_RemoveKey(${objName}Handle handle, char* key) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
 
    (*var)->Remove(key);
}` + '\n'

    result += `${accessorPropertyType} ${objName}_FindKey(${objName}Handle handle, char* key) {
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
    if ((*var)->HasLabel(key) == true) {`
    if (json.type === 'object') {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `
        string objectStr;
        (*var)->Get(key).Object().ToString(objectStr);
        ${subPropertyType} objectMap;
        objectMap.FromString(objectStr);

        WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
        *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
        *(*element) = objectMap;

        return (static_cast<${accessorPropertyType}>(element));` + '\n'
    }
    else if (json.type === 'array' && json.items) {
// CHECK_EXECUTION_REACHED_HERE it is executed
      result += `
        WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
        *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
        *(*element) = (*var)->Get(key).Array();
        return (static_cast<${accessorPropertyType}>(element));` + '\n'
    }
    else {
      if (json.type === 'string') {
        if (json.enum) {
// CHECK_EXECUTION_REACHED_HERE it is executed
          result += `
        return (const_cast<${accessorPropertyType}>((*var)->Get(key).));` + '\n'
        }
        else {
// CHECK_EXECUTION_REACHED_HERE it is executed
          result += `
        return (const_cast<${accessorPropertyType}>((*var)->Get(key).String().c_str()));` + '\n'
        }
      }
      else if (json.type === 'boolean') {
// CHECK_EXECUTION_REACHED_HERE it is executed
        result += `
        return (static_cast<${accessorPropertyType}>((*var)->Get(key).Boolean()));` + '\n'
      }
      else if ((json.type === 'number') || (json.type === 'integer')) {
// CHECK_EXECUTION_REACHED_HERE it is executed
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


function getImplForSchema(moduleJson = {}, json = {}, schemas = {}, name = '', prefixName = '', options = {level: 0, descriptions: true}) {
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
        let res = getImplForSchema(moduleJson, schema, schemas, tname, prefixName, {descriptions: descriptions, level: level})
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
        typeName = getTypeName(getModuleName(moduleJson), name, prefixName)

        let moduleProperty = getJsonType(moduleJson, json, name, schemas, prefixName)
        impl += getObjectPropertyAccessorsImpl(typeName, getModuleName(moduleJson), moduleProperty.type, '', '', '', typeof json.const, {level: level, readonly:true, optional:false})
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
        let tName = getTypeName(getModuleName(moduleJson), name, prefixName)
        let t = getObjectHandleImpl(tName, getJsonDataStructName(getModuleName(moduleJson), name, prefixName))
        Object.entries(json.properties).forEach(([pname, prop]) => {
          let desc = '\n' + description(pname, prop.description)
          let schema = ''
          let j
          if (prop.type === 'array') {
            if (Array.isArray(prop.items)) {
              //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              schema = getSchemaType(moduleJson, prop.items[0],pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
              j = prop.items[0]
            }
            else {
              // grab the type for the non-array schema
              schema = getSchemaType(moduleJson, prop.items, pname, schemas, {level : options.level, descriptions: options.descriptions, title: true})
              j = prop.items
              if (prop.type === 'string' && prop.enum) {
CHECK_EXECUTION_REACHED_HERE
                //Enum
                let typeName = getTypeName(getModuleName(moduleJson), pname || prop.title)
                let res = description((capitalize(name) + "::" + capitalize(pname)), prop.description) + getEnumConversionImpl(typeName, prop)
                structure.enums.add(res)
              }
            }
            if (schema.type && schema.type.length > 0) {
              let type = getArrayElementSchema(json, moduleJson, schemas, schema.name)
              if (type.type === 'string' && type.enum) {
                let typeName = getTypeName(getModuleName(moduleJson), schema.name)
                structure.enums.add(description(schema.name, schema.json.description) + getEnumConversionImpl(typeName, type))
              }

              let moduleName = getModuleName(moduleJson)
              let moduleProperty = getJsonType(moduleJson, json, json.title || name, schemas, prefixName)
              let subModuleProperty = getJsonType(moduleJson, schema.json, schema.name, schemas, prefixName)
              let def = getArrayAccessorsImpl(tName, moduleName, moduleProperty.type, (tName + 'Handle'), subModuleProperty.type, capitalize(pname || prop.title), schema.type, type)
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

              schema = getSchemaType(moduleJson, prop, pname, schemas, {descriptions: descriptions, level: level + 1, title: true})
              if (schema.type && schema.type.length > 0) {
                let jtype = getJsonType(moduleJson, prop, pname, schemas, prefixName)
                let subPropertyName = ((pname.length !== 0) ? capitalize(pname) : schema.name)
                let subPropertyType = ((!prop.title) ? schema.name : capitalize(prop.title))

                let schemaNameSpace = (`${getSdkNameSpace()}` + '::' + schema.namespace)
                let moduleProperty = getJsonType(moduleJson, json, name, schemas, prefixName)
                let subProperty = getJsonType(moduleJson, prop, pname, schemas, prefixName)
                t += desc + '\n' + getObjectPropertyAccessorsImpl(tName, getModuleName(moduleJson), moduleProperty.type, subProperty.type, subPropertyName, schema.type, schema.json, {readonly:false, optional:isOptional(pname, json)})

              }
              else {
                console.log(`WARNING: Type undetermined for ${name}:${pname}`)
              }
            }
            if (prop.type === 'object' && prop.properties) {
              let res = getImplForSchema(moduleJson, prop, schemas, (prop.title || pname), prefixName, {descriptions: descriptions, level: level})
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
        if (!type.type || (type.type.length === 0)) {
            type.type = 'char*'
            type.json = json.additionalProperties
            type.json.type = 'string'
        }

        let tName = getTypeName(getModuleName(moduleJson), name, prefixName)
        let t = description(name, json.description) + '\n'
        let containerType = 'WPEFramework::Core::JSON::VariantContainer'

        let subModuleProperty = getJsonType(moduleJson, type.json, type.name, schemas, prefixName)
        if (type.json.type === 'string' && type.json.enum) {
          //Enum
          let typeName = getTypeName(getModuleName(moduleJson), name)
          let res = description(name, json.description) + getEnumConversionImpl(typeName, type.json)
          structure.enums.add(res)
        } else if ((type.json.type === 'object' && type.json.properties) || type.json.type === 'array') {
          let res = getImplForSchema(moduleJson, type.json, schemas, name, prefixName, {descriptions: descriptions, level: level})
          res.type.forEach(t => structure.deps.add(t))
          res.enums.forEach(e => structure.enums.add(e))
        }

        t += getMapAccessorsImpl(tName, getModuleName(moduleJson), containerType, subModuleProperty.type, type.type, type.json)
        structure.type.push(t)
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
      return getImplForSchema(moduleJson, union, schemas, name, prefixName, options)

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
  
      let schema = getSchemaType(moduleJson, j, name ,schemas)
      if (schema.type && schema.type.length > 0) {
        let type = getArrayElementSchema(json, moduleJson, schemas, schema.name)
        if (type.type === 'string' && type.enum) {
          let typeName = getTypeName(getModuleName(moduleJson), schema.name)
          structure.enums.add(description(schema.name, schema.json.description) + getEnumConversionImpl(typeName, type))
        }
      }

      let jsonType = getJsonType(moduleJson, j, name, schemas, prefixName)
      let n = getTypeName(getModuleName(moduleJson), name || json.title, prefixName)
      let def = ''
      let modulePropertyName = `WPEFramework::Core::JSON::ArrayType<${jsonType.type}>`

      if (options.level === 0) {
        def += description(name || json.title, json.description) + '\n'
        def += getObjectHandleImpl(n + 'Array', modulePropertyName) + '\n'
      }
      let moduleName = getModuleName(moduleJson)
      let moduleNameSpace = (capitalize(name).includes(wpeJsonNameSpace() === true) ? `${moduleName}` : `${getSdkNameSpace()}::${moduleName}`)

      def += getArrayAccessorsImpl(n, moduleName, modulePropertyName, (n + 'ArrayHandle'), jsonType.type, "", schema.type, schema.json)
      structure.type.push(def)
      return structure
    }
    else{
        //TODO
    }
    return structure
  }

function getPropertyGetterImpl(property, module, schemas = {}) {
  let methodName = getModuleName(module).toLowerCase() + '.' + property.name
  let moduleName = capitalize(getModuleName(module))
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let container = getJsonType(module, propType.json, property.result.name || property.name, schemas)

  let impl = `${getPropertyGetterSignature(property, module, propType.type)} {\n`
  impl += `    const string method = _T("${methodName}");` + '\n'

  if (propType.json) {
    impl += `    ${container.type} jsonResult;`
  }
  
  impl += `\n\n    uint32_t status = ${getSdkNameSpace()}::Properties::Get(method, jsonResult);
    if (status == FireboltSDKErrorNone) {\n`
  if (propType.json) {
    if ((propType.json.type === 'string') && (propType.type === 'char*')) {
// CHECK_EXECUTION_REACHED_HERE it is executed
      impl += `    ${container.type}* strResult = new ${container.type}();`
      impl += `        *${property.name || property.result.name} = static_cast<${getFireboltStringType()}>(strResult);` + '\n'
    } else if ((propType.json.type === 'object') || (propType.json.type === 'array')) {
// CHECK_EXECUTION_REACHED_HERE it is executed for object & array
impl += `    WPEFramework::Core::ProxyType<${container.type}>* resultPtr = new WPEFramework::Core::ProxyType<${container.type}>();`
      impl += `        *${property.name || property.result.name} = static_cast<${propType.type}>(resultPtr);` + '\n'
    } else {
// CHECK_EXECUTION_REACHED_HERE it is executed for integer/boolean/enum
      impl += `        *${property.name || property.result.name} = jsonResult.Value();` + '\n'
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
  let container = getJsonType(module, propType.json, property.result.name || property.name, schemas)

  let impl = `${getPropertySetterSignature(property, module, propType.type)} {\n`

  impl += `    const string method = _T("${methodName}");` + '\n'

  if (propType.json) {
    if (propType.json.type === 'object') {
//CHECK_EXECUTION_REACHED_HERE it is executed
      impl += `    ${container.type}& parameters = *(*(static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(${paramName})));`
    }
    else {
      //ToDo Map?
      impl += `    WPEFramework::Core::JSON::VariantContainer parameters;` + '\n'
      if ((propType.json.type === 'array') && (propType.json.items))  {
//CHECK_EXECUTION_REACHED_HERE
        impl += `    WPEFramework::Core::JSON::ArrayType<${container.type}> param = *(*(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${container.type}>>*>(${paramName})));`
      } else {
        if (propType.json.type === 'string' && propType.json.enum) {
//CHECK_EXECUTION_REACHED_HERE it is executed
          impl += `    WPEFramework::Core::JSON::Variant param(${container.type}(${paramName}));`
        }
        else {
// CHECK_EXECUTION_REACHED_HERE, it is executed for integer/boolean/enum
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
  return getEventCallbackLocalImpl(property, module, schemas, true)
}

function getPropertyEventImpl(property, module, schemas) {
  return getEventLocalImpl(property, module, schemas, true)
}

function getEventCallbackImpl(event, module, schemas) {
  return getEventCallbackLocalImpl(event, module, schemas, false)
}

function getEventImpl(event, module, schemas) {
  return getEventLocalImpl(event, module, schemas, false)
}

function getEventCallbackLocalImpl(event, module, schemas, property) {
  let moduleName = capitalize(getModuleName(module));
  let methodName = moduleName + capitalize(event.name)
  let propType = getSchemaType(module, event.result.schema, event.result.name || event.name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let container = getJsonType(module, propType.json, event.result.name || event.name, schemas)
    let paramType = (propType.type === 'char*') ? getFireboltStringType() : propType.type

    impl += `static void ${methodName}InnerCallback(const void* userCB, const void* userData, void* response)
{` + '\n'

    impl +=`    WPEFramework::Core::ProxyType<${container.type}>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(response));`
  
    if (propType.json) {
      impl +=`

    ASSERT(jsonResponse.IsValid() == true);
    if (jsonResponse.IsValid() == true) {` + '\n'
    
      if ((propType.json.type === 'string') && (!propType.json.enum)) {
         console.log(propType)
         impl +=`        ${container.type}* jsonStrResponse = new ${container.type}();
        *jsonStrResponse = *jsonResponse;
        jsonResponse.Release();` + '\n\n'
      }

      let CallbackName = ''
      if (property == true) {
        CallbackName = `On${methodName}Changed`
      } else {
        CallbackName = `${methodName}Callback`
      }

      impl +=`        ${CallbackName} callback = reinterpret_cast<${CallbackName}>(userCB);` + '\n'
      if ((propType.json.type === 'object') || (propType.json.type === 'array')) {
//CHECK_EXECUTION_REACHED_HERE
        impl += `        callback(userData, static_cast<${paramType}>(response));` + '\n'
      }
      else if ((propType.json.type === 'string') && (!propType.json.enum)) {
// CHECK_EXECUTION_REACHED_HERE it is executed
        impl += `        callback(userData, static_cast<${paramType}>(jsonStrResponse));` + '\n'
      }
      else {
//CHECK_EXECUTION_REACHED_HERE it is executed for enum, integer, boolean
        impl += `        callback(userData, static_cast<${paramType}>(jsonResponse->Value()));` + '\n'
      }
    }
    impl += `    }
}`
  }
  return impl;
}

function getEventLocalImpl(event, module, schemas, property) {
  let eventName = getModuleName(module).toLowerCase() + '.' + event.name
  let moduleName = capitalize(getModuleName(module))
  let methodName = moduleName + capitalize(event.name)
  let propType = getSchemaType(module, event.result.schema, event.result.name || event.name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let container = getJsonType(module, propType.json, event.result.name || event.name, schemas)
    let ClassName = ''
    let CallbackName = ''
    if (property) {
      ClassName = "Properties::"
      CallbackName = `On${methodName}Changed`
    } else {
      ClassName = "Event::Instance()."
      CallbackName = `${methodName}Callback`
    }

    impl += `${description(event.name, 'Listen to updates')}\n` + `uint32_t ${moduleName}_Register_${capitalize(event.name)}Update(${CallbackName} userCB, const void* userData)
{
    const string eventName = _T("${eventName}");
    uint32_t status = FireboltSDKErrorNone;
    if (userCB != nullptr) {` + '\n'
      impl += `        status = ${getSdkNameSpace()}::${ClassName}Subscribe<${container.type}>(eventName, ${methodName}InnerCallback, reinterpret_cast<const void*>(userCB), userData);
    }
    return status;
}
uint32_t ${moduleName}_Unregister_${capitalize(event.name)}Update(${CallbackName} userCB)
{
    return ${getSdkNameSpace()}::${ClassName}Unsubscribe(_T("${eventName}"), reinterpret_cast<const void*>(userCB));
}`
  }
  return impl
}

function getImplForMethodParam(param, module, name, schemas, prefixName = '') {
  let impl = {type: [], deps: new Set(), enums: new Set(), jsonData: new Set()}

  let resJson = param.schema
  if ((resJson['$ref'] === undefined) || (resJson['$ref'][0] !== '#')) {
    let res = {}
    res = getImplForSchema(module, resJson, schemas, param.name || name, prefixName)
    res.type.forEach(type => (impl.type.includes(type) === false) ?  impl.type.push(type) : null)
    res.deps.forEach(dep => impl.deps.add(dep))
    res.enums.forEach(e => impl.enums.add(e))
  }

  //Get the JsonData definition for the schema
  let jType = getJsonDefinition(module, resJson, schemas, param.name || name, prefixName)
  jType.deps.forEach(j => impl.jsonData.add(j))
  jType.type.forEach(t => impl.jsonData.add(t))

  return impl
}

function getMethodImpl(method, module, schemas) {
  let methodName = getModuleName(module).toLowerCase() + '.' + method.name
  let structure = getMethodSignature(method, module, schemas)
  let impl = ''

  if (structure.signature) {

    impl = `${structure.signature}\n{\n`

    impl += `    uint32_t status = FireboltSDKErrorUnavailable;
    ${getSdkNameSpace()}::Transport<WPEFramework::Core::JSON::IElement>* transport = ${getSdkNameSpace()}::Accessor::Instance().GetTransport();
    if (transport != nullptr) {\n
        JsonObject jsonParameters;\n`

        method.params.forEach(param => {
          const getParamType = paramName => structure.params.find(p => p.name === paramName)
          let nativeType = getParamType(param.name)

          const jsonType = getJsonType(module, param, param.name, schemas)
          if (jsonType.type.length) {
            if (nativeType.type.includes('FireboltTypes_StringHandle')) {
              impl += `        ${jsonType.type}& ${capitalize(param.name)} = *(static_cast<${jsonType.type}*>(${param.name}));\n`
            }
            else if (nativeType.type.includes('Handle')) {
              impl += `        ${jsonType.type}& ${capitalize(param.name)} = *(*(static_cast<WPEFramework::Core::ProxyType<${jsonType.type}>*>(${param.name})));\n`
            }
            else {
                impl += `        ${jsonType.type} ${capitalize(param.name)} = ${param.name};\n`
            }
            impl += `        jsonParameters.Add("_T(${param.name})", &${capitalize(param.name)});\n\n`
          }
        })
        let resultJsonType = getJsonType(module, method.result.schema, method.result.name, schemas, method.name)

        impl += `        ${resultJsonType.type} jsonResult;\n` 
        impl += `        status = transport->Invoke("${methodName}", jsonParameters, jsonResult);\n`
        impl += `        if (status == FireboltSDKErrorNone) {\n`

        if (structure.result.includes('FireboltTypes_StringHandle')) {
            impl += `            ${resultJsonType.type}* resultPtr = new ${resultJsonType.type}(jsonResult);\n`
            impl += `            *${method.result.name} = static_cast<${structure.result}>(resultPtr);\n`
        }
        else {
          if (structure.result.includes('Handle')) {
            impl += `            WPEFramework::Core::ProxyType<${resultJsonType.type}>* resultPtr = new WPEFramework::Core::ProxyType<${resultJsonType.type}>(jsonResult);\n`
            impl += `            *${method.result.name} = static_cast<${structure.result}>(resultPtr);\n`
          }
          else {
            impl += `            *${method.result.name} = jsonResult.Value();\n`
          }
        }

        impl += '        }\n'

      impl += `
    } else {
        FIREBOLT_LOG_ERROR(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "Error in getting Transport err = %d", status);
    }

    return status;
}`
  }
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
    getPropertyEventImpl,
    getEventCallbackImpl,
    getEventImpl,
    getImplForMethodParam,
    getMethodImpl
}
