import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, Card, Tabs, message, Button, Tag, Space, Modal, Input, Select } from 'antd';
import { ExclamationCircleOutlined, SecurityScanOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function FraudManagement() {
  const [loading, setLoading] = useState(false);
  const [duplicateIps, setDuplicateIps] = useState<any[]>([]);
  const [duplicateDevices, setDuplicateDevices] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [minCount, setMinCount] = useState<number>(0);

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

  const handleResetFilters = () => {
    setSearchText('');
    setMinCount(0);
  };

  const filteredIps = useMemo(() => {
    return duplicateIps.filter((item: any) => {
      if (minCount > 0 && item.count < minCount) return false;
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesIp = (item.ip || '').toLowerCase().includes(query);
        const matchesUser = (item.users || []).some((u: any) => 
          (u.phone || '').toLowerCase().includes(query) || (u.name || '').toLowerCase().includes(query)
        );
        if (!matchesIp && !matchesUser) return false;
      }
      return true;
    });
  }, [duplicateIps, minCount, searchText]);

  const filteredDevices = useMemo(() => {
    return duplicateDevices.filter((item: any) => {
      if (minCount > 0 && item.count < minCount) return false;
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const matchesDevice = (item.device || '').toLowerCase().includes(query);
        const matchesUser = (item.users || []).some((u: any) => 
          (u.phone || '').toLowerCase().includes(query) || (u.name || '').toLowerCase().includes(query)
        );
        if (!matchesDevice && !matchesUser) return false;
      }
      return true;
    });
  }, [duplicateDevices, minCount, searchText]);

  const expandedRowRender = (record: any) => {
    const columns: any = [
      {
        fixed: 'left', title: 'SĐT', dataIndex: 'phone', key: 'phone'
      },
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

    return <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }} columns={columns} dataSource={record.users} pagination={false} rowKey="_id" size="small" />;
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
      sorter: (a: any, b: any) => a.count - b.count,
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
      sorter: (a: any, b: any) => a.count - b.count,
      render: (val: number) => <Tag color="orange">{val} tài khoản</Tag>
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          <SecurityScanOutlined style={{ marginRight: 12, color: '#ff4d4f' }} />
          Kiểm tra Gian lận
        </Title>
        <Button type="primary" onClick={fetchFraudData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16, background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <Input.Search
          placeholder="Tìm IP, User Agent, SĐT, Tên user..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />

        <Space align="center" size="small">
          <span style={{ fontWeight: 600, color: '#333' }}>Trùng tối thiểu:</span>
          <Select
            value={minCount}
            onChange={(val) => setMinCount(val)}
            style={{ width: 160 }}
            options={[
              { value: 0, label: 'Tất cả mức trùng' },
              { value: 2, label: 'Từ 2 tài khoản' },
              { value: 3, label: 'Từ 3 tài khoản' },
              { value: 5, label: 'Từ 5 tài khoản' },
              { value: 10, label: 'Từ 10 tài khoản' },
            ]}
          />
        </Space>

        {(minCount > 0 || searchText) && (
          <Button onClick={handleResetFilters} icon={<ReloadOutlined />}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <Card>
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><ExclamationCircleOutlined /> Trùng IP Đăng nhập ({filteredIps.length})</span>} key="1">
            <Table 
              style={{ flex: 1 }}
              scroll={{ y: 'calc(100vh - 300px)', x: 'max-content' }}
              columns={ipColumns}
              dataSource={filteredIps}
              rowKey="ip"
              loading={loading}
              expandable={{ expandedRowRender }}
            />
          </TabPane>
          <TabPane tab={<span><ExclamationCircleOutlined /> Trùng Thiết bị ({filteredDevices.length})</span>} key="2">
            <Table 
              style={{ flex: 1 }}
              scroll={{ y: 'calc(100vh - 300px)', x: 'max-content' }}
              columns={deviceColumns}
              dataSource={filteredDevices}
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
