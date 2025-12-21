/**
 * Normalizer - Converts OpenAPI 2.x/3.x to common internal format
 */

import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type {
  NormalizedAPI,
  NormalizedEndpoint,
  HttpMethod,
  Parameter,
  RequestBody,
  Response,
  Schema,
  SecurityScheme,
  Server,
  Components,
  MediaType,
  APIInfo,
} from '../types/index.js';
import { type ParseResult, isOpenAPI2, isOpenAPI3 } from './openapi.js';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Normalize an OpenAPI document to common format
 */
export function normalizeOpenAPI(parseResult: ParseResult): NormalizedAPI {
  const { document } = parseResult;

  if (isOpenAPI2(document)) {
    return normalizeOpenAPI2(document);
  }

  if (isOpenAPI3(document)) {
    return normalizeOpenAPI3(document);
  }

  throw new Error('Unsupported OpenAPI version');
}

/**
 * Normalize OpenAPI 2.x (Swagger) document
 */
function normalizeOpenAPI2(doc: OpenAPIV2.Document): NormalizedAPI {
  const info = normalizeInfo2(doc.info);
  const servers = normalizeServers2(doc);
  const securitySchemes = normalizeSecuritySchemes2(doc.securityDefinitions || {});
  const endpoints = normalizeEndpoints2(doc);
  const components = normalizeComponents2(doc);

  return {
    info,
    servers,
    endpoints,
    securitySchemes,
    components,
    raw: doc,
    openApiVersion: doc.swagger,
    externalDocs: doc.externalDocs,
    extensions: extractExtensions(doc as unknown as Record<string, unknown>),
  };
}

/**
 * Normalize OpenAPI 3.x document
 */
function normalizeOpenAPI3(doc: OpenAPIV3.Document | OpenAPIV3_1.Document): NormalizedAPI {
  const info = normalizeInfo3(doc.info);
  const servers = normalizeServers3(doc.servers || []);
  const securitySchemes = normalizeSecuritySchemes3(
    doc.components?.securitySchemes || {}
  );
  const endpoints = normalizeEndpoints3(doc);
  const components = normalizeComponents3((doc.components || {}) as OpenAPIV3.ComponentsObject);

  return {
    info,
    servers,
    endpoints,
    securitySchemes,
    components,
    raw: doc,
    openApiVersion: doc.openapi,
    externalDocs: doc.externalDocs,
    extensions: extractExtensions(doc as unknown as Record<string, unknown>),
    webhooks: 'webhooks' in doc ? (doc.webhooks as Record<string, unknown>) : undefined,
  };
}

// ============================================
// Info Normalization
// ============================================

function normalizeInfo2(info: OpenAPIV2.InfoObject): APIInfo {
  return {
    title: info.title,
    version: info.version,
    description: info.description,
    contact: info.contact,
    license: info.license,
    termsOfService: info.termsOfService,
  };
}

function normalizeInfo3(info: OpenAPIV3.InfoObject | OpenAPIV3_1.InfoObject): APIInfo {
  return {
    title: info.title,
    version: info.version,
    description: info.description,
    contact: info.contact,
    license: info.license ? { name: info.license.name, url: info.license.url } : undefined,
    termsOfService: info.termsOfService,
  };
}

// ============================================
// Server Normalization
// ============================================

function normalizeServers2(doc: OpenAPIV2.Document): Server[] {
  const schemes = doc.schemes || ['https'];
  const host = doc.host || 'localhost';
  const basePath = doc.basePath || '/';

  return schemes.map((scheme) => ({
    url: `${scheme}://${host}${basePath}`,
    description: `${scheme.toUpperCase()} server`,
  }));
}

function normalizeServers3(servers: OpenAPIV3.ServerObject[]): Server[] {
  if (servers.length === 0) {
    return [{ url: '/', description: 'Default server' }];
  }

  return servers.map((server) => ({
    url: server.url,
    description: server.description,
    variables: server.variables
      ? Object.fromEntries(
          Object.entries(server.variables).map(([key, value]) => [
            key,
            {
              default: value.default,
              description: value.description,
              enum: value.enum,
            },
          ])
        )
      : undefined,
  }));
}

