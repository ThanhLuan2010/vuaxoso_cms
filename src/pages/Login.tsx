import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setError('');
    setLoading(true);
    try {
      const { success, message } = await login(values.phone, values.password);
      if (success) {
        navigate('/');
      } else {
        setError(message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#dc2626', margin: 0 }}>VUA XỔ SỐ</Title>
          <Typography.Text type="secondary">Hệ thống quản trị CMS</Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="phone"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Số điện thoại (Admin)" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
}
