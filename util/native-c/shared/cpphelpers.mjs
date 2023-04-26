import { getPath, getSchema } from '../../shared/json-schema.mjs'
import deepmerge from 'deepmerge'
import { getSchemaType, capitalize, getTypeName, getModuleName, description, 
         getArrayElementSchema, isOptional, enumValue, getPropertyGetterSignature, getParamsDetails,
         getPropertySetterSignature, getFireboltStringType, getMethodSignature, getEventSignature,
         getPropertyEventSignature, validJsonObjectProperties, hasProperties, getSchemaRef, getPolymorphicSchema,
         getPolymorphicMethodSignature, IsResultBooleanSuccess, IsCallsMetricsMethod } from "./nativehelpers.mjs"

const getSdkNameSpace = () => 'FireboltSDK'
const getJsonDataPrefix = () => 'JsonData_'
const wpeJsonNameSpace = () => 'WPEFramework::Core::JSON'
const getJsonNativeTypeForOpaqueString = () => getSdkNameSpace() + '::JSON::String'
const getEnumName = (name, prefix) => ((prefix.length > 0) ? (prefix + '_' + name) : name)

/* Added to get line number, to be deleted in the final version
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require('path');

['debug', 'log', 'warn', 'error'].forEach((methodName) => {
    const originalLoggingMethod = console[methodName];
    console[methodName] = (firstArgument, ...otherArguments) => {
        const originalPrepareStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, stack) => stack;
        const callee = new Error().stack[1];
        Error.prepareStackTrace = originalPrepareStackTrace;
        const relativeFileName = path.relative(process.cwd(), callee.getFileName());
        const prefix = `${relativeFileName}:${callee.getLineNumber()}:`;
        if (typeof firstArgument === 'string') {
            originalLoggingMethod(prefix + ' ' + firstArgument, ...otherArguments);
        } else {
            originalLoggingMethod(prefix, firstArgument, ...otherArguments);
        }
    };
});
*/
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

const getJsonDataStructName = (modName, name, prefixName = '') => {
    let result =((prefixName.length > 0) && (prefixName != name)) ? `${capitalize(modName)}::${getJsonDataPrefix()}${capitalize(prefixName)}${capitalize(name)}` : `${capitalize(modName)}::${getJsonDataPrefix()}${capitalize(name)}`
    return result
}

const getCallsMetricsDispatcher = (module, method, schemas, prefixName = '') => {
  let impl = ''
  if (IsCallsMetricsMethod(method) === true) {
    let methodName = 'Metrics_' + capitalize(method.name)

    let resultJsonType = getJsonType(module, method.result.schema, method.result.name, schemas, method.name)
    if (resultJsonType.type.length > 0 && method.result.schema.type !== 'boolean') {
      impl += `void ${methodName}Dispatcher(const void* result)\n{\n`
      impl += `    ${methodName}(static_cast<resultJsonType.type>(const_cast<void*>(result)));\n`
    }
    else {
      impl += `void ${methodName}Dispatcher(const void*)\n{\n`
      impl += `    ${methodName}();\n`
    }
    impl += `}\n`
  }
  return impl
}

const getCallsMetricsImpl = (module, method, schemas, prefixName = '') => {
  let impl = ''
  if (IsCallsMetricsMethod(method) === true) {

    let methodName = 'Metrics_' + capitalize(method.name)
    let resultJsonType = getJsonType(module, method.result.schema, method.result.name, schemas, method.name)
    if (resultJsonType.type.length > 0 && method.result.schema.type !== 'boolean') {

      impl += `            void* ${method.result.name} = static_cast<void*>(new ${resultJsonType.type});\n`
      impl += `            WPEFramework::Core::ProxyType<WPEFramework::Core::IDispatch> job = WPEFramework::Core::ProxyType<WPEFramework::Core::IDispatch>(WPEFramework::Core::ProxyType<FireboltSDK::Worker>::Create(${methodName}Dispatcher, ${method.result.name}));\n`
    }
    else {

      impl += `            WPEFramework::Core::ProxyType<WPEFramework::Core::IDispatch> job = WPEFramework::Core::ProxyType<WPEFramework::Core::IDispatch>(WPEFramework::Core::ProxyType<FireboltSDK::Worker>::Create(${methodName}Dispatcher, nullptr));\n`
    }
    impl += `            WPEFramework::Core::IWorkerPool::Instance().Submit(job);\n`
  }
  return impl
}

