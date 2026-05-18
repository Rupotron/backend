"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    error: 'Validation Error',
                    details: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }))
                });
            }
            next(error);
        }
    };
};
exports.validate = validate;