// ============================================
// Endpoint Normalization
// ============================================

function normalizeEndpoints2(doc: OpenAPIV2.Document): NormalizedEndpoint[] {
  const endpoints: NormalizedEndpoint[] = [];
  const paths = doc.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase() as keyof OpenAPIV2.PathItemObject] as
        | OpenAPIV2.OperationObject
        | undefined;
      if (!operation) continue;

      // Merge path-level and operation-level parameters
      const pathParams = (pathItem.parameters || []) as OpenAPIV2.ParameterObject[];
      const opParams = (operation.parameters || []) as OpenAPIV2.ParameterObject[];
      const allParams = [...pathParams, ...opParams];

      // Separate body parameter from others
      const bodyParam = allParams.find((p) => p.in === 'body') as
        | OpenAPIV2.InBodyParameterObject
        | undefined;
      const otherParams = allParams.filter((p) => p.in !== 'body');

      endpoints.push({
        path,
        method,
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
        deprecated: operation.deprecated,
        parameters: otherParams.map(normalizeParameter2),
        requestBody: bodyParam ? normalizeRequestBody2(bodyParam) : undefined,
        responses: normalizeResponses2(operation.responses || {}),
        security: operation.security,
        extensions: extractExtensions(operation),
      });
    }
  }

  return endpoints;
}

function normalizeEndpoints3(
  doc: OpenAPIV3.Document | OpenAPIV3_1.Document
): NormalizedEndpoint[] {
  const endpoints: NormalizedEndpoint[] = [];
  const paths = doc.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase() as keyof OpenAPIV3.PathItemObject] as
        | OpenAPIV3.OperationObject
        | undefined;
      if (!operation) continue;

      // Merge path-level and operation-level parameters
      const pathParams = (pathItem.parameters || []) as OpenAPIV3.ParameterObject[];
      const opParams = (operation.parameters || []) as OpenAPIV3.ParameterObject[];
      const allParams = [...pathParams, ...opParams];

      endpoints.push({
        path,
        method,
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
        deprecated: operation.deprecated,
        parameters: allParams.map(normalizeParameter3),
        requestBody: operation.requestBody
          ? normalizeRequestBody3(operation.requestBody as OpenAPIV3.RequestBodyObject)
          : undefined,
        responses: normalizeResponses3(operation.responses || {}),
        security: operation.security,
        extensions: extractExtensions(operation),
      });
    }
  }

  return endpoints;
}

// ============================================
// Parameter Normalization
// ============================================

function normalizeParameter2(param: OpenAPIV2.ParameterObject): Parameter {
  const generalParam = param as OpenAPIV2.GeneralParameterObject;
  return {
    name: param.name,
    in: param.in as Parameter['in'],
    description: param.description,
    required: param.required,
    deprecated: undefined, // OpenAPI 2.x doesn't support deprecated parameters
    schema: generalParam.type
      ? {
          type: generalParam.type,
          format: generalParam.format,
          enum: generalParam.enum,
          default: generalParam.default,
          minimum: generalParam.minimum,
          maximum: generalParam.maximum,
          minLength: generalParam.minLength,
          maxLength: generalParam.maxLength,
          pattern: generalParam.pattern,
          items: generalParam.items as Schema | undefined,
        }
      : undefined,
    example: undefined,
  };
}

function normalizeParameter3(param: OpenAPIV3.ParameterObject): Parameter {
  return {
    name: param.name,
    in: param.in as Parameter['in'],
    description: param.description,
    required: param.required,
    deprecated: param.deprecated,
    schema: param.schema ? normalizeSchema3(param.schema as OpenAPIV3.SchemaObject) : undefined,
    example: param.example,
    examples: param.examples as Parameter['examples'],
  };
}

// ============================================
// Request Body Normalization
// ============================================

function normalizeRequestBody2(param: OpenAPIV2.InBodyParameterObject): RequestBody {
  const schema = param.schema as OpenAPIV2.SchemaObject | undefined;
  return {
    description: param.description,
    required: param.required,
    content: {
      'application/json': {
        schema: schema ? normalizeSchema2(schema) : undefined,
      },
    },
  };
}

