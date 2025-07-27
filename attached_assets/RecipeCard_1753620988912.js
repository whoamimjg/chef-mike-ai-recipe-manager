import React from 'react';

const RecipeCard = ({ recipe, viewMode, onView, onEdit, onDelete }) => {
  const hasImage = recipe.image && recipe.image.trim() !== '';

  if (viewMode === 'list') {
    return (
      <div className="card">
        <div className="flex gap-3">
          {hasImage && (
            <div style={{ flexShrink: 0 }}>
              <img
                src={recipe.image}
                alt={recipe.title}
                className="recipe-image"
                style={{ width: '80px', height: '80px', borderRadius: '8px' }}
              />
            </div>
          )}
          
          <div style={{ flex: 1 }}>
            <h3 
              className="recipe-title"
              onClick={() => onView(recipe)}
              style={{ margin: '0 0 0.5rem 0', cursor: 'pointer' }}
            >
              {hasImage ? '📸' : '🍳'} {recipe.title}
            </h3>
            
            {recipe.description && (
              <p style={{ color: '#666', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                {recipe.description.substring(0, 100)}
                {recipe.description.length > 100 ? '...' : ''}
              </p>
            )}
            
            <div className="flex gap-2" style={{ fontSize: '0.85rem', color: '#888' }}>
              {recipe.servings && <span>🍽️ {recipe.servings}</span>}
              {recipe.prep_time && <span>⏱️ {recipe.prep_time}</span>}
              {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
            </div>
          </div>
          
          <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
            <button
              onClick={() => onView(recipe)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem' }}
            >
              👁️
            </button>
            <button
              onClick={() => onEdit(recipe)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem' }}
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(recipe.id)}
              className="btn btn-danger"
              style={{ padding: '0.5rem' }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-card" onClick={() => onView(recipe)}>
      {hasImage && (
        <div style={{ position: 'relative' }}>
          <img
            src={recipe.image}
            alt={recipe.title}
            className="recipe-image"
          />
        </div>
      )}
      
      <div style={{ padding: '1.5rem' }}>
        <h3 className="recipe-title" style={{ margin: '0 0 0.5rem 0' }}>
          {hasImage ? '📸' : '🍳'} {recipe.title}
        </h3>
        
        {recipe.description && (
          <p style={{ color: '#666', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
            {recipe.description.substring(0, 80)}
            {recipe.description.length > 80 ? '...' : ''}
          </p>
        )}
        
        <div className="flex-between" style={{ fontSize: '0.85rem', color: '#888' }}>
          <div className="flex gap-2">
            {recipe.servings && <span>🍽️ {recipe.servings}</span>}
            {recipe.prep_time && <span>⏱️ {recipe.prep_time}</span>}
            {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(recipe);
            }}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.5rem' }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(recipe.id);
            }}
            className="btn btn-danger"
            style={{ flex: 1, padding: '0.5rem' }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;