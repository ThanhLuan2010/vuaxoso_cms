import { CameraOutlined, CheckCircleOutlined, MoreOutlined, UploadOutlined, DownloadOutlined, WarningOutlined, EyeOutlined, ReloadOutlined, FilterOutlined, EditOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Divider, Input, message, Modal, Popover, Row, Space, Statistic, Table, Tag, Typography, Upload, Radio, Select, InputNumber, Checkbox, Alert } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const { Title, Text } = Typography;

interface Order {
  _id: string;
  orderId: string;
  gameType: string;
  playType?: string;
  drawId?: any;
  drawDate?: string;
  drawCode?: string;
  draw?: any;
  period?: string;
  provinceName?: string;
  items?: Array<{
    id?: string;
    numbers: string[];
    cost: number;
    baseCost?: number;
  }>;
  numbers?: string[];
  totalCost: number;
  status: string;
  createdAt: string;
  user: { _id: string; name: string; phone: string };
  ticketImageUrl?: string;
  isWinner?: boolean;
  prizeAmount?: number;
  winningNumbers?: string[];
  adminNote?: string;
}


const calculateCostPerNum = (record: any): number | undefined => {
  let baseCost: number | undefined;

  if (record.items && record.items.length > 0) {
    const item0 = record.items[0];
    if (item0.baseCost !== undefined && item0.baseCost > 0) baseCost = item0.baseCost;
    else if (item0.multiplier !== undefined && item0.multiplier > 0) baseCost = item0.multiplier;
    else if (item0.unitAmount !== undefined && item0.unitAmount > 0) baseCost = item0.unitAmount;
  }

  if (baseCost === undefined || baseCost <= 0) {
    let count = 0;
    if (record.items && record.items.length > 0) {
      record.items.forEach((item: any) => count += (item.numbers ? item.numbers.length : 0));
    } else if (record.numbers) {
      count = record.numbers.length;
    }

    if (count > 0 && record.totalCost > 0) {
      const pType = (record.playType || '').toLowerCase();
      const gType = (record.gameType || '').toLowerCase();

      if (pType.includes('lô 2 số') || pType.includes('lo 2 so')) {
        const mult = gType === 'mb' ? 27 : 18;
        baseCost = Math.round(record.totalCost / count / mult);
      } else if (pType.includes('lô giải 6') || pType.includes('lo giai 6')) {
        baseCost = Math.round(record.totalCost / count / 3);
      } else if (pType.includes('lô giải 4') || pType.includes('lo giai 4')) {
        baseCost = Math.round(record.totalCost / count / 7);
      } else if (pType.includes('lô giải 3') || pType.includes('lo giai 3') || pType.includes('lô giải 5') || pType.includes('lo giai 5')) {
        baseCost = Math.round(record.totalCost / count / 6);
      } else if (pType.includes('lô 3 số') || pType.includes('lo 3 so')) {
        const mult = gType === 'mb' ? 23 : 17;
        baseCost = Math.round(record.totalCost / count / mult);
      } else if (pType.includes('lô 4 số') || pType.includes('lo 4 so')) {
        const mult = gType === 'mb' ? 20 : 16;
        baseCost = Math.round(record.totalCost / count / mult);
      } else if (pType.includes('bao 2 số') || pType.includes('bao lô tô 2 số')) {
        baseCost = Math.round(record.totalCost / count / 13.5);
      } else if (pType.includes('lô tô 5 số')) {
        baseCost = Math.round(record.totalCost / count / 27);
      } else if (pType.includes('lô tô 2 số') || pType.includes('lô tô 3 số') || pType.includes('lô tô 4 số') || gType.includes('loto')) {
        baseCost = Math.round(record.totalCost / count / 4);
      } else {
        baseCost = Math.round(record.totalCost / count);
      }
    }
  }

  return baseCost;
};

const getOrderProvinceName = (record: Order): string => {
  const gameNames: Record<string, string> = {
    loto_235: 'LÔ TÔ 2,3,5',
    loto_cap: 'LÔ TÔ CẶP',
    dientoan_636: 'ĐIỆN TOÁN 6X36',
    truot_loto: 'TRƯỢT LÔ TÔ',
    than_tai_4: 'THẦN TÀI 4',
    power_655: 'POWER 6/55',
    mega_645: 'MEGA 6/45',
    max_3d: 'MAX 3D',
    max_4d: 'MAX 4D',
    keno: 'KENO',
    bao_keno: 'BAO KENO',
    bingo18: 'BINGO18',
  };
  return record.provinceName || gameNames[record.gameType] || (record.gameType ? record.gameType.toUpperCase() : '-');
};

const getOrderResult = (record: Order): 'win' | 'lose' | 'pending' | 'cancelled' => {
  if (record.status === 'cancelled') return 'cancelled';
  if (!record.winningNumbers || record.winningNumbers.length === 0) {
    if (record.status === 'completed') {
      if (record.isWinner || (record.prizeAmount && record.prizeAmount > 0)) return 'win';
      return 'lose';
    }
    return 'pending';
  }
  if (record.isWinner || (record.prizeAmount && record.prizeAmount > 0)) {
    return 'win';
  }
  return 'lose';
};

