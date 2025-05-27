/**
 * Security integration for DevControlMCP command system
 * Integrates custom commands and hotkeys with existing blockedCommands security
 */

import { commandManager } from '../command-manager.js';
import { configManager } from '../config-manager.js';
import { CommandValidator } from './command-validator.js';
import { TemplateEngine } from './template-engine.js';
import { Command } from './types.js';

/**
 * Security service for command system
 */
export class CommandSecurity {
  /**
   * Validate a custom command against security policies
   */
  static async validateCustomCommand(
    command: Command,
    parameters: Record<string, any> = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    processedCommand?: string;
  }> {
    // First validate the command structure
    const structuralValidation = CommandValidator.validateCustomCommand(
      command.name || 'unknown',
      parameters
    );

    if (!structuralValidation.valid) {
      return {
        allowed: false,
        reason: `Validation failed: ${structuralValidation.errors.join(', ')}`
      };
    }

    // Process the template to get the actual command that would be executed
    if (!command.template) {
      return {
        allowed: false,
        reason: 'Custom command missing template'
      };
    }

    const templateResult = TemplateEngine.processTemplate(
      command.template,
      parameters,
      command.parameters
    );

    if (!templateResult.success) {
      return {
        allowed: false,
        reason: `Template processing failed: ${templateResult.errors.join(', ')}`
      };
    }

    // Check the processed command against blockedCommands
    const isAllowed = await commandManager.validateCommand(templateResult.command);

    if (!isAllowed) {
      // Get more specific information about which command was blocked
      const blockedInfo = await this.identifyBlockedCommand(templateResult.command);
      const violationMessage = `Security violation detected: Custom command '${command.name}' attempted to execute blocked command '${blockedInfo}'`;
      
      // Log security violation
      console.warn(`[DevControlMCP Security] ${violationMessage}`);
      console.warn(`[DevControlMCP Security] Processed command: ${templateResult.command}`);
      
      return {
        allowed: false,
        reason: `Command blocked by security policy: ${blockedInfo}`,
        processedCommand: templateResult.command
      };
    }

    return {
      allowed: true,
      processedCommand: templateResult.command
    };
  }

  /**
   * Validate a hotkey against security policies
   */
  static async validateHotkey(
    command: Command,
    parameters: Record<string, any> = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    delegateTarget?: string;
  }> {
    // First validate the hotkey structure
    const structuralValidation = CommandValidator.validateHotkey(
      command.name || 'unknown',
      parameters
    );

    if (!structuralValidation.valid) {
      return {
        allowed: false,
        reason: `Validation failed: ${structuralValidation.errors.join(', ')}`
      };
    }

    // For hotkeys, we need to validate that the delegate target is a valid tool
    // This is more about ensuring the hotkey can function rather than security
    // since the delegated tool will handle its own security
    if (!command.delegate) {
      return {
        allowed: false,
        reason: 'Hotkey missing delegate target'
      };
    }

    // Check if the delegate target is a valid tool
    const validTools = this.getValidDelegateTargets();
    if (!validTools.includes(command.delegate)) {
      return {
        allowed: false,
        reason: `Invalid delegate target '${command.delegate}'. Valid targets: ${validTools.join(', ')}`
      };
    }

    return {
      allowed: true,
      delegateTarget: command.delegate
    };
  }

