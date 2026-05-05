"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const err = error;
                return res.status(400).json({
                    error: 'Validation Error',
                    details: err.errors.map((e) => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};
exports.validate = validate;
