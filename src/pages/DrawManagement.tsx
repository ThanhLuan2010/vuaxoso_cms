import { PlusOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function DrawManagement() {
  const [draws, setDraws] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterGameId, setFilterGameId] = useState<string | null>(null);

  const [form] = Form.useForm();
  const [ktForm] = Form.useForm();

  const [editingDrawId, setEditingDrawId] = useState<string | null>(null);
  const [winningNumbersInput, setWinningNumbersInput] = useState('');

  const [isKienThietModalOpen, setIsKienThietModalOpen] = useState(false);
  const [currentKienThietDraw, setCurrentKienThietDraw] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [drawsRes, gamesRes, provsRes] = await Promise.all([
        api.get('/draws/admin', { params: { page, limit: 10, gameId: filterGameId } }),
        api.get('/games'),
        api.get('/provinces')
      ]);
      if (drawsRes.data.data) {
        setDraws(drawsRes.data.data);
        setTotal(drawsRes.data.total);
      } else {
        setDraws(drawsRes.data);
        setTotal(drawsRes.data.length);
      }
      setGames(gamesRes.data);
      setProvinces(provsRes.data);
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
        provinceId: values.provinceId
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

  const handleSaveKienThietResult = async (values: any) => {
    try {
      const gameCode = currentKienThietDraw?.game?.code;
      let numbers: string[] = [];
      if (gameCode === 'MB') {
        numbers = [
          values.gdb,
          values.g1,
          values.g2_1, values.g2_2,
          values.g3_1, values.g3_2, values.g3_3, values.g3_4, values.g3_5, values.g3_6,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4,
          values.g5_1, values.g5_2, values.g5_3, values.g5_4, values.g5_5, values.g5_6,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7_1, values.g7_2, values.g7_3, values.g7_4,
        ];
      } else {
        numbers = [
          values.gdb,
          values.g1,
          values.g2,
          values.g3_1, values.g3_2,
          values.g4_1, values.g4_2, values.g4_3, values.g4_4, values.g4_5, values.g4_6, values.g4_7,
          values.g5,
          values.g6_1, values.g6_2, values.g6_3,
          values.g7,
          values.g8,
        ];
      }

      numbers = numbers.map(n => (n || '').trim()).filter(Boolean);

      await api.put(`/draws/admin/${currentKienThietDraw._id}/results`, {
        winningNumbers: numbers,
        provinceId: values.provinceId
      });
      message.success('Lưu kết quả thành công');
      setIsKienThietModalOpen(false);
      ktForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi lưu kết quả');
    }
  };

  const columns: any = [
    {
      fixed: 'left',
      title: 'Mã Kỳ',
      dataIndex: 'drawCode',
      key: 'drawCode',
      render: (text: string) => <strong style={{ color: '#dc2626' }}>{text}</strong>
    },
    {
      title: 'Game',
      key: 'game',
      render: (_: any, record: any) => {
        const prov = provinces.find(p => p.provinceId === record.provinceId);
        return (
          <div>
            <div>{record.game?.name}</div>
            {prov && <div style={{ fontSize: 12, color: '#888' }}>{prov.name}</div>}
          </div>
        );
      }
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
              if (['MB', 'MT', 'MN'].includes(record.game?.code)) {
                setCurrentKienThietDraw(record);
                ktForm.resetFields();
                setIsKienThietModalOpen(true);
              } else {
                setEditingDrawId(record._id);
                setWinningNumbersInput('');
              }
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
        <Title style={{ marginTop: 0, marginBottom: 16 }} level={3} >Quản lý Kỳ quay (Draws)</Title>
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

      <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
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
            <Select
              placeholder="Chọn game..."
              onChange={(value) => {
                const game = games.find(g => g._id === value);
                if (game) {
                  const now = dayjs();
                  let closeTime = null;
                  if (game.code === 'MB') {
                    closeTime = now.hour(18).minute(15).second(0);
                  } else if (game.code === 'MT') {
                    closeTime = now.hour(17).minute(15).second(0);
                  } else if (game.code === 'MN') {
                    closeTime = now.hour(16).minute(15).second(0);
                  }

                  if (closeTime) {
                    form.setFieldsValue({
                      openTime: now,
                      closeTime: closeTime
                    });
                  }
                }
              }}
            >
              {games.map(g => (
                <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.gameId !== currentValues.gameId}
          >
            {({ getFieldValue }) => {
              const gameId = getFieldValue('gameId');
              const game = games.find(g => g._id === gameId);
              if (game && ['MB', 'MT', 'MN'].includes(game.code)) {
                return (
                  <Form.Item
                    name="provinceId"
                    label="Tỉnh/Đài"
                    rules={[{ required: true, message: 'Vui lòng chọn đài' }]}
                  >
                    <Select placeholder="Chọn đài...">
                      {provinces.filter(p => p.region === game.code).map(p => (
                        <Select.Option key={p._id} value={p.provinceId}>{p.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
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

      <Modal
        title={`Nhập kết quả ${currentKienThietDraw?.game?.name || ''} ${currentKienThietDraw?.provinceId ? `- Đài ${provinces.find(p => p.provinceId === currentKienThietDraw.provinceId)?.name}` : ''}`}
        open={isKienThietModalOpen}
        onCancel={() => setIsKienThietModalOpen(false)}
        footer={null}
        width={700}
        centered
        styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' } }}
      >
        <Form
          form={ktForm}
          layout="vertical"
          onFinish={handleSaveKienThietResult}
        >
          {!currentKienThietDraw?.provinceId && ['MT', 'MN'].includes(currentKienThietDraw?.game?.code) && (
            <Form.Item
              name="provinceId"
              label="Tỉnh/Đài"
              rules={[{ required: true, message: 'Vui lòng chọn đài' }]}
            >
              <Select placeholder="Chọn đài...">
                {provinces.filter(p => p.region === currentKienThietDraw.game.code).map(p => (
                  <Select.Option key={p._id} value={p.provinceId}>{p.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {currentKienThietDraw?.game?.code === 'MB' ? (
            <>
              <Title level={5}>Đặc biệt</Title>
              <Form.Item name="gdb"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

              <Title level={5}>Giải Nhất</Title>
              <Form.Item name="g1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

              <Title level={5}>Giải Nhì</Title>
              <Space wrap><Form.Item name="g2_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item><Form.Item name="g2_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item></Space>

              <Title level={5}>Giải Ba</Title>
              <Space wrap>
                <Form.Item name="g3_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_3"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
                <Form.Item name="g3_4"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_5"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g3_6"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
              </Space>

              <Title level={5}>Giải Tư</Title>
              <Space wrap>
                <Form.Item name="g4_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_4"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
              </Space>

              <Title level={5}>Giải Năm</Title>
              <Space wrap>
                <Form.Item name="g5_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
                <Form.Item name="g5_4"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_5"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g5_6"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item>
              </Space>

              <Title level={5}>Giải Sáu</Title>
              <Space wrap><Form.Item name="g6_1"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_2"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_3"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item></Space>

              <Title level={5}>Giải Bảy</Title>
              <Space wrap><Form.Item name="g7_1"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_2"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_3"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item><Form.Item name="g7_4"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item></Space>
            </>
          ) : (
            <>
              <Title level={5}>Giải Tám</Title>
              <Form.Item name="g8"><Input placeholder="2 chữ số" maxLength={2} style={{ width: 100 }} /></Form.Item>

              <Title level={5}>Giải Bảy</Title>
              <Form.Item name="g7"><Input placeholder="3 chữ số" maxLength={3} style={{ width: 100 }} /></Form.Item>

              <Title level={5}>Giải Sáu</Title>
              <Space wrap><Form.Item name="g6_1"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_2"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item><Form.Item name="g6_3"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 100 }} /></Form.Item></Space>

              <Title level={5}>Giải Năm</Title>
              <Form.Item name="g5"><Input placeholder="4 chữ số" maxLength={4} style={{ width: 120 }} /></Form.Item>

              <Title level={5}>Giải Tư</Title>
              <Space wrap>
                <Form.Item name="g4_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_3"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_4"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
                <Form.Item name="g4_5"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_6"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item><Form.Item name="g4_7"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 100 }} /></Form.Item>
              </Space>

              <Title level={5}>Giải Ba</Title>
              <Space wrap><Form.Item name="g3_1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item><Form.Item name="g3_2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 120 }} /></Form.Item></Space>

              <Title level={5}>Giải Nhì</Title>
              <Form.Item name="g2"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

              <Title level={5}>Giải Nhất</Title>
              <Form.Item name="g1"><Input placeholder="5 chữ số" maxLength={5} style={{ width: 150 }} /></Form.Item>

              <Title level={5}>Đặc biệt</Title>
              <Form.Item name="gdb"><Input placeholder="6 chữ số" maxLength={6} style={{ width: 150 }} /></Form.Item>
            </>
          )}

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsKienThietModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lưu Kết Quả</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
