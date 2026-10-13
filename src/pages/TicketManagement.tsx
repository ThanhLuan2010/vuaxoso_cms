import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input, Select, InputNumber, Space, Tag, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined, ExportOutlined, MoreOutlined, EyeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

interface Ticket {
  _id: string;
  number: string;
  price: number;
  ticketType: string;
  multiplier?: number;
  originalMultiplier?: number;
  symbols?: string[];
  provinceId: string;
  drawDate: string;
  isSold: boolean;
  isLocked?: boolean;
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
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [form] = Form.useForm();

  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkForm] = Form.useForm();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalTickets, setTotalTickets] = useState(0);

  const [provincesList, setProvincesList] = useState<ProvinceData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('MB');
  const [selectedProvince, setSelectedProvince] = useState<string>('MB');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateOptions, setDateOptions] = useState<string[]>([]);

  useEffect(() => {
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
      if (!provsInRegion.find(p => p.provinceId === selectedProvince)) {
        setSelectedProvince(provsInRegion[0].provinceId);
      }
    }
  }, [selectedRegion, provincesList]);

  const fetchTickets = useCallback(async (search = searchText, pageNum = page, limitNum = pageSize) => {
    if (!selectedDate || !selectedProvince) return;
    try {
      setLoading(true);
      const res = await api.get('/tickets/admin', {
        params: { 
          provinceId: selectedProvince, 
          drawDate: selectedDate, 
          page: pageNum, 
          limit: limitNum, 
          search 
        }
      });
      setTickets(res.data.data || []);
      setTotalTickets(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Lỗi khi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  }, [selectedProvince, selectedDate, searchText, page, pageSize]);

  useEffect(() => {
    setPage(1);
    fetchTickets(searchText, 1, pageSize);
  }, [selectedProvince, selectedDate]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/tickets/admin/${id}`);
      message.success('Xoá vé thành công');
      fetchTickets();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xoá vé');
    }
  };

  const handleLock = async (ticket: Ticket) => {
    try {
      await api.put(`/tickets/admin/${ticket._id}`, { isLocked: !ticket.isLocked });
      message.success(ticket.isLocked ? 'Đã mở khoá vé' : 'Đã khoá vé');
      fetchTickets();
    } catch (error: any) {
      message.error('Lỗi khi thao tác');
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    form.setFieldsValue({
      number: ticket.number,
      ticketType: ticket.ticketType,
      multiplier: ticket.multiplier,
      symbols: ticket.symbols || [],
      price: ticket.price,
      imageUrl: (ticket as any).imageUrl
    });
    setModalVisible(true);
  };

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      if (selectedTicket && selectedTicket._id) {
        // Edit mode
        await api.put(`/tickets/admin/${selectedTicket._id}`, {
          ...values,
          symbols: values.symbols ? values.symbols.filter(Boolean) : [],
        });
        message.success('Sửa vé thành công');
      } else {
        // Add mode
        await api.post('/tickets/admin', {
          ...values,
          symbols: values.symbols ? values.symbols.filter(Boolean) : [],
          provinceId: selectedProvince,
          drawDate: selectedDate
        });
        message.success('Thêm vé thành công');
      }
      setModalVisible(false);
      form.resetFields();
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleBulkGenerate = async (values?: any) => {
    if (!selectedProvince || !selectedDate) {
      message.warning('Vui lòng chọn Tỉnh/Đài và Ngày xổ trước khi tạo vé');
      return;
    }
    try {
      setBulkLoading(true);
      const payload = {
        provinceId: selectedProvince,
        drawDate: selectedDate,
        specialCount: values?.specialCount !== undefined ? values.specialCount : 500,
        normalCount: values?.normalCount !== undefined ? values.normalCount : 500,
        specialMultiplier: values?.specialMultiplier || 1,
        normalMultiplier: values?.normalMultiplier || (selectedRegion === 'MB' ? 10 : 14),
      };

      const res = await api.post('/tickets/admin/bulk', payload);
      message.success(res.data.message || 'Tạo 1.000 vé thành công!');
      setBulkModalVisible(false);
      setPage(1);
      fetchTickets(searchText, 1, pageSize);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo vé hàng loạt');
    } finally {
      setBulkLoading(false);
    }
  };

  const columns: any = [
    {
      fixed: 'left',
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
      title: 'SL Kho',
      key: 'original',
      render: (_: any, record: Ticket) => record.originalMultiplier != null ? record.originalMultiplier : (record.multiplier || 1),
    },
    {
      title: 'Đã bán',
      key: 'sold',
      render: (_: any, record: Ticket) => {
        const orig = record.originalMultiplier != null ? record.originalMultiplier : (record.multiplier || 1);
        const curr = record.multiplier != null ? record.multiplier : 1;
        return orig - curr;
      },
    },
    {
      title: 'SL còn',
      dataIndex: 'multiplier',
      key: 'remaining',
      render: (val: number) => val || 1,
    },
    {
      title: 'Ký hiệu',
      dataIndex: 'symbols',
      key: 'symbols',
      render: (symbols: string[]) => symbols && symbols.filter(Boolean).length > 0
        ? symbols.filter(Boolean).map((s, i) => <Tag key={i}>{s}</Tag>)
        : '-',
    },
    {
      title: 'Giá vé',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => `${val.toLocaleString('vi-VN')}đ`,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: Ticket) => {
        const isSoldOut = record.isSold || (record.multiplier === 0);
        return <Tag color={isSoldOut ? 'red' : 'green'}>{isSoldOut ? 'Đã bán' : 'Còn'}</Tag>;
      },
    },
    {
      title: 'Khóa',
      key: 'isLocked',
      render: (_: any, record: Ticket) => (
        <Tag color={record.isLocked ? 'default' : 'cyan'}>
          {record.isLocked ? 'Đã khoá' : 'Đang mở'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      fixed: 'right',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'detail',
                label: 'Xem chi tiết',
                icon: <EyeOutlined />,
                onClick: () => {
                  setSelectedTicket(record);
                  setDetailModalVisible(true);
                }
              },
              {
                key: 'edit',
                label: 'Sửa vé',
                onClick: () => handleEdit(record)
              },
              {
                key: 'lock',
                label: record.isLocked ? 'Mở khoá vé' : 'Khoá vé',
                onClick: () => handleLock(record)
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: 'Xoá vé',
                danger: true,
                onClick: () => handleDelete(record._id)
              }
            ]
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý vé Kiến Thiết</Title>
        <Space>
          <Input.Search 
            placeholder="Tìm theo dãy số..." 
            value={searchText} 
            onChange={e => setSearchText(e.target.value)}
            onSearch={v => { setPage(1); fetchTickets(v, 1, pageSize); }}
            style={{ width: 200 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
            onClick={() => {
              bulkForm.setFieldsValue({
                specialCount: 500,
                normalCount: 500,
                specialMultiplier: 1,
                normalMultiplier: selectedRegion === 'MB' ? 10 : 14
              });
              setBulkModalVisible(true);
            }}
            disabled={!selectedProvince || !selectedDate}
          >
            Tạo 1.000 vé (500 ĐB + 500 Thường)
          </Button>
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => { 
              setSelectedTicket(null); 
              form.resetFields(); 
              setModalVisible(true); 
            }}
          >
            Thêm vé thủ công
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Khu vực:</div>
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
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Tỉnh/Đài:</div>
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
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Ngày xổ:</div>
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
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 280px)', x: 'max-content' }}
        columns={columns}
        dataSource={tickets}
        rowKey="_id"
        loading={loading}
        pagination={{ 
          current: page,
          pageSize: pageSize,
          total: totalTickets,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200', '500', '1000'],
          showTotal: (total) => `Tổng: ${total} vé trong kho (${selectedProvince} - ${selectedDate})`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
            fetchTickets(searchText, newPage, newPageSize);
          }
        }}
      />

      {/* MODAL TẠO 1000 VÉ HÀNG LOẠT */}
      <Modal
        title={<span><ThunderboltOutlined style={{ color: '#fa8c16', marginRight: 8 }} />Tạo 1.000 Vé Số Tự Động (500 ĐB + 500 Thường)</span>}
        open={bulkModalVisible}
        onOk={() => bulkForm.submit()}
        onCancel={() => setBulkModalVisible(false)}
        okText="Xác nhận tạo 1.000 vé"
        cancelText="Hủy"
        confirmLoading={bulkLoading}
        width={560}
      >
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
          <Space direction="vertical" size={3} style={{ width: '100%' }}>
            <div>• <strong>Tỉnh/Đài:</strong> {provincesList.find(p => p.provinceId === selectedProvince)?.name || selectedProvince} ({selectedProvince})</div>
            <div>• <strong>Kỳ mở thưởng:</strong> {selectedDate}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: '#389e0d' }}>
              ✓ Hệ thống sẽ tự động sinh 1.000 vé ngẫu nhiên không trùng lặp, chia đều thành <strong>500 vé Đặc Biệt (x...)</strong> và <strong>500 vé Thường</strong>.
            </div>
          </Space>
        </div>

        <Form 
          form={bulkForm} 
          layout="vertical" 
          onFinish={handleBulkGenerate}
          initialValues={{
            specialCount: 500,
            normalCount: 500,
            specialMultiplier: 1,
            normalMultiplier: selectedRegion === 'MB' ? 10 : 14
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="specialCount"
              label="Số vé Đặc Biệt (Ký hiệu x...)"
              rules={[{ required: true, message: 'Nhập số lượng vé' }]}
            >
              <InputNumber min={1} max={5000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="normalCount"
              label="Số vé Thường"
              rules={[{ required: true, message: 'Nhập số lượng vé' }]}
            >
              <InputNumber min={1} max={5000} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="specialMultiplier"
              label="Số tờ mỗi vé ĐB (SL Kho)"
              extra="Mặc định 1 vé"
            >
              <InputNumber min={1} max={500} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="normalMultiplier"
              label="Số tờ mỗi vé Thường (SL Kho)"
              extra={`Mặc định ${selectedRegion === 'MB' ? 10 : 14} vé / lốc`}
            >
              <InputNumber min={1} max={500} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* MODAL THÊM / SỬA VÉ THỦ CÔNG */}
      <Modal
        title={selectedTicket && selectedTicket._id ? "Sửa vé số" : "Thêm vé thủ công"}
        open={modalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setModalVisible(false);
          setSelectedTicket(null);
          form.resetFields();
        }}
      >
        {!selectedTicket && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Text strong style={{ color: '#d48806' }}>Cần tạo nhanh số lượng lớn?</Typography.Text>
              <div style={{ fontSize: 12, color: '#8c6b00' }}>Tạo ngay 1.000 vé (500 ĐB + 500 Thường) tự động</div>
            </div>
            <Button 
              size="small" 
              type="primary" 
              icon={<ThunderboltOutlined />} 
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
              onClick={() => {
                setModalVisible(false);
                bulkForm.setFieldsValue({
                  specialCount: 500,
                  normalCount: 500,
                  specialMultiplier: 1,
                  normalMultiplier: selectedRegion === 'MB' ? 10 : 14
                });
                setBulkModalVisible(true);
              }}
            >
              Tạo 1.000 vé
            </Button>
          </div>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            name="number"
            label="Dãy số"
            rules={[{ required: true, message: 'Vui lòng nhập dãy số' }]}
          >
            <Input 
              placeholder="Ví dụ: x12345 (cho ĐB) hoặc 123456 (cho Thường)" 
              onChange={(e) => {
                if (e.target.value.toLowerCase().includes('x')) {
                  form.setFieldsValue({ ticketType: 'special' });
                } else {
                  form.setFieldsValue({ ticketType: 'normal' });
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="imageUrl"
            label="Link ảnh vé số (Tùy chọn)"
          >
            <Input placeholder="Nhập URL ảnh vé số" />
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
          <Form.Item name="multiplier" label="Số Lượng Vé (SL Kho)">
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="Ký hiệu (tối đa 10 ô)">
            <Space size={[8, 8]} wrap>
              {[...Array(10)].map((_, idx) => (
                <Form.Item name={['symbols', idx]} noStyle key={idx}>
                  <Input maxLength={4} style={{ width: 60, textAlign: 'center' }} placeholder={`#${idx + 1}`} />
                </Form.Item>
              ))}
            </Space>
          </Form.Item>
          <Form.Item name="price" label="Giá vé" initialValue={10000}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CHI TIẾT VÉ */}
      <Modal
        title="Chi tiết vé số"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><span style={{ color: '#888' }}>Mã hệ thống:</span> <b>{selectedTicket._id}</b></div>
            <div>
              <span style={{ color: '#888' }}>Dãy số: </span> 
              <b style={{ fontSize: 18, color: selectedTicket.ticketType === 'special' ? '#FF6B00' : '#E51F27' }}>
                {selectedTicket.number}
              </b>
            </div>
            <div>
              <span style={{ color: '#888' }}>Loại vé: </span> 
              <Tag color={selectedTicket.ticketType === 'special' ? 'orange' : 'blue'}>
                {selectedTicket.ticketType === 'special' ? 'Đặc biệt' : 'Thường'}
              </Tag>
            </div>
            <div>
              <span style={{ color: '#888' }}>Ký hiệu: </span> 
              {(selectedTicket as any).symbols && (selectedTicket as any).symbols.filter(Boolean).length > 0
                ? (selectedTicket as any).symbols.filter(Boolean).map((s: string, i: number) => <Tag key={i}>{s}</Tag>)
                : '-'}
            </div>
            <div><span style={{ color: '#888' }}>Số vé đã bán:</span> <b>{(selectedTicket.originalMultiplier != null ? selectedTicket.originalMultiplier : (selectedTicket.multiplier || 1)) - (selectedTicket.multiplier != null ? selectedTicket.multiplier : 1)}</b></div>
            <div><span style={{ color: '#888' }}>Số vé còn lại:</span> <b>{selectedTicket.multiplier || 1}</b></div>
            <div><span style={{ color: '#888' }}>Giá vé:</span> <b>{selectedTicket.price?.toLocaleString('vi-VN')}đ</b></div>
            <div>
              <span style={{ color: '#888' }}>Trạng thái: </span> 
              <Tag color={selectedTicket.isSold ? 'red' : 'green'}>
                {selectedTicket.isSold ? 'Hết vé' : 'Còn vé'}
              </Tag>
            </div>
            <div><span style={{ color: '#888' }}>Ngày mở thưởng:</span> <b>{selectedTicket.drawDate}</b></div>
            <div><span style={{ color: '#888' }}>Ngày tạo:</span> <b>{new Date(selectedTicket.createdAt).toLocaleString('vi-VN')}</b></div>
            
            <div style={{ marginTop: 10 }}>
              <div style={{ color: '#888', marginBottom: 8 }}>Ảnh vé số:</div>
              {(selectedTicket as any).imageUrl ? (
                <img 
                  src={(selectedTicket as any).imageUrl.startsWith('http') ? (selectedTicket as any).imageUrl : `${api.defaults.baseURL?.replace(/\/api$/, '')}${(selectedTicket as any).imageUrl.startsWith('/') ? '' : '/'}${(selectedTicket as any).imageUrl}`} 
                  alt="Vé" 
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #f0f0f0' }} 
                />
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5', borderRadius: 8, color: '#999' }}>
                  Vé này không có ảnh đính kèm
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
