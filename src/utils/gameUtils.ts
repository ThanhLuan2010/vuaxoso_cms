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
    name.includes("lô đề 3 miền")
  );
};
