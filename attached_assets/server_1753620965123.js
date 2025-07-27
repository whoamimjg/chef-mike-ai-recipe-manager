const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple file-based user storage for demo (can be upgraded to PostgreSQL later)
const USERS_FILE = './users.json';

// Helper functions for user management
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

function hashPassword(password) {
  // Simple hash for demo - should use bcrypt in production
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, hashedPassword) {
  const crypto = require('crypto');
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

function generateToken(userId) {
  const payload = { userId, timestamp: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    // 24 hour expiration
    if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = { id: user.id, email: user.email, name: user.name };
  next();
};

// Auth routes
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = loadUsers();
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    email,
    name: name || '',
    password_hash: hashPassword(password),
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  
  if (saveUsers(users)) {
    const token = generateToken(newUser.id);
    res.json({ 
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      token 
    });
  } else {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email === email);
  
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);
  res.json({ 
    user: { id: user.id, email: user.email, name: user.name },
    token 
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Route for marketing page
app.get('/marketing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketing.html'));
});

// Admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Admin authentication
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple admin check - in production, use environment variables
  const ADMIN_EMAIL = 'admin@chefmikes.com';
  const ADMIN_PASSWORD = 'admin123'; // Change this in production!
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = generateToken('admin');
    res.json({ 
      token,
      user: { id: 'admin', email: ADMIN_EMAIL, name: 'Admin User' }
    });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// Admin middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Admin token required' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.userId !== 'admin') {
    return res.status(401).json({ error: 'Invalid admin token' });
  }

  next();
};

// Admin API routes
app.get('/api/admin/auth', authenticateAdmin, (req, res) => {
  res.json({ user: { id: 'admin', email: 'admin@chefmikes.com', name: 'Admin User' } });
});

app.get('/api/admin/dashboard', authenticateAdmin, (req, res) => {
  const users = loadUsers();
  
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    trialUsers: users.filter(u => u.status === 'trial').length,
    totalRevenue: users.length * 9.99 // Mock calculation
  };

  const recentActivity = users.slice(-5).map(user => ({
    user: user.name || user.email,
    action: 'signed up',
    timestamp: user.created_at
  }));

  res.json({ stats, recentActivity });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  const users = loadUsers().map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status || 'active',
    created_at: user.created_at,
    last_login: user.last_login
  }));
  
  res.json({ users });
});

app.put('/api/admin/users/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, status, password } = req.body;
  
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user data
  users[userIndex].name = name;
  users[userIndex].email = email;
  users[userIndex].status = status;
  
  if (password) {
    users[userIndex].password_hash = hashPassword(password);
  }

  if (saveUsers(users)) {
    res.json({ message: 'User updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const users = loadUsers();
  const filteredUsers = users.filter(u => u.id !== id);
  
  if (users.length === filteredUsers.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (saveUsers(filteredUsers)) {
    res.json({ message: 'User deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // In production, send actual email
  console.log(`Password reset email would be sent to: ${user.email}`);
  res.json({ message: 'Password reset email sent' });
});

app.get('/api/admin/payments', authenticateAdmin, (req, res) => {
  // Mock payment data - in production, integrate with payment processor
  const users = loadUsers();
  const payments = users.map(user => ({
    id: `payment_${user.id}`,
    user_email: user.email,
    amount: 9.99,
    status: 'completed',
    payment_method: 'credit_card',
    created_at: user.created_at
  }));
  
  res.json({ payments });
});

app.get('/api/admin/settings', authenticateAdmin, (req, res) => {
  // Mock settings - in production, store in database
  const settings = {
    trialDays: 14,
    monthlyPrice: 9.99,
    annualPrice: 99.99
  };
  
  res.json({ settings });
});

app.put('/api/admin/settings', authenticateAdmin, (req, res) => {
  // In production, save to database
  console.log('Settings would be saved:', req.body);
  res.json({ message: 'Settings saved successfully' });
});

app.get('/api/admin/export/users', authenticateAdmin, (req, res) => {
  const users = loadUsers();
  const csv = [
    'ID,Email,Name,Status,Created,Last Login',
    ...users.map(user => [
      user.id,
      user.email,
      user.name || '',
      user.status || 'active',
      user.created_at,
      user.last_login || 'Never'
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(csv);
});

app.get('/api/admin/export/payments', authenticateAdmin, (req, res) => {
  const users = loadUsers();
  const csv = [
    'ID,User Email,Amount,Status,Date',
    ...users.map(user => [
      `payment_${user.id}`,
      user.email,
      '9.99',
      'completed',
      user.created_at
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
  res.send(csv);
});

app.post('/api/admin/bulk-email', authenticateAdmin, (req, res) => {
  const { subject, message } = req.body;
  const users = loadUsers();
  
  // In production, integrate with email service
  console.log(`Bulk email would be sent to ${users.length} users:`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  
  res.json({ message: `Bulk email sent to ${users.length} users` });
});

// Serve marketing page as default (separate marketing site)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketing.html'));
});

// Serve the recipe app (separate authenticated app)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Recipe scraping endpoint
app.post('/api/scrape-recipe', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Use Python recipe scraper
    
    const python = spawn('python3', ['-c', `
import sys
import json
from recipe_scrapers import scrape_me

try:
    url = sys.argv[1]
    scraper = scrape_me(url)
    
    # Extract instructions with better processing
    raw_instructions = scraper.instructions()
    processed_instructions = []
    
    if raw_instructions:
        # Check if instructions() returns a string or list
        if isinstance(raw_instructions, str):
            # It's a single string - split it into steps
            full_text = raw_instructions.strip()
            
            # First try splitting by newlines (most common)
            if '\\n' in full_text:
                steps = [step.strip() for step in full_text.split('\\n') if step.strip()]
            # If no newlines, try splitting by periods and treating as sentences
            elif '. ' in full_text:
                sentences = full_text.split('. ')
                steps = []
                for i, sentence in enumerate(sentences):
                    sentence = sentence.strip()
                    if sentence and len(sentence) > 10:
                        # Add period back except for last sentence
                        if i < len(sentences) - 1 and not sentence.endswith('.'):
                            sentence += '.'
                        steps.append(sentence)
            else:
                # Fallback to single instruction
                steps = [full_text] if full_text else []
                
            processed_instructions = [step for step in steps if len(step) > 10]
            
        elif hasattr(raw_instructions, '__iter__'):
            # It's a list or iterable
            for inst in raw_instructions:
                inst_str = str(inst).strip()
                if len(inst_str) > 10:
                    # Clean up formatting
                    inst_str = inst_str.replace('\\n', ' ')
                    inst_str = ' '.join(inst_str.split())
                    processed_instructions.append(inst_str)
        else:
            # Single instruction object
            inst_str = str(raw_instructions).strip()
            if len(inst_str) > 10:
                processed_instructions = [inst_str]
    
    # Extract ingredients with better processing
    raw_ingredients = scraper.ingredients() if scraper.ingredients() else []
    processed_ingredients = []
    
    for ing in raw_ingredients:
        ing_str = str(ing).strip()
        if len(ing_str) > 2:  # Skip very short ingredients
            processed_ingredients.append(ing_str)
    
    # Extract recipe data
    recipe_data = {
        'title': scraper.title() or '',
        'description': scraper.description() or '',
        'ingredients': processed_ingredients,
        'instructions': processed_instructions,
        'prep_time': str(scraper.prep_time()) if scraper.prep_time() else '',
        'cook_time': str(scraper.cook_time()) if scraper.cook_time() else '',
        'total_time': str(scraper.total_time()) if scraper.total_time() else '',
        'yields': str(scraper.yields()) if scraper.yields() else '',
        'image': scraper.image() or '',
        'nutrients': scraper.nutrients() if hasattr(scraper, 'nutrients') and scraper.nutrients() else {},
        'source': url,
        'debug_raw_instructions_count': len(raw_instructions),
        'debug_processed_instructions_count': len(processed_instructions)
    }
    
    print(json.dumps(recipe_data, ensure_ascii=False))
    
except Exception as e:
    error_data = {
        'error': str(e),
        'title': '',
        'description': 'Could not extract recipe data from this URL. The site may not be supported or may require manual entry.',
        'ingredients': [],
        'instructions': [],
        'source': url
    }
    print(json.dumps(error_data, ensure_ascii=False))
`, url]);

    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      try {
        const recipeData = JSON.parse(output);
        
        // Convert to our app's format
        const formattedRecipe = {
          title: recipeData.title || 'Imported Recipe',
          description: recipeData.description || '',
          category: 'dinner', // Default category
          servings: recipeData.yields || '',
          prep_time: recipeData.prep_time || '',
          cook_time: recipeData.cook_time || '',
          ingredients: recipeData.ingredients.map(ing => {
            // Parse ingredient string into components
            const parts = ing.split(' ');
            const amount = parts[0] && /[0-9]/.test(parts[0]) ? parts[0] : '';
            const unit = parts[1] && !/[0-9]/.test(parts[1]) && parts[1].length < 10 ? parts[1] : '';
            const item = parts.slice(amount ? (unit ? 2 : 1) : 0).join(' ');
            
            return {
              amount: amount,
              unit: unit,
              item: item || ing,
              notes: ''
            };
          }),
          directions: recipeData.instructions && recipeData.instructions.length > 0 ? 
            recipeData.instructions : 
            ['Instructions could not be extracted from this recipe. Please add cooking steps manually.'],
          image: recipeData.image || '',
          source: recipeData.source,
          nutrition: {
            calories: recipeData.nutrients?.calories || null,
            fat: recipeData.nutrients?.fatContent || null,
            carbs: recipeData.nutrients?.carbohydrateContent || null,
            protein: recipeData.nutrients?.proteinContent || null,
            fiber: recipeData.nutrients?.fiberContent || null,
            sugar: recipeData.nutrients?.sugarContent || null,
            sodium: recipeData.nutrients?.sodiumContent || null
          }
        };
        
        res.json(formattedRecipe);
      } catch (parseError) {
        res.status(500).json({ 
          error: 'Failed to parse recipe data',
          details: errorOutput || parseError.message
        });
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to scrape recipe',
      details: error.message
    });
  }
});

// AI Recipe Suggestions endpoint
app.post('/api/recipe-suggestions', async (req, res) => {
  try {
    const { inventory, recipes, preferences } = req.body;
    
    // Call Python AI service
    const python = spawn('python3', ['ai_recipe_suggestions.py']);
    
    // Send data to Python script
    python.stdin.write(JSON.stringify({
      action: 'analyze_inventory',
      inventory,
      recipes,
      preferences
    }));
    python.stdin.end();
    
    let result = '';
    python.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const suggestions = JSON.parse(result);
          res.json(suggestions);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse AI response' });
        }
      } else {
        res.status(500).json({ error: 'AI service failed' });
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Meal Planning Suggestions endpoint
app.post('/api/meal-planning-suggestions', async (req, res) => {
  try {
    const { preferences, mealPlans, recipes } = req.body;
    
    const python = spawn('python3', ['ai_recipe_suggestions.py']);
    
    python.stdin.write(JSON.stringify({
      action: 'meal_planning',
      preferences,
      mealPlans,
      recipes
    }));
    python.stdin.end();
    
    let result = '';
    python.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        try {
          const suggestions = JSON.parse(result);
          res.json(suggestions);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse AI response' });
        }
      } else {
        res.status(500).json({ error: 'AI service failed' });
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chef Mike's Culinary Classroom server running on port ${PORT}`);
});