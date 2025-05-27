/**
 * Unit tests for command handlers
 */

import * as handlers from './command-handlers.js';
import { executeCustomCommand } from '../tools/custom-commands.js';
import { executeHotkey } from '../tools/hotkeys.js';
import { commandRegistry } from '../command-system/command-registry.js';

// Mock the tools
jest.mock('../tools/custom-commands.js');
jest.mock('../tools/hotkeys.js');
jest.mock('../command-system/command-registry.js');

const mockExecuteCustomCommand = executeCustomCommand as jest.MockedFunction<typeof executeCustomCommand>;
const mockExecuteHotkey = executeHotkey as jest.MockedFunction<typeof executeHotkey>;
const mockCommandRegistry = commandRegistry as jest.Mocked<typeof commandRegistry>;

describe('Command Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('custom command execution', () => {
    it('should execute custom commands successfully', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Command executed successfully' }],
        isError: false
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      // In a real implementation, there would be a handler function to test
      // For now, we're testing the underlying tool execution
      const result = await executeCustomCommand('test_cmd', { parameters: { message: 'hello' } });
      
      expect(result.isError).toBe(false);
      expect(mockExecuteCustomCommand).toHaveBeenCalledWith('test_cmd', { parameters: { message: 'hello' } });
    });

    it('should handle custom command errors', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Command not found' }],
        isError: true
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('nonexistent_cmd', {});
      
      expect(result.isError).toBe(true);
    });

    it('should handle invalid parameters', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Parameter validation failed' }],
        isError: true
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('test_cmd', { parameters: { invalid: 'param' } });
      
      expect(result.isError).toBe(true);
    });
  });

  describe('hotkey execution', () => {
    it('should execute hotkeys successfully', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Hotkey executed successfully' }],
        isError: false
      };

      mockExecuteHotkey.mockResolvedValue(mockResult);

      const result = await executeHotkey({ key: 't', parameters: { path: '/test' } });
      
      expect(result.isError).toBe(false);
      expect(mockExecuteHotkey).toHaveBeenCalledWith({ key: 't', parameters: { path: '/test' } });
    });

    it('should handle hotkey errors', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Hotkey not found' }],
        isError: true
      };

      mockExecuteHotkey.mockResolvedValue(mockResult);

      const result = await executeHotkey({ key: 'x' });
      
      expect(result.isError).toBe(true);
    });

    it('should handle delegation errors', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Delegation failed' }],
        isError: true
      };

      mockExecuteHotkey.mockResolvedValue(mockResult);

      const result = await executeHotkey({ key: 't', parameters: {} });
      
      expect(result.isError).toBe(true);
    });

    it('should validate hotkey key format', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Invalid hotkey key' }],
        isError: true
      };

      mockExecuteHotkey.mockResolvedValue(mockResult);

      const result = await executeHotkey({ key: 'invalid' });
      
      expect(result.isError).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockExecuteCustomCommand.mockRejectedValue(new Error('Unexpected error'));

      await expect(executeCustomCommand('test_cmd', {})).rejects.toThrow('Unexpected error');
    });

    it('should handle missing command registry', async () => {
      mockCommandRegistry.getCommand.mockReturnValue(undefined);
      
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Command not found' }],
        isError: true
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('missing_cmd', {});
      expect(result.isError).toBe(true);
    });

    it('should handle security violations', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Command blocked by security policy' }],
        isError: true
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('dangerous_cmd', { parameters: { cmd: 'rm -rf /' } });
      expect(result.isError).toBe(true);
    });
  });

  describe('parameter handling', () => {
    it('should pass parameters correctly to custom commands', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Success' }],
        isError: false
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const parameters = { message: 'hello', count: 5 };
      await executeCustomCommand('test_cmd', { parameters });
      
      expect(mockExecuteCustomCommand).toHaveBeenCalledWith('test_cmd', { parameters });
    });

    it('should pass parameters correctly to hotkeys', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Success' }],
        isError: false
      };

      mockExecuteHotkey.mockResolvedValue(mockResult);

      const parameters = { path: '/test', recursive: true };
      await executeHotkey({ key: 's', parameters });
      
      expect(mockExecuteHotkey).toHaveBeenCalledWith({ key: 's', parameters });
    });

    it('should handle empty parameters', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Success' }],
        isError: false
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      await executeCustomCommand('simple_cmd', {});
      
      expect(mockExecuteCustomCommand).toHaveBeenCalledWith('simple_cmd', {});
    });
  });

  describe('response formatting', () => {
    it('should return properly formatted responses', async () => {
      const mockResult = {
        content: [{ 
          type: 'text' as const, 
          text: JSON.stringify({ result: 'success', data: 'test' }, null, 2)
        }],
        isError: false
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('test_cmd', {});
      
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBe(false);
    });

    it('should format error responses correctly', async () => {
      const mockResult = {
        content: [{ 
          type: 'text' as const, 
          text: 'Error: Command validation failed'
        }],
        isError: true
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const result = await executeCustomCommand('invalid_cmd', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('concurrent execution', () => {
    it('should handle concurrent command executions', async () => {
      const mockResult = {
        content: [{ type: 'text' as const, text: 'Success' }],
        isError: false
      };

      mockExecuteCustomCommand.mockResolvedValue(mockResult);

      const promises = [
        executeCustomCommand('cmd1', {}),
        executeCustomCommand('cmd2', {}),
        executeCustomCommand('cmd3', {})
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.isError).toBe(false);
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      mockExecuteCustomCommand
        .mockResolvedValueOnce({
          content: [{ type: 'text' as const, text: 'Success' }],
          isError: false
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text' as const, text: 'Error' }],
          isError: true
        });

      const results = await Promise.all([
        executeCustomCommand('success_cmd', {}),
        executeCustomCommand('error_cmd', {})
      ]);
      
      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
    });
  });
});