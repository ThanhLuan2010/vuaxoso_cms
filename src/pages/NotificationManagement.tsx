import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Form, Input, message, Modal, Popconfirm, Popover } from 'antd';
import { DeleteOutlined, PlusOutlined, MoreOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function NotificationManagement() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchNotifications = async (search = '') => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications/admin', { params: { search } });
      setNotifications(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      setSubmitting(true);
      await api.post('/notifications/admin', values);
      message.success('Tạo thông báo thành công');
      setModalVisible(false);
      form.resetFields();
      fetchNotifications();
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tạo thông báo');
    } finally {
      setSubmitting(false);
    }
  };

  
  const handleToggleVisibility = async (id: string) => {
    try {
      await api.put(`/notifications/admin/${id}/toggle-visibility`);
      message.success('Cập nhật trạng thái hiển thị thành công');
      fetchNotifications();
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi cập nhật trạng thái hiển thị');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/admin/${id}`);
      message.success('Xóa thông báo thành công');
      fetchNotifications();
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi xóa thông báo');
    }
  };

  const columns: any = [
    {
      fixed: 'left',
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: 'Nội dung',
      dataIndex: 'body',
      key: 'body',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: 'Người nhận',
      dataIndex: 'user',
      key: 'user',
      width: 150,
      render: (val: any) => val ? (val.name || val.phone || 'Cá nhân') : 'Tất cả (Promo)',
    },

    {
      title: 'Người gửi',
      dataIndex: 'sender',
      key: 'sender',
      width: 150,
      render: (val: any) => val?.name || 'Hệ thống',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Hành động',
      fixed: 'right',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small" style={{ width: 160 }}>
              <Button icon={<EyeOutlined />} block onClick={() => {
                Modal.info({
                  title: record.title,
                  content: (
                    <div>
                      <p><strong>Nội dung:</strong> {record.body}</p>
                      <p><strong>Loại:</strong> {record.type}</p>
                      <p><strong>Người nhận:</strong> {record.user ? (record.user.name || record.user.phone) : 'Tất cả'}</p>
                    </div>
                  ),
                });
              }}>
                Xem
              </Button>
              <Button icon={record.isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />} block onClick={() => handleToggleVisibility(record._id)}>
                {record.isHidden ? 'Hiện (trên app)' : 'Ẩn (trên app)'}
              </Button>
              <Popconfirm
                title="Xóa thông báo"
                description="Bạn có chắc muốn xóa thông báo này?"
                onConfirm={() => handleDelete(record._id)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button danger icon={<DeleteOutlined />} block>Xóa</Button>
              </Popconfirm>
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
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ marginTop: 0, marginBottom: 16 }} level={4} >Quản lý Thông báo</Title>
        <Space>
          <Input.Search
            placeholder="Tìm theo Tiêu đề, Nội dung..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => fetchNotifications(value)}
            style={{ width: 300 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Thêm thông báo (Promo)
          </Button>
        </Space>
      </div>

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
        columns={columns}
        dataSource={notifications}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Tạo Thông báo Khuyến mãi (Gửi tới tất cả User)"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Tạo mới"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Ví dụ: LOA LOA... KHUYẾN MÃI LỚN" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập nội dung chi tiết..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