  /**
   * Check if a template string contains potentially dangerous patterns
   */
  static analyzeTemplateRisks(template: string): {
    riskLevel: 'low' | 'medium' | 'high';
    risks: string[];
    recommendations: string[];
  } {
    const risks: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /rm\s+.*-r|rm\s+.*-f/, risk: 'Contains recursive or force delete operations' },
      { pattern: /\$\(.*\)|\`.*\`/, risk: 'Contains command substitution that could bypass parameter validation' },
      { pattern: /sudo|su\s/, risk: 'Contains privilege escalation commands' },
      { pattern: />\s*\/|>\s*~/, risk: 'Contains redirection to system directories' },
      { pattern: /\|\s*sh|\|\s*bash|\|\s*zsh/, risk: 'Pipes output to shell execution' },
      { pattern: /&&|\|\||;/, risk: 'Contains command chaining operators' },
      { pattern: /curl\s+.*\|\s*sh|wget\s+.*\|\s*sh/, risk: 'Downloads and executes remote scripts' }
    ];

    for (const { pattern, risk } of dangerousPatterns) {
      if (pattern.test(template)) {
        risks.push(risk);
        riskLevel = 'high';
      }
    }

    // Check for medium-risk patterns
    const mediumRiskPatterns = [
      { pattern: /rm\s/, risk: 'Contains file deletion commands' },
      { pattern: /chmod|chown/, risk: 'Modifies file permissions or ownership' },
      { pattern: /mv\s.*\/|cp\s.*\//, risk: 'Moves or copies files to system directories' },
      { pattern: /curl\s|wget\s|fetch\s/, risk: 'Downloads content from the internet' }
    ];

    if (riskLevel === 'low') {
      for (const { pattern, risk } of mediumRiskPatterns) {
        if (pattern.test(template)) {
          risks.push(risk);
          riskLevel = 'medium';
        }
      }
    }

    // Generate recommendations
    if (risks.length > 0) {
      recommendations.push('Review template carefully before use');
      recommendations.push('Test with non-destructive parameters first');
      
      if (riskLevel === 'high') {
        recommendations.push('Consider splitting into multiple safer commands');
        recommendations.push('Add additional parameter validation');
      }
    }

    return { riskLevel, risks, recommendations };
  }

  /**
   * Get configuration for security policies
   */
  static async getSecurityConfig(): Promise<{
    blockedCommands: string[];
    allowedDirectories: string[];
    customCommandsEnabled: boolean;
    hotkeysEnabled: boolean;
  }> {
    const config = await configManager.getConfig();
    
    return {
      blockedCommands: config.blockedCommands || [],
      allowedDirectories: config.allowedDirectories || [],
      customCommandsEnabled: true, // Could be configurable in the future
      hotkeysEnabled: true // Could be configurable in the future
    };
  }

  /**
   * Update security configuration
   */
  static async updateSecurityConfig(updates: {
    blockedCommands?: string[];
    allowedDirectories?: string[];
    customCommandsEnabled?: boolean;
    hotkeysEnabled?: boolean;
  }): Promise<void> {
    const configUpdates: any = {};
    
    if (updates.blockedCommands !== undefined) {
      configUpdates.blockedCommands = updates.blockedCommands;
    }
    
    if (updates.allowedDirectories !== undefined) {
      configUpdates.allowedDirectories = updates.allowedDirectories;
    }

    // Note: customCommandsEnabled and hotkeysEnabled would need to be added to config schema
    // For now, they're not persisted
    
    await configManager.updateConfig(configUpdates);
  }

  /**
   * Identify which specific command was blocked
   */
  private static async identifyBlockedCommand(commandString: string): Promise<string> {
    const config = await configManager.getConfig();
    const blockedCommands = config.blockedCommands || [];
    
    // Extract commands from the command string
    const extractedCommands = commandManager.extractCommands(commandString);
    
    for (const cmd of extractedCommands) {
      if (blockedCommands.includes(cmd)) {
        return cmd;
      }
    }
    
    // Fallback to base command check
    const baseCommand = commandManager.getBaseCommand(commandString);
    if (blockedCommands.includes(baseCommand)) {
      return baseCommand;
    }
    
    return 'unknown';
  }

  /**
   * Get list of valid delegate targets for hotkeys
   */
  private static getValidDelegateTargets(): string[] {
    return [
      // Configuration tools
      'get_config', 'set_config_value',
      
      // Terminal tools
      'execute_command', 'read_output', 'force_terminate', 'list_sessions',
      
      // Process tools
      'list_processes', 'kill_process',
      
      // Filesystem tools
      'read_file', 'read_multiple_files', 'write_file', 'create_directory',
      'list_directory', 'move_file', 'search_files', 'search_code', 'get_file_info',
      
      // Text editing tools
      'edit_block',
      
      // Meta-tool
      'claude_code'
    ];
  }

  /**
   * Report a security violation with structured logging
   */
  static reportSecurityViolation(violation: {
    type: 'blocked_command' | 'template_risk' | 'parameter_validation' | 'delegate_failure';
    commandName: string;
    attemptedAction: string;
    blockedReason: string;
    riskLevel: 'low' | 'medium' | 'high';
    details?: any;
  }): void {
    const timestamp = new Date().toISOString();
    const logLevel = violation.riskLevel === 'high' ? 'error' : 'warn';
    
    const message = `[DevControlMCP Security] ${violation.type.toUpperCase()}: ` +
      `Command '${violation.commandName}' blocked - ${violation.blockedReason}`;
    
    console[logLevel](`${timestamp} ${message}`);
    
    if (violation.details) {
      console[logLevel](`${timestamp} [DevControlMCP Security] Details:`, violation.details);
    }
    
    // In a production environment, you might also:
    // - Send to a security monitoring service
    // - Write to a security audit log file
    // - Trigger alerts for high-risk violations
  }

  /**
   * Generate security report for a command configuration
   */
  static generateSecurityReport(command: Command): {
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    details: {
      templateAnalysis?: ReturnType<typeof CommandSecurity.analyzeTemplateRisks>;
      parameterRisks: string[];
      mitigations: string[];
    };
  } {
    const parameterRisks: string[] = [];
    const mitigations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let templateAnalysis;

    // Analyze template if it's a custom command
    if (command.template) {
      templateAnalysis = this.analyzeTemplateRisks(command.template);
      riskLevel = templateAnalysis.riskLevel;
      mitigations.push(...templateAnalysis.recommendations);
    }

    // Analyze parameters
    if (command.parameters) {
      for (const [paramName, config] of Object.entries(command.parameters)) {
        if (config.type === 'string' && !config.enum) {
          parameterRisks.push(`Parameter '${paramName}' accepts arbitrary strings`);
        }
        
        if (!config.required) {
          parameterRisks.push(`Parameter '${paramName}' is optional and may have default behavior`);
        }
      }
      
      if (parameterRisks.length > 0) {
        mitigations.push('Consider using enum constraints for string parameters');
        mitigations.push('Validate parameter values in your templates');
      }
    }

    // Generate summary
    let summary = `Command '${command.name || 'unknown'}' has ${riskLevel} security risk`;
    if (templateAnalysis?.risks.length) {
      summary += ` with ${templateAnalysis.risks.length} template risk(s)`;
    }
    if (parameterRisks.length) {
      summary += ` and ${parameterRisks.length} parameter risk(s)`;
    }

    return {
      summary,
      riskLevel,
      details: {
        templateAnalysis,
        parameterRisks,
        mitigations
      }
    };
  }
}