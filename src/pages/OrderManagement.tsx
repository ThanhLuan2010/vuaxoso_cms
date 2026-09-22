import { CameraOutlined, CheckCircleOutlined, MoreOutlined, UploadOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Divider, Input, message, Modal, Popover, Row, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

const { Title } = Typography;

interface Order {
  _id: string;
  orderId: string;
  gameType: string;
  playType?: string;
  drawId?: string;
  drawDate?: string;
  provinceName?: string;
  items?: Array<{
    id?: string;
    numbers: string[];
    cost: number;
  }>;
  numbers?: string[];
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

  const [arbitrageModalVisible, setArbitrageModalVisible] = useState(false);
  const [arbitrageResults, setArbitrageResults] = useState<any[]>([]);

  const [searchText, setSearchText] = useState('');
  const [minBet, setMinBet] = useState('');
  const [minWin, setMinWin] = useState('');

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

  const handleCheckArbitrage = () => {
    const groups: Record<string, { numbers: Set<string>, users: Map<string, any> }> = {};

    filteredOrders.forEach(order => {
      const province = order.provinceName || order.gameType;
      const draw = order.drawDate || order.drawId || 'unknown-draw';
      
      const processItems = (playType: string, nums: string[]) => {
        if (!nums || nums.length === 0) return;
        const numLen = nums[0].length;
        if (numLen < 2 || numLen > 4) return;
        
        const key = `${province}|${draw}|${playType}|len${numLen}`;
        if (!groups[key]) {
          groups[key] = { numbers: new Set(), users: new Map() };
        }
        
        nums.forEach(n => groups[key].numbers.add(n));
        
        if (order.user) {
          groups[key].users.set(order.user._id, order.user);
        }
      };

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const pt = order.playType || 'Vé cơ bản';
          processItems(pt, item.numbers);
        });
      } else if (order.numbers && order.numbers.length > 0) {
        processItems(order.playType || 'Vé cơ bản', order.numbers);
      }
    });

    const results: any[] = [];
    Object.keys(groups).forEach(key => {
      const g = groups[key];
      const parts = key.split('|');
      const province = parts[0];
      const draw = parts[1];
      const playType = parts[2];
      const len = parseInt(parts[3].replace('len', ''));
      
      let maxCount = 0;
      if (len === 2) maxCount = 100;
      if (len === 3) maxCount = 1000;
      if (len === 4) maxCount = 10000;
      
      if (maxCount > 0 && g.numbers.size === maxCount) {
        results.push({
          province,
          draw,
          playType,
          len,
          users: Array.from(g.users.values())
        });
      }
    });

    setArbitrageResults(results);
    setArbitrageModalVisible(true);
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/admin'); 
      const startDate = dayjs().subtract(2, 'month').startOf('day');
      const allOrders = res.data.filter((o: Order) => dayjs(o.createdAt).isAfter(startDate));

      const exportData = allOrders.map((o: Order) => {
        let count = 0;
        if (o.items && o.items.length > 0) {
          o.items.forEach((item: any) => count += item.numbers.length);
        } else if (o.numbers) {
          count = o.numbers.length;
        }
        const costPerNum = o.items && o.items.length > 0 ? o.items[0].cost : 0;

        const exportRow: any = {
          'Mã Đơn': o.orderId,
          'Khách Hàng': o.user?.name,
          'SĐT': o.user?.phone,
          'Tỉnh/Đài': o.provinceName || o.gameType,
          'Loại Cược': o.playType || 'Vé cơ bản',
          'Ngày Mua': dayjs(o.createdAt).format('DD/MM/YYYY HH:mm:ss'),
          'Số Con': count,
          'Tiền/1Con': costPerNum,
          'Tổng Tiền Cược': o.totalCost,
          'Tiền Thắng': o.prizeAmount || 0,
          'Trạng Thái': o.status === 'pending' ? 'Chờ KQ' : o.isWinner === true ? 'Thắng' : o.isWinner === false ? 'Thua' : o.status === 'cancelled' ? 'Đã huỷ' : 'Đã in',
        };
        
        let drawText = o.drawDate || o.drawId || '';
        if (drawText && drawText.length === 10 && drawText.includes('/')) {
          if (o.gameType === 'xsmn') drawText = `16:15:00 ${drawText}`;
          else if (o.gameType === 'xsmt') drawText = `17:15:00 ${drawText}`;
          else if (o.gameType === 'xsmb') drawText = `18:15:00 ${drawText}`;
        }
        
        exportRow['Ngày Xổ'] = drawText;
        return exportRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
      XLSX.writeFile(workbook, `Danh_sach_don_hang_${dayjs().format('DD_MM_YYYY')}.xlsx`);
    } catch (err) {
      console.error(err);
      message.error('Lỗi xuất dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    let match = true;
    if (searchText) {
      const txt = searchText.toLowerCase();
      const matchText = o.orderId.toLowerCase().includes(txt) 
        || o.user?.name?.toLowerCase().includes(txt) 
        || o.user?.phone?.includes(txt);
      if (!matchText) match = false;
    }
    if (minBet) {
      if (o.totalCost < Number(minBet)) match = false;
    }
    if (minWin) {
      if ((o.prizeAmount || 0) < Number(minWin)) match = false;
    }
    return match;
  });

  const columns: any = [
    {
      fixed: 'left',
      title: 'Khách hàng',
      key: 'user',
      render: (_: any, record: Order) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.user?.name}</div>
          <div style={{ color: 'gray', fontSize: 12 }}>{record.user?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Tỉnh/Đài',
      key: 'province',
      render: (_: any, record: Order) => <strong>{record.provinceName || record.gameType.toUpperCase()}</strong>,
    },
    {
      title: 'Mã vé cược',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (val: string) => <span style={{ color: '#1890ff' }}>{val}</span>,
    },
    {
      title: 'Loại cược',
      key: 'playType',
      render: (_: any, record: Order) => <Tag color="geekblue">{record.playType || 'Vé cơ bản'}</Tag>,
    },
    {
      title: 'Dãy số',
      key: 'numbers',
      render: (_: any, record: any) => {
        const renderNumbers = (nums: string[]) => {
          if (!nums || nums.length === 0) return null;
          if (nums.length <= 3) {
            return nums.map((n: string, i: number) => (
              <Tag key={i} color="blue" style={{ marginInlineEnd: 2 }}>{n}</Tag>
            ));
          }
          const displayNums = nums.slice(0, 3);
          const hiddenCount = nums.length - 3;
          return (
            <>
              {displayNums.map((n: string, i: number) => (
                <Tag key={i} color="blue" style={{ marginInlineEnd: 2 }}>{n}</Tag>
              ))}
              <Popover 
                content={<div style={{ maxWidth: 300, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{nums.map((n, i) => <Tag key={i} color="blue">{n}</Tag>)}</div>} 
                title="Tất cả số đã chọn"
              >
                <Tag color="cyan" style={{ cursor: 'pointer', marginInlineEnd: 2 }}>+ {hiddenCount} số nữa...</Tag>
              </Popover>
            </>
          );
        };

        if (record.items && record.items.length > 0) {
          const displayItems = record.items.slice(0, 5);
          const hiddenCount = record.items.length - displayItems.length;

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', maxHeight: 80, overflowY: 'auto' }}>
              {displayItems.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ marginRight: 4 }}>{item.id || String.fromCharCode(65 + idx)}:</strong>
                  {renderNumbers(item.numbers)}
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
            {renderNumbers(record.numbers)}
          </div>
        );
      },
    },
    {
      title: 'Số con',
      key: 'numCount',
      render: (_: any, record: Order) => {
        let count = 0;
        if (record.items && record.items.length > 0) {
          record.items.forEach(item => count += item.numbers.length);
        } else if (record.numbers) {
          count = record.numbers.length;
        }
        return <strong style={{ color: 'magenta' }}>{count}</strong>;
      },
    },
    {
      title: 'Số tiền/1con',
      key: 'costPerNum',
      render: (_: any, record: Order) => {
        if (record.items && record.items.length > 0) {
          return `${record.items[0].cost.toLocaleString('vi-VN')}đ`;
        }
        return '-';
      },
    },
    {
      title: 'Tiền cược (Tổng)',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val: number) => (
        <span style={{ color: 'red', fontWeight: 'bold' }}>
          {val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Tiền thắng',
      key: 'prizeAmount',
      render: (_: any, record: Order) => (
        <span style={{ color: record.isWinner ? '#52c41a' : 'gray', fontWeight: 'bold' }}>
          {record.isWinner && record.prizeAmount ? `${record.prizeAmount.toLocaleString('vi-VN')}đ` : (record.isWinner === false ? '0đ' : '-')}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: Order) => {
        if (record.isWinner === true) return <Tag color="green">Thắng</Tag>;
        if (record.isWinner === false) return <Tag color="red">Thua</Tag>;
        if (record.status === 'pending') return <Tag color="orange">Chờ kết quả</Tag>;
        if (record.status === 'completed') return <Tag color="cyan">Đã in</Tag>;
        return <Tag color="default">Đã huỷ</Tag>;
      },
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN'),
    },
    {
      title: 'Ngày xổ',
      key: 'drawDate',
      render: (_: any, record: Order) => {
        let text = record.drawDate || record.drawId || '-';
        if (text && text.length === 10 && text.includes('/')) {
          // This is likely a DD/MM/YYYY string for Kien Thiet
          if (record.gameType === 'xsmn') text = `16:15:00 ${text}`;
          else if (record.gameType === 'xsmt') text = `17:15:00 ${text}`;
          else if (record.gameType === 'xsmb') text = `18:15:00 ${text}`;
        }
        return text;
      },
    },
    {
      title: 'Kết quả',
      key: 'checkResult',
      render: (_: any, record: Order) => {
        if (record.isWinner !== undefined) {
          return <Button type="link" onClick={() => { setSelectedResultOrder(record); setResultModalVisible(true); }}>Bảng kết quả</Button>;
        }
        return <span style={{ color: 'gray' }}>Chưa có KQ</span>;
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, background: '#fff', padding: 16, borderRadius: 8 }}>
        <Input 
          placeholder="Tìm tên, SĐT, Mã vé..." 
          style={{ width: 200 }} 
          value={searchText} 
          onChange={e => setSearchText(e.target.value)} 
        />
        
        <Space>
          <span>Cược tối thiểu:</span>
          <Input 
            placeholder="Số tiền..." 
            style={{ width: 120 }} 
            value={minBet} 
            onChange={e => setMinBet(e.target.value)} 
          />
        </Space>

        <Space>
          <span>Thắng tối thiểu:</span>
          <Input 
            placeholder="Số tiền..." 
            style={{ width: 120 }} 
            value={minWin} 
            onChange={e => setMinWin(e.target.value)} 
          />
        </Space>

        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          style={{ backgroundColor: '#52c41a' }}
          onClick={handleExportExcel}
          loading={loading}
        >
          Xuất dữ liệu (Max 2 tháng)
        </Button>

        <Button 
          type="primary" 
          danger
          icon={<WarningOutlined />} 
          onClick={handleCheckArbitrage}
        >
          Check đối nghịch
        </Button>
      </div>

      <Table scroll={{ y: 'calc(100vh - 350px)', x: 'max-content' }}
        columns={columns}
        dataSource={filteredOrders}
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

      <Modal
        title="Kết quả Check Đối Nghịch (Xả Kèo)"
        open={arbitrageModalVisible}
        onCancel={() => setArbitrageModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setArbitrageModalVisible(false)}>Đóng</Button>
        ]}
        width={700}
      >
        {arbitrageResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'green', fontSize: '16px' }}>
            <CheckCircleOutlined style={{ fontSize: '32px', marginBottom: '10px' }} /><br />
            Không phát hiện trường hợp đối nghịch (bao hết số) nào.
          </div>
        ) : (
          <div>
            <Typography.Paragraph type="danger">
              Phát hiện {arbitrageResults.length} nhóm cược có dấu hiệu bao hết toàn bộ các bộ số!
            </Typography.Paragraph>
            {arbitrageResults.map((res, index) => (
              <Card key={index} size="small" style={{ marginBottom: 10, borderColor: '#ffa39e', backgroundColor: '#fff1f0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  [{res.province}] - {res.draw}
                </div>
                <div>Loại cược: <Tag color="red">{res.playType}</Tag> (Gồm {res.len === 2 ? '100' : res.len === 3 ? '1000' : '10000'} số)</div>
                <div style={{ marginTop: 8 }}>
                  <strong>Danh sách User tham gia (Nhóm cược chéo):</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 4, marginBottom: 0 }}>
                    {res.users.map((u: any, i: number) => (
                      <li key={i}>{u.name} - {u.phone}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
