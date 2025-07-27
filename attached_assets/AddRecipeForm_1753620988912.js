import React, { useState, useRef } from 'react';
import { dataService } from '../services/dataService';

const AddRecipeForm = ({ recipe, onSave, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    servings: recipe?.servings || '',
    prep_time: recipe?.prep_time || '',
    cook_time: recipe?.cook_time || '',
    ingredients: recipe?.ingredients || [{ amount: '', unit: '', item: '', notes: '' }],
    directions: recipe?.directions || [''],
    image: recipe?.image || '',
    source: recipe?.source || ''
  });
  
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const commonIngredients = [
    'flour', 'sugar', 'eggs', 'butter', 'milk', 'salt', 'pepper', 'olive oil',
    'garlic', 'onion', 'tomatoes', 'chicken', 'beef', 'fish', 'rice', 'pasta',
    'cheese', 'yogurt', 'cream', 'vanilla', 'baking powder', 'baking soda'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    
    // Auto-abbreviate common units
    if (field === 'unit') {
      if (value.toLowerCase() === 'tablespoon' || value.toLowerCase() === 'tablespoons') {
        value = 'tbsp';
      } else if (value.toLowerCase() === 'teaspoon' || value.toLowerCase() === 'teaspoons') {
        value = 'tsp';
      }
    }
    
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleDirectionChange = (index, value) => {
    const newDirections = [...formData.directions];
    newDirections[index] = value;
    setFormData(prev => ({ ...prev, directions: newDirections }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { amount: '', unit: '', item: '', notes: '' }]
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    }
  };

  const addDirection = () => {
    setFormData(prev => ({ ...prev, directions: [...prev.directions, ''] }));
  };

  const removeDirection = (index) => {
    if (formData.directions.length > 1) {
      const newDirections = formData.directions.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, directions: newDirections }));
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setLoading(true);
      const processedImage = await dataService.processImage(file);
      setFormData(prev => ({ ...prev, image: processedImage }));
    } catch (error) {
      alert('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUrl = async () => {
    if (!imageUrl.trim()) return;
    
    try {
      setLoading(true);
      const processedImage = await dataService.processImageUrl(imageUrl);
      setFormData(prev => ({ ...prev, image: processedImage }));
      setImageUrl('');
    } catch (error) {
      alert('Failed to process image URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a recipe title.');
      return;
    }

    // Filter out empty ingredients and directions
    const cleanedData = {
      ...formData,
      ingredients: formData.ingredients.filter(ing => 
        ing.item.trim() !== '' || ing.notes === 'header'
      ),
      directions: formData.directions.filter(dir => dir.trim() !== '')
    };

    try {
      setLoading(true);
      await onSave(cleanedData);
    } catch (error) {
      alert('Failed to save recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        
        <h2>{isEditing ? 'Edit Recipe' : 'Add New Recipe'}</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="grid grid-2 gap-3 mb-4">
            <div className="form-group">
              <label className="form-label">Recipe Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="form-input"
                placeholder="Enter recipe title"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Source (optional)</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => handleInputChange('source', e.target.value)}
                className="form-input"
                placeholder="Website, cookbook, etc."
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="form-input form-textarea"
              placeholder="Brief description of the recipe"
              rows="3"
            />
          </div>

          {/* Recipe Details */}
          <div className="grid grid-3 gap-3 mb-4">
            <div className="form-group">
              <label className="form-label">Servings</label>
              <input
                type="text"
                value={formData.servings}
                onChange={(e) => handleInputChange('servings', e.target.value)}
                className="form-input"
                placeholder="4 people"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Prep Time</label>
              <input
                type="text"
                value={formData.prep_time}
                onChange={(e) => handleInputChange('prep_time', e.target.value)}
                className="form-input"
                placeholder="15 minutes"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Cook Time</label>
              <input
                type="text"
                value={formData.cook_time}
                onChange={(e) => handleInputChange('cook_time', e.target.value)}
                className="form-input"
                placeholder="30 minutes"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-group mb-4">
            <label className="form-label">Recipe Image</label>
            <div className="flex gap-3 mb-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                accept="image/*"
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                📁 Upload Photo
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="form-input"
                placeholder="Or paste image URL here"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleImageUrl}
                className="btn btn-secondary"
                disabled={!imageUrl.trim()}
              >
                🔗 Add URL
              </button>
            </div>
            
            {formData.image && (
              <div className="mt-3">
                <img
                  src={formData.image}
                  alt="Recipe preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  className="btn btn-danger ml-2"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="form-group mb-4">
            <div className="flex-between mb-2">
              <label className="form-label">Ingredients</label>
              <button
                type="button"
                onClick={addIngredient}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                ➕ Add Ingredient
              </button>
            </div>
            
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr 2fr 1fr auto' }}>
                <input
                  type="text"
                  value={ingredient.amount}
                  onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                  className="form-input"
                  placeholder="2"
                />
                
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="form-input"
                  placeholder="cups"
                />
                
                <input
                  type="text"
                  value={ingredient.item}
                  onChange={(e) => handleIngredientChange(index, 'item', e.target.value)}
                  className="form-input"
                  placeholder="flour"
                  list={`ingredients-${index}`}
                />
                <datalist id={`ingredients-${index}`}>
                  {commonIngredients.map(ing => (
                    <option key={ing} value={ing} />
                  ))}
                </datalist>
                
                <input
                  type="text"
                  value={ingredient.notes}
                  onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                  className="form-input"
                  placeholder="sifted"
                />
                
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem', minWidth: 'auto' }}
                  disabled={formData.ingredients.length === 1}
                >
                  ❌
                </button>
              </div>
            ))}
            
            <div className="mt-2">
              <label className="flex gap-2" style={{ alignItems: 'center', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      addIngredient();
                      const newIndex = formData.ingredients.length;
                      handleIngredientChange(newIndex, 'notes', 'header');
                      handleIngredientChange(newIndex, 'item', 'Section Header:');
                    }
                  }}
                />
                Add section header (e.g., "For the sauce:")
              </label>
            </div>
          </div>

          {/* Directions */}
          <div className="form-group mb-4">
            <div className="flex-between mb-2">
              <label className="form-label">Directions</label>
              <button
                type="button"
                onClick={addDirection}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                ➕ Add Step
              </button>
            </div>
            
            {formData.directions.map((direction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <div className="flex gap-1" style={{ alignItems: 'center', minWidth: '30px' }}>
                  <span style={{ fontWeight: 'bold' }}>{index + 1}.</span>
                </div>
                
                <textarea
                  value={direction}
                  onChange={(e) => handleDirectionChange(index, e.target.value)}
                  className="form-input"
                  placeholder="Describe this cooking step..."
                  rows="2"
                  style={{ flex: 1 }}
                />
                
                <button
                  type="button"
                  onClick={() => removeDirection(index)}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem', minWidth: 'auto', alignSelf: 'flex-start' }}
                  disabled={formData.directions.length === 1}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Recipe' : 'Save Recipe')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipeForm;