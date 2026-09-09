import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, message, Tag, Space, Button } from 'antd';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/logs');
      setLogs(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tải lịch sử hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => moment(val).format('DD/MM/YYYY HH:mm:ss'),
      width: 160,
    },
    {
      title: 'Admin',
      dataIndex: 'adminName',
      key: 'adminName',
      render: (val: string) => <Text strong>{val}</Text>,
      width: 150,
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'action',
      render: (val: string) => {
        let color = 'blue';
        let text = val;
        switch (val) {
          case 'UPDATE_USER':
            color = 'cyan';
            text = 'Cập nhật User';
            break;
          case 'RESET_PASSWORD':
            color = 'orange';
            text = 'Reset MK Đăng nhập';
            break;
          case 'RESET_WITHDRAW_PASSWORD':
            color = 'volcano';
            text = 'Reset MK Rút tiền';
            break;
        }
        return <Tag color={color}>{text}</Tag>;
      },
      width: 180,
    },
    {
      title: 'Khách hàng',
      key: 'targetUserId',
      render: (_: any, record: any) => {
        if (!record.targetUserId) return '-';
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.targetUserId.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.targetUserId.phone}</Text>
          </Space>
        );
      },
      width: 180,
    },
    {
      title: 'Chi tiết thay đổi / Ghi chú',
      dataIndex: 'details',
      key: 'details',
      render: (val: string) => <Text>{val}</Text>,
    },
  ];

  return (
    <>
      <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>Nhật ký Hoạt động</Title>
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </>
  );
}
