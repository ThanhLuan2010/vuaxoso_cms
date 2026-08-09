import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function SettingsManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBankConfig();
    fetchBinanceConfig();
  }, []);

  const fetchBankConfig = async () => {
    try {
      const { data } = await api.get('/settings/bank_config');
      if (data) {
        form.setFieldsValue(data);
      }
    } catch (error) {
      // Ignore 404 for first load
    }
  };

  const fetchBinanceConfig = async () => {
    try {
      const { data } = await api.get('/settings/binance_config');
      if (data) {
        form.setFieldsValue({
          binanceApiKey: data.apiKey,
          binanceApiSecret: data.apiSecret,
          binanceWalletAddress: data.walletAddress,
          binanceExchangeRate: data.exchangeRate,
        });
      }
    } catch (error) {
      // Ignore 404 for first load
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const bankConfig = {
        bankName: values.bankName,
        accountName: values.accountName,
        accountNumber: values.accountNumber
      };
      const binanceConfig = {
        apiKey: values.binanceApiKey,
        apiSecret: values.binanceApiSecret,
        walletAddress: values.binanceWalletAddress,
        exchangeRate: values.binanceExchangeRate
      };

      await api.put('/settings/bank_config', { value: bankConfig });
      await api.put('/settings/binance_config', { value: binanceConfig });
      message.success('Cập nhật thông tin cấu hình thành công');
    } catch (error) {
      message.error('Lỗi khi cập nhật cấu hình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>Cấu hình chung</Title>
      
      <Card title="Cấu hình Thông tin Chuyển khoản (Nạp tiền)" style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="bankName"
            label="Tên Ngân hàng (Viết tắt. VD: MB, VCB, ACB, ...)"
            rules={[{ required: true, message: 'Vui lòng nhập tên ngân hàng!' }]}
          >
            <Input placeholder="Nhập mã ngân hàng hoặc tên ngắn gọn" />
          </Form.Item>
          
          <Form.Item
            name="accountName"
            label="Tên Chủ tài khoản"
            rules={[{ required: true, message: 'Vui lòng nhập chủ tài khoản!' }]}
          >
            <Input placeholder="VD: NGUYEN VAN A" />
          </Form.Item>

          <Form.Item
            name="accountNumber"
            label="Số tài khoản"
            rules={[{ required: true, message: 'Vui lòng nhập số tài khoản!' }]}
          >
            <Input placeholder="Nhập số tài khoản" />
          </Form.Item>



          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="Cấu hình Nạp tự động qua Binance" style={{ maxWidth: 800, marginTop: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="binanceApiKey"
            label="API Key (Binance Read-only)"
          >
            <Input placeholder="Nhập API Key" />
          </Form.Item>

          <Form.Item
            name="binanceApiSecret"
            label="API Secret"
          >
            <Input.Password placeholder="Nhập API Secret" />
          </Form.Item>

          <Form.Item
            name="binanceWalletAddress"
            label="Địa chỉ ví nạp USDT (TRC20 / BEP20)"
          >
            <Input placeholder="Nhập địa chỉ ví cho user chuyển tiền vào" />
          </Form.Item>

          <Form.Item
            name="binanceExchangeRate"
            label="Tỷ giá USDT/VND"
          >
            <Input type="number" placeholder="VD: 25000" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Lưu cấu hình Binance
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
