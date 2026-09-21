import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, message, Space, Popconfirm, Modal, Form, Input, Image, Upload, Popover, Switch, InputNumber, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, MoreOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function GuideManagement() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const res = await api.get('/guides/admin');
      setGuides(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách hướng dẫn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const handleAdd = () => {
    setEditingGuide(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, iconType: 'X', order: 0 });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingGuide(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/guides/${id}`);
      message.success('Đã xoá hướng dẫn');
      fetchGuides();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi xoá hướng dẫn');
    }
  };

  const handleToggleActive = async (record: any, checked: boolean) => {
    try {
      await api.put(`/guides/${record._id}`, { isActive: checked });
      message.success('Cập nhật trạng thái thành công');
      fetchGuides();
    } catch (error: any) {
      message.error('Lỗi cập nhật trạng thái');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingGuide) {
        await api.put(`/guides/${editingGuide._id}`, values);
        message.success('Cập nhật thành công');
      } else {
        await api.post('/guides', values);
        message.success('Thêm mới thành công');
      }
      setIsModalVisible(false);
      fetchGuides();
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data.message || 'Có lỗi xảy ra');
      }
    }
  };

  const columns: any = [
    {
      fixed: 'left',
      title: 'Thứ tự',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: 'Icon',
      dataIndex: 'iconType',
      key: 'iconType',
      width: 100,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 120,
      render: (_: any, record: any) => (
        <Switch
          checked={record.isActive}
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Popover
          placement="left"
          trigger="click"
          content={
            <Space direction="vertical" size="small">
              <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)} block>Sửa</Button>
              <Popconfirm
                title="Bạn có chắc muốn xoá hướng dẫn này?"
                onConfirm={() => handleDelete(record._id)}
                okText="Xoá"
                cancelText="Huỷ"
              >
                <Button danger icon={<DeleteOutlined />} block>Xóa</Button>
              </Popconfirm>
            </Space>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Popover>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title style={{ marginTop: 0, marginBottom: 16 }} level={2}>Quản Lý Hướng Dẫn</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Thêm Hướng Dẫn
        </Button>
      </div>

      <Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}
        columns={columns}
        dataSource={guides}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingGuide ? 'Sửa Hướng Dẫn' : 'Thêm Hướng Dẫn'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: 8 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="subtitle"
            label="Phụ đề (Lịch quay)"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="iconType"
            label="Loại Icon"
            rules={[{ required: true, message: 'Vui lòng chọn Icon' }]}
          >
            <Select>
              <Select.Option value="X">Logo</Select.Option>
              <Select.Option value="KENO">KENO</Select.Option>
              <Select.Option value="MUACHUNG">MUA CHUNG</Select.Option>
              <Select.Option value="POWER">POWER 6/55</Select.Option>
              <Select.Option value="MEGA">MEGA 6/45</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung Hướng dẫn"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <Input.TextArea rows={8} placeholder="Nhập nội dung bài viết hướng dẫn..." />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="order"
              label="Thứ tự hiển thị"
            >
              <InputNumber min={0} />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Trạng thái"
              valuePropName="checked"
            >
              <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