const getJsonNativeType = json => {
    let type
    let jsonType = json.const ? typeof json.const : json.type

    if (jsonType === 'string') {
        type = getSdkNameSpace() + '::JSON::String'
    }
    else if (jsonType === 'number') {
        type = 'WPEFramework::Core::JSON::Float'
    }
    else if (json.type === 'integer') {
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
    let t = 'WPEFramework::Core::JSON::EnumType<' + (json.namespace ? json.namespace : getModuleName(module)) + '_' + (getEnumName(capitalize(name), prefixName)) + '>'
    structure.type.push(t)
    return structure
  }
  else if (Array.isArray(json.type)) {
    let type = json.type.find(t => t !== 'null')
    console.log(`WARNING UNHANDLED: type is an array containing ${json.type}`)
  }
  else if (json.type === 'array' && json.items) {
    let res
    let items
    if (Array.isArray(json.items)) {
      //TODO
      const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
      if (!IsHomogenous(json.items)) {
        throw 'Heterogenous Arrays not supported yet'
      }
      items = json.items[0]
    }
    else {
      items = json.items
      // grab the type for the non-array schema
    }
    res = getJsonType(module, items, items.name || name, schemas, prefixName)
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
    let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)

    delete union['$ref']
    return getJsonType(module, union, '', schemas, prefix, options)
  }
  else if (json.oneOf) {
    structure.type = getJsonNativeTypeForOpaqueString()
    return structure
  }
  else if (json.patternProperties) {
    structure.type = getJsonNativeTypeForOpaqueString()
    return structure
  }
  else if (json.anyOf) {
    return structure //TODO
  }
  else if (json.type === 'object') {
    if (hasProperties(json) !== true) {
      structure.type = getJsonNativeTypeForOpaqueString()
    }
    else {
      let res = getJsonDefinition(module, json, schemas, json.title || name, prefixName, {descriptions: options.descriptions, level: 0})
      let schema = getSchemaType(module, json, name, schemas)
      structure.deps = res.deps
      structure.deps.add(res.type.join('\n'))
      if (schema.namespace && schema.namespace.length > 0) {
        let containerType = getJsonDataStructName(schema.namespace, json.title || name, prefixName)
        structure.type.push((containerType.includes(wpeJsonNameSpace()) === true) ? `${containerType}` : `${getSdkNameSpace()}::${containerType}`)
      }
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
  name = getJsonDataPrefix() + capitalize(name)
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
    if ((json.properties || json.additonalProperties) && (validJsonObjectProperties(json) === true)) {
        let tName = ((prefixName.length > 0) && (name != prefixName)) ? (prefixName + capitalize(name)) : capitalize(name)
        let props = []
        Object.entries(json.properties || json.additonalProperties).every(([pname, prop]) => {
          if (prop.type === 'array') {
            let res
            if (Array.isArray(prop.items)) {
            //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              res = getJsonType(moduleJson, prop.items[0], prop.items[0].name || pname, schemas )
            }
            else {
              // grab the type for the non-array schema
              res = getJsonType(moduleJson, prop.items, prop.items.name || pname, schemas, prefixName)
            }
            if (res.type && res.type.length > 0) {
              props.push({name: `${pname}`, type: `WPEFramework::Core::JSON::ArrayType<${res.type}>`})
              res.deps.forEach(t => structure.deps.add(t))
            }
            else {
              console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}:${pname}`)
              return true
            }
          }
          else {
            if (prop.type === 'object' && (hasProperties(prop) !== true)) {
              props.push({name: `${pname}`, type: `${getJsonNativeTypeForOpaqueString()}`})
            } else {
              let res = getJsonType(moduleJson, prop, pname, schemas, prefixName)
              if (res.type && res.type.length > 0) {
                props.push({name: `${pname}`, type: `${res.type}`})
                res.deps.forEach(t => structure.deps.add(t))
              }
              else {
                console.log(`WARNING: getJsonDefinition: Type undetermined for ${name}:${pname}`)
                return true
              }
            }
          }
          return true
        })
        props.length ? structure.type.push(getJsonContainerDefinition(tName, props)) : null
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
  else if (json.type === 'array' && json.items) {
    let jsonItems = Array.isArray(json.items) ? json.items[0] : json.items
    structure = getJsonDefinition(moduleJson, jsonItems, schemas, jsonItems.title || name, options)
  }
  else if (json.anyOf) {
    //console.log("getJsonDefinition: json.anyOf = ------> name = " + name);
  }
  else if (json.oneOf) {
    //Just ignore schema shape, since this has to be treated as string
  }
  else if (json.allOf) {
    //console.log("json.allOf = ------> name = " + name);
    let union = deepmerge.all([...json.allOf.map(x => x['$ref'] ? getPath(x['$ref'], moduleJson, schemas) || x : x)], options)
    if (json.title) {
      union['title'] = json.title
    }
    else {
      union['title'] = name
    }
    delete union['$ref']

    let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)
    structure = getJsonDefinition(moduleJson, union, schemas, name, prefix, options)
  }

  return structure
}

const getObjectHandleImpl = (varName, jsonDataName) => {

  let containerName = (jsonDataName.includes(wpeJsonNameSpace()) === true) ? `${jsonDataName}` : `${getSdkNameSpace()}::${jsonDataName}`

  let result = `${varName}Handle ${varName}Handle_Create(void)
{
    WPEFramework::Core::ProxyType<${containerName}>* type = new WPEFramework::Core::ProxyType<${containerName}>();
    *type = WPEFramework::Core::ProxyType<${containerName}>::Create();
    return (static_cast<${varName}Handle>(type));
}
void ${varName}Handle_Addref(${varName}Handle handle)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    ASSERT(var->IsValid());
    var->AddRef();
}
void ${varName}Handle_Release(${varName}Handle handle)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerName}>* var = static_cast<WPEFramework::Core::ProxyType<${containerName}>*>(handle);
    var->Release();
    if (var->IsValid() != true) {
        delete var;
    }
}
bool ${varName}Handle_IsValid(${varName}Handle handle)
{
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
  result += `${accessorPropertyType} ${objName}_Get_${subPropertyName}(${objName}Handle handle)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'
  if (json.type === 'object') {
    result += `    WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
    *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
    *(*element) = (*var)->${subPropertyName};
    return (static_cast<${accessorPropertyType}>(element));` + '\n'
  }
  else {
    if ((typeof json.const === 'string') || (json.type === 'string' && !json.enum)) {
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
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if (json.type === 'object') {
      result += `    WPEFramework::Core::ProxyType<${subPropertyType}>* object = static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value);
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

  result += `${accessorPropertyType} ${objName}Array_Get(${objHandleType} handle, uint32_t index)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());` + '\n'

  if ((json.type === 'object') || (json.type === 'array')) {
    result += `WPEFramework::Core::ProxyType<${subPropertyType}>* object = new WPEFramework::Core::ProxyType<${subPropertyType}>();
    *object = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
    *(*object) = ${propertyName}.Get(index);

    return (static_cast<${accessorPropertyType}>(object));` + '\n'
  }
  else {
    if ((typeof json.const === 'string') || (json.type === 'string' && !json.enum)) {
      result += `    return (const_cast<${accessorPropertyType}>(${propertyName}.Get(index).Value().c_str()));` + '\n'
    }
    else {
      result += `    return (static_cast<${accessorPropertyType}>(${propertyName}.Get(index)));` + '\n'
    }
  }
  result += `}` + '\n'

  result += `void ${objName}Array_Add(${objHandleType} handle, ${accessorPropertyType} value)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());` + '\n'

  if ((json.type === 'object') || (json.type === 'array')) {
    result += `    ${subPropertyType}& element = *(*(static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value)));` + '\n'
  }
  else {
    result += `    ${subPropertyType} element(value);` + '\n'
  }
  result += `
    ${propertyName}.Add(element);
}` + '\n'

  result += `void ${objName}Array_Clear(${objHandleType} handle)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${modulePropertyType}>* var = static_cast<WPEFramework::Core::ProxyType<${modulePropertyType}>*>(handle);
    ASSERT(var->IsValid());

    ${propertyName}.Clear();
}` + '\n'

  return result
}

const getMapAccessorsImpl = (objName, moduleName, containerType, subPropertyType, accessorPropertyType, json = {}) => {
  let result = `uint32_t ${objName}_KeysCount(${objName}Handle handle)
{
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
  result += `void ${objName}_AddKey(${objName}Handle handle, char* key, ${accessorPropertyType} value)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
` + '\n'

    if ((json.type === 'object') || (json.type === 'array' && json.items)) {
      result += `    ${subPropertyType}& element = *(*(static_cast<WPEFramework::Core::ProxyType<${subPropertyType}>*>(value)));` + '\n'
    } else {
      result += `    ${subPropertyType} element(value);` + '\n'
    }
    result += `    (*var)->Set(const_cast<const char*>(key), &element);
}` + '\n'

  result += `void ${objName}_RemoveKey(${objName}Handle handle, char* key)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
 
    (*var)->Remove(key);
}` + '\n'

    result += `${accessorPropertyType} ${objName}_FindKey(${objName}Handle handle, char* key)
{
    ASSERT(handle != NULL);
    WPEFramework::Core::ProxyType<${containerType}>* var = static_cast<WPEFramework::Core::ProxyType<${containerType}>*>(handle);
    ASSERT(var->IsValid());
    if ((*var)->HasLabel(key) == true) {`
    if (json.type === 'object') {
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
      result += `
        WPEFramework::Core::ProxyType<${subPropertyType}>* element = new WPEFramework::Core::ProxyType<${subPropertyType}>();
        *element = WPEFramework::Core::ProxyType<${subPropertyType}>::Create();
        *(*element) = (*var)->Get(key).Array();
        return (static_cast<${accessorPropertyType}>(element));` + '\n'
    }
    else {
      if (json.type === 'string' || (typeof json.const === 'string')) {
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
      else if (json.type === 'number') {
        result += `
        return (static_cast<${accessorPropertyType}>((*var)->Get(key).Float()));` + '\n'
      }
      else if (json.type === 'integer') {
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
        return structure

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
      let typeName = getTypeName(getModuleName(moduleJson), name || json.title, prefixName)
      let res = description(capitalize(name || json.title), json.description) + getEnumConversionImpl(typeName, json)
      structure.enums.add(res)

      return structure
    }
    else if (json.type === 'object') {

      if (json.properties && (validJsonObjectProperties(json) === true)) {
        let tName = getTypeName(getModuleName(moduleJson), name, prefixName)
        let t = getObjectHandleImpl(tName, getJsonDataStructName(getModuleName(moduleJson), name, prefixName))
        Object.entries(json.properties).forEach(([pname, prop]) => {
          let desc = '\n' + description(pname, prop.description)
          let schema = ''
          if (prop.type === 'array') {
            let items
            if (Array.isArray(prop.items)) {
              //TODO
              const IsHomogenous = arr => new Set(arr.map( item => item.type ? item.type : typeof item)).size === 1
              if (!IsHomogenous(prop.items)) {
                throw 'Heterogenous Arrays not supported yet'
              }
              items = prop.items[0]
            }
            else {
              // grab the type for the non-array schema
             items = prop.items
            }
            schema = getSchemaType(moduleJson, items, items.name || pname, schemas, prefixName, {level : options.level, descriptions: options.descriptions, title: true})
            if (schema.type && schema.type.length > 0) {
              let type = getArrayElementSchema(json, moduleJson, schemas, schema.name)
              if (type.type === 'string' && type.enum && schema.name && schema.name.length > 0 && (getModuleName(moduleJson) === schema.namespace)) {
                structure.enums.add(description(schema.name, schema.json.description) + getEnumConversionImpl(schema.type, type))
              }

              let moduleName = getModuleName(moduleJson)
              let moduleProperty = getJsonType(moduleJson, json, json.title || name, schemas, prefixName)
              schema.json.namespace = schema.namespace
              let prefix = ((prefixName.length > 0) && items['$ref']) ? '' : prefixName
              let subModuleProperty = getJsonType(moduleJson, schema.json, schema.name, schemas, prefix)
              let def = getArrayAccessorsImpl(tName, moduleName, moduleProperty.type, (tName + 'Handle'), subModuleProperty.type, capitalize(pname || prop.title), schema.type, schema.json)
              t += desc + '\n' + def
            }
            else {
              console.log(`WARNING: Type undetermined for ${name}:${pname}`)
            }
          }
          else {
            schema = getSchemaType(moduleJson, prop, pname, schemas, prefixName, {descriptions: descriptions, level: level + 1, title: true})
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

            prop = ((!prop.type && prop.allOf) ? schema.json : prop)
            if (prop.type === 'object' && prop.properties) {
              let res = getImplForSchema(moduleJson, prop, schemas, (prop.title || pname), prefixName, {descriptions: descriptions, level: level})
              res.type.forEach(t => structure.deps.add(t))
              res.enums.forEach(e => structure.enums.add(e))
            }
            else if (prop.type === 'string' && prop.enum) {
              //Enum
              if (schema.namespace == getModuleName(moduleJson)) {
              let typeName = getTypeName(getModuleName(moduleJson), pname || prop.title, prefixName)
              let res = description((capitalize(name) + "::" + capitalize(pname)), prop.description) + getEnumConversionImpl(typeName, prop)
              structure.enums.add(res)
              }
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
        let type = getSchemaType(moduleJson, json.additionalProperties, name, schemas)
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
          let typeName = getTypeName(getModuleName(moduleJson), name, prefixName)
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

      let prefix = ((prefixName.length > 0) && (name != prefixName)) ? prefixName : capitalize(name)

      delete union['$ref']
      return getImplForSchema(moduleJson, union, schemas, name, prefix, options)

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
  
      let schema = getSchemaType(moduleJson, j, j.name || name, schemas)
      if (schema.type && schema.type.length > 0) {
        let type = getArrayElementSchema(json, moduleJson, schemas, schema.name)
        if (type.type === 'string' && type.enum) {
          let typeName = getTypeName(getModuleName(moduleJson), schema.name, prefixName)
          structure.enums.add(description(schema.name, schema.json.description) + getEnumConversionImpl(typeName, type))
        }
      }
      let arrayName = capitalize(schema.name) + capitalize(schema.json.type)

      let jsonType = getJsonType(moduleJson, j, j.name || name, schemas, prefixName)
      let n = getTypeName(getModuleName(moduleJson), arrayName, prefixName)
      let def = ''
      let modulePropertyName = `WPEFramework::Core::JSON::ArrayType<${jsonType.type}>`

      if (options.level === 0) {
        def += description(arrayName, json.description) + '\n'
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

function getPropertyParams(property, params, module, schemas = {}, indents = '') {
  let impl = `${indents}    JsonObject jsonParameters;\n`
  property.params.forEach(param => {
    impl += `\n`
    const getParamType = paramName => params.find(p => p.name === paramName)
    let nativeType = getParamType(param.name)

    const jsonType = getJsonType(module, param, param.name, schemas)
    if (jsonType.type.length) {
      if (nativeType.required) {
        if (nativeType.type.includes('FireboltTypes_StringHandle')) {
          impl += `${indents}    ${jsonType.type}& ${capitalize(param.name)} = *(static_cast<${jsonType.type}*>(${param.name}));\n`
        }
        else {
          impl += `${indents}    ${jsonType.type} ${capitalize(param.name)} = ${param.name};\n`
        }
        impl += `${indents}    jsonParameters.Set(_T("${param.name}"), &${capitalize(param.name)});\n`
      }
      else {
        impl += `${indents}    if (${nativeType.name} != nullptr) {\n`
        if (nativeType.type.includes('FireboltTypes_StringHandle')) {
          impl += `${indents}        ${jsonType.type}& ${capitalize(param.name)} = *(static_cast<${jsonType.type}*>(${param.name}));\n`
        } else {

          impl += `${indents}        ${jsonType.type} ${capitalize(param.name)} = *(${param.name});\n`
        }
        impl += `${indents}        jsonParameters.Set(_T("${param.name}"), &${capitalize(param.name)});\n`
        impl += `${indents}    }\n`
      }
    }
  })
  return impl
}

function getPropertyGetterImpl(property, module, schemas = {}) {
  let methodName = getModuleName(module).toLowerCase() + '.' + property.name
  let moduleName = capitalize(getModuleName(module))
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let container = getJsonType(module, property.result.schema, property.result.name || property.name, schemas)
  let impl = getCallsMetricsDispatcher(module, property, schemas)

  let structure = getPropertyGetterSignature(property, module, schemas)
  impl += `${description(property.name, property.summary)}\n`
  impl += `${structure.signature}\n{\n`
  impl += `    const string method = _T("${methodName}");` + '\n'

  if (propType.json) {
    impl += `    ${container.type} jsonResult;\n`
  }
  if (structure.params.length > 0) {
    impl += getPropertyParams(property, structure.params, module, schemas)
    impl += `\n    uint32_t status = ${getSdkNameSpace()}::Properties::Get(method, jsonParameters, jsonResult);`
  } else {
    impl += `\n    uint32_t status = ${getSdkNameSpace()}::Properties::Get(method, jsonResult);`
  }

  impl += `\n    if (status == FireboltSDKErrorNone) {\n`
  if (propType.json) {
    impl += `        if (${property.result.name || property.name} != nullptr) {\n`

    if (((propType.json.type === 'string') || (typeof propType.json.const === 'string')) && (propType.type === 'char*')) {
      impl += `            ${container.type}* strResult = new ${container.type}();`
      impl += `            *${property.result.name || property.name} = static_cast<${getFireboltStringType()}>(strResult);` + '\n'
    } else if ((propType.json.type === 'object') || (propType.json.type === 'array')) {
      impl += `            WPEFramework::Core::ProxyType<${container.type}>* resultPtr = new WPEFramework::Core::ProxyType<${container.type}>();\n`
      impl += `            *resultPtr = WPEFramework::Core::ProxyType<${container.type}>::Create();\n`
      impl += `            *(*resultPtr) = jsonResult;\n`
      impl += `            *${property.result.name || property.name} = static_cast<${propType.type}>(resultPtr);\n`
    } else {
      impl += `            *${property.result.name || property.name} = jsonResult.Value();\n`
    }
    impl += `        }\n`
  }
  impl += getCallsMetricsImpl(module, property, schemas)
  impl += '    }' + '\n'
  impl += '    return status;' + '\n'

  impl += `}`

  return impl
}

function getPropertySetterImpl(property, module, schemas = {}) {
  let methodName = getModuleName(module).toLowerCase() + '.' + property.name
  let paramName =  property.result.name || property.name
  let propType = getSchemaType(module, property.result.schema, property.result.name || property.name, schemas, {descriptions: true, level: 0})
  let container = getJsonType(module, property.result.schema, property.result.name || property.name, schemas)

  let impl = getCallsMetricsDispatcher(module, property, schemas)
  let structure = getPropertySetterSignature(property, module, schemas)
  impl += `${description(property.name, property.summary)}\n`
  impl += `${structure.signature}\n{\n`

  impl += `    const string method = _T("${methodName}");` + '\n'

  if (structure.params.length > 0) {
    impl += getPropertyParams(property, structure.params, module, schemas)
  }

  if (propType.json) {
    if (propType.json.type === 'object') {
      if (structure.params.length > 0) {
      impl += `\n    ${container.type}& containerParam = *(*(static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(${paramName})));`
     impl += `\n    jsonParameters.Set(_T("${paramName}"), &containerParam);`
      }
      else {
      impl += `    ${container.type}& jsonParameters = *(*(static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(${paramName})));`
      }
    }
    else {
      //ToDo Map?
      if ((propType.json.type === 'array') && (propType.json.items))  {
        impl += `    WPEFramework::Core::JSON::ArrayType<${container.type}> param = *(*(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::ArrayType<${container.type}>>*>(${paramName})));`
      } else {
        impl += `    ${container.type} param(${paramName});`
      }
      impl += `\n    jsonParameters.Set(_T("${paramName}"), &param);`
    }
  }

  impl += `\n\n    uint32_t status = ${getSdkNameSpace()}::Properties::Set(method, jsonParameters);`
  impl += `\n    if (status == FireboltSDKErrorNone) { \n
        FIREBOLT_LOG_INFO(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "${methodName} is successfully set");\n`
  impl += getCallsMetricsImpl(module, property, schemas)
  impl += `    }

    return status;
}`

  return impl
}

function getPropertyEventCallbackImpl(property, module, schemas) {
  return getEventCallbackImplInternal( property, module, schemas, true)
}

function getPropertyEventImpl(property, module, schemas) {
  return getEventImplInternal(property, module, schemas, true)
}

function getEventCallbackImpl(event, module, schemas) {
  return getEventCallbackImplInternal(event, module, schemas, false)
}

function getEventImpl(event, module, schemas) {
  return getEventImplInternal(event, module, schemas, false)
}

function getEventCallbackImplInternal(event, module, schemas, property) {
  let methodName = capitalize(getModuleName(module)) + capitalize(event.name)
  let propType = getSchemaType(module, event.result.schema, event.result.name || event.name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let container = getJsonType(module, event.result.schema, event.result.name || event.name, schemas)
    let paramType = (propType.type === 'char*') ? getFireboltStringType() : propType.type

    impl += `static void ${methodName}InnerCallback(const void* userCB, const void* userData, void* response)
{` + '\n'

    let structure = getParamsDetails(event, module, schemas)

    if (structure.params.length > 0) {
      structure.params.map(p => {
        if (p.required !== undefined) {
          impl += `    ${p.type} ${p.name};\n`
          if ((p.type !== getFireboltStringType()) && (p.required === false)) {
            impl += `    ${p.type}* ${p.name}Ptr = nullptr;\n`
          }
        }
      })
      impl += `    WPEFramework::Core::ProxyType<${container.type}>* jsonResponse;\n`
      impl += `    WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::VariantContainer>& var = *(static_cast<WPEFramework::Core::ProxyType<WPEFramework::Core::JSON::VariantContainer>*>(response));

    ASSERT(var.IsValid() == true);
    if (var.IsValid() == true) {
        WPEFramework::Core::JSON::VariantContainer::Iterator elements = var->Variants();

        while (elements.Next()) {
            if (strcmp(elements.Label(), "value") == 0) {
                jsonResponse = new WPEFramework::Core::ProxyType<${container.type}>();
                string objectStr;
                elements.Current().Object().ToString(objectStr);
                (*jsonResponse)->FromString(objectStr);
            } else if (strcmp(elements.Label(), "context") == 0) {
                WPEFramework::Core::JSON::VariantContainer::Iterator params = elements.Current().Object().Variants();
                while (params.Next()) {\n`
      let contextParams = ''
      structure.params.map(p => {
        if (p.required !== undefined) {
          if (contextParams.length > 0) {
            contextParams += `                    else if (strcmp(elements.Label(), "${p.name}") == 0) {\n`
          }
          else {
            contextParams += `                    if (strcmp(elements.Label(), "${p.name}") == 0) {\n`
          }
          if (p.type === getFireboltStringType()) {
            contextParams += `                        ${getSdkNameSpace()}::JSON::String* ${p.name}Value = new ${getSdkNameSpace()}::JSON::String();
                          *${p.name}Value = elements.Current().Value().c_str();
                          ${p.name} = ${p.name}Value;\n`
          }
          else if (p.type === 'bool') {
            contextParams += `                        ${p.name} = elements.Current().Boolean();\n`
          }
          else if ((p.type === 'float') || (p.type === 'int32_t')) {
            contextParams += `                        ${p.name} = elements.Current().Number();\n`
          }
          else {
              console.log(`WARNING: wrongt type defined for ${p.name}`)
          }
          if ((p.type !== getFireboltStringType()) && (p.required === false)) {
            contextParams += `                        ${p.name}Ptr = &${p.name};\n`
          }
          contextParams += `                    }\n`
        }
      })
      impl += contextParams
      impl += `                }
            } else {
               ASSERT(false);
            }
        }
    }`
    } else {

      impl +=`    WPEFramework::Core::ProxyType<${container.type}>* jsonResponse = static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(response);`
    }
    if (propType.json) {
      impl +=`

    ASSERT(jsonResponse->IsValid() == true);
    if (jsonResponse->IsValid() == true) {` + '\n'
    
      if ((typeof propType.json.const === 'string') || ((propType.json.type === 'string') && (!propType.json.enum))) {
         impl +=`        ${container.type}* jsonStrResponse = new ${container.type}();
        *jsonStrResponse = *(*jsonResponse);
        jsonResponse->Release();` + '\n\n'
      }

      let CallbackName = ''
      if (property == true) {
        CallbackName = `On${methodName}Changed`
      } else {
        CallbackName = `${methodName}Callback`
      }

      impl +=`        ${CallbackName} callback = reinterpret_cast<${CallbackName}>(userCB);` + '\n'
      impl += `        callback(userData, `
      if (structure.params.length > 0) {
        structure.params.map(p => {
          if (p.required !== undefined) {
            if (p.type === getFireboltStringType()) {
              impl += `static_cast<${p.type}>(${p.name}), `
            }
            else if (p.required === true) {
              impl += `${p.name}, `
            }
            else if (p.required === false) {
              impl += `${p.name}Ptr, `
            }
          }
        })
      }
      if ((propType.json.type === 'object') || (propType.json.type === 'array')) {
        impl += `static_cast<${paramType}>(jsonResponse));` + '\n'
      }
      else if ((typeof propType.json.const === 'string') || ((propType.json.type === 'string') && (!propType.json.enum))) {
        impl += `static_cast<${paramType}>(jsonStrResponse));` + '\n'
      }
      else {
        impl += `static_cast<${paramType}>((*jsonResponse)->Value()));` + '\n'
      }
    }
    impl += `    }
}`
  }
  return impl;
}

function getEventImplInternal(event, module, schemas, property, prefix = '') {
  let eventName = getModuleName(module).toLowerCase() + '.' + event.name
  let moduleName = capitalize(getModuleName(module))
  let methodName = moduleName + capitalize(event.name)
  let propType = getSchemaType(module, event.result.schema, event.result.name || event.name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let container = getJsonType(module, event.result.schema, event.result.name || event.name, schemas)
    let ClassName = ''
    let CallbackName = ''
    let structure = {}
    if (property) {
      ClassName = "Properties::"
      CallbackName = `On${methodName}Changed`
      structure = getPropertyEventSignature(event, module, schemas)
    } else {
      ClassName = "Event::Instance()."
      CallbackName = `${methodName}Callback`
      structure = getEventSignature(event, module, schemas)
    }

    impl += `${description(event.name, 'Listen to updates')}\n`
    impl += `${structure.registersig}\n{\n`
    impl += `    const string eventName = _T("${eventName}");\n`
    impl += `    uint32_t status = FireboltSDKErrorNone;\n`
    impl += `    if (userCB != nullptr) {\n`
    if (structure.params.length > 0) {
      impl += getPropertyParams(event, structure.params, module, schemas, '    ')
    }
    else {
      impl += `        JsonObject jsonParameters;\n`
    }
    impl += `\n`
    impl += `        status = ${getSdkNameSpace()}::${ClassName}Subscribe<${container.type}>(eventName, jsonParameters, ${methodName}InnerCallback, reinterpret_cast<const void*>(userCB), userData);`
    impl += `\n    }
    return status;
}
${structure.unregistersig}
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

function getImplForEventContextParams(result, module, name, schemas, prefixName = '') {
  let impl = {type: [], deps: new Set(), enums: new Set(), jsonData: new Set()}

  if (result.schema) {
    let resJson = result.schema
    if ((resJson['$ref'] === undefined) || (resJson['$ref'][0] !== '#')) {
      let res = {}
      res = getImplForSchema(module, resJson, schemas, result.name || name, prefixName)
      res.type.forEach(type => (impl.type.includes(type) === false) ?  impl.type.push(type) : null)
      res.deps.forEach(dep => impl.deps.add(dep))
      res.enums.forEach(e => impl.enums.add(e))
    }
    //Get the JsonData definition for the schema
    let jType = getJsonDefinition(module, resJson, schemas, result.name || name, prefixName)
    jType.deps.forEach(j => impl.jsonData.add(j))
    jType.type.forEach(t => impl.jsonData.add(t))
  }
  return impl
}
function getMethodImplResult(method, resultJsonType, result) {
  let impl = ''
  if (result.length) {
    if (IsResultBooleanSuccess(method) === true) {
      impl += `            status = (jsonResult.Value() == true) ? FireboltSDKErrorNone : FireboltSDKErrorNotSupported;\n`
      impl += `            FIREBOLT_LOG_INFO(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "${method.name} return status = %d", status);\n`
    }
    else {
      impl += `            if (${method.result.name} != nullptr) {\n`
      if (result.includes('FireboltTypes_StringHandle')) {
        impl += `                ${resultJsonType.type}* resultPtr = new ${resultJsonType.type}(jsonResult);\n`
        impl += `                *${method.result.name} = static_cast<${result}>(resultPtr);\n`
      }
      else {
        if (result.includes('Handle')) {
          impl += `                WPEFramework::Core::ProxyType<${resultJsonType.type}>* resultPtr = new WPEFramework::Core::ProxyType<${resultJsonType.type}>(jsonResult);\n`
          impl += `                *${method.result.name} = static_cast<${result}>(resultPtr);\n`
        }
         else {
         impl += `                *${method.result.name} = jsonResult.Value();\n`
        }
      }
      impl += `            }\n`
    }
  }
  return impl
}

function getMethodImpl(method, module, schemas) {
  let methodName = getModuleName(module).toLowerCase() + '.' + method.name
  let structure = getMethodSignature(method, module, schemas)
  let impl = ''

  if (structure.signature) {

    impl += getCallsMetricsDispatcher(module, method, schemas)
    impl += `${structure.signature}\n{\n`

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
            impl += `        jsonParameters.Set(_T("${param.name}"), &${capitalize(param.name)});\n\n`
          }
        })

        let resultJsonType = ''
        if (structure.result.length > 0) {
          resultJsonType = getJsonType(module, method.result.schema, method.result.name, schemas, method.name)

          impl += `        ${resultJsonType.type} jsonResult;\n`
        }
        else {
          impl += `        JsonObject jsonResult;\n`
        }

        impl += `        status = transport->Invoke("${methodName}", jsonParameters, jsonResult);\n`

        impl += `        if (status == FireboltSDKErrorNone) {\n
            FIREBOLT_LOG_INFO(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "${methodName} is successfully invoked");\n`
        impl += getMethodImplResult(method, resultJsonType, structure.result) + '\n'
        impl += getCallsMetricsImpl(module, method, schemas)
        impl += '        }\n'

      impl += `    } else {
        FIREBOLT_LOG_ERROR(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "Error in getting Transport err = %d", status);
    }

    return status;
}`
  }
  return impl
}

