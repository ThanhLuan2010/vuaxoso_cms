import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Drawer, Tabs, Form, Input, Select, message, Popconfirm, Spin, Descriptions, Row, Col, Switch, Divider, Image } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ orders: [], transactions: [] });
  const cccdImageVal = Form.useWatch('cccdImage', form);

  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newWithdrawPassword, setNewWithdrawPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
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
      const res = await api.get(`/users/${user._id}/history`);
      setHistoryData(res.data);
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
      fetchUsers();
    } catch (error) {
      if (error && (error as any).errorFields) {
        // Validation error
        return;
      }
      message.error('Lỗi khi cập nhật user');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('Đã xoá user');
      fetchUsers();
    } catch (error) {
      message.error('Lỗi khi xoá user');
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

  const columns = [
    {
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
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => showEditDrawer(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xoá user này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button danger icon={<DeleteOutlined />}>
              Xoá
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>Quản lý User</Title>
      <Table
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
              <Form.Item name="cccdImage" label="Link hình ảnh CCCD (URL)">
                <Input placeholder="Nhập đường link ảnh CCCD..." />
              </Form.Item>
              {cccdImageVal && (
                <div style={{ marginTop: 8, marginBottom: 24, textAlign: 'center' }}>
                  <Image
                    src={cccdImageVal.startsWith('/') ? `https://api-vuaxoso.vipmarts.com${cccdImageVal}` : cccdImageVal}
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
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
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
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
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
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block>+ Thêm Ví USDT</Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Divider plain>Ghi chú nội bộ</Divider>
              <Form.Item name="note">
                <Input.TextArea rows={4} placeholder="Ghi chú thêm về khách hàng này..." />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Lịch sử Mua vé" key="2">
            <Spin spinning={historyLoading}>
              <Table
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
              <Table
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
        </Tabs>
      </Drawer>
    </>
  );
}
