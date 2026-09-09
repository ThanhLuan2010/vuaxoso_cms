import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Layout, Menu, Table, Tag, Button, Space, Typography, theme, message, Modal, InputNumber, Form, Image, Input } from 'antd';
import {
  LogoutOutlined,
  WalletOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  NotificationOutlined,
  EyeOutlined
} from '@ant-design/icons';
import DrawManagement from './DrawManagement';
import GameManagement from './GameManagement';
import BannerManagement from './BannerManagement';
import UserManagement from './UserManagement';
import SettingsManagement from './SettingsManagement';
import OrderManagement from './OrderManagement';
import TicketManagement from './TicketManagement';
import ProvinceManagement from './ProvinceManagement';
import NotificationManagement from './NotificationManagement';
import AdminLogs from './AdminLogs';
import GuideManagement from './GuideManagement';
import TermsManagement from './TermsManagement';
import { SecurityScanOutlined, HistoryOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function Dashboard() {
  const { logout } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('wallet');
  const [loading, setLoading] = useState(false);



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

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve'|'reject'|'review'|null>(null);
  const [actionNote, setActionNote] = useState('');

  const handleActionSubmit = async () => {
    if (!currentRecord) return;
    try {
      if (actionType === 'approve') {
        await api.put(`/wallet/admin/transactions/${currentRecord._id}/approve`, { note: actionNote });
        message.success('Duyệt giao dịch thành công');
      } else if (actionType === 'reject') {
        await api.put(`/wallet/admin/transactions/${currentRecord._id}/reject`, { note: actionNote });
        message.success('Từ chối giao dịch thành công');
      }
      setActionModalVisible(false);
      setActionNote('');
      setCurrentRecord(null);
      fetchTransactions();
    } catch (error) {
      message.error(`Lỗi ${actionType === 'approve' ? 'duyệt' : 'từ chối'} giao dịch`);
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
      title: 'Chi tiết Nạp',
      key: 'depositDetails',
      render: (_: any, record: any) => {
        if (record.type === 'deposit') {
          return (
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: '#888', marginBottom: 4 }}>
                {new Date(record.createdAt).toLocaleString('vi-VN')}
              </div>
              {record.receiptImage && (
                <Image
                  src={record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace('/api', '')}${record.receiptImage}`}
                  alt="Biên lai"
                  width={50}
                  style={{ borderRadius: 4, objectFit: 'cover' }}
                  preview={{ src: record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace('/api', '')}${record.receiptImage}` }}
                />
              )}
            </div>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      }
    },
    {
      title: 'Chi tiết Rút',
      key: 'withdrawDetails',
      render: (_: any, record: any) => {
        if (record.type === 'withdraw' && record.destinationInfo) {
          let dest = record.destinationInfo;
          // Support both flat structure and nested structure
          if (dest.type && dest.details) {
            dest = { ...dest.details, isBank: dest.type === 'bank' };
          } else {
            dest = { ...dest, isBank: !!dest.bankName };
          }
          
          let qrUrl = '';
          if (dest.isBank) {
            qrUrl = dest.qrCode ? 
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace('/api', '')}${dest.qrCode}`) :
              `https://img.vietqr.io/image/${dest.bankName}-${dest.accountNumber}-compact.png?accountName=${encodeURIComponent(dest.accountName)}`;
          } else {
            qrUrl = dest.qrCode ? 
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace('/api', '')}${dest.qrCode}`) :
              (dest.address ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(dest.address)}` : '');
          }
          
          return (
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: '#888', marginBottom: 4 }}>
                {new Date(record.createdAt).toLocaleString('vi-VN')}
              </div>
              {dest.isBank ? (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{dest.bankName}</div>
                  <div>{dest.accountNumber} - {dest.accountName}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', color: '#52c41a' }}>{dest.network === 'Binance Pay' ? 'Binance Pay' : `Ví ${dest.network || 'Không rõ'}`}</div>
                  <div>{dest.address || 'Không rõ'}</div>
                </div>
              )}
              {qrUrl && (
                <div style={{ marginTop: 4 }}>
                  <Image src={qrUrl} width={50} style={{ borderRadius: 4 }} />
                </div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note: string) => <div style={{ fontSize: '12px', maxWidth: 150 }}>{note || '-'}</div>
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
        <Space direction="vertical" size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setCurrentRecord(record);
              setActionType('review');
              setActionModalVisible(true);
            }}
          >
            Review
          </Button>
          {record.status === 'pending' && (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setCurrentRecord(record);
                  setActionType('approve');
                  setActionModalVisible(true);
                }}
              >
                Duyệt
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setCurrentRecord(record);
                  setActionType('reject');
                  setActionModalVisible(true);
                }}
              >
                Từ chối
              </Button>
            </Space>
          )}
        </Space>
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
      key: 'adminLogs',
      icon: <HistoryOutlined />,
      label: 'Nhật ký Hoạt động',
    },
    {
      key: 'notifications',
      icon: <NotificationOutlined />,
      label: 'Thông báo',
    },
    {
      key: 'guides',
      icon: <FileTextOutlined />,
      label: 'Hướng dẫn',
    },
    {
      key: 'terms',
      icon: <SafetyCertificateOutlined />,
      label: 'Điều khoản hoạt động',
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
                  pagination={{ pageSize: 20 }}
                />

                <Modal
                  title={
                    actionType === 'review' ? 'Chi tiết giao dịch' :
                    actionType === 'approve' ? 'Xác nhận Duyệt giao dịch' :
                    'Xác nhận Từ chối giao dịch'
                  }
                  open={actionModalVisible}
                  onCancel={() => {
                    setActionModalVisible(false);
                    setActionNote('');
                  }}
                  onOk={actionType === 'review' ? () => setActionModalVisible(false) : handleActionSubmit}
                  okText={actionType === 'review' ? 'Đóng' : 'Xác nhận'}
                  cancelText="Hủy"
                  okButtonProps={{ 
                    danger: actionType === 'reject', 
                    type: actionType === 'approve' ? 'primary' : 'default' 
                  }}
                >
                  {currentRecord && (
                    <div>
                      <p><strong>Người dùng:</strong> {currentRecord.user?.name} - {currentRecord.user?.phone}</p>
                      <p><strong>Loại:</strong> {currentRecord.type === 'deposit' ? 'NẠP TIỀN' : 'RÚT TIỀN'}</p>
                      <p><strong>Số tiền:</strong> {currentRecord.amount?.toLocaleString()} đ</p>
                      
                      {actionType !== 'review' && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ marginBottom: 8 }}><strong>Ghi chú (tuỳ chọn):</strong></p>
                          <Input.TextArea
                            rows={3}
                            placeholder="Nhập lý do hoặc ghi chú cho admin/khách hàng"
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                          />
                        </div>
                      )}
                      
                      {actionType === 'review' && currentRecord.note && (
                        <p style={{ marginTop: 16 }}><strong>Ghi chú:</strong> {currentRecord.note}</p>
                      )}
                    </div>
                  )}
                </Modal>

              </>
            )}

            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'tickets' && <TicketManagement />}
            {activeTab === 'provinces' && <ProvinceManagement />}
            {activeTab === 'games' && <GameManagement />}
            {activeTab === 'draws' && <DrawManagement />}
            {activeTab === 'banners' && <BannerManagement />}
            {activeTab === 'settings' && <SettingsManagement />}
            {activeTab === 'adminLogs' && <AdminLogs />}
            {activeTab === 'notifications' && <NotificationManagement />}
            {activeTab === 'guides' && <GuideManagement />}
            {activeTab === 'terms' && <TermsManagement />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
