import { useState, useEffect } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

interface Province {
  _id: string;
  provinceId: string;
  name: string;
  code: string;
  region: 'MB' | 'MT' | 'MN';
  drawDays: number[];
}

const DAYS_OF_WEEK = [
  { label: 'Chủ Nhật', value: 0 },
  { label: 'Thứ Hai', value: 1 },
  { label: 'Thứ Ba', value: 2 },
  { label: 'Thứ Tư', value: 3 },
  { label: 'Thứ Năm', value: 4 },
  { label: 'Thứ Sáu', value: 5 },
  { label: 'Thứ Bảy', value: 6 }
];

export default function ProvinceManagement() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/provinces/admin');
      setProvinces(res.data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      message.error('Lỗi khi tải danh sách Tỉnh/Đài');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/provinces/admin/${editingId}`, values);
        message.success('Cập nhật thành công');
      } else {
        await api.post('/provinces/admin', values);
        message.success('Thêm Tỉnh/Đài thành công');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
      fetchProvinces();
    } catch (error: any) {
      if (error.errorFields) return; // Validation error
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleEdit = (record: Province) => {
    setEditingId(record._id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/provinces/admin/${id}`);
      message.success('Xoá thành công');
      fetchProvinces();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xoá');
    }
  };

  const handleSeed = async () => {
    Modal.confirm({
      title: 'Khởi tạo dữ liệu chuẩn',
      content: 'Thao tác này sẽ xoá toàn bộ cấu hình Tỉnh/Đài hiện tại và thay bằng lịch chuẩn toàn quốc. Bạn có chắc chắn?',
      onOk: async () => {
        try {
          setLoading(true);
          const res = await api.post('/provinces/admin/seed');
          message.success(res.data.message);
          fetchProvinces();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Lỗi khi khởi tạo');
          setLoading(false);
        }
      }
    });
  };

  const columns = [
    {
      title: 'Khu vực',
      dataIndex: 'region',
      key: 'region',
      render: (text: string) => (
        <Tag color={text === 'MB' ? 'red' : text === 'MT' ? 'blue' : 'green'}>{text}</Tag>
      ),
      filters: [
        { text: 'Miền Bắc', value: 'MB' },
        { text: 'Miền Trung', value: 'MT' },
        { text: 'Miền Nam', value: 'MN' },
      ],
      onFilter: (value: any, record: Province) => record.region === value,
    },
    {
      title: 'Mã Tỉnh',
      dataIndex: 'provinceId',
      key: 'provinceId',
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: 'Tên Tỉnh/Đài',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Tên viết tắt',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Lịch quay',
      dataIndex: 'drawDays',
      key: 'drawDays',
      render: (days: number[]) => (
        <Space wrap>
          {days.sort().map(d => (
            <Tag key={d} color="purple">{DAYS_OF_WEEK.find(dw => dw.value === d)?.label}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: Province) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1890ff' }} />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record._id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4}>Cấu hình Tỉnh/Đài Xổ Số Kiến Thiết</Title>
        <Space>
          <Button 
            type="dashed" 
            icon={<SyncOutlined />} 
            onClick={handleSeed}
          >
            Khởi tạo dữ liệu chuẩn
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Thêm Tỉnh/Đài
          </Button>
        </Space>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={provinces} 
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingId ? "Sửa thông tin" : "Thêm Tỉnh/Đài"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="provinceId" 
            label="Mã Tỉnh (Unique, VD: TG, MB)" 
            rules={[{ required: true, message: 'Vui lòng nhập mã tỉnh' }]}
          >
            <Input disabled={!!editingId} />
          </Form.Item>
          <Form.Item 
            name="name" 
            label="Tên Tỉnh/Đài (VD: Tiền Giang)" 
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="code" 
            label="Tên viết tắt (VD: T.Giang)" 
            rules={[{ required: true, message: 'Vui lòng nhập tên viết tắt' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="region" 
            label="Khu vực" 
            rules={[{ required: true }]}
            initialValue="MN"
          >
            <Select>
              <Option value="MB">Miền Bắc</Option>
              <Option value="MT">Miền Trung</Option>
              <Option value="MN">Miền Nam</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            name="drawDays" 
            label="Lịch quay (Chọn các ngày trong tuần)" 
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 ngày' }]}
          >
            <Select mode="multiple" placeholder="Chọn ngày">
              {DAYS_OF_WEEK.map(d => (
                <Option key={d.value} value={d.value}>{d.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
