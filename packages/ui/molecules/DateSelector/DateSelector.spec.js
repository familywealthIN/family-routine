/* eslint-env jest */
/**
 * Unit tests for MoleculeDateSelector component
 */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuetify from 'vuetify';
import DateSelector from './DateSelector.vue';

const localVue = createLocalVue();

describe('MoleculeDateSelector', () => {
  let vuetify;

  beforeEach(() => {
    vuetify = new Vuetify();
  });

  const createWrapper = (propsData = {}) => shallowMount(DateSelector, {
    localVue,
    vuetify,
    propsData: {
      value: '',
      period: 'day',
      ...propsData,
    },
  });

  describe('Component Initialization', () => {
    it('renders correctly with default props', () => {
      const wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.molecule-date-selector').exists()).toBe(true);
    });

    it('initializes with correct default period', () => {
      const wrapper = createWrapper();
      expect(wrapper.vm.internalPeriod).toBe('day');
    });

    it('accepts custom period prop', () => {
      const wrapper = createWrapper({ period: 'week' });
      expect(wrapper.vm.internalPeriod).toBe('week');
    });
  });

  describe('Period Toggle', () => {
    it('updates internal period when period prop changes', async () => {
      const wrapper = createWrapper({ period: 'day' });
      expect(wrapper.vm.internalPeriod).toBe('day');

      await wrapper.setProps({ period: 'month' });
      expect(wrapper.vm.internalPeriod).toBe('month');
    });

    it('emits update:period event when period changes', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.handlePeriodChange('week');

      expect(wrapper.emitted('update:period')).toBeTruthy();
      expect(wrapper.emitted('update:period')[0]).toEqual(['week']);
    });

    it('emits period-change event when period changes', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.handlePeriodChange('month');

      expect(wrapper.emitted('period-change')).toBeTruthy();
      expect(wrapper.emitted('period-change')[0]).toEqual(['month']);
    });

    it('sets date to 01-01-1970 when switching to lifetime', async () => {
      const wrapper = createWrapper({ value: '22-02-2026' });
      await wrapper.vm.handlePeriodChange('lifetime');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['01-01-1970']);
    });

    it('clears lifetime date when switching away from lifetime', async () => {
      const wrapper = createWrapper({ value: '01-01-1970', period: 'lifetime' });
      await wrapper.vm.handlePeriodChange('day');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['']);
    });
  });

  describe('Icon Display', () => {
    it('shows tree icon for lifetime period', () => {
      const wrapper = createWrapper({ period: 'lifetime', prependIcon: 'event' });
      expect(wrapper.vm.computedPrependIcon).toBe('mdi-tree');
    });

    it('shows calendar icon for non-lifetime periods', () => {
      const wrapper = createWrapper({ period: 'day', prependIcon: 'event' });
      expect(wrapper.vm.computedPrependIcon).toBe('event');
    });

    it('preserves custom icon for non-lifetime periods', () => {
      const wrapper = createWrapper({ period: 'week', prependIcon: 'custom-icon' });
      expect(wrapper.vm.computedPrependIcon).toBe('custom-icon');
    });
  });

  describe('Day Display Value', () => {
    it('displays "Today" for current date', () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const todayString = `${day}-${month}-${year}`;

      const wrapper = createWrapper({ value: todayString, period: 'day' });
      expect(wrapper.vm.displayValue).toBe('Today');
    });

    it('displays "Tomorrow" for next day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const year = tomorrow.getFullYear();
      const tomorrowString = `${day}-${month}-${year}`;

      const wrapper = createWrapper({ value: tomorrowString, period: 'day' });
      expect(wrapper.vm.displayValue).toBe('Tomorrow');
    });

    it('displays formatted date for other days', () => {
      const wrapper = createWrapper({ value: '15-03-2026', period: 'day' });
      expect(wrapper.vm.displayValue).toMatch(/Mar 15/);
    });
  });

  describe('Week Display Value', () => {
    it('displays "This Week" for current week', () => {
      const wrapper = createWrapper({ period: 'week' });
      const currentWeek = wrapper.vm.getCurrentWeek();
      wrapper.setProps({ value: currentWeek });

      expect(wrapper.vm.displayValue).toBe('This Week');
    });

    it('displays week number and year for other weeks', () => {
      const wrapper = createWrapper({ value: '2026-W10', period: 'week' });
      expect(wrapper.vm.displayValue).toBe('Week 10, 2026');
    });
  });

  describe('Month Display Value', () => {
    it('displays "This Month" for current month', () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${year}-${month}`;

      const wrapper = createWrapper({ value: currentMonth, period: 'month' });
      expect(wrapper.vm.displayValue).toBe('This Month');
    });

    it('displays month and year for other months', () => {
      const wrapper = createWrapper({ value: '2026-03', period: 'month' });
      expect(wrapper.vm.displayValue).toMatch(/Mar 2026/);
    });
  });

  describe('Year Display Value', () => {
    it('displays "This Year" for current year', () => {
      const currentYear = String(new Date().getFullYear());
      const wrapper = createWrapper({ value: currentYear, period: 'year' });
      expect(wrapper.vm.displayValue).toBe('This Year');
    });

    it('displays year number for other years', () => {
      const wrapper = createWrapper({ value: '2025', period: 'year' });
      expect(wrapper.vm.displayValue).toBe('2025');
    });
  });

  describe('Lifetime Display', () => {
    it('displays "Lifetime" for lifetime period', () => {
      const wrapper = createWrapper({ value: '01-01-1970', period: 'lifetime' });
      expect(wrapper.vm.displayValue).toBe('Lifetime');
    });
  });

  describe('ISO Week Calculation', () => {
    it('calculates current week correctly', () => {
      const wrapper = createWrapper();
      const currentWeek = wrapper.vm.getCurrentWeek();

      expect(currentWeek).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('generates correct number of weeks for standard year', () => {
      const wrapper = createWrapper();
      const weeks2025 = wrapper.vm.getWeeksOfYearISO(2025);

      expect(weeks2025.length).toBeGreaterThanOrEqual(52);
      expect(weeks2025.length).toBeLessThanOrEqual(53);
    });

    it('generates correct week numbers', () => {
      const wrapper = createWrapper();
      const weeks = wrapper.vm.getWeeksOfYearISO(2026);

      expect(weeks[0].weekNum).toBe(1);
      expect(weeks[0].value).toBe('2026-W01');
    });

    it('calculates week date ranges without invalid dates', () => {
      const wrapper = createWrapper();
      const range = wrapper.vm.getWeekDateRange(2026, 10);

      expect(range).not.toContain('Invalid');
      expect(range).toMatch(/\w{3} \d{1,2} - \w{3} \d{1,2}/);
    });

    it('handles week 1 correctly (ISO 8601)', () => {
      const wrapper = createWrapper();
      const range = wrapper.vm.getWeekDateRange(2026, 1);

      // Week 1 should contain the first Thursday
      expect(range).toBeDefined();
      expect(range).not.toContain('Invalid');
    });

    it('handles last week of year correctly', () => {
      const wrapper = createWrapper();
      const weeks = wrapper.vm.getWeeksOfYearISO(2026);
      const lastWeek = weeks[weeks.length - 1];
      const range = wrapper.vm.getWeekDateRange(2026, lastWeek.weekNum);

      expect(range).not.toContain('Invalid');
    });
  });

  describe('Month Generation', () => {
    it('generates all 12 months for a given year', () => {
      const wrapper = createWrapper();
      const months = wrapper.vm.getMonthsForYear(2026);

      expect(months.length).toBe(12);
    });

    it('generates months with correct format', () => {
      const wrapper = createWrapper();
      const months = wrapper.vm.getMonthsForYear(2026);

      expect(months[0].value).toBe('2026-01');
      expect(months[0].shortName).toBe('Jan');
      expect(months[11].value).toBe('2026-12');
      expect(months[11].shortName).toBe('Dec');
    });

    it('gets current month in correct format', () => {
      const wrapper = createWrapper();
      const currentMonth = wrapper.vm.getCurrentMonth();

      expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('Year Navigation', () => {
    it('navigates to previous year', () => {
      const wrapper = createWrapper();
      const initialYear = wrapper.vm.displayYear;

      wrapper.vm.navigateYear(-1);
      expect(wrapper.vm.displayYear).toBe(initialYear - 1);
    });

    it('navigates to next year', () => {
      const wrapper = createWrapper();
      const initialYear = wrapper.vm.displayYear;

      wrapper.vm.navigateYear(1);
      expect(wrapper.vm.displayYear).toBe(initialYear + 1);
    });
  });

  describe('Decade Navigation', () => {
    it('navigates to previous decade', () => {
      const wrapper = createWrapper();
      const initialDecade = wrapper.vm.decadeStart;

      wrapper.vm.navigateDecade(-1);
      expect(wrapper.vm.decadeStart).toBe(initialDecade - 12);
    });

    it('navigates to next decade', () => {
      const wrapper = createWrapper();
      const initialDecade = wrapper.vm.decadeStart;

      wrapper.vm.navigateDecade(1);
      expect(wrapper.vm.decadeStart).toBe(initialDecade + 12);
    });

    it('displays correct decade range', () => {
      const wrapper = createWrapper();
      wrapper.vm.decadeStart = 2020;

      expect(wrapper.vm.decadeRange).toBe('2020 - 2031');
    });
  });

  describe('Date Selection Handlers', () => {
    it('handles day selection and emits correct format', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.handleDaySelect('2026-03-15');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['15-03-2026']);
      expect(wrapper.emitted('change')).toBeTruthy();
    });

    it('handles week selection', async () => {
      const wrapper = createWrapper({ period: 'week' });
      await wrapper.vm.handleWeekSelect('2026-W10');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['2026-W10']);
    });

    it('handles month selection', async () => {
      const wrapper = createWrapper({ period: 'month' });
      await wrapper.vm.handleMonthSelect('2026-03');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['2026-03']);
    });

    it('handles year selection', async () => {
      const wrapper = createWrapper({ period: 'year' });
      await wrapper.vm.handleYearSelect('2026');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['2026']);
    });

    it('handles clear action', async () => {
      const wrapper = createWrapper({ value: '15-03-2026' });
      await wrapper.vm.handleClear();

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual(['']);
    });
  });

  describe('Quick Actions', () => {
    it('handles "Today" quick action', async () => {
      const wrapper = createWrapper({ period: 'day' });
      await wrapper.vm.handleToday();

      const today = new Date();
      const expectedDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual([expectedDate]);
    });

    it('handles "This Week" quick action', async () => {
      const wrapper = createWrapper({ period: 'week' });
      const currentWeek = wrapper.vm.getCurrentWeek();
      await wrapper.vm.handleThisWeek();

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual([currentWeek]);
    });

    it('handles "This Month" quick action', async () => {
      const wrapper = createWrapper({ period: 'month' });
      const currentMonth = wrapper.vm.getCurrentMonth();
      await wrapper.vm.handleThisMonth();

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual([currentMonth]);
    });

    it('handles "This Year" quick action', async () => {
      const wrapper = createWrapper({ period: 'year' });
      const currentYear = String(new Date().getFullYear());
      await wrapper.vm.handleThisYear();

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0]).toEqual([currentYear]);
    });
  });

  describe('Display Year Initialization', () => {
    it('initializes display year from day value', () => {
      const wrapper = createWrapper({ value: '15-03-2025', period: 'day' });
      wrapper.vm.initializeDisplayYear();

      expect(wrapper.vm.displayYear).toBe(2025);
    });

    it('initializes display year from week value', () => {
      const wrapper = createWrapper({ value: '2025-W10', period: 'week' });
      wrapper.vm.initializeDisplayYear();

      expect(wrapper.vm.displayYear).toBe(2025);
    });

    it('initializes display year from month value', () => {
      const wrapper = createWrapper({ value: '2025-03', period: 'month' });
      wrapper.vm.initializeDisplayYear();

      expect(wrapper.vm.displayYear).toBe(2025);
    });

    it('initializes display year from year value', () => {
      const wrapper = createWrapper({ value: '2025', period: 'year' });
      wrapper.vm.initializeDisplayYear();

      expect(wrapper.vm.displayYear).toBe(2025);
    });

    it('defaults to current year when no value provided', () => {
      const wrapper = createWrapper({ value: '', period: 'day' });
      wrapper.vm.initializeDisplayYear();

      expect(wrapper.vm.displayYear).toBe(new Date().getFullYear());
    });
  });

  describe('ISO Value Conversion', () => {
    it('converts DD-MM-YYYY to YYYY-MM-DD', () => {
      const wrapper = createWrapper({ value: '15-03-2026', period: 'day' });
      expect(wrapper.vm.isoValue).toBe('2026-03-15');
    });

    it('returns empty string for non-day periods', () => {
      const wrapper = createWrapper({ value: '2026-W10', period: 'week' });
      expect(wrapper.vm.isoValue).toBe('');
    });

    it('handles invalid date format gracefully', () => {
      const wrapper = createWrapper({ value: 'invalid', period: 'day' });
      expect(wrapper.vm.isoValue).toBe('');
    });
  });

  describe('Props Validation', () => {
    it('accepts valid period values', () => {
      const validPeriods = ['day', 'week', 'month', 'year', 'lifetime'];

      validPeriods.forEach((period) => {
        const wrapper = createWrapper({ period });
        expect(wrapper.vm.internalPeriod).toBe(period);
      });
    });

    it('accepts disabled prop', () => {
      const wrapper = createWrapper({ disabled: true });
      expect(wrapper.props().disabled).toBe(true);
    });

    it('accepts label prop', () => {
      const wrapper = createWrapper({ label: 'Custom Label' });
      expect(wrapper.props().label).toBe('Custom Label');
    });
  });

  describe('Edge Cases', () => {
    it('handles year boundary for weeks (week 53)', () => {
      const wrapper = createWrapper();
      // Test a year that has 53 weeks
      const weeks2020 = wrapper.vm.getWeeksOfYearISO(2020);

      expect(weeks2020.length).toBeGreaterThanOrEqual(52);
    });

    it('handles leap years correctly', () => {
      const wrapper = createWrapper();
      const months2024 = wrapper.vm.getMonthsForYear(2024);

      expect(months2024.length).toBe(12);
      expect(months2024[1].value).toBe('2024-02'); // February in leap year
    });

    it('handles invalid week number gracefully', () => {
      const wrapper = createWrapper();
      const range = wrapper.vm.getWeekDateRange(2026, 0);

      // Should not crash, even with week 0
      expect(range).toBeDefined();
    });
  });
});
