// Authentication module for frontend
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.onAuthChange = null;
  }

  setAuthChangeHandler(callback) {
    this.onAuthChange = callback;
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  async signup(email, password, name) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        if (this.onAuthChange) this.onAuthChange(true);
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        if (this.onAuthChange) this.onAuthChange(true);
        return { success: true, user: this.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('recipes');
    localStorage.removeItem('meal_plans');
    localStorage.removeItem('user_preferences');
    if (this.onAuthChange) this.onAuthChange(false);
  }

  async verifyToken() {
    if (!this.token) return false;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // Helper method to make authenticated API calls
  async apiCall(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }
}

// Global auth manager instance
window.authManager = new AuthManager();