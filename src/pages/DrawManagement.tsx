import { PlusOutlined, SaveOutlined, SyncOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message} from 'antd';
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
  const [specialNumberInput, setSpecialNumberInput] = useState('');

  const [isKienThietModalOpen, setIsKienThietModalOpen] = useState(false);
  const [currentKienThietDraw, setCurrentKienThietDraw] = useState<any>(null);

  const playableGames = useMemo(() => {
    const list = games
      .filter(g => !isDerived3MienGame(g))
      .map(g => {
        if (g.code === 'than_tai_4') {
          return { ...g, name: 'ĐIỆN TOÁN Thần Tài' };
        }
        if (g.code === 'dientoan_123') {
          return { ...g, name: 'ĐIỆN TOÁN 1*2*3' };
        }
        return g;
      });

    const hasDt123 = list.some(g => g.code === 'dientoan_123');
    if (!hasDt123) {
      const dt123FromDraw = draws.find(d => d.game?.code === 'dientoan_123')?.game;
      list.push({
        _id: dt123FromDraw?._id || 'dientoan_123',
        code: 'dientoan_123',
        name: 'ĐIỆN TOÁN 1*2*3'
      });
    }

    return list;
  }, [games, draws]);

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
        games.length > 0 ? Promise.resolve({ data: games }) : api.get('/games?admin=true'),
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
    } else if (gCode === 'max_4d') {
      formVals.m4d_nhat = nums[0] || '';
      formVals.m4d_nhi_1 = nums[1] || '';
      formVals.m4d_nhi_2 = nums[2] || '';
      formVals.m4d_ba_1 = nums[3] || '';
      formVals.m4d_ba_2 = nums[4] || '';
      formVals.m4d_ba_3 = nums[5] || '';
    } else if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
      for (let i = 1; i <= 2; i++) formVals[`m3d_db_${i}`] = nums[i - 1] || '';
      for (let i = 1; i <= 4; i++) formVals[`m3d_nhat_${i}`] = nums[2 + i - 1] || '';
      for (let i = 1; i <= 6; i++) formVals[`m3d_nhi_${i}`] = nums[6 + i - 1] || '';
      for (let i = 1; i <= 8; i++) formVals[`m3d_ba_${i}`] = nums[12 + i - 1] || '';
    } else if (gCode === 'than_tai_4') {
      formVals.tt_1 = nums[0] || '';
      formVals.tt_2 = nums[1] || '';
      formVals.tt_3 = nums[2] || '';
      formVals.tt_4 = nums[3] || '';
    } else if (gCode === 'dientoan_123') {
      formVals.dt123_1 = nums[0] || '';
      formVals.dt123_2 = nums[1] || '';
      formVals.dt123_3 = nums[2] || '';
    } else if (gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655') {
      const isPower = gCode === 'power_655';
      const maxMain = isPower ? 6 : 5;
      const special = (record.specialNumbers && record.specialNumbers.length > 0)
        ? record.specialNumbers[0]
        : (nums.length > maxMain ? nums[maxMain] : '');
      const mains = special ? nums.slice(0, maxMain) : nums.slice(0, maxMain);
      formVals.lotto_mains = mains.join(', ');
      formVals.lotto_special = special;
    }

    editForm.setFieldsValue(formVals);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (values: any) => {
    try {
      setSavingEditDraw(true);
      const gCode = editingDraw?.game?.code;
      let numbers: string[] = [];
      let specialNumbers: string[] | undefined = undefined;

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
      } else if (gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655') {
        const isPower = gCode === 'power_655';
        const maxMain = isPower ? 6 : 5;
        let mains: string[] = [];
        let sp = (values.lotto_special || '').trim();

        if (values.lotto_mains) {
          mains = values.lotto_mains.split(/[\s,]+/).map((s: string) => s.trim().padStart(2, '0')).filter(Boolean);
        } else if (values.winningNumbers) {
          if (values.winningNumbers.includes('|') || values.winningNumbers.includes('+')) {
            const sep = values.winningNumbers.includes('|') ? '|' : '+';
            const [mStr, sStr] = values.winningNumbers.split(sep);
            mains = mStr.split(/[\s,]+/).map((s: string) => s.trim().padStart(2, '0')).filter(Boolean);
            sp = (sStr || '').split(/[\s,]+/).map((s: string) => s.trim().padStart(2, '0')).filter(Boolean)[0] || sp;
          } else {
            const all = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim().padStart(2, '0')).filter(Boolean);
            if (all.length > maxMain) {
              mains = all.slice(0, maxMain);
              sp = all[maxMain];
            } else {
              mains = all;
            }
          }
        }

        if (sp) sp = sp.padStart(2, '0');
        numbers = sp ? [...mains, sp] : mains;
        if (sp) specialNumbers = [sp];
      } else if (gCode === 'max_4d') {
        const nhat = (values.m4d_nhat || '').toString().trim();
        const nhi = [values.m4d_nhi_1, values.m4d_nhi_2].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const ba = [values.m4d_ba_1, values.m4d_ba_2, values.m4d_ba_3].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const combined = [nhat, ...nhi, ...ba].filter(Boolean).map(s => s.padStart(4, '0'));
        if (combined.length === 6) {
          numbers = combined;
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim().padStart(4, '0')).filter(Boolean);
        }
      } else if (gCode === 'max_4d') {
        numbers = winningNumbersInput.split(/[\s,]+/).map(n => n.trim().padStart(4, '0')).filter(Boolean);
      } else if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
        const db = [values.m3d_db_1, values.m3d_db_2].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const nhat = [values.m3d_nhat_1, values.m3d_nhat_2, values.m3d_nhat_3, values.m3d_nhat_4].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const nhi = [values.m3d_nhi_1, values.m3d_nhi_2, values.m3d_nhi_3, values.m3d_nhi_4, values.m3d_nhi_5, values.m3d_nhi_6].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const ba = [values.m3d_ba_1, values.m3d_ba_2, values.m3d_ba_3, values.m3d_ba_4, values.m3d_ba_5, values.m3d_ba_6, values.m3d_ba_7, values.m3d_ba_8].map(s => (s ?? '').toString().trim()).filter(Boolean);
        const combined = [...db, ...nhat, ...nhi, ...ba].map(s => s.padStart(3, '0'));
        if (combined.length === 20) {
          numbers = combined;
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim().padStart(3, '0')).filter(Boolean);
        }
      } else if (gCode === 'than_tai_4') {
        const ttNums = [values.tt_1, values.tt_2, values.tt_3, values.tt_4].map(s => (s ?? '').toString().trim()).filter(Boolean);
        if (ttNums.length === 4) {
          numbers = ttNums;
        } else if (values.winningNumbers) {
          const raw = values.winningNumbers.replace(/[^0-9]/g, '');
          if (raw.length === 4) {
            numbers = raw.split('');
          } else {
            numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 4);
          }
        }
      } else if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
        numbers = winningNumbersInput.split(/[\s,]+/).map(n => n.trim().padStart(3, '0')).filter(Boolean);
      } else if (gCode === 'dientoan_123') {
        const dtNums = [values.dt123_1, values.dt123_2, values.dt123_3].map(s => (s ?? '').toString().trim()).filter(Boolean);
        if (dtNums.length >= 3) {
          numbers = [
            dtNums[0].slice(-1),
            dtNums[1].padStart(2, '0').slice(-2),
            dtNums[2].padStart(3, '0').slice(-3)
          ];
        } else if (values.winningNumbers) {
          const parts = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean);
          if (parts.length >= 3) {
            numbers = [
              parts[0].slice(-1),
              parts[1].padStart(2, '0').slice(-2),
              parts[2].padStart(3, '0').slice(-3)
            ];
          } else {
            numbers = parts;
          }
        }
      } else if (gCode === 'bingo18' || gCode === 'bingo_18') {
        const raw = (values.winningNumbers || '').trim();
        const digits = raw.replace(/[^1-6]/g, '').slice(0, 3);
        if (digits.length === 3) {
          numbers = digits.split('');
        } else {
          numbers = raw.split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean);
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
      if (specialNumbers && specialNumbers.length > 0) {
        payload.specialNumbers = specialNumbers;
      }
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

    if (gCode === 'max_4d') {
      const rand4 = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const nhat = rand4();
      const nhi1 = rand4();
      const nhi2 = rand4();
      const ba1 = rand4();
      const ba2 = rand4();
      const ba3 = rand4();
      editForm.setFieldsValue({
        m4d_nhat: nhat,
        m4d_nhi_1: nhi1,
        m4d_nhi_2: nhi2,
        m4d_ba_1: ba1,
        m4d_ba_2: ba2,
        m4d_ba_3: ba3,
        winningNumbers: `${nhat}, ${nhi1}, ${nhi2}, ${ba1}, ${ba2}, ${ba3}`
      });
      message.success('Đã tự động sinh 6 bộ số (4 chữ số: 0000-9999) cho Max 4D!');
      return;
    }

    if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
      const rand3 = () => Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const vals: any = {};
      const all: string[] = [];
      for (let i = 1; i <= 2; i++) {
        const val = rand3();
        vals[`m3d_db_${i}`] = val;
        all.push(val);
      }
      for (let i = 1; i <= 4; i++) {
        const val = rand3();
        vals[`m3d_nhat_${i}`] = val;
        all.push(val);
      }
      for (let i = 1; i <= 6; i++) {
        const val = rand3();
        vals[`m3d_nhi_${i}`] = val;
        all.push(val);
      }
      for (let i = 1; i <= 8; i++) {
        const val = rand3();
        vals[`m3d_ba_${i}`] = val;
        all.push(val);
      }
      vals.winningNumbers = all.join(', ');
      editForm.setFieldsValue(vals);
      message.success('Đã tự động sinh ngẫu nhiên 20 bộ số (3 chữ số) cho Max 3D!');
      return;
    }

    if (gCode === 'than_tai_4') {
      const d1 = Math.floor(Math.random() * 10).toString();
      const d2 = Math.floor(Math.random() * 10).toString();
      const d3 = Math.floor(Math.random() * 10).toString();
      const d4 = Math.floor(Math.random() * 10).toString();
      editForm.setFieldsValue({
        tt_1: d1,
        tt_2: d2,
        tt_3: d3,
        tt_4: d4,
        winningNumbers: `${d1}, ${d2}, ${d3}, ${d4}`
      });
      message.success('Đã tự động sinh 4 chữ số Thần Tài 4!');
      return;
    }

    if (gCode === 'dientoan_123') {
      const b1 = Math.floor(Math.random() * 10).toString();
      const b2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const b3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      editForm.setFieldsValue({
        dt123_1: b1,
        dt123_2: b2,
        dt123_3: b3,
        winningNumbers: `${b1}, ${b2}, ${b3}`
      });
      message.success('Đã tự động sinh 3 bộ số Điện toán 1*2*3!');
      return;
    }

    if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
      const arr: string[] = [];
      for (let i = 0; i < 20; i++) {
        arr.push(Math.floor(Math.random() * 1000).toString().padStart(3, '0'));
      }
      setWinningNumbersInput(arr.join(', '));
      message.success(`Đã tự động sinh 20 bộ số (3 chữ số 000-999) cho ${game?.name || 'Max 3D'}!`);
      return;
    }

    if (gCode === 'lotto_535') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 35) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const sp = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      editForm.setFieldsValue({
        lotto_mains: sortedMains.join(', '),
        lotto_special: sp,
        winningNumbers: `${sortedMains.join(', ')} | ${sp}`
      });
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/35)!');
      return;
    }

    if (gCode === 'lotto_570') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 70) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const sp = (Math.floor(Math.random() * 25) + 1).toString().padStart(2, '0');
      editForm.setFieldsValue({
        lotto_mains: sortedMains.join(', '),
        lotto_special: sp,
        winningNumbers: `${sortedMains.join(', ')} | ${sp}`
      });
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/70)!');
      return;
    }

    if (gCode === 'power_655') {
      const mains = new Set<string>();
      while (mains.size < 6) {
        mains.add((Math.floor(Math.random() * 55) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      let sp = '';
      while (!sp || mains.has(sp)) {
        sp = (Math.floor(Math.random() * 55) + 1).toString().padStart(2, '0');
      }
      editForm.setFieldsValue({
        lotto_mains: sortedMains.join(', '),
        lotto_special: sp,
        winningNumbers: `${sortedMains.join(', ')} | ${sp}`
      });
      message.success('Đã tự động sinh 6 số chính + 1 số đặc biệt (Power 6/55)!');
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
    } else if (gCode === 'mega_645') {
      maxNum = 45;
      reqCount = 6;
    } else if (gCode.includes('636') || gCode === 'dientoan_636') {
      maxNum = 36;
      reqCount = 6;
    } else if (gCode === 'lotto_535') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 35) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(`${sortedMains.join(', ')} | ${specialNum}`);
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/35)!');
      return;
    } else if (gCode === 'lotto_570') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 70) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 25) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(`${sortedMains.join(', ')} | ${specialNum}`);
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/70)!');
      return;
    } else if (gCode === 'bingo18' || gCode === 'bingo_18') {
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ].sort((a, b) => a - b);
      editForm.setFieldsValue({
        winningNumbers: dice.join(', ')
      });
      message.success('Đã tự động sinh ngẫu nhiên 3 số xí ngầu!');
      return;
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

    if (gCode === 'lotto_535') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 35) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const sp = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(sortedMains.join(', '));
      setSpecialNumberInput(sp);
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/35)!');
      return;
    }

    if (gCode === 'lotto_570') {
      const mains = new Set<string>();
      while (mains.size < 5) {
        mains.add((Math.floor(Math.random() * 70) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      const sp = (Math.floor(Math.random() * 25) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(sortedMains.join(', '));
      setSpecialNumberInput(sp);
      message.success('Đã tự động sinh 5 số chính + 1 số đặc biệt (Lotto 5/70)!');
      return;
    }

    if (gCode === 'power_655') {
      const mains = new Set<string>();
      while (mains.size < 6) {
        mains.add((Math.floor(Math.random() * 55) + 1).toString().padStart(2, '0'));
      }
      const sortedMains = Array.from(mains).sort((a, b) => parseInt(a) - parseInt(b));
      let sp = '';
      while (!sp || mains.has(sp)) {
        sp = (Math.floor(Math.random() * 55) + 1).toString().padStart(2, '0');
      }
      setWinningNumbersInput(sortedMains.join(', '));
      setSpecialNumberInput(sp);
      message.success('Đã tự động sinh 6 số chính + 1 số đặc biệt (Power 6/55)!');
      return;
    }

    if (gCode === 'max_4d') {
      const arr: string[] = [];
      for (let i = 0; i < 6; i++) {
        arr.push(Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
      }
      setWinningNumbersInput(arr.join(', '));
      message.success('Đã tự động sinh ngẫu nhiên 6 bộ số Max 4D (4 chữ số: 0000-9999)!');
      return;
    }

    if (!game) {
      // Fallback
    } else if (gCode.includes('keno')) {
      maxNum = 80;
      reqCount = 20;
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
    } else if (gCode === 'bingo18' || gCode === 'bingo_18') {
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ].sort((a, b) => a - b);
      setWinningNumbersInput(dice.join(', '));
      message.success('Đã tự động sinh ngẫu nhiên 3 số xí ngầu!');
      return;
    }

    while (nums.size < reqCount) {
      const rnd = Math.floor(Math.random() * maxNum) + 1;
      nums.add(rnd.toString().padStart(2, '0'));
    }

    const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
    setWinningNumbersInput(sortedNums.join(', '));
  };

  const handleSaveResult = async (id: string, record?: any) => {
    try {
      setSavingResultId(id);
      const gCode = (record?.game?.code || '').toLowerCase();
      let numbers: string[] = [];

      if (gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655') {
        const isPower = gCode === 'power_655';
        const maxMain = isPower ? 6 : 5;
        let mains = winningNumbersInput.split(/[\s,]+/).map(s => s.trim().padStart(2, '0')).filter(Boolean);
        let sp = (specialNumberInput || '').trim();

        if (!sp) {
          if (winningNumbersInput.includes('|') || winningNumbersInput.includes('+')) {
            const sep = winningNumbersInput.includes('|') ? '|' : '+';
            const [mStr, sStr] = winningNumbersInput.split(sep);
            mains = mStr.split(/[\s,]+/).map(s => s.trim().padStart(2, '0')).filter(Boolean);
            sp = (sStr || '').split(/[\s,]+/).map(s => s.trim().padStart(2, '0')).filter(Boolean)[0] || '';
          } else if (mains.length > maxMain) {
            sp = mains[maxMain];
            mains = mains.slice(0, maxMain);
          }
        }

        if (sp) sp = sp.padStart(2, '0');
        numbers = sp ? [...mains, sp] : mains;
        const payload: any = { winningNumbers: numbers };
        if (sp) payload.specialNumbers = [sp];
        await api.put(`/draws/admin/${id}/results`, payload);
        message.success('Lưu kết quả thành công');
        setEditingDrawId(null);
        setSpecialNumberInput('');
        fetchData();
        return;
      }
      if (gCode === 'bingo18' || gCode === 'bingo_18') {
        const raw = winningNumbersInput.trim();
        const digits = raw.replace(/[^1-6]/g, '').slice(0, 3);
        if (digits.length === 3) {
          numbers = digits.split('');
        } else {
          numbers = raw.split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
        }
      } else if (gCode === 'than_tai_4') {
        const clean = winningNumbersInput.trim();
        const digits = clean.replace(/[^0-9]/g, '');
        if (digits.length === 4) {
          numbers = digits.split('');
        } else {
          numbers = clean.split(/[\s,]+/).map(n => n.trim()).filter(Boolean).slice(0, 4);
        }
      } else if (gCode === 'dientoan_123') {
        const parts = winningNumbersInput.split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
        if (parts.length >= 3) {
          numbers = [
            parts[0].slice(-1),
            parts[1].padStart(2, '0').slice(-2),
            parts[2].padStart(3, '0').slice(-3)
          ];
        } else {
          numbers = parts;
        }
      } else if (gCode === 'max_4d') {
        numbers = winningNumbersInput.split(/[\s,]+/).map(n => n.trim().padStart(4, '0')).filter(Boolean).slice(0, 6);
      } else {
        numbers = winningNumbersInput.split(',').map(n => n.trim()).filter(Boolean);
      }
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
      render: (_: any, record: any) => {
        let name = record.game?.name || '-';
        if (record.game?.code === 'than_tai_4') {
          name = 'ĐIỆN TOÁN Thần Tài';
        } else if (record.game?.code === 'dientoan_123') {
          name = 'ĐIỆN TOÁN 1*2*3';
        }
        return <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>;
      }
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
        const gCode = (record.game?.code || '').toLowerCase();
        if (record.status === 'completed') {
          if (gCode === 'than_tai_4') {
            return (
              <Space size={4}>
                {record.winningNumbers?.map((n: string, idx: number) => (
                  <Tag key={idx} color="gold" style={{ fontWeight: 'bold', fontSize: 15, padding: '2px 8px' }}>
                    {n}
                  </Tag>
                ))}
              </Space>
            );
          }
          if (gCode === 'max_4d') {
            const w = record.winningNumbers || [];
            if (w.length >= 6) {
              const nhat = w[0];
              const nhi = w.slice(1, 3);
              const ba = w.slice(3, 6);
              return (
                <div style={{ maxWidth: 360, lineHeight: 1.6 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>G.Nhất: </span>
                    <Tag color="error" style={{ fontWeight: 'bold', fontSize: 13 }}>{nhat}</Tag>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#0284c7', marginLeft: 6 }}>Nhì: </span>
                    {nhi.map((s: string, i: number) => (
                      <Tag key={`n2-${i}`} color="blue" style={{ fontWeight: 600 }}>{s}</Tag>
                    ))}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#059669' }}>Ba: </span>
                    {ba.map((s: string, i: number) => (
                      <Tag key={`b-${i}`} color="green" style={{ fontWeight: 500 }}>{s}</Tag>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Space size={2} wrap>
                {w.map((n: string, i: number) => (
                  <Tag key={i} color="blue">{n}</Tag>
                ))}
              </Space>
            );
          }
          if (gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus') {
            const w = record.winningNumbers || [];
            if (w.length >= 20) {
              const db = w.slice(0, 2);
              const nhat = w.slice(2, 6);
              const nhi = w.slice(6, 12);
              const ba = w.slice(12, 20);
              return (
                <div style={{ maxWidth: 380, lineHeight: 1.6 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>ĐB: </span>
                    {db.map((s: string, i: number) => (
                      <Tag key={`db-${i}`} color="error" style={{ fontWeight: 'bold', marginInlineEnd: 4 }}>{s}</Tag>
                    ))}
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#0284c7', marginLeft: 6 }}>Nhất: </span>
                    {nhat.map((s: string, i: number) => (
                      <Tag key={`n1-${i}`} color="blue" style={{ fontWeight: 600, marginInlineEnd: 4 }}>{s}</Tag>
                    ))}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#059669' }}>Nhì (6 bộ): </span>
                    {nhi.slice(0, 3).map((s: string, i: number) => (
                      <Tag key={`n2-${i}`} color="green" style={{ marginInlineEnd: 2 }}>{s}</Tag>
                    ))}
                    <span style={{ fontSize: 11, color: '#64748b' }}>...</span>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#7c3aed', marginLeft: 6 }}>Ba (8 bộ): </span>
                    {ba.slice(0, 3).map((s: string, i: number) => (
                      <Tag key={`b-${i}`} color="purple" style={{ marginInlineEnd: 2 }}>{s}</Tag>
                    ))}
                    <span style={{ fontSize: 11, color: '#64748b' }}>...</span>
                  </div>
                </div>
              );
            }
            return (
              <Space size={2} wrap style={{ maxWidth: 320 }}>
                {w.map((n: string, i: number) => (
                  <Tag key={i} color="blue">{n}</Tag>
                ))}
              </Space>
            );
          }
          if (gCode === 'dientoan_123') {
            return (
              <Space size={4}>
                <Tag color="blue" style={{ fontWeight: 600 }}>B1: <b>{record.winningNumbers?.[0] ?? '-'}</b></Tag>
                <Tag color="cyan" style={{ fontWeight: 600 }}>B2: <b>{record.winningNumbers?.[1] ?? '-'}</b></Tag>
                <Tag color="purple" style={{ fontWeight: 600 }}>B3: <b>{record.winningNumbers?.[2] ?? '-'}</b></Tag>
              </Space>
            );
          }
          if (gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655') {
            const isPower = gCode === 'power_655';
            const maxMain = isPower ? 6 : 5;
            const w = record.winningNumbers || [];
            const special = (record.specialNumbers && record.specialNumbers.length > 0)
              ? record.specialNumbers[0]
              : (w.length > maxMain ? w[maxMain] : null);
            const mains = special ? w.slice(0, maxMain) : w.slice(0, maxMain);

            return (
              <Space size={4} wrap>
                {mains.map((n: string, idx: number) => (
                  <Tag key={idx} color="blue" style={{ fontWeight: 'bold', fontSize: 13 }}>
                    {n}
                  </Tag>
                ))}
                {special && (
                  <Tag color="error" style={{ fontWeight: 'bold', fontSize: 13, border: '1px solid #dc2626' }}>
                    ★ {special}
                  </Tag>
                )}
              </Space>
            );
          }
          return (
            <div style={{ fontWeight: 'bold', color: '#dc2626', letterSpacing: 1, fontSize: 15 }}>
              {record.winningNumbers?.join(' ')}
            </div>
          );
        }

        if (editingDrawId === record._id) {
          const isLottoGame = gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655';
          const isMax3D = gCode === 'max_3d' || gCode === 'max_3d_pro' || gCode === 'max_3d_plus' || gCode === 'max_4d';

          if (isMax3D) {
            return (
              <Space>
                <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => { setEditingDrawId(null); handleOpenEdit(record); }}>
                  Mở bảng nhập 20 bộ số
                </Button>
                <Button size="small" type="text" onClick={() => setEditingDrawId(null)}>Hủy</Button>
              </Space>
            );
          }

          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              {isLottoGame ? (
                <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <Input
                    style={{ flex: 1 }}
                    placeholder={gCode === 'power_655' ? "6 số chính (01-55)" : gCode === 'lotto_570' ? "5 số chính (01-70)" : "5 số chính (01-35)"}
                    value={winningNumbersInput}
                    onChange={(e) => setWinningNumbersInput(e.target.value)}
                  />
                  <Input
                    style={{ width: 65, textAlign: 'center', fontWeight: 'bold', color: '#dc2626', borderColor: '#f87171' }}
                    placeholder="★ ĐB"
                    maxLength={2}
                    value={specialNumberInput}
                    onChange={(e) => setSpecialNumberInput(e.target.value)}
                  />
                </div>
              ) : (
                <Input
                  placeholder={gCode === 'than_tai_4' ? 'VD: 8, 2, 9, 4 hoặc 8294' : gCode === 'dientoan_123' ? 'VD: 5, 23, 814 (3 bộ số)' : (gCode === 'max_3d' || gCode === 'max_3d_pro') ? 'VD: 123, 456, 789... (đủ 20 bộ 3 số)' : gCode === 'max_4d' ? 'VD: 1234, 5678, 9012, 3456, 7890, 1122 (6 bộ 4 số)' : 'VD: 02, 15, 30...'}
                  value={winningNumbersInput}
                  onChange={(e) => setWinningNumbersInput(e.target.value)}
                />
              )}
              <Space>
                <Button size="small" icon={<SyncOutlined />} onClick={() => handleRandomize(record.game)} disabled={savingResultId === record._id}>Random</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveResult(record._id, record)} loading={savingResultId === record._id} disabled={savingResultId === record._id}>Lưu</Button>
                <Button size="small" type="text" onClick={() => { setEditingDrawId(null); setSpecialNumberInput(''); }} disabled={savingResultId === record._id}>Hủy</Button>
              </Space>
            </Space>
          );
        }

        return (
          <Button
            type="link"
            style={{ fontWeight: 500 }}
            onClick={() => {
              const gameCode = (record.game?.code || '').toLowerCase();
              if (['mb', 'mt', 'mn', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(gameCode)) {
                setCurrentKienThietDraw(record);
                ktForm.resetFields();
                setIsKienThietModalOpen(true);
              } else if (['max_3d', 'max_3d_pro', 'max_3d_plus', 'max_4d'].includes(gameCode)) {
                handleOpenEdit(record);
              } else {
                setEditingDrawId(record._id);
                const gCode = (record.game?.code || '').toLowerCase();
                if (gCode === 'lotto_535' || gCode === 'lotto_570' || gCode === 'power_655') {
                  const isPower = gCode === 'power_655';
                  const maxMain = isPower ? 6 : 5;
                  const w = record.winningNumbers || [];
                  const sp = (record.specialNumbers && record.specialNumbers.length > 0) ? record.specialNumbers[0] : (w.length > maxMain ? w[maxMain] : '');
                  const mains = sp ? w.slice(0, maxMain) : w.slice(0, maxMain);
                  setWinningNumbersInput(mains.join(', '));
                  setSpecialNumberInput(sp);
                } else {
                  setWinningNumbersInput('');
                  setSpecialNumberInput('');
                }
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
      if (filterGameId) {
        const dGameId = typeof d.game === 'object' ? d.game?._id : d.game;
        const dGameCode = typeof d.game === 'object' ? d.game?.code : undefined;
        if (dGameId !== filterGameId && dGameCode !== filterGameId) return false;
      }
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
}, [draws, games, showRedundantDraws, filterGameId, filterStatus, filterProvinceId, filterDate, searchCode]);

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
      width={['MB', 'MT', 'MN', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(editingDraw?.game?.code) ? 750 : (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(editingDraw?.game?.code) ? 700 : 550)}
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
        ) : editingDraw?.game?.code === 'max_4d' ? (
          <div style={{ marginBottom: 16, padding: 14, background: '#fdf2f8', borderRadius: 8, border: '1px solid #fbcfe8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 15, color: '#be185d' }}>
                  Kết quả MAX 4D (Gồm 6 bộ số có 4 chữ số: 0000-9999)
                </strong>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  1 số Giải Nhất, 2 số Giải Nhì, 3 số Giải Ba (KK1 & KK2 tự động tính theo Giải Nhất)
                </div>
              </div>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="primary"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random 6 bộ số Max 4D
              </Button>
            </div>

            {/* Giải Nhất: 1 bộ số */}
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff1f2', borderRadius: 6, border: '1px solid #fecdd3' }}>
              <div style={{ fontWeight: 'bold', color: '#be123c', marginBottom: 6, fontSize: 13 }}>
                ★ GIẢI NHẤT (1 bộ số 4 chữ số - 15.000.000đ):
              </div>
              <Form.Item name="m4d_nhat" label="Giải Nhất" style={{ marginBottom: 0 }}>
                <Input maxLength={4} placeholder="0000" style={{ width: 110, textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: 18 }} />
              </Form.Item>
            </div>

            {/* Giải Nhì: 2 bộ số */}
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: 6, fontSize: 13 }}>
                GIẢI NHÌ (2 bộ số 4 chữ số - 6.500.000đ):
              </div>
              <Space size="middle">
                <Form.Item name="m4d_nhi_1" label="Số 1" style={{ marginBottom: 0 }}>
                  <Input maxLength={4} placeholder="0000" style={{ width: 100, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
                </Form.Item>
                <Form.Item name="m4d_nhi_2" label="Số 2" style={{ marginBottom: 0 }}>
                  <Input maxLength={4} placeholder="0000" style={{ width: 100, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
                </Form.Item>
              </Space>
            </div>

            {/* Giải Ba: 3 bộ số */}
            <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 'bold', color: '#15803d', marginBottom: 6, fontSize: 13 }}>
                GIẢI BA (3 bộ số 4 chữ số - 3.000.000đ):
              </div>
              <Space size="middle" wrap>
                <Form.Item name="m4d_ba_1" label="Số 1" style={{ marginBottom: 0 }}>
                  <Input maxLength={4} placeholder="0000" style={{ width: 95, textAlign: 'center', fontWeight: 600, fontSize: 15 }} />
                </Form.Item>
                <Form.Item name="m4d_ba_2" label="Số 2" style={{ marginBottom: 0 }}>
                  <Input maxLength={4} placeholder="0000" style={{ width: 95, textAlign: 'center', fontWeight: 600, fontSize: 15 }} />
                </Form.Item>
                <Form.Item name="m4d_ba_3" label="Số 3" style={{ marginBottom: 0 }}>
                  <Input maxLength={4} placeholder="0000" style={{ width: 95, textAlign: 'center', fontWeight: 600, fontSize: 15 }} />
                </Form.Item>
              </Space>
            </div>
          </div>
        ) : (editingDraw?.game?.code === 'max_3d' || editingDraw?.game?.code === 'max_3d_pro' || editingDraw?.game?.code === 'max_3d_plus') ? (
          <div style={{ marginBottom: 16, padding: 14, background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 15, color: '#7e22ce' }}>
                  Kết quả {editingDraw?.game?.name || 'Max 3D'} (Tổng cộng 20 bộ số 3 chữ số: 000-999)
                </strong>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  2 bộ ĐB, 4 bộ Giải Nhất, 6 bộ Giải Nhì, 8 bộ Giải Ba
                </div>
              </div>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="primary"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random 20 bộ số
              </Button>
            </div>

            {/* Giải Đặc Biệt: 2 bộ số */}
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff1f2', borderRadius: 6, border: '1px solid #fecdd3' }}>
              <div style={{ fontWeight: 'bold', color: '#be123c', marginBottom: 6, fontSize: 13 }}>
                ★ GIẢI ĐẶC BIỆT (2 bộ số):
              </div>
              <Space size="middle">
                <Form.Item name="m3d_db_1" label="ĐB 1" style={{ marginBottom: 0 }}>
                  <Input maxLength={3} placeholder="000" style={{ width: 85, textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: 16 }} />
                </Form.Item>
                <Form.Item name="m3d_db_2" label="ĐB 2" style={{ marginBottom: 0 }}>
                  <Input maxLength={3} placeholder="000" style={{ width: 85, textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: 16 }} />
                </Form.Item>
              </Space>
            </div>

            {/* Giải Nhất: 4 bộ số */}
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: 6, fontSize: 13 }}>
                GIẢI NHẤT (4 bộ số):
              </div>
              <Space size="middle" wrap>
                {[1, 2, 3, 4].map(idx => (
                  <Form.Item key={idx} name={`m3d_nhat_${idx}`} label={`#${idx}`} style={{ marginBottom: 0 }}>
                    <Input maxLength={3} placeholder="000" style={{ width: 80, textAlign: 'center', fontWeight: 'bold', fontSize: 15 }} />
                  </Form.Item>
                ))}
              </Space>
            </div>

            {/* Giải Nhì: 6 bộ số */}
            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 'bold', color: '#15803d', marginBottom: 6, fontSize: 13 }}>
                GIẢI NHÌ (6 bộ số):
              </div>
              <Space size="small" wrap>
                {[1, 2, 3, 4, 5, 6].map(idx => (
                  <Form.Item key={idx} name={`m3d_nhi_${idx}`} label={`#${idx}`} style={{ marginBottom: 4 }}>
                    <Input maxLength={3} placeholder="000" style={{ width: 75, textAlign: 'center', fontWeight: 600, fontSize: 14 }} />
                  </Form.Item>
                ))}
              </Space>
            </div>

            {/* Giải Ba: 8 bộ số */}
            <div style={{ padding: '8px 12px', background: '#faf5ff', borderRadius: 6, border: '1px solid #e9d5ff' }}>
              <div style={{ fontWeight: 'bold', color: '#7e22ce', marginBottom: 6, fontSize: 13 }}>
                GIẢI BA (8 bộ số):
              </div>
              <Space size="small" wrap>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(idx => (
                  <Form.Item key={idx} name={`m3d_ba_${idx}`} label={`#${idx}`} style={{ marginBottom: 4 }}>
                    <Input maxLength={3} placeholder="000" style={{ width: 75, textAlign: 'center', fontWeight: 500, fontSize: 14 }} />
                  </Form.Item>
                ))}
              </Space>
            </div>
          </div>
        ) : editingDraw?.game?.code === 'than_tai_4' ? (
          <div style={{ marginBottom: 16, padding: 14, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 14, color: '#b45309' }}>
                Kết quả 4 chữ số Thần Tài (ABCD):
              </strong>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random
              </Button>
            </div>
            <Space size="large">
              <Form.Item name="tt_1" label="Số 1" style={{ marginBottom: 0 }}>
                <Input maxLength={1} style={{ width: 65, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
              </Form.Item>
              <Form.Item name="tt_2" label="Số 2" style={{ marginBottom: 0 }}>
                <Input maxLength={1} style={{ width: 65, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
              </Form.Item>
              <Form.Item name="tt_3" label="Số 3" style={{ marginBottom: 0 }}>
                <Input maxLength={1} style={{ width: 65, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
              </Form.Item>
              <Form.Item name="tt_4" label="Số 4" style={{ marginBottom: 0 }}>
                <Input maxLength={1} style={{ width: 65, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }} />
              </Form.Item>
            </Space>
          </div>
        ) : editingDraw?.game?.code === 'dientoan_123' ? (
          <div style={{ marginBottom: 16, padding: 14, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 14, color: '#0369a1' }}>
                Kết quả 3 bộ số Điện toán 1*2*3:
              </strong>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random
              </Button>
            </div>
            <Space size="middle">
              <Form.Item name="dt123_1" label="Bộ 1 (1 số: 0-9)" style={{ marginBottom: 0 }}>
                <Input maxLength={1} placeholder="0-9" style={{ width: 110, textAlign: 'center', fontWeight: 'bold', fontSize: 15 }} />
              </Form.Item>
              <Form.Item name="dt123_2" label="Bộ 2 (2 số: 00-99)" style={{ marginBottom: 0 }}>
                <Input maxLength={2} placeholder="00-99" style={{ width: 130, textAlign: 'center', fontWeight: 'bold', fontSize: 15 }} />
              </Form.Item>
              <Form.Item name="dt123_3" label="Bộ 3 (3 số: 000-999)" style={{ marginBottom: 0 }}>
                <Input maxLength={3} placeholder="000-999" style={{ width: 140, textAlign: 'center', fontWeight: 'bold', fontSize: 15 }} />
              </Form.Item>
            </Space>
          </div>
        ) : (editingDraw?.game?.code === 'lotto_535' || editingDraw?.game?.code === 'lotto_570' || editingDraw?.game?.code === 'power_655') ? (
          <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>
                Kết quả {editingDraw?.game?.name || editingDraw?.game?.code} ({editingDraw?.game?.code === 'power_655' ? '6 số chính' : '5 số chính'} + 1 số đặc biệt):
              </strong>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="dashed"
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random
              </Button>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item
                name="lotto_mains"
                label={editingDraw?.game?.code === 'power_655' ? "6 số chính (Cách nhau bằng dấu phẩy, 01-55)" : "5 số chính (Cách nhau bằng dấu phẩy)"}
                style={{ marginBottom: 12 }}
              >
                <Input placeholder={editingDraw?.game?.code === 'power_655' ? "VD: 03, 15, 24, 38, 45, 52 (01-55)" : editingDraw?.game?.code === 'lotto_570' ? "VD: 05, 23, 38, 55, 68 (01-70)" : "VD: 01, 12, 17, 18, 33 (01-35)"} />
              </Form.Item>
              <Form.Item name="lotto_special" label="1 số đặc biệt" style={{ marginBottom: 0 }}>
                <Input maxLength={2} style={{ width: 120, fontWeight: 'bold', color: '#dc2626' }} placeholder={editingDraw?.game?.code === 'power_655' ? "01-55" : editingDraw?.game?.code === 'lotto_570' ? "01-25" : "01-12"} />
              </Form.Item>
            </Space>
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
