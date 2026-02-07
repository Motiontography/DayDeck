jest.mock('expo-notifications', () => ({}));

import { isInQuietHours } from '../services/notificationService';

describe('isInQuietHours', () => {
  describe('non-spanning (same day) quiet hours', () => {
    const quietStart = '13:00';
    const quietEnd = '15:00';

    it('returns true when date is within quiet hours', () => {
      const date = new Date(2026, 0, 5, 14, 0); // 2:00 PM
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(true);
    });

    it('returns true at the exact start time', () => {
      const date = new Date(2026, 0, 5, 13, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(true);
    });

    it('returns false at the exact end time (exclusive)', () => {
      const date = new Date(2026, 0, 5, 15, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });

    it('returns false before quiet hours', () => {
      const date = new Date(2026, 0, 5, 12, 59);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });

    it('returns false after quiet hours', () => {
      const date = new Date(2026, 0, 5, 15, 1);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });
  });

  describe('midnight-spanning quiet hours', () => {
    const quietStart = '22:00';
    const quietEnd = '07:00';

    it('returns true late at night (after start)', () => {
      const date = new Date(2026, 0, 5, 23, 30);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(true);
    });

    it('returns true early morning (before end)', () => {
      const date = new Date(2026, 0, 6, 5, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(true);
    });

    it('returns true at exact start', () => {
      const date = new Date(2026, 0, 5, 22, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(true);
    });

    it('returns false at exact end (exclusive)', () => {
      const date = new Date(2026, 0, 6, 7, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });

    it('returns false during the day', () => {
      const date = new Date(2026, 0, 5, 12, 0);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });

    it('returns false just before start', () => {
      const date = new Date(2026, 0, 5, 21, 59);
      expect(isInQuietHours(date, quietStart, quietEnd)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles midnight as start', () => {
      expect(isInQuietHours(new Date(2026, 0, 5, 0, 0), '00:00', '06:00')).toBe(true);
    });

    it('handles quiet hours with minutes', () => {
      expect(isInQuietHours(new Date(2026, 0, 5, 22, 29), '22:30', '07:00')).toBe(false);
      expect(isInQuietHours(new Date(2026, 0, 5, 22, 30), '22:30', '07:00')).toBe(true);
    });
  });
});
