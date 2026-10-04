import { CameraOutlined, CheckCircleOutlined, MoreOutlined, UploadOutlined, DownloadOutlined, WarningOutlined , EyeOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Divider, Input, message, Modal, Popover, Row, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

const { Title } = Typography;

interface Order {
  _id: string;
  orderId: string;
  gameType: string;
  playType?: string;
  drawId?: string;
  drawDate?: string;
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

      if (pType.includes('bao 2 số') || pType.includes('bao lô tô 2 số')) {
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

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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


  useEffect(() => {
    const handleOpenOrder = (e: any) => {
      const { orderId, date } = e.detail;
      setSearchText(orderId);
      if (date) {
        setSelectedDate(dayjs(date));
      }
      setAutoOpenOrderId(orderId);
    };
    window.addEventListener('openOrder', handleOpenOrder);
    return () => window.removeEventListener('openOrder', handleOpenOrder);
  }, []);



  const [minBet, setMinBet] = useState('');
  const [minWin, setMinWin] = useState('');

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [exportDateRange, setExportDateRange] = useState<any>([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [summaryData, setSummaryData] = useState({
    totalTickets: 0,
    totalSales: 0,
    totalPrize: 0,
    totalLoss: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    try {
      const dateParam = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
      const res = await api.get('/orders/admin/summary', { params: { date: dateParam } });
      setSummaryData(res.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchOrders = async (searchValue: string = searchText) => {
    try {
      setLoading(true);
      const dateParam = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
      const params: any = { date: dateParam };
      if (searchValue) params.search = searchValue;
      const res = await api.get('/orders/admin', { params });
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Lỗi khi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

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

  const handleCheckArbitrage = () => {
    const groups: Record<string, { numbers: Set<string>, orders: any[] }> = {};

    filteredOrders.forEach(order => {
      const province = order.provinceName || order.gameType;
      const draw = order.drawDate || order.drawId || 'unknown-draw';
      
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
      if (!exportDateRange || exportDateRange.length < 2 || !exportDateRange[0] || !exportDateRange[1]) {
        message.warning('Vui lòng chọn khoảng thời gian cần xuất dữ liệu');
        setLoading(false);
        return;
      }

      const res = await api.get('/orders/admin'); 
      const startDate = exportDateRange[0].startOf('day');
      const endDate = exportDateRange[1].endOf('day');
      
      const allOrders = res.data.filter((o: Order) => {
        const orderDate = dayjs(o.createdAt);
        return orderDate.isAfter(startDate) && orderDate.isBefore(endDate);
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
        
        let drawText = o.drawDate || o.drawId || '';
        if (drawText && drawText.length === 10 && drawText.includes('/')) {
          if (o.gameType === 'xsmn') drawText = `16:15:00 ${drawText}`;
          else if (o.gameType === 'xsmt') drawText = `17:15:00 ${drawText}`;
          else if (o.gameType === 'xsmb') drawText = `18:15:00 ${drawText}`;
        }
        
        exportRow['Ngày Xổ'] = drawText;
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

  const filteredOrders = orders.filter(o => {
    let match = true;
    if (minBet) {
      if (o.totalCost < Number(minBet)) match = false;
    }
    if (minWin) {
      if ((o.prizeAmount || 0) < Number(minWin)) match = false;
    }
    return match;
  });

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
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.user?.name}</div>
          <div style={{ color: 'gray', fontSize: 12 }}>{record.user?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Tỉnh/Đài',
      key: 'province',
      render: (_: any, record: Order) => {
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
        const name = record.provinceName || gameNames[record.gameType] || record.gameType.toUpperCase();
        return <strong>{name}</strong>;
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
        <span style={{ color: record.isWinner ? '#52c41a' : 'gray', fontWeight: 'bold' }}>
          {record.isWinner && record.prizeAmount ? `${record.prizeAmount.toLocaleString('vi-VN')}đ` : (record.isWinner === false ? '0đ' : '-')}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
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
      title: 'Ngày xổ',
      key: 'drawDate',
      render: (_: any, record: Order) => {
        let text = record.drawDate || record.drawId || '-';
        if (text && text.length === 10 && text.includes('/')) {
          // This is likely a DD/MM/YYYY string for Kien Thiet
          if (record.gameType === 'xsmn') text = `16:15:00 ${text}`;
          else if (record.gameType === 'xsmt') text = `17:15:00 ${text}`;
          else if (record.gameType === 'xsmb') text = `18:15:00 ${text}`;
        }
        return text;
      },
    },
    {
      title: 'Kết quả',
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
        if (!record.winningNumbers || record.winningNumbers.length === 0) {
          return <span style={{ color: '#aaa' }}>Chưa có KQ</span>;
        }
        if (record.isWinner) {
          return <span style={{ color: 'green', fontWeight: 'bold' }}>Thắng</span>;
        }
        return <span style={{ color: 'red', fontWeight: 'bold' }}>Thua</span>;
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ marginTop: 0, marginBottom: 16 }} level={4} >Quản lý Đặt vé (Orders)</Title>
        <Space>
          <span>Lọc theo ngày:</span>
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="DD/MM/YYYY"
            allowClear
          />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, background: '#fff', padding: 16, borderRadius: 8 }}>
        <Input.Search 
          placeholder="Tìm tên, SĐT, Mã vé..." 
          style={{ width: 250 }} 
          value={searchText} 
          onChange={e => setSearchText(e.target.value)} 
          onSearch={(value) => fetchOrders(value)}
          enterButton
          allowClear
        />
        
        <Space>
          <span>Cược tối thiểu:</span>
          <Input 
            placeholder="Số tiền..." 
            style={{ width: 120 }} 
            value={minBet} 
            onChange={e => setMinBet(e.target.value)} 
          />
        </Space>

        <Space>
          <span>Thắng tối thiểu:</span>
          <Input 
            placeholder="Số tiền..." 
            style={{ width: 120 }} 
            value={minWin} 
            onChange={e => setMinWin(e.target.value)} 
          />
        </Space>

        <DatePicker.RangePicker
          style={{ width: 260 }}
          value={exportDateRange}
          onChange={(dates) => setExportDateRange(dates)}
          format="DD/MM/YYYY"
        />
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          style={{ backgroundColor: '#52c41a' }}
          onClick={handleExportExcel}
          loading={loading}
        >
          Xuất dữ liệu
        </Button>

        <Input 
          placeholder="Nhập tên KH để check đối nghịch..." 
          value={arbitrageUsername} 
          onChange={e => setArbitrageUsername(e.target.value)} 
          style={{ width: 250, marginRight: 10 }} 
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

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 380px)', x: 'max-content' }}
        columns={columns}
        dataSource={filteredOrders}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={`Tải hình ảnh vé - ${selectedOrder?.orderId}`}
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => setUploadModalVisible(false)}
        confirmLoading={uploading}
        footer={[
          <Button key="cancel" onClick={() => setUploadModalVisible(false)}>Huỷ</Button>,
          <Button key="submit" type="primary" onClick={handleUpload} loading={uploading}>Xác nhận & Tải lên</Button>
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
            <p><strong>Loại cược:</strong> <Tag color="geekblue">{selectedTicketOrder.playType || 'Vé cơ bản'}</Tag></p>
            <p><strong>Số tiền cược:</strong> <strong style={{color: 'red'}}>{selectedTicketOrder.totalCost?.toLocaleString('vi-VN')} đ</strong></p>
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
    </div>
  );
}
