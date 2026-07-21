import { useEffect, useState } from 'react';
import api from '../services/api';
import { Table, Tag, Button, Space, Form, Input, Select, Modal, Switch, message, InputNumber, Radio, Checkbox, Card } from 'antd';
import { EditOutlined } from '@ant-design/icons';

export default function GameManagement() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState('none');

  const [form] = Form.useForm();

  const fetchGames = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/games');
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
        await api.put(`/games/admin/${editingId}`, payload);
        message.success('Cập nhật game thành công');
      } else {
        await api.post('/games/admin', payload);
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
    let days = ['1','2','3','4','5','6','0'];
    
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

  const columns = [
    {
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
      render: (val: number) => val ? `${val} phút` : '-'
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
      key: 'action',
      render: (_: any, record: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Sửa</Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Quản lý Danh sách Game</h2>
      </div>

      <Table 
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
    </div>
  );
}
