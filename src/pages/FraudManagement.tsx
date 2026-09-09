import React, { useState, useEffect } from 'react';
import { Typography, Table, Card, Tabs, message, Button, Tag, Space, Modal } from 'antd';
import { ExclamationCircleOutlined, SecurityScanOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function FraudManagement() {
  const [loading, setLoading] = useState(false);
  const [duplicateIps, setDuplicateIps] = useState([]);
  const [duplicateDevices, setDuplicateDevices] = useState([]);

  useEffect(() => {
    fetchFraudData();
  }, []);

  const fetchFraudData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fraud/duplicate-ips-devices');
      setDuplicateIps(res.data.duplicateIps || []);
      setDuplicateDevices(res.data.duplicateDevices || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu gian lận');
    } finally {
      setLoading(false);
    }
  };

  const expandedRowRender = (record: any) => {
    const columns = [
      { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
      { title: 'Tên', dataIndex: 'name', key: 'name' },
      { 
        title: 'Trạng thái Info', 
        dataIndex: 'isInfoUpdated', 
        key: 'isInfoUpdated',
        render: (val: boolean) => val ? <Tag color="green">Đã cập nhật</Tag> : <Tag color="red">Chưa cập nhật</Tag>
      },
      { 
        title: 'Số dư', 
        dataIndex: 'balance', 
        key: 'balance',
        render: (val: number) => `${val?.toLocaleString() || 0} đ`
      },
      { 
        title: 'Ngày tạo', 
        dataIndex: 'createdAt', 
        key: 'createdAt',
        render: (val: string) => moment(val).format('DD/MM/YYYY HH:mm')
      },
    ];

    return <Table columns={columns} dataSource={record.users} pagination={false} rowKey="_id" size="small" />;
  };

  const ipColumns = [
    { 
      title: 'Địa chỉ IP', 
      dataIndex: 'ip', 
      key: 'ip',
      render: (val: string) => <Text strong>{val}</Text>
    },
    { 
      title: 'Số tài khoản trùng', 
      dataIndex: 'count', 
      key: 'count',
      render: (val: number) => <Tag color="orange">{val} tài khoản</Tag>
    },
  ];

  const deviceColumns = [
    { 
      title: 'Thiết bị (User Agent)', 
      dataIndex: 'device', 
      key: 'device',
      render: (val: string) => (
        <Text style={{ maxWidth: 400 }} ellipsis={{ tooltip: val }}>
          {val}
        </Text>
      )
    },
    { 
      title: 'Số tài khoản trùng', 
      dataIndex: 'count', 
      key: 'count',
      render: (val: number) => <Tag color="orange">{val} tài khoản</Tag>
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <SecurityScanOutlined style={{ marginRight: 12, color: '#ff4d4f' }} />
          Kiểm tra Gian lận
        </Title>
        <Button type="primary" onClick={fetchFraudData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      <Card>
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><ExclamationCircleOutlined /> Trùng IP Đăng nhập ({duplicateIps.length})</span>} key="1">
            <Table 
              columns={ipColumns} 
              dataSource={duplicateIps} 
              rowKey="ip" 
              loading={loading}
              expandable={{ expandedRowRender }}
            />
          </TabPane>
          <TabPane tab={<span><ExclamationCircleOutlined /> Trùng Thiết bị ({duplicateDevices.length})</span>} key="2">
            <Table 
              columns={deviceColumns} 
              dataSource={duplicateDevices} 
              rowKey="device" 
              loading={loading}
              expandable={{ expandedRowRender }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
