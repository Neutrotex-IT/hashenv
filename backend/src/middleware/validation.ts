import { body, param, query, ValidationChain } from 'express-validator';
import { isValidObjectId } from './security';
import { isValidEnvSlug, normalizeEnvSlug } from '../lib/environments';

/**
 * Enhanced input validation middleware
 */

// Re-export isValidObjectId for use in routes
export { isValidObjectId };

/**
 * Validate MongoDB ObjectId parameter
 */
export const validateObjectId = (paramName: string = 'id'): ValidationChain => {
  return param(paramName).custom((value) => {
    if (!isValidObjectId(value)) {
      throw new Error(`Invalid ${paramName} format`);
    }
    return true;
  });
};

/**
 * Validate project ID parameter
 * Note: Routes use either :id or :projectId as the parameter name
 * This validation checks both parameter names and validates whichever is present
 */
export const validateProjectId = (): ValidationChain => {
  return param('id')
    .optional()
    .custom((value, { req }) => {
      // Get the project ID from either parameter
      const projectId = req.params?.id || req.params?.projectId;
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      if (!isValidObjectId(projectId)) {
        throw new Error('Invalid project ID format');
      }
      return true;
    });
};

/**
 * Validate env file ID parameter
 */
export const validateEnvFileId = (): ValidationChain => {
  return param('envFileId').custom((value) => {
    if (!isValidObjectId(value)) {
      throw new Error('Invalid environment file ID format');
    }
    return true;
  });
};

/**
 * Validate user ID parameter
 */
export const validateUserId = (): ValidationChain => {
  return param('userId').custom((value) => {
    if (!isValidObjectId(value)) {
      throw new Error('Invalid user ID format');
    }
    return true;
  });
};

/**
 * Enhanced password validation
 */
export const validatePassword = (): ValidationChain => {
  return body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .isLength({ max: 128 })
    .withMessage('Password must be less than 128 characters');
};

/**
 * Validate email format
 */
export const validateEmail = (): ValidationChain => {
  return body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters');
};

/**
 * Validate project name
 */
export const validateProjectName = (): ValidationChain => {
  return body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Project name can only contain letters, numbers, spaces, hyphens, and underscores');
};

/**
 * Validate environment slug in request body
 */
export const validateEnvironment = (): ValidationChain => {
  return body('environment')
    .trim()
    .notEmpty()
    .withMessage('Environment is required')
    .custom((value) => {
      if (!isValidEnvSlug(value)) {
        throw new Error(
          'Environment must be 2-32 lowercase characters, start with a letter, and use only letters, numbers, and hyphens'
        );
      }
      return true;
    })
    .customSanitizer((value) => normalizeEnvSlug(value));
};

/**
 * Validate environment query parameter (optional slug)
 */
export const validateEnvironmentQuery = (): ValidationChain => {
  return query('environment')
    .optional()
    .custom((value) => {
      if (value && !isValidEnvSlug(value)) {
        throw new Error('Invalid environment slug');
      }
      return true;
    })
    .customSanitizer((value) => (value ? normalizeEnvSlug(value) : value));
};

/**
 * Validate environment slug in URL param
 */
export const validateEnvironmentSlugParam = (): ValidationChain => {
  return param('slug')
    .trim()
    .notEmpty()
    .withMessage('Environment slug is required')
    .custom((value) => {
      if (!isValidEnvSlug(value)) {
        throw new Error('Invalid environment slug');
      }
      return true;
    })
    .customSanitizer((value) => normalizeEnvSlug(value));
};

/**
 * Validate new environment name in body (for create/rename)
 */
export const validateEnvironmentName = (): ValidationChain => {
  return body('name')
    .trim()
    .notEmpty()
    .withMessage('Environment name is required')
    .custom((value) => {
      if (!isValidEnvSlug(value)) {
        throw new Error(
          'Environment name must be 2-32 lowercase characters, start with a letter, and use only letters, numbers, and hyphens'
        );
      }
      return true;
    })
    .customSanitizer((value) => normalizeEnvSlug(value));
};

/**
 * Validate file content size (50KB limit)
 */
export const validateFileContent = (): ValidationChain => {
  return body('content')
    .isString()
    .withMessage('Content must be a string')
    .custom((value) => {
      if (value && value.length > 50 * 1024) {
        throw new Error('Content size must be less than 50KB');
      }
      return true;
    });
};

/**
 * Validate permission type
 */
export const validatePermission = (): ValidationChain => {
  return body('permission')
    .isIn(['read', 'write'])
    .withMessage('Permission must be "read" or "write"');
};

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove null bytes and trim
  return input.replace(/\0/g, '').trim();
}

/**
 * Sanitize MongoDB query to prevent NoSQL injection
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return {};
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Prevent MongoDB operators in user input
    if (key.startsWith('$')) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
