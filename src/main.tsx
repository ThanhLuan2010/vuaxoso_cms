import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { QueryClientProvider } from '@tanstack/react-query'
import queryClient from './services/queryClient'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: '#dc2626' } }}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
