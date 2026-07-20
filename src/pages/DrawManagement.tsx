import { PlusOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import api from '../services/api';

const { Title } = Typography;

export default function DrawManagement() {
  const [draws, setDraws] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterGameId, setFilterGameId] = useState<string | null>(null);

  const [form] = Form.useForm();

  const [editingDrawId, setEditingDrawId] = useState<string | null>(null);
  const [winningNumbersInput, setWinningNumbersInput] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [drawsRes, gamesRes] = await Promise.all([
        api.get('/draws/admin', { params: { page, limit: 10, gameId: filterGameId } }),
        api.get('/games')
      ]);
      if (drawsRes.data.data) {
        setDraws(drawsRes.data.data);
        setTotal(drawsRes.data.total);
      } else {
        // Fallback in case backend is not updated yet
        setDraws(drawsRes.data);
        setTotal(drawsRes.data.length);
      }
      setGames(gamesRes.data);
    } catch (error) {
      message.error('Lỗi lấy dữ liệu kỳ quay');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filterGameId]);

  const handleCreateDraw = async (values: any) => {
    try {
      await api.post('/draws/admin', {
        gameId: values.gameId,
        drawCode: values.drawCode,
        openTime: values.openTime.toISOString(),
        closeTime: values.closeTime.toISOString(),
      });
      message.success('Tạo kỳ quay thành công');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi tạo kỳ quay');
    }
  };

  const handleRandomize = (game: any) => {
    const nums = new Set<string>();
    let maxNum = 45;
    let reqCount = 6;
    
    if (!game) {
      // Fallback
    } else if (game.code === 'keno' || game.code === 'bao_keno' || game.code === 'clln_keno') {
      maxNum = 80;
      reqCount = 20;
    } else if (game.code === 'power_655') {
      maxNum = 55;
      reqCount = 6;
    } else if (game.code === 'mega_645') {
      maxNum = 45;
      reqCount = 6;
    } else if (game.code === 'lotto_535') {
      maxNum = 35;
      reqCount = 5;
    }
    // TODO: Add support for Max3D and Kien Thiet if needed

    while (nums.size < reqCount) {
      const rnd = Math.floor(Math.random() * maxNum) + 1;
      nums.add(rnd.toString().padStart(2, '0'));
    }
    
    const sortedNums = Array.from(nums).sort((a, b) => parseInt(a) - parseInt(b));
    setWinningNumbersInput(sortedNums.join(', '));
  };

  const handleSaveResult = async (id: string) => {
    try {
      const numbers = winningNumbersInput.split(',').map(n => n.trim()).filter(Boolean);
      await api.put(`/draws/admin/${id}/results`, { winningNumbers: numbers });
      message.success('Lưu kết quả thành công');
      setEditingDrawId(null);
      fetchData();
    } catch (error) {
      message.error('Lỗi lưu kết quả');
    }
  };

  const columns = [
    {
      title: 'Mã Kỳ',
      dataIndex: 'drawCode',
      key: 'drawCode',
      render: (text: string) => <strong style={{ color: '#dc2626' }}>{text}</strong>
    },
    {
      title: 'Game',
      key: 'game',
      render: (_: any, record: any) => record.game?.name
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_: any, record: any) => (
        <div style={{ fontSize: '13px', color: '#666' }}>
          <div><strong>Mở:</strong> {new Date(record.openTime).toLocaleString()}</div>
          <div><strong>Đóng:</strong> {new Date(record.closeTime).toLocaleString()}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'open') color = 'green';
        if (status === 'closed') color = 'red';
        if (status === 'completed') color = 'default';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Kết quả (Cập nhật)',
      key: 'result',
      render: (_: any, record: any) => {
        if (record.status === 'completed') {
          return (
            <div style={{ fontWeight: 'bold', color: '#dc2626', letterSpacing: 2, fontSize: 16 }}>
              {record.winningNumbers?.join(' ')}
            </div>
          );
        }

        if (editingDrawId === record._id) {
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="VD: 02, 15, 30..."
                value={winningNumbersInput}
                onChange={(e) => setWinningNumbersInput(e.target.value)}
              />
              <Space>
                <Button size="small" icon={<SyncOutlined />} onClick={() => handleRandomize(record.game)}>Random</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveResult(record._id)}>Lưu</Button>
                <Button size="small" type="text" onClick={() => setEditingDrawId(null)}>Hủy</Button>
              </Space>
            </Space>
          );
        }

        return (
          <Button
            type="link"
            onClick={() => {
              setEditingDrawId(record._id);
              setWinningNumbersInput('');
            }}
          >
            + Nhập kết quả
          </Button>
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý Kỳ quay (Draws)</Title>
        <div style={{ display: 'flex', gap: 16 }}>
          <Select
            placeholder="Lọc theo game..."
            style={{ width: 200 }}
            allowClear
            onChange={(val) => {
              setFilterGameId(val);
              setPage(1);
            }}
          >
            {games.map(g => (
              <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Mở kỳ quay mới
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={draws}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total: total,
          onChange: (newPage) => setPage(newPage),
          showSizeChanger: false
        }}
      />

      <Modal
        title="Mở kỳ quay mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDraw}
        >
          <Form.Item
            name="gameId"
            label="Loại Game"
            rules={[{ required: true, message: 'Vui lòng chọn game' }]}
          >
            <Select placeholder="Chọn game...">
              {games.map(g => (
                <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="drawCode"
            label="Mã kỳ (VD: #00742)"
            rules={[{ required: true, message: 'Vui lòng nhập mã kỳ' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="openTime"
            label="Mở bán lúc"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="closeTime"
            label="Kết thúc lúc"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Tạo mới</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
