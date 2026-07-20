import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Layout, Menu, Table, Tag, Button, Space, Typography, theme, message, Modal, InputNumber, Form } from 'antd';
import { 
  LogoutOutlined, 
  WalletOutlined, 
  TrophyOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';
import DrawManagement from './DrawManagement';
import GameManagement from './GameManagement';
import BannerManagement from './BannerManagement';
import UserManagement from './UserManagement';
import SettingsManagement from './SettingsManagement';
import OrderManagement from './OrderManagement';
import TicketManagement from './TicketManagement';
import ProvinceManagement from './ProvinceManagement';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function Dashboard() {
  const { logout } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('wallet');
  const [loading, setLoading] = useState(false);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState<number | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/wallet/admin/transactions');
      setTransactions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallet') {
      fetchTransactions();
    }
  }, [activeTab]);

  const handleApprove = async (record: any) => {
    if (record.type === 'deposit') {
      setApproveTarget(record);
      setApproveAmount(null);
      setApproveModalVisible(true);
    } else {
      try {
        await api.put(`/wallet/admin/transactions/${record._id}/approve`);
        fetchTransactions();
        message.success('Duyệt giao dịch thành công');
      } catch (error) {
        message.error('Lỗi duyệt giao dịch');
      }
    }
  };

  const confirmApproveDeposit = async () => {
    if (!approveAmount || approveAmount <= 0) {
      message.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    try {
      await api.put(`/wallet/admin/transactions/${approveTarget._id}/approve`, { amount: approveAmount });
      setApproveModalVisible(false);
      setApproveTarget(null);
      fetchTransactions();
      message.success('Duyệt nạp tiền thành công');
    } catch (error) {
      message.error('Lỗi duyệt nạp tiền');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/wallet/admin/transactions/${id}/reject`);
      fetchTransactions();
      message.success('Từ chối giao dịch thành công');
    } catch (error) {
      message.error('Lỗi từ chối giao dịch');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.user?.name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.user?.phone}</div>
        </div>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'deposit' ? 'blue' : 'orange'}>
          {type === 'deposit' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
        </Tag>
      )
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>
          {amount?.toLocaleString()} đ
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let text = 'Không rõ';
        if (status === 'pending') { color = 'gold'; text = 'Chờ duyệt'; }
        if (status === 'approved') { color = 'green'; text = 'Đã duyệt'; }
        if (status === 'rejected') { color = 'red'; text = 'Từ chối'; }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        record.status === 'pending' ? (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
            >
              Duyệt
            </Button>
            <Button 
              danger 
              size="small" 
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record._id)}
            >
              Từ chối
            </Button>
          </Space>
        ) : null
      )
    }
  ];

  const menuItems = [
    {
      key: 'wallet',
      icon: <WalletOutlined />,
      label: 'Quản lý Nạp / Rút',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Quản lý User',
    },
    {
      key: 'orders',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Đặt vé',
    },
    {
      key: 'tickets',
      icon: <AppstoreOutlined />,
      label: 'Quản lý vé Kiến Thiết',
    },
    {
      key: 'provinces',
      icon: <AppstoreOutlined />,
      label: 'Cấu hình Tỉnh/Đài',
    },
    {
      key: 'games',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Game',
    },
    {
      key: 'draws',
      icon: <TrophyOutlined />,
      label: 'Quản lý Kỳ quay',
    },
    {
      key: 'banners',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Banner',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cấu hình chung',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 64, margin: 16, color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          VUA XỔ SỐ CMS
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems as any}
          onClick={(e) => {
            if (e.key === 'logout') {
              logout();
            } else {
              setActiveTab(e.key);
            }
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {activeTab === 'wallet' && (
              <>
                <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>Quản lý Nạp / Rút</Title>
                <Table 
                  columns={columns} 
                  dataSource={transactions} 
                  rowKey="_id"
                  loading={loading}
                />
                <Modal
                  title="Xác nhận số tiền nạp"
                  open={approveModalVisible}
                  onOk={confirmApproveDeposit}
                  onCancel={() => setApproveModalVisible(false)}
                  okText="Xác nhận & Duyệt"
                  cancelText="Hủy"
                >
                  <div style={{ marginBottom: 16 }}>
                    Vui lòng đối chiếu sao kê và nhập số tiền thực tế mà người dùng <b>{approveTarget?.user?.phone}</b> đã nạp.
                  </div>
                  <Form layout="vertical">
                    <Form.Item label="Số tiền nhận được (VNĐ)" required>
                      <InputNumber 
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Nhập số tiền..."
                        value={approveAmount}
                        onChange={(val) => setApproveAmount(val)}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Form>
                </Modal>
              </>
            )}

            { activeTab === 'users' && <UserManagement /> }
            { activeTab === 'orders' && <OrderManagement /> }
            { activeTab === 'tickets' && <TicketManagement /> }
            { activeTab === 'provinces' && <ProvinceManagement /> }
            { activeTab === 'games' && <GameManagement /> }
            {activeTab === 'draws' && <DrawManagement />}
            {activeTab === 'banners' && <BannerManagement />}
            {activeTab === 'settings' && <SettingsManagement />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
