import dayjs from 'dayjs';

/**
 * Kiểm tra xem một game có phải là game cược phái sinh ăn theo kết quả Xổ số Kiến Thiết 3 Miền hay không
 * (Ví dụ: Lô đề 3 miền).
 * Các game này dùng chung bảng kết quả và lịch mở thưởng của các đài XSKT (MB, MT, MN)
 * nên KHÔNG có lồng quay số riêng và KHÔNG CẦN kỳ quay (draw) độc lập.
 */
export const isDerived3MienGame = (gameOrId: any, gamesList?: any[]): boolean => {
  if (!gameOrId) return false;
  let game = gameOrId;
  if (typeof gameOrId === "string" && gamesList && gamesList.length > 0) {
    game = gamesList.find(g => g._id === gameOrId || g.code === gameOrId) || { code: gameOrId };
  }
  const code = (game.code || "").toLowerCase();
  const type = (game.type || "").toLowerCase();
  const name = (game.name || "").toLowerCase();

  return (
    type === "lode" ||
    code === "xoso_3mien" ||
    code === "lode" ||
    name.includes("lô đề 3 miền") ||
    code === "loto_235" ||
    code === "loto_cap" ||
    code === "truot_loto" ||
    code === "bao_loto_2"
  );
};

/**
 * Tính toán thời gian mở bán (openTime), chốt vé (closeTime) và xổ thưởng (drawTime) cho kỳ quay theo ngày trong tuần.
 * 
 * Quy tắc:
 * - Giờ chốt vé: 17h20 (17:20:00)
 * - Giờ xổ thưởng: 18h00 (18:00:00)
 * - Giờ mở của kỳ tiếp theo bằng giờ đóng của kỳ hiện tại (17h20 của ngày quay trước liền kề).
 * 
 * @param now Thời điểm hiện tại (dayjs object)
 * @param scheduleDays Mảng các ngày quay trong tuần (0: Chủ nhật, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7)
 */
export const getPeriodicWeeklyDrawTimes = (
  now: dayjs.Dayjs,
  scheduleDays: number[]
) => {
  // 1. Tìm closeTime của kỳ quay tiếp theo (hoặc hôm nay nếu hôm nay là ngày quay và chưa tới 17h20)
  let targetCloseTime: dayjs.Dayjs | null = null;
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = now.add(offset, 'day').hour(17).minute(20).second(0).millisecond(0);
    if (scheduleDays.includes(candidate.day())) {
      if (offset === 0) {
        if (now.isBefore(candidate)) {
          targetCloseTime = candidate;
          break;
        }
      } else {
        targetCloseTime = candidate;
        break;
      }
    }
  }

  if (!targetCloseTime) {
    targetCloseTime = now.hour(17).minute(20).second(0).millisecond(0);
  }

  // 2. Giờ xổ: 18h00
  const drawTime = targetCloseTime.clone().hour(18).minute(0).second(0).millisecond(0);

  // 3. Giờ mở của kỳ target = Giờ đóng (17h20) của ngày quay trước liền kề trong chu kỳ
  let openTime: dayjs.Dayjs | null = null;
  for (let back = 1; back <= 7; back++) {
    const prevCandidate = targetCloseTime.subtract(back, 'day').hour(17).minute(20).second(0).millisecond(0);
    if (scheduleDays.includes(prevCandidate.day())) {
      openTime = prevCandidate;
      break;
    }
  }

  if (!openTime) {
    openTime = targetCloseTime.subtract(1, 'day');
  }

  return { openTime, closeTime: targetCloseTime, drawTime };
};

