import React from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown } from 'antd';
import { UserOutlined, ProjectOutlined, LogoutOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: 'プロジェクト一覧',
      onClick: () => navigate('/projects'),
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'ユーザー管理',
      onClick: () => navigate('/users'),
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'レポート',
      onClick: () => navigate('/reports'),
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
      onClick: handleLogout,
    },
  ];

  const selectedKeys = menuItems
    .filter(item => location.pathname.startsWith(item.key))
    .map(item => item.key);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            color: 'white', 
            fontSize: '18px', 
            fontWeight: 'bold',
            marginRight: '32px'
          }}>
            プロジェクト管理・WBSツール
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={menuItems}
            style={{ 
              background: 'transparent',
              borderBottom: 'none'
            }}
          />
        </div>

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
        >
          <Button 
            type="text" 
            style={{ color: 'white' }}
            icon={<UserOutlined />}
          >
            {user?.full_name || user?.username}
          </Button>
        </Dropdown>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        {children}
      </Content>
    </AntLayout>
  );
};

export default Layout;