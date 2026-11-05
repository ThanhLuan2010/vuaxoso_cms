import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Table, Button, Space, Form, Input, Select, Modal, Switch, message, InputNumber, Radio, Checkbox, Card, Tag, Typography, Popover } from 'antd';
import { EditOutlined, MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import { isDerived3MienGame } from '../utils/gameUtils';

export default function GameManagement() {
  const [games, setGames] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [scheduleMode, setScheduleMode] = useState('none');

  const [form] = Form.useForm();

  const fetchGames = async (search = '') => {
    try {
      setLoading(true);
      const { data } = await api.get('/games', { params: { search, admin: 'true' } });
      const gamesList = [...data];
      const hasLode = gamesList.some((g: any) => g.code === 'xoso_3mien');
      if (!hasLode && (!search || 'lô đề 3 miền'.includes(search.toLowerCase()) || 'xoso_3mien'.includes(search.toLowerCase()))) {
        gamesList.push({
          _id: 'xoso_3mien_default',
          code: 'xoso_3mien',
          name: 'LÔ ĐỀ 3 MIỀN',
          type: 'lode',
          brandColor: '#E51F27',
          bgColor: '#FCE8EA',
          badge: 'Đủ 3 Miền',
          cronExpression: '',
          drawDurationMinutes: 0,
          isActive: true
        });
      }
      setGames(gamesList);
    } catch (error) {
      message.error('Lỗi lấy danh sách game');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingId(null);
    setEditingGame(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const isLode = isDerived3MienGame(editingGame) || isDerived3MienGame({ code: values.code });
      let finalCron = '';
      if (isLode) {
        finalCron = '';
        values.drawDurationMinutes = 0;
      } else if (values.scheduleMode === 'interval') {
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

      if (editingId && editingId !== 'xoso_3mien_default') {
        await api.put(`/games/${editingId}`, payload);
        message.success('Cập nhật game thành công');
      } else {
        await api.post('/games', payload);
        message.success('Cập nhật game thành công');
      }
      closeModal();
      fetchGames();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Lỗi xử lý');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (record: any) => {
    setEditingId(record._id);
    setEditingGame(record);

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
      badge: record.badge || '',
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
      filters: [
        { text: 'VIETLOTT', value: 'vietlott' },
        { text: 'DIENTOAN', value: 'dientoan' },
        { text: 'KIENTHIET', value: 'kienthiet' },
        { text: 'LÔ ĐỀ', value: 'lode' },
      ],
      onFilter: (value: any, record: any) => record.type === value,
      render: (type: string) => {
        const colors: any = { vietlott: 'red', dientoan: 'blue', kienthiet: 'green', lode: 'purple' };
        const labels: any = { vietlott: 'VIETLOTT', dientoan: 'DIENTOAN', kienthiet: 'KIENTHIET', lode: 'LÔ ĐỀ' };
        return <Tag color={colors[type] || 'default'}>{labels[type] || (type || '').toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Lịch tự động (Cron)',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      render: (text: string, record: any) => {
          if (isDerived3MienGame(record)) {
            return <Tag color="blue">Theo lịch Kiến Thiết</Tag>;
          }
          return text ? <code>{text}</code> : <span style={{ color: '#999' }}>Không có</span>;
        }
      },
    {
      title: 'Thời gian 1 kỳ',
      dataIndex: 'drawDurationMinutes',
      key: 'drawDurationMinutes',
      render: (val: number, record: any) => {
          if (isDerived3MienGame(record)) {
            return <Tag color="orange">Theo lịch quay Kiến Thiết</Tag>;
          }
          return (val && val > 0 && (record.code || '').toLowerCase().includes('keno')) ? `${val} phút` : <Tag color="orange">Theo lịch quay</Tag>;
        }
      },
    {
      title: 'Huy hiệu (Nút xanh)',
      dataIndex: 'badge',
      key: 'badge',
      render: (val: string) => val ? (
        <Tag color="#00A859" style={{ borderRadius: 8, fontWeight: 'bold' }}>{val}</Tag>
      ) : <span style={{ color: '#ccc' }}>-</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      filters: [
        { text: 'Đang bật', value: true },
        { text: 'Đã tắt', value: false },
      ],
      onFilter: (value: any, record: any) => !!record.isActive === value,
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
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} block>Sửa</Button>
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      )
    }
  ];

  const isLodeEditing = isDerived3MienGame(editingGame);

  const filteredGames = useMemo(() => {
    return games.filter(g => {
      if (typeFilter !== 'all' && g.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !g.isActive) return false;
        if (statusFilter === 'inactive' && g.isActive) return false;
      }
      return true;
    });
  }, [games, typeFilter, statusFilter]);

  return (
    <div className="cms-page-container">
      <div className="cms-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Quản lý Danh sách Game</h2>
      </div>

      <div className="cms-filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8 }}>
        <Input.Search
          placeholder="Tìm theo Tên game, Mã game..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => fetchGames(value)}
          style={{ width: 260 }}
        />

        <Space size="small">
          <span style={{ fontWeight: 500, fontSize: 13 }}>Phân loại:</span>
          <Select
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            style={{ width: 140 }}
            options={[
              { label: 'Tất cả loại', value: 'all' },
              { label: 'VIETLOTT', value: 'vietlott' },
              { label: 'DIENTOAN', value: 'dientoan' },
              { label: 'KIENTHIET', value: 'kienthiet' },
              { label: 'LÔ ĐỀ', value: 'lode' },
            ]}
          />
        </Space>

        <Space size="small">
          <span style={{ fontWeight: 500, fontSize: 13 }}>Trạng thái:</span>
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            style={{ width: 130 }}
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: 'Đang bật', value: 'active' },
              { label: 'Đã tắt', value: 'inactive' },
            ]}
          />
        </Space>

        {(searchText || typeFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText('');
              setTypeFilter('all');
              setStatusFilter('all');
              fetchGames('');
            }}
            style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <Table
        className="cms-table-fill"
        scroll={{ y: '100%', x: 'max-content' }}
        columns={columns}
        dataSource={filteredGames}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingGame?.name ? `Cập nhật Game: ${editingGame.name}` : (editingId ? "Cập nhật Game" : "Thêm Game mới")}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          {isLodeEditing ? (
            <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Typography.Text strong style={{ color: '#389e0d', fontSize: 14 }}>
                  ℹ️ Lịch mở thưởng tự động theo Xổ Số Kiến Thiết 3 Miền
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Trò chơi này ăn theo kết quả Xổ Số Kiến Thiết 3 Miền nên không cần cài đặt lịch quay độc lập. Trò chơi tự động lấy lịch quay và kết quả từ 3 đài Kiến Thiết tương ứng:
                </Typography.Text>
                <div style={{ marginLeft: 16, fontSize: 13, color: '#333', lineHeight: 1.8 }}>
                  <div>• <strong>Miền Nam (MN):</strong> Chốt vé 16:10 — Xổ thưởng 16:15</div>
                  <div>• <strong>Miền Trung (MT):</strong> Chốt vé 17:10 — Xổ thưởng 17:15</div>
                  <div>• <strong>Miền Bắc (MB):</strong> Chốt vé 18:10 — Xổ thưởng 18:15</div>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
                  * Kết quả mở thưởng và tính trúng/thua tự động dò theo kết quả xổ số của các tỉnh thành trong ngày.
                </Typography.Text>
              </Space>
            </Card>
          ) : (
            <>
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
            </>
          )}

          <Form.Item
            name="badge"
            label="Huy hiệu nhỏ góc phải (Nút xanh)"
            extra="Hiển thị nút xanh nhỏ góc trên bên phải thẻ Game trên app (VD: Mỗi ngày, Hôm nay xổ, 8p-1 kỳ, T4 & T7, 10p-1 kỳ...)"
          >
            <Input placeholder="Ví dụ: Mỗi ngày, Hôm nay xổ, T2-T7..." allowClear />
          </Form.Item>
          <div style={{ marginBottom: 16, marginTop: -8 }}>
            <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>Gợi ý nhanh:</span>
            {['Mỗi ngày', 'Hôm nay xổ', '8p-1 kỳ', '10p-1 kỳ', 'T4 & T7', 'T3, T5, T7', 'T2, T4, T6', 'T3 & T6'].map((tag) => (
              <Tag
                key={tag}
                color="green"
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={() => form.setFieldsValue({ badge: tag })}
              >
                + {tag}
              </Tag>
            ))}
          </div>

          <Form.Item
            name="subtext"
            label="Dòng chữ nổi bật (Kéo khách)"
            extra="Hiển thị dưới cùng của thẻ Game (VD: 🏆 2.000.000.000đ hoặc Chọn nhanh - Trúng lớn)"
          >
            <Input placeholder="Ví dụ: 🏆 2.000.000.000đ" />
          </Form.Item>

          {!isLodeEditing && (
            <Form.Item
              name="riggedResult"
              label="Kết quả thao túng cho kỳ tới"
              extra="Nhập các số trúng thưởng cách nhau bởi dấu phẩy (VD: 01, 15, 20). Hệ thống sẽ dùng số này cho kỳ quay ngay tiếp theo rồi tự xóa."
            >
              <Input placeholder="Ví dụ: 01, 15, 20, 25, 30, 45" />
            </Form.Item>
          )}

          <div style={{ display: 'flex', gap: 32 }}>
            <Form.Item name="isActive" label="Cho phép hiển thị/mua" valuePropName="checked">
              <Switch />
            </Form.Item>
            {!isLodeEditing && (
              <Form.Item name="autoRandomResult" label="Tự động sinh kết quả" valuePropName="checked" extra="Áp dụng khi không thao túng">
                <Switch />
              </Form.Item>
            )}
          </div>

          <Form.Item style={{ textAlign: 'right', margin: 0 }}>
            <Space>
              <Button onClick={closeModal} disabled={submitting}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>Lưu lại</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
