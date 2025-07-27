import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

const ShoppingList = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    return nextWeek.toISOString().split('T')[0];
  });
  
  const [shoppingItems, setShoppingItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState('category'); // 'category' or 'recipe'

  useEffect(() => {
    generateShoppingList();
  }, [startDate, endDate]);

  const generateShoppingList = async () => {
    try {
      setLoading(true);
      const items = await dataService.generateShoppingList(startDate, endDate);
      setShoppingItems(items);
      setCheckedItems(new Set());
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemCheck = (index, checked) => {
    const newCheckedItems = new Set(checkedItems);
    if (checked) {
      newCheckedItems.add(index);
    } else {
      newCheckedItems.delete(index);
    }
    setCheckedItems(newCheckedItems);
  };

  const clearCheckedItems = () => {
    const remainingItems = shoppingItems.filter((_, index) => !checkedItems.has(index));
    setShoppingItems(remainingItems);
    setCheckedItems(new Set());
  };

  const setDateRange = (days) => {
    const today = new Date();
    const end = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const groupItemsByCategory = (items) => {
    const categories = {
      'Produce': ['tomato', 'onion', 'garlic', 'lettuce', 'carrot', 'potato', 'apple', 'banana', 'lemon'],
      'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey'],
      'Dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs'],
      'Pantry': ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'spices'],
      'Grains': ['rice', 'pasta', 'bread', 'cereal', 'oats'],
      'Other': []
    };

    const grouped = Object.keys(categories).reduce((acc, category) => {
      acc[category] = [];
      return acc;
    }, {});

    items.forEach(item => {
      let categorized = false;
      for (const [category, keywords] of Object.entries(categories)) {
        if (category === 'Other') continue;
        if (keywords.some(keyword => item.item.toLowerCase().includes(keyword))) {
          grouped[category].push(item);
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        grouped['Other'].push(item);
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🛒 Shopping List</h1>
        <p className="page-subtitle">
          Generate shopping lists from your meal plans
        </p>
      </div>

      {/* Date Range Selection */}
      <div className="card mb-4">
        <h3 className="mb-3">📅 Select Date Range</h3>
        
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setDateRange(7)}
            className="btn btn-secondary"
          >
            Next 7 Days
          </button>
          <button
            onClick={() => setDateRange(14)}
            className="btn btn-secondary"
          >
            Next 2 Weeks
          </button>
          <button
            onClick={() => setDateRange(30)}
            className="btn btn-secondary"
          >
            Next Month
          </button>
        </div>
        
        <div className="grid grid-3 gap-3">
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="form-input"
            >
              <option value="category">Food Category</option>
              <option value="recipe">Recipe</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={generateShoppingList}
          className="btn btn-primary mt-3"
          disabled={loading}
        >
          🔄 Regenerate List
        </button>
      </div>

      {/* Shopping List */}
      {shoppingItems.length === 0 ? (
        <div className="card text-center">
          <h3>No ingredients needed</h3>
          <p>Add some meals to your planner for the selected date range.</p>
        </div>
      ) : (
        <div className="card">
          <div className="flex-between mb-3">
            <h3>
              🛒 Shopping List ({shoppingItems.length} items)
            </h3>
            
            {checkedItems.size > 0 && (
              <button
                onClick={clearCheckedItems}
                className="btn btn-danger"
              >
                🗑️ Remove Checked ({checkedItems.size})
              </button>
            )}
          </div>
          
          {groupBy === 'category' ? (
            <div>
              {Object.entries(groupItemsByCategory(shoppingItems)).map(([category, items]) => {
                if (items.length === 0) return null;
                
                return (
                  <div key={category} className="mb-4">
                    <h4 style={{ 
                      background: '#f8f9fa', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '8px',
                      margin: '0 0 1rem 0',
                      color: '#333'
                    }}>
                      {category}
                    </h4>
                    
                    <div className="grid gap-2">
                      {items.map((item, index) => {
                        const globalIndex = shoppingItems.indexOf(item);
                        const isChecked = checkedItems.has(globalIndex);
                        
                        return (
                          <div
                            key={globalIndex}
                            className={`flex gap-3 p-3 rounded ${isChecked ? 'opacity-50' : ''}`}
                            style={{
                              background: isChecked ? '#f8f9fa' : 'white',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleItemCheck(globalIndex, e.target.checked)}
                              style={{ marginTop: '0.25rem' }}
                            />
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                textDecoration: isChecked ? 'line-through' : 'none',
                                fontWeight: '500'
                              }}>
                                {item.amount} {item.unit} {item.item}
                                {item.notes && item.notes !== 'header' && (
                                  <span style={{ color: '#666' }}> ({item.notes})</span>
                                )}
                              </div>
                              
                              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                From: {item.recipes.join(', ')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-2">
              {shoppingItems.map((item, index) => {
                const isChecked = checkedItems.has(index);
                
                return (
                  <div
                    key={index}
                    className={`flex gap-3 p-3 rounded ${isChecked ? 'opacity-50' : ''}`}
                    style={{
                      background: isChecked ? '#f8f9fa' : 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleItemCheck(index, e.target.checked)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        textDecoration: isChecked ? 'line-through' : 'none',
                        fontWeight: '500'
                      }}>
                        {item.amount} {item.unit} {item.item}
                        {item.notes && item.notes !== 'header' && (
                          <span style={{ color: '#666' }}> ({item.notes})</span>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                        From: {item.recipes.join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-4 p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
            <div className="flex-between">
              <span>Total Items: {shoppingItems.length}</span>
              <span>Checked: {checkedItems.size}</span>
              <span>Remaining: {shoppingItems.length - checkedItems.size}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;