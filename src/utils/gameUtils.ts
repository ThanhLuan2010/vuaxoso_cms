/**
 * Kiểm tra xem một game có phải là game cược phái sinh ăn theo kết quả Xổ số Kiến Thiết (Đặc biệt là XSMB) hay không:
 * - Lô Đề 3 Miền (xoso_3mien, lode)
 * - Lô tô 2, 3, 5 Số (loto_235)
 * - Lô tô 2, 3, 4 Cặp (loto_cap)
 * - Bao Lô tô 2 Số (bao_loto_2)
 * - Trượt Lô tô 4, 8, 10 Cặp (truot_loto)
 * Các game này dùng chung bảng kết quả và lịch mở thưởng của đài XSKT Miền Bắc (MB)
 * nên KHÔNG có lồng quay số riêng và KHÔNG CẦN tạo kỳ quay (draw) độc lập.
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
    code === "loto_235" ||
    code === "loto_cap" ||
    code === "bao_loto_2" ||
    code === "truot_loto" ||
    code === "max_3d_pro" ||
    code === "max_3d_plus" ||
    name.includes("lô đề 3 miền") ||
    name.includes("lô tô 2, 3, 5") ||
    name.includes("lô tô 2, 3, 4") ||
    name.includes("bao lô tô 2") ||
    name.includes("trượt lô tô") ||
    name.includes("max 3d pro") ||
    name.includes("max 3d+")
  );
};
