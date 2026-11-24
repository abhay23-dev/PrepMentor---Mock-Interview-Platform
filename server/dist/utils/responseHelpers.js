"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = "success", statusCode = 200) => {
    const response = {
        success: true,
        data,
        message,
    };
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=responseHelpers.js.map