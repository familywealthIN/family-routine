const ModeIndicator = require('../atoms/ModeIndicator/ModeIndicator.vue').default;

describe('ModeIndicator', () => {
    it('has the correct component name', () => {
        expect(ModeIndicator.name).toBe('AtomModeIndicator');
    });

    it('requires mode prop', () => {
        expect(ModeIndicator.props.mode.required).toBe(true);
        expect(ModeIndicator.props.mode.type).toBe(String);
    });

    it('validates mode to only accept task or goals', () => {
        const validator = ModeIndicator.props.mode.validator;
        expect(validator('task')).toBe(true);
        expect(validator('goals')).toBe(true);
        expect(validator('invalid')).toBe(false);
    });

    it('defaults showLabel to false', () => {
        expect(ModeIndicator.props.showLabel.default).toBe(false);
    });

    it('defaults size to 24', () => {
        expect(ModeIndicator.props.size.default).toBe(24);
    });

    it('has computed properties for icon, iconColor, and label', () => {
        expect(ModeIndicator.computed.icon).toBeDefined();
        expect(ModeIndicator.computed.iconColor).toBeDefined();
        expect(ModeIndicator.computed.label).toBeDefined();
    });
});
