import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'

const { Header, Content } = Layout

function buildMenuItems() {
  const isAuthed = Boolean(typeof window !== 'undefined' && localStorage.getItem('token'))
  const base = [{ key: '/', label: <Link to="/">Interviewee</Link> }]
  if (isAuthed) {
    base.push({ key: '/dashboard', label: <Link to="/dashboard">Dashboard</Link> })
    base.push({ key: '/add-candidate', label: <Link to="/add-candidate">Add Candidate</Link> })
  }
  return base
}

export default function TopNav({ children }) {
  const location = useLocation()
  // Highlight the top-level route (e.g., '/', '/dashboard', '/add-candidate')
  const topLevel = (() => {
    const seg = location.pathname.split('/')[1] || ''
    return seg ? `/${seg}` : '/'
  })()
  const items = buildMenuItems()
  const selected = items.find(i => i.key === topLevel)?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', paddingInline: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontWeight: 800, color: '#2563EB' }}>HireWire</div>
          <Menu mode="horizontal" selectedKeys={[selected]} items={items} style={{ flex: 1 }} />
        </div>
      </Header>
      <Content>
        {children}
      </Content>
    </Layout>
  )
}


