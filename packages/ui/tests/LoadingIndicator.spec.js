const LoadingIndicator = require('../atoms/LoadingIndicator/LoadingIndicator.vue').default;

describe('LoadingIndicator', () => {
    it('has the correct component name', () => {
        expect(LoadingIndicator.name).toBe('AtomLoadingIndicator');
    });

    it('defines loading prop with default false', () => {
        expect(LoadingIndicator.props.loading.type).toBe(Boolean);
        expect(LoadingIndicator.props.loading.default).toBe(false);
    });

    it('defines message prop with default empty string', () => {
        expect(LoadingIndicator.props.message.type).toBe(String);
        expect(LoadingIndicator.props.message.default).toBe('');
    });

    it('defines size prop with default 40', () => {
        expect(LoadingIndicator.props.size.default).toBe(40);
    });

    it('defines width prop with default 4', () => {
        expect(LoadingIndicator.props.width.default).toBe(4);
    });

    it('accepts String or Number for size and width', () => {
        expect(LoadingIndicator.props.size.type).toEqual([String, Number]);
        expect(LoadingIndicator.props.width.type).toEqual([String, Number]);
    });
});
