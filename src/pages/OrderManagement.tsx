import { useState, useEffect } from 'react';
import { Table, Tag, Button, Typography, message, Modal, Upload } from 'antd';
import { CameraOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
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
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/admin');
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
    setUploadModalVisible(true);
  };

  const handleUpload = async () => {
    if (!selectedOrder || fileList.length === 0) {
      message.warning('Vui lòng chọn ảnh');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', fileList[0].originFileObj);
      
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = uploadRes.data.url;

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

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'orderId',
      key: 'orderId',
      fixed: 'left' as const,
      width: 220,
      render: (text: string) => <b>{text}</b>,
    },
    {
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
        <>
          {(!record.ticketImageUrl && record.status !== 'cancelled') && (
            <Button 
              type="primary" 
              icon={<CameraOutlined />} 
              onClick={() => handleOpenUpload(record)}
            >
              In & Chụp vé
            </Button>
          )}
          {record.ticketImageUrl && (
            <Button 
              type="dashed"
              icon={<CheckCircleOutlined style={{ color: 'green' }} />} 
              onClick={() => window.open(`http://localhost:5000${record.ticketImageUrl}`, '_blank')}
            >
              Xem vé
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Quản lý Đặt vé (Orders)</Title>
      
      <Table 
        columns={columns} 
        dataSource={orders} 
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1300 }}
      />

      <Modal
        title={`Tải hình ảnh vé - ${selectedOrder?.orderId}`}
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => setUploadModalVisible(false)}
        confirmLoading={uploading}
        okText="Hoàn thành Đơn"
        cancelText="Huỷ"
      >
        <Upload
          listType="picture-card"
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          maxCount={1}
        >
          {fileList.length >= 1 ? null : (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Chọn ảnh</div>
            </div>
          )}
        </Upload>
      </Modal>
    </div>
  );
}
