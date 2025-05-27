/**
 * Unit tests for CommandRegistry
 */

import { CommandRegistry } from './command-registry.js';
import { Command, CommandConfig } from './types.js';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('loadFromConfig', () => {
    it('should load commands and hotkeys from configuration', () => {
      const config: CommandConfig = {
        commands: {
          test_cmd: {
            description: 'Test command',
            template: 'echo {{message}}',
            parameters: {
              message: { type: 'string', required: true }
            }
          }
        },
        hotkeys: {
          t: {
            description: 'Test hotkey',
            delegate: 'search_files'
          }
        }
      };

      registry.loadFromConfig(config);

      expect(registry.hasCommand('test_cmd')).toBe(true);
      expect(registry.hasHotkey('t')).toBe(true);
    });

    it('should clear existing configuration before loading', () => {
      // Load initial config
      registry.loadFromConfig({
        commands: { cmd1: { description: 'Command 1', template: 'echo 1' } }
      });
      expect(registry.hasCommand('cmd1')).toBe(true);

      // Load new config
      registry.loadFromConfig({
        commands: { cmd2: { description: 'Command 2', template: 'echo 2' } }
      });
      expect(registry.hasCommand('cmd1')).toBe(false);
      expect(registry.hasCommand('cmd2')).toBe(true);
    });

    it('should handle empty configuration', () => {
      registry.loadFromConfig({});
      expect(registry.getStats().commandCount).toBe(0);
      expect(registry.getStats().hotkeyCount).toBe(0);
    });
  });

  describe('registerCommand', () => {
    it('should register a valid custom command', () => {
      const command: Command = {
        name: 'test_cmd',
        description: 'Test command',
        template: 'echo {{message}}',
        parameters: {
          message: { type: 'string', required: true }
        }
      };

      registry.registerCommand('test_cmd', command);
      expect(registry.hasCommand('test_cmd')).toBe(true);

      const entry = registry.getCommand('test_cmd');
      expect(entry?.command.description).toBe('Test command');
      expect(entry?.toolName).toBe('custom_test_cmd');
    });

    it('should reject command without template', () => {
      const command: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command'
      };

      expect(() => {
        registry.registerCommand('invalid_cmd', command);
      }).toThrow('Invalid command');
    });

    it('should reject command with invalid template', () => {
      const command: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command',
        template: 'echo {{invalid-param}}'
      };

      expect(() => {
        registry.registerCommand('invalid_cmd', command);
      }).toThrow('Invalid command');
    });

    it('should reject command with template parameter not in config', () => {
      const command: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command',
        template: 'echo {{message}}',
        parameters: {
          other: { type: 'string' }
        }
      };

      expect(() => {
        registry.registerCommand('invalid_cmd', command);
      }).toThrow('Template parameter \'message\' is not defined');
    });
  });

  describe('registerHotkey', () => {
    it('should register a valid hotkey', () => {
      const command: Command = {
        name: 't',
        description: 'Test hotkey',
        delegate: 'search_files'
      };

      registry.registerHotkey('t', command);
      expect(registry.hasHotkey('t')).toBe(true);

      const entry = registry.getHotkey('t');
      expect(entry?.command.description).toBe('Test hotkey');
      expect(entry?.command.delegate).toBe('search_files');
    });

    it('should reject invalid hotkey key', () => {
      const command: Command = {
        name: 'invalid',
        description: 'Invalid hotkey',
        delegate: 'search_files'
      };

      expect(() => {
        registry.registerHotkey('invalid', command);
      }).toThrow('Invalid hotkey key');
    });

    it('should reject hotkey without delegate', () => {
      const command: Command = {
        name: 't',
        description: 'Invalid hotkey'
      };

      expect(() => {
        registry.registerHotkey('t', command);
      }).toThrow('Invalid hotkey');
    });
  });

  describe('command management', () => {
    beforeEach(() => {
      registry.registerCommand('test_cmd', {
        name: 'test_cmd',
        description: 'Test command',
        template: 'echo {{message}}',
        parameters: { message: { type: 'string' } }
      });
      registry.registerHotkey('t', {
        name: 't',
        description: 'Test hotkey',
        delegate: 'search_files'
      });
    });

    it('should remove commands', () => {
      expect(registry.removeCommand('test_cmd')).toBe(true);
      expect(registry.hasCommand('test_cmd')).toBe(false);
      expect(registry.removeCommand('nonexistent')).toBe(false);
    });

    it('should remove hotkeys', () => {
      expect(registry.removeHotkey('t')).toBe(true);
      expect(registry.hasHotkey('t')).toBe(false);
      expect(registry.removeHotkey('x')).toBe(false);
    });

    it('should clear all commands and hotkeys', () => {
      registry.clear();
      expect(registry.getStats().commandCount).toBe(0);
      expect(registry.getStats().hotkeyCount).toBe(0);
    });

    it('should get custom tool names', () => {
      const toolNames = registry.getCustomToolNames();
      expect(toolNames).toContain('custom_test_cmd');
    });

    it('should export configuration', () => {
      const config = registry.exportConfig();
      expect(config.commands).toBeDefined();
      expect(config.hotkeys).toBeDefined();
      expect(config.commands?.test_cmd).toBeDefined();
      expect(config.hotkeys?.t).toBeDefined();
    });

    it('should provide help information', () => {
      const help = registry.getHelp();
      expect(help.commands).toHaveLength(1);
      expect(help.hotkeys).toHaveLength(1);
      expect(help.commands[0].name).toBe('test_cmd');
      expect(help.hotkeys[0].key).toBe('t');
    });
  });

  describe('validation', () => {
    it('should validate parameter names', () => {
      const validCommand: Command = {
        name: 'valid_cmd',
        description: 'Valid command',
        template: 'echo {{valid_param}}',
        parameters: {
          valid_param: { type: 'string' }
        }
      };

      expect(() => {
        registry.registerCommand('valid_cmd', validCommand);
      }).not.toThrow();
    });

    it('should reject invalid parameter names', () => {
      const invalidCommand: Command = {
        name: 'invalid_cmd',
        description: 'Invalid command',
        template: 'echo {{param}}',
        parameters: {
          'invalid-param': { type: 'string' }
        }
      };

      expect(() => {
        registry.registerCommand('invalid_cmd', invalidCommand);
      }).toThrow();
    });

    it('should validate enum parameters', () => {
      const command: Command = {
        name: 'enum_cmd',
        description: 'Enum command',
        template: 'log --level={{level}}',
        parameters: {
          level: { type: 'enum', enum: [] }
        }
      };

      expect(() => {
        registry.registerCommand('enum_cmd', command);
      }).toThrow('Enum parameter \'level\' must have at least one value');
    });
  });

  describe('statistics', () => {
    it('should return accurate statistics', () => {
      const initialStats = registry.getStats();
      expect(initialStats.commandCount).toBe(0);
      expect(initialStats.hotkeyCount).toBe(0);

      registry.registerCommand('cmd1', {
        name: 'cmd1',
        description: 'Command 1',
        template: 'echo 1'
      });
      registry.registerHotkey('h', {
        name: 'h',
        description: 'Hotkey 1',
        delegate: 'search_files'
      });

      const updatedStats = registry.getStats();
      expect(updatedStats.commandCount).toBe(1);
      expect(updatedStats.hotkeyCount).toBe(1);
    });
  });
});