const ApiError = require('../src/utils/ApiError');

describe('ApiError', () => {
    it('creates an error with default status 401', () => {
        const error = new ApiError();
        expect(error.name).toBe('ApiError');
        expect(error.networkStatus).toBe(401);
        expect(error).toBeInstanceOf(Error);
    });

    it('creates an error with a custom status code', () => {
        const error = new ApiError(404, 'Not found');
        expect(error.networkStatus).toBe(404);
        expect(error.message).toBe('Not found');
    });

    it('statusCode() returns the network status', () => {
        const error = new ApiError(500, 'Server error');
        expect(error.statusCode()).toBe(500);
    });

    it('captures a stack trace', () => {
        const error = new ApiError(400, 'Bad request');
        expect(error.stack).toBeDefined();
    });
});
