import { PlusOutlined, SaveOutlined, SyncOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { Alert, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
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
  const [maxForm] = Form.useForm();
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
  const [lottoSpecialInput, setLottoSpecialInput] = useState('');

  const [isKienThietModalOpen, setIsKienThietModalOpen] = useState(false);
  const [currentKienThietDraw, setCurrentKienThietDraw] = useState<any>(null);

  const [isMaxModalOpen, setIsMaxModalOpen] = useState(false);
  const [currentMaxDraw, setCurrentMaxDraw] = useState<any>(null);
  const [savingMaxResult, setSavingMaxResult] = useState(false);

  const getGameDisplayName = (g: any) => {
    if (!g) return '-';
    if (g.code === 'bingo18') return 'BINGO18 (Điện toán 111-666)';
    if (g.code === 'than_tai_4') return 'ĐIỆN TOÁN Thần Tài';
    if (g.code === 'dientoan_123') return 'ĐIỆN TOÁN 1*2*3';
    return g.name || '-';
  };

  const playableGames = useMemo(() => {
    const list = games.filter(g => !isDerived3MienGame(g) && g.code !== 'clln_keno' && g.code !== 'bao_keno');
    const priorityCodes: Record<string, number> = {
      'MB': 1, 'MT': 2, 'MN': 3,
      'keno': 4,
      'bingo18': 5,
      'than_tai_4': 6, 'dientoan_123': 7, 'dientoan_636': 8,
      'power_655': 9, 'mega_645': 10, 'max_3d': 11, 'max_3d_plus': 12, 'max_3d_pro': 13, 'max_4d': 14
    };
    return [...list].sort((a, b) => {
      const pA = priorityCodes[a.code] || 99;
      const pB = priorityCodes[b.code] || 99;
      if (pA !== pB) return pA - pB;
      return getGameDisplayName(a).localeCompare(getGameDisplayName(b));
    });
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
      if (filterGameId) {
        const found = games.find((g: any) => g._id === filterGameId || g.code === filterGameId);
        if (found && found._id && found._id.length === 24) {
          params.gameId = found._id;
        } else {
          params.gameId = filterGameId;
        }
      }
      if (filterProvinceId && filterProvinceId !== 'all') params.provinceId = filterProvinceId;
      if (filterDate) params.date = filterDate.format('YYYY-MM-DD');
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (searchCode.trim()) params.search = searchCode.trim();

      const [drawsRes, gamesRes, provsRes] = await Promise.all([
        api.get('/draws/admin', { params }),
        games.length > 0 ? Promise.resolve({ data: games }) : api.get('/games', { params: { admin: 'true' } }),
        provinces.length > 0 ? Promise.resolve({ data: provinces }) : api.get('/provinces')
      ]);

      if (drawsRes.data.data) {
        setDraws(drawsRes.data.data);
        setTotal(drawsRes.data.total);
      } else if (Array.isArray(drawsRes.data)) {
        setDraws(drawsRes.data);
        setTotal(drawsRes.data.length);
      }
      if (games.length === 0 && gamesRes.data) {
        let loadedGames = [...gamesRes.data];
        const hasBingo = loadedGames.some((g: any) => g.code === 'bingo18');
        if (!hasBingo) {
          loadedGames.push({
            _id: 'bingo18',
            code: 'bingo18',
            name: 'BINGO18 (Điện toán 111-666)',
            type: 'dientoan',
            isActive: true
          });
        }
        const hasThanTai = loadedGames.some((g: any) => g.code === 'than_tai_4');
        if (!hasThanTai) {
          loadedGames.push({
            _id: 'than_tai_4',
            code: 'than_tai_4',
            name: 'ĐIỆN TOÁN Thần Tài',
            type: 'dientoan',
            isActive: true
          });
        }
        const hasDt123 = loadedGames.some((g: any) => g.code === 'dientoan_123');
        if (!hasDt123) {
          loadedGames.push({
            _id: 'dientoan_123',
            code: 'dientoan_123',
            name: 'ĐIỆN TOÁN 1*2*3',
            type: 'dientoan',
            isActive: true
          });
        }
        setGames(loadedGames);
      }
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
        drawTime: values.drawTime ? values.drawTime.toISOString() : undefined,
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

    if (['lotto_535', 'lotto_570'].includes(gCode)) {
      formVals.lottoMainNumbers = nums.slice(0, 5).join(', ');
      formVals.lottoSpecialNumber = (record.specialNumbers && record.specialNumbers[0]) || (nums.length > 5 ? nums[5] : '');
    }

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
    } else if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode) && nums.length >= 20) {
      formVals.m3d_db_1 = nums[0]; formVals.m3d_db_2 = nums[1];
      formVals.m3d_g1_1 = nums[2]; formVals.m3d_g1_2 = nums[3]; formVals.m3d_g1_3 = nums[4]; formVals.m3d_g1_4 = nums[5];
      formVals.m3d_g2_1 = nums[6]; formVals.m3d_g2_2 = nums[7]; formVals.m3d_g2_3 = nums[8];
      formVals.m3d_g2_4 = nums[9]; formVals.m3d_g2_5 = nums[10]; formVals.m3d_g2_6 = nums[11];
      formVals.m3d_g3_1 = nums[12]; formVals.m3d_g3_2 = nums[13]; formVals.m3d_g3_3 = nums[14]; formVals.m3d_g3_4 = nums[15];
      formVals.m3d_g3_5 = nums[16]; formVals.m3d_g3_6 = nums[17]; formVals.m3d_g3_7 = nums[18]; formVals.m3d_g3_8 = nums[19];
    } else if (gCode === 'max_4d' && nums.length >= 6) {
      formVals.m4d_g1 = nums[0];
      formVals.m4d_g2_1 = nums[1]; formVals.m4d_g2_2 = nums[2];
      formVals.m4d_g3_1 = nums[3]; formVals.m4d_g3_2 = nums[4]; formVals.m4d_g3_3 = nums[5];
    }

    editForm.setFieldsValue(formVals);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (values: any) => {
    try {
      setSavingEditDraw(true);
      const gCode = editingDraw?.game?.code;
      let numbers: string[] = [];
      let specialNumbers: string[] = [];

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
      } else if (['lotto_535', 'lotto_570'].includes(gCode)) {
        let mains = (values.lottoMainNumbers || '')
          .split(/[\s,]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        let special = (values.lottoSpecialNumber || '').trim();

        // Fallback nếu nhập vào ô winningNumbers chung
        if (mains.length === 0 && values.winningNumbers) {
          if (values.winningNumbers.includes('|')) {
            const parts = values.winningNumbers.split('|');
            mains = parts[0].split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean);
            if (!special && parts[1]) special = parts[1].trim();
          } else {
            const all = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean);
            if (all.length >= 6) {
              mains = all.slice(0, 5);
              if (!special) special = all[5];
            } else {
              mains = all;
            }
          }
        }

        if (mains.length > 0 || special) {
          const maxNum = gCode === 'lotto_570' ? 70 : 35;
          const maxSpec = gCode === 'lotto_570' ? 25 : 12;
          if (mains.length < 5) {
            message.error(`Vui lòng điền đủ 5 số thường (01-${maxNum}) (hiện có ${mains.length}/5 số)`);
            setSavingEditDraw(false);
            return;
          }
          if (!special) {
            message.error(`Vui lòng điền 1 số đặc biệt (01-${maxSpec})`);
            setSavingEditDraw(false);
            return;
          }
          const paddedMains = mains.slice(0, 5).map((n: string) => n.padStart(2, '0'));
          const paddedSpecial = special.padStart(2, '0');
          numbers = [...paddedMains, paddedSpecial];
          specialNumbers = [paddedSpecial];
        }
      } else if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode)) {
        const m3dNums = [
          values.m3d_db_1, values.m3d_db_2,
          values.m3d_g1_1, values.m3d_g1_2, values.m3d_g1_3, values.m3d_g1_4,
          values.m3d_g2_1, values.m3d_g2_2, values.m3d_g2_3, values.m3d_g2_4, values.m3d_g2_5, values.m3d_g2_6,
          values.m3d_g3_1, values.m3d_g3_2, values.m3d_g3_3, values.m3d_g3_4, values.m3d_g3_5, values.m3d_g3_6, values.m3d_g3_7, values.m3d_g3_8,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (m3dNums.length > 0) {
          if (m3dNums.length < 20) {
            message.error(`Vui lòng điền đủ 20 số theo từng giải Max 3D (hiện có ${m3dNums.length}/20 số), hoặc bấm Điền ngẫu nhiên`);
            setSavingEditDraw(false);
            return;
          }
          numbers = m3dNums.map(n => n.padStart(3, '0'));
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim().padStart(3, '0')).filter(Boolean);
        }
      } else if (gCode === 'max_4d') {
        const m4dNums = [
          values.m4d_g1,
          values.m4d_g2_1, values.m4d_g2_2,
          values.m4d_g3_1, values.m4d_g3_2, values.m4d_g3_3,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (m4dNums.length > 0) {
          if (m4dNums.length < 6) {
            message.error(`Vui lòng điền đủ 6 số theo từng giải Max 4D (hiện có ${m4dNums.length}/6 số), hoặc bấm Điền ngẫu nhiên`);
            setSavingEditDraw(false);
            return;
          }
          numbers = m4dNums.map(n => n.padStart(4, '0'));
        } else if (values.winningNumbers) {
          numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim().padStart(4, '0')).filter(Boolean);
        }
      } else {
        if (values.winningNumbers !== undefined) {
          numbers = values.winningNumbers.split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean);
          if (gCode === 'than_tai_4' && numbers.length === 1 && numbers[0].length === 4) {
            numbers = numbers[0].split('');
          }
        }
      }

      const payload: any = {
        drawCode: values.drawCode,
        status: values.status,
        openTime: values.openTime?.toISOString(),
        closeTime: values.closeTime?.toISOString(),
        drawTime: values.drawTime ? values.drawTime.toISOString() : undefined,
        winningNumbers: numbers,
        specialNumbers: specialNumbers.length > 0 ? specialNumbers : undefined,
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
      while (nums.size < 5) {
        const rnd = Math.floor(Math.random() * 35) + 1;
        nums.add(rnd.toString().padStart(2, '0'));
      }
      const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      editForm.setFieldsValue({
        lottoMainNumbers: sortedNums.join(', '),
        lottoSpecialNumber: specialNum,
        winningNumbers: [...sortedNums, specialNum].join(', ')
      });
      message.success('Đã tự động sinh 5 số thường (01-35) + 1 số đặc biệt (01-12)!');
      return;
    } else if (gCode === 'lotto_570') {
      while (nums.size < 5) {
        const rnd = Math.floor(Math.random() * 70) + 1;
        nums.add(rnd.toString().padStart(2, '0'));
      }
      const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 25) + 1).toString().padStart(2, '0');
      editForm.setFieldsValue({
        lottoMainNumbers: sortedNums.join(', '),
        lottoSpecialNumber: specialNum,
        winningNumbers: [...sortedNums, specialNum].join(', ')
      });
      message.success('Đã tự động sinh 5 số thường (01-70) + 1 số Mega Ball (01-25)!');
      return;
    } else if (gCode === 'bingo18') {
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ].sort((a, b) => a - b).map(String);
      editForm.setFieldsValue({
        winningNumbers: dice.join(', ')
      });
      message.success('Đã tự động sinh ngẫu nhiên 3 xúc xắc Bingo18!');
      return;
    } else if (gCode === 'than_tai_4') {
      const digits = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ].map(String);
      editForm.setFieldsValue({
        winningNumbers: digits.join(', ')
      });
      message.success('Đã tự động sinh ngẫu nhiên 4 chữ số Điện toán Thần tài!');
      return;
    } else if (gCode === 'dientoan_123') {
      const b1 = Math.floor(Math.random() * 10).toString();
      const b2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const b3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      editForm.setFieldsValue({
        winningNumbers: `${b1}, ${b2}, ${b3}`
      });
      message.success('Đã tự động sinh ngẫu nhiên 3 bộ số Điện toán 1*2*3 (Bộ 1, Bộ 2, Bộ 3)!');
      return;
    } else if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode)) {
      const rand3d = Array.from({ length: 20 }, () => Math.floor(Math.random() * 1000).toString().padStart(3, '0'));
      editForm.setFieldsValue({
        m3d_db_1: rand3d[0], m3d_db_2: rand3d[1],
        m3d_g1_1: rand3d[2], m3d_g1_2: rand3d[3], m3d_g1_3: rand3d[4], m3d_g1_4: rand3d[5],
        m3d_g2_1: rand3d[6], m3d_g2_2: rand3d[7], m3d_g2_3: rand3d[8], m3d_g2_4: rand3d[9], m3d_g2_5: rand3d[10], m3d_g2_6: rand3d[11],
        m3d_g3_1: rand3d[12], m3d_g3_2: rand3d[13], m3d_g3_3: rand3d[14], m3d_g3_4: rand3d[15], m3d_g3_5: rand3d[16], m3d_g3_6: rand3d[17], m3d_g3_7: rand3d[18], m3d_g3_8: rand3d[19],
        winningNumbers: rand3d.join(', ')
      });
      message.success('Đã tự động sinh 20 số đơn 3 chữ số theo từng giải cho Max 3D!');
      return;
    } else if (gCode === 'max_4d') {
      const rand4d = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
      editForm.setFieldsValue({
        m4d_g1: rand4d[0],
        m4d_g2_1: rand4d[1], m4d_g2_2: rand4d[2],
        m4d_g3_1: rand4d[3], m4d_g3_2: rand4d[4], m4d_g3_3: rand4d[5],
        winningNumbers: rand4d.join(', ')
      });
      message.success('Đã tự động sinh 6 số đơn 4 chữ số theo từng giải cho Max 4D (Nhất: 1, Nhì: 2, Ba: 3)!');
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
    const gCode = (game?.code || '').toLowerCase();
    if (gCode === 'bingo18') {
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ].sort((a, b) => a - b).map(String);
      setWinningNumbersInput(dice.join(', '));
      message.success('Đã tự động sinh ngẫu nhiên 3 xúc xắc Bingo18!');
      return;
    } else if (gCode === 'than_tai_4') {
      const digits = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ].map(String);
      setWinningNumbersInput(digits.join(', '));
      message.success('Đã tự động sinh ngẫu nhiên 4 chữ số Điện toán Thần tài!');
      return;
    } else if (gCode === 'dientoan_123') {
      const b1 = Math.floor(Math.random() * 10).toString();
      const b2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const b3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setWinningNumbersInput(`${b1}, ${b2}, ${b3}`);
      message.success('Đã tự động sinh ngẫu nhiên 3 bộ số Điện toán 1*2*3 (Bộ 1, Bộ 2, Bộ 3)!');
      return;
    } else if (gCode === 'max_3d' || gCode === 'max_3d_pro') {
      const rand3d = Array.from({ length: 20 }, () => Math.floor(Math.random() * 1000).toString().padStart(3, '0'));
      setWinningNumbersInput(rand3d.join(', '));
      message.success('Đã tự động sinh 20 số đơn 3 chữ số cho Max 3D (ĐB: 2, G1: 4, G2: 6, G3: 8)!');
      return;
    } else if (gCode === 'max_4d') {
      const rand4d = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
      setWinningNumbersInput(rand4d.join(', '));
      message.success('Đã tự động sinh 6 số đơn 4 chữ số cho Max 4D (Nhất: 1, Nhì: 2, Ba: 3)!');
      return;
    }

    const nums = new Set<string>();
    let maxNum = 45;
    let reqCount = 6;

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
      while (nums.size < 5) {
        const rnd = Math.floor(Math.random() * 35) + 1;
        nums.add(rnd.toString().padStart(2, '0'));
      }
      const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(sortedNums.join(', '));
      setLottoSpecialInput(specialNum);
      message.success('Đã tự động sinh 5 số thường (01-35) + 1 số đặc biệt (01-12)!');
      return;
    } else if (gCode === 'lotto_570') {
      while (nums.size < 5) {
        const rnd = Math.floor(Math.random() * 70) + 1;
        nums.add(rnd.toString().padStart(2, '0'));
      }
      const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
      const specialNum = (Math.floor(Math.random() * 25) + 1).toString().padStart(2, '0');
      setWinningNumbersInput(sortedNums.join(', '));
      setLottoSpecialInput(specialNum);
      message.success('Đã tự động sinh 5 số thường (01-70) + 1 số Mega Ball (01-25)!');
      return;
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
      const targetDraw = draws.find(d => d._id === id);
      const gCode = targetDraw?.game?.code;

      if (['lotto_535', 'lotto_570'].includes(gCode || '')) {
        let mains = winningNumbersInput.split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
        let special = lottoSpecialInput.trim();

        if (winningNumbersInput.includes('|')) {
          const parts = winningNumbersInput.split('|');
          mains = parts[0].split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
          if (!special && parts[1]) special = parts[1].trim();
        } else if (mains.length >= 6 && !special) {
          special = mains[5];
          mains = mains.slice(0, 5);
        }

        const maxNum = gCode === 'lotto_570' ? 70 : 35;
        const maxSpec = gCode === 'lotto_570' ? 25 : 12;

        if (mains.length < 5) {
          message.error(`Vui lòng nhập đủ 5 số thường (01-${maxNum}) (hiện có ${mains.length}/5 số)`);
          return;
        }
        if (!special) {
          message.error(`Vui lòng nhập 1 số đặc biệt (01-${maxSpec})`);
          return;
        }

        const paddedMains = mains.slice(0, 5).map(n => n.padStart(2, '0'));
        const paddedSpecial = special.padStart(2, '0');
        const finalNumbers = [...paddedMains, paddedSpecial];

        await api.put(`/draws/admin/${id}/results`, { 
          winningNumbers: finalNumbers,
          specialNumbers: [paddedSpecial]
        });
        message.success('Lưu kết quả thành công');
        setEditingDrawId(null);
        setWinningNumbersInput('');
        setLottoSpecialInput('');
        fetchData();
        return;
      }

      let numbers = winningNumbersInput.split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
      if (gCode === 'than_tai_4' && numbers.length === 1 && numbers[0].length === 4) {
        numbers = numbers[0].split('');
      } else if (['max_3d', 'max_3d_pro'].includes(gCode || '')) {
        if (numbers.length < 20) {
          message.error(`Max 3D yêu cầu đủ 20 số đơn 3 chữ số (hiện có ${numbers.length}/20 số). Bấm Random để tự động điền.`);
          return;
        }
        numbers = numbers.slice(0, 20).map(n => n.padStart(3, '0'));
      } else if (gCode === 'max_4d') {
        if (numbers.length < 6) {
          message.error(`Max 4D yêu cầu đủ 6 số đơn 4 chữ số (hiện có ${numbers.length}/6 số). Bấm Random để tự động điền.`);
          return;
        }
        numbers = numbers.slice(0, 6).map(n => n.padStart(4, '0'));
      }
      await api.put(`/draws/admin/${id}/results`, { winningNumbers: numbers });
      message.success('Lưu kết quả thành công');
      setEditingDrawId(null);
      setWinningNumbersInput('');
      setLottoSpecialInput('');
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

  const handleOpenMaxModal = (record: any) => {
    setCurrentMaxDraw(record);
    maxForm.resetFields();
    const gCode = record.game?.code;
    const nums: string[] = record.winningNumbers || [];
    const formVals: any = {};

    if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode) && nums.length >= 20) {
      formVals.m3d_db_1 = nums[0]; formVals.m3d_db_2 = nums[1];
      formVals.m3d_g1_1 = nums[2]; formVals.m3d_g1_2 = nums[3]; formVals.m3d_g1_3 = nums[4]; formVals.m3d_g1_4 = nums[5];
      formVals.m3d_g2_1 = nums[6]; formVals.m3d_g2_2 = nums[7]; formVals.m3d_g2_3 = nums[8];
      formVals.m3d_g2_4 = nums[9]; formVals.m3d_g2_5 = nums[10]; formVals.m3d_g2_6 = nums[11];
      formVals.m3d_g3_1 = nums[12]; formVals.m3d_g3_2 = nums[13]; formVals.m3d_g3_3 = nums[14]; formVals.m3d_g3_4 = nums[15];
      formVals.m3d_g3_5 = nums[16]; formVals.m3d_g3_6 = nums[17]; formVals.m3d_g3_7 = nums[18]; formVals.m3d_g3_8 = nums[19];
    } else if (gCode === 'max_4d' && nums.length >= 6) {
      formVals.m4d_g1 = nums[0];
      formVals.m4d_g2_1 = nums[1]; formVals.m4d_g2_2 = nums[2];
      formVals.m4d_g3_1 = nums[3]; formVals.m4d_g3_2 = nums[4]; formVals.m4d_g3_3 = nums[5];
    }

    maxForm.setFieldsValue(formVals);
    setIsMaxModalOpen(true);
  };

  const handleRandomizeMaxModal = () => {
    const gCode = currentMaxDraw?.game?.code;
    if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode)) {
      const rand3d = Array.from({ length: 20 }, () => Math.floor(Math.random() * 1000).toString().padStart(3, '0'));
      maxForm.setFieldsValue({
        m3d_db_1: rand3d[0], m3d_db_2: rand3d[1],
        m3d_g1_1: rand3d[2], m3d_g1_2: rand3d[3], m3d_g1_3: rand3d[4], m3d_g1_4: rand3d[5],
        m3d_g2_1: rand3d[6], m3d_g2_2: rand3d[7], m3d_g2_3: rand3d[8], m3d_g2_4: rand3d[9], m3d_g2_5: rand3d[10], m3d_g2_6: rand3d[11],
        m3d_g3_1: rand3d[12], m3d_g3_2: rand3d[13], m3d_g3_3: rand3d[14], m3d_g3_4: rand3d[15], m3d_g3_5: rand3d[16], m3d_g3_6: rand3d[17], m3d_g3_7: rand3d[18], m3d_g3_8: rand3d[19],
      });
      message.success('Đã tự động sinh 20 số đơn 3 chữ số theo từng giải cho Max 3D!');
    } else if (gCode === 'max_4d') {
      const rand4d = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
      maxForm.setFieldsValue({
        m4d_g1: rand4d[0],
        m4d_g2_1: rand4d[1], m4d_g2_2: rand4d[2],
        m4d_g3_1: rand4d[3], m4d_g3_2: rand4d[4], m4d_g3_3: rand4d[5],
      });
      message.success('Đã tự động sinh 6 số đơn 4 chữ số theo từng giải cho Max 4D!');
    }
  };

  const handleSaveMaxResult = async (values: any) => {
    try {
      setSavingMaxResult(true);
      const gCode = currentMaxDraw?.game?.code;
      let numbers: string[] = [];

      if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(gCode)) {
        numbers = [
          values.m3d_db_1, values.m3d_db_2,
          values.m3d_g1_1, values.m3d_g1_2, values.m3d_g1_3, values.m3d_g1_4,
          values.m3d_g2_1, values.m3d_g2_2, values.m3d_g2_3, values.m3d_g2_4, values.m3d_g2_5, values.m3d_g2_6,
          values.m3d_g3_1, values.m3d_g3_2, values.m3d_g3_3, values.m3d_g3_4, values.m3d_g3_5, values.m3d_g3_6, values.m3d_g3_7, values.m3d_g3_8,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (numbers.length < 20) {
          message.error(`Vui lòng điền đủ 20 số (mỗi số 3 chữ số) theo các giải Max 3D (hiện có ${numbers.length}/20 số), hoặc bấm Điền ngẫu nhiên`);
          setSavingMaxResult(false);
          return;
        }
        numbers = numbers.map(n => n.padStart(3, '0'));
      } else if (gCode === 'max_4d') {
        numbers = [
          values.m4d_g1,
          values.m4d_g2_1, values.m4d_g2_2,
          values.m4d_g3_1, values.m4d_g3_2, values.m4d_g3_3,
        ].map(n => (n || '').trim()).filter(Boolean);

        if (numbers.length < 6) {
          message.error(`Vui lòng điền đủ 6 số (mỗi số 4 chữ số) theo các giải Max 4D (hiện có ${numbers.length}/6 số), hoặc bấm Điền ngẫu nhiên`);
          setSavingMaxResult(false);
          return;
        }
        numbers = numbers.map(n => n.padStart(4, '0'));
      }

      await api.put(`/draws/admin/${currentMaxDraw._id}/results`, {
        winningNumbers: numbers
      });
      message.success('Lưu kết quả thành công');
      setIsMaxModalOpen(false);
      maxForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi lưu kết quả');
    } finally {
      setSavingMaxResult(false);
    }
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
        if (!record.game) return <span style={{ color: '#94a3b8' }}>-</span>;
        if (record.game.code === 'bingo18') {
          return <Tag color="blue" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>BINGO18</Tag>;
        }
        if (record.game.code === 'than_tai_4') {
          return <Tag color="orange" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>ĐT THẦN TÀI</Tag>;
        }
        if (record.game.code === 'dientoan_123') {
          return <Tag color="magenta" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>ĐT 1*2*3</Tag>;
        }
        if (record.game.code === 'max_3d') {
          return <Tag color="magenta" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>MAX 3D</Tag>;
        }
        if (record.game.code === 'max_3d_pro') {
          return <Tag color="purple" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>MAX 3D PRO</Tag>;
        }
        if (record.game.code === 'max_4d') {
          return <Tag color="geekblue" style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>MAX 4D</Tag>;
        }
        return (
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{record.game?.name || '-'}</span>
        );
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
          {record.drawTime && (
            <div><strong>Xổ:</strong> {new Date(record.drawTime).toLocaleString('vi-VN')}</div>
          )}
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
      width: 240,
      render: (_: any, record: any) => {
        if (record.status === 'completed') {
          if (record.game?.code === 'than_tai_4') {
            return (
              <Space size={4}>
                {(record.winningNumbers || []).map((digit: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: '#ff9800',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    {digit}
                  </span>
                ))}
              </Space>
            );
          }
          if (record.game?.code === 'dientoan_123') {
            const w = record.winningNumbers || [];
            return (
              <Space size={6} wrap>
                <Tag color="volcano" style={{ fontWeight: 700, fontSize: 13, padding: '2px 8px' }}>
                  B1: {w[0] ?? '-'}
                </Tag>
                <Tag color="geekblue" style={{ fontWeight: 700, fontSize: 13, padding: '2px 8px' }}>
                  B2: {w[1] ?? '-'}
                </Tag>
                <Tag color="green" style={{ fontWeight: 700, fontSize: 13, padding: '2px 8px' }}>
                  B3: {w[2] ?? '-'}
                </Tag>
              </Space>
            );
          }
          if (record.game?.code === 'lotto_535' || record.game?.code === 'lotto_570') {
            const w = record.winningNumbers || [];
            const mainNums = w.slice(0, 5);
            const specialNum = (record.specialNumbers && record.specialNumbers[0]) || (w.length > 5 ? w[5] : null);
            const is570 = record.game?.code === 'lotto_570';
            const ballBg = is570 ? '#6a1b9a' : '#8e24aa';
            const specLabel = is570 ? 'Mega Ball' : 'ĐB';

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <Space size={3}>
                  {mainNums.map((n: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: ballBg,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </Space>
                <span style={{ fontWeight: 800, color: '#94a3b8', fontSize: 14 }}>|</span>
                {specialNum ? (
                  <Tag
                    color="gold"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 26,
                      borderRadius: 13,
                      padding: '0 8px',
                      backgroundColor: '#ff9800',
                      borderColor: '#f57c00',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      boxShadow: '0 1px 3px rgba(255, 152, 0, 0.4)'
                    }}
                  >
                    ★ {specLabel}: {specialNum}
                  </Tag>
                ) : (
                  <Tag color="default">Chưa có số ĐB</Tag>
                )}
              </div>
            );
          }
          if (['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(record.game?.code)) {
            const w = record.winningNumbers || [];
            const dacBiet = w.slice(0, 2);
            const nhat = w.slice(2, 6);
            const nhi = w.slice(6, 12);
            const ba = w.slice(12, 20);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 320 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <Tag color="red" style={{ fontWeight: 700, margin: 0, fontSize: 11 }}>ĐB: {dacBiet.join(' - ') || '-'}</Tag>
                  <Tag color="orange" style={{ fontWeight: 600, margin: 0, fontSize: 11 }}>G1: {nhat.join(' - ') || '-'}</Tag>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>G2: {nhi.join(' - ') || '-'}</Tag>
                  <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>G3: {ba.join(' - ') || '-'}</Tag>
                </div>
                {canEditDraw && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', alignSelf: 'flex-start', fontSize: 11, marginTop: 2 }}
                    onClick={() => handleOpenMaxModal(record)}
                  >
                    ✏ Sửa kết quả từng giải
                  </Button>
                )}
              </div>
            );
          }
          if (record.game?.code === 'max_4d') {
            const w = record.winningNumbers || [];
            const nhat = w[0];
            const nhi = w.slice(1, 3);
            const ba = w.slice(3, 6);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 320 }}>
                <Space size={4} wrap>
                  <Tag color="red" style={{ fontWeight: 700, fontSize: 12, padding: '1px 6px' }}>
                    Nhất: {nhat ?? '-'}
                  </Tag>
                  <Tag color="orange" style={{ fontWeight: 600, fontSize: 11 }}>
                    Nhì: {nhi.join(' - ') || '-'}
                  </Tag>
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    Ba: {ba.join(' - ') || '-'}
                  </Tag>
                </Space>
                {canEditDraw && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', alignSelf: 'flex-start', fontSize: 11, marginTop: 2 }}
                    onClick={() => handleOpenMaxModal(record)}
                  >
                    ✏ Sửa kết quả từng giải
                  </Button>
                )}
              </div>
            );
          }
          return (
            <div style={{ fontWeight: 'bold', color: '#dc2626', letterSpacing: 1, fontSize: 15 }}>
              {record.winningNumbers?.join(' ')}
            </div>
          );
        }

        if (['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(record.game?.code)) {
          return (
            <Tooltip title="Kỳ quay này tự động cập nhật kết quả và trả thưởng khi có kết quả Xổ số Miền Bắc (MB)">
              <Tag color="cyan" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, fontWeight: 500, cursor: 'default' }}>
                ⚡ Tự động theo KQ Miền Bắc
              </Tag>
            </Tooltip>
          );
        }

        if (editingDrawId === record._id) {
          const isLotto = ['lotto_535', 'lotto_570'].includes(record.game?.code);
          if (isLotto) {
            const is570 = record.game?.code === 'lotto_570';
            const maxMain = is570 ? 70 : 35;
            const maxSpec = is570 ? 25 : 12;
            const specName = is570 ? 'Mega Ball' : 'Đặc Biệt';

            return (
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                      5 Số thường (01-{maxMain}):
                    </div>
                    <Input
                      size="small"
                      placeholder="VD: 05, 12, 19, 27, 34"
                      value={winningNumbersInput}
                      onChange={(e) => setWinningNumbersInput(e.target.value)}
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#e65100', marginBottom: 2 }}>
                      ★ {specName} (01-{maxSpec}):
                    </div>
                    <Input
                      size="small"
                      style={{ borderColor: '#ff9800', fontWeight: 'bold', color: '#e65100' }}
                      placeholder="VD: 08"
                      value={lottoSpecialInput}
                      onChange={(e) => setLottoSpecialInput(e.target.value)}
                    />
                  </div>
                </div>
                <Space size="small">
                  <Button size="small" icon={<SyncOutlined />} onClick={() => handleRandomize(record.game)} disabled={savingResultId === record._id}>Random</Button>
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveResult(record._id)} loading={savingResultId === record._id} disabled={savingResultId === record._id}>Lưu</Button>
                  <Button size="small" type="text" onClick={() => { setEditingDrawId(null); setWinningNumbersInput(''); setLottoSpecialInput(''); }} disabled={savingResultId === record._id}>Hủy</Button>
                </Space>
              </Space>
            );
          }

          const placeholder = record.game?.code === 'than_tai_4'
            ? 'VD: 4, 8, 2, 1 (4 số)'
            : record.game?.code === 'dientoan_123'
            ? 'VD: 3, 45, 812 (Bộ 1, 2, 3)'
            : (record.game?.code === 'max_3d' || record.game?.code === 'max_3d_pro')
            ? 'VD: 123, 456, 789... (20 số đơn 3 chữ số: ĐB:2, G1:4, G2:6, G3:8)'
            : record.game?.code === 'max_4d'
            ? 'VD: 1234, 5678, 9012, 3456, 7890, 1122 (6 số đơn 4 chữ số: G1:1, G2:2, G3:3)'
            : 'VD: 02, 15, 30...';

          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder={placeholder}
                value={winningNumbersInput}
                onChange={(e) => setWinningNumbersInput(e.target.value)}
              />
              <Space>
                <Button size="small" icon={<SyncOutlined />} onClick={() => handleRandomize(record.game)} disabled={savingResultId === record._id}>Random</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveResult(record._id)} loading={savingResultId === record._id} disabled={savingResultId === record._id}>Lưu</Button>
                <Button size="small" type="text" onClick={() => { setEditingDrawId(null); setWinningNumbersInput(''); setLottoSpecialInput(''); }} disabled={savingResultId === record._id}>Hủy</Button>
              </Space>
            </Space>
          );
        }

        return (
          <Button
            type="link"
            style={{ fontWeight: 500 }}
            onClick={() => {
              if (['MB', 'MT', 'MN'].includes(record.game?.code)) {
                setCurrentKienThietDraw(record);
                ktForm.resetFields();
                setIsKienThietModalOpen(true);
              } else if (['max_3d', 'max_3d_pro', 'max_3d_plus', 'max_4d'].includes(record.game?.code)) {
                handleOpenMaxModal(record);
              } else {
                setEditingDrawId(record._id);
                setWinningNumbersInput('');
                setLottoSpecialInput('');
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
          showSearch
          optionFilterProp="children"
          placeholder="Tất cả game"
          style={{ minWidth: 220 }}
          allowClear
          value={filterGameId || undefined}
          onChange={(val) => {
            setFilterGameId(val || null);
            setPage(1);
          }}
          filterOption={(input, option: any) => {
            const label = String(option?.children || option?.label || '').toLowerCase();
            const search = String(option?.search || '').toLowerCase();
            const inp = input.toLowerCase();
            return label.includes(inp) || search.includes(inp);
          }}
        >
          {playableGames.map(g => (
            <Select.Option 
              key={g._id} 
              value={g._id}
              search={`${g.code} ${g.name} bingo bingo18`}
            >
              {getGameDisplayName(g)}
            </Select.Option>
          ))}
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
            showSearch
            optionFilterProp="children"
            placeholder="Chọn game..."
            style={{ width: '100%' }}
            filterOption={(input, option: any) => {
              const label = String(option?.children || option?.label || '').toLowerCase();
              const search = String(option?.search || '').toLowerCase();
              const inp = input.toLowerCase();
              return label.includes(inp) || search.includes(inp);
            }}
            onChange={(value) => {
              const game = playableGames.find(g => g._id === value);
              if (game) {
                const now = dayjs();
                let closeTime = null;
                let openTime = now;
                let drawTime = null;

                if (game.code === 'MB' || ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(game.code)) {
                  closeTime = now.hour(18).minute(10).second(0);
                  drawTime = now.hour(18).minute(15).second(0);
                } else if (game.code === 'MT') {
                  closeTime = now.hour(17).minute(10).second(0);
                  drawTime = now.hour(17).minute(15).second(0);
                } else if (game.code === 'MN') {
                  closeTime = now.hour(16).minute(10).second(0);
                  drawTime = now.hour(16).minute(15).second(0);
                } else if (game.code === 'than_tai_4') {
                  // ĐIỆN TOÁN Thần Tài: Mở: 17h20 - Đóng: 17h20 - Xổ KQ: 18h00
                  const closeCandidate = now.hour(17).minute(20).second(0);
                  closeTime = now.isAfter(closeCandidate) ? closeCandidate.add(1, 'day') : closeCandidate;
                  openTime = closeTime.subtract(1, 'day');
                  drawTime = closeTime.clone().hour(18).minute(0).second(0);
                } else if (game.code === 'dientoan_123') {
                  // ĐIỆN TOÁN 1*2*3: Mở: 17h20 - Đóng: 17h20 - Xổ KQ: 18h15
                  const closeCandidate = now.hour(17).minute(20).second(0);
                  closeTime = now.isAfter(closeCandidate) ? closeCandidate.add(1, 'day') : closeCandidate;
                  openTime = closeTime.subtract(1, 'day');
                  drawTime = closeTime.clone().hour(18).minute(15).second(0);
                } else if (game.code === 'dientoan_636') {
                  // ĐIỆN TOÁN 6X36: Đóng 17h20, Xổ 18h15
                  const closeCandidate = now.hour(17).minute(20).second(0);
                  closeTime = now.isAfter(closeCandidate) ? closeCandidate.add(1, 'day') : closeCandidate;
                  openTime = closeTime.subtract(1, 'day');
                  drawTime = closeTime.clone().hour(18).minute(15).second(0);
                } else if (game.code === 'bingo18' || game.code.includes('keno')) {
                  const duration = game.drawDurationMinutes || 8;
                  closeTime = now.add(duration, 'minute');
                }

                if (closeTime) {
                  form.setFieldsValue({
                    openTime,
                    closeTime,
                    drawTime
                  });
                }
              }
            }}
          >
            {playableGames.map(g => (
              <Select.Option 
                key={g._id} 
                value={g._id}
                search={`${g.code} ${g.name} bingo bingo18`}
              >
                {getGameDisplayName(g)}
              </Select.Option>
            ))}
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

        <Form.Item
          name="drawTime"
          label="Thời gian mở thưởng xổ số (Tùy chọn)"
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="Chọn thời gian mở thưởng (nếu có)" />
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
      title={`Nhập kết quả ${currentKienThietDraw?.game?.name || ''} ${currentKienThietDraw?.provinceId ? `- Đài ${provinces.find(p => p.provinceId === currentKienThietDraw.provinceId)?.name}` : ''}`}
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

        {currentKienThietDraw?.game?.code === 'MB' ? (
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
      title={`Nhập kết quả ${currentMaxDraw?.game?.name || ''} - Kỳ ${currentMaxDraw?.drawCode || ''}`}
      open={isMaxModalOpen}
      onCancel={() => setIsMaxModalOpen(false)}
      footer={null}
      width={740}
      centered
      styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' } }}
    >
      <Form
        form={maxForm}
        layout="vertical"
        onFinish={handleSaveMaxResult}
      >
        {['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(currentMaxDraw?.game?.code) ? (
          <div style={{ padding: '4px 0' }}>
            <Alert
              type="info"
              showIcon
              message={`Cơ cấu kết quả ${currentMaxDraw?.game?.name || 'MAX 3D'} (20 số, mỗi số 3 chữ số 000-999)`}
              description="Vui lòng nhập riêng biệt theo từng giải: 2 số Đặc biệt, 4 số Giải Nhất, 6 số Giải Nhì và 8 số Giải Ba."
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16, padding: 12, background: '#fff1f2', borderRadius: 8, border: '1px solid #fecdd3' }}>
              <Title level={5} style={{ color: '#e11d48', marginTop: 0, marginBottom: 8 }}>
                Giải Đặc biệt (2 số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m3d_db_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 100, fontWeight: 'bold', color: '#e11d48', textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_db_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 100, fontWeight: 'bold', color: '#e11d48', textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#faf5ff', borderRadius: 8, border: '1px solid #f3e8ff' }}>
              <Title level={5} style={{ color: '#7e22ce', marginTop: 0, marginBottom: 8 }}>
                Giải Nhất (4 số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m3d_g1_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <Title level={5} style={{ color: '#15803d', marginTop: 0, marginBottom: 8 }}>
                Giải Nhì (6 số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m3d_g2_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_5" noStyle><Input placeholder="Số 5" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_6" noStyle><Input placeholder="Số 6" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <Title level={5} style={{ color: '#334155', marginTop: 0, marginBottom: 8 }}>
                Giải Ba (8 số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m3d_g3_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_5" noStyle><Input placeholder="Số 5" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_6" noStyle><Input placeholder="Số 6" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_7" noStyle><Input placeholder="Số 7" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_8" noStyle><Input placeholder="Số 8" maxLength={3} style={{ width: 90, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>
          </div>
        ) : (
          <div style={{ padding: '4px 0' }}>
            <Alert
              type="info"
              showIcon
              message={`Cơ cấu kết quả ${currentMaxDraw?.game?.name || 'MAX 4D'} (6 số, mỗi số 4 chữ số 0000-9999)`}
              description="Vui lòng nhập riêng biệt theo từng giải: 1 số Giải Nhất, 2 số Giải Nhì và 3 số Giải Ba."
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16, padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <Title level={5} style={{ color: '#1d4ed8', marginTop: 0, marginBottom: 8 }}>
                Giải Nhất (1 số 4 chữ số):
              </Title>
              <Form.Item name="m4d_g1" noStyle><Input placeholder="Giải Nhất (4 số)" maxLength={4} style={{ width: 130, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' }} /></Form.Item>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#faf5ff', borderRadius: 8, border: '1px solid #f3e8ff' }}>
              <Title level={5} style={{ color: '#7e22ce', marginTop: 0, marginBottom: 8 }}>
                Giải Nhì (2 số 4 chữ số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m4d_g2_1" noStyle><Input placeholder="Số 1 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g2_2" noStyle><Input placeholder="Số 2 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <Title level={5} style={{ color: '#334155', marginTop: 0, marginBottom: 8 }}>
                Giải Ba (3 số 4 chữ số):
              </Title>
              <Space wrap size="middle">
                <Form.Item name="m4d_g3_1" noStyle><Input placeholder="Số 1 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g3_2" noStyle><Input placeholder="Số 2 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g3_3" noStyle><Input placeholder="Số 3 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>
          </div>
        )}

        <Form.Item style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<SyncOutlined />} onClick={handleRandomizeMaxModal} style={{ marginRight: 'auto' }} disabled={savingMaxResult}>
            Điền ngẫu nhiên (Random)
          </Button>
          <Space>
            <Button onClick={() => setIsMaxModalOpen(false)} disabled={savingMaxResult}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={savingMaxResult} disabled={savingMaxResult}>Lưu Kết Quả</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title={`Chỉnh sửa kỳ quay ${editingDraw?.drawCode || ''} ${editingDraw?.game?.name ? `(${editingDraw.game.name})` : ''}`}
      open={isEditModalOpen}
      onCancel={() => setIsEditModalOpen(false)}
      footer={null}
      width={['MB', 'MT', 'MN', 'loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto', 'max_3d', 'max_3d_pro', 'max_3d_plus', 'max_4d'].includes(editingDraw?.game?.code) ? 750 : 550}
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

        {['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(editingDraw?.game?.code) && (
          <Alert
            type="info"
            showIcon
            message="Kỳ quay tự động theo kết quả XSMB"
            description="Game này tự động cập nhật kết quả và tính thưởng ngay khi nhập kết quả cho đài Xổ số Miền Bắc (MB). Chỉ chỉnh sửa tại đây nếu bạn cần can thiệp riêng biệt."
            style={{ marginBottom: 14 }}
          />
        )}

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
        ) : ['lotto_535', 'lotto_570'].includes(editingDraw?.game?.code) ? (
          <div style={{ marginTop: 12, marginBottom: 16, padding: 14, background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 14, color: '#6b21a8' }}>
                  Kết quả {editingDraw?.game?.name || 'LOTTO'} (Phân tách số thường & số đặc biệt):
                </strong>
                <div style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                  Gồm đúng 5 số thường ({editingDraw?.game?.code === 'lotto_570' ? '01 - 70' : '01 - 35'}) và 1 {editingDraw?.game?.code === 'lotto_570' ? 'Mega Ball (01 - 25)' : 'số đặc biệt (01 - 12)'}
                </div>
              </div>
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                type="primary"
                ghost
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random KQ
              </Button>
            </div>

            <Form.Item
              name="lottoMainNumbers"
              label={<strong>5 Số thường (cách nhau dấu phẩy hoặc khoảng trắng)</strong>}
              rules={[{ required: true, message: 'Vui lòng nhập 5 số thường' }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder={editingDraw?.game?.code === 'lotto_570' ? 'VD: 05, 12, 19, 45, 68' : 'VD: 05, 12, 19, 27, 34'} />
            </Form.Item>

            <Form.Item
              name="lottoSpecialNumber"
              label={<strong style={{ color: '#c2410c' }}>★ 1 Số đặc biệt / {editingDraw?.game?.code === 'lotto_570' ? 'Mega Ball' : 'Đặc Biệt'}</strong>}
              rules={[{ required: true, message: 'Vui lòng nhập số đặc biệt' }]}
              style={{ marginBottom: 0 }}
            >
              <Input 
                style={{ width: 140, borderColor: '#ea580c', fontWeight: 'bold', color: '#c2410c' }} 
                placeholder={editingDraw?.game?.code === 'lotto_570' ? 'VD: 15' : 'VD: 08'}
                maxLength={2} 
              />
            </Form.Item>
          </div>
        ) : ['max_3d', 'max_3d_pro', 'max_3d_plus'].includes(editingDraw?.game?.code) ? (
          <div style={{ marginTop: 12, marginBottom: 16, padding: 14, background: '#fdf2f8', borderRadius: 8, border: '1px solid #fbcfe8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 14, color: '#9d174d' }}>
                  Kết quả từng giải {editingDraw?.game?.name || 'MAX 3D'} (20 số, mỗi số 3 chữ số 000-999):
                </strong>
                <div style={{ fontSize: 12, color: '#be185d', marginTop: 2 }}>
                  Cơ cấu: 2 số Đặc biệt, 4 số Giải Nhất, 6 số Giải Nhì và 8 số Giải Ba.
                </div>
              </div>
              <Button 
                icon={<SyncOutlined />} 
                size="small" 
                type="primary" 
                ghost
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random KQ
              </Button>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #fecdd3' }}>
              <div style={{ fontWeight: 600, color: '#e11d48', marginBottom: 6 }}>Giải Đặc biệt (2 số):</div>
              <Space wrap size="middle">
                <Form.Item name="m3d_db_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 95, fontWeight: 'bold', color: '#e11d48', textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_db_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 95, fontWeight: 'bold', color: '#e11d48', textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #f3e8ff' }}>
              <div style={{ fontWeight: 600, color: '#7e22ce', marginBottom: 6 }}>Giải Nhất (4 số):</div>
              <Space wrap size="middle">
                <Form.Item name="m3d_g1_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g1_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #dcfce7' }}>
              <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 6 }}>Giải Nhì (6 số):</div>
              <Space wrap size="middle">
                <Form.Item name="m3d_g2_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_5" noStyle><Input placeholder="Số 5" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g2_6" noStyle><Input placeholder="Số 6" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>Giải Ba (8 số):</div>
              <Space wrap size="middle">
                <Form.Item name="m3d_g3_1" noStyle><Input placeholder="Số 1" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_2" noStyle><Input placeholder="Số 2" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_3" noStyle><Input placeholder="Số 3" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_4" noStyle><Input placeholder="Số 4" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_5" noStyle><Input placeholder="Số 5" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_6" noStyle><Input placeholder="Số 6" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_7" noStyle><Input placeholder="Số 7" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m3d_g3_8" noStyle><Input placeholder="Số 8" maxLength={3} style={{ width: 85, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>
          </div>
        ) : editingDraw?.game?.code === 'max_4d' ? (
          <div style={{ marginTop: 12, marginBottom: 16, padding: 14, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 14, color: '#0369a1' }}>
                  Kết quả từng giải {editingDraw?.game?.name || 'MAX 4D'} (6 số, mỗi số 4 chữ số 0000-9999):
                </strong>
                <div style={{ fontSize: 12, color: '#0284c7', marginTop: 2 }}>
                  Cơ cấu: 1 số Giải Nhất, 2 số Giải Nhì và 3 số Giải Ba.
                </div>
              </div>
              <Button 
                icon={<SyncOutlined />} 
                size="small" 
                type="primary" 
                ghost
                onClick={() => handleRandomizeEdit(editingDraw?.game)}
              >
                Random KQ
              </Button>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}>Giải Nhất (1 số 4 chữ số):</div>
              <Form.Item name="m4d_g1" noStyle><Input placeholder="Giải Nhất (4 số)" maxLength={4} style={{ width: 130, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' }} /></Form.Item>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #f3e8ff' }}>
              <div style={{ fontWeight: 600, color: '#7e22ce', marginBottom: 6 }}>Giải Nhì (2 số 4 chữ số):</div>
              <Space wrap size="middle">
                <Form.Item name="m4d_g2_1" noStyle><Input placeholder="Số 1 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g2_2" noStyle><Input placeholder="Số 2 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>

            <div style={{ padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>Giải Ba (3 số 4 chữ số):</div>
              <Space wrap size="middle">
                <Form.Item name="m4d_g3_1" noStyle><Input placeholder="Số 1 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g3_2" noStyle><Input placeholder="Số 2 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
                <Form.Item name="m4d_g3_3" noStyle><Input placeholder="Số 3 (4 số)" maxLength={4} style={{ width: 110, textAlign: 'center' }} /></Form.Item>
              </Space>
            </div>
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
              <Input.TextArea 
                rows={3} 
                placeholder={
                  editingDraw?.game?.code === 'than_tai_4'
                    ? 'VD: 4, 8, 2, 1 (4 chữ số Thần Tài)'
                    : editingDraw?.game?.code === 'dientoan_123'
                    ? 'VD: 3, 45, 812 (Bộ 1: 1 số, Bộ 2: 2 số, Bộ 3: 3 số)'
                    : 'VD: 05, 12, 28, 45, 60...'
                } 
              />
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
