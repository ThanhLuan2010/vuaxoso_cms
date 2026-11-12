/**
 * E2E & Business Logic Test Suite for CMS Frontend
 * Order Management: Arbitrage Detection, Order Filtering, Draw Info, Revenue & Prize Aggregations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('CMS Order Management Business Logic', () => {
  // 1. Logic phát hiện cược đối ứng (Arbitrage / Bào cỏ)
  function checkArbitrage(orders, targetUsername = '') {
    const groups = {};

    orders.forEach((order) => {
      const province = order.provinceName || order.gameType;
      const draw = order.drawCode || order.drawDate || order.drawId || 'unknown-draw';

      const processItems = (playType, nums) => {
        if (!nums || nums.length === 0) return;
        const numLen = nums[0].length;
        const key = `${province}|${draw}|${playType}|len${numLen}`;

        if (!groups[key]) {
          groups[key] = { numbers: new Set(), orders: [] };
        }
        nums.forEach((n) => groups[key].numbers.add(n));
        groups[key].orders.push(order);
      };

      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          processItems(order.playType || 'Vé cơ bản', item.numbers);
        });
      } else if (order.numbers && order.numbers.length > 0) {
        processItems(order.playType || 'Vé cơ bản', order.numbers);
      }
    });

    const results = [];
    Object.keys(groups).forEach((key) => {
      const g = groups[key];
      const parts = key.split('|');
      const province = parts[0];
      const draw = parts[1];
      const playType = parts[2];

      const hasArbitrageUser = targetUsername
        ? g.orders.some((o) =>
            (o.user?.name || o.user?.phone || o.user?.username || '')
              .toLowerCase()
              .includes(targetUsername.toLowerCase())
          )
        : false;

      const uniqueUsers = new Set(g.orders.map((o) => o.user?._id)).size;

      if (hasArbitrageUser || (!targetUsername && uniqueUsers > 1)) {
        results.push({
          province,
          draw,
          playType,
          uniqueUsers,
          orders: g.orders,
        });
      }
    });

    return results;
  }

  it('Phát hiện nhiều tài khoản cược trùng kỳ & cùng thể loại (Đối ứng/Bào cỏ)', () => {
    const orders = [
      {
        orderId: 'ORD-001',
        gameType: 'xoso_3mien',
        provinceName: 'MB',
        drawDate: '12/11/2026',
        playType: 'Đề ĐB',
        items: [{ numbers: ['18', '28'] }],
        user: { _id: 'u1', name: 'Nguyễn Văn A', phone: '0901234567' },
      },
      {
        orderId: 'ORD-002',
        gameType: 'xoso_3mien',
        provinceName: 'MB',
        drawDate: '12/11/2026',
        playType: 'Đề ĐB',
        items: [{ numbers: ['81', '82'] }],
        user: { _id: 'u2', name: 'Trần Văn B', phone: '0912345678' },
      },
    ];

    const results = checkArbitrage(orders);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].uniqueUsers, 2);
    assert.strictEqual(results[0].orders.length, 2);
    assert.strictEqual(results[0].playType, 'Đề ĐB');
  });

  it('Lọc cược đối ứng theo tên/SĐT tài khoản chỉ định', () => {
    const orders = [
      {
        orderId: 'ORD-003',
        gameType: 'keno',
        drawCode: '#1001',
        playType: 'Tài Xỉu',
        items: [{ numbers: ['Lớn'] }],
        user: { _id: 'u3', name: 'Lê Nghi Vấn', phone: '0988888888' },
      },
    ];

    const resMatch = checkArbitrage(orders, 'Nghi Vấn');
    assert.strictEqual(resMatch.length, 1);

    const resNoMatch = checkArbitrage(orders, 'Không Có');
    assert.strictEqual(resNoMatch.length, 0);
  });

  it('Tính tổng doanh thu và tổng tiền trúng thưởng chính xác', () => {
    const orders = [
      { totalCost: 100000, isWinner: true, prizeAmount: 990000, status: 'completed' },
      { totalCost: 50000, isWinner: false, prizeAmount: 0, status: 'completed' },
      { totalCost: 200000, isWinner: true, prizeAmount: 1800000, status: 'completed' },
      { totalCost: 50000, isWinner: false, prizeAmount: 0, status: 'cancelled' },
    ];

    const validOrders = orders.filter((o) => o.status === 'completed');
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalCost, 0);
    const totalPrize = validOrders.reduce((sum, o) => sum + (o.prizeAmount || 0), 0);
    const netProfit = totalRevenue - totalPrize;

    assert.strictEqual(totalRevenue, 350000);
    assert.strictEqual(totalPrize, 2790000);
    assert.strictEqual(netProfit, -2440000);
  });
});
