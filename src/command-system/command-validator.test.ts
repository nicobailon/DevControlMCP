/**
 * Unit tests for CommandValidator
 */

import { CommandValidator } from './command-validator.js';
import { commandRegistry } from './command-registry.js';
import { Command } from './types.js';

// Mock the command registry
jest.mock('./command-registry.js', () => ({
  commandRegistry: {
    getCommand: jest.fn(),
    getHotkey: jest.fn(),
    hasCommand: jest.fn(),
    hasHotkey: jest.fn(),
    getAllCommands: jest.fn(),
    getAllHotkeys: jest.fn()
  }
}));

const mockCommandRegistry = commandRegistry as jest.Mocked<typeof commandRegistry>;

describe('CommandValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCustomCommand', () => {
    it('should validate a correct custom command', () => {
      const mockCommand: Command = {
        name: 'test_cmd',
        description: 'Test command',
        template: 'echo {{message}}',
        parameters: {
          message: { type: 'string', required: true }
        }
      };

      mockCommandRegistry.getCommand.mockReturnValue({
        command: mockCommand,
        toolName: 'custom_test_cmd',
        type: 'custom'
      });

      const result = CommandValidator.validateCustomCommand('test_cmd', { message: 'hello' });
      
      expect(result.valid).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.processedCommand).toBe('echo hello');
    });

    it('should fail for non-existent command', () => {
      mockCommandRegistry.getCommand.mockReturnValue(undefined);

      const result = CommandValidator.validateCustomCommand('nonexistent', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Command 'nonexistent' not found");
    });

    it('should fail for command without template', () => {
      const mockCommand: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command'
      };

      mockCommandRegistry.getCommand.mockReturnValue({
        command: mockCommand,
        toolName: 'custom_invalid_cmd',
        type: 'custom'
      });

      const result = CommandValidator.validateCustomCommand('invalid_cmd', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Command 'invalid_cmd' is not a custom command (missing template)");
    });

    it('should fail for missing required parameters', () => {
      const mockCommand: Command = {
        name: 'test_cmd',
        description: 'Test command',
        template: 'echo {{message}}',
        parameters: {
          message: { type: 'string', required: true }
        }
      };

      mockCommandRegistry.getCommand.mockReturnValue({
        command: mockCommand,
        toolName: 'custom_test_cmd',
        type: 'custom'
      });

      const result = CommandValidator.validateCustomCommand('test_cmd', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('Missing required parameters: message'))).toBe(true);
    });
  });

  describe('validateHotkey', () => {
    it('should validate a correct hotkey', () => {
      const mockCommand: Command = {
        name: 't',
        description: 'Test hotkey',
        delegate: 'search_files'
      };

      mockCommandRegistry.getHotkey.mockReturnValue({
        command: mockCommand,
        type: 'hotkey'
      });

      const result = CommandValidator.validateHotkey('t', { path: '/test' });
      
      expect(result.valid).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.delegateTarget).toBe('search_files');
    });

    it('should fail for non-existent hotkey', () => {
      mockCommandRegistry.getHotkey.mockReturnValue(undefined);

      const result = CommandValidator.validateHotkey('x', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Hotkey 'x' not found");
    });

    it('should fail for hotkey without delegate', () => {
      const mockCommand: Command = {
        name: 't',
        description: 'Invalid hotkey'
      };

      mockCommandRegistry.getHotkey.mockReturnValue({
        command: mockCommand,
        type: 'hotkey'
      });

      const result = CommandValidator.validateHotkey('t', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Hotkey 't' is not properly configured (missing delegate)");
    });
  });

  describe('isValidCommandName', () => {
    it('should validate correct command names', () => {
      const validNames = [
        'test_command',
        'npm_install',
        'build-project',
        'cmd123',
        'MyCommand'
      ];

      validNames.forEach(name => {
        expect(CommandValidator.isValidCommandName(name)).toBe(true);
      });
    });

    it('should reject invalid command names', () => {
      const invalidNames = [
        '123invalid',
        'invalid space',
        'invalid@symbol',
        'invalid.dot',
        '',
        'a' // too short for some contexts
      ];

      invalidNames.forEach(name => {
        expect(CommandValidator.isValidCommandName(name)).toBe(false);
      });
    });
  });

  describe('isValidHotkeyKey', () => {
    it('should validate single letters', () => {
      const validKeys = ['a', 'B', 'z', 'X'];
      
      validKeys.forEach(key => {
        expect(CommandValidator.isValidHotkeyKey(key)).toBe(true);
      });
    });

    it('should reject invalid hotkey keys', () => {
      const invalidKeys = ['ab', '1', '@', '', ' '];
      
      invalidKeys.forEach(key => {
        expect(CommandValidator.isValidHotkeyKey(key)).toBe(false);
      });
    });
  });

  describe('checkNameConflict', () => {
    beforeEach(() => {
      mockCommandRegistry.hasCommand.mockReturnValue(false);
      mockCommandRegistry.hasHotkey.mockReturnValue(false);
    });

    it('should detect builtin tool conflicts', () => {
      const result = CommandValidator.checkNameConflict('execute_command');
      
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('builtin');
      expect(result.suggestion).toBe('execute_command_custom');
    });

    it('should detect custom command conflicts', () => {
      mockCommandRegistry.hasCommand.mockReturnValue(true);
      
      const result = CommandValidator.checkNameConflict('existing_command');
      
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('custom');
      expect(result.suggestion).toBe('existing_command_alt');
    });

    it('should detect hotkey conflicts', () => {
      mockCommandRegistry.hasHotkey.mockReturnValue(true);
      
      const result = CommandValidator.checkNameConflict('t');
      
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('hotkey');
      expect(result.suggestion).toBe('t_cmd');
    });

    it('should allow unique names', () => {
      const result = CommandValidator.checkNameConflict('unique_name');
      
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('validateCommandConfig', () => {
    it('should validate correct custom command config', () => {
      const command: Command = {
        name: 'test_cmd',
        description: 'Test command',
        template: 'echo {{message}}',
        parameters: {
          message: { type: 'string', required: true }
        }
      };

      const result = CommandValidator.validateCommandConfig('test_cmd', command, 'custom');
      
      expect(result.valid).toBe(true);
    });

    it('should validate correct hotkey config', () => {
      const command: Command = {
        name: 't',
        description: 'Test hotkey',
        delegate: 'search_files'
      };

      const result = CommandValidator.validateCommandConfig('t', command, 'hotkey');
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid command name', () => {
      const command: Command = {
        name: '123invalid',
        description: 'Invalid command',
        template: 'echo test'
      };

      const result = CommandValidator.validateCommandConfig('123invalid', command, 'custom');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('Invalid command name'))).toBe(true);
    });

    it('should reject custom command without template', () => {
      const command: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command'
      };

      const result = CommandValidator.validateCommandConfig('invalid_cmd', command, 'custom');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Custom commands must have a template');
    });

    it('should reject hotkey without delegate', () => {
      const command: Command = {
        name: 't',
        description: 'Invalid hotkey'
      };

      const result = CommandValidator.validateCommandConfig('t', command, 'hotkey');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Hotkeys must have a delegate');
    });

    it('should reject command without description', () => {
      const command: Command = {
        name: 'no_desc',
        description: '',
        template: 'echo test'
      };

      const result = CommandValidator.validateCommandConfig('no_desc', command, 'custom');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command must have a description');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return available commands and hotkeys', () => {
      const mockCommands = new Map([
        ['cmd1', {
          command: {
            name: 'cmd1',
            description: 'Command 1',
            template: 'echo 1',
            parameters: { msg: { type: 'string' } }
          },
          toolName: 'custom_cmd1',
          type: 'custom' as const
        }]
      ]);

      const mockHotkeys = new Map([
        ['t', {
          command: {
            name: 't',
            description: 'Test hotkey',
            delegate: 'search_files'
          },
          type: 'hotkey' as const
        }]
      ]);

      mockCommandRegistry.getAllCommands.mockReturnValue(mockCommands);
      mockCommandRegistry.getAllHotkeys.mockReturnValue(mockHotkeys);

      const result = CommandValidator.getAvailableCommands();
      
      expect(result.commands).toHaveLength(1);
      expect(result.hotkeys).toHaveLength(1);
      expect(result.commands[0].name).toBe('cmd1');
      expect(result.hotkeys[0].key).toBe('t');
    });
  });

  describe('searchCommands', () => {
    beforeEach(() => {
      const mockCommands = new Map([
        ['search_cmd', {
          command: {
            name: 'search_cmd',
            description: 'Search for files',
            template: 'find {{path}}'
          },
          toolName: 'custom_search_cmd',
          type: 'custom' as const
        }],
        ['build_cmd', {
          command: {
            name: 'build_cmd',
            description: 'Build the project',
            template: 'npm run build'
          },
          toolName: 'custom_build_cmd',
          type: 'custom' as const
        }]
      ]);

      const mockHotkeys = new Map([
        ['s', {
          command: {
            name: 's',
            description: 'Search files quickly',
            delegate: 'search_files'
          },
          type: 'hotkey' as const
        }]
      ]);

      mockCommandRegistry.getAllCommands.mockReturnValue(mockCommands);
      mockCommandRegistry.getAllHotkeys.mockReturnValue(mockHotkeys);
    });

    it('should find commands by name', () => {
      const result = CommandValidator.searchCommands('search');
      
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].name).toBe('search_cmd');
      expect(result.commands[0].relevance).toBe(10); // Name match
    });

    it('should find commands by description', () => {
      const result = CommandValidator.searchCommands('build');
      
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].name).toBe('build_cmd');
    });

    it('should find hotkeys by key', () => {
      const result = CommandValidator.searchCommands('s');
      
      expect(result.hotkeys).toHaveLength(1);
      expect(result.hotkeys[0].key).toBe('s');
    });

    it('should return empty results for no matches', () => {
      const result = CommandValidator.searchCommands('nonexistent');
      
      expect(result.commands).toHaveLength(0);
      expect(result.hotkeys).toHaveLength(0);
    });
  });
});