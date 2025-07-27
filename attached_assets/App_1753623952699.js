import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Recipes from './pages/Recipes';
import MealPlanner from './pages/MealPlanner';
import ShoppingList from './pages/ShoppingList';
import Account from './pages/Account';

// Services
import { dataService } from './services/dataService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize app and load user data
    const initializeApp = async () => {
      try {
        // For now, we'll use a simple local user
        // In production, this would be real authentication
        const userData = {
          id: 'user-1',
          name: 'Chef Mike',
          email: 'chef@example.com',
          preferences: {
            dietary_restrictions: [],
            allergies: []
          }
        };
        
        setUser(userData);
        await dataService.initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <div className="gradient-bg" style={{ minHeight: '100vh' }}>
          <Navbar user={user} />
          <div className="container">
            <Routes>
              <Route path="/" element={<Navigate to="/recipes" replace />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/meal-planner" element={<MealPlanner />} />
              <Route path="/shopping-list" element={<ShoppingList />} />
              <Route path="/account" element={<Account user={user} setUser={setUser} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;