function getImplForPolymorphicMethodParamInternal(method, module, impl, federatedType, schemas, prefixName = '') {

  let name = capitalize(method.name + federatedType)
  let schema = getPolymorphicSchema(method, module, name, schemas)
  if (schema['$ref']) {
    let res = {}
    res = getImplForSchema(module, schema, schemas, name, prefixName)
    res.deps.forEach(dep => impl.deps.add(dep))
    res.enums.forEach(e => impl.enums.add(e))
    //Get the JsonData definition for the schema
    const json = getPath(schema['$ref'], module, schemas)
    let jType = getJsonDefinition(module, json, schemas, name, prefixName)
    jType.deps.forEach(j => impl.jsonData.add(j))
    jType.type.forEach(t => impl.jsonData.add(t))
  }
}

function getImplForPolymorphicMethodParam(method, module, schemas, prefixName = '') {
  let impl = {type: [], deps: new Set(), enums: new Set(), jsonData: new Set()}
  getImplForPolymorphicMethodParamInternal(method, module, impl, 'FederatedResponse', schemas)
  getImplForPolymorphicMethodParamInternal(method, module, impl, 'FederatedRequest', schemas)
  return impl
}

function getPolymorphicMethodImpl(method, module, schemas) {
  let methodName = getModuleName(module).toLowerCase() + '.' + method.name
  let structure = getPolymorphicMethodSignature(method, module, schemas)
  let impl = ''

  if (structure.signature) {
    impl += getCallsMetricsDispatcher(module, method, schemas)

    const jsonType = getJsonType(module, structure.json, structure.param.name, schemas)
    impl += `${structure.signature}\n{\n`
    impl += `    uint32_t status = FireboltSDKErrorUnavailable;
    ${getSdkNameSpace()}::Transport<WPEFramework::Core::JSON::IElement>* transport = ${getSdkNameSpace()}::Accessor::Instance().GetTransport();
    if (transport != nullptr) {
        ${jsonType.type} jsonParameters = *(*(static_cast<WPEFramework::Core::ProxyType<${jsonType.type}>*>(${structure.param.name})));
        WPEFramework::Core::JSON::Boolean jsonResult;
        status = transport->Invoke("${methodName}", jsonParameters, jsonResult);
        if (status == FireboltSDKErrorNone) {
            FIREBOLT_LOG_INFO(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "${methodName} is successfully pushed with status as %d", jsonResult.Value());\n`
    impl += getCallsMetricsImpl(module, method, schemas)
    if (IsResultBooleanSuccess(method) === true) {
      impl += `            status = (jsonResult.Value() == true) ? FireboltSDKErrorNone : FireboltSDKErrorNotSupported;\n`
    }

    impl += `        }
    } else {
        FIREBOLT_LOG_ERROR(${getSdkNameSpace()}::Logger::Category::OpenRPC, ${getSdkNameSpace()}::Logger::Module<${getSdkNameSpace()}::Accessor>(), "Error in getting Transport err = %d", status);
    }

    return status;
}`
  }
  return impl
}

