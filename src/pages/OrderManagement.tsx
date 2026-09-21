import { CameraOutlined, CheckCircleOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Divider, Input, message, Modal, Popover, Row, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import api from '../services/api';

const { Title } = Typography;

interface Order {
  _id: string;
  orderId: string;
  gameType: string;
  numbers: string[];
  totalCost: number;
  status: string;
  createdAt: string;
  user: { name: string; phone: string };
  ticketImageUrl?: string;
  isWinner?: boolean;
  prizeAmount?: number;
  winningNumbers?: string[];
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResultOrder] = useState<Order | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ticketLink, setTicketLink] = useState('');

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [summaryData, setSummaryData] = useState({
    totalTickets: 0,
    totalSales: 0,
    totalPrize: 0,
    totalLoss: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    try {
      const dateParam = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
      const res = await api.get('/orders/admin/summary', { params: { date: dateParam } });
      setSummaryData(res.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const dateParam = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
      const res = await api.get('/orders/admin', { params: { date: dateParam } });
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Lỗi khi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpload = (record: Order) => {
    setSelectedOrder(record);
    setFileList([]);
    setTicketLink('');
    setUploadModalVisible(true);
  };

  const handleUpload = async () => {
    if (!selectedOrder || (fileList.length === 0 && !ticketLink)) {
      message.warning('Vui lòng chọn ảnh hoặc nhập link ảnh');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = ticketLink;

      if (fileList.length > 0) {
        const formData = new FormData();
        formData.append('image', fileList[0].originFileObj);

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        imageUrl = uploadRes.data.url;
      }

      await api.put(`/orders/admin/${selectedOrder._id}`, {
        status: 'completed',
        ticketImageUrl: imageUrl
      });

      message.success('Tải ảnh và hoàn thành đơn thành công');
      setUploadModalVisible(false);
      fetchOrders();
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi upload vé');
    } finally {
      setUploading(false);
    }
  };

  const columns: any = [
    {
      fixed: 'left',
      title: 'Khách hàng',
      key: 'user',
      render: (_: any, record: Order) => (
        <div>
          <div>{record.user?.name}</div>
          <div style={{ color: 'gray', fontSize: 12 }}>{record.user?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Game',
      dataIndex: 'gameType',
      key: 'gameType',
      render: (text: string) => text.toUpperCase(),
    },
    {
      title: 'Dãy số',
      key: 'numbers',
      render: (_: any, record: any) => {
        if (record.items && record.items.length > 0) {
          const displayItems = record.items.slice(0, 5);
          const hiddenCount = record.items.length - displayItems.length;

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', maxHeight: 80, overflowY: 'auto' }}>
              {displayItems.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ marginRight: 4 }}>{item.id || String.fromCharCode(65 + idx)}:</strong>
                  {item.numbers.map((n: string, i: number) => (
                    <Tag key={i} color="blue" style={{ marginInlineEnd: 2 }}>{n}</Tag>
                  ))}
                </div>
              ))}
              {hiddenCount > 0 && (
                <Tag color="orange" style={{ alignSelf: 'center' }}>+ {hiddenCount} dãy số khác</Tag>
              )}
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {record.numbers?.map((n: string, i: number) => <Tag key={i} color="blue">{n}</Tag>)}
          </div>
        );
      },
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val: number) => (
        <span style={{ color: 'red', fontWeight: 'bold' }}>
          {val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'pending') return <Tag color="orange">Chờ in</Tag>;
        if (status === 'completed') return <Tag color="green">Đã in</Tag>;
        return <Tag color="red">Đã huỷ</Tag>;
      },
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right' as const,
      width: 160,
      render: (_: any, record: Order) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              {(!record.ticketImageUrl && record.status !== 'cancelled') && (
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={() => handleOpenUpload(record)}
                  block
                >
                  In & Chụp vé
                </Button>
              )}
              {record.ticketImageUrl && (
                <Button
                  type="dashed"
                  icon={<CheckCircleOutlined style={{ color: 'green' }} />}
                  onClick={() => window.open(`http://localhost:5000${record.ticketImageUrl}`, '_blank')}
                  block
                >
                  Xem vé
                </Button>
              )}
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      ),
    },
    {
      title: 'Kết quả',
      key: 'result',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: Order) => {
        if (!record.winningNumbers || record.winningNumbers.length === 0) {
          return <span style={{ color: '#aaa' }}>Chưa có KQ</span>;
        }
        if (record.isWinner) {
          return <span style={{ color: 'green', fontWeight: 'bold' }}>Thắng</span>;
        }
        return <span style={{ color: 'red', fontWeight: 'bold' }}>Thua</span>;
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ marginTop: 0, marginBottom: 16 }} level={4} >Quản lý Đặt vé (Orders)</Title>
        <Space>
          <span>Lọc theo ngày:</span>
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="DD/MM/YYYY"
            allowClear
          />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Số vé bán ra"
              value={summaryData.totalTickets}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Tổng tiền bán ra"
              value={summaryData.totalSales}
              suffix="đ"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Tổng tiền khách thắng"
              value={summaryData.totalPrize}
              suffix="đ"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Tổng tiền khách thua"
              value={summaryData.totalLoss}
              suffix="đ"
              valueStyle={{ color: '#d48806' }}
            />
          </Card>
        </Col>
      </Row>

      <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        loading={loading}

      />

      <Modal
        title={`Tải hình ảnh vé - ${selectedOrder?.orderId}`}
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => setUploadModalVisible(false)}
        confirmLoading={uploading}
        footer={[
          <Button key="cancel" onClick={() => setUploadModalVisible(false)}>Huỷ</Button>,
          <Button key="submit" type="primary" onClick={handleUpload} loading={uploading}>Xác nhận & Tải lên</Button>
        ]}
      >
        <Upload
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          listType="picture"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Chọn ảnh vé từ thiết bị</Button>
        </Upload>

        <Divider plain>Hoặc</Divider>

        <Input
          placeholder="Nhập đường link (URL) ảnh vé..."
          value={ticketLink}
          onChange={e => setTicketLink(e.target.value)}
        />
      </Modal>

      <Modal
        title={`Chi tiết Kết quả - Đơn ${selectedResultOrder?.orderId}`}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>Đóng</Button>
        ]}
      >
        {selectedResultOrder && (
          <div style={{ fontSize: '16px', lineHeight: '2.0' }}>
            <div><strong>Khách hàng:</strong> {selectedResultOrder.user?.name} - {selectedResultOrder.user?.phone}</div>
            <div><strong>Trạng thái:</strong> {selectedResultOrder.isWinner ? (
              <span style={{ color: 'green', fontWeight: 'bold' }}>Thắng</span>
            ) : (
              <span style={{ color: 'red', fontWeight: 'bold' }}>Thua</span>
            )}</div>
            {selectedResultOrder.isWinner && (
              <div><strong>Tổng tiền trúng:</strong> <span style={{ color: 'green', fontWeight: 'bold', fontSize: '18px' }}>{selectedResultOrder.prizeAmount?.toLocaleString('vi-VN')} đ</span></div>
            )}
            <div><strong>Kết quả kỳ quay:</strong></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {selectedResultOrder.winningNumbers?.map((n: string, i: number) => (
                <Tag key={i} color="gold" style={{ fontSize: '14px', padding: '4px 8px' }}>{n}</Tag>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
