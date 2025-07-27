import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import AddRecipeForm from '../components/AddRecipeForm';

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await dataService.getRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async (recipeData) => {
    try {
      await dataService.addRecipe(recipeData);
      await loadRecipes();
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add recipe:', error);
      alert('Failed to add recipe. Please try again.');
    }
  };

  const handleEditRecipe = async (id, recipeData) => {
    try {
      await dataService.updateRecipe(id, recipeData);
      await loadRecipes();
      setEditingRecipe(null);
    } catch (error) {
      console.error('Failed to update recipe:', error);
      alert('Failed to update recipe. Please try again.');
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await dataService.deleteRecipe(id);
        await loadRecipes();
        setSelectedRecipe(null);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        alert('Failed to delete recipe. Please try again.');
      }
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.ingredients?.some(ing => 
      ing.item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

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
        <h1 className="page-title">🍳 My Recipes</h1>
        <p className="page-subtitle">
          Organize your favorite recipes and build your culinary collection
        </p>
      </div>

      <div className="card mb-4">
        <div className="flex-between mb-3">
          <div className="flex gap-3" style={{ alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '300px' }}
            />
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('card')}
                className={`btn ${viewMode === 'card' ? 'btn-primary' : 'btn-secondary'}`}
              >
                📋 Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              >
                📝 List
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            ➕ Add Recipe
          </button>
        </div>

        <div className="mb-3">
          <p className="text-primary">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="card text-center">
          <h3>No recipes found</h3>
          <p>Start building your recipe collection!</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary mt-3"
          >
            ➕ Add Your First Recipe
          </button>
        </div>
      ) : (
        <div className={viewMode === 'card' ? 'grid grid-3' : 'flex flex-column gap-3'}>
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              viewMode={viewMode}
              onView={(recipe) => setSelectedRecipe(recipe)}
              onEdit={(recipe) => setEditingRecipe(recipe)}
              onDelete={(id) => handleDeleteRecipe(id)}
            />
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={(recipe) => {
            setSelectedRecipe(null);
            setEditingRecipe(recipe);
          }}
          onDelete={(id) => handleDeleteRecipe(id)}
        />
      )}

      {/* Add Recipe Form */}
      {showAddForm && (
        <AddRecipeForm
          onSave={handleAddRecipe}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Recipe Form */}
      {editingRecipe && (
        <AddRecipeForm
          recipe={editingRecipe}
          onSave={(data) => handleEditRecipe(editingRecipe.id, data)}
          onCancel={() => setEditingRecipe(null)}
          isEditing={true}
        />
      )}
    </div>
  );
};

export default Recipes;