import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Space, Switch, Upload, Select } from 'antd';
import { SaveOutlined, MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

export default function SettingsManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepositConfig();
    fetchBinanceConfig();
  }, []);

  const fetchDepositConfig = async () => {
    try {
      const { data } = await api.get('/settings/deposit_config');
      if (data) {
        form.setFieldsValue(data);
      } else {
        // Defaults
        form.setFieldsValue({
          transferPrefix: 'VXS',
          transferIdentifier: 'phone',
          gateways: {
            scratch: false,
            momo: false,
            zalopay: false,
            vnpay: false,
            ninepay: false,
            shopeepay: false,
            tiktokpay: false,
            lazadapay: false,
            paypal: false,
          }
        });
      }
    } catch (error) {
      // Defaults
      form.setFieldsValue({ transferPrefix: 'VXS', transferIdentifier: 'phone' });
    }
  };

  const fetchBinanceConfig = async () => {
    try {
      const { data } = await api.get('/settings/binance_config');
      if (data) {
        form.setFieldsValue({
          binanceExchangeRate: data.exchangeRate,
          binanceWallets: data.wallets || [],
        });
      }
    } catch (error) {
      // Ignore 404 for first load
    }
  };



  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const depositConfig = {
        transferPrefix: values.transferPrefix,
        transferIdentifier: values.transferIdentifier,
        banks: values.banks || [],
        gateways: values.gateways || {}
      };
      const binanceConfig = {
        exchangeRate: values.binanceExchangeRate,
        wallets: values.binanceWallets || []
      };

      await api.put('/settings/deposit_config', { value: depositConfig });
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
      
      <Card title="Cấu hình Đa Kênh Nạp Tiền" style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Title level={5}>1. Nội dung chuyển khoản</Title>
          <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Form.Item
              name="transferPrefix"
              label="Tiền tố (Mã cú pháp)"
              rules={[{ required: true, message: 'Vui lòng nhập tiền tố!' }]}
            >
              <Input placeholder="VD: VXS, NAP..." style={{ width: 150 }} />
            </Form.Item>
            
            <Form.Item
              name="transferIdentifier"
              label="Thông tin định danh khách hàng"
              rules={[{ required: true, message: 'Vui lòng chọn!' }]}
            >
              <Select style={{ width: 200 }}>
                <Select.Option value="phone">Số điện thoại</Select.Option>
                <Select.Option value="_id">ID Hệ thống</Select.Option>
                <Select.Option value="name">Họ Tên</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Title level={5} style={{ marginTop: 24 }}>2. Danh sách Ngân hàng (Tối đa 10 tài khoản)</Title>
          <Form.List name="banks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 16 }} title={`Ngân hàng ${name + 1}`} extra={<MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />}>
                    <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'bankName']}
                        label="Tên NH (VD: MB, VCB)"
                        rules={[{ required: true, message: 'Vui lòng nhập' }]}
                      >
                        <Input placeholder="Tên NH" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'accountName']}
                        label="Chủ tài khoản"
                        rules={[{ required: true, message: 'Vui lòng nhập' }]}
                      >
                        <Input placeholder="Chủ tài khoản" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'accountNumber']}
                        label="Số tài khoản"
                        rules={[{ required: true, message: 'Vui lòng nhập' }]}
                      >
                        <Input placeholder="Số tài khoản" />
                      </Form.Item>
                    </Space>
                    <Form.Item
                      {...restField}
                      name={[name, 'qrImage']}
                      label="Link ảnh QR (Tuỳ chọn. Nếu để trống hệ thống dùng VietQR tự động)"
                    >
                      <Input placeholder="Nhập URL ảnh QR..." />
                    </Form.Item>
                  </Card>
                ))}
                {fields.length < 10 && (
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm Ngân hàng
                    </Button>
                  </Form.Item>
                )}
              </>
            )}
          </Form.List>

          <Title level={5} style={{ marginTop: 24 }}>3. Các cổng thanh toán (Bật/Tắt)</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: 24 }}>
            {['scratch', 'momo', 'zalopay', 'vnpay', 'ninepay', 'shopeepay', 'tiktokpay', 'lazadapay', 'paypal'].map(gw => (
              <Form.Item key={gw} name={['gateways', gw]} valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren={gw.toUpperCase()} unCheckedChildren={gw.toUpperCase()} />
              </Form.Item>
            ))}
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Lưu thay đổi Nạp Tiền
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
          <Form.List name="binanceWallets">
            {(fields, { add, remove }) => (
              <>
                <Title level={5}>Danh sách ví USDT (Tối đa 6 tài khoản)</Title>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Typography.Text strong>Tài khoản ví #{name + 1}</Typography.Text>
                      {fields.length > 1 && (
                        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)}>Xoá</Button>
                      )}
                    </div>
                    
                    <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'network']}
                        label="Mạng lưới"
                        rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập mạng (VD: TRC20, BEP20)' }]}
                      >
                        <Input placeholder="TRC20 / BEP20" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'walletAddress']}
                        label="Địa chỉ ví"
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ ví' }]}
                      >
                        <Input placeholder="Nhập địa chỉ ví" style={{ width: 400 }} />
                      </Form.Item>
                    </Space>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'qrImage']}
                      label="Link ảnh QR ví (Tuỳ chọn, ưu tiên hiển thị)"
                    >
                      <Input placeholder="Nhập URL ảnh QR..." />
                    </Form.Item>
                  </Card>
                ))}
                
                {fields.length < 6 && (
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm Ví USDT
                    </Button>
                  </Form.Item>
                )}
              </>
            )}
          </Form.List>

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