function normalizeRequestBody3(body: OpenAPIV3.RequestBodyObject): RequestBody {
  const content: Record<string, MediaType> = {};

  for (const [mediaType, mediaTypeObj] of Object.entries(body.content || {})) {
    content[mediaType] = {
      schema: mediaTypeObj.schema
        ? normalizeSchema3(mediaTypeObj.schema as OpenAPIV3.SchemaObject)
        : undefined,
      example: mediaTypeObj.example,
      examples: mediaTypeObj.examples as MediaType['examples'],
    };
  }

  return {
    description: body.description,
    required: body.required,
    content,
  };
}

// ============================================
// Response Normalization
// ============================================

function normalizeResponses2(
  responses: OpenAPIV2.ResponsesObject
): Record<string, Response> {
  const normalized: Record<string, Response> = {};

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response) continue;
    const resp = response as OpenAPIV2.ResponseObject;

    normalized[statusCode] = {
      description: resp.description || '',
      headers: resp.headers
        ? Object.fromEntries(
            Object.entries(resp.headers).map(([name, header]) => [
              name,
              {
                description: header.description,
                schema: { type: header.type, format: header.format },
              },
            ])
          )
        : undefined,
      content: resp.schema
        ? {
            'application/json': {
              schema: normalizeSchema2(resp.schema as OpenAPIV2.SchemaObject),
              example: resp.examples?.['application/json'],
            },
          }
        : undefined,
    };
  }

  return normalized;
}

function normalizeResponses3(
  responses: OpenAPIV3.ResponsesObject
): Record<string, Response> {
  const normalized: Record<string, Response> = {};

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response) continue;
    const resp = response as OpenAPIV3.ResponseObject;

    const content: Record<string, MediaType> = {};
    if (resp.content) {
      for (const [mediaType, mediaTypeObj] of Object.entries(resp.content)) {
        content[mediaType] = {
          schema: mediaTypeObj.schema
            ? normalizeSchema3(mediaTypeObj.schema as OpenAPIV3.SchemaObject)
            : undefined,
          example: mediaTypeObj.example,
          examples: mediaTypeObj.examples as MediaType['examples'],
        };
      }
    }

    normalized[statusCode] = {
      description: resp.description,
      headers: resp.headers
        ? Object.fromEntries(
            Object.entries(resp.headers).map(([name, header]) => {
              const h = header as OpenAPIV3.HeaderObject;
              return [
                name,
                {
                  description: h.description,
                  required: h.required,
                  schema: h.schema
                    ? normalizeSchema3(h.schema as OpenAPIV3.SchemaObject)
                    : undefined,
                },
              ];
            })
          )
        : undefined,
      content: Object.keys(content).length > 0 ? content : undefined,
    };
  }

  return normalized;
}

// ============================================
// Schema Normalization
// ============================================

function normalizeSchema2(schema: OpenAPIV2.SchemaObject): Schema {
  return {
    type: Array.isArray(schema.type) ? schema.type[0] : schema.type,
    format: schema.format,
    description: schema.description,
    default: schema.default,
    enum: schema.enum,
    minimum: schema.minimum,
    maximum: schema.maximum,
    exclusiveMinimum: schema.exclusiveMinimum ? schema.minimum : undefined,
    exclusiveMaximum: schema.exclusiveMaximum ? schema.maximum : undefined,
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    pattern: schema.pattern,
    items: schema.items ? normalizeSchema2(schema.items as OpenAPIV2.SchemaObject) : undefined,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
    uniqueItems: schema.uniqueItems,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [
            key,
            normalizeSchema2(value as OpenAPIV2.SchemaObject),
          ])
        )
      : undefined,
    required: schema.required,
    additionalProperties:
      typeof schema.additionalProperties === 'boolean'
        ? schema.additionalProperties
        : schema.additionalProperties
          ? normalizeSchema2(schema.additionalProperties as OpenAPIV2.SchemaObject)
          : undefined,
    allOf: schema.allOf?.map((s) => normalizeSchema2(s as OpenAPIV2.SchemaObject)),
    $ref: schema.$ref,
    example: schema.example,
    readOnly: schema.readOnly,
  };
}

