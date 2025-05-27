/**
 * Template engine for DevControlMCP command system
 * Handles {{parameter}} substitution with validation and security checks
 */

import { ParameterConfig, TemplateResult, ValidationResult } from './types.js';

/**
 * Regular expression to match {{parameter}} patterns in templates
 */
const PARAMETER_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Template engine for processing command templates with parameter substitution
 */
export class TemplateEngine {
  /**
   * Extract parameter names from a template string
   */
  static extractParameters(template: string): string[] {
    const parameters: string[] = [];
    let match;
    
    // Reset regex state
    PARAMETER_REGEX.lastIndex = 0;
    
    while ((match = PARAMETER_REGEX.exec(template)) !== null) {
      const paramName = match[1];
      if (!parameters.includes(paramName)) {
        parameters.push(paramName);
      }
    }
    
    return parameters;
  }

  /**
   * Validate parameters against their configuration
   */
  static validateParameters(
    parameters: Record<string, any>,
    parameterConfigs: Record<string, ParameterConfig> = {}
  ): ValidationResult {
    const errors: string[] = [];
    const validatedParams: Record<string, any> = {};

    // Check required parameters
    for (const [paramName, config] of Object.entries(parameterConfigs)) {
      const value = parameters[paramName];
      
      if (config.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required parameter '${paramName}' is missing`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        const validationResult = this.validateParameterValue(value, config, paramName);
        if (validationResult.valid) {
          validatedParams[paramName] = validationResult.value;
        } else {
          errors.push(...validationResult.errors);
        }
      }
    }

    // Validate any extra parameters not in config
    for (const [paramName, value] of Object.entries(parameters)) {
      if (!parameterConfigs[paramName] && value !== undefined && value !== null && value !== '') {
        // Allow extra parameters but sanitize them
        validatedParams[paramName] = this.sanitizeValue(value);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      parameters: validatedParams
    };
  }

  /**
   * Validate a single parameter value against its configuration
   */
  private static validateParameterValue(
    value: any,
    config: ParameterConfig,
    paramName: string
  ): { valid: boolean; errors: string[]; value: any } {
    const errors: string[] = [];
    let validatedValue = value;

    // Type validation and conversion
    switch (config.type) {
      case 'string':
        validatedValue = String(value);
        break;
        
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`Parameter '${paramName}' must be a number, got '${value}'`);
        } else {
          validatedValue = numValue;
        }
        break;
        
      case 'boolean':
        if (typeof value === 'boolean') {
          validatedValue = value;
        } else if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
            validatedValue = true;
          } else if (['false', '0', 'no', 'off'].includes(lowerValue)) {
            validatedValue = false;
          } else {
            errors.push(`Parameter '${paramName}' must be a boolean, got '${value}'`);
          }
        } else {
          errors.push(`Parameter '${paramName}' must be a boolean, got '${value}'`);
        }
        break;
        
      case 'enum':
        if (!config.enum || !config.enum.includes(String(value))) {
          errors.push(`Parameter '${paramName}' must be one of: ${config.enum?.join(', ')}, got '${value}'`);
        } else {
          validatedValue = String(value);
        }
        break;
        
      default:
        validatedValue = this.sanitizeValue(value);
    }

    // Additional sanitization for string values
    if (config.type === 'string' || typeof validatedValue === 'string') {
      validatedValue = this.sanitizeValue(validatedValue);
    }

    return {
      valid: errors.length === 0,
      errors,
      value: validatedValue
    };
  }

  /**
   * Sanitize a value to prevent injection attacks
   */
  private static sanitizeValue(value: any): string {
    if (typeof value !== 'string') {
      value = String(value);
    }

    // Remove potentially dangerous characters and sequences
    return value
      .replace(/[`$\\]/g, '') // Remove backticks, dollar signs, and backslashes
      .replace(/[;&|><]/g, '') // Remove shell operators
      .replace(/\x00/g, '') // Remove null bytes
      .trim();
  }

  /**
   * Process a template string by substituting parameters
   */
  static processTemplate(
    template: string,
    parameters: Record<string, any>,
    parameterConfigs: Record<string, ParameterConfig> = {}
  ): TemplateResult {
    // First validate all parameters
    const validation = this.validateParameters(parameters, parameterConfigs);
    
    if (!validation.valid) {
      return {
        command: template,
        errors: validation.errors,
        success: false
      };
    }

    // Extract required parameters from template
    const requiredParams = this.extractParameters(template);
    const missingParams = requiredParams.filter(param => 
      validation.parameters[param] === undefined || 
      validation.parameters[param] === null || 
      validation.parameters[param] === ''
    );

    if (missingParams.length > 0) {
      return {
        command: template,
        errors: [`Missing required parameters: ${missingParams.join(', ')}`],
        success: false
      };
    }

    // Substitute parameters in template
    let processedCommand = template;
    const errors: string[] = [];

    try {
      // Reset regex state
      PARAMETER_REGEX.lastIndex = 0;
      
      processedCommand = template.replace(PARAMETER_REGEX, (match, paramName) => {
        const value = validation.parameters[paramName];
        if (value === undefined || value === null) {
          errors.push(`Parameter '${paramName}' not found`);
          return match; // Keep original placeholder
        }
        return String(value);
      });
    } catch (error) {
      errors.push(`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      command: processedCommand,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Check if a template string is valid (contains valid parameter syntax)
   */
  static isValidTemplate(template: string): boolean {
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        return false;
      }

      // Check for valid parameter names
      const parameters = this.extractParameters(template);
      for (const param of parameters) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}