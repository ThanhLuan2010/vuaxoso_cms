import React, { useState, useEffect, useMemo } from 'react';
import { Table, Card, Typography, message, Tag, Space, Button, Popconfirm, Modal, Input, DatePicker, Select } from 'antd';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [adminOptions, setAdminOptions] = useState<{ label: string; value: string }[]>([]);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (
    page = currentPage,
    limit = pageSize,
    search = searchText,
    action = actionFilter,
    admin = adminFilter,
    dates = dateRange
  ) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };
      if (search && search.trim()) params.search = search.trim();
      if (action && action !== 'all') params.action = action;
      if (admin && admin !== 'all') params.adminName = admin;
      if (dates && dates[0] && dates[1]) {
        params.startDate = dates[0].format('YYYY-MM-DD');
        params.endDate = dates[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/logs', { params });
      if (res.data.logs) {
        setLogs(res.data.logs);
        setTotal(res.data.total || 0);
        setCurrentPage(res.data.page || page);
        setPageSize(res.data.limit || limit);
        if (res.data.adminNames) {
          setAdminOptions(res.data.adminNames.map((name: string) => ({ label: name, value: name })));
        }
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
        setTotal(res.data.length);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tải lịch sử hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pageSize, searchText, actionFilter, adminFilter, dateRange);
  }, []);



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
      title: 'Người thao tác',
      dataIndex: 'adminName',
      key: 'adminName',
      render: (val: string) => {
        if (!val || val === 'Hệ thống') return <Tag color="blue">Hệ thống</Tag>;
        if (val === 'Khách hàng') return <Tag color="green">Khách hàng</Tag>;
        return <Text strong>{val}</Text>;
      },
      width: 160,
    },
    {
      title: 'Thao tác',
      dataIndex: 'action',
      key: 'action',
      render: (val: string) => {
        let color = 'blue';
        let text = val;
        switch (val) {
          case 'THẮNG CƯỢC':
          case 'WIN_ORDER':
            color = 'green';
            text = 'Thắng cược';
            break;
          case 'THUA CƯỢC':
          case 'LOSE_ORDER':
            color = 'default';
            text = 'Thua cược';
            break;
          case 'NẠP TIỀN':
            color = 'blue';
            text = 'Khách nạp tiền';
            break;
          case 'NẠP TIỀN TỰ ĐỘNG (BINANCE)':
            color = 'cyan';
            text = 'Nạp tự động (Binance)';
            break;
          case 'DUYỆT NẠP TIỀN':
            color = 'geekblue';
            text = 'Duyệt nạp tiền';
            break;
          case 'TỪ CHỐI NẠP TIỀN':
            color = 'red';
            text = 'Từ chối nạp tiền';
            break;
          case 'RÚT TIỀN':
            color = 'volcano';
            text = 'Khách rút tiền';
            break;
          case 'DUYỆT RÚT TIỀN':
            color = 'gold';
            text = 'Duyệt rút tiền';
            break;
          case 'TỪ CHỐI RÚT TIỀN':
            color = 'magenta';
            text = 'Từ chối rút tiền';
            break;
          case 'UPDATE_ORDER_RESULT':
          case 'Sửa kết quả vé':
            color = 'purple';
            text = 'Sửa kết quả vé';
            break;
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
      width: 190,
    },
    {
      title: 'Khách hàng',
      key: 'targetUserId',
      render: (_: any, record: any) => {
        if (!record.targetUserId) return '-';
        return (
          <div
            style={{
              cursor: record.targetUserId.phone ? 'pointer' : 'default',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#f0f5ff',
              display: 'inline-block'
            }}
            onClick={() => {
              if (record.targetUserId?.phone) {
                localStorage.setItem('userSearchPhone', record.targetUserId.phone);
                window.dispatchEvent(new CustomEvent('changeTab', { detail: 'users' }));
                window.dispatchEvent(new CustomEvent('openUserDetail', { detail: { phone: record.targetUserId.phone } }));
              }
            }}
            title="Bấm để xem chi tiết người dùng này"
          >
            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.targetUserId.name || '-'}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{record.targetUserId.phone || '-'}</div>
          </div>
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
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8 }}>
        <Input.Search
          placeholder="Tìm theo Admin, Hành động, Khách hàng..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => {
            setCurrentPage(1);
            fetchLogs(1, pageSize, value, actionFilter, adminFilter, dateRange);
          }}
          style={{ width: 280 }}
        />

        <Space size="small">
          <span style={{ fontWeight: 500, fontSize: 13 }}>Thao tác:</span>
          <Select
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setCurrentPage(1);
              fetchLogs(1, pageSize, searchText, val, adminFilter, dateRange);
            }}
            style={{ width: 180 }}
            options={[
              { label: 'Tất cả thao tác', value: 'all' },
              { label: 'Khách nạp tiền', value: 'NẠP TIỀN' },
              { label: 'Nạp tự động (Binance)', value: 'NẠP TIỀN TỰ ĐỘNG (BINANCE)' },
              { label: 'Duyệt nạp tiền', value: 'DUYỆT NẠP TIỀN' },
              { label: 'Từ chối nạp tiền', value: 'TỪ CHỐI NẠP TIỀN' },
              { label: 'Khách rút tiền', value: 'RÚT TIỀN' },
              { label: 'Duyệt rút tiền', value: 'DUYỆT RÚT TIỀN' },
              { label: 'Từ chối rút tiền', value: 'TỪ CHỐI RÚT TIỀN' },
              { label: 'Thắng cược', value: 'THẮNG CƯỢC' },
              { label: 'Thua cược', value: 'THUA CƯỢC' },
              { label: 'Sửa kết quả vé', value: 'UPDATE_ORDER_RESULT' },
              { label: 'Cập nhật User', value: 'UPDATE_USER' },
              { label: 'Reset MK Đăng nhập', value: 'RESET_PASSWORD' },
              { label: 'Reset MK Rút tiền', value: 'RESET_WITHDRAW_PASSWORD' },
            ]}
          />
        </Space>

        <Space size="small">
          <span style={{ fontWeight: 500, fontSize: 13 }}>Admin:</span>
          <Select
            value={adminFilter}
            onChange={(val) => {
              setAdminFilter(val);
              setCurrentPage(1);
              fetchLogs(1, pageSize, searchText, actionFilter, val, dateRange);
            }}
            style={{ width: 140 }}
            options={[
              { label: 'Tất cả Admin', value: 'all' },
              ...adminOptions
            ]}
          />
        </Space>

        <Space size="small">
          <span style={{ fontWeight: 500, fontSize: 13 }}>Thời gian:</span>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={(val) => {
              setDateRange(val);
              setCurrentPage(1);
              fetchLogs(1, pageSize, searchText, actionFilter, adminFilter, val);
            }}
            allowClear
            style={{ width: 240 }}
            placeholder={['Từ ngày', 'Đến ngày']}
          />
        </Space>

        {(searchText || actionFilter !== 'all' || adminFilter !== 'all' || dateRange) && (
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText('');
              setActionFilter('all');
              setAdminFilter('all');
              setDateRange(null);
              setCurrentPage(1);
              fetchLogs(1, pageSize, '', 'all', 'all', null);
            }}
            style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 280px)', x: 'max-content' }}
        columns={columns}
        dataSource={logs}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
            fetchLogs(page, size, searchText, actionFilter, adminFilter, dateRange);
          },
          showTotal: (totalCount, range) => (
            <span style={{ fontSize: 13, color: '#666' }}>
              Hiển thị {range[0]}-{range[1]} / <strong>{totalCount}</strong> hoạt động
            </span>
          )
        }}
      />
    </>
  );
}
