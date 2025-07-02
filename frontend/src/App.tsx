import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import jaJP from 'antd/locale/ja_JP'
import 'antd/dist/reset.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={jaJP}>
        <BrowserRouter>
          <div className="app">
            <h1>プロジェクト管理ツール</h1>
            <p>フロントエンド実装準備中...</p>
          </div>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App