const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong';
    let code = err.code || null;
    let errors = err.errors || null;
    let details = err.details || null;

    // Handle Mongoose duplicate key (e.g., duplicate product code)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        statusCode = 409; // 409 Conflict for duplicates as per doc
        message = `This ${field} is already in use.`;
        errors = { [field]: `This ${field} is already taken.` };
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        statusCode = 422; // 422 Unprocessable Entity for validation
        message = 'Validation failed';
        errors = {};
        Object.keys(err.errors).forEach((key) => {
            errors[key] = err.errors[key].message;
        });
    }

    res.status(statusCode).json({
        message,
        ...(code && { code }),
        ...(errors && { errors }),
        ...(details && { details })
    });
};

export default errorHandler;