import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Table, Typography, message, Image } from 'antd';
import { useEffect, useState } from 'react';
import api from '../services/api';

const { Title } = Typography;

export default function BannerManagement() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);

  const [form] = Form.useForm();

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.get('/banners');
      setBanners(res.data);
    } catch (error) {
      message.error('Lỗi lấy dữ liệu banner');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner: any = null) => {
    setEditingBanner(banner);
    if (banner) {
      form.setFieldsValue(banner);
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, order: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (values: any) => {
    try {
      if (editingBanner) {
        await api.put(`/banners/${editingBanner._id}`, values);
        message.success('Cập nhật banner thành công');
      } else {
        await api.post('/banners', values);
        message.success('Tạo banner thành công');
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (error) {
      message.error('Lỗi lưu banner');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa banner này?')) return;
    try {
      await api.delete(`/banners/${id}`);
      message.success('Đã xóa banner');
      fetchBanners();
    } catch (error) {
      message.error('Lỗi xóa banner');
    }
  };

  const columns = [
    {
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (url: string) => (
        <Image src={url} alt="banner" style={{ width: 200, height: 100, objectFit: 'cover', borderRadius: 8 }} fallback="https://via.placeholder.com/200x100?text=Lỗi+ảnh" />
      )
    },
    {
      title: 'Thứ tự',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? 'Đang bật' : 'Đã ẩn'}
        </span>
      )
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>Sửa</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBanner(record._id)}>Xóa</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý Banner</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm Banner
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={banners} 
        rowKey="_id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingBanner ? "Sửa Banner" : "Thêm Banner mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveBanner}
        >
          <Form.Item
            name="imageUrl"
            label="Đường dẫn hình ảnh (URL)"
            rules={[{ required: true, message: 'Vui lòng nhập đường dẫn hình ảnh' }]}
          >
            <Input placeholder="https://domain.com/image.png" />
          </Form.Item>

          <Form.Item
            name="order"
            label="Thứ tự hiển thị"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Ẩn" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              Lưu Banner
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