const getOrderDrawInfo = (record: any, drawMap?: Record<string, any>) => {
  if (!record) return { displayCode: null, displayDate: null };

  let code: string | null = null;
  let date: string | null = null;

  // 1. Direct drawCode / period
  if (record.drawCode) {
    code = String(record.drawCode);
  } else if (record.period) {
    code = String(record.period);
  }

  // 2. Populated or embedded draw object
  if (typeof record.draw === 'object' && record.draw !== null) {
    if (!code && record.draw.drawCode) code = String(record.draw.drawCode);
    if (!code && record.draw.period) code = String(record.draw.period);
    if (!code && record.draw.code) code = String(record.draw.code);
    if (!date) date = record.draw.drawDate || record.draw.drawTime || record.draw.closeTime || record.draw.openTime;
  } else if (typeof record.draw === 'string' && record.draw) {
    if (record.draw.startsWith('#') || (!/^[0-9a-fA-F]{24}$/.test(record.draw) && !record.draw.includes('/') && !record.draw.includes('-'))) {
      if (!code) code = record.draw;
    }
  }

  // 3. Populated or string drawId
  if (typeof record.drawId === 'object' && record.drawId !== null) {
    if (!code && record.drawId.drawCode) code = String(record.drawId.drawCode);
    if (!code && record.drawId.period) code = String(record.drawId.period);
    if (!code && record.drawId.code) code = String(record.drawId.code);
    if (!date) date = record.drawId.drawDate || record.drawId.drawTime || record.drawId.closeTime || record.drawId.openTime;
  } else if (typeof record.drawId === 'string' && record.drawId) {
    const dId = record.drawId.trim();
    if (dId.startsWith('#')) {
      if (!code) code = dId;
    } else if (/^[0-9a-fA-F]{24}$/.test(dId)) {
      if (drawMap && drawMap[dId]) {
        const found = drawMap[dId];
        if (!code && found.drawCode) code = String(found.drawCode);
        if (!date) date = found.drawDate || found.drawTime || found.closeTime || found.openTime;
      }
    } else if (dId.includes('/') || (dId.includes('-') && dId.length >= 8)) {
      if (!date) date = dId;
    } else {
      if (!code) code = dId;
    }
  }

  // 4. Fallback date from record.drawDate
  if (!date && record.drawDate) {
    date = record.drawDate;
  }

  // Format code
  let displayCode: string | null = null;
  if (code) {
    const trimmed = code.trim();
    displayCode = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  // Format date
  let displayDate: string | null = null;
  if (date) {
    let rawDate = String(date).trim();
    if (rawDate.length === 10 && rawDate.includes('/')) {
      displayDate = rawDate;
    } else if (dayjs(rawDate).isValid()) {
      const parsed = dayjs(rawDate);
      if (parsed.hour() !== 0 || parsed.minute() !== 0) {
        displayDate = parsed.format('HH:mm:ss DD/MM/YYYY');
      } else {
        displayDate = parsed.format('DD/MM/YYYY');
      }
    } else {
      displayDate = rawDate;
    }

    if (displayDate && displayDate.length === 10 && displayDate.includes('/')) {
      const gType = (record.gameType || '').toLowerCase();
      if (gType === 'xsmn' || gType === 'mn') displayDate = `16:15:00 ${displayDate}`;
      else if (gType === 'xsmt' || gType === 'mt') displayDate = `17:15:00 ${displayDate}`;
      else if (gType === 'xsmb' || gType === 'mb') displayDate = `18:15:00 ${displayDate}`;
    }
  }

  return { displayCode, displayDate };
};

export default function OrderManagement() {
  const { isMasterAdmin } = useAuthStore();
  const isMaster = isMasterAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [drawMap, setDrawMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [editResultModalVisible, setEditResultModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editResultStatus, setEditResultStatus] = useState<'win' | 'lose' | 'pending' | 'cancelled'>('pending');
  const [editPrizeAmount, setEditPrizeAmount] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [editAdjustBalance, setEditAdjustBalance] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResultOrder, setSelectedResultOrder] = useState<Order | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ticketLink, setTicketLink] = useState('');

  const [arbitrageModalVisible, setArbitrageModalVisible] = useState(false);
  const [arbitrageUsername, setArbitrageUsername] = useState('');
  const [arbitrageResults, setArbitrageResults] = useState<any[]>([]);

  const [searchText, setSearchText] = useState('');

  const [selectedTicketOrder, setSelectedTicketOrder] = useState<any>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [autoOpenOrderId, setAutoOpenOrderId] = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  const [minBet, setMinBet] = useState('');
  const [minWin, setMinWin] = useState('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [isServerPaginated, setIsServerPaginated] = useState<boolean>(false);
  const [provincesList, setProvincesList] = useState<string[]>([]);

  useEffect(() => {
    api.get('/provinces/admin').then(res => {
      if (Array.isArray(res.data)) {
        setProvincesList(res.data.map((p: any) => p.name).filter(Boolean));
      }
    }).catch(() => {});
  }, []);

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [summaryData, setSummaryData] = useState({
    totalTickets: 0,
    totalSales: 0,
    totalPrize: 0,
    totalLoss: 0,
    winCount: 0,
    loseCount: 0,
    pendingCount: 0,
    cancelledCount: 0
  });

  const [userSummaryData, setUserSummaryData] = useState<{
    totalTickets: number;
    totalSales: number;
    totalPrize: number;
    totalLoss: number;
    winCount: number;
    loseCount: number;
    pendingCount: number;
    cancelledCount: number;
  } | null>(null);
  const [searchedKeyword, setSearchedKeyword] = useState<string>('');
  const [loadingUserSummary, setLoadingUserSummary] = useState<boolean>(false);

  const fetchSummary = async (range = dateRange) => {
    try {
      const params: any = {};
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/orders/admin/summary', { params });
      setSummaryData(res.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchUserSummary = async (
    searchVal: string, 
    range = dateRange, 
    resFilter = resultFilter, 
    provFilter = provinceFilter,
    betMin = minBet,
    winMin = minWin
  ) => {
    const trimmed = (searchVal || '').trim();
    if (!trimmed) {
      setUserSummaryData(null);
      setSearchedKeyword('');
      return;
    }
    try {
      setLoadingUserSummary(true);
      const params: any = { search: trimmed };
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }
      if (resFilter && resFilter !== 'all') params.result = resFilter;
      if (provFilter && provFilter !== 'all') params.province = provFilter;
      if (betMin) params.minBet = betMin;
      if (winMin) params.minWin = winMin;

      const res = await api.get('/orders/admin/summary', { params });
      let data = res.data;

      // Safety check: if remote backend returned global data ignoring search
      if (summaryData.totalTickets > 0 && data.totalTickets === summaryData.totalTickets && orders.length > 0) {
        let uTickets = 0;
        let uSales = 0;
        let uPrize = 0;
        let uWin = 0;
        let uLose = 0;
        let uPending = 0;
        let uCancelled = 0;

        orders.forEach((o: any) => {
          if (o.status === 'cancelled') {
            uCancelled++;
            return;
          }
          uTickets++;
          uSales += o.totalCost || 0;
          if (o.isWinner || (o.prizeAmount && o.prizeAmount > 0)) {
            uPrize += o.prizeAmount || 0;
            uWin++;
          } else if (!o.winningNumbers || o.winningNumbers.length === 0) {
            uPending++;
          } else {
            uLose++;
          }
        });

        data = {
          totalTickets: totalOrders > 0 ? totalOrders : uTickets,
          totalSales: uSales,
          totalPrize: uPrize,
          totalLoss: uSales - uPrize,
          winCount: uWin,
          loseCount: uLose,
          pendingCount: uPending,
          cancelledCount: uCancelled
        };
      }

      setUserSummaryData(data);
      setSearchedKeyword(trimmed);
    } catch (err) {
      console.error('Error fetching user summary:', err);
    } finally {
      setLoadingUserSummary(false);
    }
  };

  const fetchOrders = async (
    pageIndex: number = currentPage,
    limitCount: number = pageSize,
    searchValue: string = searchText,
    range = dateRange,
    resFilter: string = resultFilter,
    provFilter: string = provinceFilter,
    betMin: string = minBet,
    winMin: string = minWin
  ) => {
    try {
      setLoading(true);
      const params: any = {
        page: pageIndex,
        limit: limitCount,
      };
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }
      if (searchValue) params.search = searchValue;
      if (resFilter && resFilter !== 'all') params.result = resFilter;
      if (provFilter && provFilter !== 'all') params.province = provFilter;
      if (betMin) params.minBet = betMin;
      if (winMin) params.minWin = winMin;

      const res = await api.get('/orders/admin', { params });
      if (res.data && Array.isArray(res.data.orders)) {
        setOrders(res.data.orders);
        setTotalOrders(res.data.total ?? res.data.orders.length);
        setIsServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
        setTotalOrders(res.data.length);
        setIsServerPaginated(false);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Lỗi khi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchOrders(1, pageSize, searchText, dateRange, resultFilter, provinceFilter, minBet, minWin);
    fetchSummary(dateRange);
  }, [dateRange]);

  useEffect(() => {
    const fetchDrawsMap = async () => {
      try {
        const res = await api.get('/draws/admin', { params: { limit: 500 } });
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const map: Record<string, any> = {};
        list.forEach((d: any) => {
          if (d._id) map[d._id] = d;
        });
        setDrawMap(map);
      } catch (err) {
        // Silently catch if not supported
      }
    };
    fetchDrawsMap();
  }, []);

  const handleOpenUpload = (record: Order) => {
    setSelectedOrder(record);
    setFileList([]);
    setTicketLink('');
    setUploadModalVisible(true);
  };

  const handleUpload = async () => {
    if (!selectedOrder || (fileList.length === 0 && !ticketLink)) {
      message.warning('Vui lòng chọn ảnh hoặc nhập link ảnh');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = ticketLink;

      if (fileList.length > 0) {
        const formData = new FormData();
        formData.append('image', fileList[0].originFileObj);

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        imageUrl = uploadRes.data.url;
      }

      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';
        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      await api.put(`/orders/admin/${selectedOrder._id}`, {
        status: 'completed',
        ticketImageUrl: imageUrl
      });

      message.success('Tải ảnh và hoàn thành đơn thành công');
      setUploadModalVisible(false);
      fetchOrders();
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi upload vé');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEditResult = (record: Order) => {
    setEditingOrder(record);
    const res = getOrderResult(record);
    setEditResultStatus(res);
    setEditPrizeAmount(record.prizeAmount || 0);
    setEditReason(record.adminNote || '');
    setEditAdjustBalance(true);
    setEditResultModalVisible(true);
  };

  const handleSubmitEditResult = async () => {
    if (!editingOrder) return;
    if (!editReason || !editReason.trim()) {
      message.error('Vui lòng nhập lý do/ghi chú sửa kết quả để lưu vào Nhật ký hoạt động');
      return;
    }

    if (editResultStatus === 'win' && (!editPrizeAmount || editPrizeAmount <= 0)) {
      message.error('Vui lòng nhập số tiền thắng lớn hơn 0 khi chọn trạng thái Thắng');
      return;
    }

    try {
      setSubmittingEdit(true);
      const isWin = editResultStatus === 'win';
      const prize = isWin ? Number(editPrizeAmount) || 0 : 0;
      let targetStatus = editingOrder.status;
      if (editResultStatus === 'win' || editResultStatus === 'lose') {
        targetStatus = 'completed';
      } else if (editResultStatus === 'pending') {
        targetStatus = 'pending';
      } else if (editResultStatus === 'cancelled') {
        targetStatus = 'cancelled';
      }

      await api.put(`/orders/admin/${editingOrder._id}`, {
        isWinner: isWin,
        prizeAmount: prize,
        status: targetStatus,
        note: editReason.trim(),
        adjustBalance: editAdjustBalance
      });

      message.success('Đã cập nhật vé cược và ghi nhận vào Lịch sử hoạt động thành công!');
      setEditResultModalVisible(false);
      setEditingOrder(null);
      fetchOrders();
      fetchSummary();
      if (searchedKeyword) {
        fetchUserSummary(searchedKeyword);
      }
    } catch (error: any) {
      console.error('Update order result error:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật vé cược');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCheckArbitrage = () => {
    const groups: Record<string, { numbers: Set<string>, orders: any[] }> = {};

    filteredOrders.forEach(order => {
      const province = order.provinceName || order.gameType;
      const { displayCode, displayDate } = getOrderDrawInfo(order, drawMap);
      const draw = displayCode || displayDate || order.drawDate || order.drawId || 'unknown-draw';
      
      const processItems = (playType: string, nums: string[]) => {
        if (!nums || nums.length === 0) return;
        const numLen = nums[0].length;
        
        const key = `${province}|${draw}|${playType}|len${numLen}`;
        if (!groups[key]) {
          groups[key] = { numbers: new Set(), orders: [] };
        }
        
        nums.forEach(n => groups[key].numbers.add(n));
        groups[key].orders.push(order);
      };

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const pt = order.playType || 'Vé cơ bản';
          processItems(pt, item.numbers);
        });
      } else if (order.numbers && order.numbers.length > 0) {
        processItems(order.playType || 'Vé cơ bản', order.numbers);
      } else {
        processItems(order.playType || 'Vé cơ bản', ['N/A']);
      }
    });

    const results: any[] = [];
    Object.keys(groups).forEach(key => {
      const g = groups[key];
      const parts = key.split('|');
      const province = parts[0];
      const draw = parts[1];
      const playType = parts[2];
      
      const hasArbitrageUser = arbitrageUsername 
        ? g.orders.some(o => (o.user?.name || o.user?.phone || o.user?.username || '').toLowerCase().includes(arbitrageUsername.toLowerCase()))
        : false;

      // condition to flag: either the admin specifically searched a user and that user is in this group,
      // OR they covered the max numbers and there's more than 1 unique user involved.
      // (When no username searched, we just fallback to groups with > 1 user, wait, we don't know maxCount easily for Chẵn Lẻ,
      // so if no username is provided, we just show groups that have > 1 unique users.)
      const uniqueUsers = new Set(g.orders.map(o => o.user?._id)).size;
      
      if (hasArbitrageUser || (!arbitrageUsername && uniqueUsers > 1)) {
        // filter orders if a username is searched, wait, no, show ALL orders in that group to see the opposing bets!
        results.push({
          province,
          draw,
          playType,
          orders: g.orders
        });
      }
    });

    setArbitrageResults(results);
    setArbitrageModalVisible(true);
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      if (!dateRange || dateRange.length < 2 || !dateRange[0] || !dateRange[1]) {
        message.warning('Vui lòng chọn khoảng thời gian cần xuất dữ liệu');
        setLoading(false);
        return;
      }

      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      };
      const res = await api.get('/orders/admin', { params }); 
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      const allOrders = (res.data || []).filter((o: Order) => {
        const orderDate = dayjs(o.createdAt);
        return (orderDate.isSame(startDate) || orderDate.isAfter(startDate)) &&
               (orderDate.isSame(endDate) || orderDate.isBefore(endDate));
      });

      if (allOrders.length === 0) {
        message.warning('Không có dữ liệu trong khoảng thời gian này');
        setLoading(false);
        return;
      }

      const exportData = allOrders.map((o: Order) => {
        let count = 0;
        if (o.items && o.items.length > 0) {
          o.items.forEach((item: any) => count += item.numbers.length);
        } else if (o.numbers) {
          count = o.numbers.length;
        }
        let rawCost = 0;
        let c = 0;
        let providedBaseCost: number | undefined;
        
        if (o.items && o.items.length > 0) {
          rawCost = o.items[0].cost;
          providedBaseCost = o.items[0].baseCost;
          c = o.items[0].numbers.length;
        } else if (o.numbers && o.numbers.length > 0) {
          rawCost = o.totalCost;
          c = o.numbers.length;
        }

        const vietlottGames = [
          'keno', 'bao_keno', 'clln_keno',
          'power', 'mega',
          'max_3d', 'max_3d_pro', 'max_3d_plus', 'max_4d',
          'bingo18',
          'lotto', 'lotto_535', 'lotto_570'
        ];
        const gType = (o.gameType || '').toLowerCase();
        const isVietlott = vietlottGames.some(vg => gType.includes(vg));

        const calculatedBase = calculateCostPerNum(o);
        const costPerNum = calculatedBase !== undefined && calculatedBase > 0 ? calculatedBase : '--';

        const exportRow: any = {
          'Mã Đơn': o.orderId,
          'Khách Hàng': o.user?.name,
          'SĐT': o.user?.phone,
          'Tỉnh/Đài': o.provinceName || o.gameType,
          'Loại Cược': o.playType || 'Vé cơ bản',
          'Ngày Mua': dayjs(o.createdAt).format('DD/MM/YYYY HH:mm:ss'),
          'Số Con': count,
          'Tiền/1Con': costPerNum,
          'Tổng Tiền Cược': o.totalCost,
          'Tiền Thắng': o.prizeAmount || 0,
          'Trạng Thái': o.status === 'pending' ? 'Chờ KQ' : o.isWinner === true ? 'Thắng' : o.isWinner === false ? 'Thua' : o.status === 'cancelled' ? 'Đã huỷ' : 'Đã in',
        };
        
        const { displayCode, displayDate } = getOrderDrawInfo(o, drawMap);
        const drawText = [displayCode, displayDate].filter(Boolean).join(' - ') || '-';
        exportRow['Kỳ Quay'] = drawText;
        return exportRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
      XLSX.writeFile(workbook, `Danh_sach_don_hang_${dayjs().format('DD_MM_YYYY')}.xlsx`);
    } catch (err) {
      console.error(err);
      message.error('Lỗi xuất dữ liệu');
    } finally {
      setLoading(false);
    }
  };


  const provinceOptions = useMemo(() => {
    const set = new Set<string>(provincesList);
    orders.forEach(o => {
      const prov = getOrderProvinceName(o);
      if (prov && prov !== '-') set.add(prov);
    });
    return Array.from(set).sort().map(p => ({
      label: p,
      value: p
    }));
  }, [provincesList, orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (minBet && o.totalCost < Number(minBet)) return false;
      if (minWin && (o.prizeAmount || 0) < Number(minWin)) return false;
      if (resultFilter !== 'all') {
        const res = getOrderResult(o);
        if (res !== resultFilter) return false;
      }
      if (provinceFilter !== 'all') {
        const prov = getOrderProvinceName(o);
        if (prov !== provinceFilter) return false;
      }
      return true;
    });
  }, [orders, minBet, minWin, resultFilter, provinceFilter]);

  const handleResultFilterChange = (val: string) => {
    setResultFilter(val);
    setCurrentPage(1);
    fetchOrders(1, pageSize, searchText, dateRange, val, provinceFilter, minBet, minWin);
    if (searchText.trim()) {
      fetchUserSummary(searchText, dateRange, val, provinceFilter, minBet, minWin);
    }
  };

  const handleProvinceFilterChange = (val: string) => {
    const nextVal = val || 'all';
    setProvinceFilter(nextVal);
    setCurrentPage(1);
    fetchOrders(1, pageSize, searchText, dateRange, resultFilter, nextVal, minBet, minWin);
    if (searchText.trim()) {
      fetchUserSummary(searchText, dateRange, resultFilter, nextVal, minBet, minWin);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    fetchOrders(1, pageSize, value, dateRange, resultFilter, provinceFilter, minBet, minWin);
    fetchUserSummary(value, dateRange, resultFilter, provinceFilter, minBet, minWin);
  };

  const handleMinFilterApply = () => {
    setCurrentPage(1);
    fetchOrders(1, pageSize, searchText, dateRange, resultFilter, provinceFilter, minBet, minWin);
    if (searchText.trim()) {
      fetchUserSummary(searchText, dateRange, resultFilter, provinceFilter, minBet, minWin);
    }
  };

  const handleResetFilters = () => {
    setMinBet('');
    setMinWin('');
    setResultFilter('all');
    setProvinceFilter('all');
    setSearchText('');
    setSearchedKeyword('');
    setUserSummaryData(null);
    setDateRange(null);
    setCurrentPage(1);
    fetchOrders(1, pageSize, '', null, 'all', 'all', '', '');
    fetchSummary(null);
  };

  useEffect(() => {
    const handleOpenOrder = (e: any) => {
      const { orderId, date } = e.detail;
      setSearchText(orderId);
      if (date) {
        setDateRange([dayjs(date).startOf('day'), dayjs(date).endOf('day')]);
      }
      setAutoOpenOrderId(orderId);
    };
    window.addEventListener('openOrder', handleOpenOrder);
    return () => window.removeEventListener('openOrder', handleOpenOrder);
  }, []);

  useEffect(() => {
    if (autoOpenOrderId && filteredOrders.length > 0) {
      const order = filteredOrders.find((o: any) => o.orderId === autoOpenOrderId);
      if (order) {
        setSelectedTicketOrder(order);
        setTicketModalVisible(true);
        setAutoOpenOrderId(null);
      }
    }
  }, [filteredOrders, autoOpenOrderId]);
  const columns: any = [
    {
      fixed: 'left',
      title: 'Khách hàng',
      key: 'user',
      render: (_: any, record: Order) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div 
            style={{ 
              cursor: record.user?.phone ? 'pointer' : 'default', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              backgroundColor: '#f0f5ff',
              display: 'inline-block'
            }} 
            onClick={() => {
              if (record.user?.phone) {
                localStorage.setItem('userSearchPhone', record.user.phone);
                window.dispatchEvent(new CustomEvent('changeTab', { detail: 'users' }));
                window.dispatchEvent(new CustomEvent('openUserDetail', { detail: { phone: record.user.phone } }));
              }
            }}
            title="Bấm để xem chi tiết tài khoản khách hàng này"
          >
            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.user?.name || '-'}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{record.user?.phone || '-'}</div>
          </div>
          {(record.user?.name || record.user?.phone) && (
            <Button
              type="text"
              size="small"
              icon={<FilterOutlined style={{ color: '#1890ff', fontSize: 12 }} />}
              title="Lọc vé và xem thống kê của khách này"
              onClick={(e) => {
                e.stopPropagation();
                const uName = record.user?.name || record.user?.phone;
                setSearchText(uName);
                handleSearch(uName);
              }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Tỉnh/Đài',
      key: 'province',
      filters: provinceOptions.map(p => ({ text: p.value, value: p.value })),
      filterSearch: true,
      onFilter: (value: any, record: Order) => getOrderProvinceName(record) === value,
      render: (_: any, record: Order) => {
        const name = getOrderProvinceName(record);
        return <strong>{name}</strong>;
      },
    },
    {
      title: 'Kỳ quay',
      key: 'draw',
      width: 140,
      render: (_: any, record: Order) => {
        const { displayCode, displayDate } = getOrderDrawInfo(record, drawMap);
        return (
          <div>
            {displayCode && (
              <div>
                <strong style={{ color: '#dc2626', fontSize: 13, letterSpacing: '0.2px' }}>
                  {displayCode}
                </strong>
              </div>
            )}
            {displayDate && (
              <div 
                style={{ 
                  fontSize: 12, 
                  color: displayCode ? '#64748b' : '#0f172a',
                  fontWeight: displayCode ? 400 : 600,
                  marginTop: displayCode ? 2 : 0,
                  whiteSpace: 'nowrap'
                }}
              >
                {displayDate}
              </div>
            )}
            {!displayCode && !displayDate && <span style={{ color: '#94a3b8' }}>-</span>}
          </div>
        );
      },
    },
    {
      title: 'Mã vé cược',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (val: string) => <span style={{ color: '#1890ff' }}>{val}</span>,
    },
    {
      title: 'Loại cược',
      key: 'playType',
      render: (_: any, record: Order) => <Tag color="geekblue">{record.playType || 'Vé cơ bản'}</Tag>,
    },
    {
      title: 'Dãy số',
      key: 'numbers',
      render: (_: any, record: any) => {
        const renderNumbers = (nums: string[]) => {
          if (!nums || nums.length === 0) return null;
          if (nums.length <= 3) {
            return nums.map((n: string, i: number) => (
              <Tag key={i} color="blue" style={{ marginInlineEnd: 2 }}>{n}</Tag>
            ));
          }
          const displayNums = nums.slice(0, 3);
          const hiddenCount = nums.length - 3;
          return (
            <>
              {displayNums.map((n: string, i: number) => (
                <Tag key={i} color="blue" style={{ marginInlineEnd: 2 }}>{n}</Tag>
              ))}
              <Popover 
                content={<div style={{ maxWidth: 300, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{nums.map((n, i) => <Tag key={i} color="blue">{n}</Tag>)}</div>} 
                title="Tất cả số đã chọn"
              >
                <Tag color="cyan" style={{ cursor: 'pointer', marginInlineEnd: 2 }}>+ {hiddenCount} số nữa...</Tag>
              </Popover>
            </>
          );
        };

        if (record.items && record.items.length > 0) {
          const displayItems = record.items.slice(0, 1);
          const hiddenCount = record.items.length - displayItems.length;

          return (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px' }}>
              {displayItems.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ marginRight: 4 }}>{item.id || String.fromCharCode(65 + idx)}:</strong>
                  {renderNumbers(item.numbers)}
                </div>
              ))}
              {hiddenCount > 0 && (
                <Tag 
                  color="orange" 
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => {
                    setSelectedTicketOrder(record);
                    setTicketModalVisible(true);
                  }}
                >
                  + {hiddenCount} dãy số khác (Xem chi tiết)
                </Tag>
              )}
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {renderNumbers(record.numbers)}
          </div>
        );
      },
    },
    {
      title: 'Số con',
      key: 'numCount',
      render: (_: any, record: Order) => {
        let count = 0;
        if (record.items && record.items.length > 0) {
          record.items.forEach(item => count += item.numbers.length);
        } else if (record.numbers) {
          count = record.numbers.length;
        }
        return <strong style={{ color: 'magenta' }}>{count}</strong>;
      },
    },
    {
      title: 'Số tiền/1con',
      key: 'costPerNum',
      render: (_: any, record: Order) => {
        const baseCost = calculateCostPerNum(record);
        if (baseCost !== undefined && baseCost > 0) {
          return <span style={{ fontWeight: '600' }}>{baseCost.toLocaleString('vi-VN')}đ</span>;
        }
        return '--';
      },
    },
    {
      title: 'Tiền cược (Tổng)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val: number) => (
        <span style={{ color: 'red', fontWeight: 'bold' }}>
          {val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Tiền thắng',
      key: 'prizeAmount',
      render: (_: any, record: Order) => (
        <Space size={4} align="center">
          <span style={{ color: record.isWinner ? '#52c41a' : 'gray', fontWeight: 'bold' }}>
            {record.isWinner && record.prizeAmount ? `${record.prizeAmount.toLocaleString('vi-VN')}đ` : (record.isWinner === false ? '0đ' : '-')}
          </span>
          {isMaster && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#1890ff', fontSize: 13 }} />}
              onClick={() => handleOpenEditResult(record)}
              title="Sửa tiền thắng & trạng thái (TK Master)"
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      filters: [
        { text: 'Chờ kết quả', value: 'pending' },
        { text: 'Thắng', value: 'win' },
        { text: 'Thua', value: 'lose' },
        { text: 'Đã in', value: 'completed' },
        { text: 'Đã huỷ', value: 'cancelled' },
      ],
      onFilter: (value: any, record: Order) => {
        if (value === 'win') return record.isWinner === true;
        if (value === 'lose') return record.isWinner === false;
        return record.status === value;
      },
      render: (_: any, record: Order) => {
        if (record.status === 'cancelled') return <Tag color="default">Đã huỷ</Tag>;
        if (record.status === 'pending') return <Tag color="orange">Chờ kết quả</Tag>;
        if (record.status === 'completed') {
          if (record.isWinner === true) return <Tag color="green">Thắng</Tag>;
          if (record.isWinner === false) return <Tag color="red">Thua</Tag>;
          return <Tag color="cyan">Đã in</Tag>;
        }
        return <Tag color="default">{record.status}</Tag>;
      },
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN'),
    },
    {
      title: 'Bảng KQ',
      key: 'checkResult',
      render: (_: any, record: Order) => {
        if (record.status === 'completed') {
          return <Button type="link" onClick={() => { setSelectedResultOrder(record); setResultModalVisible(true); }}>Bảng kết quả</Button>;
        }
        return <span style={{ color: 'gray' }}>Chưa có KQ</span>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right' as const,
      width: 160,
      render: (_: any, record: Order) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        setSelectedTicketOrder(record);
                        setTicketModalVisible(true);
                      }}
                      block
                    >
                      Chi tiết vé
                    </Button>

{(!record.ticketImageUrl && record.status !== 'cancelled') && (
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={() => handleOpenUpload(record)}
                  block
                >
                  In & Chụp vé
                </Button>
              )}
              {record.ticketImageUrl && (
                <Button
                  type="dashed"
                  icon={<CheckCircleOutlined style={{ color: 'green' }} />}
                  onClick={() => {
                    let url = record.ticketImageUrl || '';
                    if (!url.startsWith('http')) {
                      const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://localhost:5000';
                      url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                    }
                    window.open(url, '_blank');
                  }}
                  block
                >
                  Xem vé
                </Button>
              )}

              {isMaster && (
                <Button
                  type="default"
                  danger
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditResult(record)}
                  block
                >
                  Ghi chú / Sửa kết quả
                </Button>
              )}
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      ),
    },
    {
      title: 'Kết quả',
      key: 'result',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: Order) => {
        const res = getOrderResult(record);
        let tag = <span style={{ color: '#aaa' }}>Chưa có KQ</span>;
        if (res === 'win') {
          tag = <span style={{ color: 'green', fontWeight: 'bold' }}>Thắng</span>;
        } else if (res === 'lose') {
          tag = <span style={{ color: 'red', fontWeight: 'bold' }}>Thua</span>;
        } else if (res === 'cancelled') {
          tag = <Tag color="default">Đã huỷ</Tag>;
        }
        return (
          <Space size={4} align="center">
            {tag}
            {isMaster && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: '#fa8c16', fontSize: 12 }} />}
                onClick={() => handleOpenEditResult(record)}
                title="Sửa kết quả vé (TK Master)"
              />
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div className="cms-page-container">
      <div className="cms-page-header" style={{ marginBottom: 12, flexShrink: 0 }}>
        <Title style={{ marginTop: 0, marginBottom: 0 }} level={4}>Quản lý Đặt vé (Orders)</Title>
      </div>

      <div className="cms-scroll-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
        <div style={{ flex: 'none' }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Số vé bán ra"
                value={summaryData.totalTickets}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Tổng tiền bán ra"
                value={summaryData.totalSales}
                suffix="đ"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Tổng tiền khách thắng"
                value={summaryData.totalPrize}
                suffix="đ"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Tổng tiền khách thua"
                value={summaryData.totalLoss}
                suffix="đ"
                valueStyle={{ color: '#d48806' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="cms-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        {/* Hàng 1: Tìm kiếm & Lọc Kết quả & Tỉnh/Đài */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Input.Search 
            placeholder="Tìm tên, SĐT, Mã vé, Mã kỳ..." 
            style={{ width: 230 }} 
            value={searchText} 
            onChange={e => setSearchText(e.target.value)} 
            onSearch={handleSearch}
            enterButton
            allowClear
          />
          
          <Space size="small">
            <span style={{ fontSize: 13, color: '#555' }}>Cược tối thiểu:</span>
            <Input 
              placeholder="Số tiền..." 
              style={{ width: 105 }} 
              value={minBet} 
              onChange={e => setMinBet(e.target.value)} 
              onPressEnter={handleMinFilterApply}
              onBlur={handleMinFilterApply}
              allowClear
            />
          </Space>

          <Space size="small">
            <span style={{ fontSize: 13, color: '#555' }}>Thắng tối thiểu:</span>
            <Input 
              placeholder="Số tiền..." 
              style={{ width: 105 }} 
              value={minWin} 
              onChange={e => setMinWin(e.target.value)} 
              onPressEnter={handleMinFilterApply}
              onBlur={handleMinFilterApply}
              allowClear
            />
          </Space>

          <Space size="small">
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1f1f1f' }}>Lọc kết quả:</span>
            <Radio.Group 
              value={resultFilter} 
              onChange={e => handleResultFilterChange(e.target.value)}
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value="all">
                Tất cả
              </Radio.Button>
              <Radio.Button 
                value="win" 
                style={resultFilter === 'win' ? { backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' } : { color: '#52c41a', fontWeight: 600 }}
              >
                🏆 Thắng
              </Radio.Button>
              <Radio.Button 
                value="lose" 
                style={resultFilter === 'lose' ? { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: '#fff' } : { color: '#ff4d4f', fontWeight: 600 }}
              >
                ❌ Thua
              </Radio.Button>
              <Radio.Button 
                value="pending" 
                style={resultFilter === 'pending' ? { backgroundColor: '#fa8c16', borderColor: '#fa8c16', color: '#fff' } : { color: '#fa8c16', fontWeight: 600 }}
              >
                ⏳ Chưa có KQ
              </Radio.Button>
              <Radio.Button 
                value="cancelled" 
                style={resultFilter === 'cancelled' ? { backgroundColor: '#8c8c8c', borderColor: '#8c8c8c', color: '#fff' } : { color: '#8c8c8c' }}
              >
                🚫 Đã huỷ
              </Radio.Button>
            </Radio.Group>
          </Space>

          <Space size="small">
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1f1f1f' }}>Tỉnh/Đài:</span>
            <Select
              showSearch
              allowClear
              placeholder="Chọn Tỉnh/Đài..."
              style={{ minWidth: 170 }}
              value={provinceFilter === 'all' ? undefined : provinceFilter}
              onChange={handleProvinceFilterChange}
              options={[
                { label: 'Tất cả Tỉnh/Đài', value: 'all' },
                ...provinceOptions
              ]}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>

          {(resultFilter !== 'all' || provinceFilter !== 'all' || minBet || minWin || searchText || dateRange) && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
            >
              Xoá bộ lọc
            </Button>
          )}
        </div>

        {/* Hàng 2: Thời gian & Tiện ích xuất dữ liệu, Check đối nghịch */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Space size="small">
            <span style={{ fontSize: 13, color: '#555' }}>Ngày đặt:</span>
            <DatePicker.RangePicker
              style={{ width: 260 }}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as any);
                setCurrentPage(1);
                fetchOrders(1, pageSize, searchText, dates as any, resultFilter, provinceFilter, minBet, minWin);
                fetchSummary(dates as any);
              }}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              allowClear
              presets={[
                { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                { label: '7 ngày qua', value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
                { label: '30 ngày qua', value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
                { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              ]}
            />
          </Space>

          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            style={{ backgroundColor: '#52c41a' }}
            onClick={handleExportExcel}
            loading={loading}
          >
            Xuất dữ liệu
          </Button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input 
              placeholder="Nhập tên KH để check đối nghịch..." 
              value={arbitrageUsername} 
              onChange={e => setArbitrageUsername(e.target.value)} 
              style={{ width: 230 }} 
              allowClear
            />
            <Button 
              type="primary" 
              danger
              icon={<WarningOutlined />} 
              onClick={handleCheckArbitrage}
            >
              Check đối nghịch
            </Button>
          </div>
        </div>
      </div>

      {searchedKeyword && (
        <div style={{ marginBottom: 16 }}>
          <Card 
            bordered={false}
            style={{ 
              borderRadius: 8, 
              background: '#f8fafc',
              border: '1px solid #91caff',
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.08)'
            }}
            bodyStyle={{ padding: '14px 18px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0958d9' }}>
                  👤 Thống kê cược của khách:
                </span>
                <Tag color="blue" style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px', borderRadius: 4 }}>
                  {searchedKeyword}
                </Tag>
                {userSummaryData && (
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    (Thắng: <strong style={{ color: '#52c41a' }}>{userSummaryData.winCount}</strong> | Thua: <strong style={{ color: '#ff4d4f' }}>{userSummaryData.loseCount}</strong> | Chờ KQ: <strong style={{ color: '#fa8c16' }}>{userSummaryData.pendingCount}</strong>)
                  </span>
                )}
              </div>
              <Button 
                type="link" 
                size="small" 
                danger 
                onClick={() => {
                  setSearchText('');
                  setSearchedKeyword('');
                  setUserSummaryData(null);
                  setCurrentPage(1);
                  fetchOrders(1, pageSize, '', dateRange, resultFilter, provinceFilter, minBet, minWin);
                }}
              >
                Xóa tìm kiếm (Xem tất cả)
              </Button>
            </div>

            <Row gutter={16}>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#fff', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#475569' }}>Số vé bán ra</span>}
                    value={userSummaryData ? userSummaryData.totalTickets : (loadingUserSummary ? '...' : 0)}
                    valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#fff', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng tiền bán ra</span>}
                    value={userSummaryData ? userSummaryData.totalSales : 0}
                    suffix="đ"
                    valueStyle={{ color: '#3f8600', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#fff', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng tiền khách thắng</span>}
                    value={userSummaryData ? userSummaryData.totalPrize : 0}
                    suffix="đ"
                    valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#fff', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#475569' }}>Tổng tiền khách thua</span>}
                    value={userSummaryData ? userSummaryData.totalLoss : 0}
                    suffix="đ"
                    valueStyle={{ 
                      color: (userSummaryData?.totalLoss ?? 0) >= 0 ? '#d48806' : '#cf1322', 
                      fontWeight: 700 
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      <Table 
        scroll={{ x: 'max-content' }}
        columns={columns}
        dataSource={isServerPaginated ? orders : filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: isServerPaginated ? totalOrders : filteredOrders.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
            if (isServerPaginated) {
              fetchOrders(page, size, searchText, dateRange, resultFilter, provinceFilter, minBet, minWin);
            }
          },
          showTotal: (totalCount, range) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
              <span>Tổng số vé: <strong style={{ color: '#1677ff', fontSize: 14 }}>{totalCount}</strong></span>
              <span style={{ color: '#888' }}>(Hiển thị {range[0]}-{range[1]})</span>
            </div>
          ),
        }}
      />
      </div>

      <Modal
        title={`Tải hình ảnh vé - ${selectedOrder?.orderId}`}
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => {
          if (uploading) return;
          setUploadModalVisible(false);
        }}
        confirmLoading={uploading}
        footer={[
          <Button key="cancel" onClick={() => setUploadModalVisible(false)} disabled={uploading}>Huỷ</Button>,
          <Button key="submit" type="primary" onClick={handleUpload} loading={uploading} disabled={uploading}>Xác nhận & Tải lên</Button>
        ]}
      >
        <Upload
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          listType="picture"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Chọn ảnh vé từ thiết bị</Button>
        </Upload>

        <Divider plain>Hoặc</Divider>

        <Input
          placeholder="Nhập đường link (URL) ảnh vé..."
          value={ticketLink}
          onChange={e => setTicketLink(e.target.value)}
        />
      </Modal>

      <Modal
        title={`Chi tiết Kết quả - Đơn ${selectedResultOrder?.orderId}`}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>Đóng</Button>
        ]}
      >
        {selectedResultOrder && (
          <div style={{ fontSize: '16px', lineHeight: '2.0' }}>
            <div><strong>Khách hàng:</strong> {selectedResultOrder.user?.name} - {selectedResultOrder.user?.phone}</div>
            <div><strong>Trạng thái:</strong> {selectedResultOrder.isWinner ? (
              <span style={{ color: 'green', fontWeight: 'bold' }}>Thắng</span>
            ) : (
              <span style={{ color: 'red', fontWeight: 'bold' }}>Thua</span>
            )}</div>
            {selectedResultOrder.isWinner && (
              <div><strong>Tổng tiền trúng:</strong> <span style={{ color: 'green', fontWeight: 'bold', fontSize: '18px' }}>{selectedResultOrder.prizeAmount?.toLocaleString('vi-VN')} đ</span></div>
            )}
            <div><strong>Kết quả kỳ quay:</strong></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {selectedResultOrder.winningNumbers?.map((n: string, i: number) => (
                <Tag key={i} color="gold" style={{ fontSize: '14px', padding: '4px 8px' }}>{n}</Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Kết quả Check Đối Nghịch (Xả Kèo)"
        open={arbitrageModalVisible}
        onCancel={() => setArbitrageModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setArbitrageModalVisible(false)}>Đóng</Button>
        ]}
        width={900}
      >
        {arbitrageResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'green', fontSize: '16px' }}>
            <CheckCircleOutlined style={{ fontSize: '32px', marginBottom: '10px' }} /><br />
            Không tìm thấy dữ liệu đối nghịch.
          </div>
        ) : (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Typography.Paragraph type="danger">
              Tìm thấy {arbitrageResults.length} nhóm cược khớp điều kiện!
            </Typography.Paragraph>
            {arbitrageResults.map((res, index) => (
              <Card key={index} size="small" style={{ marginBottom: 10, borderColor: '#ffa39e', backgroundColor: '#fff1f0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  [{res.province}] - {res.draw}
                </div>
                <div>Loại cược: <Tag color="red">{res.playType}</Tag></div>
                <div style={{ marginTop: 8 }}>
                  <strong>Chi tiết vé cược trong nhóm:</strong>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {res.orders.map((o: any, i: number) => (
                      <div key={i} style={{ padding: 8, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                        <div><strong>Khách:</strong> {o.user?.name} - {o.user?.phone}</div>
                        <div><strong>Mã đơn:</strong> {o.orderId} | <strong>Trạng thái:</strong> {o.status === 'pending' ? 'Chờ KQ' : o.status === 'completed' ? 'Đã có KQ' : o.status}</div>
                        <div><strong>Ngày đặt:</strong> {new Date(o.createdAt).toLocaleString('vi-VN')}</div>
                        <div><strong>IP:</strong> {o.ip || o.ipAddress || 'N/A'} | <strong>Thiết bị:</strong> {o.loginDevice || 'N/A'}</div>
                        <div>
                          <strong>Dãy số:</strong>{' '}
                          <span style={{ color: 'blue', wordBreak: 'break-all' }}>
                            {o.items && o.items.length > 0 
                              ? o.items.map((it: any) => it.numbers.join(', ')).join(' | ') 
                              : o.numbers ? o.numbers.join(', ') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title={`Chi tiết Vé - ${selectedTicketOrder?.orderId}`}
        open={ticketModalVisible}
        onCancel={() => setTicketModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTicketModalVisible(false)}>Đóng</Button>
        ]}
        width={600}
      >
        {selectedTicketOrder && (
          <div style={{ fontSize: '15px', lineHeight: '2.0' }}>
            <p><strong>Khách hàng:</strong> {selectedTicketOrder.user?.name} - {selectedTicketOrder.user?.phone}</p>
            <p><strong>Ngày đặt:</strong> {new Date(selectedTicketOrder.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Tỉnh/Đài:</strong> {selectedTicketOrder.provinceName || selectedTicketOrder.gameType?.toUpperCase()}</p>
            {(() => {
              const { displayCode, displayDate } = getOrderDrawInfo(selectedTicketOrder, drawMap);
              if (displayCode || displayDate) {
                return (
                  <p>
                    <strong>Kỳ quay:</strong>{' '}
                    {displayCode && <strong style={{ color: '#dc2626', marginRight: 8 }}>{displayCode}</strong>}
                    {displayDate && <span style={{ color: '#64748b' }}>({displayDate})</span>}
                  </p>
                );
              }
              return null;
            })()}
            <p><strong>Loại cược:</strong> <Tag color="geekblue">{selectedTicketOrder.playType || 'Vé cơ bản'}</Tag></p>
            <p><strong>Số tiền cược:</strong> <strong style={{color: 'red'}}>{selectedTicketOrder.totalCost?.toLocaleString('vi-VN')} đ</strong></p>
            {selectedTicketOrder.adminNote && (
              <div style={{ margin: '8px 0', padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
                <strong>Ghi chú / Lý do điều chỉnh:</strong> <span style={{ color: '#d48806', fontWeight: 600 }}>{selectedTicketOrder.adminNote}</span>
              </div>
            )}
            <div><strong>Chi tiết các dãy số ({selectedTicketOrder.items?.length || 1} dãy):</strong></div>
            <div style={{ padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, marginTop: 8, maxHeight: '450px', overflowY: 'auto' }}>
              {selectedTicketOrder.items && selectedTicketOrder.items.length > 0 ? (
                selectedTicketOrder.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
                    <strong>Dãy {item.id || String.fromCharCode(65 + idx)}:</strong> 
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {item.numbers.map((n: string, i: number) => <Tag key={i} color="blue">{n}</Tag>)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: 4 }}>
                      Cược: {(() => {
                        const vietlottGames = ['keno', 'bao_keno', 'clln_keno', 'power', 'mega', 'max_3d', 'max_3d_pro', 'max_3d_plus', 'max_4d', 'bingo18', 'lotto', 'lotto_535', 'lotto_570'];
                        const isVietlott = vietlottGames.some(vg => (selectedTicketOrder.gameType || '').toLowerCase().includes(vg));
                        if (isVietlott) {
                          return `${item.cost?.toLocaleString('vi-VN')} đ`;
                        }
                        return item.baseCost !== undefined ? `${item.baseCost.toLocaleString('vi-VN')} đ/con (Tổng nhánh: ${item.cost?.toLocaleString('vi-VN')} đ)` : `${item.cost?.toLocaleString('vi-VN')} đ`;
                      })()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedTicketOrder.numbers?.map((n: string, i: number) => <Tag key={i} color="blue">{n}</Tag>)}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Sửa Tiền Thắng & Trạng Thái (Tài Khoản Master) */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#ff4d4f' }} />
            <span style={{ color: '#cf1322', fontWeight: 600 }}>Sửa Tiền Thắng & Kết Quả (TK Master)</span>
          </Space>
        }
        open={editResultModalVisible}
        onCancel={() => {
          if (!submittingEdit) {
            setEditResultModalVisible(false);
            setEditingOrder(null);
          }
        }}
        footer={[
          <Button key="cancel" onClick={() => setEditResultModalVisible(false)} disabled={submittingEdit}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger={(() => {
              const oldWon = (editingOrder?.isWinner && editingOrder?.status === 'completed') ? (editingOrder?.prizeAmount || 0) : 0;
              const newWon = editResultStatus === 'win' ? (Number(editPrizeAmount) || 0) : 0;
              return newWon < oldWon;
            })()}
            loading={submittingEdit}
            disabled={submittingEdit}
            onClick={handleSubmitEditResult}
          >
            Lưu thay đổi & Báo cáo Lịch sử hoạt động
          </Button>
        ]}
        width={650}
        destroyOnClose
      >
        {editingOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Thông tin vé cược */}
            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <strong>Mã vé:</strong> <Tag color="blue">{editingOrder.orderId}</Tag>
                </Col>
                <Col span={12}>
                  <strong>Khách hàng:</strong> <Text strong>{editingOrder.user?.name || '-'}</Text> ({editingOrder.user?.phone || '-'})
                </Col>
                <Col span={12}>
                  <strong>Đài/Kỳ:</strong> {getOrderProvinceName(editingOrder)} ({editingOrder.playType || editingOrder.gameType})
                </Col>
                <Col span={12}>
                  <strong>Tiền cược:</strong> <Text strong type="danger">{editingOrder.totalCost?.toLocaleString('vi-VN')} đ</Text>
                </Col>
                <Col span={12}>
                  <strong>KQ Hiện tại:</strong>{' '}
                  {editingOrder.status === 'cancelled' ? (
                    <Tag>Đã huỷ</Tag>
                  ) : editingOrder.status === 'pending' ? (
                    <Tag color="orange">Chờ KQ</Tag>
                  ) : editingOrder.isWinner ? (
                    <Tag color="green">Thắng</Tag>
                  ) : (
                    <Tag color="red">Thua</Tag>
                  )}
                </Col>
                <Col span={12}>
                  <strong>Tiền thắng hiện tại:</strong>{' '}
                  <Text strong style={{ color: editingOrder.isWinner ? '#52c41a' : 'gray' }}>
                    {editingOrder.isWinner && editingOrder.prizeAmount ? `${editingOrder.prizeAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Trạng thái mới */}
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>1. Trạng thái kết quả mới:</div>
              <Radio.Group
                value={editResultStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditResultStatus(val);
                  if (val === 'lose' || val === 'pending' || val === 'cancelled') {
                    setEditPrizeAmount(0);
                  } else if (val === 'win' && (!editPrizeAmount || editPrizeAmount <= 0)) {
                    setEditPrizeAmount(editingOrder.prizeAmount || 0);
                  }
                }}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex' }}
              >
                <Radio.Button value="win" style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>✓ Thắng</span>
                </Radio.Button>
                <Radio.Button value="lose" style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>✕ Thua</span>
                </Radio.Button>
                <Radio.Button value="pending" style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: '#fa8c16' }}>⏳ Chờ KQ</span>
                </Radio.Button>
                <Radio.Button value="cancelled" style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: '#888' }}>🚫 Đã huỷ</span>
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* Tiền thắng mới */}
            {editResultStatus === 'win' && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  2. Tiền thắng mới (VNĐ): <span style={{ color: 'red' }}>*</span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  size="large"
                  min={0}
                  step={1000}
                  value={editPrizeAmount}
                  onChange={(val) => setEditPrizeAmount(Number(val) || 0)}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ'}
                  parser={(value) => Number(value?.replace(/đ|\s|,/g, '') || 0)}
                  placeholder="Nhập số tiền thắng thực tế..."
                />
              </div>
            )}

            {/* Tính toán biến động số dư */}
            {(() => {
              const oldWon = (editingOrder.isWinner && editingOrder.status === 'completed') ? (editingOrder.prizeAmount || 0) : 0;
              const newWon = editResultStatus === 'win' ? (Number(editPrizeAmount) || 0) : 0;
              const delta = newWon - oldWon;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {delta > 0 && (
                    <Alert
                      type="success"
                      showIcon
                      message={
                        <span>
                          <strong>Dự kiến:</strong> Khách hàng sẽ được <strong>CỘNG THÊM +{delta.toLocaleString('vi-VN')} đ</strong> vào số dư tài khoản.
                        </span>
                      }
                    />
                  )}
                  {delta < 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message={
                        <span>
                          <strong>Cảnh báo:</strong> Khách hàng sẽ bị <strong>TRỪ THU HỒI {delta.toLocaleString('vi-VN')} đ</strong> khỏi số dư tài khoản.
                        </span>
                      }
                    />
                  )}
                  {delta === 0 && (
                    <Alert
                      type="info"
                      showIcon
                      message="Số dư tài khoản khách hàng sẽ không thay đổi (chênh lệch = 0 đ)."
                    />
                  )}

                  {delta !== 0 && (
                    <Checkbox
                      checked={editAdjustBalance}
                      onChange={(e) => setEditAdjustBalance(e.target.checked)}
                      style={{ marginTop: 4 }}
                    >
                      <strong>Tự động điều chỉnh số dư của người chơi</strong> ({delta > 0 ? `Cộng +${delta.toLocaleString('vi-VN')} đ` : `Trừ ${delta.toLocaleString('vi-VN')} đ`})
                    </Checkbox>
                  )}
                </div>
              );
            })()}

            {/* Lý do / Ghi chú sửa */}
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                3. Ghi chú lý do sửa: <span style={{ color: 'red' }}>*</span>
              </div>
              <Input.TextArea
                rows={3}
                placeholder="Nhập lý do điều chỉnh kết quả (bắt buộc) để báo cáo vào Lịch sử hoạt động (VD: Hệ thống dò nhầm đài xổ, vé trúng giải 8 nhưng trả thiếu, cộng thưởng bổ sung...)"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                ℹ️ Thao tác này sẽ tự động được ghi lại vào <strong>Nhật ký hoạt động (AdminLogs)</strong> kèm thời gian, tên Admin Master và chi tiết các trường thay đổi để đối soát.
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
