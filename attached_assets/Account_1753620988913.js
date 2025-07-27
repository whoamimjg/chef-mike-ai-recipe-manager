import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

const Account = ({ user, setUser }) => {
  const [preferences, setPreferences] = useState({
    dietary_restrictions: [],
    allergies: []
  });
  const [newRestriction, setNewRestriction] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);

  const commonRestrictions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo',
    'Low-Carb', 'Low-Fat', 'Low-Sodium', 'Kosher', 'Halal'
  ];

  const commonAllergies = [
    'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat',
    'Sesame', 'Coconut', 'Mustard', 'Sulfites'
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await dataService.getUserPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      setLoading(true);
      await dataService.updateUserPreferences(preferences);
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addDietaryRestriction = () => {
    if (newRestriction.trim() && !preferences.dietary_restrictions.includes(newRestriction.trim())) {
      setPreferences(prev => ({
        ...prev,
        dietary_restrictions: [...prev.dietary_restrictions, newRestriction.trim()]
      }));
      setNewRestriction('');
    }
  };

  const removeDietaryRestriction = (restriction) => {
    setPreferences(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.filter(r => r !== restriction)
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !preferences.allergies.includes(newAllergy.trim())) {
      setPreferences(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy) => {
    setPreferences(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }));
  };

  const handleExportData = async () => {
    try {
      const data = dataService.exportData();
      setExportData(data);
      
      // Auto-download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'chef-mikes-recipes.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      alert('Please paste your data to import.');
      return;
    }

    if (window.confirm('This will replace all your current data. Are you sure?')) {
      try {
        setLoading(true);
        await dataService.importData(importData);
        alert('Data imported successfully!');
        setImportData('');
        window.location.reload(); // Refresh to show imported data
      } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please check the format and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">👤 Account Settings</h1>
        <p className="page-subtitle">
          Manage your preferences and data
        </p>
      </div>

      <div className="grid grid-2 gap-4">
        {/* User Profile */}
        <div className="card">
          <h3 className="mb-3">👨‍🍳 Profile</h3>
          
          <div className="form-group">
            <label className="form-label">Name</label>
            <p style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', margin: 0 }}>
              {user?.name || 'Chef Mike'}
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <p style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', margin: 0 }}>
              {user?.email || 'chef@example.com'}
            </p>
          </div>
          
          <div className="alert alert-info">
            <strong>Demo Mode:</strong> This is a demonstration version. In production, 
            you would be able to edit your profile information and manage your subscription here.
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="card">
          <h3 className="mb-3">🥗 Dietary Restrictions</h3>
          
          <div className="form-group">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newRestriction}
                onChange={(e) => setNewRestriction(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDietaryRestriction()}
                className="form-input"
                placeholder="Add dietary restriction"
                list="restrictions-list"
                style={{ flex: 1 }}
              />
              <datalist id="restrictions-list">
                {commonRestrictions.map(restriction => (
                  <option key={restriction} value={restriction} />
                ))}
              </datalist>
              <button
                onClick={addDietaryRestriction}
                className="btn btn-primary"
              >
                ➕ Add
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {preferences.dietary_restrictions.map(restriction => (
              <span
                key={restriction}
                className="flex gap-2"
                style={{
                  background: '#e3f2fd',
                  color: '#1976d2',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  alignItems: 'center'
                }}
              >
                {restriction}
                <button
                  onClick={() => removeDietaryRestriction(restriction)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1976d2',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          
          <h4 className="mb-2">🚫 Allergies</h4>
          
          <div className="form-group">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                className="form-input"
                placeholder="Add allergy"
                list="allergies-list"
                style={{ flex: 1 }}
              />
              <datalist id="allergies-list">
                {commonAllergies.map(allergy => (
                  <option key={allergy} value={allergy} />
                ))}
              </datalist>
              <button
                onClick={addAllergy}
                className="btn btn-primary"
              >
                ➕ Add
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {preferences.allergies.map(allergy => (
              <span
                key={allergy}
                className="flex gap-2"
                style={{
                  background: '#ffebee',
                  color: '#d32f2f',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  alignItems: 'center'
                }}
              >
                {allergy}
                <button
                  onClick={() => removeAllergy(allergy)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d32f2f',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          
          <button
            onClick={savePreferences}
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Saving...' : '💾 Save Preferences'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card mt-4">
        <h3 className="mb-3">📊 Data Management</h3>
        
        <div className="grid grid-2 gap-4">
          {/* Export */}
          <div>
            <h4 className="mb-2">📤 Export Data</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Download all your recipes, meal plans, and preferences as a JSON file.
            </p>
            
            <button
              onClick={handleExportData}
              className="btn btn-secondary w-full mb-3"
            >
              📥 Download Backup
            </button>
            
            {exportData && (
              <div>
                <textarea
                  value={exportData}
                  readOnly
                  className="form-input form-textarea"
                  rows="6"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>
          
          {/* Import */}
          <div>
            <h4 className="mb-2">📥 Import Data</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Restore your data from a previously exported JSON file.
            </p>
            
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="form-input form-textarea mb-3"
              rows="6"
              placeholder="Paste your exported JSON data here..."
              style={{ fontSize: '0.8rem' }}
            />
            
            <button
              onClick={handleImportData}
              className="btn btn-danger w-full"
              disabled={loading || !importData.trim()}
            >
              {loading ? 'Importing...' : '⚠️ Import Data (Replaces Current)'}
            </button>
          </div>
        </div>
        
        <div className="alert alert-warning mt-4">
          <strong>⚠️ Important:</strong> Importing data will completely replace all your current 
          recipes, meal plans, and preferences. Make sure to export a backup first!
        </div>
      </div>
    </div>
  );
};

export default Account;