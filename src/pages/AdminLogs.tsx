import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, message, Tag, Space, Button, Popconfirm, Modal, Input } from 'antd';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.get('/logs', { params: { search } });
      setLogs(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tải lịch sử hoạt động');
    } finally {
      setLoading(false);
    }
  };



  const columns: any = [
    {
      fixed: 'left',
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
      
      render: (val: string) => {
        try {
          const parsed = JSON.parse(val);
          if (parsed && parsed.summary && parsed.changes) {
            return <Text strong type="warning">{parsed.summary}</Text>;
          }
        } catch(e) {}
        return <Text>{val}</Text>;
      },

    },
    {
      title: 'Hành động',
      fixed: 'right',
      key: 'action',
      render: (_: any, record: any) => {
        let hasDetails = false;
        let parsed: any = null;
        try {
          parsed = JSON.parse(record.details);
          if (parsed && parsed.summary && parsed.changes) {
            hasDetails = true;
          }
        } catch(e) {}

        return (
          <Space>
            {hasDetails && (
              <Button size="small" type="primary" ghost onClick={() => {
                const translateField = (field: string) => {
                  return field
                    .replace('deposit_config', 'Cấu hình Nạp tiền')
                    .replace('binance_config', 'Cấu hình Binance')
                    .replace('banks', 'Ngân hàng')
                    .replace('gateways', 'Cổng thanh toán')
                    .replace('walletsConfig', 'Cấu hình ví điện tử')
                    .replace('transferPrefix', 'Mã tiền tố')
                    .replace('transferIdentifier', 'Định danh')
                    .replace('bankName', 'Tên NH')
                    .replace('accountName', 'Chủ TK')
                    .replace('accountNumber', 'Số TK/SĐT')
                    .replace('qrImage', 'Ảnh QR')
                    .replace('exchangeRate', 'Tỷ giá USDT')
                    .replace('wallets', 'Ví Binance')
                    .replace('network', 'Mạng lưới')
                    .replace('walletAddress', 'Địa chỉ ví')
                    .replace(/\[(\d+)\]/g, (match, p1) => ` thứ ${parseInt(p1) + 1}`)
                    .replace(/\./g, ' ➡ ');
                };

                const formatValue = (v: any) => {
                  if (v === true) return 'Đang BẬT';
                  if (v === false) return 'Đang TẮT';
                  if (v === null || v === undefined || v === '') return '(Trống)';
                  if (typeof v === 'object') return JSON.stringify(v);
                  return String(v);
                };

                Modal.info({
                  icon: null,
                  closable: true,
                  maskClosable: true,
                  title: 'Chi tiết thay đổi cấu hình',
                  width: 800,
                  content: (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', marginTop: 16 }}>
                      <p><strong>Admin:</strong> {record.adminName}</p>
                      <p><strong>Thời gian:</strong> {moment(record.createdAt).format('DD/MM/YYYY HH:mm:ss')}</p>
                      <Table
                        size="small"
                        bordered
                        style={{ marginTop: 16 }}
                        pagination={false}
                        dataSource={parsed.changes}
                        rowKey={(r: any) => r.field + Math.random()}
                        columns={[
                          { title: 'Tên cấu hình', dataIndex: 'field', key: 'field', render: (v) => <Text strong>{translateField(v)}</Text> },
                          { title: 'Dữ liệu Cũ', dataIndex: 'old', key: 'old', render: (v) => <Text type="secondary" delete>{formatValue(v)}</Text> },
                          { title: 'Dữ liệu Mới', dataIndex: 'new', key: 'new', render: (v) => <Text strong type="success">{formatValue(v)}</Text> },
                        ]}
                      />
                    </div>
                  )
                });
              }}>
                Chi tiết
              </Button>
            )}          </Space>
        );
      },
      width: 160,
      align: 'center',
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title style={{ margin: 0 }} level={3} >Nhật ký Hoạt động</Title>
        <Input.Search
          placeholder="Tìm theo Admin, Hành động, Khách hàng..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => fetchLogs(value)}
          style={{ width: 350 }}
        />
      </div>
      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
        columns={columns}
        dataSource={logs}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </>
  );
}