function normalizeSchema3(schema: OpenAPIV3.SchemaObject): Schema {
  return {
    type: schema.type as string | undefined,
    format: schema.format,
    description: schema.description,
    default: schema.default,
    enum: schema.enum,
    minimum: schema.minimum,
    maximum: schema.maximum,
    exclusiveMinimum: schema.exclusiveMinimum as number | undefined,
    exclusiveMaximum: schema.exclusiveMaximum as number | undefined,
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    pattern: schema.pattern,
    items: 'items' in schema && schema.items ? normalizeSchema3(schema.items as OpenAPIV3.SchemaObject) : undefined,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
    uniqueItems: schema.uniqueItems,
    properties: schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [
            key,
            normalizeSchema3(value as OpenAPIV3.SchemaObject),
          ])
        )
      : undefined,
    required: schema.required,
    additionalProperties:
      typeof schema.additionalProperties === 'boolean'
        ? schema.additionalProperties
        : schema.additionalProperties
          ? normalizeSchema3(schema.additionalProperties as OpenAPIV3.SchemaObject)
          : undefined,
    allOf: schema.allOf?.map((s) => normalizeSchema3(s as OpenAPIV3.SchemaObject)),
    oneOf: schema.oneOf?.map((s) => normalizeSchema3(s as OpenAPIV3.SchemaObject)),
    anyOf: schema.anyOf?.map((s) => normalizeSchema3(s as OpenAPIV3.SchemaObject)),
    not: schema.not ? normalizeSchema3(schema.not as OpenAPIV3.SchemaObject) : undefined,
    nullable: schema.nullable,
    example: schema.example,
    deprecated: schema.deprecated,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
  };
}

// ============================================
// Security Scheme Normalization
// ============================================

function normalizeSecuritySchemes2(
  schemes: Record<string, OpenAPIV2.SecuritySchemeObject>
): Record<string, SecurityScheme> {
  const normalized: Record<string, SecurityScheme> = {};

  for (const [name, scheme] of Object.entries(schemes)) {
    if (scheme.type === 'basic') {
      normalized[name] = {
        type: 'http',
        scheme: 'basic',
        description: scheme.description,
      };
    } else if (scheme.type === 'apiKey') {
      normalized[name] = {
        type: 'apiKey',
        name: scheme.name,
        in: scheme.in as 'query' | 'header',
        description: scheme.description,
      };
    } else if (scheme.type === 'oauth2') {
      normalized[name] = {
        type: 'oauth2',
        description: scheme.description,
        flows: {
          implicit: scheme.flow === 'implicit' ? {
            authorizationUrl: scheme.authorizationUrl,
            scopes: scheme.scopes || {},
          } : undefined,
          password: scheme.flow === 'password' ? {
            tokenUrl: scheme.tokenUrl,
            scopes: scheme.scopes || {},
          } : undefined,
          clientCredentials: scheme.flow === 'application' ? {
            tokenUrl: scheme.tokenUrl,
            scopes: scheme.scopes || {},
          } : undefined,
          authorizationCode: scheme.flow === 'accessCode' ? {
            authorizationUrl: scheme.authorizationUrl,
            tokenUrl: scheme.tokenUrl,
            scopes: scheme.scopes || {},
          } : undefined,
        },
      };
    }
  }

  return normalized;
}

function normalizeSecuritySchemes3(
  schemes: Record<string, OpenAPIV3.SecuritySchemeObject | OpenAPIV3.ReferenceObject>
): Record<string, SecurityScheme> {
  const normalized: Record<string, SecurityScheme> = {};

  for (const [name, scheme] of Object.entries(schemes)) {
    if ('$ref' in scheme) continue; // Skip references for now

    normalized[name] = {
      type: scheme.type as SecurityScheme['type'],
      description: scheme.description,
      name: 'name' in scheme ? scheme.name : undefined,
      in: 'in' in scheme ? (scheme.in as SecurityScheme['in']) : undefined,
      scheme: 'scheme' in scheme ? scheme.scheme : undefined,
      bearerFormat: 'bearerFormat' in scheme ? scheme.bearerFormat : undefined,
      flows: 'flows' in scheme ? normalizeOAuthFlows3(scheme.flows) : undefined,
      openIdConnectUrl: 'openIdConnectUrl' in scheme ? scheme.openIdConnectUrl : undefined,
    };
  }

  return normalized;
}

