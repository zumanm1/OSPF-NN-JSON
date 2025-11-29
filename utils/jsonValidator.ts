export interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
    detectedFormat?: 'topology' | 'pyats' | 'scenario' | 'unified' | 'unknown';
    warnings?: string[];
}

/**
 * Validates topology JSON structure
 * Requires: nodes array
 */
export function validateTopologyJSON(data: any): ValidationResult {
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errorMessage: 'Invalid JSON structure: Expected an object',
            detectedFormat: 'unknown'
        };
    }

    if (!data.nodes) {
        return {
            isValid: false,
            errorMessage: 'Missing required field: "nodes" array',
            detectedFormat: 'unknown'
        };
    }

    if (!Array.isArray(data.nodes)) {
        return {
            isValid: false,
            errorMessage: 'Invalid "nodes" field: Must be an array',
            detectedFormat: 'topology'
        };
    }

    if (data.nodes.length === 0) {
        return {
            isValid: true,
            detectedFormat: 'topology',
            warnings: ['Topology contains zero nodes']
        };
    }

    // Validate node structure
    const invalidNodes = data.nodes.filter((n: any, idx: number) => {
        if (!n || typeof n !== 'object') return true;
        if (!n.id || typeof n.id !== 'string') return true;
        return false;
    });

    if (invalidNodes.length > 0) {
        return {
            isValid: false,
            errorMessage: `Invalid node structure: ${invalidNodes.length} node(s) missing required "id" field`,
            detectedFormat: 'topology'
        };
    }

    return {
        isValid: true,
        detectedFormat: 'topology'
    };
}

/**
 * Validates PyATS automation export JSON structure
 * Requires: files array
 */
export function validatePyATSJSON(data: any): ValidationResult {
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errorMessage: 'Invalid JSON structure: Expected an object',
            detectedFormat: 'unknown'
        };
    }

    if (!data.files) {
        return {
            isValid: false,
            errorMessage: 'Missing required field: "files" array (PyATS format)',
            detectedFormat: 'unknown'
        };
    }

    if (!Array.isArray(data.files)) {
        return {
            isValid: false,
            errorMessage: 'Invalid "files" field: Must be an array',
            detectedFormat: 'pyats'
        };
    }

    return {
        isValid: true,
        detectedFormat: 'pyats'
    };
}

/**
 * Validates scenario planner JSON structure
 * Requires: array of scenario changes
 */
export function validateScenarioJSON(data: any): ValidationResult {
    if (!Array.isArray(data)) {
        return {
            isValid: false,
            errorMessage: 'Invalid scenario format: Expected an array of changes',
            detectedFormat: 'unknown'
        };
    }

    const invalidChanges = data.filter((change: any) => {
        if (!change || typeof change !== 'object') return true;
        if (!change.edgeId || !change.newCost) return true;
        return false;
    });

    if (invalidChanges.length > 0) {
        return {
            isValid: false,
            errorMessage: `Invalid scenario changes: ${invalidChanges.length} change(s) missing required fields (edgeId, newCost)`,
            detectedFormat: 'scenario'
        };
    }

    return {
        isValid: true,
        detectedFormat: 'scenario'
    };
}

/**
 * Auto-detects format and validates imported JSON
 * Supports: topology (nodes), PyATS (files), scenario (array), unified format
 */
export function validateImportedJSON(data: any): ValidationResult {
    // Check for valid JSON structure
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errorMessage: 'Invalid JSON structure: File is not a valid JSON object',
            detectedFormat: 'unknown'
        };
    }

    // Check for unified format (versioned wrapper)
    if (data.version && data.type === 'ospf-topology' && data.data) {
        const nestedValidation = validateImportedJSON(data.data);
        if (nestedValidation.isValid) {
            return {
                ...nestedValidation,
                detectedFormat: 'unified'
            };
        }
        return nestedValidation;
    }

    // Check for topology format (nodes array)
    if (data.nodes && Array.isArray(data.nodes)) {
        return validateTopologyJSON(data);
    }

    // Check for PyATS format (files array)
    if (data.files && Array.isArray(data.files)) {
        return validatePyATSJSON(data);
    }

    // Check for scenario format (array of changes)
    if (Array.isArray(data)) {
        return validateScenarioJSON(data);
    }

    // No recognized format
    return {
        isValid: false,
        errorMessage: 'Unrecognized file format. File must contain either:\n• A "nodes" array (topology file)\n• A "files" array (PyATS automation export)\n• An array of scenario changes',
        detectedFormat: 'unknown'
    };
}

/**
 * Validates exported JSON before download
 * Ensures the export contains valid structure
 */
export function validateExportedJSON(data: any): ValidationResult {
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errorMessage: 'Export validation failed: Invalid data structure',
            detectedFormat: 'unknown'
        };
    }

    // For unified format exports
    if (data.version && data.type === 'ospf-topology') {
        if (!data.data || !data.data.nodes) {
            return {
                isValid: false,
                errorMessage: 'Export validation failed: Missing nodes data in unified format',
                detectedFormat: 'unified'
            };
        }
        return validateTopologyJSON(data.data);
    }

    // For direct topology exports
    if (data.nodes) {
        return validateTopologyJSON(data);
    }

    return {
        isValid: false,
        errorMessage: 'Export validation failed: No valid export format detected',
        detectedFormat: 'unknown'
    };
}
