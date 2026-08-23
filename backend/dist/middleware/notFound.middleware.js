import { NotFoundError } from '../utils/errors.js';
export function notFoundHandler(req, _res, next) {
    next(new NotFoundError(`Endpoint '${req.method} ${req.originalUrl}' does not exist`));
}
