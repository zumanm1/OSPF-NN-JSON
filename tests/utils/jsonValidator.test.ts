import { describe, it, expect } from 'vitest';
import { 
  validateTopologyJSON, 
  validateImportedJSON,
  validatePyATSJSON,
  validateScenarioJSON,
  validateExportedJSON 
} from '../../utils/jsonValidator';

describe('JSON Validator', () => {
  const validNode = {
    id: 'test-r1',
    name: 'test-r1',
    hostname: 'test-r1',
    loopback_ip: '172.16.1.1',
    country: 'USA',
    is_active: true,
    node_type: 'router',
    neighbor_count: 2,
  };

  describe('validateTopologyJSON', () => {
    it('should validate valid topology data', () => {
      const data = {
        nodes: [
          validNode,
          { ...validNode, id: 'test-r2', loopback_ip: '172.16.2.2' },
        ],
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('topology');
    });

    it('should validate empty nodes array with warning', () => {
      const data = {
        nodes: [],
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Topology contains zero nodes');
    });

    it('should reject missing nodes field', () => {
      const data = {
        links: [],
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Missing required field: "nodes"');
    });

    it('should reject non-array nodes', () => {
      const data = {
        nodes: 'not an array',
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Must be an array');
    });

    it('should reject nodes without id field', () => {
      const data = {
        nodes: [{ name: 'test' }],
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('missing required "id" field');
    });

    it('should reject nodes with non-string id', () => {
      const data = {
        nodes: [{ id: 123 }],
      };

      const result = validateTopologyJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('missing required "id" field');
    });
  });

  describe('validateImportedJSON', () => {
    it('should detect and validate topology format', () => {
      const data = {
        nodes: [validNode],
        links: [],
      };

      const result = validateImportedJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('topology');
    });

    it('should detect and validate PyATS format', () => {
      const data = {
        files: [
          { filename: 'router1.txt', content: 'config data' },
        ],
      };

      const result = validateImportedJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('pyats');
    });

    it('should detect and validate scenario format', () => {
      const data = [
        { edgeId: 'edge1', newCost: 20 },
        { edgeId: 'edge2', newCost: 30 },
      ];

      const result = validateImportedJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('scenario');
    });

    it('should detect and validate unified format', () => {
      const data = {
        version: '1.0',
        type: 'ospf-topology',
        data: {
          nodes: [validNode],
          links: [],
        },
      };

      const result = validateImportedJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('unified');
    });

    it('should reject invalid JSON structure', () => {
      const result = validateImportedJSON(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not a valid JSON object');
    });

    it('should reject unrecognized format', () => {
      const data = {
        random: 'data',
        unknown: 'format',
      };

      const result = validateImportedJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unrecognized file format');
    });
  });

  describe('validatePyATSJSON', () => {
    it('should validate valid PyATS data', () => {
      const data = {
        files: [
          { filename: 'r1.txt', content: 'show version' },
          { filename: 'r2.txt', content: 'show ip ospf' },
        ],
      };

      const result = validatePyATSJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('pyats');
    });

    it('should reject missing files field', () => {
      const data = { automation: [] };

      const result = validatePyATSJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Missing required field: "files"');
    });

    it('should reject non-array files', () => {
      const data = { files: 'not-an-array' };

      const result = validatePyATSJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Must be an array');
    });
  });

  describe('validateScenarioJSON', () => {
    it('should validate valid scenario data', () => {
      const data = [
        { edgeId: 'e1', newCost: 10 },
        { edgeId: 'e2', newCost: 20 },
      ];

      const result = validateScenarioJSON(data);
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('scenario');
    });

    it('should reject non-array scenario data', () => {
      const data = { changes: [] };

      const result = validateScenarioJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Expected an array');
    });

    it('should reject invalid scenario changes', () => {
      const data = [
        { edgeId: 'e1' }, // Missing newCost
        { newCost: 20 },  // Missing edgeId
      ];

      const result = validateScenarioJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('missing required fields');
    });
  });

  describe('validateExportedJSON', () => {
    it('should validate topology export', () => {
      const data = {
        nodes: [validNode],
        links: [],
      };

      const result = validateExportedJSON(data);
      expect(result.isValid).toBe(true);
    });

    it('should validate unified format export', () => {
      const data = {
        version: '1.0',
        type: 'ospf-topology',
        data: {
          nodes: [validNode],
          links: [],
        },
      };

      const result = validateExportedJSON(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid export structure', () => {
      const data = {
        random: 'data',
      };

      const result = validateExportedJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No valid export format detected');
    });

    it('should reject unified format without nodes', () => {
      const data = {
        version: '1.0',
        type: 'ospf-topology',
        data: {
          links: [],
        },
      };

      const result = validateExportedJSON(data);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Missing nodes data');
    });
  });
});
