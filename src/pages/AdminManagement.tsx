import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Tag, Switch, Card, Row, Col, Checkbox, message, Typography, Tabs, Popconfirm, Tooltip } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const { Title, Text } = Typography;

interface TabPermissionConfig {
  key: string;
  name: string;
  hasCreate?: boolean;
  hasUpdate?: boolean;
  hasDelete?: boolean;
}

const TAB_CONFIGS: TabPermissionConfig[] = [
  { key: 'wallet', name: 'Quản lý Nạp / Rút', hasUpdate: true },
  { key: 'users', name: 'Quản lý User', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'orders', name: 'Quản lý Đặt vé', hasUpdate: true },
  { key: 'tickets', name: 'Quản lý vé Kiến Thiết', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'provinces', name: 'Cấu hình Tỉnh/Đài', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'games', name: 'Quản lý Game', hasUpdate: true },
  { key: 'draws', name: 'Quản lý Kỳ quay', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'banners', name: 'Quản lý Banner', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'settings', name: 'Cấu hình chung', hasUpdate: true },
  { key: 'adminLogs', name: 'Nhật ký Hoạt động' },
  { key: 'notifications', name: 'Thông báo', hasCreate: true, hasDelete: true },
  { key: 'guides', name: 'Hướng dẫn', hasCreate: true, hasUpdate: true, hasDelete: true },
  { key: 'terms', name: 'Điều khoản hoạt động', hasUpdate: true },
];

const USER_FIELD_CONFIGS = [
  { key: 'name', label: 'Họ và tên khách hàng' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'balance', label: 'Số dư ví & Tiền thưởng' },
  { key: 'email', label: 'Địa chỉ Email' },
  { key: 'cccdNumber', label: 'Số CMND / CCCD' },
  { key: 'cccdImage', label: 'Hình ảnh chụp CCCD' },
  { key: 'address', label: 'Địa chỉ nơi ở' },
  { key: 'banks', label: 'Thông tin Ngân hàng & QR Code' },
  { key: 'wallets', label: 'Thông tin Ví Crypto / USDT' },
  { key: 'note', label: 'Ghi chú nội bộ' },
  { key: 'totalDepositWithdraw', label: 'Tổng nạp & Tổng rút' },
  { key: 'ipInfo', label: 'Địa chỉ IP Đăng ký & Đăng nhập' },
];

