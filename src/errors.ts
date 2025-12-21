/**
 * Custom error classes for Clara
 */

export class ClaraError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ClaraError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ClaraParseError extends ClaraError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ClaraParseError';
  }
}

export class ClaraValidationError extends ClaraError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ClaraValidationError';
  }
}

export class ClaraNetworkError extends ClaraError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ClaraNetworkError';
  }
}

export class ClaraConfigError extends ClaraError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ClaraConfigError';
  }
}
