/**
 * Spec vs Docs Comparator
 *
 * Compares OpenAPI spec definitions with documentation content
 * to identify discrepancies that could confuse AI agents.
 */

import type { NormalizedEndpoint, NormalizedAPI } from '../types/index.js';
import type {
  EndpointDocumentation,
  SpecDocsComparison,
  SpecDocsDiscrepancy,
} from './types.js';

export class SpecDocsComparator {
  /**
   * Compare an endpoint's spec definition with its documentation
   */
  compare(
    endpoint: NormalizedEndpoint,
    docs: EndpointDocumentation,
    _api: NormalizedAPI
  ): SpecDocsComparison {
    if (!docs.found || !docs.content) {
      return {
        match: true, // Can't determine mismatch without docs
        confidence: 0,
        discrepancies: [],
        warnings: ['Documentation not found or empty'],
      };
    }

    const discrepancies: SpecDocsDiscrepancy[] = [];
    const warnings: string[] = [];
    const content = docs.content.toLowerCase();

    // Check 1: HTTP Method mentioned
    if (!content.includes(endpoint.method.toLowerCase())) {
      warnings.push(`Documentation may not mention HTTP method ${endpoint.method}`);
    }

    // Check 2: Path parameters documented
    const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
    for (const param of pathParams) {
      if (!content.includes(param.name.toLowerCase())) {
        discrepancies.push({
          field: `parameter.${param.name}`,
          specValue: `Path parameter: ${param.name}`,
          docsValue: undefined,
          severity: 'medium',
          message: `Path parameter '${param.name}' not found in documentation`,
        });
      }
    }

    // Check 3: Required query parameters documented
    const requiredQueryParams = endpoint.parameters.filter(
      (p) => p.in === 'query' && p.required
    );
    for (const param of requiredQueryParams) {
      if (!content.includes(param.name.toLowerCase())) {
        discrepancies.push({
          field: `parameter.${param.name}`,
          specValue: `Required query parameter: ${param.name}`,
          docsValue: undefined,
          severity: 'high',
          message: `Required query parameter '${param.name}' not found in documentation`,
        });
      }
    }

    // Check 4: Response status codes
    const specStatusCodes = Object.keys(endpoint.responses);
    const errorCodes = specStatusCodes.filter(
      (code) => code.startsWith('4') || code.startsWith('5')
    );

    for (const code of errorCodes) {
      if (!content.includes(code)) {
        discrepancies.push({
          field: `response.${code}`,
          specValue: `Status code ${code} documented in spec`,
          docsValue: undefined,
          severity: 'medium',
          message: `Error status code ${code} may not be documented`,
        });
      }
    }

    // Check 5: Request body required fields (for POST/PUT/PATCH)
    if (endpoint.requestBody) {
      const schema = endpoint.requestBody.content?.['application/json']?.schema;
      if (schema?.required) {
        for (const requiredField of schema.required) {
          if (!content.includes(requiredField.toLowerCase())) {
            discrepancies.push({
              field: `requestBody.${requiredField}`,
              specValue: `Required field: ${requiredField}`,
              docsValue: undefined,
              severity: 'high',
              message: `Required request body field '${requiredField}' not found in documentation`,
            });
          }
        }
      }
    }

    // Check 6: Authentication requirements
    if (endpoint.security && endpoint.security.length > 0) {
      const authTerms = ['auth', 'token', 'api key', 'bearer', 'oauth', 'credential'];
      const hasAuthMention = authTerms.some((term) => content.includes(term));

      if (!hasAuthMention) {
        discrepancies.push({
          field: 'security',
          specValue: 'Authentication required',
          docsValue: undefined,
          severity: 'high',
          message: 'Authentication requirements may not be documented',
        });
      }
    }

    // Calculate confidence based on documentation quality and discrepancies
    const confidence = this.calculateConfidence(docs, discrepancies);
    const match =
      discrepancies.filter((d) => d.severity === 'critical' || d.severity === 'high')
        .length === 0;

    return {
      match,
      confidence,
      discrepancies,
      warnings,
    };
  }

  /**
   * Calculate confidence score based on documentation quality
   */
  private calculateConfidence(
    docs: EndpointDocumentation,
    discrepancies: SpecDocsDiscrepancy[]
  ): number {
    let confidence = 50; // Base confidence

    // Adjust for documentation quality
    if (docs.confidence === 'high') {
      confidence += 30;
    } else if (docs.confidence === 'medium') {
      confidence += 15;
    }

    // Reduce for discrepancies
    const criticalCount = discrepancies.filter((d) => d.severity === 'critical').length;
    const highCount = discrepancies.filter((d) => d.severity === 'high').length;
    const mediumCount = discrepancies.filter((d) => d.severity === 'medium').length;

    confidence -= criticalCount * 20;
    confidence -= highCount * 10;
    confidence -= mediumCount * 5;

    return Math.max(0, Math.min(100, confidence));
  }
}