export default function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // State for permissions matrix
  const [tabPermissions, setTabPermissions] = useState<Record<string, { view?: boolean; create?: boolean; update?: boolean; delete?: boolean }>>({});
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, boolean>>({});

  const { isMasterAdmin } = useAuthStore();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/accounts');
      setAdmins(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi tải danh sách admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openCreateModal = () => {
    setEditingAdmin(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      phone: '',
      password: '',
      status: 'active',
    });

    // Default permissions: all unchecked
    const defaultTabs: Record<string, any> = {};
    TAB_CONFIGS.forEach(t => {
      defaultTabs[t.key] = { view: false, create: false, update: false, delete: false };
    });
    setTabPermissions(defaultTabs);

    const defaultFields: Record<string, boolean> = {};
    USER_FIELD_CONFIGS.forEach(f => {
      defaultFields[f.key] = false;
    });
    setFieldPermissions(defaultFields);

    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setEditingAdmin(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      status: record.status || 'active',
      password: '',
    });

    // Populate existing permissions
    const existingTabs = record.permissions?.tabs || {};
    const populatedTabs: Record<string, any> = {};
    TAB_CONFIGS.forEach(t => {
      populatedTabs[t.key] = {
        view: !!existingTabs[t.key]?.view,
        create: !!existingTabs[t.key]?.create,
        update: !!existingTabs[t.key]?.update,
        delete: !!existingTabs[t.key]?.delete,
      };
    });
    setTabPermissions(populatedTabs);

    const existingFields = record.permissions?.userFields || {};
    const populatedFields: Record<string, boolean> = {};
    USER_FIELD_CONFIGS.forEach(f => {
      populatedFields[f.key] = !!existingFields[f.key];
    });
    setFieldPermissions(populatedFields);

    setIsModalOpen(true);
  };

  const handleSelectAllTabs = (selectAll: boolean) => {
    const updated: Record<string, any> = {};
    TAB_CONFIGS.forEach(t => {
      updated[t.key] = {
        view: selectAll,
        create: t.hasCreate ? selectAll : false,
        update: t.hasUpdate ? selectAll : false,
        delete: t.hasDelete ? selectAll : false,
      };
    });
    setTabPermissions(updated);
  };

  const handleSelectAllFields = (selectAll: boolean) => {
    const updated: Record<string, boolean> = {};
    USER_FIELD_CONFIGS.forEach(f => {
      updated[f.key] = selectAll;
    });
    setFieldPermissions(updated);
  };

  const handleTabPermChange = (tabKey: string, action: 'view' | 'create' | 'update' | 'delete', checked: boolean) => {
    setTabPermissions(prev => {
      const current = prev[tabKey] || {};
      const updated = { ...current, [action]: checked };
      // If unchecked view, optionally uncheck actions
      if (action === 'view' && !checked) {
        updated.create = false;
        updated.update = false;
        updated.delete = false;
      }
      // If checked an action, ensure view is checked
      if (action !== 'view' && checked) {
        updated.view = true;
      }
      return { ...prev, [tabKey]: updated };
    });
  };

  const handleFieldPermChange = (fieldKey: string, checked: boolean) => {
    setFieldPermissions(prev => ({ ...prev, [fieldKey]: checked }));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        name: values.name,
        phone: values.phone,
        password: values.password || undefined,
        status: values.status,
        permissions: {
          tabs: tabPermissions,
          userFields: fieldPermissions,
        }
      };

      if (editingAdmin) {
        await api.put(`/admin/accounts/${editingAdmin._id}`, payload);
        message.success('Cập nhật tài khoản admin thành công');
      } else {
        await api.post('/admin/accounts', payload);
        message.success('Tạo tài khoản admin mới thành công');
      }

      setIsModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      if (err.errorFields) return; // Form validation error
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/accounts/${id}`);
      message.success('Đã xoá tài khoản admin');
      fetchAdmins();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi xoá admin');
    }
  };

  const columns = [
    {
      title: 'Họ và tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <strong>{name}</strong>
          {record.isMasterAdmin && (
            <Tag color="red" icon={<SafetyCertificateOutlined />}>Master Admin</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => <Text code>{phone}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Hoạt động' : 'Đã khoá'}
        </Tag>
      ),
    },
    {
      title: 'Quyền hạn',
      key: 'permissionsSummary',
      render: (_: any, record: any) => {
        if (record.isMasterAdmin) {
          return <Tag color="gold">Toàn quyền hệ thống</Tag>;
        }
        const tabs = record.permissions?.tabs || {};
        const allowedTabsCount = Object.values(tabs).filter((t: any) => t?.view).length;
        const fields = record.permissions?.userFields || {};
        const allowedFieldsCount = Object.values(fields).filter(Boolean).length;

        return (
          <Space direction="vertical" size={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Xem {allowedTabsCount}/{TAB_CONFIGS.length} tab sidebar
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Xem {allowedFieldsCount}/{USER_FIELD_CONFIGS.length} trường user
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (val: string) => val ? new Date(val).toLocaleString('vi-VN') : '-',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => val ? new Date(val).toLocaleDateString('vi-VN') : '-',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Chỉnh sửa quyền & thông tin">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Sửa
            </Button>
          </Tooltip>

          {!record.isMasterAdmin && (
            <Popconfirm
              title="Xoá tài khoản admin"
              description={`Bạn có chắc chắn muốn xoá admin "${record.name}"?`}
              onConfirm={() => handleDelete(record._id)}
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                Xoá
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý Admin & Phân quyền</Title>
          <Text type="secondary">Tạo tài khoản quản trị viên và phân quyền chi tiết cho từng chức năng</Text>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={openCreateModal}
          size="large"
        >
          Thêm Admin mới
        </Button>
      </div>

      <Card bordered={false} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} bodyStyle={{ flex: 1, padding: 0, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={admins}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            {editingAdmin ? `Chỉnh sửa Admin: ${editingAdmin.name}` : 'Tạo mới Quản trị viên (Sub-Admin)'}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingAdmin ? 'Lưu thay đổi' : 'Tạo Admin'}
        cancelText="Huỷ"
        width={850}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} autoComplete="off">
          {/* Dummy hidden inputs to prevent browser credential managers from autofilling */}
          <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: 'Thông tin tài khoản',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label="Họ và tên"
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                      <Input placeholder="Ví dụ: Nguyễn Văn A" autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại đăng nhập"
                      rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                      <Input placeholder="Ví dụ: 0912345678" disabled={!!editingAdmin} autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="password"
                      label={editingAdmin ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu đăng nhập'}
                      rules={editingAdmin ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu (tối thiểu 6 ký tự)', min: 6 }]}
                    >
                      <Input.Password placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="status"
                      label="Trạng thái tài khoản"
                      valuePropName="value"
                    >
                      <Switch
                        checkedChildren="Hoạt động"
                        unCheckedChildren="Khoá"
                        checked={form.getFieldValue('status') === 'active'}
                        onChange={(checked) => form.setFieldsValue({ status: checked ? 'active' : 'locked' })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: '2',
              label: 'Quyền Sidebar & Thao tác',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text type="secondary">Cấp quyền truy cập từng Tab và các quyền Thêm / Sửa / Xoá tương ứng:</Text>
                    <Space>
                      <Button size="small" onClick={() => handleSelectAllTabs(true)}>Chọn tất cả</Button>
                      <Button size="small" onClick={() => handleSelectAllTabs(false)}>Bỏ chọn tất cả</Button>
                    </Space>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <th style={{ padding: '10px 12px' }}>Chức năng (Sidebar)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: 90 }}>Xem</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: 90 }}>Thêm</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: 90 }}>Sửa / Duyệt</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: 90 }}>Xoá / Huỷ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TAB_CONFIGS.map(tab => {
                        const perm = tabPermissions[tab.key] || {};
                        return (
                          <tr key={tab.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{tab.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <Checkbox
                                checked={!!perm.view}
                                onChange={(e) => handleTabPermChange(tab.key, 'view', e.target.checked)}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {tab.hasCreate ? (
                                <Checkbox
                                  checked={!!perm.create}
                                  onChange={(e) => handleTabPermChange(tab.key, 'create', e.target.checked)}
                                />
                              ) : (
                                <span style={{ color: '#ccc' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {tab.hasUpdate ? (
                                <Checkbox
                                  checked={!!perm.update}
                                  onChange={(e) => handleTabPermChange(tab.key, 'update', e.target.checked)}
                                />
                              ) : (
                                <span style={{ color: '#ccc' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {tab.hasDelete ? (
                                <Checkbox
                                  checked={!!perm.delete}
                                  onChange={(e) => handleTabPermChange(tab.key, 'delete', e.target.checked)}
                                />
                              ) : (
                                <span style={{ color: '#ccc' }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            },
            {
              key: '3',
              label: 'Quyền xem Thông tin User (Từng field)',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Text strong>Quyền xem chi tiết thông tin tài khoản khách hàng:</Text>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Trường nào không được tích chọn sẽ bị ẩn/che giấu sao (******) khi admin này xem danh sách hoặc chi tiết User.
                      </div>
                    </div>
                    <Space>
                      <Button size="small" onClick={() => handleSelectAllFields(true)}>Chọn tất cả</Button>
                      <Button size="small" onClick={() => handleSelectAllFields(false)}>Bỏ chọn tất cả</Button>
                    </Space>
                  </div>

                  <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                    {USER_FIELD_CONFIGS.map(f => (
                      <Col span={12} key={f.key}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => handleFieldPermChange(f.key, !fieldPermissions[f.key])}
                          style={{
                            cursor: 'pointer',
                            borderColor: fieldPermissions[f.key] ? '#1890ff' : '#d9d9d9',
                            backgroundColor: fieldPermissions[f.key] ? '#f0f7ff' : '#fff',
                          }}
                        >
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 500 }}>{f.label}</span>
                            <Checkbox
                              checked={!!fieldPermissions[f.key]}
                              onChange={(e) => handleFieldPermChange(f.key, e.target.checked)}
                            />
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )
            }
          ]} />
        </Form>
      </Modal>
    </div>
  );
}
