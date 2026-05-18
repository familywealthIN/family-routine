const getEmailfromSession = require('../src/utils/getEmailfromSession');
const ApiError = require('../src/utils/ApiError');

describe('getEmailfromSession', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('returns hardcoded email in development mode', () => {
        process.env.NODE_ENV = 'development';
        const email = getEmailfromSession({});
        expect(email).toBe('grvpanchalus@gmail.com');
    });

    it('returns email from decoded token in production', () => {
        process.env.NODE_ENV = 'production';
        const context = { decodedToken: { email: 'user@example.com' } };
        const email = getEmailfromSession(context);
        expect(email).toBe('user@example.com');
    });

    it('throws ApiError when no token in production', () => {
        process.env.NODE_ENV = 'production';
        expect(() => getEmailfromSession({})).toThrow(ApiError);
    });

    it('throws ApiError with 401 status when token has no email', () => {
        process.env.NODE_ENV = 'production';
        try {
            getEmailfromSession({ decodedToken: {} });
        } catch (err) {
            expect(err).toBeInstanceOf(ApiError);
            expect(err.statusCode()).toBe(401);
        }
    });
});
