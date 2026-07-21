import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

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

  const showEditModal = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      phone: user.phone,
      balance: user.balance,
      role: user.role,
    });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      await api.put(`/users/${editingUser._id}`, values);
      message.success('Cập nhật user thành công');
      setIsModalVisible(false);
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
            onClick={() => showEditModal(record)}
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

      <Modal
        title="Chỉnh sửa User"
        open={isModalVisible}
        onOk={handleUpdate}
        onCancel={handleCancel}
        okText="Lưu"
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Họ tên">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input disabled />
          </Form.Item>
          <Form.Item 
            name="balance" 
            label="Số dư (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số dư!' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item 
            name="role" 
            label="Phân quyền"
            rules={[{ required: true, message: 'Vui lòng chọn quyền!' }]}
          >
            <Select>
              <Option value="user">User</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
