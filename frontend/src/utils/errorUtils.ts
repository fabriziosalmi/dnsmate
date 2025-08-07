/**
 * Utility functions for handling API errors consistently across the application
 */

export interface APIError {
  message?: string;
  errors?: string[];
  detail?: string | { message?: string; errors?: string[] };
}

/**
 * Extract a user-friendly error message from API error responses
 * Handles both simple string errors and complex error objects
 */
export function getErrorMessage(error: any, fallbackMessage: string = 'An error occurred'): string {
  // Direct error message
  if (typeof error === 'string') {
    return error;
  }

  // Check for response.data.detail (most common case)
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    // Simple string detail
    if (typeof detail === 'string') {
      return detail;
    }
    
    // Complex object detail
    if (typeof detail === 'object') {
      let message = detail.message || fallbackMessage;
      
      // Append specific errors if available
      if (detail.errors && Array.isArray(detail.errors)) {
        message += ': ' + detail.errors.join(', ');
      }
      
      return message;
    }
  }

  // Check for response.data.message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for direct error message
  if (error?.message) {
    return error.message;
  }

  // Fallback
  return fallbackMessage;
}

/**
 * Extract detailed error information including individual error items
 */
export function getDetailedErrorInfo(error: any): { message: string; errors: string[] } {
  const message = getErrorMessage(error);
  let errors: string[] = [];

  if (error?.response?.data?.detail?.errors && Array.isArray(error.response.data.detail.errors)) {
    errors = error.response.data.detail.errors;
  }

  return { message, errors };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string[]> | string[]): string {
  if (Array.isArray(errors)) {
    return errors.join(', ');
  }

  if (typeof errors === 'object') {
    return Object.entries(errors)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join('; ');
  }

  return 'Validation failed';
}
