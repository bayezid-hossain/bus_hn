class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.keyValue = message.keyValue ? message.keyValue : '';
    this.statusCode = statusCode ? statusCode : message.code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorHandler;
