import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Drawer, Tabs, Form, Input, Select, message, Spin, Descriptions, Row, Col, Switch, Divider, Image, Modal, List, Popover } from 'antd';
import { EditOutlined, LockOutlined, UnlockOutlined, EyeOutlined, EyeInvisibleOutlined, MessageOutlined, MoreOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  console.log("===users===", users)
  const [loading, setLoading] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ orders: [], transactions: [] });
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [userActionLogs, setUserActionLogs] = useState<any[]>([]);

  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [msgForm] = Form.useForm();
  const [selectedUserForMsg, setSelectedUserForMsg] = useState<any>(null);
  const [sendingMsg, setSendingMsg] = useState(false);

  const cccdImageVal = Form.useWatch('cccdImage', form);
  const walletsVal = Form.useWatch('wallets', form);
  const banksVal = Form.useWatch('banks', form);

  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newWithdrawPassword, setNewWithdrawPassword] = useState('');

  const fetchUsers = async (search: string = '') => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { search } });
      setUsers(res.data);
    } catch (err) {
      message.error('Lỗi khi tải danh sách user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setHistoryLoading(true);
    try {
      // Log the view action
      await api.post('/logs/view-user', { targetUserId: user._id }).catch(err => console.error('Failed to log view action', err));

      const res = await api.get(`/users/${user._id}/history`);
      setHistoryData(res.data);
      const logRes = await api.get(`/logs/user/${user._id}`);
      setUserLogs(logRes.data);

      const actionLogRes = await api.get(`/logs/user-actions/${user._id}`);
      setUserActionLogs(actionLogRes.data);
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
      fetchUsers();
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
      fetchUsers();
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
      render: (text: string) => text || '-',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Số dư (đ)',
      dataIndex: 'balance',
      key: 'balance',
      render: (val: number) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{val?.toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Quyền',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'purple' : 'green'}>{role.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Tổng nạp',
      dataIndex: 'totalDeposit',
      key: 'totalDeposit',
      render: (val: number) => <span style={{ color: '#1890ff' }}>{val ? val.toLocaleString('vi-VN') : 0} đ</span>,
    },
    {
      title: 'Tổng rút',
      dataIndex: 'totalWithdraw',
      key: 'totalWithdraw',
      render: (val: number) => <span style={{ color: '#faad14' }}>{val ? val.toLocaleString('vi-VN') : 0} đ</span>,
    },
    {
      title: 'IP Đăng ký',
      dataIndex: 'registerIp',
      key: 'registerIp',
      render: (val: string) => val ? val.split(',')[0].trim() : '-',
    },
    {
      title: 'IP Đăng nhập',
      dataIndex: 'loginIp',
      key: 'loginIp',
      render: (val: string) => val ? val.split(',')[0].trim() : '-',
    },
    {
      title: 'Ngày ĐN cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
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
                Sửa
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
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ margin: 0 }} level={3} >Quản lý User</Title>
        <Input.Search
          placeholder="Tìm theo IP, thiết bị, họ tên, TKNH, CCCD..."
          allowClear
          onSearch={(value) => fetchUsers(value)}
          style={{ width: 400 }}
        />
      </div>
      <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={loading}

      />

      <Drawer
        title="Chi tiết & Chỉnh sửa User"
        width={700}
        onClose={handleCancel}
        open={isDrawerVisible}
        extra={
          <Space>
            <Button onClick={handleCancel}>Huỷ</Button>
            <Button type="primary" onClick={handleUpdate}>Lưu thay đổi</Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Thông tin chung" key="1">
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="Họ tên">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Số điện thoại">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="emailVerified" label="Đã xác thực Email?" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="balance"
                    label="Số dư (VNĐ)"
                    rules={[{ required: true, message: 'Vui lòng nhập số dư!' }]}
                  >
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Phân quyền"
                    rules={[{ required: true, message: 'Vui lòng chọn quyền!' }]}
                  >
                    <Select>
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
                    <Input placeholder="Nhập CMND/CCCD..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isInfoUpdated" label="Đã xác thực thông tin?" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="cccdImage" hidden>
                <Input />
              </Form.Item>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>Hình ảnh CCCD:</div>
              {cccdImageVal && (
                <div style={{ marginTop: 8, marginBottom: 24, textAlign: 'center' }}>
                  <Image
                    src={cccdImageVal.startsWith('http') ? cccdImageVal : `${api.defaults.baseURL?.replace(/\/api$/, '')}${cccdImageVal.startsWith('/') ? '' : '/'}${cccdImageVal}`}
                    alt="CCCD"
                    style={{ maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #d9d9d9' }}
                  />
                </div>
              )}

              <Divider plain>Danh sách Tài khoản Ngân Hàng</Divider>
              <Form.List name="banks">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: '1px solid #f0f0f0', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <Form.Item {...restField} name={[name, 'bankName']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu tên NH' }]}>
                            <Input placeholder="Tên Ngân hàng" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'accountNumber']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu STK' }]}>
                            <Input placeholder="Số tài khoản" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'accountName']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu Tên chủ thẻ' }]}>
                            <Input placeholder="Tên chủ thẻ" />
                          </Form.Item>
                          <Button danger onClick={() => remove(name)}>Xoá</Button>
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
                              <Input placeholder="Chưa có ảnh QR (Nhập Link ảnh)" style={{ width: 250 }} />
                            </Form.Item>
                          </div>
                        )}
                      </div>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block>+ Thêm Tài khoản Ngân hàng</Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Divider plain>Danh sách Ví USDT</Divider>
              <Form.List name="wallets">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, border: '1px solid #f0f0f0', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Form.Item {...restField} name={[name, 'network']} style={{ width: 120, marginBottom: 0 }} rules={[{ required: true, message: 'Chọn mạng' }]}>
                            <Select placeholder="Mạng lưới">
                              <Select.Option value="BEP20">BEP20</Select.Option>
                              <Select.Option value="TRC20">TRC20</Select.Option>
                            </Select>
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'address']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Thiếu địa chỉ ví' }]}>
                            <Input placeholder="Địa chỉ ví USDT" />
                          </Form.Item>
                          <Button danger onClick={() => remove(name)}>Xoá</Button>
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
                              <Input placeholder="Chưa có ảnh QR (Nhập Link ảnh)" style={{ width: 250 }} />
                            </Form.Item>
                          </div>
                        )}
                      </div>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block>+ Thêm Ví USDT</Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Divider plain>Lịch sử Ghi chú & Cập nhật</Divider>
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
                <Input.TextArea rows={3} placeholder="Nhập nội dung ghi chú (sẽ được lưu lại lịch sử)..." />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử Mua vé" key="2">
            <Spin spinning={historyLoading}>
              <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
                dataSource={historyData.orders}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'Mã Đơn', dataIndex: 'orderId', key: 'orderId' },
                  { title: 'Game', dataIndex: ['game', 'name'], key: 'game' },
                  { title: 'Tổng tiền', dataIndex: 'totalCost', key: 'cost', render: val => `${val.toLocaleString()}đ` },
                  { title: 'Ngày đặt', dataIndex: 'createdAt', key: 'date', render: val => new Date(val).toLocaleString() },
                ]}
              />
            </Spin>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử Nạp / Rút" key="3">
            <Spin spinning={historyLoading}>
              <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
                dataSource={historyData.transactions}
                rowKey="_id"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'Mã GD', dataIndex: 'txId', key: 'txId', render: val => val || '---' },
                  { title: 'Loại', dataIndex: 'type', key: 'type', render: val => val === 'deposit' ? <Tag color="green">Nạp tiền</Tag> : <Tag color="red">Rút tiền</Tag> },
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
                  {editingUser.registerIp || 'Không rõ'}
                </Descriptions.Item>
                <Descriptions.Item label="IP Đăng nhập gần nhất">
                  {editingUser.loginIp || 'Không rõ'}
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
                  onChange={(e) => setNewLoginPassword(e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Button type="primary" danger onClick={handleResetLoginPassword}>
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
                  onChange={(e) => setNewWithdrawPassword(e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Button type="primary" danger onClick={handleResetWithdrawPassword}>
                  Đặt lại
                </Button>
              </Col>
            </Row>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Lịch sử hoạt động" key="6">
            <Table
              dataSource={userActionLogs}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: 'Thời gian',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  width: 150,
                  render: (val) => new Date(val).toLocaleString('vi-VN')
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
    </>
  );
}
