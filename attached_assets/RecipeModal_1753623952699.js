import React from 'react';
import { useNavigate } from 'react-router-dom';

const RecipeModal = ({ recipe, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleAddToMealPlanner = () => {
    // Store selected recipe in sessionStorage for meal planner
    sessionStorage.setItem('selectedRecipeForPlanning', JSON.stringify(recipe));
    navigate('/meal-planner');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        
        <div className="flex gap-4">
          <div style={{ flex: 2 }}>
            <h1 style={{ color: '#333', marginBottom: '1rem' }}>{recipe.title}</h1>
            
            {recipe.description && (
              <div className="mb-3">
                <strong>Description:</strong>
                <p style={{ margin: '0.5rem 0' }}>{recipe.description}</p>
              </div>
            )}
            
            {/* Recipe Details */}
            <div className="flex gap-4 mb-4" style={{ fontSize: '0.9rem' }}>
              {recipe.servings && (
                <span className="flex gap-1" style={{ alignItems: 'center' }}>
                  🍽️ <strong>Servings:</strong> {recipe.servings}
                </span>
              )}
              {recipe.prep_time && (
                <span className="flex gap-1" style={{ alignItems: 'center' }}>
                  ⏱️ <strong>Prep:</strong> {recipe.prep_time}
                </span>
              )}
              {recipe.cook_time && (
                <span className="flex gap-1" style={{ alignItems: 'center' }}>
                  🔥 <strong>Cook:</strong> {recipe.cook_time}
                </span>
              )}
            </div>
            
            {/* Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-4">
                <h3>🥘 Ingredients</h3>
                <div className="mt-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className={
                      ingredient.notes === 'header' 
                        ? 'ingredient-header' 
                        : 'ingredient-item'
                    }>
                      {ingredient.notes === 'header' ? (
                        <strong>{ingredient.item}</strong>
                      ) : (
                        <>
                          {ingredient.amount && ingredient.unit && (
                            <strong>{ingredient.amount} {ingredient.unit}</strong>
                          )}
                          {ingredient.amount && !ingredient.unit && (
                            <strong>{ingredient.amount}</strong>
                          )}
                          {ingredient.amount || ingredient.unit ? ' ' : ''}
                          {ingredient.item}
                          {ingredient.notes && ingredient.notes !== 'header' && (
                            <em> ({ingredient.notes})</em>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Directions */}
            {recipe.directions && recipe.directions.length > 0 && (
              <div className="mb-4">
                <h3>👨‍🍳 Directions</h3>
                <div className="mt-2">
                  {recipe.directions.map((direction, index) => (
                    <div key={index} className="direction-item">
                      <div className="direction-number">{index + 1}</div>
                      <div className="direction-text">{direction}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Image in upper right */}
          {recipe.image && (
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <h3>📸 Recipe Photo</h3>
              <img
                src={recipe.image}
                alt={recipe.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  marginTop: '0.5rem'
                }}
              />
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '1.5rem', marginTop: '2rem' }}>
          <div className="grid grid-3 gap-3">
            <button
              onClick={handleAddToMealPlanner}
              className="btn btn-primary"
            >
              📅 Add to Meal Planner
            </button>
            <button
              onClick={() => onEdit(recipe)}
              className="btn btn-secondary"
            >
              ✏️ Edit Recipe
            </button>
            <button
              onClick={() => onDelete(recipe.id)}
              className="btn btn-danger"
            >
              🗑️ Delete Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;