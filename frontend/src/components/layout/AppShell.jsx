import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { UserOutlined, TeamOutlined, PlusSquareOutlined, HomeOutlined } from '@ant-design/icons'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">Interviewee</Link> },
  { key: '/dashboard', icon: <TeamOutlined />, label: <Link to="/dashboard">Dashboard</Link> },
  { key: '/add-candidate', icon: <PlusSquareOutlined />, label: <Link to="/add-candidate">Add Candidate</Link> },
]

export default function AppShell({ children }) {
  const location = useLocation()
  const selectedKey = menuItems.find((m) => location.pathname.startsWith(m.key))?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="light" width={224} style={{ borderRight: '1px solid #e5e7eb' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', paddingLeft: 16, fontWeight: 700, color: '#2563EB' }}>
          HireWire
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', paddingInline: 24 }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>AI Interview Assistant</div>
          <div style={{ marginLeft: 'auto', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            <span>Interviewer</span>
          </div>
        </Header>
        <Content style={{ background: '#F3F4F6' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}


