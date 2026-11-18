import { test, describe } from 'node:test';
import assert from 'node:assert';
import dayjs from 'dayjs';
import { getPeriodicWeeklyDrawTimes } from '../utils/gameUtils.ts';

describe('Draw Timing Management - Chu kỳ quay các game Vietlott & Điện Toán', () => {

  describe('Power 6/55 & Max3D Pro: Thứ 3, 5, 7 - 17h20 chốt, 18h xổ', () => {
    const days = [2, 4, 6];

    test('Trước giờ chốt ngày Thứ 3 (10:00 sáng Thứ 3) -> Kỳ chốt Thứ 3 17:20, mở từ Thứ 7 tuần trước 17:20', () => {
      // 2026-11-17 là Thứ 3
      const now = dayjs('2026-11-17T10:00:00');
      assert.strictEqual(now.day(), 2);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-17 17:20:00');
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-17 18:00:00');
      // Kỳ trước là Thứ 7 (2026-11-14)
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-14 17:20:00');
      assert.strictEqual(openTime.day(), 6);
    });

    test('Sau giờ chốt ngày Thứ 3 (18:30 tối Thứ 3) -> Kỳ tiếp theo là Thứ 5, mở lúc Thứ 3 17:20', () => {
      const now = dayjs('2026-11-17T18:30:00');
      assert.strictEqual(now.day(), 2);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-19 17:20:00'); // Thứ 5
      assert.strictEqual(closeTime.day(), 4);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-19 18:00:00');
      // Giờ mở của Thứ 5 là giờ đóng của Thứ 3 (2026-11-17 17:20:00)
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-17 17:20:00');
      assert.strictEqual(openTime.day(), 2);
    });

    test('Sau giờ chốt ngày Thứ 5 (18:30 tối Thứ 5) -> Kỳ tiếp theo là Thứ 7, mở lúc Thứ 5 17:20', () => {
      const now = dayjs('2026-11-19T18:30:00');
      assert.strictEqual(now.day(), 4);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 17:20:00'); // Thứ 7
      assert.strictEqual(closeTime.day(), 6);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-19 17:20:00'); // Thứ 5
      assert.strictEqual(openTime.day(), 4);
    });

    test('Sau giờ chốt ngày Thứ 7 (18:30 tối Thứ 7) -> Kỳ tiếp theo là Thứ 3 tuần sau, mở lúc Thứ 7 17:20', () => {
      const now = dayjs('2026-11-21T18:30:00');
      assert.strictEqual(now.day(), 6);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-24 17:20:00'); // Thứ 3 tuần sau
      assert.strictEqual(closeTime.day(), 2);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-24 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 17:20:00'); // Thứ 7
      assert.strictEqual(openTime.day(), 6);
    });
  });

  describe('Mega 6/45: Thứ 4, 6, Chủ nhật - 17h20 chốt, 18h xổ', () => {
    const days = [3, 5, 0];

    test('Trước giờ chốt Thứ 4 (12:00 trưa Thứ 4) -> Chốt Thứ 4 17:20, mở từ CN tuần trước 17:20', () => {
      // 2026-11-18 là Thứ 4
      const now = dayjs('2026-11-18T12:00:00');
      assert.strictEqual(now.day(), 3);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 17:20:00');
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-15 17:20:00'); // Chủ nhật
      assert.strictEqual(openTime.day(), 0);
    });

    test('Sau giờ chốt Thứ 4 (18:30 Thứ 4) -> Kỳ tiếp theo là Thứ 6, mở lúc Thứ 4 17:20', () => {
      const now = dayjs('2026-11-18T18:30:00');
      assert.strictEqual(now.day(), 3);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-20 17:20:00'); // Thứ 6
      assert.strictEqual(closeTime.day(), 5);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-20 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 17:20:00'); // Thứ 4
      assert.strictEqual(openTime.day(), 3);
    });

    test('Sau giờ chốt Chủ nhật (19:00 CN) -> Kỳ tiếp theo là Thứ 4, mở lúc CN 17:20', () => {
      const now = dayjs('2026-11-15T19:00:00');
      assert.strictEqual(now.day(), 0);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 17:20:00'); // Thứ 4
      assert.strictEqual(closeTime.day(), 3);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-15 17:20:00'); // CN
      assert.strictEqual(openTime.day(), 0);
    });
  });

  describe('Max3D / Max3D+: Thứ 2, 4, 6 - 17h20 chốt, 18h xổ', () => {
    const days = [1, 3, 5];

    test('Trước giờ chốt Thứ 2 -> Chốt Thứ 2 17:20, mở từ Thứ 6 tuần trước 17:20', () => {
      // 2026-11-16 là Thứ 2
      const now = dayjs('2026-11-16T11:00:00');
      assert.strictEqual(now.day(), 1);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-16 17:20:00');
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-16 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-13 17:20:00'); // Thứ 6 tuần trước
      assert.strictEqual(openTime.day(), 5);
    });

    test('Sau giờ chốt Thứ 6 -> Kỳ tiếp theo là Thứ 2 tuần sau, mở lúc Thứ 6 17:20', () => {
      // 2026-11-20 là Thứ 6
      const now = dayjs('2026-11-20T18:00:00');
      assert.strictEqual(now.day(), 5);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-23 17:20:00'); // Thứ 2 tuần sau
      assert.strictEqual(closeTime.day(), 1);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-23 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-20 17:20:00'); // Thứ 6
      assert.strictEqual(openTime.day(), 5);
    });
  });

  describe('ĐIỆN TOÁN 6X36: Thứ 4, 7 - 17h20 chốt, 18h xổ', () => {
    const days = [3, 6];

    test('Trước giờ chốt Thứ 4 -> Chốt Thứ 4 17:20, mở từ Thứ 7 tuần trước 17:20', () => {
      // 2026-11-18 là Thứ 4
      const now = dayjs('2026-11-18T09:00:00');
      assert.strictEqual(now.day(), 3);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 17:20:00');
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-14 17:20:00'); // Thứ 7 tuần trước
      assert.strictEqual(openTime.day(), 6);
    });

    test('Sau giờ chốt Thứ 4 (19:00 Thứ 4) -> Kỳ tiếp theo là Thứ 7, mở lúc Thứ 4 17:20', () => {
      const now = dayjs('2026-11-18T19:00:00');
      assert.strictEqual(now.day(), 3);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 17:20:00'); // Thứ 7
      assert.strictEqual(closeTime.day(), 6);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-18 17:20:00'); // Thứ 4
      assert.strictEqual(openTime.day(), 3);
    });

    test('Sau giờ chốt Thứ 7 (19:00 Thứ 7) -> Kỳ tiếp theo là Thứ 4 tuần sau, mở lúc Thứ 7 17:20', () => {
      const now = dayjs('2026-11-21T19:00:00');
      assert.strictEqual(now.day(), 6);

      const { openTime, closeTime, drawTime } = getPeriodicWeeklyDrawTimes(now, days);

      assert.strictEqual(closeTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-25 17:20:00'); // Thứ 4 tuần sau
      assert.strictEqual(closeTime.day(), 3);
      assert.strictEqual(drawTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-25 18:00:00');
      assert.strictEqual(openTime.format('YYYY-MM-DD HH:mm:ss'), '2026-11-21 17:20:00'); // Thứ 7
      assert.strictEqual(openTime.day(), 6);
    });
  });

});
