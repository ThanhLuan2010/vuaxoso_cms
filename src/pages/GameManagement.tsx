import { useEffect, useState } from 'react';
import api from '../services/api';
import { Table, Button, Space, Drawer, Form, Input, Select, Modal, Switch, message, InputNumber, Radio, Checkbox, Card, Tag, Typography, Popover } from 'antd';
import { EditOutlined, MoreOutlined, PercentageOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export default function GameManagement() {
  const [games, setGames] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState('none');
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [selectedGameForRates, setSelectedGameForRates] = useState<any>(null);
  const [editingRates, setEditingRates] = useState<{ key: string; value: number }[]>([]);
  const [newRateKey, setNewRateKey] = useState('');
  const [newRateVal, setNewRateVal] = useState<number | null>(null);
  const [savingRates, setSavingRates] = useState(false);

  const openRatesModal = (game: any) => {
    setSelectedGameForRates(game);
    const rates = game.payoutRates || {};
    const list = Object.entries(rates).map(([k, v]) => ({ key: k, value: Number(v) }));
    setEditingRates(list);
    setNewRateKey('');
    setNewRateVal(null);
    setRatesModalOpen(true);
  };

  const handleSaveRates = async () => {
    if (!selectedGameForRates) return;
    setSavingRates(true);
    try {
      const ratesObj: Record<string, number> = {};
      editingRates.forEach(item => {
        if (item.key.trim()) {
          ratesObj[item.key.trim()] = item.value;
        }
      });
      await api.put(`/games/${selectedGameForRates._id}/rates`, { rates: ratesObj });
      message.success('Cập nhật tỉ lệ cược thành công!');
      setRatesModalOpen(false);
      fetchGames();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi lưu tỉ lệ cược');
    } finally {
      setSavingRates(false);
    }
  };

  const handleAddRateItem = () => {
    if (!newRateKey.trim()) {
      message.warning('Vui lòng nhập tên loại cược!');
      return;
    }
    if (newRateVal === null || isNaN(newRateVal)) {
      message.warning('Vui lòng nhập tỉ lệ hợp lệ!');
      return;
    }
    setEditingRates([...editingRates, { key: newRateKey.trim(), value: newRateVal }]);
    setNewRateKey('');
    setNewRateVal(null);
  };

  const [form] = Form.useForm();

  const fetchGames = async (search = '') => {
    try {
      setLoading(true);
      const { data } = await api.get('/games', { params: { search, admin: 'true' } });
      setGames(data);
    } catch (error) {
      message.error('Lỗi lấy danh sách game');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      let finalCron = '';
      if (values.scheduleMode === 'interval') {
        finalCron = `*/${values.intervalMins || 10} * * * *`;
      } else if (values.scheduleMode === 'daily') {
        finalCron = `${parseInt(values.minute)} ${parseInt(values.hour)} * * *`;
      } else if (values.scheduleMode === 'weekly') {
        const d = (values.days && values.days.length > 0) ? values.days.join(',') : '*';
        finalCron = `${parseInt(values.minute)} ${parseInt(values.hour)} * * ${d}`;
      }

      const payload = {
        ...values,
        cronExpression: finalCron
      };

      if (editingId) {
        await api.put(`/games/${editingId}`, payload);
        message.success('Cập nhật game thành công');
      } else {
        await api.post('/games', payload);
        message.success('Thêm game thành công');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchGames();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const openEdit = (record: any) => {
    setEditingId(record._id);

    let mode = 'none';
    let intervalMins = 10;
    let hour = '18';
    let minute = '00';
    let days = ['1', '2', '3', '4', '5', '6', '0'];

    const cron = record.cronExpression;
    if (cron) {
      if (cron.startsWith('*/') && cron.endsWith('* * * *')) {
        mode = 'interval';
        intervalMins = parseInt(cron.split(' ')[0].replace('*/', ''));
      } else {
        const parts = cron.split(' ');
        if (parts.length === 5) {
          minute = parts[0].padStart(2, '0');
          hour = parts[1].padStart(2, '0');
          if (parts[4] === '*') {
            mode = 'daily';
          } else {
            mode = 'weekly';
            days = parts[4].split(',');
          }
        }
      }
    }

    setScheduleMode(mode);
    form.setFieldsValue({
      ...record,
      scheduleMode: mode,
      intervalMins,
      hour,
      minute,
      days
    });
    setIsModalOpen(true);
  };

  const columns: any = [
    {
      fixed: 'left',
      title: 'Mã Game',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Tên Game',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phân loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colors: any = { vietlott: 'red', dientoan: 'blue', kienthiet: 'green' };
        return <Tag color={colors[type] || 'default'}>{type.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Lịch tự động (Cron)',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      render: (text: string) => text ? <code>{text}</code> : <span style={{ color: '#999' }}>Không có</span>
    },
    {
      title: 'Thời gian 1 kỳ',
      dataIndex: 'drawDurationMinutes',
      key: 'drawDurationMinutes',
      render: (val: number, record: any) => (val && val > 0 && (record.code || '').toLowerCase().includes('keno')) ? `${val} phút` : <Tag color="orange">Theo lịch quay</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Đang bật' : 'Đã tắt'}</Tag>
      )
    },
    {
      title: 'Hành động',
      fixed: 'right',
      key: 'action',
      render: (_: any, record: any) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} block>Sửa cấu hình</Button>
              <Button size="small" icon={<PercentageOutlined />} onClick={() => openRatesModal(record)} block style={{ color: '#0084FA' }}>Tỉ lệ cược</Button>
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Quản lý Danh sách Game</h2>
        <Input.Search
          placeholder="Tìm theo Tên game, Mã game..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => fetchGames(value)}
          style={{ width: 300 }}
        />
      </div>

      <Table 
        style={{ flex: 1 }}
        scroll={{ y: 'calc(100vh - 260px)', x: 'max-content' }}
        columns={columns}
        dataSource={games}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingId ? "Cập nhật Game" : "Thêm Game mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          <Card size="small" title="Cấu hình lịch mở thưởng tự động" style={{ marginBottom: 16 }}>
            <Form.Item name="scheduleMode" style={{ marginBottom: 16 }}>
              <Radio.Group onChange={(e) => setScheduleMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="interval">Chạy liên tục (cách nhau X phút)</Radio>
                  <Radio value="daily">Chạy hàng ngày vào giờ cố định</Radio>
                  <Radio value="weekly">Chạy vào các ngày nhất định trong tuần</Radio>
                  <Radio value="none">Tắt mở thưởng tự động</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            {scheduleMode === 'interval' && (
              <Form.Item name="intervalMins" label="Cứ sau bao nhiêu phút thì mở 1 kỳ mới?" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            )}

            {(scheduleMode === 'daily' || scheduleMode === 'weekly') && (
              <div style={{ display: 'flex', gap: 16, marginBottom: scheduleMode === 'weekly' ? 16 : 0 }}>
                <Form.Item name="hour" label="Giờ" style={{ flex: 1, margin: 0 }}>
                  <Select>
                    {Array.from({ length: 24 }, (_, i) => (
                      <Select.Option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="minute" label="Phút" style={{ flex: 1, margin: 0 }}>
                  <Select>
                    {Array.from({ length: 60 }, (_, i) => (
                      <Select.Option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            )}

            {scheduleMode === 'weekly' && (
              <Form.Item name="days" label="Chọn các ngày trong tuần" style={{ marginBottom: 0 }}>
                <Checkbox.Group options={[
                  { label: 'T2', value: '1' },
                  { label: 'T3', value: '2' },
                  { label: 'T4', value: '3' },
                  { label: 'T5', value: '4' },
                  { label: 'T6', value: '5' },
                  { label: 'T7', value: '6' },
                  { label: 'CN', value: '0' },
                ]} />
              </Form.Item>
            )}
          </Card>

          <Form.Item
            name="drawDurationMinutes"
            label="Thời lượng 1 kỳ (Phút)"
            extra="Sau bao lâu kể từ lúc mở thì sẽ đóng kỳ quay?"
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="subtext"
            label="Dòng chữ nổi bật (Kéo khách)"
            extra="Hiển thị dưới cùng của thẻ Game (VD: 🏆 2.000.000.000đ hoặc Chọn nhanh - Trúng lớn)"
          >
            <Input placeholder="Ví dụ: 🏆 2.000.000.000đ" />
          </Form.Item>

          <Form.Item
            name="riggedResult"
            label="Kết quả thao túng cho kỳ tới"
            extra="Nhập các số trúng thưởng cách nhau bởi dấu phẩy (VD: 01, 15, 20). Hệ thống sẽ dùng số này cho kỳ quay ngay tiếp theo rồi tự xóa."
          >
            <Input placeholder="Ví dụ: 01, 15, 20, 25, 30, 45" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 32 }}>
            <Form.Item name="isActive" label="Cho phép hiển thị/mua" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="autoRandomResult" label="Tự động sinh kết quả" valuePropName="checked" extra="Áp dụng khi không thao túng">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item style={{ textAlign: 'right', margin: 0 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lưu lại</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Cấu hình Tỉ lệ Cược */}
      <Modal
        title={
          <div>
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>Cấu hình Tỉ lệ Cược: </span>
            <Tag color="blue" style={{ fontSize: 14 }}>{selectedGameForRates?.name} ({selectedGameForRates?.code})</Tag>
          </div>
        }
        open={ratesModalOpen}
        onCancel={() => setRatesModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setRatesModalOpen(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={savingRates} onClick={handleSaveRates}>
            Lưu tỉ lệ cược
          </Button>
        ]}
      >
        <div style={{ maxHeight: 450, overflowY: 'auto', paddingRight: 8 }}>
          {editingRates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8c8c8c' }}>
              Chưa có cấu hình tỉ lệ cho game này. Bạn có thể thêm bên dưới!
            </div>
          ) : (
            <Table
              pagination={false}
              size="small"
              dataSource={editingRates}
              rowKey="key"
              columns={[
                {
                  title: 'Loại cược / Cửa cược',
                  dataIndex: 'key',
                  key: 'key',
                  render: (key: string) => <strong>{key}</strong>
                },
                {
                  title: 'Tỉ lệ ăn (Hệ số nhân)',
                  dataIndex: 'value',
                  key: 'value',
                  width: 200,
                  render: (val: number, _: any, index: number) => (
                    <InputNumber
                      min={0}
                      step={0.1}
                      value={val}
                      style={{ width: '100%' }}
                      addonBefore="1 ăn"
                      onChange={(newVal) => {
                        const updated = [...editingRates];
                        updated[index].value = Number(newVal) || 0;
                        setEditingRates(updated);
                      }}
                    />
                  )
                },
                {
                  title: '',
                  key: 'action',
                  width: 50,
                  render: (_: any, __: any, index: number) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setEditingRates(editingRates.filter((_, idx) => idx !== index));
                      }}
                    />
                  )
                }
              ]}
            />
          )}

          <Card size="small" title="Thêm loại cược mới" style={{ marginTop: 16, backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Input
                placeholder="Tên loại cược (VD: Xiên ĐB, Đề giải 1)"
                value={newRateKey}
                onChange={(e) => setNewRateKey(e.target.value)}
                style={{ flex: 2 }}
              />
              <InputNumber
                placeholder="Tỉ lệ (VD: 4.8)"
                value={newRateVal}
                onChange={(v) => setNewRateVal(v)}
                min={0}
                step={0.1}
                style={{ flex: 1 }}
              />
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddRateItem}>
                Thêm
              </Button>
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
