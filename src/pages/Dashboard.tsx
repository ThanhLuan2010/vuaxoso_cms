import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LogoutOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { Button, Image, Input, Layout, Menu, message, Modal, Space, Table, Tag, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import AdminLogs from './AdminLogs';
import BannerManagement from './BannerManagement';
import DrawManagement from './DrawManagement';
import GameManagement from './GameManagement';
import GuideManagement from './GuideManagement';
import NotificationManagement from './NotificationManagement';
import OrderManagement from './OrderManagement';
import ProvinceManagement from './ProvinceManagement';
import SettingsManagement from './SettingsManagement';
import TermsManagement from './TermsManagement';
import TicketManagement from './TicketManagement';
import UserManagement from './UserManagement';

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
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'review' | null>(null);
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
      fixed: 'left' as const,
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
      render: (amount: number, record: any) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.paymentMethod === 'binance' && record.destinationInfo?.amountUsdt 
            ? `${record.destinationInfo.amountUsdt.toLocaleString()} USDT` 
            : `${amount?.toLocaleString()} đ`}
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
              {record.paymentMethod !== 'scratch' && record.paymentMethod !== 'binance' && (
                <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: 4 }}>
                  Nội dung CK: {record.txId || '-'}
                </div>
              )}
              {record.receiptImage && (
                <Image
                  src={record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${record.receiptImage.startsWith('/') ? '' : '/'}${record.receiptImage}`}
                  alt="Biên lai"
                  width={50}
                  height={50}
                  style={{ borderRadius: 4, objectFit: 'cover' }}
                  preview={{ src: record.receiptImage.startsWith('http') ? record.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${record.receiptImage.startsWith('/') ? '' : '/'}${record.receiptImage}` }}
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
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`) :
              `https://img.vietqr.io/image/${dest.bankName}-${dest.accountNumber}-compact.png?accountName=${encodeURIComponent(dest.accountName)}`;
          } else {
            qrUrl = dest.qrCode ?
              (dest.qrCode.startsWith('http') ? dest.qrCode : `${api.defaults.baseURL?.replace(/\/api$/, '')}${dest.qrCode.startsWith('/') ? '' : '/'}${dest.qrCode}`) :
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
      fixed: 'right' as const,
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
      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Content style={{ margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              overflowY: 'auto',
            }}
          >
            {activeTab === 'wallet' && (
              <>
                <Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>Quản lý Nạp / Rút</Title>
                <Table
                  columns={columns}
                  dataSource={transactions}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                  scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
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
                      <p><strong>Số tiền:</strong> {currentRecord.paymentMethod === 'binance' && currentRecord.destinationInfo?.amountUsdt ? `${currentRecord.destinationInfo.amountUsdt.toLocaleString()} USDT` : `${currentRecord.amount?.toLocaleString()} đ`}</p>
                      <p><strong>Cổng nạp:</strong> {currentRecord.paymentMethod === 'manual' ? 'Ngân hàng' : currentRecord.paymentMethod === 'scratch' ? 'Thẻ cào' : currentRecord.paymentMethod?.toUpperCase()}</p>
                      
                      {currentRecord.destinationInfo && currentRecord.paymentMethod === 'scratch' && (
                        <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                          <p style={{ margin: 0 }}><strong>Nhà mạng:</strong> {currentRecord.destinationInfo.network}</p>
                          <p style={{ margin: 0 }}><strong>Seri:</strong> {currentRecord.destinationInfo.seri}</p>
                          <p style={{ margin: 0 }}><strong>PIN:</strong> {currentRecord.destinationInfo.pin}</p>
                        </div>
                      )}

                      {currentRecord.receiptImage && (
                        <div style={{ marginTop: 12 }}>
                          <p><strong>Ảnh đính kèm:</strong></p>
                          <Image
                            width={200}
                            src={currentRecord.receiptImage.startsWith('http') ? currentRecord.receiptImage : `${api.defaults.baseURL?.replace(/\/api$/, '')}${currentRecord.receiptImage.startsWith('/') ? '' : '/'}${currentRecord.receiptImage}`}
                            alt="Biên lai / Thẻ cào"
                          />
                        </div>
                      )}

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
