class AppError extends Error {
    constructor(message, statusCode, code = null, errors = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;       // e.g., 'INSUFFICIENT_STOCK'
        this.errors = errors;   // { fieldName: 'message' }
        this.details = details; // { productId, available }
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export default AppError;