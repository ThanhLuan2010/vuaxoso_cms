import { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Button, Space, Typography, Drawer, Tabs, Form, Input, Select, message, Spin, Descriptions, Row, Col, Switch, Divider, Image, Modal, List, Popover, DatePicker } from 'antd';
import { EditOutlined, LockOutlined, UnlockOutlined, EyeOutlined, EyeInvisibleOutlined, MessageOutlined, MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const { Title } = Typography;

export default function UserManagement() {
  const { hasPermission, canViewField } = useAuthStore();
  const canUpdateUser = hasPermission('users', 'update');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [memberType, setMemberType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isServerPaginated, setIsServerPaginated] = useState<boolean>(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [balanceHistoryData, setBalanceHistoryData] = useState<any[]>([]);
  const [balanceHistoryLoading, setBalanceHistoryLoading] = useState(false);
  const [balanceHistoryTotal, setBalanceHistoryTotal] = useState(0);
  const [balanceHistoryPage, setBalanceHistoryPage] = useState(1);
  const [activeTab, setActiveTab] = useState('1');

  const fetchBalanceHistory = async (userId: string, page: number = 1) => {
    try {
      setBalanceHistoryLoading(true);
      const res = await api.get(`/users/${userId}/balance-history?page=${page}&limit=20`);
      setBalanceHistoryData(res.data.history);
      setBalanceHistoryTotal(res.data.total);
      setBalanceHistoryPage(page);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải biến động số dư');
    } finally {
      setBalanceHistoryLoading(false);
    }
  };

  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);

  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsData, setTransactionsData] = useState<any[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState(10);

  const fetchUserOrders = async (userId: string, page: number = 1, limit: number = 10) => {
    try {
      setOrdersLoading(true);
      const res = await api.get(`/users/${userId}/orders?page=${page}&limit=${limit}`);
      setOrdersData(res.data.orders || []);
      setOrdersTotal(res.data.total || 0);
      setOrdersPage(page);
      setOrdersPageSize(limit);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải lịch sử mua vé');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUserTransactions = async (userId: string, page: number = 1, limit: number = 10) => {
    try {
      setTransactionsLoading(true);
      const res = await api.get(`/users/${userId}/transactions?page=${page}&limit=${limit}`);
      setTransactionsData(res.data.transactions || []);
      setTransactionsTotal(res.data.total || 0);
      setTransactionsPage(page);
      setTransactionsPageSize(limit);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải lịch sử nạp / rút');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesPageSize, setActivitiesPageSize] = useState(10);

  const fetchUserActivities = async (userId: string, page: number = 1, limit: number = 10) => {
    try {
      setActivitiesLoading(true);
      const res = await api.get(`/users/${userId}/activities?page=${page}&limit=${limit}`);
      setActivitiesData(res.data.logs || []);
      setActivitiesTotal(res.data.total || 0);
      setActivitiesPage(page);
      setActivitiesPageSize(limit);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải lịch sử hoạt động');
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (isDrawerVisible && editingUser) {
      if (activeTab === '2') {
        fetchUserOrders(editingUser._id, 1, ordersPageSize);
      } else if (activeTab === '3') {
        fetchUserTransactions(editingUser._id, 1, transactionsPageSize);
      } else if (activeTab === '6') {
        fetchUserActivities(editingUser._id, 1, activitiesPageSize);
      } else if (activeTab === 'balance_history') {
        fetchBalanceHistory(editingUser._id, 1);
      }
    }
  }, [isDrawerVisible, editingUser, activeTab]);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ orders: [], transactions: [] });
  const [userLogs, setUserLogs] = useState<any[]>([]);

  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [msgForm] = Form.useForm();
  const [selectedUserForMsg, setSelectedUserForMsg] = useState<any>(null);
  const [sendingMsg, setSendingMsg] = useState(false);

  const cccdImageVal = Form.useWatch('cccdImage', form);
  const walletsVal = Form.useWatch('wallets', form);
  const banksVal = Form.useWatch('banks', form);

  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newWithdrawPassword, setNewWithdrawPassword] = useState('');

  const fetchUsers = async (
    pageIndex: number = currentPage,
    limitCount: number = pageSize,
    search: string = searchText,
    start = startDate,
    end = endDate,
    mType = memberType,
    sFilter = statusFilter,
    bFilter = balanceFilter
  ) => {
    setLoading(true);
    try {
      const params: any = {
        page: pageIndex,
        limit: limitCount,
      };
      if (search) params.search = search;
      if (start) params.startDate = start.format('YYYY-MM-DD');
      if (end) params.endDate = end.format('YYYY-MM-DD');
      if (mType && mType !== 'all') params.memberType = mType;
      if (sFilter && sFilter !== 'all') params.status = sFilter;
      if (bFilter && bFilter !== 'all') params.balanceFilter = bFilter;

      const res = await api.get('/users', { params });
      if (res.data && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
        setTotalUsers(res.data.total ?? res.data.users.length);
        setIsServerPaginated(true);
        return res.data.users;
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
        setTotalUsers(res.data.length);
        setIsServerPaginated(false);
        return res.data;
      }
    } catch (err) {
      message.error('Lỗi khi tải danh sách user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOpenUser = (phone: string) => {
      setSearchText(phone);
      fetchUsers(1, pageSize, phone).then((data) => {
        if (data && data.length > 0) {
          const exactUser = data.find((u: any) => u.phone === phone) || data[0];
          if (exactUser) {
            showEditDrawer(exactUser);
          }
        }
      });
    };

    const searchPhone = localStorage.getItem('userSearchPhone');
    if (searchPhone) {
      handleOpenUser(searchPhone);
      localStorage.removeItem('userSearchPhone');
    } else {
      fetchUsers(1, pageSize);
    }

    const handleOpenUserDetail = (e: any) => {
      const phone = e.detail?.phone;
      if (phone) {
        handleOpenUser(phone);
      }
    };
    window.addEventListener('openUserDetail', handleOpenUserDetail);
    return () => window.removeEventListener('openUserDetail', handleOpenUserDetail);
  }, []);

  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setMemberType('all');
    setStatusFilter('all');
    setBalanceFilter('all');
    setSearchText('');
    setCurrentPage(1);
    fetchUsers(1, pageSize, '', null, null, 'all', 'all', 'all');
  };

  const filteredUsers = useMemo(() => {
    if (isServerPaginated) return users;
    return users.filter((u: any) => {
      // 1. Text search
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesName = (u.name || '').toLowerCase().includes(query);
        const matchesPhone = (u.phone || '').toLowerCase().includes(query);
        const matchesEmail = (u.email || '').toLowerCase().includes(query);
        const matchesCccd = (u.cccdNumber || '').toLowerCase().includes(query);
        const matchesRegIp = (u.registerIp || '').toLowerCase().includes(query);
        const matchesLogIp = (u.loginIp || '').toLowerCase().includes(query);
        const matchesDevice = (u.loginDevice || '').toLowerCase().includes(query);
        const matchesBank = (u.bankInfo?.accountNumber || '').toLowerCase().includes(query) ||
          (u.banks || []).some((b: any) => (b.accountNumber || '').toLowerCase().includes(query));
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCccd && !matchesRegIp && !matchesLogIp && !matchesDevice && !matchesBank) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        const curStatus = u.status || 'active';
        if (curStatus !== statusFilter) return false;
      }

      // 3. Balance filter
      if (balanceFilter === 'has_balance') {
        if (!u.balance || u.balance <= 0) return false;
      } else if (balanceFilter === 'zero_balance') {
        if (u.balance && u.balance > 0) return false;
      }

      // 4. Date & Member type filter
      if (!u.createdAt) return true;
      const userCreated = dayjs(u.createdAt);
      if (!userCreated.isValid()) return true;

      const start = startDate ? startDate.startOf('day') : null;
      const end = endDate ? endDate.endOf('day') : null;

      const todayStart = dayjs().startOf('day');
      const todayEnd = dayjs().endOf('day');

      if (memberType === 'new') {
        // Mới đăng ký: chỉ lọc trong ngày hiện tại
        if (userCreated.isBefore(todayStart) || userCreated.isAfter(todayEnd)) {
          return false;
        }
      } else if (memberType === 'old') {
        // Tài khoản cũ: từ ngày hôm trước hôm nay trở về trước (< todayStart)
        if (!userCreated.isBefore(todayStart)) {
          return false;
        }
        if (start && userCreated.isBefore(start)) {
          return false;
        }
        if (end && userCreated.isAfter(end)) {
          return false;
        }
      } else if (memberType === 'all') {
        if (start && userCreated.isBefore(start)) {
          return false;
        }
        if (end && userCreated.isAfter(end)) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchText, statusFilter, balanceFilter, memberType, startDate, endDate, isServerPaginated]);

  const showEditDrawer = async (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      phone: user.phone,
      balance: user.balance,
      role: user.role,
      email: user.email,
      emailVerified: user.emailVerified,
      cccdNumber: user.cccdNumber,
      isInfoUpdated: user.isInfoUpdated,
      cccdImage: user.cccdImage,
      note: user.note,
      bankName: user.bankInfo?.bankName,
      accountNumber: user.bankInfo?.accountNumber,
      accountName: user.bankInfo?.accountName,
      banks: user.banks || [],
      wallets: user.wallets || [],
    });
    setIsDrawerVisible(true);

    // Fetch History
    setOrdersPage(1);
    setTransactionsPage(1);
    setActivitiesPage(1);
    if (activeTab === '2') {
      fetchUserOrders(user._id, 1, ordersPageSize);
    } else if (activeTab === '3') {
      fetchUserTransactions(user._id, 1, transactionsPageSize);
    } else if (activeTab === '6') {
      fetchUserActivities(user._id, 1, activitiesPageSize);
    }

    try {
      // Log the view action
      api.post('/logs/view-user', { targetUserId: user._id }).catch(err => console.error('Failed to log view action', err));
      
      const adminLogsRes = await api.get(`/logs/user/${user._id}`);

      // Filter only notes for the notes section
      const notesOnly = adminLogsRes.data.filter((log: any) => log.details?.includes('Ghi chú:'));
      setUserLogs(notesOnly);
    } catch (err) {
      message.error('Không thể tải lịch sử người dùng');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCancel = () => {
    setIsDrawerVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        ...values,
        bankInfo: {
          bankName: values.bankName,
          accountNumber: values.accountNumber,
          accountName: values.accountName,
        },
        banks: values.banks,
        wallets: values.wallets,
      };

      await api.put(`/users/${editingUser._id}`, payload);
      message.success('Cập nhật user thành công');
      setIsDrawerVisible(false);
      setEditingUser(null);
      setUserLogs([]);
      fetchUsers(currentPage, pageSize);
    } catch (error) {
      if (error && (error as any).errorFields) {
        // Validation error
        return;
      }
      message.error('Lỗi khi cập nhật user');
    }
  };

  const handleToggleStatus = async (user: any, newStatus: string) => {
    try {
      const payload = {
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        email: user.email,
        emailVerified: user.emailVerified,
        cccdImage: user.cccdImage,
        cccdNumber: user.cccdNumber,
        isInfoUpdated: user.isInfoUpdated,
        bankInfo: user.bankInfo,
        banks: user.banks,
        wallets: user.wallets,
        status: newStatus
      };
      await api.put(`/users/${user._id}`, payload);
      message.success(`Đã đổi trạng thái`);
      fetchUsers(currentPage, pageSize);
    } catch (error) {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleResetLoginPassword = async () => {
    if (!newLoginPassword) return message.warning('Vui lòng nhập mật khẩu mới');
    try {
      await api.post(`/users/${editingUser._id}/reset-password`, { newPassword: newLoginPassword });
      message.success('Đặt lại mật khẩu đăng nhập thành công');
      setNewLoginPassword('');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu');
    }
  };

  const handleResetWithdrawPassword = async () => {
    if (!newWithdrawPassword) return message.warning('Vui lòng nhập mật khẩu mới');
    try {
      await api.post(`/users/${editingUser._id}/reset-withdraw-password`, { newPassword: newWithdrawPassword });
      message.success('Đặt lại mật khẩu rút tiền thành công');
      setNewWithdrawPassword('');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu');
    }
  };

  const showMessageModal = (user: any) => {
    setSelectedUserForMsg(user);
    msgForm.resetFields();
    setMsgModalVisible(true);
  };

  const handleSendMessage = async (values: any) => {
    try {
      setSendingMsg(true);
      await api.post('/notifications/admin', { ...values, user: selectedUserForMsg._id });
      message.success('Gửi tin nhắn thành công');
      setMsgModalVisible(false);
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi gửi tin nhắn');
    } finally {
      setSendingMsg(false);
    }
  };

  const columns = [
    {
      fixed: 'left' as const,
      title: 'Họ Tên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (!canViewField('name') ? '******' : (text || '-')),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => (!canViewField('phone') ? '******' : (text || '-')),
    },
    {
      title: 'Số dư (đ)',
      dataIndex: 'balance',
      key: 'balance',
      sorter: (a: any, b: any) => (a.balance || 0) - (b.balance || 0),
      render: (val: any) => (!canViewField('balance') ? '******' : (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{typeof val === 'number' ? val.toLocaleString('vi-VN') : (val || 0)}</span>
      )),
    },
    {
      title: 'Quyền',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: 'USER', value: 'user' },
        { text: 'ADMIN', value: 'admin' },
      ],
      onFilter: (value: any, record: any) => record.role === value,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'purple' : 'green'}>{role?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 125,
      filters: [
        { text: 'Hoạt động', value: 'active' },
        { text: 'Đã khoá', value: 'locked' },
        { text: 'Review', value: 'review' },
      ],
      onFilter: (value: any, record: any) => (record.status || 'active') === value,
      render: (status: string) => {
        if (status === 'locked') return <Tag color="error">Đã khoá</Tag>;
        if (status === 'review') return <Tag color="warning">Review</Tag>;
        return <Tag color="success">Hoạt động</Tag>;
      },
    },
    {
      title: 'Tổng nạp',
      dataIndex: 'totalDeposit',
      key: 'totalDeposit',
      sorter: (a: any, b: any) => (a.totalDeposit || 0) - (b.totalDeposit || 0),
      render: (val: any) => (!canViewField('totalDepositWithdraw') ? '******' : (
        <span style={{ color: '#1890ff' }}>{typeof val === 'number' ? val.toLocaleString('vi-VN') : (val || 0)} đ</span>
      )),
    },
    {
      title: 'Tổng rút',
      dataIndex: 'totalWithdraw',
      key: 'totalWithdraw',
      sorter: (a: any, b: any) => (a.totalWithdraw || 0) - (b.totalWithdraw || 0),
      render: (val: any) => (!canViewField('totalDepositWithdraw') ? '******' : (
        <span style={{ color: '#faad14' }}>{typeof val === 'number' ? val.toLocaleString('vi-VN') : (val || 0)} đ</span>
      )),
    },
    {
      title: 'IP Đăng ký',
      dataIndex: 'registerIp',
      key: 'registerIp',
      render: (val: string) => (!canViewField('ipInfo') ? '******' : (val ? val.split(',')[0].trim() : '-')),
    },
    {
      title: 'IP Đăng nhập',
      dataIndex: 'loginIp',
      key: 'loginIp',
      render: (val: string) => (!canViewField('ipInfo') ? '******' : (val ? val.split(',')[0].trim() : '-')),
    },
    {
      title: 'Ngày ĐK',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 155,
      sorter: (a: any, b: any) => dayjs(a.createdAt || 0).valueOf() - dayjs(b.createdAt || 0).valueOf(),
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Ngày ĐN cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 155,
      sorter: (a: any, b: any) => dayjs(a.lastLoginAt || 0).valueOf() - dayjs(b.lastLoginAt || 0).valueOf(),
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
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
            <Space size="middle" direction="vertical">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => showEditDrawer(record)}
                block
              >
                {canUpdateUser ? 'Sửa' : 'Xem'}
              </Button>
              <Button
                size="small"
                type="dashed"
                icon={<MessageOutlined />}
                onClick={() => showMessageModal(record)}
                block
              >
                Nhắn tin
              </Button>
              {canUpdateUser && (
                <>
                  {record.status === 'locked' ? (
                    <Button size="small" icon={<UnlockOutlined />} onClick={() => handleToggleStatus(record, 'active')} block>
                      Mở Khoá
                    </Button>
                  ) : (
                    <Button size="small" danger icon={<LockOutlined />} onClick={() => handleToggleStatus(record, 'locked')} block>
                      Khoá
                    </Button>
                  )}
                  {record.status === 'review' ? (
                    <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleToggleStatus(record, 'active')} block>
                      Bỏ Review
                    </Button>
                  ) : (
                    <Button size="small" style={{ color: '#fa8c16', borderColor: '#fa8c16' }} icon={<EyeOutlined />} onClick={() => handleToggleStatus(record, 'review')} block disabled={record.status === 'locked'}>
                      Review
                    </Button>
                  )}
                </>
              )}
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title style={{ margin: 0 }} level={3}>Quản lý User</Title>
        <Space wrap>
          <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
            Tổng thành viên: <strong>{isServerPaginated ? totalUsers : filteredUsers.length}</strong>
          </Tag>
          <Tag color="green" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
            Hoạt động: <strong>{users.filter(u => (u.status || 'active') === 'active').length}</strong>
          </Tag>
          <Tag color="error" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
            Đã khoá: <strong>{users.filter(u => u.status === 'locked').length}</strong>
          </Tag>
          <Tag color="warning" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
            Review: <strong>{users.filter(u => u.status === 'review').length}</strong>
          </Tag>
        </Space>
      </div>

      <div style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Từ:</span>
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="01/10/2026"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              setCurrentPage(1);
              fetchUsers(1, pageSize, searchText, d, endDate, memberType, statusFilter, balanceFilter);
            }}
            allowClear
            style={{ width: 140 }}
          />
          <span style={{ fontWeight: 600, color: '#333' }}>Đến:</span>
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="10/10/2026"
            value={endDate}
            onChange={(d) => {
              setEndDate(d);
              setCurrentPage(1);
              fetchUsers(1, pageSize, searchText, startDate, d, memberType, statusFilter, balanceFilter);
            }}
            allowClear
            style={{ width: 140 }}
          />
        </Space>

        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Thành viên:</span>
          <Select
            value={memberType}
            onChange={(val) => {
              setMemberType(val);
              setCurrentPage(1);
              fetchUsers(1, pageSize, searchText, startDate, endDate, val, statusFilter, balanceFilter);
            }}
            style={{ width: 155 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'new', label: 'Tk mới đăng ký' },
              { value: 'old', label: 'TK cũ' },
            ]}
          />
        </Space>

        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Trạng thái:</span>
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
              fetchUsers(1, pageSize, searchText, startDate, endDate, memberType, val, balanceFilter);
            }}
            style={{ width: 155 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'locked', label: 'Đã khoá' },
              { value: 'review', label: 'Review' },
            ]}
          />
        </Space>

        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Số dư:</span>
          <Select
            value={balanceFilter}
            onChange={(val) => {
              setBalanceFilter(val);
              setCurrentPage(1);
              fetchUsers(1, pageSize, searchText, startDate, endDate, memberType, statusFilter, val);
            }}
            style={{ width: 145 }}
            options={[
              { value: 'all', label: 'Tất cả số dư' },
              { value: 'has_balance', label: 'Có số dư (> 0đ)' },
              { value: 'zero_balance', label: 'Bằng 0đ' },
            ]}
          />
        </Space>

        <Input.Search
          placeholder="Tìm IP, thiết bị, họ tên, TKNH, CCCD, SĐT..."
          allowClear
          value={searchText}
          onChange={(e) => {
            const val = e.target.value;
            setSearchText(val);
            if (!val) {
              setCurrentPage(1);
              fetchUsers(1, pageSize, '', startDate, endDate, memberType, statusFilter, balanceFilter);
            }
          }}
          onSearch={(val) => {
            setCurrentPage(1);
            fetchUsers(1, pageSize, val, startDate, endDate, memberType, statusFilter, balanceFilter);
          }}
          style={{ width: 280 }}
        />

        {(startDate || endDate || memberType !== 'all' || statusFilter !== 'all' || balanceFilter !== 'all' || searchText) && (
          <Button onClick={handleResetFilters} icon={<ReloadOutlined />}>
            Đặt lại
          </Button>
        )}
      </div>

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 300px)', x: 'max-content' }}
        columns={columns}
        dataSource={isServerPaginated ? users : filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: isServerPaginated ? totalUsers : filteredUsers.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
            if (isServerPaginated) {
              fetchUsers(page, size, searchText, startDate, endDate, memberType, statusFilter, balanceFilter);
            }
          },
          showTotal: (total, range) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
              <span>Tổng số thành viên: <strong style={{ color: '#1677ff', fontSize: 14 }}>{total}</strong></span>
              <span style={{ color: '#888' }}>(Hiển thị {range[0]}-{range[1]})</span>
            </div>
          ),
        }}
      />

      <Drawer
        title="Chi tiết & Chỉnh sửa User"
        width={700}
        onClose={handleCancel}
        open={isDrawerVisible}
        extra={
          <Space>
            <Button onClick={handleCancel}>Đóng</Button>
            {canUpdateUser && <Button type="primary" onClick={handleUpdate}>Lưu thay đổi</Button>}
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Thông tin chung" key="1">
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="Họ tên">
                    <Input disabled={!canViewField('name') || !canUpdateUser} placeholder={!canViewField('name') ? '******' : 'Nhập họ tên'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Số điện thoại">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" disabled={!canViewField('email') || !canUpdateUser} placeholder={!canViewField('email') ? '******' : 'Nhập email'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="emailVerified" label="Đã xác thực Email?" valuePropName="checked">
                    <Switch disabled={!canUpdateUser} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="balance"
                    label="Số dư (VNĐ)"
                    rules={[{ required: true, message: 'Vui lòng nhập số dư!' }]}
                  >
                    <Input type={canViewField('balance') ? 'number' : 'text'} disabled={!canViewField('balance') || !canUpdateUser} placeholder={!canViewField('balance') ? '******' : 'Nhập số dư'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Phân quyền"
                    rules={[{ required: true, message: 'Vui lòng chọn quyền!' }]}
                  >
                    <Select disabled={!canUpdateUser}>
                      <Select.Option value="user">User</Select.Option>
                      <Select.Option value="admin">Admin</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider plain>Thông tin Cá nhân (Xác minh)</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="cccdNumber" label="Số CMND/CCCD">
                    <Input disabled={!canViewField('cccdNumber') || !canUpdateUser} placeholder={!canViewField('cccdNumber') ? '******' : 'Nhập CMND/CCCD...'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isInfoUpdated" label="Đã xác thực thông tin?" valuePropName="checked">
                    <Switch disabled={!canUpdateUser} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="cccdImage" hidden>
                <Input />
              </Form.Item>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Hình ảnh CCCD:</div>
              {!canViewField('cccdImage') ? (
                <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 20 }}>
                  [Bạn không có quyền xem ảnh CCCD]
                </div>
              ) : cccdImageVal ? (
                <div style={{ marginTop: 8, marginBottom: 24, textAlign: 'center' }}>
                  <Image
                    src={cccdImageVal.startsWith('http') ? cccdImageVal : `${api.defaults.baseURL?.replace(/\/api$/, '')}${cccdImageVal.startsWith('/') ? '' : '/'}${cccdImageVal}`}
                    alt="CCCD"
                    style={{ maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #d9d9d9' }}
                  />
                </div>
              ) : (
                <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 20 }}>Chưa có hình ảnh CCCD</div>
              )}

              <Divider plain>Danh sách Tài khoản Ngân Hàng</Divider>
              {!canViewField('banks') ? (
                <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' }}>
                  [Bạn không có quyền xem thông tin tài khoản ngân hàng]
                </div>
              ) : (
                <Form.List name="banks">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: '1px solid #f0f0f0', padding: 12, borderRadius: 8 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            <Form.Item {...restField} name={[name, 'bankName']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu tên NH' }]}>
                              <Input disabled={!canUpdateUser} placeholder="Tên Ngân hàng" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'accountNumber']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu STK' }]}>
                              <Input disabled={!canUpdateUser} placeholder="Số tài khoản" />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'accountName']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu Tên chủ thẻ' }]}>
                              <Input disabled={!canUpdateUser} placeholder="Tên chủ thẻ" />
                            </Form.Item>
                            {canUpdateUser && <Button danger onClick={() => remove(name)}>Xoá</Button>}
                          </div>
                          <Form.Item {...restField} name={[name, 'qrCode']} hidden>
                            <Input />
                          </Form.Item>
                          {banksVal?.[name]?.qrCode ? (
                            <div style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Mã QR Code Ngân hàng:</div>
                              <Image
                                src={banksVal[name].qrCode.startsWith('http') ? banksVal[name].qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${banksVal[name].qrCode.startsWith('/') ? '' : '/'}${banksVal[name].qrCode}`}
                                alt="QR Code"
                                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                              />
                            </div>
                          ) : (
                            <div style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Mã QR Code Ngân hàng:</div>
                              <Form.Item {...restField} name={[name, 'qrCode']} style={{ marginBottom: 0 }}>
                                <Input disabled={!canUpdateUser} placeholder="Chưa có ảnh QR (Nhập Link ảnh)" style={{ width: 250 }} />
                              </Form.Item>
                            </div>
                          )}
                        </div>
                      ))}
                      {canUpdateUser && (
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block>+ Thêm Tài khoản Ngân hàng</Button>
                        </Form.Item>
                      )}
                    </>
                  )}
                </Form.List>
              )}

              <Divider plain>Danh sách Ví USDT</Divider>
              {!canViewField('wallets') ? (
                <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' }}>
                  [Bạn không có quyền xem thông tin ví USDT]
                </div>
              ) : (
                <Form.List name="wallets">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: '1px solid #f0f0f0', padding: 12, borderRadius: 8 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Form.Item {...restField} name={[name, 'network']} style={{ width: 120, marginBottom: 0 }} rules={[{ required: true, message: 'Chọn mạng' }]}>
                              <Select disabled={!canUpdateUser} placeholder="Mạng lưới">
                                <Select.Option value="BEP20">BEP20</Select.Option>
                                <Select.Option value="TRC20">TRC20</Select.Option>
                              </Select>
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'address']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu địa chỉ ví' }]}>
                              <Input disabled={!canUpdateUser} placeholder="Địa chỉ ví USDT" />
                            </Form.Item>
                            {canUpdateUser && <Button danger onClick={() => remove(name)}>Xoá</Button>}
                          </div>
                          <Form.Item {...restField} name={[name, 'qrCode']} hidden>
                            <Input />
                          </Form.Item>
                          {walletsVal?.[name]?.qrCode ? (
                            <div style={{ alignSelf: 'flex-start' }}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Mã QR Code:</div>
                              <Image
                                src={walletsVal[name].qrCode.startsWith('http') ? walletsVal[name].qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${walletsVal[name].qrCode.startsWith('/') ? '' : '/'}${walletsVal[name].qrCode}`}
                                alt="QR Code"
                                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                              />
                            </div>
                          ) : (
                            <div style={{ alignSelf: 'flex-start' }}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Mã QR Code:</div>
                              <Form.Item {...restField} name={[name, 'qrCode']} style={{ marginBottom: 0 }}>
                                <Input disabled={!canUpdateUser} placeholder="Chưa có ảnh QR (Nhập Link ảnh)" style={{ width: 250 }} />
                              </Form.Item>
                            </div>
                          )}
                        </div>
                      ))}
                      {canUpdateUser && (
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block>+ Thêm Ví USDT</Button>
                        </Form.Item>
                      )}
                    </>
                  )}
                </Form.List>
              )}

              {!canViewField('note') ? (
                <div style={{ color: '#999', fontStyle: 'italic', margin: '20px 0', textAlign: 'center' }}>
                  [Không có quyền xem/sửa ghi chú người dùng]
                </div>
              ) : (
                <>
                  <Divider plain>Lịch sử Ghi chú</Divider>
                  {userLogs.length > 0 ? (
                    <List
                      dataSource={userLogs}
                      pagination={{
                        pageSize: 5,
                        size: 'small',
                        align: 'end',
                      }}
                      renderItem={log => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Typography.Text strong>{log.adminName}</Typography.Text>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{new Date(log.createdAt).toLocaleString('vi-VN')}</Typography.Text>
                            </div>
                            <Typography.Text>{log.details}</Typography.Text>
                          </div>
                        </List.Item>
                      )}
                      style={{ marginBottom: 20, padding: '0 10px', background: '#f5f5f5', borderRadius: 8 }}
                    />
                  ) : (
                    <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}>
                      Chưa có lịch sử thao tác
                    </Typography.Text>
                  )}

                  <Form.Item name="note" label="Thêm ghi chú mới">
                    <Input.TextArea rows={3} disabled={!canUpdateUser} placeholder="Nhập nội dung ghi chú (sẽ được lưu lại lịch sử)..." />
                  </Form.Item>
                </>
              )}
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử Mua vé" key="2">
            <Spin spinning={ordersLoading}>
              <Table 
                style={{ flex: 1 }}
                scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
                dataSource={ordersData}
                rowKey="_id"
                pagination={{
                  current: ordersPage,
                  pageSize: ordersPageSize,
                  total: ordersTotal,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onChange: (page, size) => {
                    setOrdersPage(page);
                    setOrdersPageSize(size);
                    if (editingUser) fetchUserOrders(editingUser._id, page, size);
                  },
                  showTotal: (total, range) => (
                    <span style={{ fontSize: 13, color: '#666' }}>
                      Hiển thị {range[0]}-{range[1]} / <strong>{total}</strong> vé
                    </span>
                  )
                }}
                columns={[
                  { 
      title: 'Mã Đơn', 
      dataIndex: 'orderId', 
      key: 'orderId',
      render: (val: string, record: any) => (
        <a onClick={() => {
          setIsDrawerVisible(false);
          window.dispatchEvent(new CustomEvent('changeTab', { detail: 'orders' }));
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openOrder', { detail: { orderId: val, date: record.createdAt } }));
          }, 300);
        }}>{val}</a>
      )
    },
                  { title: 'Game', dataIndex: ['game', 'name'], key: 'game' },
                  { title: 'Tổng tiền', dataIndex: 'totalCost', key: 'cost', render: val => `${val.toLocaleString()}đ` },
                  { title: 'Ngày đặt', dataIndex: 'createdAt', key: 'date', render: val => new Date(val).toLocaleString() },
                ]}
              />
            </Spin>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử Nạp / Rút" key="3">
            <Spin spinning={transactionsLoading}>
              <Table 
                style={{ flex: 1 }}
                scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
                dataSource={transactionsData}
                rowKey="_id"
                pagination={{
                  current: transactionsPage,
                  pageSize: transactionsPageSize,
                  total: transactionsTotal,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onChange: (page, size) => {
                    setTransactionsPage(page);
                    setTransactionsPageSize(size);
                    if (editingUser) fetchUserTransactions(editingUser._id, page, size);
                  },
                  showTotal: (total, range) => (
                    <span style={{ fontSize: 13, color: '#666' }}>
                      Hiển thị {range[0]}-{range[1]} / <strong>{total}</strong> giao dịch
                    </span>
                  )
                }}
                columns={[
                  { 
                    title: 'Mã GD', 
                    dataIndex: 'txId', 
                    key: 'txId', 
                    render: (val: any, record: any) => val ? (
                      <a onClick={() => {
                        if (record.type === 'win') {
                          setIsDrawerVisible(false);
                          window.dispatchEvent(new CustomEvent('openOrder', { detail: { orderId: val, date: record.createdAt } }));
                        } else {
                          setIsDrawerVisible(false);
                          window.dispatchEvent(new CustomEvent('changeTab', { detail: 'wallet' }));
                        }
                      }}>{val}</a>
                    ) : '---' 
                  },
                  { 
                    title: 'Loại', 
                    dataIndex: 'type', 
                    key: 'type', 
                    render: val => {
                      if (val === 'deposit') return <Tag color="green">Nạp tiền</Tag>;
                      if (val === 'withdraw') return <Tag color="red">Rút tiền</Tag>;
                      if (val === 'win') return <Tag color="gold">Thắng cược</Tag>;
                      return <Tag>{val}</Tag>;
                    } 
                  },
                  { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: val => `${val.toLocaleString()}đ` },
                  {
                    title: 'Trạng thái', dataIndex: 'status', key: 'status', render: val => {
                      if (val === 'approved') return <Tag color="green">Thành công</Tag>;
                      if (val === 'rejected') return <Tag color="red">Từ chối</Tag>;
                      return <Tag color="orange">Chờ duyệt</Tag>;
                    }
                  },
                  { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'date', render: val => new Date(val).toLocaleString() },
                ]}
              />
            </Spin>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Thông tin truy cập" key="4">
            {editingUser ? (
              <Descriptions column={1} bordered>
                <Descriptions.Item label="IP Đăng ký">
                  {!canViewField('ipInfo') ? '******' : (editingUser.registerIp || 'Không rõ')}
                </Descriptions.Item>
                <Descriptions.Item label="IP Đăng nhập gần nhất">
                  {!canViewField('ipInfo') ? '******' : (editingUser.loginIp || 'Không rõ')}
                </Descriptions.Item>
                <Descriptions.Item label="Thiết bị Đăng nhập">
                  {editingUser.loginDevice || 'Không rõ'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo tài khoản">
                  {new Date(editingUser.createdAt).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </Tabs.TabPane>

          <Tabs.TabPane tab="Bảo mật" key="5">
            <Divider plain>Cấp lại Mật khẩu Đăng nhập</Divider>
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Input.Password
                  placeholder="Nhập mật khẩu đăng nhập mới..."
                  value={newLoginPassword}
                  disabled={!canUpdateUser}
                  onChange={(e) => setNewLoginPassword(e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Button type="primary" danger disabled={!canUpdateUser} onClick={handleResetLoginPassword}>
                  Đặt lại
                </Button>
              </Col>
            </Row>

            <Divider plain>Cấp lại Mật khẩu Rút tiền</Divider>
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Input.Password
                  placeholder="Nhập mật khẩu rút tiền mới..."
                  value={newWithdrawPassword}
                  disabled={!canUpdateUser}
                  onChange={(e) => setNewWithdrawPassword(e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Button type="primary" danger disabled={!canUpdateUser} onClick={handleResetWithdrawPassword}>
                  Đặt lại
                </Button>
              </Col>
            </Row>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Lịch sử hoạt động" key="6">
            <Spin spinning={activitiesLoading}>
              <Table
                style={{ flex: 1 }}
                scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
                dataSource={activitiesData}
                rowKey="_id"
                pagination={{
                  current: activitiesPage,
                  pageSize: activitiesPageSize,
                  total: activitiesTotal,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onChange: (page, size) => {
                    setActivitiesPage(page);
                    setActivitiesPageSize(size);
                    if (editingUser) fetchUserActivities(editingUser._id, page, size);
                  },
                  showTotal: (total, range) => (
                    <span style={{ fontSize: 13, color: '#666' }}>
                      Hiển thị {range[0]}-{range[1]} / <strong>{total}</strong> hoạt động
                    </span>
                  )
                }}
                columns={[
                  {
                    title: 'Thời gian',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    width: 150,
                    render: (val) => new Date(val).toLocaleString('vi-VN')
                  },
                  {
                    title: 'Người thao tác',
                    dataIndex: 'actor',
                    key: 'actor',
                    width: 120,
                    render: (val, record: any) => val === 'Admin' ? <Tag color="purple">{record.adminName || 'Admin'}</Tag> : <Tag color="green">Khách hàng</Tag>
                  },
                  {
                    title: 'Hành động',
                    dataIndex: 'action',
                    key: 'action',
                    width: 120,
                    render: (val) => <Tag color="blue">{val}</Tag>
                  },
                  {
                    title: 'Chi tiết',
                    dataIndex: 'details',
                    key: 'details',
                  },
                  {
                    title: 'IP',
                    dataIndex: 'ip',
                    key: 'ip',
                    width: 120,
                    render: (val) => val || '-'
                  }
                ]}
              />
            </Spin>
          </Tabs.TabPane>
                  <Tabs.TabPane tab="Biến động số dư" key="balance_history">
            <Table
              dataSource={balanceHistoryData}
              rowKey="_id"
              loading={balanceHistoryLoading}
              pagination={{
                current: balanceHistoryPage,
                total: balanceHistoryTotal,
                pageSize: 20,
                onChange: (page) => {
                  if (editingUser) fetchBalanceHistory(editingUser._id, page);
                }
              }}
              columns={[
                {
                  title: 'Thời gian',
                  dataIndex: 'createdAt',
                  render: (date) => new Date(date).toLocaleString('vi-VN')
                },
                {
                  title: 'Loại',
                  dataIndex: 'type',
                  render: (type) => {
                    switch (type) {
                      case 'deposit': return <Tag color="green">Nạp tiền</Tag>;
                      case 'withdraw': return <Tag color="red">Rút tiền</Tag>;
                      case 'bet': return <Tag color="orange">Cược vé</Tag>;
                      case 'win': return <Tag color="gold">Trúng thưởng</Tag>;
                      case 'refund': return <Tag color="blue">Hoàn tiền</Tag>;
                      case 'admin': return <Tag color="purple">Admin điều chỉnh</Tag>;
                      default: return <Tag>{type}</Tag>;
                    }
                  }
                },
                {
                  title: 'Giao dịch',
                  dataIndex: 'amount',
                  render: (amount, record) => (
                    <span style={{ color: ['deposit', 'win', 'refund', 'admin'].includes(record.type) && record.balanceAfter > record.balanceBefore ? 'green' : 'red', fontWeight: 'bold' }}>
                      {['deposit', 'win', 'refund'].includes(record.type) || (record.type === 'admin' && record.balanceAfter > record.balanceBefore) ? '+' : '-'}{amount?.toLocaleString()} đ
                    </span>
                  )
                },
                {
                  title: 'Số dư trước',
                  dataIndex: 'balanceBefore',
                  render: (amount) => `${amount?.toLocaleString() || 0} đ`
                },
                {
                  title: 'Số dư sau',
                  dataIndex: 'balanceAfter',
                  render: (amount) => `${amount?.toLocaleString() || 0} đ`
                },
                {
                  title: 'Ghi chú',
                  dataIndex: 'description'
                }
              ]}
              size="small"
            />
          </Tabs.TabPane>
</Tabs>
      </Drawer>

      <Modal
        title={`Gửi tin nhắn tới: ${selectedUserForMsg?.name || ''}`}
        open={msgModalVisible}
        onCancel={() => setMsgModalVisible(false)}
        onOk={() => msgForm.submit()}
        confirmLoading={sendingMsg}
        okText="Gửi"
        cancelText="Hủy"
      >
        <Form
          form={msgForm}
          layout="vertical"
          onFinish={handleSendMessage}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Tiêu đề tin nhắn..." />
          </Form.Item>

          <Form.Item
            name="body"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập nội dung tin nhắn gửi tới khách hàng..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