function normalizeOAuthFlows3(flows: OpenAPIV3.OAuth2SecurityScheme['flows']): SecurityScheme['flows'] {
  if (!flows) return undefined;

  return {
    implicit: flows.implicit ? {
      authorizationUrl: flows.implicit.authorizationUrl,
      refreshUrl: flows.implicit.refreshUrl,
      scopes: flows.implicit.scopes,
    } : undefined,
    password: flows.password ? {
      tokenUrl: flows.password.tokenUrl,
      refreshUrl: flows.password.refreshUrl,
      scopes: flows.password.scopes,
    } : undefined,
    clientCredentials: flows.clientCredentials ? {
      tokenUrl: flows.clientCredentials.tokenUrl,
      refreshUrl: flows.clientCredentials.refreshUrl,
      scopes: flows.clientCredentials.scopes,
    } : undefined,
    authorizationCode: flows.authorizationCode ? {
      authorizationUrl: flows.authorizationCode.authorizationUrl,
      tokenUrl: flows.authorizationCode.tokenUrl,
      refreshUrl: flows.authorizationCode.refreshUrl,
      scopes: flows.authorizationCode.scopes,
    } : undefined,
  };
}

// ============================================
// Components Normalization
// ============================================

function normalizeComponents2(doc: OpenAPIV2.Document): Components {
  return {
    schemas: doc.definitions
      ? Object.fromEntries(
          Object.entries(doc.definitions).map(([key, value]) => [
            key,
            normalizeSchema2(value as OpenAPIV2.SchemaObject),
          ])
        )
      : undefined,
    parameters: doc.parameters
      ? Object.fromEntries(
          Object.entries(doc.parameters).map(([key, value]) => [
            key,
            normalizeParameter2(value as OpenAPIV2.ParameterObject),
          ])
        )
      : undefined,
    responses: doc.responses
      ? Object.fromEntries(
          Object.entries(doc.responses).map(([key, value]) => [
            key,
            {
              description: (value as OpenAPIV2.ResponseObject).description || '',
            },
          ])
        )
      : undefined,
    securitySchemes: doc.securityDefinitions
      ? normalizeSecuritySchemes2(doc.securityDefinitions)
      : undefined,
  };
}

function normalizeComponents3(components: OpenAPIV3.ComponentsObject): Components {
  return {
    schemas: components.schemas
      ? Object.fromEntries(
          Object.entries(components.schemas)
            .filter(([, value]) => !('$ref' in value))
            .map(([key, value]) => [key, normalizeSchema3(value as OpenAPIV3.SchemaObject)])
        )
      : undefined,
    parameters: components.parameters
      ? Object.fromEntries(
          Object.entries(components.parameters)
            .filter(([, value]) => !('$ref' in value))
            .map(([key, value]) => [key, normalizeParameter3(value as OpenAPIV3.ParameterObject)])
        )
      : undefined,
    responses: components.responses
      ? Object.fromEntries(
          Object.entries(components.responses)
            .filter(([, value]) => !('$ref' in value))
            .map(([key, value]) => {
              const resp = value as OpenAPIV3.ResponseObject;
              return [key, { description: resp.description }];
            })
        )
      : undefined,
    examples: components.examples
      ? Object.fromEntries(
          Object.entries(components.examples)
            .filter(([, value]) => !('$ref' in value))
            .map(([key, value]) => {
              const ex = value as OpenAPIV3.ExampleObject;
              return [key, { summary: ex.summary, description: ex.description, value: ex.value }];
            })
        )
      : undefined,
    securitySchemes: components.securitySchemes
      ? normalizeSecuritySchemes3(components.securitySchemes)
      : undefined,
  };
}

// ============================================
// Utility Functions
// ============================================

function extractExtensions(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const extensions: Record<string, unknown> = {};
  let hasExtensions = false;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('x-')) {
      extensions[key] = value;
      hasExtensions = true;
    }
  }

  return hasExtensions ? extensions : undefined;
}
