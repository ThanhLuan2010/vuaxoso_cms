import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Modal } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredModalVisible, setExpiredModalVisible] = useState(false);
  const [expiredPhone, setExpiredPhone] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleResetPassword = async (values: any) => {
    try {
      setResetLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/change-expired-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: expiredPhone,
          oldPassword: values.oldPassword,
          newPassword: values.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.');
        setExpiredModalVisible(false);
      } else {
        alert(data.message || 'Lỗi đổi mật khẩu');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setResetLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setError('');
    setLoading(true);
    try {
      const { success, message, code } = await login(values.phone, values.password);
      if (success) {
        navigate('/');
      } else {
        if (code === 'PASSWORD_EXPIRED') {
          setExpiredPhone(values.phone);
          setExpiredModalVisible(true);
        } else {
          setError(message || 'Đăng nhập thất bại');
        }
      }
    } catch (err: any) {
      setError('Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

      <Modal
        title="Mật Khẩu Đã Hết Hạn"
        open={expiredModalVisible}
        onCancel={() => setExpiredModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Alert message="Mật khẩu của bạn đã quá hạn sử dụng (1 tháng đối với nhân viên). Vui lòng đổi mật khẩu mới để tiếp tục." type="warning" showIcon style={{ marginBottom: 16 }} />
        <Form layout="vertical" onFinish={handleResetPassword}>
          <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={resetLoading}>
            Xác Nhận Đổi Mật Khẩu
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
