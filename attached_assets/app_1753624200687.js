// Chef Mike's Culinary Classroom - React App Bundle
// This is a simplified React implementation for demonstration

class ChefMikesApp {
  constructor() {
    // Check authentication first
    this.isAuthenticated = window.authManager.isAuthenticated();
    this.user = window.authManager.getUser();
    
    if (!this.isAuthenticated) {
      // Show marketing page for unauthenticated users
      this.showMarketingPage();
      return;
    }

    this.currentPage = 'recipes';
    this.recipes = this.loadData('recipes') || this.getInitialRecipes();
    this.mealPlans = this.loadData('mealPlans') || [];
    this.dayNotes = this.loadData('dayNotes') || [];
    this.shoppingItems = this.loadData('shoppingItems') || [];
    this.inventory = this.loadData('inventory') || [];
    this.userPreferences = this.loadData('userPreferences') || {
      dietary_restrictions: [],
      allergies: []
    };
    this.selectedRecipe = null;
    this.selectedRecipes = new Set();
    this.selectionMode = false;
    this.currentPlannerYear = null;
    this.currentPlannerMonth = null;
    this.currentStep = 0;
    this.aiSuggestions = null;
    this.showAiSuggestions = false;
    this.loadingAiSuggestions = false;
    this.showWelcomePopup = !this.loadData('hasSeenWelcome');
    
    // Make app globally accessible
    window.app = this;
    
    // Set up auth change handler
    window.authManager.setAuthChangeHandler((authenticated) => {
      if (!authenticated) {
        this.showMarketingPage();
      } else {
        // Refresh the app when user logs in
        window.location.reload();
      }
    });
    
    this.init();
  }

  getInitialRecipes() {
    // New users start with an empty recipe collection
    // Each user gets a clean slate to build their own recipe library
    return [];
  }

  init() {
    this.render();
    this.setupEventListeners();
    
    // Make app globally accessible for onclick handlers
    window.app = this;
    
    // Show welcome popup with AI suggestions on first visit
    if (this.showWelcomePopup) {
      setTimeout(() => this.showWelcomeWithAISuggestions(), 1000);
    }
  }

  loadData(key) {
    try {
      // Use user-specific keys for data isolation
      const userKey = `chef-mikes-${this.user?.id || 'demo'}-${key}`;
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  }

  saveData(key, data) {
    try {
      // Use user-specific keys for data isolation
      const userKey = `chef-mikes-${this.user?.id || 'demo'}-${key}`;
      localStorage.setItem(userKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  showMarketingPage() {
    // Display marketing page for unauthenticated users
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="marketing-container">
        <div class="hero">
          <div class="hero-content">
            <h1>🍽️ Chef Mike's Culinary Classroom</h1>
            <p>Master your kitchen with smart recipe management, meal planning, and personalized cooking guidance</p>
            <div class="hero-buttons">
              <button class="btn btn-primary btn-large" data-action="show-signup">Get Started Free</button>
              <button class="btn btn-secondary btn-large" data-action="show-login">Sign In</button>
            </div>
          </div>
        </div>

        <div class="features-section">
          <div class="container">
            <h2>Everything you need to master your kitchen</h2>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">📚</div>
                <h3>Recipe Management</h3>
                <p>Organize, import, and customize recipes with detailed nutrition information and cooking instructions</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📅</div>
                <h3>Meal Planning</h3>
                <p>Plan your weekly meals with drag-and-drop calendar interface and automated shopping lists</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🛒</div>
                <h3>Smart Shopping</h3>
                <p>Generate organized shopping lists by aisle with quantities automatically calculated from your meal plans</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🤖</div>
                <h3>AI Suggestions</h3>
                <p>Get personalized recipe recommendations based on your inventory and dietary preferences</p>
              </div>
            </div>
          </div>
        </div>

        <div class="auth-section">
          <div class="container">
            <div class="auth-forms">
              <div id="login-form" class="auth-form" style="display: none;">
                <h3>Welcome Back</h3>
                <form onsubmit="return handleLogin(event)">
                  <input type="email" id="login-email" placeholder="Email" required>
                  <input type="password" id="login-password" placeholder="Password" required>
                  <button type="submit" class="btn btn-primary">Sign In</button>
                </form>
                <p>Don't have an account? <a href="#" data-action="show-signup">Sign up</a></p>
              </div>

              <div id="signup-form" class="auth-form" style="display: none;">
                <h3>Create Account</h3>
                <form onsubmit="return handleSignup(event)">
                  <input type="text" id="signup-name" placeholder="Full Name" required>
                  <input type="email" id="signup-email" placeholder="Email" required>
                  <input type="password" id="signup-password" placeholder="Password" required>
                  <button type="submit" class="btn btn-primary">Create Account</button>
                </form>
                <p>Already have an account? <a href="#" data-action="show-login">Sign in</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners for the marketing page
    this.setupMarketingEventListeners();
  }

  setupMarketingEventListeners() {
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'show-signup') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
      } else if (action === 'show-login') {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
      }
    });

    // Make auth functions globally available
    window.handleLogin = this.handleLogin.bind(this);
    window.handleSignup = this.handleSignup.bind(this);
  }

  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const result = await window.authManager.login(email, password);
      if (result.success) {
        // Reload to show the authenticated app
        window.location.reload();
      } else {
        alert('Login failed: ' + result.error);
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
    return false;
  }

  async handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      const result = await window.authManager.signup(email, password, name);
      if (result.success) {
        // Reload to show the authenticated app
        window.location.reload();
      } else {
        alert('Signup failed: ' + result.error);
      }
    } catch (error) {
      alert('Signup error: ' + error.message);
    }
    return false;
  }

  // AI Suggestions Feature
  async getAISuggestions() {
    const apiKey = this.userPreferences.openai_api_key;
    if (!apiKey) {
      this.aiSuggestions = {
        error: 'Please add your OpenAI API key in Account Settings to enable AI suggestions.',
        needsApiKey: true
      };
      this.showAiSuggestions = true;
      this.render();
      return;
    }

    this.loadingAiSuggestions = true;
    this.showAiSuggestions = true;
    this.render();

    try {
      const response = await fetch('/api/recipe-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory: this.inventory,
          recipes: this.recipes,
          preferences: this.userPreferences
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        this.aiSuggestions = result.suggestions;
      } else {
        this.aiSuggestions = {
          error: result.error || 'Failed to get AI suggestions'
        };
      }
    } catch (error) {
      this.aiSuggestions = {
        error: 'Unable to connect to AI service. Please check your API key and try again.'
      };
    }

    this.loadingAiSuggestions = false;
    this.render();
  }

  async showWelcomeWithAISuggestions() {
    // Mark as seen
    this.saveData('hasSeenWelcome', true);
    this.showWelcomePopup = false;
    
    // Automatically get AI suggestions for welcome popup
    await this.getAISuggestions();
  }

  closeAISuggestions() {
    this.showAiSuggestions = false;
    this.render();
  }

  renderAISuggestionsModal() {
    if (!this.showAiSuggestions) return '';

    if (this.loadingAiSuggestions) {
      return `
        <div class="modal-overlay" id="ai-suggestions-modal">
          <div class="modal-content ai-suggestions-modal">
            <div class="modal-header">
              <h2>🤖 AI Recipe Suggestions</h2>
              <button class="modal-close" onclick="app.closeAISuggestions()">×</button>
            </div>
            <div class="modal-body">
              <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Analyzing your inventory and recipes...</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.aiSuggestions?.error) {
      return `
        <div class="modal-overlay" id="ai-suggestions-modal">
          <div class="modal-content ai-suggestions-modal">
            <div class="modal-header">
              <h2>🤖 AI Recipe Suggestions</h2>
              <button class="modal-close" onclick="app.closeAISuggestions()">×</button>
            </div>
            <div class="modal-body">
              <div class="error-message">
                <p>❌ ${this.aiSuggestions.error}</p>
                <div class="error-actions">
                  ${this.aiSuggestions.needsApiKey ? `
                    <button class="btn btn-primary" onclick="app.currentPage='account'; app.closeAISuggestions(); app.render()">Go to Account Settings</button>
                  ` : `
                    <button class="btn btn-primary" onclick="app.getAISuggestions()">Try Again</button>
                  `}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (!this.aiSuggestions) return '';

    return `
      <div class="modal-overlay" id="ai-suggestions-modal">
        <div class="modal-content ai-suggestions-modal">
          <div class="modal-header">
            <h2>🤖 AI Recipe Suggestions</h2>
            <button class="modal-close" onclick="app.closeAISuggestions()">×</button>
          </div>
          <div class="modal-body">
            ${this.showWelcomePopup ? `
              <div class="welcome-message">
                <h3>👋 Welcome to Chef Mike's Culinary Classroom!</h3>
                <p>Here are some smart suggestions based on your current inventory:</p>
              </div>
            ` : ''}
            
            ${this.aiSuggestions.can_make_now?.length > 0 ? `
              <div class="suggestion-section">
                <h3>✅ Ready to Cook Now</h3>
                <div class="suggestion-cards">
                  ${this.aiSuggestions.can_make_now.map(recipe => `
                    <div class="suggestion-card ready-now">
                      <h4>${recipe.recipe_title}</h4>
                      <div class="match-percentage">${recipe.match_percentage}% match</div>
                      <p>${recipe.why_recommended}</p>
                      <button class="btn btn-primary" onclick="app.findAndOpenRecipe('${recipe.recipe_title}')">View Recipe</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${this.aiSuggestions.almost_makeable?.length > 0 ? `
              <div class="suggestion-section">
                <h3>🛒 Almost Ready (Shop for a few items)</h3>
                <div class="suggestion-cards">
                  ${this.aiSuggestions.almost_makeable.map(recipe => `
                    <div class="suggestion-card almost-ready">
                      <h4>${recipe.recipe_title}</h4>
                      <div class="match-percentage">${recipe.match_percentage}% match</div>
                      <p>${recipe.why_recommended}</p>
                      <div class="missing-ingredients">
                        <strong>Missing:</strong> ${recipe.missing_ingredients.join(', ')}
                      </div>
                      <button class="btn btn-secondary" onclick="app.findAndOpenRecipe('${recipe.recipe_title}')">View Recipe</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${this.aiSuggestions.quick_meal_ideas?.length > 0 ? `
              <div class="suggestion-section">
                <h3>⚡ Quick Meals for Busy People</h3>
                <div class="suggestion-cards">
                  ${this.aiSuggestions.quick_meal_ideas.map(recipe => `
                    <div class="suggestion-card quick-meal">
                      <h4>${recipe.recipe_title}</h4>
                      <div class="prep-time">⏱️ ${recipe.prep_time}</div>
                      <p>${recipe.why_perfect}</p>
                      <button class="btn btn-primary" onclick="app.findAndOpenRecipe('${recipe.recipe_title}')">View Recipe</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${this.aiSuggestions.shopping_suggestions?.length > 0 ? `
              <div class="suggestion-section">
                <h3>🛍️ Smart Shopping Suggestions</h3>
                <div class="shopping-suggestions">
                  ${this.aiSuggestions.shopping_suggestions.map(item => `
                    <div class="shopping-item priority-${item.priority}">
                      <strong>${item.ingredient}</strong>
                      <p>${item.reason}</p>
                      <button class="btn btn-outline" onclick="app.addToShoppingList('${item.ingredient}')">Add to Shopping List</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <div class="ai-suggestions-footer">
              <button class="btn btn-primary" onclick="app.getAISuggestions()">🔄 Refresh Suggestions</button>
              <button class="btn btn-secondary" onclick="app.closeAISuggestions()">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  findAndOpenRecipe(recipeName) {
    const recipe = this.recipes.find(r => r.title.toLowerCase() === recipeName.toLowerCase());
    if (recipe) {
      this.selectedRecipe = recipe;
      this.closeAISuggestions();
      this.currentPage = 'recipes';
      this.render();
    }
  }

  addToShoppingList(ingredient) {
    const existingItem = this.shoppingItems.find(item => 
      item.name.toLowerCase() === ingredient.toLowerCase()
    );
    
    if (!existingItem) {
      this.shoppingItems.push({
        id: this.generateId(),
        name: ingredient,
        category: 'Other',
        completed: false
      });
      this.saveData('shoppingItems', this.shoppingItems);
    }
    
    // Show success message
    alert(`Added "${ingredient}" to your shopping list!`);
  }

  // OpenAI API Key Management
  saveOpenAIKey() {
    const keyInput = document.getElementById('openai-api-key');
    if (!keyInput) return;
    
    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      alert('Please enter your OpenAI API key.');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      alert('Invalid API key format. OpenAI API keys start with "sk-".');
      return;
    }
    
    this.userPreferences.openai_api_key = apiKey;
    this.saveData('userPreferences', this.userPreferences);
    
    alert('OpenAI API key saved successfully! You can now use AI suggestions.');
    this.render();
  }

  async testAIConnection() {
    const apiKey = this.userPreferences.openai_api_key;
    if (!apiKey) {
      alert('No API key found. Please save your API key first.');
      return;
    }

    alert('Testing AI connection...');

    try {
      const response = await fetch('/api/recipe-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory: [
            { name: 'test item', quantity: 1, unit: 'piece', category: 'Other' }
          ],
          recipes: [
            { title: 'Test Recipe', ingredients: ['test item'], category: 'Test' }
          ],
          preferences: this.userPreferences,
          test: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Connection successful! Your API key is working correctly.');
      } else {
        alert(`❌ Connection failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Connection error: ${error.message}`);
    }
  }

  removeOpenAIKey() {
    if (confirm('Are you sure you want to remove your OpenAI API key? This will disable AI suggestions.')) {
      delete this.userPreferences.openai_api_key;
      this.saveData('userPreferences', this.userPreferences);
      
      alert('OpenAI API key removed. AI suggestions are now disabled.');
      this.render();
    }
  }

  setupEventListeners() {
    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-nav]')) {
        this.currentPage = e.target.dataset.nav;
        this.render();
      }
      
      // Handle action buttons and recipe cards
      let actionElement = e.target.closest('[data-action]');
      if (actionElement) {
        e.preventDefault();
        e.stopPropagation();
        this.handleAction(actionElement.dataset.action, actionElement.dataset);
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.target.matches('#recipe-form')) {
        this.handleRecipeSubmit(e.target);
      } else if (e.target.matches('#url-import-form')) {
        this.handleUrlImport(e.target);
      } else if (e.target.matches('#csv-import-form')) {
        this.handleCsvImport(e.target);
      } else if (e.target.matches('#inventory-form')) {
        this.handleInventorySubmit(e.target);
      }
    });

    // Filter inputs
    document.addEventListener('input', (e) => {
      if (e.target.matches('#recipe-search')) {
        this.searchQuery = e.target.value;
        this.render();
      } else if (e.target.matches('#inventory-search')) {
        this.inventorySearch = e.target.value;
        this.render();
      } else if (e.target.matches('#planner-search')) {
        this.plannerSearch = e.target.value;
        this.render();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('#category-filter')) {
        this.categoryFilter = e.target.value;
        this.render();
      } else if (e.target.matches('#time-filter')) {
        this.timeFilter = e.target.value;
        this.render();
      } else if (e.target.matches('#image-filter')) {
        this.imageFilter = e.target.value;
        this.render();
      } else if (e.target.matches('#planner-category-filter')) {
        this.plannerCategoryFilter = e.target.value;
        this.render();
      }
    });
  }

  handleAction(action, data) {
    switch (action) {
      case 'view-recipe':
        this.selectedRecipe = this.recipes.find(r => r.id === data.id);
        this.showRecipeModal();
        break;
      case 'add-recipe':
        this.showAddRecipeForm();
        break;
      case 'edit-recipe':
        this.selectedRecipe = this.recipes.find(r => r.id === data.id);
        this.showAddRecipeForm(true);
        break;
      case 'close-modal':
        this.closeModal();
        break;
      case 'delete-recipe':
        if (confirm('Are you sure you want to delete this recipe?')) {
          this.deleteRecipe(data.id);
        }
        break;
      case 'toggle-select':
        this.toggleRecipeSelection(data.id);
        break;
      case 'delete-selected':
        this.deleteSelectedRecipes();
        break;
      case 'select-all':
        this.selectAllRecipes();
        break;
      case 'print-recipe':
        this.printRecipe(data.id);
        break;
      case 'cooking-mode':
        this.showCookingMode(data.id);
        break;
      case 'add-to-planner':
        this.addToMealPlanner(data.id);
        break;
      case 'share-recipe':
        this.shareRecipe(data.id);
        break;
      case 'import-url':
        this.showImportUrlForm();
        break;
      case 'set-view':
        this.recipeViewMode = data.view;
        this.render();
        break;
      case 'clear-filters':
        this.clearFilters();
        break;
      case 'import-csv':
        this.showImportCsvForm();
        break;
      case 'export-json':
        this.exportRecipesJSON();
        break;
      case 'export-csv':
        this.exportRecipesCSV();
        break;
      // Inventory Management Actions
      case 'add-inventory-item':
        this.showAddInventoryForm();
        break;
      case 'edit-inventory-item':
        this.editInventoryItem(data.id);
        break;
      case 'delete-inventory-item':
        this.deleteInventoryItem(data.id);
        break;
      case 'increase-quantity':
        this.adjustInventoryQuantity(data.id, 1);
        break;
      case 'decrease-quantity':
        this.adjustInventoryQuantity(data.id, -1);
        break;
      case 'filter-inventory':
        this.inventoryFilter = data.category;
        this.render();
        break;
      // Dietary Restrictions Actions
      case 'add-restriction':
        this.addDietaryRestriction();
        break;
      case 'remove-restriction':
        this.removeDietaryRestriction(data.restriction);
        break;
      case 'add-allergy':
        this.addAllergy();
        break;
      case 'remove-allergy':
        this.removeAllergy(data.allergy);
        break;
      // OpenAI API Key Management Actions
      case 'save-openai-key':
        this.saveOpenAIKey();
        break;
      case 'test-ai-connection':
        this.testAIConnection();
        break;
      case 'remove-openai-key':
        this.removeOpenAIKey();
        break;
    }
  }



  handleRecipeSubmit(form) {
    const formData = new FormData(form);
    const recipeId = formData.get('recipe-id');
    const isEditing = recipeId && recipeId.trim() !== '';
    
    // Parse ingredients from the structured form
    const ingredients = [];
    for (let i = 0; i < 100; i++) { // Max 100 ingredients
      const amount = formData.get(`ingredient-amount-${i}`);
      const unit = formData.get(`ingredient-unit-${i}`);
      const item = formData.get(`ingredient-item-${i}`);
      const notes = formData.get(`ingredient-notes-${i}`);
      
      if (item && item.trim()) {
        ingredients.push({
          amount: amount || '',
          unit: unit || '',
          item: item.trim(),
          notes: notes || ''
        });
      }
    }
    
    // Parse directions from the structured form
    const directions = [];
    for (let i = 0; i < 100; i++) { // Max 100 directions
      const direction = formData.get(`direction-${i}`);
      if (direction && direction.trim()) {
        directions.push(direction.trim());
      }
    }

    const nutrition = {
      calories: formData.get('nutrition-calories') ? Number(formData.get('nutrition-calories')) : null,
      protein: formData.get('nutrition-protein') ? Number(formData.get('nutrition-protein')) : null,
      carbs: formData.get('nutrition-carbs') ? Number(formData.get('nutrition-carbs')) : null,
      fat: formData.get('nutrition-fat') ? Number(formData.get('nutrition-fat')) : null,
      fiber: formData.get('nutrition-fiber') ? Number(formData.get('nutrition-fiber')) : null,
      sugar: formData.get('nutrition-sugar') ? Number(formData.get('nutrition-sugar')) : null,
      sodium: formData.get('nutrition-sodium') ? Number(formData.get('nutrition-sodium')) : null,
      cholesterol: formData.get('nutrition-cholesterol') ? Number(formData.get('nutrition-cholesterol')) : null
    };

    const recipe = {
      id: isEditing ? recipeId : this.generateId(),
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      servings: formData.get('servings'),
      prep_time: formData.get('prep_time'),
      cook_time: formData.get('cook_time'),
      ingredients: ingredients,
      directions: directions,
      image: formData.get('image'),
      nutrition: nutrition,
      created_at: isEditing ? this.recipes.find(r => r.id === recipeId)?.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isEditing) {
      const index = this.recipes.findIndex(r => r.id === recipeId);
      if (index !== -1) {
        this.recipes[index] = recipe;
      }
    } else {
      this.recipes.push(recipe);
    }
    
    this.saveData('recipes', this.recipes);
    this.closeModal();
    this.render();
  }

  parseIngredients(text) {
    return text.split('\n').filter(line => line.trim()).map(line => {
      const parts = line.trim().split(' ');
      return {
        amount: parts[0] || '',
        unit: parts[1] || '',
        item: parts.slice(2).join(' ') || parts[0] || '',
        notes: ''
      };
    });
  }

  parseDirections(text) {
    return text.split('\n').filter(line => line.trim());
  }

  shareRecipe(recipeId) {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content">
          <button data-action="close-modal" class="modal-close">✕</button>
          <h2>📤 Share Recipe: ${recipe.title}</h2>
          
          <div class="share-options">
            <div class="share-method">
              <h3>📋 Copy Recipe Text</h3>
              <textarea readonly class="form-input form-textarea" rows="10" id="recipe-text">${this.formatRecipeForSharing(recipe)}</textarea>
              <button type="button" class="btn btn-primary w-full copy-recipe-btn">
                📋 Copy to Clipboard
              </button>
            </div>
            
            <div class="share-method">
              <h3>📄 Export as JSON</h3>
              <p>Download recipe as a JSON file for importing into other apps.</p>
              <button type="button" class="btn btn-secondary w-full download-json-btn" data-recipe-id="${recipeId}">
                💾 Download JSON
              </button>
            </div>
            
            <div class="share-method">
              <h3>🔗 Generate Link</h3>
              <p>Create a shareable link (Note: This is a demo - link contains recipe data).</p>
              <button type="button" class="btn btn-secondary w-full generate-link-btn" data-recipe-id="${recipeId}">
                🔗 Generate Link
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Add event listeners for share buttons
    document.querySelector('.copy-recipe-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('recipe-text').value);
      alert('Recipe copied to clipboard!');
    });
    
    document.querySelector('.download-json-btn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_')}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
    
    document.querySelector('.generate-link-btn').addEventListener('click', () => {
      const recipeData = encodeURIComponent(JSON.stringify(recipe));
      const shareUrl = `${window.location.origin}${window.location.pathname}?recipe=${recipeData}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard! (Note: This is a demo link with embedded recipe data)');
    });
  }

  formatRecipeForSharing(recipe) {
    let text = `${recipe.title}\n${'='.repeat(recipe.title.length)}\n\n`;
    
    if (recipe.description) {
      text += `${recipe.description}\n\n`;
    }
    
    if (recipe.servings || recipe.prep_time || recipe.cook_time) {
      text += 'Recipe Info:\n';
      if (recipe.servings) text += `🍽️ Servings: ${recipe.servings}\n`;
      if (recipe.prep_time) text += `⏱️ Prep Time: ${recipe.prep_time}\n`;
      if (recipe.cook_time) text += `🔥 Cook Time: ${recipe.cook_time}\n`;
      text += '\n';
    }
    
    // Add nutrition information if available
    if (this.hasNutritionData(recipe.nutrition)) {
      text += '📊 Nutrition Facts (per serving):\n';
      if (recipe.nutrition?.calories) text += `• Calories: ${recipe.nutrition.calories}\n`;
      if (recipe.nutrition?.protein) text += `• Protein: ${recipe.nutrition.protein}g\n`;
      if (recipe.nutrition?.carbs) text += `• Carbohydrates: ${recipe.nutrition.carbs}g\n`;
      if (recipe.nutrition?.fat) text += `• Fat: ${recipe.nutrition.fat}g\n`;
      if (recipe.nutrition?.fiber) text += `• Fiber: ${recipe.nutrition.fiber}g\n`;
      if (recipe.nutrition?.sugar) text += `• Sugar: ${recipe.nutrition.sugar}g\n`;
      if (recipe.nutrition?.sodium) text += `• Sodium: ${recipe.nutrition.sodium}mg\n`;
      if (recipe.nutrition?.cholesterol) text += `• Cholesterol: ${recipe.nutrition.cholesterol}mg\n`;
      text += '\n';
    }
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      text += 'Ingredients:\n';
      recipe.ingredients.forEach(ing => {
        text += `• ${ing.amount} ${ing.unit} ${ing.item}`;
        if (ing.notes) text += ` (${ing.notes})`;
        text += '\n';
      });
      text += '\n';
    }
    
    if (recipe.directions && recipe.directions.length > 0) {
      text += 'Directions:\n';
      recipe.directions.forEach((dir, index) => {
        text += `${index + 1}. ${dir}\n`;
      });
    }
    
    return text;
  }

  showImportUrlForm() {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content">
          <button data-action="close-modal" class="modal-close">✕</button>
          <h2>🔗 Import Recipe from URL</h2>
          
          <form id="url-import-form">
            <div class="form-group">
              <label>Recipe URL</label>
              <input type="url" name="url" required class="form-input" 
                     placeholder="https://example.com/recipe">
              <p class="form-help">Enter a URL from a recipe website. We'll try to extract the recipe details.</p>
            </div>
            
            <div class="form-actions">
              <button type="button" data-action="close-modal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">🔗 Import Recipe</button>
            </div>
          </form>
        </div>
      </div>
    `);
  }

  async handleUrlImport(form) {
    const formData = new FormData(form);
    const url = formData.get('url');
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Importing...';
    submitBtn.disabled = true;
    
    try {
      // Call the scraping endpoint
      const response = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      const recipeData = await response.json();
      
      if (!response.ok) {
        throw new Error(recipeData.error || 'Failed to scrape recipe');
      }
      
      // Create recipe with scraped data
      const recipe = {
        id: this.generateId(),
        title: recipeData.title || `Recipe from ${new URL(url).hostname}`,
        description: recipeData.description || '',
        category: recipeData.category || 'dinner',
        servings: recipeData.servings || '',
        prep_time: recipeData.prep_time || '',
        cook_time: recipeData.cook_time || '',
        ingredients: recipeData.ingredients && recipeData.ingredients.length > 0 ? 
          recipeData.ingredients : 
          [{ amount: '', unit: '', item: 'No ingredients found', notes: 'Please edit manually' }],
        directions: recipeData.directions && recipeData.directions.length > 0 ? 
          recipeData.directions : 
          ['No directions found. Please add cooking instructions manually.'],
        image: recipeData.image || '',
        source: url,
        nutrition: recipeData.nutrition || {},
        created_at: new Date().toISOString()
      };
      
      this.recipes.push(recipe);
      this.saveData('recipes', this.recipes);
      this.closeModal();
      this.render();
      
      if (recipeData.error) {
        alert(`Recipe imported but with limited data: ${recipeData.error}\n\nPlease review and edit the recipe as needed.`);
      } else {
        alert(`Recipe "${recipe.title}" successfully imported from ${new URL(url).hostname}!`);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      
      // Create a basic recipe with URL info as fallback
      const fallbackRecipe = {
        id: this.generateId(),
        title: `Recipe from ${new URL(url).hostname}`,
        description: `Imported from ${url}`,
        category: 'dinner',
        servings: '',
        prep_time: '',
        cook_time: '',
        ingredients: [
          { amount: '', unit: '', item: 'Please add ingredients manually', notes: 'Import failed' }
        ],
        directions: ['Recipe extraction failed. Please add cooking instructions manually.'],
        image: '',
        source: url,
        created_at: new Date().toISOString()
      };
      
      this.recipes.push(fallbackRecipe);
      this.saveData('recipes', this.recipes);
      this.closeModal();
      this.render();
      
      alert(`Could not extract recipe data from this URL. A placeholder recipe has been created for you to edit manually.\n\nError: ${error.message}`);
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  clearFilters() {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.timeFilter = '';
    this.imageFilter = '';
    this.render();
  }

  deleteRecipe(id) {
    this.recipes = this.recipes.filter(r => r.id !== id);
    this.saveData('recipes', this.recipes);
    this.render();
  }

  addToMealPlanner(recipeId) {
    const date = prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    const mealType = prompt('Enter meal type (breakfast, lunch, dinner, snacks):', 'dinner');
    
    if (date && mealType) {
      const mealPlan = {
        id: this.generateId(),
        date,
        meal_type: mealType,
        recipe_id: recipeId,
        notes: ''
      };
      
      this.mealPlans.push(mealPlan);
      this.saveData('mealPlans', this.mealPlans);
      alert('Added to meal planner!');
    }
  }

  showRecipeModal() {
    const recipe = this.selectedRecipe;
    if (!recipe) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content recipe-modal">
          <button data-action="close-modal" class="modal-close">✕</button>
          <div class="recipe-modal-layout">
            <div class="recipe-details">
              <div class="recipe-header">
                <h1>${recipe.title}</h1>
                <div class="recipe-actions">
                  <button data-action="edit-recipe" data-id="${recipe.id}" class="btn btn-secondary">
                    ✏️ Edit Recipe
                  </button>
                  <button data-action="share-recipe" data-id="${recipe.id}" class="btn btn-secondary">
                    📤 Share
                  </button>
                  <button data-action="add-to-planner" data-id="${recipe.id}" class="btn btn-primary">
                    📅 Add to Planner
                  </button>
                  <button data-action="print-recipe" data-id="${recipe.id}" class="btn btn-secondary">
                    🖨️ Print Recipe
                  </button>
                  <button data-action="cooking-mode" data-id="${recipe.id}" class="btn btn-success">
                    👨‍🍳 Cooking Mode
                  </button>
                </div>
              </div>
              
              ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
              
              <div class="recipe-meta">
                ${recipe.servings ? `<span class="meta-item"><strong>🍽️ Servings:</strong> ${recipe.servings}</span>` : ''}
                ${recipe.prep_time ? `<span class="meta-item"><strong>⏱️ Prep Time:</strong> ${recipe.prep_time}</span>` : ''}
                ${recipe.cook_time ? `<span class="meta-item"><strong>🔥 Cook Time:</strong> ${recipe.cook_time}</span>` : ''}
                ${recipe.category ? `<span class="meta-item"><strong>📂 Category:</strong> ${recipe.category}</span>` : ''}
              </div>
              
              ${this.hasNutritionData(recipe.nutrition) ? `
                <div class="recipe-section nutrition-section">
                  <h3>📊 Nutritional Information</h3>
                  <div class="nutrition-facts">
                    <div class="nutrition-header">
                      <h4>Nutrition Facts</h4>
                      <p>Per serving</p>
                    </div>
                    <div class="nutrition-main">
                      ${recipe.nutrition?.calories ? `
                        <div class="nutrition-item calories">
                          <span class="nutrition-label">Calories</span>
                          <span class="nutrition-value">${recipe.nutrition.calories}</span>
                        </div>
                      ` : ''}
                    </div>
                    <div class="nutrition-details">
                      ${recipe.nutrition?.fat ? `
                        <div class="nutrition-item">
                          <span class="nutrition-label">Total Fat</span>
                          <span class="nutrition-value">${recipe.nutrition.fat}g</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.cholesterol ? `
                        <div class="nutrition-item">
                          <span class="nutrition-label">Cholesterol</span>
                          <span class="nutrition-value">${recipe.nutrition.cholesterol}mg</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.sodium ? `
                        <div class="nutrition-item">
                          <span class="nutrition-label">Sodium</span>
                          <span class="nutrition-value">${recipe.nutrition.sodium}mg</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.carbs ? `
                        <div class="nutrition-item">
                          <span class="nutrition-label">Total Carbohydrates</span>
                          <span class="nutrition-value">${recipe.nutrition.carbs}g</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.fiber ? `
                        <div class="nutrition-item indented">
                          <span class="nutrition-label">Dietary Fiber</span>
                          <span class="nutrition-value">${recipe.nutrition.fiber}g</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.sugar ? `
                        <div class="nutrition-item indented">
                          <span class="nutrition-label">Sugars</span>
                          <span class="nutrition-value">${recipe.nutrition.sugar}g</span>
                        </div>
                      ` : ''}
                      ${recipe.nutrition?.protein ? `
                        <div class="nutrition-item">
                          <span class="nutrition-label">Protein</span>
                          <span class="nutrition-value">${recipe.nutrition.protein}g</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}
              
              ${recipe.ingredients?.length ? `
                <div class="recipe-section">
                  <h3>🥘 Ingredients</h3>
                  <div class="ingredients-list">
                    ${recipe.ingredients.map(ing => `
                      <div class="ingredient-item">
                        <span class="ingredient-amount">${ing.amount || ''} ${ing.unit || ''}</span>
                        <span class="ingredient-name">${ing.item || ''}</span>
                        ${ing.notes ? `<span class="ingredient-notes">(${ing.notes})</span>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${recipe.directions?.length ? `
                <div class="recipe-section">
                  <h3>📋 Directions</h3>
                  <div class="directions-list">
                    ${recipe.directions.map((dir, index) => `
                      <div class="direction-step">
                        <span class="step-number">${index + 1}</span>
                        <div class="step-content">${dir}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${recipe.source ? `
                <div class="recipe-source">
                  <small><strong>Source:</strong> <a href="${recipe.source}" target="_blank">${recipe.source}</a></small>
                </div>
              ` : ''}
              
              <div class="modal-actions" style="margin-top: 2rem; text-align: center;">
                <button data-action="delete-recipe" data-id="${recipe.id}" class="btn btn-danger">
                  🗑️ Delete Recipe
                </button>
              </div>
            </div>
            
            ${recipe.image ? `
              <div class="recipe-image-section">
                <img src="${recipe.image}" alt="${recipe.title}" class="recipe-modal-image">
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `);
  }

  showAddRecipeForm(isEditing = false) {
    const recipe = isEditing ? this.selectedRecipe : {};
    
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content recipe-form-modal">
          <button data-action="close-modal" class="modal-close">✕</button>
          <h2>${isEditing ? '✏️ Edit Recipe' : '➕ Add New Recipe'}</h2>
          
          <form id="recipe-form">
            <input type="hidden" name="recipe-id" value="${recipe.id || ''}">
            
            <div class="form-row">
              <div class="form-group">
                <label>Recipe Title *</label>
                <input type="text" name="title" required class="form-input" value="${recipe.title || ''}">
              </div>
              <div class="form-group">
                <label>Category</label>
                <select name="category" class="form-input">
                  <option value="">Select Category</option>
                  <option value="breakfast" ${recipe.category === 'breakfast' ? 'selected' : ''}>🌅 Breakfast</option>
                  <option value="lunch" ${recipe.category === 'lunch' ? 'selected' : ''}>☀️ Lunch</option>
                  <option value="dinner" ${recipe.category === 'dinner' ? 'selected' : ''}>🌙 Dinner</option>
                  <option value="dessert" ${recipe.category === 'dessert' ? 'selected' : ''}>🍰 Dessert</option>
                  <option value="snack" ${recipe.category === 'snack' ? 'selected' : ''}>🍎 Snacks</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" class="form-input form-textarea" rows="3">${recipe.description || ''}</textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Servings</label>
                <input type="text" name="servings" class="form-input" placeholder="4 people" value="${recipe.servings || ''}">
              </div>
              <div class="form-group">
                <label>Prep Time</label>
                <input type="text" name="prep_time" class="form-input" placeholder="15 minutes" value="${recipe.prep_time || ''}">
              </div>
              <div class="form-group">
                <label>Cook Time</label>
                <input type="text" name="cook_time" class="form-input" placeholder="30 minutes" value="${recipe.cook_time || ''}">
              </div>
            </div>
            
            <div class="form-group">
              <label>Recipe Image</label>
              <div class="image-upload-section">
                <div class="upload-options">
                  <input type="file" id="image-file" accept="image/*" style="display: none;">
                  <button type="button" class="btn btn-secondary" onclick="document.getElementById('image-file').click()">
                    📁 Upload Image
                  </button>
                  <span>or</span>
                  <input type="url" name="image" class="form-input" placeholder="Paste image URL" value="${recipe.image || ''}" style="flex: 1;">
                </div>
                ${recipe.image ? `
                  <div class="image-preview">
                    <img src="${recipe.image}" alt="Recipe preview" class="preview-image">
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.style.display='none'; document.querySelector('input[name=image]').value='';">
                      Remove Image
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div class="form-group">
              <label>Ingredients</label>
              <div class="ingredients-section">
                <div class="ingredient-headers">
                  <span>Amount</span>
                  <span>Unit</span>
                  <span>Item</span>
                  <span>Notes</span>
                  <span>Actions</span>
                </div>
                <div id="ingredients-list">
                  ${(recipe.ingredients || [{}]).map((ing, index) => `
                    <div class="ingredient-row">
                      <input type="text" name="ingredient-amount-${index}" class="form-input" placeholder="2" value="${ing.amount || ''}">
                      <input type="text" name="ingredient-unit-${index}" class="form-input" placeholder="cups" value="${ing.unit || ''}">
                      <input type="text" name="ingredient-item-${index}" class="form-input" placeholder="flour" value="${ing.item || ''}">
                      <input type="text" name="ingredient-notes-${index}" class="form-input" placeholder="sifted" value="${ing.notes || ''}">
                      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">❌</button>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="btn btn-secondary mt-2" onclick="window.app.addIngredient()">
                  ➕ Add Ingredient
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label>Directions</label>
              <div class="directions-section">
                <div id="directions-list">
                  ${(recipe.directions || ['']).map((dir, index) => `
                    <div class="direction-row">
                      <span class="step-number">${index + 1}.</span>
                      <textarea name="direction-${index}" class="form-input form-textarea" rows="2" placeholder="Describe this cooking step...">${dir}</textarea>
                      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); window.app.updateStepNumbers()">❌</button>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="btn btn-secondary mt-2" onclick="window.app.addDirection()">
                  ➕ Add Step
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label>📊 Nutritional Information (per serving)</label>
              <div class="nutrition-section">
                <div class="form-row">
                  <div class="form-group">
                    <label>Calories</label>
                    <input type="number" name="nutrition-calories" class="form-input" placeholder="250" value="${recipe.nutrition?.calories || ''}">
                  </div>
                  <div class="form-group">
                    <label>Protein (g)</label>
                    <input type="number" step="0.1" name="nutrition-protein" class="form-input" placeholder="12.5" value="${recipe.nutrition?.protein || ''}">
                  </div>
                  <div class="form-group">
                    <label>Carbs (g)</label>
                    <input type="number" step="0.1" name="nutrition-carbs" class="form-input" placeholder="30.2" value="${recipe.nutrition?.carbs || ''}">
                  </div>
                  <div class="form-group">
                    <label>Fat (g)</label>
                    <input type="number" step="0.1" name="nutrition-fat" class="form-input" placeholder="8.5" value="${recipe.nutrition?.fat || ''}">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Fiber (g)</label>
                    <input type="number" step="0.1" name="nutrition-fiber" class="form-input" placeholder="2.1" value="${recipe.nutrition?.fiber || ''}">
                  </div>
                  <div class="form-group">
                    <label>Sugar (g)</label>
                    <input type="number" step="0.1" name="nutrition-sugar" class="form-input" placeholder="5.2" value="${recipe.nutrition?.sugar || ''}">
                  </div>
                  <div class="form-group">
                    <label>Sodium (mg)</label>
                    <input type="number" name="nutrition-sodium" class="form-input" placeholder="320" value="${recipe.nutrition?.sodium || ''}">
                  </div>
                  <div class="form-group">
                    <label>Cholesterol (mg)</label>
                    <input type="number" name="nutrition-cholesterol" class="form-input" placeholder="45" value="${recipe.nutrition?.cholesterol || ''}">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" data-action="close-modal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEditing ? 'Update Recipe' : 'Save Recipe'}</button>
            </div>
          </form>
        </div>
      </div>
    `);

    // Set up image file upload handler
    document.getElementById('image-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const base64 = await this.fileToBase64(file);
          document.querySelector('input[name="image"]').value = base64;
          
          // Show preview
          const preview = document.querySelector('.image-preview') || document.createElement('div');
          preview.className = 'image-preview';
          preview.innerHTML = `
            <img src="${base64}" alt="Recipe preview" class="preview-image">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.style.display='none'; document.querySelector('input[name=image]').value='';">
              Remove Image
            </button>
          `;
          if (!document.querySelector('.image-preview')) {
            document.querySelector('.image-upload-section').appendChild(preview);
          }
        } catch (error) {
          alert('Failed to process image. Please try again.');
        }
      }
    });
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  closeModal() {
    // Close regular modals
    const modal = document.getElementById('modal-overlay');
    if (modal) {
      modal.remove();
    }
    
    // Close cooking mode modal
    const cookingModal = document.getElementById('cooking-modal');
    if (cookingModal) {
      cookingModal.remove();
      this.cookingModeActive = false;
    }
    
    // Close any other modal overlays
    const allModals = document.querySelectorAll('.modal-overlay');
    allModals.forEach(m => m.remove());
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <nav class="navbar">
        <div class="container">
          <div class="nav-brand">
            <h2>👨‍🍳 Chef Mike's Culinary Classroom</h2>
          </div>
          <div class="nav-links">
            <a href="#" data-nav="recipes" class="${this.currentPage === 'recipes' ? 'active' : ''}">🍳 Recipes</a>
            <a href="#" data-nav="meal-planner" class="${this.currentPage === 'meal-planner' ? 'active' : ''}">📅 Meal Planner</a>
            <a href="#" data-nav="shopping-list" class="${this.currentPage === 'shopping-list' ? 'active' : ''}">🛒 Shopping List</a>
            <a href="#" data-nav="inventory" class="${this.currentPage === 'inventory' ? 'active' : ''}">📦 Inventory</a>
            <div class="account-dropdown">
              <a href="#" data-nav="account" class="${this.currentPage === 'account' ? 'active' : ''}" onclick="app.toggleAccountDropdown(event)">👤 Account ▼</a>
              <div class="dropdown-menu" id="account-dropdown">
                <div class="dropdown-item user-info">
                  <span class="user-name">${this.user?.name || this.user?.email || 'Chef'}</span>
                </div>
                <div class="dropdown-divider"></div>
                <a href="#" data-nav="account" class="dropdown-item" onclick="app.navigateToPage('account'); app.closeAccountDropdown();">Account Settings</a>
                <a href="#" onclick="app.logout()" class="dropdown-item logout-item">Logout</a>
              </div>
            </div>
            <a href="#" onclick="app.getAISuggestions()" class="ai-suggestions-btn">🤖 AI Suggestions</a>
          </div>
        </div>
      </nav>
      
      <main class="container">
        ${this.renderPage()}
      </main>
      ${this.renderAISuggestionsModal()}
    `;
    
    // Setup drag and drop for meal planner after DOM is updated
    if (this.currentPage === 'meal-planner') {
      setTimeout(() => this.setupMealPlannerDragAndDrop(), 100);
    }
  }

  renderPage() {
    switch (this.currentPage) {
      case 'recipes':
        return this.renderRecipesPage();
      case 'meal-planner':
        return this.renderMealPlannerPage();
      case 'shopping-list':
        return this.renderShoppingListPage();
      case 'inventory':
        return this.renderInventoryPage();
      case 'account':
        return this.renderAccountPage();
      default:
        return this.renderRecipesPage();
    }
  }

  renderRecipesPage() {
    const filteredRecipes = this.getFilteredRecipes();
    const viewMode = this.recipeViewMode || 'card';
    
    return `
      <div class="page-header">
        <h1 class="page-title">🍳 My Recipes</h1>
        <p class="page-subtitle">Organize your favorite recipes and build your culinary collection</p>
      </div>
      
      <div class="recipes-layout">
        <!-- Sidebar Filters -->
        <div class="recipes-sidebar">
          <div class="card">
            <h3>📊 Recipe Stats</h3>
            <div class="recipe-stats">
              <div class="stat-item">
                <span class="stat-number">${this.recipes.length}</span>
                <span class="stat-label">Total Recipes</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${this.recipes.filter(r => r.image).length}</span>
                <span class="stat-label">With Photos</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>🔍 Filters</h3>
            <div class="filter-group">
              <label class="form-label">Search</label>
              <input 
                type="text" 
                id="recipe-search" 
                class="form-input" 
                placeholder="Search recipes..."
                value="${this.searchQuery || ''}"
              >
            </div>
            
            <div class="filter-group">
              <label class="form-label">Category</label>
              <select id="category-filter" class="form-input">
                <option value="">All Categories</option>
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">☀️ Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="dessert">🍰 Dessert</option>
                <option value="snack">🍎 Snacks</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label class="form-label">Prep Time</label>
              <select id="time-filter" class="form-input">
                <option value="">Any Time</option>
                <option value="quick">⚡ Quick (< 30 min)</option>
                <option value="medium">⏱️ Medium (30-60 min)</option>
                <option value="long">🕐 Long (> 60 min)</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label class="form-label">Has Image</label>
              <select id="image-filter" class="form-input">
                <option value="">All Recipes</option>
                <option value="yes">📸 With Photos</option>
                <option value="no">📝 No Photos</option>
              </select>
            </div>
            
            <button data-action="clear-filters" class="btn btn-secondary w-full">
              🗑️ Clear Filters
            </button>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="recipes-main">
          <div class="card mb-4">
            <div class="recipes-header">
              <div class="recipes-actions">
                <button data-action="add-recipe" class="btn btn-primary">➕ Add Recipe</button>
                <button data-action="import-url" class="btn btn-secondary">🔗 Import from URL</button>
                ${this.selectionMode ? `
                  <button data-action="delete-selected" class="btn btn-danger" ${this.selectedRecipes.size === 0 ? 'disabled' : ''}>
                    🗑️ Delete Selected (${this.selectedRecipes.size})
                  </button>
                  <button data-action="select-all" class="btn btn-secondary">
                    ${this.selectedRecipes.size === filteredRecipes.length ? '☑️ Unselect All' : '☐ Select All'}
                  </button>
                ` : ''}
                <button onclick="window.app.toggleSelectionMode()" class="btn btn-secondary">
                  ${this.selectionMode ? '✕ Cancel Selection' : '☐ Select Recipes'}
                </button>
              </div>
              
              <div class="view-controls">
                <div class="view-toggle">
                  <button 
                    data-action="set-view" 
                    data-view="card" 
                    class="btn ${viewMode === 'card' ? 'btn-primary' : 'btn-secondary'}"
                  >
                    📋 Cards
                  </button>
                  <button 
                    data-action="set-view" 
                    data-view="list" 
                    class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}"
                  >
                    📝 List
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          ${filteredRecipes.length === 0 ? `
            <div class="card text-center">
              <h3>No recipes found</h3>
              <p>${this.recipes.length === 0 ? 'Start building your recipe collection!' : 'Try adjusting your filters or search terms.'}</p>
              <button data-action="add-recipe" class="btn btn-primary mt-3">➕ Add Your First Recipe</button>
            </div>
          ` : `
            <div class="${viewMode === 'card' ? 'recipes-grid' : 'recipes-list'}">
              ${filteredRecipes.map(recipe => this.renderRecipeItem(recipe, viewMode)).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderRecipeItem(recipe, viewMode) {
    const isSelected = this.selectedRecipes.has(recipe.id);
    const selectionClass = this.selectionMode ? 'selection-mode' : '';
    const selectedClass = isSelected ? 'selected' : '';
    
    if (viewMode === 'list') {
      return `
        <div class="recipe-list-item ${selectionClass} ${selectedClass}" ${!this.selectionMode ? `data-action="view-recipe" data-id="${recipe.id}"` : ''}>
          ${this.selectionMode ? `
            <div class="selection-checkbox">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-action="toggle-select" data-id="${recipe.id}" onclick="event.stopPropagation()">
            </div>
          ` : ''}
          <div class="recipe-thumbnail">
            ${recipe.image ? 
              `<img src="${recipe.image}" alt="${recipe.title}" class="thumbnail-image">` : 
              '<div class="thumbnail-placeholder">🍳</div>'
            }
          </div>
          <div class="recipe-info">
            <h3 class="recipe-title">${recipe.title}</h3>
            <p class="recipe-description">${recipe.description || 'No description'}</p>
            <div class="recipe-meta">
              ${recipe.servings ? `<span>🍽️ ${recipe.servings}</span>` : ''}
              ${recipe.prep_time ? `<span>⏱️ ${recipe.prep_time}</span>` : ''}
              ${recipe.cook_time ? `<span>🔥 ${recipe.cook_time}</span>` : ''}
            </div>
          </div>
          <div class="recipe-actions">
            ${!this.selectionMode ? `
              <button data-action="share-recipe" data-id="${recipe.id}" class="btn btn-secondary" onclick="event.stopPropagation()">
                📤 Share
              </button>
              <button data-action="edit-recipe" data-id="${recipe.id}" class="btn btn-secondary" onclick="event.stopPropagation()">
                ✏️ Edit
              </button>
              <button data-action="delete-recipe" data-id="${recipe.id}" class="btn btn-danger" onclick="event.stopPropagation()">
                🗑️ Delete
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="recipe-card ${selectionClass} ${selectedClass}" ${!this.selectionMode ? `data-action="view-recipe" data-id="${recipe.id}"` : ''}>
          ${this.selectionMode ? `
            <div class="selection-checkbox">
              <input type="checkbox" ${isSelected ? 'checked' : ''} data-action="toggle-select" data-id="${recipe.id}" onclick="event.stopPropagation()">
            </div>
          ` : ''}
          <div class="recipe-image-container">
            ${recipe.image ? 
              `<img src="${recipe.image}" alt="${recipe.title}" class="recipe-image">` : 
              '<div class="recipe-placeholder">🍳</div>'
            }
          </div>
          <div class="recipe-content">
            <h3 class="recipe-title">${recipe.title}</h3>
            ${recipe.description ? `<p class="recipe-description">${recipe.description.substring(0, 80)}${recipe.description.length > 80 ? '...' : ''}</p>` : ''}
            <div class="recipe-meta">
              ${recipe.servings ? `<span>🍽️ ${recipe.servings}</span>` : ''}
              ${recipe.prep_time ? `<span>⏱️ ${recipe.prep_time}</span>` : ''}
              ${recipe.cook_time ? `<span>🔥 ${recipe.cook_time}</span>` : ''}
            </div>
            ${!this.selectionMode ? `
              <div class="recipe-card-actions">
                <button data-action="share-recipe" data-id="${recipe.id}" class="btn btn-secondary" onclick="event.stopPropagation()">
                  📤
                </button>
                <button data-action="edit-recipe" data-id="${recipe.id}" class="btn btn-secondary" onclick="event.stopPropagation()">
                  ✏️
                </button>
                <button data-action="delete-recipe" data-id="${recipe.id}" class="btn btn-danger" onclick="event.stopPropagation()">
                  🗑️
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  getFilteredRecipes() {
    let filtered = [...this.recipes];
    
    // Search filter
    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients?.some(ing => ing.item.toLowerCase().includes(query))
      );
    }
    
    // Category filter
    if (this.categoryFilter) {
      filtered = filtered.filter(recipe => 
        recipe.category && recipe.category.toLowerCase() === this.categoryFilter
      );
    }
    
    // Time filter
    if (this.timeFilter) {
      filtered = filtered.filter(recipe => {
        const prepTime = this.parseTime(recipe.prep_time);
        const cookTime = this.parseTime(recipe.cook_time);
        const totalTime = prepTime + cookTime;
        
        switch (this.timeFilter) {
          case 'quick': return totalTime < 30;
          case 'medium': return totalTime >= 30 && totalTime <= 60;
          case 'long': return totalTime > 60;
          default: return true;
        }
      });
    }
    
    // Image filter
    if (this.imageFilter) {
      filtered = filtered.filter(recipe => {
        const hasImage = recipe.image && recipe.image.trim() !== '';
        return this.imageFilter === 'yes' ? hasImage : !hasImage;
      });
    }
    
    return filtered;
  }

  parseTime(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  renderMealPlannerPage() {
    const today = new Date();
    const currentYear = this.currentPlannerYear || today.getFullYear();
    const currentMonth = this.currentPlannerMonth !== undefined ? this.currentPlannerMonth : today.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const weeks = [];
    let currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === currentMonth;
        const isToday = currentDate.toDateString() === today.toDateString();
        
        weekDays.push({
          date: new Date(currentDate),
          dateStr: dateStr,
          isCurrentMonth: isCurrentMonth,
          isToday: isToday
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekDays);
      
      // Stop if we've gone past the current month and have at least 4 weeks
      if (week >= 3 && weekDays[0].date.getMonth() !== currentMonth) {
        break;
      }
    }

    return `
      <div class="meal-planner-layout">
        <!-- Sidebar with Recipe Search -->
        <div class="planner-sidebar">
          <div class="sidebar-section">
            <h3>🍳 Recipe Library</h3>
            <div class="planner-recipe-filters">
              <div class="search-box">
                <input type="text" id="planner-search" placeholder="Search recipes..." value="${this.plannerSearch || ''}" class="form-input">
              </div>
              <div class="category-filter">
                <select id="planner-category-filter" class="form-input">
                  <option value="">All Categories</option>
                  ${this.getRecipeCategories().map(cat => `
                    <option value="${cat}" ${this.plannerCategoryFilter === cat ? 'selected' : ''}>${cat}</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
          
          <div class="sidebar-section">
            <div class="recipe-list-sidebar" id="sidebar-recipes">
              ${this.getFilteredPlannerRecipes().map(recipe => {
                const warnings = this.checkRecipeWarnings(recipe);
                return `
                  <div class="sidebar-recipe-item" draggable="true" data-recipe-id="${recipe.id}">
                    <div class="recipe-thumbnail-small">
                      ${recipe.image ? 
                        `<img src="${recipe.image}" alt="${recipe.title}">` : 
                        '<div class="placeholder-small">🍳</div>'
                      }
                    </div>
                    <div class="recipe-info-small">
                      <h4>${recipe.title}</h4>
                      <p>${recipe.category || 'Uncategorized'}</p>
                      ${warnings.length > 0 ? `
                        <div class="recipe-warnings">
                          ${warnings.map(warning => `
                            <div class="warning ${warning.type}">
                              ${warning.message}
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
              
              ${this.getFilteredPlannerRecipes().length === 0 ? `
                <div class="empty-recipes-message">
                  <p>No recipes found. ${this.plannerSearch || this.plannerCategoryFilter ? 'Try adjusting your filters.' : 'Add some recipes first!'}</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Main Calendar -->
        <div class="planner-main">
          <div class="planner-header">
            <div class="planner-nav">
              <button class="btn btn-secondary" onclick="window.app.navigateMonth(-1)">‹ Previous</button>
              <h2>${monthNames[currentMonth]} ${currentYear}</h2>
              <button class="btn btn-secondary" onclick="window.app.navigateMonth(1)">Next ›</button>
            </div>
            <div class="planner-controls">
              <button class="btn btn-primary" onclick="window.app.showTodayPlanner()">Today</button>
              <button class="btn btn-secondary" onclick="window.app.clearAllMeals()">Clear All</button>
            </div>
          </div>

          <div class="calendar-grid">
            <div class="calendar-header">
              <div class="day-header">Sunday</div>
              <div class="day-header">Monday</div>
              <div class="day-header">Tuesday</div>
              <div class="day-header">Wednesday</div>
              <div class="day-header">Thursday</div>
              <div class="day-header">Friday</div>
              <div class="day-header">Saturday</div>
            </div>
            
            ${weeks.map(week => `
              <div class="calendar-week">
                ${week.map(day => `
                  <div class="calendar-day ${day.isCurrentMonth ? 'current-month' : 'other-month'} ${day.isToday ? 'today' : ''}" 
                       data-date="${day.dateStr}">
                    <div class="day-number">${day.date.getDate()}</div>
                    
                    <div class="meal-slot breakfast" data-meal="breakfast" data-date="${day.dateStr}">
                      <div class="meal-label">Breakfast</div>
                      <div class="meal-content" id="breakfast-${day.dateStr}">
                        ${this.getMealForDate(day.dateStr, 'breakfast')}
                      </div>
                    </div>
                    
                    <div class="meal-slot lunch" data-meal="lunch" data-date="${day.dateStr}">
                      <div class="meal-label">Lunch</div>
                      <div class="meal-content" id="lunch-${day.dateStr}">
                        ${this.getMealForDate(day.dateStr, 'lunch')}
                      </div>
                    </div>
                    
                    <div class="meal-slot dinner" data-meal="dinner" data-date="${day.dateStr}">
                      <div class="meal-label">Dinner</div>
                      <div class="meal-content" id="dinner-${day.dateStr}">
                        ${this.getMealForDate(day.dateStr, 'dinner')}
                      </div>
                    </div>
                    
                    <div class="meal-slot snacks" data-meal="snacks" data-date="${day.dateStr}">
                      <div class="meal-label">Snacks</div>
                      <div class="meal-content" id="snacks-${day.dateStr}">
                        ${this.getMealForDate(day.dateStr, 'snacks')}
                      </div>
                    </div>
                    
                    <div class="day-notes">
                      <textarea placeholder="Notes..." class="notes-input" 
                                data-date="${day.dateStr}" 
                                onchange="window.app.saveDayNote('${day.dateStr}', this.value)">${this.getDayNote(day.dateStr)}</textarea>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderShoppingListPage() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return `
      <div class="page-header">
        <h1 class="page-title">🛒 Shopping List</h1>
        <p class="page-subtitle">Generate shopping lists from your meal plans and add custom items</p>
      </div>
      
      <div class="shopping-list-controls">
        <div class="date-range-picker">
          <label>Generate from meal plans:</label>
          <input type="date" id="start-date" value="${today}">
          <span>to</span>
          <input type="date" id="end-date" value="${nextWeek}">
          <button class="generate-list-btn" onclick="window.app.generateShoppingListFromMeals()">
            📋 Generate List
          </button>
        </div>
        
        <button class="clear-checked-btn" onclick="window.app.clearCheckedItems()">
          🗑️ Clear Checked Items
        </button>
      </div>
      
      ${this.renderShoppingCategories()}
    `;
  }

  renderShoppingCategories() {
    const categories = this.getShoppingCategories();
    
    return `
      <div class="shopping-categories">
        ${Object.entries(categories).map(([categoryKey, category]) => {
          const items = this.shoppingItems.filter(item => item.category === categoryKey);
          return `
            <div class="category-section ${categoryKey}">
              <div class="category-header">
                <div class="category-title">
                  ${category.icon} ${category.name}
                </div>
                <div class="category-count">${items.length} items</div>
              </div>
              
              <div class="add-item-form">
                <input type="text" 
                       class="add-item-input" 
                       placeholder="Add item to ${category.name.toLowerCase()}..."
                       id="add-${categoryKey}"
                       onkeypress="if(event.key === 'Enter') window.app.addShoppingItem('${categoryKey}')">
                <button class="add-item-btn" onclick="window.app.addShoppingItem('${categoryKey}')">
                  + Add
                </button>
              </div>
              
              <ul class="category-items">
                ${items.map(item => `
                  <li class="shopping-item">
                    <div class="item-checkbox ${item.checked ? 'checked' : ''}" 
                         onclick="window.app.toggleShoppingItem('${item.id}')"></div>
                    <div class="item-text ${item.checked ? 'checked' : ''}">
                      ${item.name}
                    </div>
                    ${item.amount ? `<div class="item-amount">${item.amount}</div>` : ''}
                    <button class="remove-item" onclick="window.app.removeShoppingItem('${item.id}')">
                      ×
                    </button>
                  </li>
                `).join('')}
                ${items.length === 0 ? `
                  <li class="shopping-item" style="opacity: 0.6; font-style: italic;">
                    No items in this category yet
                  </li>
                ` : ''}
              </ul>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  getShoppingCategories() {
    return {
      produce: { name: 'Produce', icon: '🥬' },
      meat: { name: 'Meat & Poultry', icon: '🍗' },
      seafood: { name: 'Seafood', icon: '🐟' },
      dairy: { name: 'Dairy', icon: '🥛' },
      frozen: { name: 'Frozen', icon: '🧊' },
      bakery: { name: 'Bread & Bakery', icon: '🍞' },
      snacks: { name: 'Snacks', icon: '🍿' },
      beverages: { name: 'Beverages', icon: '🥤' },
      pantry: { name: 'Canned & Dry Goods', icon: '🥫' },
      household: { name: 'Household Items', icon: '🧽' }
    };
  }

  addShoppingItem(category) {
    const input = document.getElementById(`add-${category}`);
    const itemName = input.value.trim();
    
    if (!itemName) return;
    
    const newItem = {
      id: this.generateId(),
      name: itemName,
      category: category,
      checked: false,
      amount: '',
      addedDate: new Date().toISOString()
    };
    
    this.shoppingItems.push(newItem);
    this.saveData('shoppingItems', this.shoppingItems);
    input.value = '';
    this.render();
  }

  removeShoppingItem(itemId) {
    this.shoppingItems = this.shoppingItems.filter(item => item.id !== itemId);
    this.saveData('shoppingItems', this.shoppingItems);
    this.render();
  }

  toggleShoppingItem(itemId) {
    const item = this.shoppingItems.find(item => item.id === itemId);
    if (item) {
      item.checked = !item.checked;
      this.saveData('shoppingItems', this.shoppingItems);
      this.render();
    }
  }

  clearCheckedItems() {
    const checkedCount = this.shoppingItems.filter(item => item.checked).length;
    if (checkedCount === 0) {
      alert('No checked items to clear.');
      return;
    }
    
    if (confirm(`Are you sure you want to remove ${checkedCount} checked items?`)) {
      this.shoppingItems = this.shoppingItems.filter(item => !item.checked);
      this.saveData('shoppingItems', this.shoppingItems);
      this.render();
    }
  }

  generateShoppingListFromMeals() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      alert('Start date must be before end date.');
      return;
    }
    
    // Find meal plans in date range
    const relevantMealPlans = this.mealPlans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate >= start && planDate <= end;
    });
    
    if (relevantMealPlans.length === 0) {
      alert('No meal plans found in the selected date range.');
      return;
    }
    
    // Generate ingredients from meal plans
    const ingredientMap = new Map();
    
    relevantMealPlans.forEach(plan => {
      const recipe = this.recipes.find(r => r.id === plan.recipe_id);
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ingredient => {
          const key = `${ingredient.item}|${ingredient.unit || ''}`;
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            const newAmount = parseFloat(ingredient.amount || 0);
            const existingAmount = parseFloat(existing.amount || 0);
            existing.amount = (existingAmount + newAmount).toString();
            existing.recipes.push(recipe.title);
          } else {
            ingredientMap.set(key, {
              item: ingredient.item,
              amount: ingredient.amount || '',
              unit: ingredient.unit || '',
              recipes: [recipe.title]
            });
          }
        });
      }
    });
    
    // Convert ingredients to shopping items and categorize them
    const ingredients = Array.from(ingredientMap.values());
    let addedCount = 0;
    
    ingredients.forEach(ingredient => {
      // Check if item already exists
      const existingItem = this.shoppingItems.find(item => 
        item.name.toLowerCase().includes(ingredient.item.toLowerCase()) ||
        ingredient.item.toLowerCase().includes(item.name.toLowerCase())
      );
      
      if (!existingItem) {
        const category = this.categorizeIngredient(ingredient.item);
        const amountText = ingredient.amount && ingredient.unit ? 
          `${ingredient.amount} ${ingredient.unit}` : 
          ingredient.amount || '';
        
        const newItem = {
          id: this.generateId(),
          name: ingredient.item,
          category: category,
          checked: false,
          amount: amountText,
          addedDate: new Date().toISOString(),
          fromRecipes: ingredient.recipes
        };
        
        this.shoppingItems.push(newItem);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      this.saveData('shoppingItems', this.shoppingItems);
      this.render();
      alert(`Added ${addedCount} new ingredients to your shopping list!`);
    } else {
      alert('All ingredients from your meal plans are already in your shopping list.');
    }
  }

  categorizeIngredient(ingredient) {
    const item = ingredient.toLowerCase();
    
    // Produce
    if (item.includes('lettuce') || item.includes('tomato') || item.includes('onion') || 
        item.includes('carrot') || item.includes('celery') || item.includes('pepper') ||
        item.includes('cucumber') || item.includes('spinach') || item.includes('potato') ||
        item.includes('garlic') || item.includes('herb') || item.includes('fruit') ||
        item.includes('apple') || item.includes('banana') || item.includes('lemon') ||
        item.includes('lime') || item.includes('mushroom') || item.includes('avocado')) {
      return 'produce';
    }
    
    // Meat & Poultry
    if (item.includes('chicken') || item.includes('beef') || item.includes('pork') ||
        item.includes('turkey') || item.includes('ham') || item.includes('bacon') ||
        item.includes('sausage') || item.includes('ground') || item.includes('steak')) {
      return 'meat';
    }
    
    // Seafood
    if (item.includes('fish') || item.includes('salmon') || item.includes('tuna') ||
        item.includes('shrimp') || item.includes('crab') || item.includes('lobster')) {
      return 'seafood';
    }
    
    // Dairy
    if (item.includes('milk') || item.includes('cheese') || item.includes('butter') ||
        item.includes('cream') || item.includes('yogurt') || item.includes('egg')) {
      return 'dairy';
    }
    
    // Frozen
    if (item.includes('frozen') || item.includes('ice cream')) {
      return 'frozen';
    }
    
    // Bakery
    if (item.includes('bread') || item.includes('bagel') || item.includes('muffin') ||
        item.includes('croissant') || item.includes('roll')) {
      return 'bakery';
    }
    
    // Beverages
    if (item.includes('juice') || item.includes('soda') || item.includes('water') ||
        item.includes('coffee') || item.includes('tea') || item.includes('wine') ||
        item.includes('beer') || item.includes('drink')) {
      return 'beverages';
    }
    
    // Snacks
    if (item.includes('chip') || item.includes('cookie') || item.includes('candy') ||
        item.includes('nuts') || item.includes('crackers')) {
      return 'snacks';
    }
    
    // Default to pantry for everything else (flour, sugar, spices, canned goods, etc.)
    return 'pantry';
  }

  renderAccountPage() {
    const restrictions = this.userPreferences.dietary_restrictions || [];
    const allergies = this.userPreferences.allergies || [];
    const userApiKey = this.userPreferences.openai_api_key || '';
    
    return `
      <div class="page-header">
        <h1 class="page-title">👤 Account Settings</h1>
        <p class="page-subtitle">Manage your preferences, dietary restrictions, and AI features</p>
      </div>
      
      <div class="account-grid">
        <!-- OpenAI API Configuration -->
        <div class="card">
          <h3>🤖 AI Features Configuration</h3>
          <p>Connect your OpenAI account to enable smart recipe suggestions and meal planning recommendations.</p>
          
          <div class="ai-config-container">
            <div class="form-group">
              <label for="openai-api-key" class="form-label">OpenAI API Key</label>
              <input 
                type="password" 
                id="openai-api-key" 
                class="form-input" 
                placeholder="sk-..." 
                value="${userApiKey}"
                autocomplete="off"
              >
              <small class="form-help">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>. 
                Your key is stored locally and only used for AI suggestions.
              </small>
            </div>
            
            <div class="ai-status">
              ${userApiKey ? `
                <div class="status-indicator connected">
                  <span class="status-dot"></span>
                  <span>API Key Connected</span>
                </div>
                <p class="status-description">AI suggestions are enabled. Click "🤖 AI Suggestions" to get personalized recommendations.</p>
              ` : `
                <div class="status-indicator disconnected">
                  <span class="status-dot"></span>
                  <span>No API Key</span>
                </div>
                <p class="status-description">Add your OpenAI API key to enable smart recipe suggestions based on your inventory.</p>
              `}
            </div>
            
            <div class="ai-features-info">
              <h4>🌟 AI Features Include:</h4>
              <ul>
                <li>📋 Smart recipe suggestions based on your current inventory</li>
                <li>⚡ Quick meal ideas perfect for busy schedules</li>
                <li>🛒 Shopping recommendations to unlock more recipes</li>
                <li>👋 Welcome suggestions for new users</li>
              </ul>
            </div>
            
            <div class="form-actions">
              <button data-action="save-openai-key" class="btn btn-primary">Save API Key</button>
              ${userApiKey ? `<button data-action="test-ai-connection" class="btn btn-secondary">Test Connection</button>` : ''}
              ${userApiKey ? `<button data-action="remove-openai-key" class="btn btn-outline">Remove Key</button>` : ''}
            </div>
          </div>
        </div>
        <!-- Dietary Restrictions -->
        <div class="card">
          <h3>🥗 Dietary Restrictions</h3>
          <p>Set your dietary preferences to get warnings for incompatible recipes.</p>
          
          <div class="restrictions-container">
            <div class="current-restrictions">
              ${restrictions.map(restriction => `
                <span class="restriction-tag">
                  ${restriction}
                  <button data-action="remove-restriction" data-restriction="${restriction}" class="remove-tag">✕</button>
                </span>
              `).join('')}
            </div>
            
            <div class="add-restriction">
              <select id="restriction-select" class="form-input">
                <option value="">Add restriction...</option>
                <option value="Vegetarian">🌱 Vegetarian</option>
                <option value="Vegan">🌿 Vegan</option>
                <option value="Gluten-Free">🌾 Gluten-Free</option>
                <option value="Dairy-Free">🥛 Dairy-Free</option>
                <option value="Keto">🥑 Keto</option>
                <option value="Paleo">🥩 Paleo</option>
                <option value="Low-Carb">🥬 Low-Carb</option>
                <option value="Low-Sodium">🧂 Low-Sodium</option>
                <option value="Kosher">✡️ Kosher</option>
                <option value="Halal">☪️ Halal</option>
              </select>
              <button data-action="add-restriction" class="btn btn-secondary">Add</button>
            </div>
          </div>
        </div>
        
        <!-- Allergies -->
        <div class="card">
          <h3>⚠️ Food Allergies</h3>
          <p>Important: This will show critical warnings for recipes containing these allergens.</p>
          
          <div class="allergies-container">
            <div class="current-allergies">
              ${allergies.map(allergy => `
                <span class="allergy-tag">
                  ⚠️ ${allergy}
                  <button data-action="remove-allergy" data-allergy="${allergy}" class="remove-tag">✕</button>
                </span>
              `).join('')}
            </div>
            
            <div class="add-allergy">
              <select id="allergy-select" class="form-input">
                <option value="">Add allergy...</option>
                <option value="Nuts">🥜 Nuts</option>
                <option value="Peanuts">🥜 Peanuts</option>
                <option value="Shellfish">🦐 Shellfish</option>
                <option value="Fish">🐟 Fish</option>
                <option value="Eggs">🥚 Eggs</option>
                <option value="Milk">🥛 Milk</option>
                <option value="Soy">🫘 Soy</option>
                <option value="Wheat">🌾 Wheat</option>
                <option value="Sesame">🫘 Sesame</option>
              </select>
              <button data-action="add-allergy" class="btn btn-secondary">Add</button>
            </div>
          </div>
        </div>
        
        <!-- Profile Info -->
        <div class="card">
          <h3>👨‍🍳 Profile</h3>
          <div class="profile-info">
            <p><strong>Name:</strong> Chef Mike</p>
            <p><strong>Email:</strong> chef@example.com</p>
          </div>
          <div class="alert alert-info">
            <strong>Demo Mode:</strong> This is a demonstration version. 
            In production, you would be able to edit your profile information here.
          </div>
        </div>
        
        <!-- Data Summary -->
        <div class="card">
          <h3>📊 Data Summary</h3>
          <div class="data-stats">
            <div class="stat">
              <span class="stat-number">${this.recipes.length}</span>
              <span class="stat-label">Recipes</span>
            </div>
            <div class="stat">
              <span class="stat-number">${this.mealPlans.length}</span>
              <span class="stat-label">Meal Plans</span>
            </div>
            <div class="stat">
              <span class="stat-number">${this.inventory.length}</span>
              <span class="stat-label">Inventory Items</span>
            </div>
          </div>
        </div>
        
        <!-- Import/Export -->
        <div class="card">
          <h3>📥 Import Recipes</h3>
          <p>Import multiple recipes from a CSV file.</p>
          <div class="import-section">
            <button data-action="import-csv" class="btn btn-primary w-full">
              📄 Upload CSV File
            </button>
            <p class="form-help mt-2">
              CSV should have columns: title, description, category, servings, prep_time, cook_time, ingredients, directions, image
            </p>
          </div>
        </div>
        
        <div class="card">
          <h3>📤 Export Data</h3>
          <p>Download your recipe collection as JSON or CSV.</p>
          <div class="export-section">
            <button data-action="export-json" class="btn btn-secondary w-full mb-2">
              💾 Export as JSON
            </button>
            <button data-action="export-csv" class="btn btn-secondary w-full">
              📄 Export as CSV
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showImportCsvForm() {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content">
          <button data-action="close-modal" class="modal-close">✕</button>
          <h2>📄 Import Recipes from CSV</h2>
          
          <form id="csv-import-form">
            <div class="form-group">
              <label>CSV File</label>
              <input type="file" name="csv-file" accept=".csv" required class="form-input">
              <p class="form-help">
                CSV should contain these columns:<br>
                title, description, category, servings, prep_time, cook_time, ingredients, directions, image
              </p>
            </div>
            
            <div class="form-actions">
              <button type="button" data-action="close-modal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">📄 Import Recipes</button>
            </div>
          </form>
        </div>
      </div>
    `);
  }

  async handleCsvImport(form) {
    const formData = new FormData(form);
    const csvFile = formData.get('csv-file');
    
    if (!csvFile) {
      alert('Please select a CSV file.');
      return;
    }
    
    try {
      const csvText = await csvFile.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      let importedCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        const recipe = {};
        
        headers.forEach((header, index) => {
          recipe[header] = values[index] || '';
        });
        
        if (recipe.title) {
          const newRecipe = {
            id: this.generateId(),
            title: recipe.title,
            description: recipe.description || '',
            category: recipe.category || '',
            servings: recipe.servings || '',
            prep_time: recipe.prep_time || '',
            cook_time: recipe.cook_time || '',
            ingredients: recipe.ingredients ? this.parseIngredientsFromText(recipe.ingredients) : [],
            directions: recipe.directions ? recipe.directions.split(';').map(d => d.trim()) : [],
            image: recipe.image || '',
            created_at: new Date().toISOString()
          };
          
          this.recipes.push(newRecipe);
          importedCount++;
        }
      }
      
      this.saveData('recipes', this.recipes);
      this.closeModal();
      this.render();
      
      alert(`Successfully imported ${importedCount} recipes from CSV file.`);
    } catch (error) {
      alert('Failed to import CSV file. Please check the file format and try again.');
    }
  }

  parseIngredientsFromText(text) {
    return text.split(';').map(ingredient => {
      const parts = ingredient.trim().split(' ');
      return {
        amount: parts[0] || '',
        unit: parts[1] || '',
        item: parts.slice(2).join(' ') || ingredient.trim(),
        notes: ''
      };
    });
  }

  addIngredient() {
    const ingredientsList = document.getElementById('ingredients-list');
    const index = ingredientsList.children.length;
    
    const newRow = document.createElement('div');
    newRow.className = 'ingredient-row';
    newRow.innerHTML = `
      <input type="text" name="ingredient-amount-${index}" class="form-input" placeholder="2">
      <input type="text" name="ingredient-unit-${index}" class="form-input" placeholder="cups">
      <input type="text" name="ingredient-item-${index}" class="form-input" placeholder="flour">
      <input type="text" name="ingredient-notes-${index}" class="form-input" placeholder="sifted">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">❌</button>
    `;
    
    ingredientsList.appendChild(newRow);
  }

  addDirection() {
    const directionsList = document.getElementById('directions-list');
    const index = directionsList.children.length;
    
    const newRow = document.createElement('div');
    newRow.className = 'direction-row';
    newRow.innerHTML = `
      <span class="step-number">${index + 1}.</span>
      <textarea name="direction-${index}" class="form-input form-textarea" rows="2" placeholder="Describe this cooking step..."></textarea>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); window.app.updateStepNumbers()">❌</button>
    `;
    
    directionsList.appendChild(newRow);
  }

  updateStepNumbers() {
    const directionRows = document.querySelectorAll('.direction-row');
    directionRows.forEach((row, index) => {
      const stepNumber = row.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.textContent = `${index + 1}.`;
      }
      const textarea = row.querySelector('textarea');
      if (textarea) {
        textarea.name = `direction-${index}`;
      }
    });
  }

  deleteRecipe(id) {
    this.recipes = this.recipes.filter(recipe => recipe.id !== id);
    this.saveData('recipes', this.recipes);
    this.closeModal();
    this.render();
    alert('Recipe deleted successfully!');
  }

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    this.selectedRecipes.clear();
    this.render();
  }

  toggleRecipeSelection(id) {
    if (this.selectedRecipes.has(id)) {
      this.selectedRecipes.delete(id);
    } else {
      this.selectedRecipes.add(id);
    }
    this.render();
  }

  selectAllRecipes() {
    const filteredRecipes = this.getFilteredRecipes();
    if (this.selectedRecipes.size === filteredRecipes.length) {
      this.selectedRecipes.clear();
    } else {
      filteredRecipes.forEach(recipe => this.selectedRecipes.add(recipe.id));
    }
    this.render();
  }

  deleteSelectedRecipes() {
    if (this.selectedRecipes.size === 0) return;
    
    const count = this.selectedRecipes.size;
    if (confirm(`Are you sure you want to delete ${count} selected recipes?`)) {
      this.recipes = this.recipes.filter(recipe => !this.selectedRecipes.has(recipe.id));
      this.saveData('recipes', this.recipes);
      this.selectedRecipes.clear();
      this.selectionMode = false;
      this.render();
      alert(`Successfully deleted ${count} recipes!`);
    }
  }

  printRecipe(id) {
    const recipe = this.recipes.find(r => r.id === id);
    if (!recipe) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recipe.title} - Recipe</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: white;
          }
          h1 { 
            color: #333; 
            border-bottom: 3px solid #667eea; 
            padding-bottom: 10px;
          }
          h2 { 
            color: #667eea; 
            margin-top: 30px;
          }
          .recipe-meta { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
          }
          .meta-item { 
            font-weight: bold; 
          }
          .ingredients-list { 
            list-style: none; 
            padding: 0; 
          }
          .ingredient-item { 
            padding: 8px 0; 
            border-bottom: 1px solid #eee;
            display: flex;
            gap: 10px;
          }
          .ingredient-amount { 
            font-weight: bold; 
            color: #667eea; 
            min-width: 80px;
          }
          .directions-list { 
            counter-reset: step-counter; 
          }
          .direction-step { 
            counter-increment: step-counter; 
            margin: 15px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-left: 4px solid #667eea;
            position: relative;
          }
          .direction-step::before { 
            content: counter(step-counter); 
            position: absolute; 
            left: -15px; 
            top: 15px; 
            background: #667eea; 
            color: white; 
            width: 25px; 
            height: 25px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold; 
            font-size: 14px;
          }
          .recipe-source {
            margin-top: 30px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
          }
          @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${recipe.title}</h1>
        
        ${recipe.description ? `<p style="font-size: 18px; color: #666; margin-bottom: 25px;">${recipe.description}</p>` : ''}
        
        <div class="recipe-meta">
          ${recipe.servings ? `<div class="meta-item">🍽️ Servings: ${recipe.servings}</div>` : ''}
          ${recipe.prep_time ? `<div class="meta-item">⏱️ Prep Time: ${recipe.prep_time}</div>` : ''}
          ${recipe.cook_time ? `<div class="meta-item">🔥 Cook Time: ${recipe.cook_time}</div>` : ''}
          ${recipe.category ? `<div class="meta-item">📂 Category: ${recipe.category}</div>` : ''}
        </div>
        
        ${this.hasNutritionData(recipe.nutrition) ? `
          <div style="background: white; border: 2px solid #333; border-radius: 8px; padding: 15px; margin: 20px 0; max-width: 300px;">
            <div style="border-bottom: 8px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
              <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold;">Nutrition Facts</h2>
              <p style="margin: 0; font-size: 0.9rem; color: #666;">Per serving</p>
            </div>
            ${recipe.nutrition?.calories ? `
              <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; border-bottom: 4px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
                <span>Calories</span>
                <span>${recipe.nutrition.calories}</span>
              </div>
            ` : ''}
            <div style="font-size: 0.9rem;">
              ${recipe.nutrition?.fat ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #999;">
                  <span>Total Fat</span>
                  <span style="font-weight: bold;">${recipe.nutrition.fat}g</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.cholesterol ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #999;">
                  <span>Cholesterol</span>
                  <span style="font-weight: bold;">${recipe.nutrition.cholesterol}mg</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.sodium ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #999;">
                  <span>Sodium</span>
                  <span style="font-weight: bold;">${recipe.nutrition.sodium}mg</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.carbs ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #999;">
                  <span>Total Carbohydrates</span>
                  <span style="font-weight: bold;">${recipe.nutrition.carbs}g</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.fiber ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0 4px 15px; border-bottom: 1px solid #999; font-size: 0.85rem;">
                  <span>Dietary Fiber</span>
                  <span style="font-weight: bold;">${recipe.nutrition.fiber}g</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.sugar ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0 4px 15px; border-bottom: 1px solid #999; font-size: 0.85rem;">
                  <span>Sugars</span>
                  <span style="font-weight: bold;">${recipe.nutrition.sugar}g</span>
                </div>
              ` : ''}
              ${recipe.nutrition?.protein ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span>Protein</span>
                  <span style="font-weight: bold;">${recipe.nutrition.protein}g</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${recipe.ingredients?.length ? `
          <h2>🥘 Ingredients</h2>
          <div class="ingredients-list">
            ${recipe.ingredients.map(ing => `
              <div class="ingredient-item">
                <span class="ingredient-amount">${ing.amount || ''} ${ing.unit || ''}</span>
                <span class="ingredient-name">${ing.item || ''}</span>
                ${ing.notes ? `<span class="ingredient-notes">(${ing.notes})</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${recipe.directions?.length ? `
          <h2>📋 Directions</h2>
          <div class="directions-list">
            ${recipe.directions.map(dir => `
              <div class="direction-step">${dir}</div>
            `).join('')}
          </div>
        ` : ''}
        
        ${recipe.source ? `
          <div class="recipe-source">
            <strong>Source:</strong> ${recipe.source}
          </div>
        ` : ''}
        
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🖨️ Print Recipe</button>
          <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-left: 10px;">✕ Close</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  showCookingMode(id) {
    const recipe = this.recipes.find(r => r.id === id);
    if (!recipe) return;

    this.currentStep = 0;
    this.cookingModeActive = true;
    
    document.body.insertAdjacentHTML('beforeend', `
      <div id="cooking-modal" class="modal-overlay cooking-mode">
        <div class="cooking-content">
          <div class="cooking-header">
            <h1>${recipe.title}</h1>
            <div class="cooking-controls">
              <button data-action="close-modal" class="btn btn-secondary">✕ Exit Cooking Mode</button>
            </div>
          </div>
          
          <div class="cooking-layout">
            <div class="cooking-ingredients">
              <h3>🥘 Ingredients</h3>
              <div class="ingredients-checklist">
                ${recipe.ingredients?.map((ing, index) => `
                  <label class="ingredient-checkbox">
                    <input type="checkbox" id="ingredient-${index}">
                    <span class="checkmark"></span>
                    <span class="ingredient-text">
                      <strong>${ing.amount || ''} ${ing.unit || ''}</strong> ${ing.item || ''}
                      ${ing.notes ? `<em>(${ing.notes})</em>` : ''}
                    </span>
                  </label>
                `).join('') || '<p>No ingredients listed</p>'}
              </div>
            </div>
            
            <div class="cooking-directions">
              <div class="step-navigation">
                <h3>📋 Cooking Steps</h3>
                <div class="step-progress">
                  Step <span id="current-step">1</span> of ${recipe.directions?.length || 0}
                </div>
              </div>
              
              <div class="current-step-display" id="step-display">
                ${recipe.directions?.[0] ? `
                  <div class="step-content">
                    <div class="step-number">1</div>
                    <div class="step-text">${recipe.directions[0]}</div>
                  </div>
                ` : '<p>No directions available</p>'}
              </div>
              
              <div class="step-controls">
                <button id="prev-step" class="btn btn-secondary" disabled>
                  ⬅️ Previous Step
                </button>
                <button id="next-step" class="btn btn-primary" ${recipe.directions?.length <= 1 ? 'disabled' : ''}>
                  Next Step ➡️
                </button>
              </div>
              
              <div class="timer-section">
                <h4>⏱️ Timer</h4>
                <div class="timer-controls">
                  <input type="number" id="timer-minutes" placeholder="Minutes" min="1" max="180" value="10">
                  <button id="start-timer" class="btn btn-success">Start Timer</button>
                  <button id="stop-timer" class="btn btn-danger" style="display: none;">Stop Timer</button>
                </div>
                <div id="timer-display" class="timer-display" style="display: none;">
                  <span id="timer-time">00:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    this.setupCookingModeListeners(recipe);
  }

  setupCookingModeListeners(recipe) {
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const stepDisplay = document.getElementById('step-display');
    const currentStepSpan = document.getElementById('current-step');
    
    let timerInterval = null;
    let timerSeconds = 0;
    
    // Step navigation
    prevBtn.addEventListener('click', () => {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.updateCookingStep(recipe, stepDisplay, currentStepSpan, prevBtn, nextBtn);
      }
    });
    
    nextBtn.addEventListener('click', () => {
      if (this.currentStep < recipe.directions.length - 1) {
        this.currentStep++;
        this.updateCookingStep(recipe, stepDisplay, currentStepSpan, prevBtn, nextBtn);
      }
    });
    
    // Timer functionality
    document.getElementById('start-timer').addEventListener('click', () => {
      const minutes = parseInt(document.getElementById('timer-minutes').value) || 10;
      timerSeconds = minutes * 60;
      
      document.getElementById('start-timer').style.display = 'none';
      document.getElementById('stop-timer').style.display = 'inline-block';
      document.getElementById('timer-display').style.display = 'block';
      
      timerInterval = setInterval(() => {
        timerSeconds--;
        const mins = Math.floor(timerSeconds / 60);
        const secs = timerSeconds % 60;
        document.getElementById('timer-time').textContent = 
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timerSeconds <= 0) {
          clearInterval(timerInterval);
          alert('⏰ Timer finished!');
          document.getElementById('start-timer').style.display = 'inline-block';
          document.getElementById('stop-timer').style.display = 'none';
          document.getElementById('timer-display').style.display = 'none';
        }
      }, 1000);
    });
    
    document.getElementById('stop-timer').addEventListener('click', () => {
      clearInterval(timerInterval);
      document.getElementById('start-timer').style.display = 'inline-block';
      document.getElementById('stop-timer').style.display = 'none';
      document.getElementById('timer-display').style.display = 'none';
    });
  }

  updateCookingStep(recipe, stepDisplay, currentStepSpan, prevBtn, nextBtn) {
    const direction = recipe.directions[this.currentStep];
    stepDisplay.innerHTML = `
      <div class="step-content">
        <div class="step-number">${this.currentStep + 1}</div>
        <div class="step-text">${direction}</div>
      </div>
    `;
    
    currentStepSpan.textContent = this.currentStep + 1;
    prevBtn.disabled = this.currentStep === 0;
    nextBtn.disabled = this.currentStep === recipe.directions.length - 1;
  }

  hasNutritionData(nutrition) {
    if (!nutrition) return false;
    return Object.values(nutrition).some(value => value !== null && value !== undefined && value !== '');
  }

  // Meal Planner Functions
  getMealForDate(dateStr, mealType) {
    const meal = this.mealPlans.find(m => m.date === dateStr && m.meal_type === mealType);
    if (!meal) return '';
    
    const recipe = this.recipes.find(r => r.id === meal.recipe_id);
    if (!recipe) return '';
    
    return `
      <div class="planned-recipe" data-meal-id="${meal.id}">
        <span class="recipe-name">${recipe.title}</span>
        <button class="remove-meal" onclick="window.app.removeMeal('${meal.id}')" title="Remove">×</button>
      </div>
    `;
  }

  getDayNote(dateStr) {
    const note = this.dayNotes.find(n => n.date === dateStr);
    return note ? note.note : '';
  }

  saveDayNote(dateStr, noteText) {
    const existingIndex = this.dayNotes.findIndex(n => n.date === dateStr);
    
    if (noteText.trim()) {
      const note = {
        id: this.generateId(),
        date: dateStr,
        note: noteText.trim()
      };
      
      if (existingIndex >= 0) {
        this.dayNotes[existingIndex] = note;
      } else {
        this.dayNotes.push(note);
      }
    } else if (existingIndex >= 0) {
      this.dayNotes.splice(existingIndex, 1);
    }
    
    this.saveData('dayNotes', this.dayNotes);
  }

  navigateMonth(direction) {
    if (!this.currentPlannerMonth && this.currentPlannerMonth !== 0) {
      this.currentPlannerMonth = new Date().getMonth();
      this.currentPlannerYear = new Date().getFullYear();
    }
    
    this.currentPlannerMonth += direction;
    
    if (this.currentPlannerMonth > 11) {
      this.currentPlannerMonth = 0;
      this.currentPlannerYear++;
    } else if (this.currentPlannerMonth < 0) {
      this.currentPlannerMonth = 11;
      this.currentPlannerYear--;
    }
    
    this.render();
  }

  showTodayPlanner() {
    const today = new Date();
    this.currentPlannerYear = today.getFullYear();
    this.currentPlannerMonth = today.getMonth();
    this.render();
  }

  clearAllMeals() {
    if (confirm('Are you sure you want to clear all planned meals? This cannot be undone.')) {
      this.mealPlans = [];
      this.saveData('mealPlans', this.mealPlans);
      this.render();
    }
  }

  filterPlannerRecipes(searchQuery) {
    const recipes = document.querySelectorAll('.sidebar-recipe-item');
    recipes.forEach(recipe => {
      const title = recipe.querySelector('h4').textContent.toLowerCase();
      const category = recipe.querySelector('p').textContent.toLowerCase();
      const matches = title.includes(searchQuery.toLowerCase()) || category.includes(searchQuery.toLowerCase());
      recipe.style.display = matches ? 'flex' : 'none';
    });
  }

  removeMeal(mealId) {
    this.mealPlans = this.mealPlans.filter(m => m.id !== mealId);
    this.saveData('mealPlans', this.mealPlans);
    this.render();
  }

  addMealToPlan(recipeId, dateStr, mealType) {
    // Remove existing meal for this slot
    this.mealPlans = this.mealPlans.filter(m => !(m.date === dateStr && m.meal_type === mealType));
    
    // Add new meal
    const meal = {
      id: this.generateId(),
      date: dateStr,
      meal_type: mealType,
      recipe_id: recipeId,
      notes: ''
    };
    
    this.mealPlans.push(meal);
    this.saveData('mealPlans', this.mealPlans);
    this.render();
  }

  setupMealPlannerDragAndDrop() {
    // Set up drag and drop for recipe items
    document.querySelectorAll('.sidebar-recipe-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.recipeId);
        item.classList.add('dragging');
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    // Set up drop zones for meal slots
    document.querySelectorAll('.meal-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
      
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        
        const recipeId = e.dataTransfer.getData('text/plain');
        const dateStr = slot.dataset.date;
        const mealType = slot.dataset.meal;
        
        if (recipeId && dateStr && mealType) {
          this.addMealToPlan(recipeId, dateStr, mealType);
        }
      });
    });
  }

  // Inventory Management Functions
  renderInventoryPage() {
    const categories = this.getInventoryCategories();
    
    return `
      <div class="page-header">
        <h1 class="page-title">📦 Kitchen Inventory</h1>
        <p class="page-subtitle">Track your pantry items with UPC codes, prices, and categories</p>
      </div>
      
      <div class="inventory-layout">
        <div class="inventory-sidebar">
          <div class="card">
            <h3>📊 Inventory Stats</h3>
            <div class="inventory-stats">
              <div class="stat-item">
                <span class="stat-number">${this.inventory.length}</span>
                <span class="stat-label">Total Items</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${this.inventory.filter(item => item.quantity <= (item.lowStockThreshold || 5)).length}</span>
                <span class="stat-label">Low Stock</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>🏷️ Categories</h3>
            <div class="category-filter">
              <button class="filter-btn ${!this.inventoryFilter ? 'active' : ''}" data-action="filter-inventory" data-category="">All Items</button>
              ${categories.map(cat => `
                <button class="filter-btn ${this.inventoryFilter === cat ? 'active' : ''}" data-action="filter-inventory" data-category="${cat}">
                  ${this.getCategoryIcon(cat)} ${cat}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="inventory-main">
          <div class="inventory-controls">
            <button data-action="add-inventory-item" class="btn btn-primary">
              ➕ Add Item
            </button>
            <div class="search-box">
              <input type="text" id="inventory-search" placeholder="Search inventory..." value="${this.inventorySearch || ''}">
            </div>
          </div>
          
          <div class="inventory-grid">
            ${this.getFilteredInventory().map(item => this.renderInventoryItem(item)).join('')}
          </div>
          
          ${this.inventory.length === 0 ? `
            <div class="empty-state">
              <h3>📦 No inventory items yet</h3>
              <p>Start tracking your pantry items by adding your first inventory item!</p>
              <button data-action="add-inventory-item" class="btn btn-primary">Add Your First Item</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderInventoryItem(item) {
    const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
    
    return `
      <div class="inventory-item-card ${isLowStock ? 'low-stock' : ''}">
        <div class="item-header">
          <h4>${item.name}</h4>
          <div class="item-actions">
            <button data-action="edit-inventory-item" data-id="${item.id}" class="btn-icon" title="Edit">✏️</button>
            <button data-action="delete-inventory-item" data-id="${item.id}" class="btn-icon" title="Delete">🗑️</button>
          </div>
        </div>
        
        <div class="item-details">
          <div class="item-info">
            <span class="category-badge ${item.category}">${this.getCategoryIcon(item.category)} ${item.category}</span>
            ${item.upc ? `<div class="upc-code">UPC: ${item.upc}</div>` : ''}
            ${item.price ? `<div class="price">$${parseFloat(item.price).toFixed(2)}</div>` : ''}
          </div>
          
          <div class="quantity-controls">
            <div class="quantity-display ${isLowStock ? 'low-stock' : ''}">
              <span class="quantity-label">Quantity:</span>
              <span class="quantity-value">${item.quantity || 0}</span>
              <span class="unit">${item.unit || ''}</span>
            </div>
            
            <div class="quantity-buttons">
              <button data-action="decrease-quantity" data-id="${item.id}" class="quantity-btn">➖</button>
              <button data-action="increase-quantity" data-id="${item.id}" class="quantity-btn">➕</button>
            </div>
          </div>
          
          ${isLowStock ? '<div class="low-stock-warning">⚠️ Low Stock</div>' : ''}
        </div>
      </div>
    `;
  }

  getInventoryCategories() {
    const categories = [...new Set(this.inventory.map(item => item.category).filter(Boolean))];
    return ['Produce', 'Dairy', 'Meat', 'Pantry', 'Spices', 'Beverages', 'Frozen', 'Bakery', ...categories].filter((cat, index, arr) => arr.indexOf(cat) === index);
  }

  getCategoryIcon(category) {
    const icons = {
      'Produce': '🥕',
      'Dairy': '🥛',
      'Meat': '🥩',
      'Pantry': '🥫',
      'Spices': '🧂',
      'Beverages': '🥤',
      'Frozen': '❄️',
      'Bakery': '🍞',
      'Snacks': '🍿'
    };
    return icons[category] || '📦';
  }

  getFilteredInventory() {
    let filtered = this.inventory;
    
    if (this.inventoryFilter) {
      filtered = filtered.filter(item => item.category === this.inventoryFilter);
    }
    
    if (this.inventorySearch) {
      const search = this.inventorySearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search) ||
        (item.upc && item.upc.includes(search)) ||
        (item.category && item.category.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  }

  showAddInventoryForm() {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content">
          <button data-action="close-modal" class="modal-close">✕</button>
          <h2>📦 Add Inventory Item</h2>
          
          <form id="inventory-form">
            <div class="form-row">
              <div class="form-group">
                <label>Item Name *</label>
                <input type="text" name="name" required class="form-input" placeholder="e.g., Organic Tomatoes">
              </div>
              <div class="form-group">
                <label>Category</label>
                <select name="category" class="form-input">
                  <option value="Produce">🥕 Produce</option>
                  <option value="Dairy">🥛 Dairy</option>
                  <option value="Meat">🥩 Meat</option>
                  <option value="Pantry">🥫 Pantry</option>
                  <option value="Spices">🧂 Spices</option>
                  <option value="Beverages">🥤 Beverages</option>
                  <option value="Frozen">❄️ Frozen</option>
                  <option value="Bakery">🍞 Bakery</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>UPC Code</label>
                <input type="text" name="upc" class="form-input" placeholder="123456789012">
              </div>
              <div class="form-group">
                <label>Price</label>
                <input type="number" name="price" step="0.01" class="form-input" placeholder="4.99">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Quantity *</label>
                <input type="number" name="quantity" required class="form-input" value="1" min="0">
              </div>
              <div class="form-group">
                <label>Unit</label>
                <input type="text" name="unit" class="form-input" placeholder="lbs, pieces, bottles">
              </div>
            </div>
            
            <div class="form-group">
              <label>Low Stock Threshold</label>
              <input type="number" name="lowStockThreshold" class="form-input" value="5" min="0">
              <p class="form-help">Get notified when quantity falls below this number</p>
            </div>
            
            <div class="form-actions">
              <button type="button" data-action="close-modal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">📦 Add Item</button>
            </div>
          </form>
        </div>
      </div>
    `);
  }

  handleInventorySubmit(form) {
    const formData = new FormData(form);
    
    const item = {
      id: this.generateId(),
      name: formData.get('name'),
      category: formData.get('category'),
      upc: formData.get('upc'),
      price: formData.get('price'),
      quantity: parseInt(formData.get('quantity')) || 0,
      unit: formData.get('unit'),
      lowStockThreshold: parseInt(formData.get('lowStockThreshold')) || 5,
      createdAt: new Date().toISOString()
    };
    
    this.inventory.push(item);
    this.saveData('inventory', this.inventory);
    this.closeModal();
    this.render();
    alert('Inventory item added successfully!');
  }

  adjustInventoryQuantity(id, change) {
    const item = this.inventory.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(0, (item.quantity || 0) + change);
      this.saveData('inventory', this.inventory);
      this.render();
    }
  }

  deleteInventoryItem(id) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      this.inventory = this.inventory.filter(i => i.id !== id);
      this.saveData('inventory', this.inventory);
      this.render();
      alert('Inventory item deleted successfully!');
    }
  }

  // Dietary Restrictions Management
  addDietaryRestriction() {
    const select = document.getElementById('restriction-select');
    const restriction = select.value;
    
    if (restriction && !this.userPreferences.dietary_restrictions.includes(restriction)) {
      this.userPreferences.dietary_restrictions.push(restriction);
      this.saveData('userPreferences', this.userPreferences);
      this.render();
    }
    select.value = '';
  }

  removeDietaryRestriction(restriction) {
    this.userPreferences.dietary_restrictions = this.userPreferences.dietary_restrictions.filter(r => r !== restriction);
    this.saveData('userPreferences', this.userPreferences);
    this.render();
  }

  addAllergy() {
    const select = document.getElementById('allergy-select');
    const allergy = select.value;
    
    if (allergy && !this.userPreferences.allergies.includes(allergy)) {
      this.userPreferences.allergies.push(allergy);
      this.saveData('userPreferences', this.userPreferences);
      this.render();
    }
    select.value = '';
  }

  removeAllergy(allergy) {
    this.userPreferences.allergies = this.userPreferences.allergies.filter(a => a !== allergy);
    this.saveData('userPreferences', this.userPreferences);
    this.render();
  }

  // Recipe Warning System
  checkRecipeWarnings(recipe) {
    const warnings = [];
    const restrictions = this.userPreferences.dietary_restrictions || [];
    const allergies = this.userPreferences.allergies || [];
    
    if (!recipe.ingredients) return warnings;
    
    recipe.ingredients.forEach(ingredient => {
      const item = ingredient.item.toLowerCase();
      
      // Check dietary restrictions
      restrictions.forEach(restriction => {
        if (this.isIngredientIncompatible(item, restriction)) {
          warnings.push({
            type: 'restriction',
            message: `⚠️ Contains ingredients not suitable for ${restriction} diet`,
            ingredient: ingredient.item
          });
        }
      });
      
      // Check allergies
      allergies.forEach(allergy => {
        if (this.isAllergenPresent(item, allergy)) {
          warnings.push({
            type: 'allergy',
            message: `🚨 ALLERGY WARNING: Contains ${allergy}`,
            ingredient: ingredient.item
          });
        }
      });
    });
    
    return warnings;
  }

  isIngredientIncompatible(ingredient, restriction) {
    const incompatibilities = {
      'Vegetarian': ['beef', 'pork', 'chicken', 'turkey', 'fish', 'seafood', 'meat', 'bacon', 'ham', 'sausage'],
      'Vegan': ['beef', 'pork', 'chicken', 'turkey', 'fish', 'seafood', 'meat', 'bacon', 'ham', 'sausage', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'],
      'Gluten-Free': ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'gluten'],
      'Dairy-Free': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy'],
      'Keto': ['bread', 'pasta', 'rice', 'potato', 'sugar', 'flour'],
      'Paleo': ['grain', 'legume', 'dairy', 'refined', 'processed'],
      'Low-Carb': ['bread', 'pasta', 'rice', 'potato', 'sugar', 'flour'],
      'Kosher': ['pork', 'shellfish', 'mixing meat and dairy'],
      'Halal': ['pork', 'alcohol', 'wine']
    };
    
    const incompatible = incompatibilities[restriction] || [];
    return incompatible.some(item => ingredient.includes(item));
  }

  isAllergenPresent(ingredient, allergy) {
    const allergens = {
      'Nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'brazil nut'],
      'Peanuts': ['peanut'],
      'Shellfish': ['shrimp', 'crab', 'lobster', 'oyster', 'mussel', 'clam'],
      'Fish': ['salmon', 'tuna', 'cod', 'fish', 'anchovy'],
      'Eggs': ['egg'],
      'Milk': ['milk', 'dairy'],
      'Soy': ['soy', 'tofu', 'tempeh'],
      'Wheat': ['wheat', 'flour'],
      'Sesame': ['sesame', 'tahini']
    };
    
    const allergenTerms = allergens[allergy] || [];
    return allergenTerms.some(term => ingredient.includes(term));
  }

  // Meal Planner Helper Functions
  getFilteredPlannerRecipes() {
    let filtered = this.recipes;
    
    if (this.plannerSearch) {
      const search = this.plannerSearch.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(search) ||
        (recipe.description && recipe.description.toLowerCase().includes(search)) ||
        (recipe.category && recipe.category.toLowerCase().includes(search))
      );
    }
    
    if (this.plannerCategoryFilter) {
      filtered = filtered.filter(recipe => recipe.category === this.plannerCategoryFilter);
    }
    
    return filtered;
  }

  getRecipeCategories() {
    const categories = [...new Set(this.recipes.map(recipe => recipe.category).filter(Boolean))];
    return categories.sort();
  }

  exportRecipesJSON() {
    const data = {
      recipes: this.recipes,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chef-mikes-recipes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportRecipesCSV() {
    const headers = ['title', 'description', 'category', 'servings', 'prep_time', 'cook_time', 'ingredients', 'directions', 'image'];
    const csvContent = [
      headers.join(','),
      ...this.recipes.map(recipe => {
        const ingredients = recipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.item} ${ing.notes}`.trim()).join(';');
        const directions = recipe.directions.join(';');
        
        return [
          `"${recipe.title || ''}"`,
          `"${recipe.description || ''}"`,
          `"${recipe.category || ''}"`,
          `"${recipe.servings || ''}"`,
          `"${recipe.prep_time || ''}"`,
          `"${recipe.cook_time || ''}"`,
          `"${ingredients}"`,
          `"${directions}"`,
          `"${recipe.image || ''}"`
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chef-mikes-recipes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  // Account dropdown functions
  toggleAccountDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = document.getElementById('account-dropdown');
    dropdown.classList.toggle('show');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', this.closeAccountDropdown.bind(this), { once: true });
  }

  closeAccountDropdown() {
    const dropdown = document.getElementById('account-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  navigateToPage(page) {
    this.currentPage = page;
    this.render();
  }

  // Logout function
  logout() {
    window.authManager.logout();
    // Redirect will happen automatically via the auth change handler
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChefMikesApp();
});