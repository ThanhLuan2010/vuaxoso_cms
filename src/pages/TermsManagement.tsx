import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function TermsManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTermsPolicies();
  }, []);

  const fetchTermsPolicies = async () => {
    try {
      const { data } = await api.get('/settings/terms_policies');
      if (data) {
        form.setFieldsValue({ terms_policies: data });
      }
    } catch (error) {
      // Ignore 404
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await api.put('/settings/terms_policies', { value: values.terms_policies });
      message.success('Cập nhật Điều khoản hoạt động thành công');
    } catch (error) {
      message.error('Lỗi khi cập nhật điều khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>Điều khoản hoạt động</Title>
      
      <Card title="Cấu hình nội dung Điều khoản" style={{ maxWidth: 1000 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="terms_policies"
            label="Nội dung hiển thị trên Ứng dụng"
          >
            <Input.TextArea rows={15} placeholder="Nhập các quy định, điều khoản nạp rút, hướng dẫn chung..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Lưu nội dung
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