function getPolymorphicEventImpl(method, module, schemas) {
  let name = capitalize(method.name + 'FederatedRequest')
  let schema = getPolymorphicSchema(method, module, name, schemas)
  let propType = getSchemaType(module, schema, name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let eventName = getModuleName(module).toLowerCase() + '.' + method.name
    let moduleName = capitalize(getModuleName(module))
    let methodName = moduleName + capitalize(method.name)
    let container = getJsonType(module, schema, name, schemas)

    impl += `${description(method.name, 'Listen to pull request')}\n` + `uint32_t ${moduleName}_Register_${capitalize(method.name)}Pull(OnPull${methodName}Callback userCB, const void* userData)
{
    const string eventName = _T("${eventName}");
    uint32_t status = FireboltSDKErrorNone;
    if (userCB != nullptr) {` + '\n'
      impl += `        status = ${getSdkNameSpace()}::Event::Instance().Subscribe<${container.type}>(eventName, ${methodName}InnerCallback, reinterpret_cast<const void*>(userCB), userData);
    }
    return status;
}
uint32_t ${moduleName}_Unregister_${capitalize(method.name)}Pull(OnPull${methodName}Callback userCB)
{
    return ${getSdkNameSpace()}::Event::Instance().Unsubscribe(_T("${eventName}"), reinterpret_cast<const void*>(userCB));
}`
  }
  return impl
}

