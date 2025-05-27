/**
 * Unit tests for TemplateEngine
 */

import { TemplateEngine } from './template-engine.js';
import { ParameterConfig } from './types.js';

describe('TemplateEngine', () => {
  describe('extractParameters', () => {
    it('should extract single parameter from template', () => {
      const template = 'npm run {{script}}';
      const params = TemplateEngine.extractParameters(template);
      expect(params).toEqual(['script']);
    });

    it('should extract multiple parameters from template', () => {
      const template = 'docker run -p {{port}}:{{port}} {{image}}';
      const params = TemplateEngine.extractParameters(template);
      expect(params).toEqual(['port', 'image']);
    });

    it('should handle duplicate parameters', () => {
      const template = 'echo {{message}} and {{message}} again';
      const params = TemplateEngine.extractParameters(template);
      expect(params).toEqual(['message']);
    });

    it('should return empty array for template without parameters', () => {
      const template = 'npm install';
      const params = TemplateEngine.extractParameters(template);
      expect(params).toEqual([]);
    });

    it('should handle complex parameter names', () => {
      const template = 'command {{param_name}} {{PARAM2}} {{param3_test}}';
      const params = TemplateEngine.extractParameters(template);
      expect(params).toEqual(['param_name', 'PARAM2', 'param3_test']);
    });
  });

  describe('validateParameters', () => {
    it('should validate string parameters', () => {
      const configs: Record<string, ParameterConfig> = {
        name: { type: 'string', required: true }
      };
      const params = { name: 'test' };
      
      const result = TemplateEngine.validateParameters(params, configs);
      expect(result.valid).toBe(true);
      expect(result.parameters.name).toBe('test');
    });

    it('should validate number parameters', () => {
      const configs: Record<string, ParameterConfig> = {
        port: { type: 'number', required: true }
      };
      const params = { port: '8080' };
      
      const result = TemplateEngine.validateParameters(params, configs);
      expect(result.valid).toBe(true);
      expect(result.parameters.port).toBe(8080);
    });

    it('should validate boolean parameters', () => {
      const configs: Record<string, ParameterConfig> = {
        enabled: { type: 'boolean' }
      };
      
      // Test various boolean representations
      const trueValues = ['true', 'True', '1', 'yes', 'on', true];
      const falseValues = ['false', 'False', '0', 'no', 'off', false];
      
      for (const value of trueValues) {
        const result = TemplateEngine.validateParameters({ enabled: value }, configs);
        expect(result.valid).toBe(true);
        expect(result.parameters.enabled).toBe(true);
      }
      
      for (const value of falseValues) {
        const result = TemplateEngine.validateParameters({ enabled: value }, configs);
        expect(result.valid).toBe(true);
        expect(result.parameters.enabled).toBe(false);
      }
    });

    it('should validate enum parameters', () => {
      const configs: Record<string, ParameterConfig> = {
        level: { type: 'enum', enum: ['debug', 'info', 'warn', 'error'] }
      };
      
      const validResult = TemplateEngine.validateParameters({ level: 'info' }, configs);
      expect(validResult.valid).toBe(true);
      expect(validResult.parameters.level).toBe('info');
      
      const invalidResult = TemplateEngine.validateParameters({ level: 'invalid' }, configs);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("Parameter 'level' must be one of: debug, info, warn, error, got 'invalid'");
    });

    it('should handle required parameters', () => {
      const configs: Record<string, ParameterConfig> = {
        required_param: { type: 'string', required: true },
        optional_param: { type: 'string', required: false }
      };
      
      const missingRequired = TemplateEngine.validateParameters({}, configs);
      expect(missingRequired.valid).toBe(false);
      expect(missingRequired.errors).toContain("Required parameter 'required_param' is missing");
      
      const withRequired = TemplateEngine.validateParameters({ required_param: 'value' }, configs);
      expect(withRequired.valid).toBe(true);
    });

    it('should sanitize string values', () => {
      const configs: Record<string, ParameterConfig> = {
        input: { type: 'string' }
      };
      
      const result = TemplateEngine.validateParameters({ input: 'test`$command;' }, configs);
      expect(result.valid).toBe(true);
      expect(result.parameters.input).toBe('testcommand');
    });

    it('should handle invalid number conversion', () => {
      const configs: Record<string, ParameterConfig> = {
        port: { type: 'number' }
      };
      
      const result = TemplateEngine.validateParameters({ port: 'not-a-number' }, configs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Parameter 'port' must be a number, got 'not-a-number'");
    });

    it('should handle invalid boolean conversion', () => {
      const configs: Record<string, ParameterConfig> = {
        flag: { type: 'boolean' }
      };
      
      const result = TemplateEngine.validateParameters({ flag: 'maybe' }, configs);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Parameter 'flag' must be a boolean, got 'maybe'");
    });
  });

  describe('processTemplate', () => {
    it('should substitute simple parameters', () => {
      const template = 'npm run {{script}}';
      const parameters = { script: 'build' };
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(true);
      expect(result.command).toBe('npm run build');
      expect(result.errors).toEqual([]);
    });

    it('should substitute multiple parameters', () => {
      const template = 'docker run -p {{port}}:{{port}} {{image}}';
      const parameters = { port: '8080', image: 'nginx' };
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(true);
      expect(result.command).toBe('docker run -p 8080:8080 nginx');
    });

    it('should handle missing parameters', () => {
      const template = 'npm run {{script}}';
      const parameters = {};
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required parameters: script');
    });

    it('should validate parameters with config', () => {
      const template = 'listen on port {{port}}';
      const parameters = { port: 'invalid' };
      const configs: Record<string, ParameterConfig> = {
        port: { type: 'number', required: true }
      };
      
      const result = TemplateEngine.processTemplate(template, parameters, configs);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Parameter 'port' must be a number, got 'invalid'");
    });

    it('should sanitize parameters in output', () => {
      const template = 'echo "{{message}}"';
      const parameters = { message: 'hello`world$test;' };
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(true);
      expect(result.command).toBe('echo "helloworldtest"');
    });

    it('should handle enum validation', () => {
      const template = 'log --level={{level}}';
      const parameters = { level: 'debug' };
      const configs: Record<string, ParameterConfig> = {
        level: { type: 'enum', enum: ['debug', 'info', 'warn', 'error'] }
      };
      
      const result = TemplateEngine.processTemplate(template, parameters, configs);
      expect(result.success).toBe(true);
      expect(result.command).toBe('log --level=debug');
    });

    it('should handle number parameters', () => {
      const template = 'sleep {{seconds}}';
      const parameters = { seconds: '5' };
      const configs: Record<string, ParameterConfig> = {
        seconds: { type: 'number' }
      };
      
      const result = TemplateEngine.processTemplate(template, parameters, configs);
      expect(result.success).toBe(true);
      expect(result.command).toBe('sleep 5');
    });

    it('should handle boolean parameters', () => {
      const template = 'backup --force={{force}}';
      const parameters = { force: 'true' };
      const configs: Record<string, ParameterConfig> = {
        force: { type: 'boolean' }
      };
      
      const result = TemplateEngine.processTemplate(template, parameters, configs);
      expect(result.success).toBe(true);
      expect(result.command).toBe('backup --force=true');
    });
  });

  describe('isValidTemplate', () => {
    it('should validate correct templates', () => {
      const validTemplates = [
        'simple command',
        'npm run {{script}}',
        'docker run {{image}} --port {{port}}',
        'command {{param_name}} {{PARAM2}}',
        '{{start}} middle {{end}}'
      ];
      
      validTemplates.forEach(template => {
        expect(TemplateEngine.isValidTemplate(template)).toBe(true);
      });
    });

    it('should reject invalid templates', () => {
      const invalidTemplates = [
        'unmatched {{braces',
        'unmatched braces}}',
        'invalid {{param-name}}', // Invalid parameter name with dash
        'invalid {{123param}}',   // Parameter starting with number
        'nested {{outer {{inner}} }}',
        'empty {{}}',
        'special {{param$}}' // Invalid character in parameter name
      ];
      
      invalidTemplates.forEach(template => {
        expect(TemplateEngine.isValidTemplate(template)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(TemplateEngine.isValidTemplate('')).toBe(true);
      expect(TemplateEngine.isValidTemplate('no parameters')).toBe(true);
      expect(TemplateEngine.isValidTemplate('{single brace}')).toBe(true);
      expect(TemplateEngine.isValidTemplate('{{valid_name}}')).toBe(true);
      expect(TemplateEngine.isValidTemplate('{{_underscore_start}}')).toBe(true);
    });
  });

  describe('security and sanitization', () => {
    it('should remove dangerous characters', () => {
      const template = 'echo {{message}}';
      const dangerousInputs = [
        'test`whoami`',
        'test$USER',
        'test\\escape',
        'test;rm -rf /',
        'test&background',
        'test|pipe',
        'test>redirect',
        'test<input'
      ];
      
      dangerousInputs.forEach(input => {
        const result = TemplateEngine.processTemplate(template, { message: input });
        expect(result.success).toBe(true);
        expect(result.command).not.toContain('`');
        expect(result.command).not.toContain('$');
        expect(result.command).not.toContain('\\');
        expect(result.command).not.toContain(';');
        expect(result.command).not.toContain('&');
        expect(result.command).not.toContain('|');
        expect(result.command).not.toContain('>');
        expect(result.command).not.toContain('<');
      });
    });

    it('should handle null bytes', () => {
      const template = 'echo {{message}}';
      const parameters = { message: 'test\x00null' };
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(true);
      expect(result.command).toBe('echo testnull');
    });

    it('should trim whitespace', () => {
      const template = 'echo {{message}}';
      const parameters = { message: '  trimmed  ' };
      
      const result = TemplateEngine.processTemplate(template, parameters);
      expect(result.success).toBe(true);
      expect(result.command).toBe('echo trimmed');
    });
  });
});