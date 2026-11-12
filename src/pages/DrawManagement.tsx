import { PlusOutlined, SaveOutlined, SyncOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import useAuthStore from '../store/useAuthStore';
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import dayjs from 'dayjs';
import { isDerived3MienGame } from '../utils/gameUtils';

const { Title } = Typography;

export default function DrawManagement() {
  const [draws, setDraws] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterGameId, setFilterGameId] = useState<string | null>(null);
  const [filterProvinceId, setFilterProvinceId] = useState<string | null>('all');
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');

  const [form] = Form.useForm();
  const [ktForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [creatingDraw, setCreatingDraw] = useState(false);
  const [savingEditDraw, setSavingEditDraw] = useState(false);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);
  const [savingKtResult, setSavingKtResult] = useState(false);

  const { isMasterAdmin, hasPermission } = useAuthStore();
  const isMaster = isMasterAdmin();
  const canDeleteDraw = isMaster || hasPermission('draws', 'delete');
  const canEditDraw = isMaster || hasPermission('draws', 'update');

  const [editingDrawId, setEditingDrawId] = useState<string | null>(null);
  const [winningNumbersInput, setWinningNumbersInput] = useState('');

  const [isKienThietModalOpen, setIsKienThietModalOpen] = useState(false);
  const [currentKienThietDraw, setCurrentKienThietDraw] = useState<any>(null);

  const playableGames = useMemo(() => {
    return games.filter(g => !isDerived3MienGame(g));
  }, [games]);

  const [showRedundantDraws, setShowRedundantDraws] = useState(false);
  const [cleaningRedundant, setCleaningRedundant] = useState(false);

  const redundantDraws = useMemo(() => {
    return draws.filter(d => isDerived3MienGame(d.game, games));
  }, [draws, games]);

  const handleDeleteAllRedundantDraws = async () => {
    if (redundantDraws.length === 0) return;
    try {
      setCleaningRedundant(true);
      await Promise.all(redundantDraws.map(d => api.delete(`/draws/admin/${d._id}`)));
      message.success(`Đã xóa sạch ${redundantDraws.length} kỳ quay thừa của Lô Đề / Trượt thành công!`);
      setShowRedundantDraws(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa các kỳ quay thừa');
    } finally {
      setCleaningRedundant(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 10,
      };
      if (filterGameId) params.gameId = filterGameId;
      if (filterProvinceId && filterProvinceId !== 'all') params.provinceId = filterProvinceId;
      if (filterDate) params.date = filterDate.format('YYYY-MM-DD');
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (searchCode.trim()) params.search = searchCode.trim();

      const [drawsRes, gamesRes, provsRes] = await Promise.all([
        api.get('/draws/admin', { params }),
        games.length > 0 ? Promise.resolve({ data: games }) : api.get('/games'),
        provinces.length > 0 ? Promise.resolve({ data: provinces }) : api.get('/provinces')
      ]);

      if (drawsRes.data.data) {
        setDraws(drawsRes.data.data);
        setTotal(drawsRes.data.total);
      } else if (Array.isArray(drawsRes.data)) {
        setDraws(drawsRes.data);
        setTotal(drawsRes.data.length);
      }
      if (games.length === 0 && gamesRes.data) setGames(gamesRes.data);
      if (provinces.length === 0 && provsRes.data) setProvinces(provsRes.data);
    } catch (error) {
      message.error('Lỗi lấy dữ liệu kỳ quay');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filterGameId, filterProvinceId, filterDate, filterStatus]);

  const handleCreateDraw = async (values: any) => {
    try {
      setCreatingDraw(true);
      await api.post('/draws/admin', {
        gameId: values.gameId,
        drawCode: values.drawCode,
        openTime: values.openTime.toISOString(),
        closeTime: values.closeTime.toISOString(),
        provinceId: values.provinceId
      });
      message.success('Tạo kỳ quay thành công');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi tạo kỳ quay');
    } finally {
      setCreatingDraw(false);
    }
  };

  const handleDeleteDraw = async (id: string) => {
    try {
      await api.delete(`/draws/admin/${id}`);
      message.success('Xóa kỳ quay thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa kỳ quay');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(selectedRowKeys.map(id => api.delete(`/draws/admin/${id}`)));
      message.success(`Đã xóa thành công ${selectedRowKeys.length} kỳ quay`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi xóa các kỳ quay đã chọn');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (record: any) => {
    setEditingDraw(record);
    const gCode = record.game?.code;
    const nums: string[] = record.winningNumbers || [];

    const formVals: any = {
      drawCode: record.drawCode,
      status: record.status,
      openTime: record.openTime ? dayjs(record.openTime) : null,
      closeTime: record.closeTime ? dayjs(record.closeTime) : null,
      drawTime: record.drawTime ? dayjs(record.drawTime) : null,
      winningNumbers: nums.join(', '),
      jackpotAmount: record.jackpotAmount || 0,
      provinceId: record.provinceId
    };

    if ((gCode === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(gCode)) && nums.length >= 27) {
      formVals.gdb = nums[0];
      formVals.g1 = nums[1];
      formVals.g2_1 = nums[2]; formVals.g2_2 = nums[3];
      formVals.g3_1 = nums[4]; formVals.g3_2 = nums[5]; formVals.g3_3 = nums[6];
      formVals.g3_4 = nums[7]; formVals.g3_5 = nums[8]; formVals.g3_6 = nums[9];
      formVals.g4_1 = nums[10]; formVals.g4_2 = nums[11]; formVals.g4_3 = nums[12]; formVals.g4_4 = nums[13];
      formVals.g5_1 = nums[14]; formVals.g5_2 = nums[15]; formVals.g5_3 = nums[16];
      formVals.g5_4 = nums[17]; formVals.g5_5 = nums[18]; formVals.g5_6 = nums[19];
      formVals.g6_1 = nums[20]; formVals.g6_2 = nums[21]; formVals.g6_3 = nums[22];
      formVals.g7_1 = nums[23]; formVals.g7_2 = nums[24]; formVals.g7_3 = nums[25]; formVals.g7_4 = nums[26];
    } else if (['MT', 'MN'].includes(gCode) && nums.length >= 18) {
      formVals.gdb = nums[0];
      formVals.g1 = nums[1];
      formVals.g2 = nums[2];
      formVals.g3_1 = nums[3]; formVals.g3_2 = nums[4];
      formVals.g4_1 = nums[5]; formVals.g4_2 = nums[6]; formVals.g4_3 = nums[7];
      formVals.g4_4 = nums[8]; formVals.g4_5 = nums[9]; formVals.g4_6 = nums[10]; formVals.g4_7 = nums[11];
      formVals.g5 = nums[12];
      formVals.g6_1 = nums[13]; formVals.g6_2 = nums[14]; formVals.g6_3 = nums[15];
      formVals.g7 = nums[16];
      formVals.g8 = nums[17];
    }

    editForm.setFieldsValue(formVals);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (values: any) => {
    try {
      setSavingEditDraw(true);
      const gCode = editingDraw?.game?.code;
      let numbers: string[] = [];

      if (gCode === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(gCode)) {
        const mbNums = [
          values.gdb,
          values.g1,
          values.g2_1, values.g2_2,
          values.g3_1, values.g3_2, values.g3_3, values.g3_4, values.g3_5, values.g3_6,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4,
          values.g5_1, values.g5_2, values.g5_3, values.g5_4, values.g5_5, values.g5_6,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7_1, values.g7_2, values.g7_3, values.g7_4,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (mbNums.length > 0) {
          if (mbNums.length < 27) {
            message.error(`Vui lòng điền đủ 27 giải theo KQXS Miền Bắc (hiện có ${mbNums.length}/27 số), hoặc bấm Điền ngẫu nhiên`);
            setSavingEditDraw(false);
            return;
          }
          numbers = mbNums;
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (['MN', 'MT'].includes(gCode)) {
        const mnNums = [
          values.gdb,
          values.g1,
          values.g2,
          values.g3_1, values.g3_2,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4, values.g4_5, values.g4_6, values.g4_7,
          values.g5,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7,
          values.g8,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (mnNums.length > 0) {
          if (mnNums.length < 18) {
            message.error(`Vui lòng điền đủ 18 giải (hiện có ${mnNums.length}/18 số), hoặc bấm Điền ngẫu nhiên`);
            setSavingEditDraw(false);
            return;
          }
          numbers = mnNums;
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else {
        if (values.winningNumbers !== undefined) {
          numbers = values.winningNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const payload: any = {
        drawCode: values.drawCode,
        status: values.status,
        openTime: values.openTime?.toISOString(),
        closeTime: values.closeTime?.toISOString(),
        drawTime: values.drawTime ? values.drawTime.toISOString() : undefined,
        winningNumbers: numbers,
        jackpotAmount: values.jackpotAmount,
        provinceId: values.provinceId
      };
      await api.put(`/draws/admin/${editingDraw._id}`, payload);
      message.success('Cập nhật kỳ quay thành công');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật kỳ quay');
    } finally {
      setSavingEditDraw(false);
    }
  };

  const handleRandomizeEdit = (game: any) => {
    if (!game) return;
    const gCode = (game.code || '').toLowerCase();

    // 1. Kien Thiet MB
    if (game.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(game.code)) {
      const randDigits = (len: number) => {
        let s = '';
        for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
        return s;
      };
      editForm.setFieldsValue({
        gdb: randDigits(5),
        g1: randDigits(5),
        g2_1: randDigits(5), g2_2: randDigits(5),
        g3_1: randDigits(5), g3_2: randDigits(5), g3_3: randDigits(5),
        g3_4: randDigits(5), g3_5: randDigits(5), g3_6: randDigits(5),
        g4_1: randDigits(4), g4_2: randDigits(4), g4_3: randDigits(4), g4_4: randDigits(4),
        g5_1: randDigits(4), g5_2: randDigits(4), g5_3: randDigits(4),
        g5_4: randDigits(4), g5_5: randDigits(4), g5_6: randDigits(4),
        g6_1: randDigits(3), g6_2: randDigits(3), g6_3: randDigits(3),
        g7_1: randDigits(2), g7_2: randDigits(2), g7_3: randDigits(2), g7_4: randDigits(2),
      });
      message.success('Đã tự động điền ngẫu nhiên các giải Miền Bắc!');
      return;
    }

    // 2. Kien Thiet MN / MT
    if (['MT', 'MN'].includes(game.code)) {
      const randDigits = (len: number) => {
        let s = '';
        for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
        return s;
      };
      editForm.setFieldsValue({
        gdb: randDigits(6),
        g1: randDigits(5),
        g2: randDigits(5),
        g3_1: randDigits(5), g3_2: randDigits(5),
        g4_1: randDigits(5), g4_2: randDigits(5), g4_3: randDigits(5), g4_4: randDigits(5),
        g4_5: randDigits(5), g4_6: randDigits(5), g4_7: randDigits(5),
        g5: randDigits(4),
        g6_1: randDigits(4), g6_2: randDigits(4), g6_3: randDigits(4),
        g7: randDigits(3),
        g8: randDigits(2),
      });
      message.success('Đã tự động điền ngẫu nhiên các giải!');
      return;
    }

    // 3. Other games (Keno, Mega, Power, Lotto, Dien toan...)
    const nums = new Set<string>();
    let maxNum = 45;
    let reqCount = 6;

    if (gCode.includes('keno')) {
      maxNum = 80;
      reqCount = 20;
    } else if (gCode === 'power_655') {
      maxNum = 55;
      reqCount = 6;
    } else if (gCode === 'mega_645') {
      maxNum = 45;
      reqCount = 6;
    } else if (gCode.includes('636') || gCode === 'dientoan_636') {
      maxNum = 36;
      reqCount = 6;
    } else if (gCode === 'lotto_535') {
      maxNum = 35;
      reqCount = 5;
    } else if (gCode === 'lotto_570') {
      maxNum = 70;
      reqCount = 5;
    } else if (gCode === 'bingo18') {
      maxNum = 6;
      reqCount = 3;
    }

    while (nums.size < reqCount) {
      const rnd = Math.floor(Math.random() * maxNum) + 1;
      nums.add(rnd.toString().padStart(2, '0'));
    }

    const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
    editForm.setFieldsValue({
      winningNumbers: sortedNums.join(', ')
    });
    message.success(`Đã tự động sinh ngẫu nhiên ${reqCount} số kết quả!`);
  };

  const handleRandomize = (game: any) => {
    const nums = new Set<string>();
    let maxNum = 45;
    let reqCount = 6;
    const gCode = (game?.code || '').toLowerCase();

    if (!game) {
      // Fallback
    } else if (gCode.includes('keno')) {
      maxNum = 80;
      reqCount = 20;
    } else if (gCode === 'power_655') {
      maxNum = 55;
      reqCount = 6;
    } else if (gCode === 'mega_645') {
      maxNum = 45;
      reqCount = 6;
    } else if (gCode.includes('636') || gCode === 'dientoan_636') {
      maxNum = 36;
      reqCount = 6;
    } else if (gCode === 'lotto_535') {
      maxNum = 35;
      reqCount = 5;
    } else if (gCode === 'lotto_570') {
      maxNum = 70;
      reqCount = 5;
    } else if (gCode === 'bingo18') {
      maxNum = 6;
      reqCount = 3;
    }

    while (nums.size < reqCount) {
      const rnd = Math.floor(Math.random() * maxNum) + 1;
      nums.add(rnd.toString().padStart(2, '0'));
    }

    const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
    setWinningNumbersInput(sortedNums.join(', '));
  };

  const handleSaveResult = async (id: string) => {
    try {
      setSavingResultId(id);
      const numbers = winningNumbersInput.split(',').map(n => n.trim()).filter(Boolean);
      await api.put(`/draws/admin/${id}/results`, { winningNumbers: numbers });
      message.success('Lưu kết quả thành công');
      setEditingDrawId(null);
      fetchData();
    } catch (error) {
      message.error('Lỗi lưu kết quả');
    } finally {
      setSavingResultId(null);
    }
  };

  const handleSaveKienThietResult = async (values: any) => {
    try {
      setSavingKtResult(true);
      const gameCode = currentKienThietDraw?.game?.code;
      let numbers: string[] = [];
      if (gameCode === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(gameCode)) {
        numbers = [
          values.gdb,
          values.g1,
          values.g2_1, values.g2_2,
          values.g3_1, values.g3_2, values.g3_3, values.g3_4, values.g3_5, values.g3_6,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4,
          values.g5_1, values.g5_2, values.g5_3, values.g5_4, values.g5_5, values.g5_6,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7_1, values.g7_2, values.g7_3, values.g7_4,
        ];
      } else {
        numbers = [
          values.gdb,
          values.g1,
          values.g2,
          values.g3_1, values.g3_2,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4, values.g4_5, values.g4_6, values.g4_7,
          values.g5,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7,
          values.g8,
        ];
      }

      numbers = numbers.map(n => (n || '').trim()).filter(Boolean);

      if ((gameCode === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(gameCode)) && numbers.length < 27) {
        message.error(`Vui lòng điền đủ 27 giải theo KQXS Miền Bắc (hiện có ${numbers.length}/27 số), hoặc bấm Điền ngẫu nhiên`);
        setSavingKtResult(false);
        return;
      }
      if (['MN', 'MT'].includes(gameCode) && numbers.length < 18) {
        message.error(`Vui lòng điền đủ 18 giải (hiện có ${numbers.length}/18 số), hoặc bấm Điền ngẫu nhiên`);
        setSavingKtResult(false);
        return;
      }

      await api.put(`/draws/admin/${currentKienThietDraw._id}/results`, {
        winningNumbers: numbers,
        provinceId: values.provinceId || currentKienThietDraw.provinceId
      });
      message.success('Lưu kết quả thành công');
      setIsKienThietModalOpen(false);
      ktForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi lưu kết quả');
    } finally {
      setSavingKtResult(false);
    }
  };

  const handleCopyFromMb = () => {
    const targetDate = currentKienThietDraw?.closeTime ? new Date(currentKienThietDraw.closeTime).toISOString().slice(0, 10) : '';
    const mbDraw = draws.find((d: any) => 
      d.game?.code === 'MB' && 
      d.winningNumbers && 
      d.winningNumbers.length >= 27 &&
      (!targetDate || (d.closeTime && new Date(d.closeTime).toISOString().slice(0, 10) === targetDate))
    ) || draws.find((d: any) => d.game?.code === 'MB' && d.winningNumbers && d.winningNumbers.length >= 27);

    if (!mbDraw || !mbDraw.winningNumbers || mbDraw.winningNumbers.length < 27) {
      message.warning('Chưa có kết quả Xổ số Miền Bắc để sao chép. Bạn có thể tự nhập hoặc bấm Điền ngẫu nhiên.');
      return;
    }

    const nums = mbDraw.winningNumbers;
    ktForm.setFieldsValue({
      gdb: nums[0],
      g1: nums[1],
      g2_1: nums[2], g2_2: nums[3],
      g3_1: nums[4], g3_2: nums[5], g3_3: nums[6], g3_4: nums[7], g3_5: nums[8], g3_6: nums[9],
      g4_1: nums[10], g4_2: nums[11], g4_3: nums[12], g4_4: nums[13],
      g5_1: nums[14], g5_2: nums[15], g5_3: nums[16], g5_4: nums[17], g5_5: nums[18], g5_6: nums[19],
      g6_1: nums[20], g6_2: nums[21], g6_3: nums[22],
      g7_1: nums[23], g7_2: nums[24], g7_3: nums[25], g7_4: nums[26],
    });
    message.success(`Đã sao chép 27 kết quả từ Xổ số Miền Bắc (Kỳ ${mbDraw.drawCode})!`);
  };

  const handleRandomizeKienThiet = () => {
    const isMB = currentKienThietDraw?.game?.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(currentKienThietDraw?.game?.code);
    const randDigits = (len: number) => {
      let s = '';
      for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
      return s;
    };

    if (isMB) {
      ktForm.setFieldsValue({
        gdb: randDigits(5),
        g1: randDigits(5),
        g2_1: randDigits(5), g2_2: randDigits(5),
        g3_1: randDigits(5), g3_2: randDigits(5), g3_3: randDigits(5),
        g3_4: randDigits(5), g3_5: randDigits(5), g3_6: randDigits(5),
        g4_1: randDigits(4), g4_2: randDigits(4), g4_3: randDigits(4), g4_4: randDigits(4),
        g5_1: randDigits(4), g5_2: randDigits(4), g5_3: randDigits(4),
        g5_4: randDigits(4), g5_5: randDigits(4), g5_6: randDigits(4),
        g6_1: randDigits(3), g6_2: randDigits(3), g6_3: randDigits(3),
        g7_1: randDigits(2), g7_2: randDigits(2), g7_3: randDigits(2), g7_4: randDigits(2),
      });
    } else {
      ktForm.setFieldsValue({
        gdb: randDigits(6),
        g1: randDigits(5),
        g2: randDigits(5),
        g3_1: randDigits(5), g3_2: randDigits(5),
        g4_1: randDigits(5), g4_2: randDigits(5), g4_3: randDigits(5), g4_4: randDigits(5),
        g4_5: randDigits(5), g4_6: randDigits(5), g4_7: randDigits(5),
        g5: randDigits(4),
        g6_1: randDigits(4), g6_2: randDigits(4), g6_3: randDigits(4),
        g7: randDigits(3),
        g8: randDigits(2),
      });
    }
    message.success('Đã tự động điền ngẫu nhiên kết quả các giải!');
  };

  const columns: any = [
    {
      title: 'Ngày quay',
      key: 'drawDate',
      width: 110,
      render: (_: any, record: any) => {
        const d = record.closeTime || record.drawTime || record.openTime;
        return (
          <span style={{ fontWeight: 600, color: '#1e293b' }}>
            {d ? dayjs(d).format('DD/MM/YYYY') : '-'}
          </span>
        );
      }
    },
    {
      title: 'Mã Kỳ',
      dataIndex: 'drawCode',
      key: 'drawCode',
      width: 100,
      render: (text: string) => <strong style={{ color: '#dc2626' }}>{text}</strong>
    },
    {
      title: 'Game',
      key: 'game',
      width: 180,
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{record.game?.name || '-'}</span>
      )
    },
    {
      title: 'Tỉnh/Đài',
      key: 'province',
      width: 160,
      render: (_: any, record: any) => {
        if (!record.provinceId) return <span style={{ color: '#94a3b8' }}>-</span>;
        const prov = provinces.find(p => p.provinceId === record.provinceId);
        return (
          <Tag color="geekblue" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>
            {prov ? prov.name : record.provinceId}
          </Tag>
        );
      }
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 230,
      render: (_: any, record: any) => (
        <div style={{ fontSize: '13px', color: '#666' }}>
          <div><strong>Mở:</strong> {new Date(record.openTime).toLocaleString('vi-VN')}</div>
          <div><strong>Đóng:</strong> {new Date(record.closeTime).toLocaleString('vi-VN')}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        let color = 'default';
        if (status === 'open') color = 'green';
        if (status === 'closed') color = 'red';
        if (status === 'completed') color = 'default';
        return <Tag color={color}>{status ? status.toUpperCase() : 'OPEN'}</Tag>;
      }
    },
    {
      title: 'Kết quả (Cập nhật)',
      key: 'result',
      width: 220,
      render: (_: any, record: any) => {
        if (record.status === 'completed') {
          return (
            <div style={{ fontWeight: 'bold', color: '#dc2626', letterSpacing: 1, fontSize: 15 }}>
              {record.winningNumbers?.join(' ')}
            </div>
          );
        }

        if (editingDrawId === record._id) {
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="VD: 02, 15, 30..."
                value={winningNumbersInput}
                onChange={(e) => setWinningNumbersInput(e.target.value)}
              />
              <Space>
                <Button size="small" icon={<SyncOutlined />} onClick={() => handleRandomize(record.game)} disabled={savingResultId === record._id}>Random</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveResult(record._id)} loading={savingResultId === record._id} disabled={savingResultId === record._id}>Lưu</Button>
                <Button size="small" type="text" onClick={() => setEditingDrawId(null)} disabled={savingResultId === record._id}>Hủy</Button>
              </Space>
            </Space>
          );
        }

        return (
          <Button
            type="link"
            style={{ fontWeight: 500 }}
            onClick={() => {
              if (['MB', 'MT', 'MN', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(record.game?.code)) {
                setCurrentKienThietDraw(record);
                ktForm.resetFields();
                setIsKienThietModalOpen(true);
              } else {
                setEditingDrawId(record._id);
                setWinningNumbersInput('');
              }
            }}
          >
            + Nhập kết quả
          </Button>
        );
      }
    },
    ...(canEditDraw || canDeleteDraw ? [{
      fixed: 'right' as const,
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_: any, record: any) => (
        <Space>
          {canEditDraw && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              Sửa
            </Button>
          )}
          {canDeleteDraw && (
            <Popconfirm
              title="Xác nhận xóa kỳ quay?"
              description={`Bạn có chắc muốn xóa kỳ quay ${record.drawCode}?`}
              onConfirm={() => handleDeleteDraw(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
              >
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }] : [])
  ];

  const displayDraws = useMemo(() => {
    return draws.filter(d => {
      const isRedundant = isDerived3MienGame(d.game, games);
      if (!showRedundantDraws && isRedundant) return false;
      if (showRedundantDraws && !isRedundant) return false;
      if (filterStatus && filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterProvinceId && filterProvinceId !== 'all' && d.provinceId !== filterProvinceId) return false;
      if (filterDate) {
        const dDate = dayjs(d.closeTime || d.drawTime || d.openTime).format('YYYY-MM-DD');
        if (dDate !== filterDate.format('YYYY-MM-DD')) return false;
      }
      if (searchCode.trim()) {
        const q = searchCode.toLowerCase().trim();
        if (!(d.drawCode || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
}, [draws, games, showRedundantDraws, filterStatus, filterProvinceId, filterDate, searchCode]);

return (
  <div className="cms-page-container">
    <div className="cms-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Title style={{ marginTop: 0, marginBottom: 0 }} level={3} >Quản lý Kỳ quay (Draws)</Title>
      <Space>
        {canDeleteDraw && selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`Xóa ${selectedRowKeys.length} kỳ quay đã chọn?`}
            description="Hành động này sẽ xóa vĩnh viễn các kỳ quay đã chọn."
            onConfirm={handleBulkDelete}
            okText="Xóa ngay"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xóa ({selectedRowKeys.length}) kỳ đã chọn
            </Button>
          </Popconfirm>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Mở kỳ quay mới
        </Button>
      </Space>
    </div>

    {redundantDraws.length > 0 && (
      <Alert
        style={{ marginBottom: 16, flexShrink: 0 }}
        type="warning"
        showIcon
        message={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>
              Phát hiện <strong>{redundantDraws.length}</strong> kỳ quay của các game ăn theo XSKT (Lô Đề, Trượt...).
              Các game này dùng chung kết quả từ đài XSKT 3 Miền tương ứng nên không cần kỳ quay riêng.
            </span>
            <Space>
              <Button
                size="small"
                onClick={() => setShowRedundantDraws(!showRedundantDraws)}
              >
                {showRedundantDraws ? 'Quay lại danh sách kỳ quay chính' : `Xem (${redundantDraws.length}) kỳ quay thừa`}
              </Button>
              {canDeleteDraw && (
                <Popconfirm
                  title={`Dọn dẹp ${redundantDraws.length} kỳ quay thừa?`}
                  description="Hệ thống sẽ xóa vĩnh viễn các kỳ quay này để tránh nhầm lẫn khi quay số."
                  onConfirm={handleDeleteAllRedundantDraws}
                  okText="Xóa sạch ngay"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading: cleaningRedundant }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} loading={cleaningRedundant}>
                    Dọn dẹp sạch ({redundantDraws.length})
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        }
      />
    )}

    <div className="cms-filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8 }}>
      <Input.Search
        placeholder="Tìm theo Mã kỳ quay..."
        value={searchCode}
        onChange={(e) => setSearchCode(e.target.value)}
        onSearch={() => {
          setPage(1);
          fetchData();
        }}
        style={{ width: 190 }}
        allowClear
      />

      <Space size="small">
        <span style={{ fontWeight: 500, fontSize: 13 }}>Ngày quay:</span>
        <DatePicker
          placeholder="Chọn ngày quay"
          format="DD/MM/YYYY"
          value={filterDate}
          onChange={(val) => {
            setFilterDate(val);
            setPage(1);
          }}
          allowClear
          style={{ width: 145 }}
        />
      </Space>

      <Space size="small">
        <span style={{ fontWeight: 500, fontSize: 13 }}>Game:</span>
        <Select
          placeholder="Tất cả game"
          style={{ width: 170 }}
          allowClear
          value={filterGameId || undefined}
          onChange={(val) => {
            setFilterGameId(val || null);
            setPage(1);
          }}
        >
            {
              playableGames.map(g => (
                <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
              ))
            }
          </Select>
      </Space>

      <Space size="small">
        <span style={{ fontWeight: 500, fontSize: 13 }}>Tỉnh/Đài:</span>
        <Select
          placeholder="Tất cả Tỉnh/Đài"
          style={{ width: 180 }}
          showSearch
          optionFilterProp="children"
          allowClear
          value={filterProvinceId === 'all' || !filterProvinceId ? undefined : filterProvinceId}
          onChange={(val) => {
            setFilterProvinceId(val || 'all');
            setPage(1);
          }}
        >
          <Select.Option value="all">Tất cả Tỉnh/Đài</Select.Option>
          {provinces.map(p => (
            <Select.Option key={p.provinceId} value={p.provinceId}>{p.name} ({p.region})</Select.Option>
          ))}
        </Select>
      </Space>

      <Space size="small">
        <span style={{ fontWeight: 500, fontSize: 13 }}>Trạng thái:</span>
        <Select
          placeholder="Tất cả"
          style={{ width: 140 }}
          value={filterStatus}
          onChange={(val) => {
            setFilterStatus(val);
            setPage(1);
          }}
          options={[
            { label: 'Tất cả trạng thái', value: 'all' },
            { label: 'Đang mở (OPEN)', value: 'open' },
            { label: 'Chờ quay (CLOSED)', value: 'closed' },
            { label: 'Đã có KQ (COMPLETED)', value: 'completed' },
          ]}
        />
      </Space>

      {(searchCode || filterGameId || (filterProvinceId && filterProvinceId !== 'all') || filterDate || filterStatus !== 'all') && (
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setSearchCode('');
            setFilterGameId(null);
            setFilterProvinceId('all');
            setFilterDate(null);
            setFilterStatus('all');
            setPage(1);
          }}
          style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
        >
          Xoá bộ lọc
        </Button>
      )}
    </div>

    <Table
      className="cms-table-fill"
      scroll={{ y: '100%', x: 1350 }}
      columns={columns}
      dataSource={displayDraws}
      rowKey="_id"
      loading={loading}
      rowSelection={canDeleteDraw ? {
        selectedRowKeys,
        onChange: (newSelectedKeys) => setSelectedRowKeys(newSelectedKeys)
      } : undefined}
      pagination={{
        current: page,
        pageSize: 10,
        total: total,
        onChange: (newPage) => setPage(newPage),
        showSizeChanger: false
      }}
    />

    <Modal
      title="Mở kỳ quay mới"
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateDraw}
      >
        <Form.Item
          name="gameId"
          label="Loại Game"
          rules={[{ required: true, message: 'Vui lòng chọn game' }]}
          extra="Chỉ tạo kỳ quay cho các đài XSKT 3 Miền hoặc Vietlott/Điện toán tự quay độc lập (Lô Đề / Trượt tự động dùng chung kết quả đài 3 Miền)."
        >
          <Select
            placeholder="Chọn game..."
            onChange={(value) => {
              const game = playableGames.find(g => g._id === value);
              if (game) {
                const now = dayjs();
                let closeTime = null;
                if (game.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(game.code)) {
                  closeTime = now.hour(18).minute(10).second(0);
                } else if (game.code === 'MT') {
                  closeTime = now.hour(17).minute(10).second(0);
                } else if (game.code === 'MN') {
                  closeTime = now.hour(16).minute(10).second(0);
                }

                if (closeTime) {
                  form.setFieldsValue({
                    openTime: now,
                    closeTime: closeTime
                  });
                }
              }
            }}
          >
              {
                playableGames.map(g => (
                  <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
                ))
              }
            </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.gameId !== currentValues.gameId}
        >
          {({ getFieldValue }) => {
            const gameId = getFieldValue('gameId');
            const game = playableGames.find(g => g._id === gameId);
            if (game && ['MB', 'MT', 'MN'].includes(game.code)) {
              return (
                <Form.Item
                  name="provinceId"
                  label="Tỉnh/Đài"
                  rules={[{ required: true, message: 'Vui lòng chọn đài' }]}
                >
                  <Select placeholder="Chọn đài...">
                    {provinces.filter(p => p.region === game.code).map(p => (
                      <Select.Option key={p._id} value={p.provinceId}>{p.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>

        <Form.Item
          name="drawCode"
          label="Mã kỳ (VD: #00742)"
          rules={[{ required: true, message: 'Vui lòng nhập mã kỳ' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="openTime"
          label="Mở bán lúc"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="closeTime"
          label="Kết thúc lúc"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setIsModalOpen(false)} disabled={creatingDraw}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creatingDraw} disabled={creatingDraw}>Tạo mới</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title={`Nhập kết quả ${currentKienThietDraw?.game?.name || ''} ${currentKienThietDraw?.provinceId ? `- Đài ${provinces.find(p => p.provinceId === currentKienThietDraw.provinceId)?.name}` : ''} ${['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(currentKienThietDraw?.game?.code) ? '(Theo KQXS Miền Bắc)' : ''}`}
      open={isKienThietModalOpen}
      onCancel={() => setIsKienThietModalOpen(false)}
      footer={null}
      width={700}
      centered
      styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' } }}
    >
      <Form
        form={ktForm}
        layout="vertical"
        onFinish={handleSaveKienThietResult}
      >
        {!currentKienThietDraw?.provinceId && ['MT', 'MN'].includes(currentKienThietDraw?.game?.code) && (
          <Form.Item
            name="provinceId"
            label="Tỉnh/Đài"
            rules={[{ required: true, message: 'Vui lòng chọn đài' }]}
          >
            <Select placeholder="Chọn đài...">
              {provinces.filter(p => p.region === currentKienThietDraw.game.code).map(p => (
                <Select.Option key={p._id} value={p.provinceId}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {(currentKienThietDraw?.game?.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(currentKienThietDraw?.game?.code)) ? (
          <>
            <Title level={5}>Đặc biệt</Title>
            <Form.Item name="gdb"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

            <Title level={5}>Giải Nhất</Title>
            <Form.Item name="g1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

            <Title level={5}>Giải Nhì</Title>
            <Space wrap><Form.Item name="g2_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item><Form.Item name="g2_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item></Space>

            <Title level={5}>Giải Ba</Title>
            <Space wrap>
              <Form.Item name="g3_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_3"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
              <Form.Item name="g3_4"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_5"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_6"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
            </Space>

            <Title level={5}>Giải Tư</Title>
            <Space wrap>
              <Form.Item name="g4_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_4"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
            </Space>

            <Title level={5}>Giải Năm</Title>
            <Space wrap>
              <Form.Item name="g5_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
              <Form.Item name="g5_4"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_5"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_6"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
            </Space>

            <Title level={5}>Giải Sáu</Title>
            <Space wrap><Form.Item name="g6_1"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_2"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_3"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item></Space>

            <Title level={5}>Giải Bảy</Title>
            <Space wrap><Form.Item name="g7_1"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_2"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_3"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_4"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item></Space>
          </>
        ) : (
          <>
            <Title level={5}>Giải Tám</Title>
            <Form.Item name="g8"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item>

            <Title level={5}>Giải Bảy</Title>
            <Form.Item name="g7"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item>

            <Title level={5}>Giải Sáu</Title>
            <Space wrap><Form.Item name="g6_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item></Space>

            <Title level={5}>Giải Năm</Title>
            <Form.Item name="g5"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 120 }} /></Form.Item>

            <Title level={5}>Giải Tư</Title>
            <Space wrap>
              <Form.Item name="g4_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_3"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_4"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
              <Form.Item name="g4_5"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_6"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_7"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
            </Space>

            <Title level={5}>Giải Ba</Title>
            <Space wrap><Form.Item name="g3_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item><Form.Item name="g3_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item></Space>

            <Title level={5}>Giải Nhì</Title>
            <Form.Item name="g2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

            <Title level={5}>Giải Nhất</Title>
            <Form.Item name="g1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

            <Title level={5}>Đặc biệt</Title>
            <Form.Item name="gdb"><Input placeholder="6 chữ số" maxLength={6} style={{ width: 150 }} /></Form.Item>
          </>
        )}

        <Form.Item style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<SyncOutlined />} onClick={handleRandomizeKienThiet} style={{ marginRight: 'auto' }} disabled={savingKtResult}>
            Điền ngẫu nhiên (Random)
          </Button>
          <Space>
            <Button onClick={() => setIsKienThietModalOpen(false)} disabled={savingKtResult}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={savingKtResult} disabled={savingKtResult}>Lưu Kết Quả</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      title={`Chỉnh sửa kỳ quay ${editingDraw?.drawCode || ''} ${editingDraw?.game?.name ? `(${editingDraw.game.name})` : ''}`}
      open={isEditModalOpen}
      onCancel={() => setIsEditModalOpen(false)}
      footer={null}
      width={['MB', 'MT', 'MN', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(editingDraw?.game?.code) ? 750 : 550}
      centered
      styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' } }}
    >
      <Form
        form={editForm}
        layout="vertical"
        onFinish={handleSaveEdit}
      >
        <Form.Item
          name="drawCode"
          label="Mã kỳ quay"
          rules={[{ required: true, message: 'Vui lòng nhập mã kỳ' }]}
        >
          <Input placeholder="VD: #1320" />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="open">Đang mở cược (OPEN)</Select.Option>
            <Select.Option value="closed">Đã chốt vé / Chờ xổ (CLOSED)</Select.Option>
            <Select.Option value="completed">Đã hoàn thành / Đã có KQ (COMPLETED)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="provinceId"
          label="Tỉnh/Đài"
        >
          <Select placeholder="Chọn đài (nếu có)" allowClear showSearch optionFilterProp="children">
            {provinces.map(p => (
              <Select.Option key={p.provinceId} value={p.provinceId}>{p.name} ({p.region})</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="openTime"
          label="Thời gian mở cược"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian mở' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>

        <Form.Item
          name="closeTime"
          label="Thời gian chốt vé (Đóng cược)"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian chốt' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>

        <Form.Item
          name="drawTime"
          label="Thời gian mở thưởng xổ số (Tùy chọn)"
        >
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" placeholder="Chọn thời gian mở thưởng (nếu có)" />
        </Form.Item>

        {['MB', 'MT', 'MN', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(editingDraw?.game?.code) ? (
          <div style={{ marginTop: 12, marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: '#1f2937' }}>
                Kết quả từng giải ({editingDraw?.game?.name || editingDraw?.game?.code}):
              </strong>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Điền ngẫu nhiên (Random)
              </Button>
            </div>

            {(editingDraw?.game?.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(editingDraw?.game?.code)) ? (
              <>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85, color: '#dc2626' }}>Đặc biệt:</span>
                  <Form.Item name="gdb" noStyle><Input placeholder="5 chữ số" maxLength={5} style={{ width: 140 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Nhất:</span>
                  <Form.Item name="g1" noStyle><Input placeholder="5 chữ số" maxLength={5} style={{ width: 140 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Nhì:</span>
                  <Space wrap>
                    <Form.Item name="g2_1" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 110 }} /></Form.Item>
                    <Form.Item name="g2_2" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 110 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Ba:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g3_1" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g3_2" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g3_3" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g3_4" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g3_5" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g3_6" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Tư:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g4_1" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_2" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_3" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_4" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Năm:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g5_1" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g5_2" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g5_3" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g5_4" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g5_5" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g5_6" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Sáu:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g6_1" noStyle><Input placeholder="3 số" maxLength={3} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g6_2" noStyle><Input placeholder="3 số" maxLength={3} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g6_3" noStyle><Input placeholder="3 số" maxLength={3} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Bảy:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g7_1" noStyle><Input placeholder="2 số" maxLength={2} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g7_2" noStyle><Input placeholder="2 số" maxLength={2} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g7_3" noStyle><Input placeholder="2 số" maxLength={2} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g7_4" noStyle><Input placeholder="2 số" maxLength={2} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Tám:</span>
                  <Form.Item name="g8" noStyle><Input placeholder="2 chữ số" maxLength={2} style={{ width: 110 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Bảy:</span>
                  <Form.Item name="g7" noStyle><Input placeholder="3 chữ số" maxLength={3} style={{ width: 110 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Sáu:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g6_1" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g6_2" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g6_3" noStyle><Input placeholder="4 số" maxLength={4} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Năm:</span>
                  <Form.Item name="g5" noStyle><Input placeholder="4 chữ số" maxLength={4} style={{ width: 110 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Tư:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g4_1" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_2" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_3" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_4" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_5" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_6" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                    <Form.Item name="g4_7" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 95 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, width: 85, paddingTop: 4 }}>Giải Ba:</span>
                  <Space wrap style={{ flex: 1 }}>
                    <Form.Item name="g3_1" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 110 }} /></Form.Item>
                    <Form.Item name="g3_2" noStyle><Input placeholder="5 số" maxLength={5} style={{ width: 110 }} /></Form.Item>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Nhì:</span>
                  <Form.Item name="g2" noStyle><Input placeholder="5 chữ số" maxLength={5} style={{ width: 130 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85 }}>Giải Nhất:</span>
                  <Form.Item name="g1" noStyle><Input placeholder="5 chữ số" maxLength={5} style={{ width: 130 }} /></Form.Item>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, width: 85, color: '#dc2626' }}>Đặc biệt:</span>
                  <Form.Item name="gdb" noStyle><Input placeholder="6 chữ số" maxLength={6} style={{ width: 130 }} /></Form.Item>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>Kết quả xổ số (Các số cách nhau bằng dấu phẩy):</span>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Điền ngẫu nhiên (Random)
              </Button>
            </div>
            <Form.Item name="winningNumbers" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={3} placeholder="VD: 05, 12, 28, 45, 60..." />
            </Form.Item>
          </div>
        )}

        {editingDraw?.game?.type === 'vietlott' && (
          <Form.Item
            name="jackpotAmount"
            label="Giải Jackpot (VNĐ)"
          >
            <Input type="number" placeholder="VD: 15000000000" />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setIsEditModalOpen(false)} disabled={savingEditDraw}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={savingEditDraw} disabled={savingEditDraw}>Lưu thay đổi</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  </div>
);
}