function getPolymorphicEventCallbackImpl(method, module, schemas) {
  let name = capitalize(method.name + 'FederatedRequest')
  let schema = getPolymorphicSchema(method, module, name, schemas)
  let propType = getSchemaType(module, schema, name, schemas, {descriptions: true, level: 0})

  let impl = ''
  if (propType.type && (propType.type.length > 0)) {
    let methodName = capitalize(getModuleName(module)) + capitalize(method.name)
    let container = getJsonType(module, schema, name, schemas)

    impl += `static void ${methodName}InnerCallback(const void* userCB, const void* userData, void* response)
{` + '\n'

    impl +=`    WPEFramework::Core::ProxyType<${container.type}>& jsonResponse = *(static_cast<WPEFramework::Core::ProxyType<${container.type}>*>(response));`

    if (propType.json) {
      impl +=`

    ASSERT(jsonResponse.IsValid() == true);
    if (jsonResponse.IsValid() == true) {` + '\n'

      impl +=`        OnPull${methodName}Callback callback = reinterpret_cast<OnPull${methodName}Callback>(userCB);` + '\n'
      impl +=`       callback(userData, static_cast<${propType.type}>(response));` + '\n'
    }
    impl += `    }
}`
  }
  return impl;
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
    getMethodImpl,
    getImplForPolymorphicMethodParam,
    getPolymorphicMethodImpl,
    getPolymorphicEventImpl,
    getPolymorphicEventCallbackImpl,
    getImplForEventContextParams
}
