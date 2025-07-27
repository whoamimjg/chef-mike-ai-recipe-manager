import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ user }) => {
  const location = useLocation();

  const navItems = [
    { path: '/recipes', label: '🍳 Recipes', icon: '🍳' },
    { path: '/meal-planner', label: '📅 Meal Planner', icon: '📅' },
    { path: '/shopping-list', label: '🛒 Shopping List', icon: '🛒' },
    { path: '/account', label: '👤 Account', icon: '👤' }
  ];

  return (
    <nav className="navbar">
      <div className="container">
        <div className="flex-between">
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#667eea' }}>
              👨‍🍳 Chef Mike's Culinary Classroom
            </h2>
          </div>
          
          <div className="flex gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label.replace(/^[^A-Za-z]*/, '')}</span>
              </Link>
            ))}
          </div>

          {user && (
            <div className="flex gap-2" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                Welcome, {user.name}!
              </span>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .nav-text {
          display: inline;
        }
        
        @media (max-width: 768px) {
          .nav-text {
            display: none;
          }
          
          .nav-icon {
            font-size: 1.2rem;
          }
          
          h2 {
            font-size: 1.2rem !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;