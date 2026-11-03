import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Image, Input, InputNumber, Modal, Popover, Select, Space, Switch, Table, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const { Title } = Typography;

export default function BannerManagement() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
  };

  const filteredBanners = useMemo(() => {
    return banners.filter((b: any) => {
      if (statusFilter === 'active' && !b.isActive) return false;
      if (statusFilter === 'inactive' && b.isActive) return false;
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesUrl = (b.imageUrl || '').toLowerCase().includes(query);
        const matchesOrder = String(b.order ?? '').includes(query);
        if (!matchesUrl && !matchesOrder) return false;
      }
      return true;
    });
  }, [banners, statusFilter, searchText]);

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

  const columns: any = [
    {
      fixed: 'left',
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
      sorter: (a: any, b: any) => (a.order || 0) - (b.order || 0),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      filters: [
        { text: 'Đang bật', value: true },
        { text: 'Đã ẩn', value: false },
      ],
      onFilter: (value: any, record: any) => record.isActive === value,
      render: (isActive: boolean) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? 'Đang bật' : 'Đã ẩn'}
        </span>
      )
    },
    {
      title: 'Hành động',
      fixed: 'right',
      key: 'actions',
      render: (_: any, record: any) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} block>Sửa</Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBanner(record._id)} block>Xóa</Button>
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ margin: 0 }} level={3} >Quản lý Banner</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm Banner
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <Input.Search
          placeholder="Tìm URL ảnh, thứ tự..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />

        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Trạng thái:</span>
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang bật' },
              { value: 'inactive', label: 'Đã ẩn' },
            ]}
          />
        </Space>

        {(statusFilter !== 'all' || searchText) && (
          <Button onClick={handleResetFilters} icon={<ReloadOutlined />}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
        columns={columns}
        dataSource={filteredBanners}
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
