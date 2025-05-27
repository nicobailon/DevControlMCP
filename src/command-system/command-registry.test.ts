/**
 * Unit tests for CommandRegistry
 */

import { CommandRegistry } from './command-registry.js';
import { Command, CommandConfig } from './types.js';

// Simple test framework that doesn't require Jest
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  
  test(name: string, testFn: () => void | boolean | string): void {
    try {
      const result = testFn();
      
      if (typeof result === 'boolean') {
        this.results.push({ name, passed: result, error: result ? undefined : 'Test returned false' });
      } else if (typeof result === 'string') {
        this.results.push({ name, passed: false, error: result });
      } else {
        this.results.push({ name, passed: true });
      }
    } catch (error) {
      this.results.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  getResults() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    return { passed, failed: total - passed, results: this.results };
  }
}

// Test helper functions
function assertTrue(condition: boolean, message: string = 'Assertion failed'): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition: boolean, message: string = 'Assertion failed'): void {
  if (condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedError?: string): void {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedError && error instanceof Error && !error.message.includes(expectedError)) {
      throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`);
    }
  }
}

function assertNotThrows(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    throw new Error(`Expected function not to throw, but got: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function runCommandRegistryTests(): { passed: number; failed: number } {
  const runner = new TestRunner();
  
  // Test: loadFromConfig - basic functionality
  runner.test('should load commands and hotkeys from configuration', () => {
    const registry = new CommandRegistry();
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

    assertTrue(registry.hasCommand('test_cmd'));
    assertTrue(registry.hasHotkey('t'));
  });

  // Test: loadFromConfig - clears existing configuration
  runner.test('should clear existing configuration before loading', () => {
    const registry = new CommandRegistry();
    
    // Load initial config
    registry.loadFromConfig({
      commands: { cmd1: { description: 'Command 1', template: 'echo 1' } }
    });
    assertTrue(registry.hasCommand('cmd1'));

    // Load new config
    registry.loadFromConfig({
      commands: { cmd2: { description: 'Command 2', template: 'echo 2' } }
    });
    assertFalse(registry.hasCommand('cmd1'));
    assertTrue(registry.hasCommand('cmd2'));
  });

  // Test: loadFromConfig - handles empty configuration
  runner.test('should handle empty configuration', () => {
    const registry = new CommandRegistry();
    registry.loadFromConfig({});
    assertEqual(registry.getStats().commandCount, 0);
    assertEqual(registry.getStats().hotkeyCount, 0);
  });

  // Test: configuration validation - valid commands
  runner.test('should validate commands during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const validConfig: CommandConfig = {
      commands: {
        test_cmd: {
          description: 'Test command',
          template: 'echo {{message}}',
          parameters: {
            message: { type: 'string', required: true }
          }
        }
      }
    };

    assertNotThrows(() => {
      registry.loadFromConfig(validConfig);
    });
    
    assertTrue(registry.hasCommand('test_cmd'));
    const entry = registry.getCommand('test_cmd');
    assertEqual(entry?.command.description, 'Test command');
    assertEqual(entry?.toolName, 'custom_test_cmd');
  });

  // Test: configuration validation - reject command without template
  runner.test('should reject command without template during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const invalidConfig: CommandConfig = {
      commands: {
        invalid_cmd: {
          description: 'Invalid command'
        } as any
      }
    };

    assertThrows(() => {
      registry.loadFromConfig(invalidConfig);
    }, 'Invalid command');
  });

  // Test: configuration validation - reject command with invalid template
  runner.test('should reject command with invalid template during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const invalidConfig: CommandConfig = {
      commands: {
        invalid_cmd: {
          description: 'Invalid command',
          template: 'echo {{invalid-param}}'
        }
      }
    };

    assertThrows(() => {
      registry.loadFromConfig(invalidConfig);
    }, 'Invalid command');
  });

  // Test: configuration validation - reject command with missing template parameters
  runner.test('should reject command with template parameter not in config during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const invalidConfig: CommandConfig = {
      commands: {
        invalid_cmd: {
          description: 'Invalid command',
          template: 'echo {{message}}',
          parameters: {
            other: { type: 'string' }
          }
        }
      }
    };

    assertThrows(() => {
      registry.loadFromConfig(invalidConfig);
    }, 'Template parameter \'message\' is not defined');
  });

  // Test: configuration validation - valid hotkeys
  runner.test('should validate hotkeys during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const validConfig: CommandConfig = {
      hotkeys: {
        t: {
          description: 'Test hotkey',
          delegate: 'search_files'
        }
      }
    };

    assertNotThrows(() => {
      registry.loadFromConfig(validConfig);
    });
    
    assertTrue(registry.hasHotkey('t'));
    const entry = registry.getHotkey('t');
    assertEqual(entry?.command.description, 'Test hotkey');
    assertEqual(entry?.command.delegate, 'search_files');
  });

  // Test: configuration validation - reject invalid hotkey key
  runner.test('should reject invalid hotkey key during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const invalidConfig: CommandConfig = {
      hotkeys: {
        invalid: {
          description: 'Invalid hotkey',
          delegate: 'search_files'
        }
      }
    };

    assertThrows(() => {
      registry.loadFromConfig(invalidConfig);
    }, 'Invalid hotkey key');
  });

  // Test: configuration validation - reject hotkey without delegate
  runner.test('should reject hotkey without delegate during loadFromConfig', () => {
    const registry = new CommandRegistry();
    const invalidConfig: CommandConfig = {
      hotkeys: {
        t: {
          description: 'Invalid hotkey'
        } as any
      }
    };

    assertThrows(() => {
      registry.loadFromConfig(invalidConfig);
    }, 'Invalid hotkey');
  });

  // Test: default hotkeys integration - merged config
  runner.test('should work with merged default configuration', () => {
    const registry = new CommandRegistry();
    // Import defaults here to test integration
    const { mergeWithDefaults } = require('./defaults.js');
    
    const userConfig = {};
    const mergedConfig = mergeWithDefaults(userConfig);
    registry.loadFromConfig(mergedConfig);
    
    assertTrue(registry.hasHotkey('c'));
    assertTrue(registry.hasHotkey('s'));
    assertTrue(registry.hasHotkey('p'));
    assertTrue(registry.hasHotkey('l'));
    assertTrue(registry.hasHotkey('h'));
    assertTrue(registry.hasHotkey('k'));
    
    const hotkeyC = registry.getHotkey('c');
    assertEqual(hotkeyC?.command.delegate, 'get_config');
  });

  // Test: default hotkeys integration - user overrides
  runner.test('should allow user hotkeys to override defaults', () => {
    const registry = new CommandRegistry();
    const { mergeWithDefaults } = require('./defaults.js');
    
    const userConfig = {
      hotkeys: {
        c: {
          description: 'Custom config hotkey',
          delegate: 'list_processes'
        }
      }
    };
    const mergedConfig = mergeWithDefaults(userConfig);
    registry.loadFromConfig(mergedConfig);
    
    const hotkeyC = registry.getHotkey('c');
    assertEqual(hotkeyC?.command.delegate, 'list_processes');
    assertEqual(hotkeyC?.command.description, 'Custom config hotkey');
    
    // Other defaults should still be present
    assertTrue(registry.hasHotkey('s'));
    assertTrue(registry.hasHotkey('p'));
  });

  // Test: configuration and help - custom tool names
  runner.test('should get custom tool names', () => {
    const registry = new CommandRegistry();
    registry.loadFromConfig({
      commands: {
        test_cmd: {
          description: 'Test command',
          template: 'echo {{message}}',
          parameters: { message: { type: 'string' } }
        }
      }
    });
    
    const toolNames = registry.getCustomToolNames();
    assertTrue(toolNames.includes('custom_test_cmd'));
  });

  // Test: configuration and help - export configuration
  runner.test('should export configuration', () => {
    const registry = new CommandRegistry();
    registry.loadFromConfig({
      commands: {
        test_cmd: {
          description: 'Test command',
          template: 'echo {{message}}',
          parameters: { message: { type: 'string' } }
        }
      },
      hotkeys: {
        t: {
          description: 'Test hotkey',
          delegate: 'search_files'
        }
      }
    });
    
    const config = registry.exportConfig();
    assertTrue(config.commands !== undefined);
    assertTrue(config.hotkeys !== undefined);
    assertTrue(config.commands?.test_cmd !== undefined);
    assertTrue(config.hotkeys?.t !== undefined);
  });

  // Test: configuration and help - help information
  runner.test('should provide help information', () => {
    const registry = new CommandRegistry();
    registry.loadFromConfig({
      commands: {
        test_cmd: {
          description: 'Test command',
          template: 'echo {{message}}',
          parameters: { message: { type: 'string' } }
        }
      },
      hotkeys: {
        t: {
          description: 'Test hotkey',
          delegate: 'search_files'
        }
      }
    });
    
    const help = registry.getHelp();
    assertEqual(help.commands.length, 1);
    assertEqual(help.hotkeys.length, 1);
    assertEqual(help.commands[0].name, 'test_cmd');
    assertEqual(help.hotkeys[0].key, 't');
  });

  // Test: validation - parameter names
  runner.test('should validate parameter names', () => {
    const registry = new CommandRegistry();
    const validCommand: Command = {
      name: 'valid_cmd',
      description: 'Valid command',
      template: 'echo {{valid_param}}',
      parameters: {
        valid_param: { type: 'string' }
      }
    };

    assertNotThrows(() => {
      registry.registerCommand('valid_cmd', validCommand);
    });
  });

  // Test: validation - reject invalid parameter names
  runner.test('should reject invalid parameter names', () => {
    const registry = new CommandRegistry();
    const invalidCommand: Command = {
      name: 'invalid_cmd',
      description: 'Invalid command',
      template: 'echo {{param}}',
      parameters: {
        'invalid-param': { type: 'string' }
      }
    };

    assertThrows(() => {
      registry.registerCommand('invalid_cmd', invalidCommand);
    });
  });

  // Test: validation - enum parameters
  runner.test('should validate enum parameters', () => {
    const registry = new CommandRegistry();
    const command: Command = {
      name: 'enum_cmd',
      description: 'Enum command',
      template: 'log --level={{level}}',
      parameters: {
        level: { type: 'enum', enum: [] }
      }
    };

    assertThrows(() => {
      registry.registerCommand('enum_cmd', command);
    }, 'Enum parameter \'level\' must have at least one value');
  });

  // Test: statistics
  runner.test('should return accurate statistics', () => {
    const registry = new CommandRegistry();
    const initialStats = registry.getStats();
    assertEqual(initialStats.commandCount, 0);
    assertEqual(initialStats.hotkeyCount, 0);

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
    assertEqual(updatedStats.commandCount, 1);
    assertEqual(updatedStats.hotkeyCount, 1);
  });

  const results = runner.getResults();
  
  // Print results
  console.log(`\n=== CommandRegistry Tests ===`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\nFailures:');
    results.results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
  }
  
  return { passed: results.passed, failed: results.failed };
}

// Export for manual testing
if (import.meta.url === `file://${process.argv[1]}`) {
  runCommandRegistryTests();
}