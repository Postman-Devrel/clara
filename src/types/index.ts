/**
 * Core types for Clara - AI Agent API Readiness Analyzer
 */

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Check pillars
export type Pillar =
  | 'metadata'
  | 'errors'
  | 'introspection'
  | 'naming'
  | 'predictability'
  | 'documentation'
  | 'performance'
  | 'discoverability';

// Severity levels with weights
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 4,
  high: 2,
  medium: 1,
  low: 0.5,
};

// Check status
export type CheckStatus = 'passed' | 'failed' | 'skipped' | 'warning';

// ============================================
// Normalized API Format
// ============================================

export interface NormalizedAPI {
  info: APIInfo;
  servers: Server[];
  endpoints: NormalizedEndpoint[];
  securitySchemes: Record<string, SecurityScheme>;
  components: Components;
  raw: unknown; // Original parsed spec
  openApiVersion?: string;
  externalDocs?: ExternalDocs;
  extensions?: Record<string, unknown>;
  webhooks?: Record<string, unknown>;
}

export interface ExternalDocs {
  url: string;
  description?: string;
}

export interface APIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  termsOfService?: string;
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

export interface NormalizedEndpoint {
  path: string;
  method: HttpMethod;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
  // Extension fields
  extensions?: Record<string, unknown>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: Schema;
  example?: unknown;
  examples?: Record<string, Example>;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface Response {
  description: string;
  headers?: Record<string, Header>;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema?: Schema;
  example?: unknown;
  examples?: Record<string, Example>;
}

export interface Header {
  description?: string;
  required?: boolean;
  schema?: Schema;
}

export interface Example {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export interface Schema {
  type?: string;
  format?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  // Numeric
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // Array
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  // Object
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  minProperties?: number;
  maxProperties?: number;
  // Composition
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  not?: Schema;
  // Reference
  $ref?: string;
  // Nullable (OpenAPI 3.0)
  nullable?: boolean;
  // Examples
  example?: unknown;
  examples?: unknown[];
  // Deprecation
  deprecated?: boolean;
  // Read/Write only
  readOnly?: boolean;
  writeOnly?: boolean;
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export type SecurityRequirement = Record<string, string[]>;

export interface Components {
  schemas?: Record<string, Schema>;
  responses?: Record<string, Response>;
  parameters?: Record<string, Parameter>;
  examples?: Record<string, Example>;
  requestBodies?: Record<string, RequestBody>;
  headers?: Record<string, Header>;
  securitySchemes?: Record<string, SecurityScheme>;
}

// ============================================
// Check System
// ============================================

export interface Check {
  id: string;
  pillar: Pillar;
  name: string;
  description: string;
  severity: Severity;
  selfHealing: SelfHealingInfo;
  requires?: CheckRequirements;
  check(context: CheckContext): CheckResult;
  generateFix?(context: CheckContext, result: CheckResult): Fix;
}

export interface SelfHealingInfo {
  impact: string;
  withoutThis: string;
  withThis: string;
}

export interface CheckRequirements {
  liveProbing?: boolean;
  parallelAi?: boolean;
}

export interface CheckContext {
  api: NormalizedAPI;
  endpoint?: NormalizedEndpoint;
  options?: AnalyzeOptions;
  // Live probing results
  liveResponse?: LiveResponse;
  // Malformation test results
  malformationResults?: MalformationTestResult[];
  // Parallel AI documentation results
  parallelDocs?: ParallelDocs;
}

export interface LiveResponse {
  statusCode: number;
  body?: unknown;
  headers?: Record<string, string>;
  responseTime?: number;
}

export interface MalformationTestResult {
  type: MalformationType;
  request: {
    method: HttpMethod;
    url: string;
    body?: unknown;
  };
  response: {
    statusCode: number;
    body?: unknown;
    responseTimeMs: number;
  };
  evaluation: {
    passed: boolean;
    score: number;
    expectedBehavior: string;
    actualBehavior: string;
    feedback: string;
  };
  errorQuality?: {
    hasErrorCode: boolean;
    hasMessage: boolean;
    messageIsHelpful: boolean;
    identifiesField: boolean;
    suggestsFix: boolean;
    hasDocUrl: boolean;
    score: number;
    feedback: string[];
  };
}

export type MalformationType =
  | 'invalid-json'
  | 'missing-required'
  | 'wrong-type'
  | 'extra-field'
  | 'missing-auth'
  | 'empty-body'
  | 'null-required';

export interface ParallelDocs {
  found: boolean;
  content?: string;
  url?: string;
  title?: string;
  excerpts?: string[];
  confidence: 'high' | 'medium' | 'low';
  comparison?: {
    match: boolean;
    confidence: number;
    discrepancies: Array<{
      field: string;
      specValue?: string;
      docsValue?: string;
      severity: Severity;
      message: string;
    }>;
  };
}

export interface CheckResult {
  id: string;
  status: CheckStatus;
  severity: Severity;
  message: string;
  path?: string;
  method?: HttpMethod;
  details?: Record<string, unknown>;
}

export interface Fix {
  description: string;
  example?: string;
  before?: string;
  after?: string;
}

// ============================================
// Analysis & Reporting
// ============================================

export interface AnalyzeOptions {
  probe?: boolean;
  sandbox?: boolean;
  baseUrl?: string;
  mockUrl?: string;
  auth?: string;
  docsUrl?: string;
  parallelKey?: string;
  postmanKey?: string;
  workspaceId?: string;
  output?: string[];
  verbose?: boolean;
}

export interface AnalysisReport {
  claraVersion: string;
  generatedAt: string;
  api: {
    name: string;
    version: string;
    source: 'openapi' | 'postman-collection' | 'postman-workspace';
    sourcePath: string;
  };
  summary: ReportSummary;
  pillars: PillarScore[];
  priorityFixes: PriorityFix[];
  endpoints: EndpointReport[];
}

export interface ReportSummary {
  overallScore: number;
  agentReady: boolean;
  totalEndpoints: number;
  passed: number;
  warnings: number;
  failed: number;
  criticalFailures: number;
}

export interface PillarScore {
  id: Pillar;
  name: string;
  score: number;
  weight: number;
  checksPassed: number;
  checksFailed: number;
}

export interface PriorityFix {
  rank: number;
  checkId: string;
  checkName: string;
  severity: Severity;
  severityWeight: number;
  endpointsAffected: number;
  priorityScore: number;
  summary: string;
  fix?: Fix;
}

export interface EndpointReport {
  path: string;
  method: HttpMethod;
  operationId?: string;
  score: number;
  status: 'passed' | 'warning' | 'failed';
  checks: CheckResult[];
}

// ============================================
// Input Sources
// ============================================

export type InputSource =
  | { type: 'file'; path: string }
  | { type: 'url'; url: string }
  | { type: 'postman-collection'; collectionId: string }
  | { type: 'postman-workspace'; workspaceId: string };

export interface ParsedInput {
  source: InputSource;
  format: 'openapi-2' | 'openapi-3' | 'postman-collection';
  normalized: NormalizedAPI;
}
