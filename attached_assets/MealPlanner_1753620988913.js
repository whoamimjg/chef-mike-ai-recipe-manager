import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { dataService } from '../services/dataService';

const MealPlanner = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recipes, setRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedRecipeForPlanning, setSelectedRecipeForPlanning] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Check if a recipe was selected from the recipes page
    const savedRecipe = sessionStorage.getItem('selectedRecipeForPlanning');
    if (savedRecipe) {
      setSelectedRecipeForPlanning(JSON.parse(savedRecipe));
      sessionStorage.removeItem('selectedRecipeForPlanning');
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipesData, mealPlansData] = await Promise.all([
        dataService.getRecipes(),
        dataService.getMealPlans()
      ]);
      setRecipes(recipesData);
      setMealPlans(mealPlansData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async (recipeId, mealType) => {
    try {
      await dataService.addMealPlan({
        date: selectedDate.toISOString().split('T')[0],
        meal_type: mealType,
        recipe_id: recipeId,
        notes: ''
      });
      await loadData();
      setSelectedRecipeForPlanning(null);
    } catch (error) {
      console.error('Failed to add meal:', error);
      alert('Failed to add meal to planner. Please try again.');
    }
  };

  const handleRemoveMeal = async (mealPlanId) => {
    if (window.confirm('Remove this meal from your plan?')) {
      try {
        await dataService.deleteMealPlan(mealPlanId);
        await loadData();
      } catch (error) {
        console.error('Failed to remove meal:', error);
        alert('Failed to remove meal. Please try again.');
      }
    }
  };

  const getMealsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.filter(plan => plan.date === dateStr);
  };

  const getMealsByType = (date, mealType) => {
    return getMealsForDate(date).filter(plan => plan.meal_type === mealType);
  };

  const getRecipeTitle = (recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.title : 'Unknown Recipe';
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const mealsForDate = getMealsForDate(date);
      if (mealsForDate.length > 0) {
        return (
          <div style={{ fontSize: '0.7rem', color: '#667eea' }}>
            {mealsForDate.length} meal{mealsForDate.length !== 1 ? 's' : ''}
          </div>
        );
      }
    }
    return null;
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
        <h1 className="page-title">📅 Meal Planner</h1>
        <p className="page-subtitle">
          Plan your meals and build your weekly menu
        </p>
      </div>

      {/* Quick Add Selected Recipe */}
      {selectedRecipeForPlanning && (
        <div className="card mb-4" style={{ border: '2px solid #667eea' }}>
          <div className="alert alert-info">
            <strong>✨ Ready to add "{selectedRecipeForPlanning.title}" to your meal plan!</strong>
            <p>Select a meal type below and it will be added to {selectedDate.toLocaleDateString()}.</p>
          </div>
          
          <div className="grid grid-4 gap-2 mt-3">
            {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => (
              <button
                key={mealType}
                onClick={() => handleAddMeal(selectedRecipeForPlanning.id, mealType)}
                className="btn btn-primary"
              >
                Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setSelectedRecipeForPlanning(null)}
            className="btn btn-secondary mt-3"
          >
            ❌ Cancel
          </button>
        </div>
      )}

      <div className="grid grid-2 gap-4">
        {/* Calendar */}
        <div className="card">
          <h3 className="mb-3">📅 Select Date</h3>
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            className="w-full"
          />
        </div>

        {/* Daily Meal Plan */}
        <div className="card">
          <h3 className="mb-3">
            🍽️ Meals for {selectedDate.toLocaleDateString()}
          </h3>
          
          {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => {
            const meals = getMealsByType(selectedDate, mealType);
            
            return (
              <div key={mealType} className="mb-4">
                <div className="flex-between mb-2">
                  <h4 style={{ margin: 0, textTransform: 'capitalize' }}>
                    {mealType === 'breakfast' ? '🌅' : 
                     mealType === 'lunch' ? '☀️' : 
                     mealType === 'dinner' ? '🌙' : '🍎'} {mealType}
                  </h4>
                  
                  {!selectedRecipeForPlanning && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddMeal(e.target.value, mealType);
                          e.target.value = '';
                        }
                      }}
                      className="form-input"
                      style={{ width: 'auto', minWidth: '150px' }}
                    >
                      <option value="">Add recipe...</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {meals.length === 0 ? (
                  <p style={{ color: '#999', fontStyle: 'italic', margin: '0.5rem 0' }}>
                    No meals planned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meals.map(meal => (
                      <div
                        key={meal.id}
                        className="flex-between"
                        style={{
                          padding: '0.75rem',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        <span>{getRecipeTitle(meal.recipe_id)}</span>
                        <button
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {getMealsForDate(selectedDate).length === 0 && !selectedRecipeForPlanning && (
            <div className="text-center" style={{ padding: '2rem', color: '#999' }}>
              <p>No meals planned for this day.</p>
              <p>Add recipes using the dropdowns above or from the Recipes page.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealPlanner;