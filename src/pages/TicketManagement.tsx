import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input, Select, InputNumber, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

interface Ticket {
  _id: string;
  number: string;
  price: number;
  ticketType: string;
  multiplier?: number;
  provinceId: string;
  drawDate: string;
  isSold: boolean;
  createdAt: string;
}

interface ProvinceData {
  _id: string;
  provinceId: string;
  name: string;
  region: string;
}

export default function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const [provincesList, setProvincesList] = useState<ProvinceData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('MB');
  const [selectedProvince, setSelectedProvince] = useState<string>('MB');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateOptions, setDateOptions] = useState<string[]>([]);

  useEffect(() => {
    // Generate dates
    const today = new Date();
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const formatDate = (date: Date) => {
      const dayName = daysOfWeek[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${dayName}, ${day}/${month}`;
    };
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      let label = formatDate(d);
      if (i === 0) label += " (Hôm nay)";
      else if (i === 1) label += " (Ngày mai)";
      else if (i === 2) label += " (Ngày kia)";
      dates.push(label);
    }
    setDateOptions(dates);
    setSelectedDate(dates[0]);

    // Fetch provinces
    const loadProvinces = async () => {
      try {
        const res = await api.get('/provinces/admin');
        setProvincesList(res.data);
      } catch (error) {
        console.error('Lỗi lấy danh sách tỉnh', error);
      }
    };
    loadProvinces();
  }, []);

  // Update default selected province when region changes
  useEffect(() => {
    const provsInRegion = provincesList.filter(p => p.region === selectedRegion);
    if (provsInRegion.length > 0) {
      // Only change if the current selected is not in this region
      if (!provsInRegion.find(p => p.provinceId === selectedProvince)) {
        setSelectedProvince(provsInRegion[0].provinceId);
      }
    }
  }, [selectedRegion, provincesList]);

  const fetchTickets = useCallback(async () => {
    if (!selectedDate || !selectedProvince) return;
    try {
      setLoading(true);
      const res = await api.get('/tickets/admin', {
        params: { provinceId: selectedProvince, drawDate: selectedDate, limit: 100 }
      });
      setTickets(res.data.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Lỗi khi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  }, [selectedProvince, selectedDate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/tickets/admin', {
        ...values,
        provinceId: selectedProvince,
        drawDate: selectedDate
      });
      message.success('Thêm vé thành công');
      setModalVisible(false);
      form.resetFields();
      fetchTickets();
    } catch (error: any) {
      if (error.errorFields) return; // Validation error
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/tickets/admin/${id}`);
      message.success('Xoá vé thành công');
      fetchTickets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xoá vé');
    }
  };

  const handleBulkGenerate = async () => {
    try {
      setLoading(true);
      const res = await api.post('/tickets/admin/bulk', {
        provinceId: selectedProvince,
        drawDate: selectedDate
      });
      message.success(res.data.message);
      fetchTickets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo vé');
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Dãy số',
      dataIndex: 'number',
      key: 'number',
      render: (text: string, record: Ticket) => (
        <b style={{ color: record.ticketType === 'special' ? '#FF6B00' : '#E51F27' }}>
          {text}
        </b>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'ticketType',
      key: 'ticketType',
      render: (text: string) => (
        <Tag color={text === 'special' ? 'orange' : 'blue'}>
          {text === 'special' ? 'Đặc biệt' : 'Thường'}
        </Tag>
      ),
    },
    {
      title: 'Hệ số thưởng',
      dataIndex: 'multiplier',
      key: 'multiplier',
      render: (val: number) => val ? `x${val}` : '-',
    },
    {
      title: 'Giá vé',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => `${val.toLocaleString('vi-VN')}đ`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isSold',
      key: 'isSold',
      render: (isSold: boolean) => (
        <Tag color={isSold ? 'red' : 'green'}>{isSold ? 'Đã bán' : 'Chưa bán'}</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDelete(record._id)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4}>Quản lý Vé Kiến Thiết</Title>
        <Space>
          <Button 
            type="dashed" 
            icon={<SyncOutlined />} 
            onClick={handleBulkGenerate}
            disabled={!selectedProvince || !selectedDate}
          >
            Tự động tạo 10 vé
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            Thêm vé thủ công
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 4 }}>Khu vực:</div>
          <Select 
            value={selectedRegion}
            onChange={(val) => setSelectedRegion(val)}
            style={{ width: 150 }}
          >
            <Option value="MB">Miền Bắc</Option>
            <Option value="MT">Miền Trung</Option>
            <Option value="MN">Miền Nam</Option>
          </Select>
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Tỉnh/Đài:</div>
          <Select 
            value={selectedProvince}
            onChange={(val) => setSelectedProvince(val)}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="children"
          >
            {provincesList.filter(p => p.region === selectedRegion).map(p => (
              <Option key={p.provinceId} value={p.provinceId}>{p.name}</Option>
            ))}
          </Select>
        </div>
        <div>
          <div style={{ marginBottom: 4 }}>Ngày sổ:</div>
          <Select 
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
            style={{ width: 250 }}
          >
            {dateOptions.map(d => (
              <Option key={d} value={d}>{d}</Option>
            ))}
          </Select>
        </div>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={tickets} 
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Thêm vé thủ công"
        open={modalVisible}
        onOk={handleAdd}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="number" 
            label="Dãy số" 
            rules={[{ required: true, message: 'Vui lòng nhập dãy số' }]}
          >
            <Input placeholder="Ví dụ: x12345" />
          </Form.Item>
          <Form.Item 
            name="ticketType" 
            label="Loại vé" 
            rules={[{ required: true }]}
            initialValue="normal"
          >
            <Select>
              <Option value="normal">Thường</Option>
              <Option value="special">Đặc biệt</Option>
            </Select>
          </Form.Item>
          <Form.Item name="multiplier" label="Hệ số thưởng (tùy chọn)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="Giá vé" initialValue={10000}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
