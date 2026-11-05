import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LogoutOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
  WalletOutlined,
  MoreOutlined,
  CrownOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Button, DatePicker, Image, Input, Layout, Menu, message, Modal, Popover, Select, Space, Table, Tag, theme, Typography, Radio } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import AdminLogs from './AdminLogs';
import BannerManagement from './BannerManagement';
import DrawManagement from './DrawManagement';
import GameManagement from './GameManagement';
import GuideManagement from './GuideManagement';
import NotificationManagement from './NotificationManagement';
import OrderManagement from './OrderManagement';
import ProvinceManagement from './ProvinceManagement';
import SettingsManagement from './SettingsManagement';
import TermsManagement from './TermsManagement';
import TicketManagement from './TicketManagement';
import UserManagement from './UserManagement';
import AdminManagement from './AdminManagement';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { logout, user, hasPermission, isMasterAdmin, fetchProfile } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('wallet');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [depositStatus, setDepositStatus] = useState<string | undefined>(undefined);
  const [withdrawStatus, setWithdrawStatus] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [isServerPaginated, setIsServerPaginated] = useState<boolean>(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const [loading, setLoading] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const fetchTransactions = async (
    pageIndex: number = currentPage,
    limitCount: number = pageSize,
    customSearch?: string,
    customRange?: [dayjs.Dayjs, dayjs.Dayjs] | null,
    customDStatus?: string,
    customWStatus?: string,
    customType?: string,
    customMethod?: string
  ) => {
    try {
      setLoading(true);
      const search = customSearch !== undefined ? customSearch : searchText;
      const range = customRange !== undefined ? customRange : dateRange;
      const dStatus = customDStatus !== undefined ? customDStatus : depositStatus;
      const wStatus = customWStatus !== undefined ? customWStatus : withdrawStatus;
      const tType = customType !== undefined ? customType : typeFilter;
      const method = customMethod !== undefined ? customMethod : paymentMethodFilter;

      const params: any = {
        page: pageIndex,
        limit: limitCount,
      };
      if (search) params.search = search;
      if (range && range[0] && range[1]) {
        params.startDate = range[0].format('YYYY-MM-DD');
        params.endDate = range[1].format('YYYY-MM-DD');
      }
      if (dStatus) params.depositStatus = dStatus;
      if (wStatus) params.withdrawStatus = wStatus;
      if (tType && tType !== 'all') params.type = tType;
      if (method && method !== 'all') params.paymentMethod = method;

      const res = await api.get('/wallet/admin/transactions', { params });
      const data = res.data;
      if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setTotalTransactions(data.total ?? data.transactions.length);
        setIsServerPaginated(true);
      } else if (Array.isArray(data)) {
        setTransactions(data);
        setTotalTransactions(data.length);
        setIsServerPaginated(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallet') {
      setCurrentPage(1);
      fetchTransactions(1, pageSize, searchText, dateRange, depositStatus, withdrawStatus, typeFilter, paymentMethodFilter);
    }
  }, [activeTab, dateRange, depositStatus, withdrawStatus]);

  const filteredTransactions = useMemo(() => {
    if (isServerPaginated) return transactions;
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (paymentMethodFilter !== 'all') {
        if (paymentMethodFilter === 'crypto') {
          if (t.paymentMethod !== 'binance' && !(t.type === 'withdraw' && t.destinationInfo?.network)) return false;
        } else if (paymentMethodFilter === 'scratch') {
          if (t.paymentMethod !== 'scratch') return false;
        } else if (paymentMethodFilter === 'bank') {
          if (t.paymentMethod === 'binance' || t.paymentMethod === 'scratch') return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, paymentMethodFilter, isServerPaginated]);

  const handleTypeFilterChange = (val: 'all' | 'deposit' | 'withdraw') => {
    setTypeFilter(val);
    setCurrentPage(1);
    fetchTransactions(1, pageSize, searchText, dateRange, depositStatus, withdrawStatus, val, paymentMethodFilter);
  };

  const handlePaymentMethodFilterChange = (val: string) => {
    setPaymentMethodFilter(val);
    setCurrentPage(1);
    fetchTransactions(1, pageSize, searchText, dateRange, depositStatus, withdrawStatus, typeFilter, val);
  };

  const handleDepositStatusChange = (val?: string) => {
    setDepositStatus(val);
    setCurrentPage(1);
    fetchTransactions(1, pageSize, searchText, dateRange, val, withdrawStatus, typeFilter, paymentMethodFilter);
  };

  const handleWithdrawStatusChange = (val?: string) => {
    setWithdrawStatus(val);
    setCurrentPage(1);
    fetchTransactions(1, pageSize, searchText, dateRange, depositStatus, val, typeFilter, paymentMethodFilter);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    fetchTransactions(1, pageSize, value, dateRange, depositStatus, withdrawStatus, typeFilter, paymentMethodFilter);
  };

  const handleResetWalletFilters = () => {
    setSearchText('');
    setDateRange(null);
    setDepositStatus(undefined);
    setWithdrawStatus(undefined);
    setTypeFilter('all');
    setPaymentMethodFilter('all');
    setCurrentPage(1);
    fetchTransactions(1, pageSize, '', null, undefined, undefined, 'all', 'all');
  };

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'review' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleActionSubmit = async () => {
    if (!currentRecord) return;
    try {
      setActionLoading(true);
      if (actionType === 'approve') {
        await api.put(`/wallet/admin/transactions/${currentRecord._id}/approve`, { note: actionNote });
        message.success('Duyệt giao dịch thành công');
      } else if (actionType === 'reject') {
        await api.put(`/wallet/admin/transactions/${currentRecord._id}/reject`, { note: actionNote });
        message.success('Từ chối giao dịch thành công');
      }
      setActionModalVisible(false);
      setActionNote('');
      setCurrentRecord(null);
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      fetchTransactions();
    } catch (error) {
      message.error(`Lỗi ${actionType === 'approve' ? 'duyệt' : 'từ chối'} giao dịch`);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      fixed: 'left' as const,
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: any) => (
        <div 
          style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', backgroundColor: '#f0f5ff' }} 
          onClick={() => {
            if (record.user?.phone) {
              localStorage.setItem('userSearchPhone', record.user.phone);
              setActiveTab('users');
            }
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.user?.name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.user?.phone}</div>
        </div>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Nạp tiền', value: 'deposit' },
        { text: 'Rút tiền', value: 'withdraw' },
        { text: 'Thắng cược', value: 'win' },
      ],
      onFilter: (value: any, record: any) => record.type === value,
      render: (type: string) => {
        if (type === 'deposit') return <Tag color="blue">NẠP TIỀN</Tag>;
        if (type === 'withdraw') return <Tag color="orange">RÚT TIỀN</Tag>;
        if (type === 'win') return <Tag color="gold">THẮNG CƯỢC</Tag>;
        return <Tag>{type?.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => {
        const isCrypto = record.paymentMethod === 'binance' || (record.type === 'withdraw' && record.destinationInfo?.network);
        const isScratch = record.paymentMethod === 'scratch';
        const displayAmount = isScratch ? Math.floor(amount * 0.83) : amount;
        
        return (
          <div>
            <span style={{ fontWeight: 'bold', color: isScratch ? '#faad14' : 'inherit' }}>
              {isCrypto && record.destinationInfo?.amountUsdt
                ? `${record.destinationInfo.amountUsdt.toLocaleString()} USDT`
                : `${displayAmount?.toLocaleString()} đ`}
            </span>
            {isScratch && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                Thực nhận (Gốc: {amount?.toLocaleString()}đ)
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Chi tiết Nạp',
      key: 'depositDetails',
      render: (_: any, record: any) => {
        if (record.type === 'deposit') {
          return (
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: '#888', marginBottom: 4 }}>
                {new Date(record.createdAt).toLocaleString('vi-VN')}
              </div>
              {record.paymentMethod !== 'scratch' && record.paymentMethod !== 'binance' && (
                <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: 4 }}>
                  Nội dung CK: {record.txId || '-'}
                </div>
              )}
              {record.paymentMethod === 'binance' && (
                <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: 4 }}>
                  Mã Giao Dịch (TxID): <span style={{ fontWeight: 'bold' }}>{record.txId || '-'}</span>
                </div>
              )}
              {record.paymentMethod === 'scratch' && record.destinationInfo && (
                <div style={{ fontSize: '11px', color: '#d46b08', marginBottom: 4, backgroundColor: '#fffbe6', padding: '4px', borderRadius: '4px', border: '1px solid #ffe58f' }}>
                  <div><strong>Mạng:</strong> {record.destinationInfo.network}</div>
                  <div><strong>Seri:</strong> {record.destinationInfo.seri}</div>
                  <div><strong>PIN:</strong> {record.destinationInfo.pin}</div>
                </div>
              )}
              {record.receiptImage && (
                <Image
                  src={record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${record.receiptImage.startsWith('/') ? '' : '/'}${record.receiptImage}`}
                  alt="Biên lai"
                  width={50}
                  height={50}
                  style={{ borderRadius: 4, objectFit: 'cover' }}
                  preview={{ src: record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${record.receiptImage.startsWith('/') ? '' : '/'}${record.receiptImage}` }}
                />
              )}
            </div>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      }
    },
    {
      title: 'Chi tiết Rút',
      key: 'withdrawDetails',
      render: (_: any, record: any) => {
        if (record.type === 'withdraw' && record.destinationInfo) {
          let dest = record.destinationInfo;
          // Support both flat structure and nested structure
          if (dest.type && dest.details) {
            dest = { ...dest.details, isBank: dest.type === 'bank' };
          } else {
            dest = { ...dest, isBank: !!dest.bankName };
          }

          let qrUrl = '';
          if (dest.isBank) {
            qrUrl = (dest.qrCode && dest.qrCode !== 'undefined' && dest.qrCode !== 'null') ?
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`) :
              `https://img.vietqr.io/image/${dest.bankName}-${dest.accountNumber}-compact.png?accountName=${encodeURIComponent(dest.accountName)}`;
          } else {
            qrUrl = (dest.qrCode && dest.qrCode !== 'undefined' && dest.qrCode !== 'null') ?
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`) :
              (dest.address ? `https://quickchart.io/qr?text=${encodeURIComponent(dest.address)}&size=150` : '');
          }

          return (
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: '#888', marginBottom: 4 }}>
                {new Date(record.createdAt).toLocaleString('vi-VN')}
              </div>
              {dest.isBank ? (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{dest.bankName}</div>
                  <div>{dest.accountNumber} - {dest.accountName}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#52c41a' }}>{dest.network === 'Binance Pay' ? 'Binance Pay' : `Ví ${dest.network || 'Không rõ'}`}</div>
                  <div>{dest.address || 'Không rõ'}</div>
                </div>
              )}
              {qrUrl && (
                <div style={{ marginTop: 4 }}>
                  <Image src={qrUrl} width={50} style={{ borderRadius: 4 }} />
                </div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note: string) => <div style={{ fontSize: '12px', maxWidth: 150 }}>{note || '-'}</div>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Chờ duyệt', value: 'pending' },
        { text: 'Đã duyệt', value: 'approved' },
        { text: 'Từ chối', value: 'rejected' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
      render: (status: string) => {
        let color = 'default';
        let text = 'Không rõ';
        if (status === 'pending') { color = 'gold'; text = 'Chờ duyệt'; }
        if (status === 'approved') { color = 'green'; text = 'Đã duyệt'; }
        if (status === 'rejected') { color = 'red'; text = 'Từ chối'; }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Hành động',
      fixed: 'right' as const,
      key: 'action',
      render: (_: any, record: any) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              <Button
                size="small"
                icon={<EyeOutlined />}
                block
                onClick={() => {
                  setCurrentRecord(record);
                  setActionType('review');
                  setActionModalVisible(true);
                }}
              >
                Review
              </Button>
              {record.status === 'pending' && hasPermission('wallet', 'update') && (
                <>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    block
                    onClick={() => {
                      setCurrentRecord(record);
                      setActionType('approve');
                      setActionModalVisible(true);
                    }}
                  >
                    Duyệt
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    block
                    onClick={() => {
                      setCurrentRecord(record);
                      setActionType('reject');
                      setActionModalVisible(true);
                    }}
                  >
                    Từ chối
                  </Button>
                </>
              )}
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      )
    }
  ];

  const allMenuItems = [
    {
      key: 'wallet',
      icon: <WalletOutlined />,
      label: 'Quản lý Nạp / Rút',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Quản lý User',
    },
    {
      key: 'orders',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Đặt vé',
    },
    {
      key: 'tickets',
      icon: <AppstoreOutlined />,
      label: 'Quản lý vé Kiến Thiết',
    },
    {
      key: 'provinces',
      icon: <AppstoreOutlined />,
      label: 'Cấu hình Tỉnh/Đài',
    },
    {
      key: 'games',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Game',
    },
    {
      key: 'draws',
      icon: <TrophyOutlined />,
      label: 'Quản lý Kỳ quay',
    },
    {
      key: 'banners',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Banner',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cấu hình chung',
    },
    {
      key: 'adminLogs',
      icon: <HistoryOutlined />,
      label: 'Nhật ký Hoạt động',
    },
    {
      key: 'notifications',
      icon: <NotificationOutlined />,
      label: 'Thông báo',
    },
    {
      key: 'guides',
      icon: <FileTextOutlined />,
      label: 'Hướng dẫn',
    },
    {
      key: 'terms',
      icon: <SafetyCertificateOutlined />,
      label: 'Điều khoản hoạt động',
    },
    ...(isMasterAdmin() ? [
      {
        key: 'adminManagement',
        icon: <CrownOutlined style={{ color: '#faad14' }} />,
        label: <span style={{ fontWeight: 'bold', color: '#faad14' }}>Quản lý Admin</span>,
      }
    ] : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    }
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.type === 'divider') return true;
    if (item.key === 'logout') return true;
    if (item.key === 'adminManagement') return isMasterAdmin();
    if (!item.key) return false;
    return hasPermission(String(item.key), 'view');
  });

  useEffect(() => {
    const allowedKeys: string[] = menuItems
      .map(item => item.key)
      .filter((k): k is string => typeof k === 'string' && k !== 'logout');
    if (allowedKeys.length > 0 && !allowedKeys.includes(activeTab) && allowedKeys[0]) {
      setActiveTab(allowedKeys[0]);
    }
  }, [user, menuItems.length]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 64, margin: 16, color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          VUA XỔ SỐ CMS
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems as any}
          onClick={(e) => {
            if (e.key === 'logout') {
              logout();
            } else {
              setActiveTab(e.key);
            }
          }}
        />
      </Sider>
      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Content style={{ margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              overflow: activeTab === 'settings' || activeTab === 'terms' ? 'auto' : 'hidden',
              minHeight: 0,
              height: '100%',
            }}
          >
            {activeTab === 'wallet' && (
              <div className="cms-page-container">
                <div className="cms-page-header" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Title level={3} style={{ margin: 0, whiteSpace: 'nowrap' }}>Quản lý Nạp / Rút</Title>
                    
                    <Space wrap size="middle">
                      <Space size="small">
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>Loại GD:</span>
                        <Radio.Group
                          value={typeFilter}
                          onChange={(e) => handleTypeFilterChange(e.target.value)}
                          buttonStyle="solid"
                          size="small"
                        >
                          <Radio.Button value="all">Tất cả ({totalTransactions || transactions.length})</Radio.Button>
                          <Radio.Button value="deposit" style={typeFilter === 'deposit' ? { backgroundColor: '#1890ff', borderColor: '#1890ff' } : { color: '#1890ff' }}>
                            Nạp tiền
                          </Radio.Button>
                          <Radio.Button value="withdraw" style={typeFilter === 'withdraw' ? { backgroundColor: '#fa8c16', borderColor: '#fa8c16' } : { color: '#fa8c16' }}>
                            Rút tiền
                          </Radio.Button>
                        </Radio.Group>
                      </Space>

                      <Space size="small">
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>Cổng thanh toán:</span>
                        <Select
                          placeholder="Tất cả cổng"
                          style={{ width: 140 }}
                          value={paymentMethodFilter}
                          onChange={handlePaymentMethodFilterChange}
                          options={[
                            { label: 'Tất cả cổng', value: 'all' },
                            { label: 'Ngân hàng', value: 'bank' },
                            { label: 'Binance / Crypto', value: 'crypto' },
                            { label: 'Thẻ cào', value: 'scratch' },
                          ]}
                        />
                      </Space>
                    </Space>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <Space size="small">
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>Nạp tiền:</span>
                      <Select
                        placeholder="Trạng thái"
                        allowClear
                        value={depositStatus}
                        onChange={handleDepositStatusChange}
                        style={{ width: 130 }}
                        options={[
                          { label: 'Tất cả nạp', value: 'all' },
                          { label: 'Chờ duyệt', value: 'pending' },
                          { label: 'Đã duyệt', value: 'approved' },
                          { label: 'Từ chối', value: 'rejected' },
                        ]}
                      />
                    </Space>

                    <Space size="small">
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>Rút tiền:</span>
                      <Select
                        placeholder="Trạng thái"
                        allowClear
                        value={withdrawStatus}
                        onChange={handleWithdrawStatusChange}
                        style={{ width: 130 }}
                        options={[
                          { label: 'Tất cả rút', value: 'all' },
                          { label: 'Chờ duyệt', value: 'pending' },
                          { label: 'Đã duyệt', value: 'approved' },
                          { label: 'Từ chối', value: 'rejected' },
                        ]}
                      />
                    </Space>

                    <Space size="small">
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>Ngày tháng:</span>
                      <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        allowClear
                        value={dateRange}
                        onChange={(dates) => {
                          const range = dates as any;
                          setDateRange(range);
                          setCurrentPage(1);
                          fetchTransactions(1, pageSize, searchText, range, depositStatus, withdrawStatus, typeFilter, paymentMethodFilter);
                        }}
                        placeholder={['Từ ngày', 'Đến ngày']}
                        style={{ width: 240 }}
                        presets={[
                          { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                          { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                          { label: '7 ngày qua', value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
                          { label: '30 ngày qua', value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
                          { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                        ]}
                      />
                    </Space>

                    <Input.Search
                      placeholder="Tìm theo Tên, SĐT, Mã GD..."
                      allowClear
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        if (!e.target.value) {
                          setCurrentPage(1);
                          fetchTransactions(1, pageSize, '', dateRange, depositStatus, withdrawStatus, typeFilter, paymentMethodFilter);
                        }
                      }}
                      onSearch={handleSearch}
                      style={{ width: 250 }}
                    />

                    {(searchText || dateRange || depositStatus || withdrawStatus || typeFilter !== 'all' || paymentMethodFilter !== 'all') && (
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetWalletFilters}
                        style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                      >
                        Xoá bộ lọc
                      </Button>
                    )}
                  </div>
                </div>
                <Table
                  className="cms-table-fill"
                  columns={columns}
                  dataSource={isServerPaginated ? transactions : filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: isServerPaginated ? totalTransactions : filteredTransactions.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                      if (isServerPaginated) {
                        fetchTransactions(page, size, searchText, dateRange, depositStatus, withdrawStatus, typeFilter, paymentMethodFilter);
                      }
                    },
                    showTotal: (total, range) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                        <span>Tổng: <strong style={{ color: '#1677ff', fontSize: 14 }}>{total}</strong> giao dịch</span>
                        <span style={{ color: '#888' }}>(Hiển thị {range[0]}-{range[1]})</span>
                      </div>
                    )
                  }}
                  scroll={{ y: '100%', x: 'max-content' }}
                />

                <Modal
                  title={
                    actionType === 'review' ? 'Chi tiết giao dịch' :
                      actionType === 'approve' ? 'Xác nhận Duyệt giao dịch' :
                        'Xác nhận Từ chối giao dịch'
                  }
                  open={actionModalVisible}
                  onCancel={() => {
                    if (actionLoading) return;
                    setActionModalVisible(false);
                    setActionNote('');
                  }}
                  onOk={actionType === 'review' ? () => setActionModalVisible(false) : handleActionSubmit}
                  confirmLoading={actionLoading}
                  okText={actionType === 'review' ? 'Đóng' : 'Xác nhận'}
                  cancelText="Hủy"
                  okButtonProps={{
                    danger: actionType === 'reject',
                    type: actionType === 'approve' ? 'primary' : 'default',
                    loading: actionLoading,
                    disabled: actionLoading,
                  }}
                  cancelButtonProps={{
                    disabled: actionLoading,
                  }}
                >
                  {currentRecord && (
                    <div>
                      <p><strong>Người dùng:</strong> {currentRecord.user?.name} - {currentRecord.user?.phone}</p>
                      <p><strong>Loại:</strong> {currentRecord.type === 'deposit' ? 'NẠP TIỀN' : 'RÚT TIỀN'}</p>
                      <p>
                        <strong>Số tiền:</strong> 
                        {currentRecord.paymentMethod === 'binance' && currentRecord.destinationInfo?.amountUsdt 
                          ? ` ${currentRecord.destinationInfo.amountUsdt.toLocaleString()} USDT` 
                          : ` ${currentRecord.paymentMethod === 'scratch' ? Math.floor(currentRecord.amount * 0.83).toLocaleString() : currentRecord.amount?.toLocaleString()} đ`}
                        
                        {currentRecord.paymentMethod === 'scratch' && (
                          <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                            (Gốc: {currentRecord.amount?.toLocaleString()} đ - Phí 17%)
                          </span>
                        )}
                      </p>
                      <p><strong>Cổng nạp:</strong> {currentRecord.paymentMethod === 'manual' ? 'Ngân hàng' : currentRecord.paymentMethod === 'scratch' ? 'Thẻ cào' : currentRecord.paymentMethod?.toUpperCase()}</p>

                      {currentRecord.destinationInfo && currentRecord.paymentMethod === 'scratch' && (
                        <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                          <p style={{ margin: 0 }}><strong>Nhà mạng:</strong> {currentRecord.destinationInfo.network}</p>
                          <p style={{ margin: 0 }}><strong>Seri:</strong> {currentRecord.destinationInfo.seri}</p>
                          <p style={{ margin: 0 }}><strong>PIN:</strong> {currentRecord.destinationInfo.pin}</p>
                        </div>
                      )}

                      {currentRecord.type === 'withdraw' && currentRecord.destinationInfo && (
                        <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                          <p style={{ margin: 0, marginBottom: 8, fontWeight: 'bold' }}>Thông tin nhận tiền:</p>
                          {(() => {
                            let dest = currentRecord.destinationInfo;
                            if (dest.type && dest.details) {
                              dest = { ...dest.details, isBank: dest.type === 'bank' };
                            } else {
                              dest = { ...dest, isBank: !!dest.bankName };
                            }
                            
                            let qrUrl = '';
                            if (dest.isBank) {
                              if (dest.qrCode && dest.qrCode !== 'undefined' && dest.qrCode !== 'null') {
                                qrUrl = dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`;
                              } else {
                                qrUrl = `https://img.vietqr.io/image/${dest.bankName}-${dest.accountNumber}-compact.png?accountName=${encodeURIComponent(dest.accountName)}`;
                              }
                            } else {
                              if (dest.qrCode && dest.qrCode !== 'undefined' && dest.qrCode !== 'null') {
                                qrUrl = dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`;
                              } else if (dest.address) {
                                qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(dest.address)}&size=150`;
                              }
                            }
                            
                            return (
                              <div>
                                {dest.isBank ? (
                                  <>
                                    <p style={{ margin: 0 }}><strong>Ngân hàng:</strong> {dest.bankName}</p>
                                    <p style={{ margin: 0 }}><strong>STK:</strong> {dest.accountNumber}</p>
                                    <p style={{ margin: 0 }}><strong>Tên:</strong> {dest.accountName}</p>
                                  </>
                                ) : (
                                  <>
                                    <p style={{ margin: 0 }}><strong>Mạng:</strong> {dest.network === 'Binance Pay' ? 'Binance Pay' : `Ví ${dest.network || 'Không rõ'}`}</p>
                                    <p style={{ margin: 0 }}><strong>Địa chỉ:</strong> {dest.address}</p>
                                  </>
                                )}
                                {qrUrl && (
                                  <div style={{ marginTop: 12 }}>
                                    <p style={{ margin: 0, marginBottom: 4 }}><strong>QR Code:</strong></p>
                                    <Image
                                      width={200}
                                      src={qrUrl}
                                      alt="QR Code"
                                      style={{ borderRadius: 8, objectFit: 'contain' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {currentRecord.receiptImage && (
                        <div style={{ marginTop: 12 }}>
                          <p><strong>Ảnh đính kèm:</strong></p>
                          <Image
                            width={200}
                            src={currentRecord.receiptImage.startsWith('http') ? currentRecord.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${currentRecord.receiptImage.startsWith('/') ? '' : '/'}${currentRecord.receiptImage}`}
                            alt="Biên lai / Thẻ cào"
                          />
                        </div>
                      )}

                      {actionType !== 'review' && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ marginBottom: 8 }}><strong>Ghi chú (tuỳ chọn):</strong></p>
                          <Input.TextArea
                            rows={3}
                            placeholder="Nhập lý do hoặc ghi chú cho admin/khách hàng"
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                          />
                        </div>
                      )}

                      {actionType === 'review' && currentRecord.note && (
                        <p style={{ marginTop: 16 }}><strong>Ghi chú:</strong> {currentRecord.note}</p>
                      )}
                    </div>
                  )}
                </Modal>

              </div>
            )}

            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'tickets' && <TicketManagement />}
            {activeTab === 'provinces' && <ProvinceManagement />}
            {activeTab === 'games' && <GameManagement />}
            {activeTab === 'draws' && <DrawManagement />}
            {activeTab === 'banners' && <BannerManagement />}
            {activeTab === 'settings' && <SettingsManagement />}
            {activeTab === 'adminLogs' && <AdminLogs />}
            {activeTab === 'notifications' && <NotificationManagement />}
            {activeTab === 'guides' && <GuideManagement />}
            {activeTab === 'terms' && <TermsManagement />}
            {activeTab === 'adminManagement' && isMasterAdmin() && <AdminManagement />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
