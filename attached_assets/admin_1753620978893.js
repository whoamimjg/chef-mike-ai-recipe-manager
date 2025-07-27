// Admin Panel JavaScript for Chef Mike's Culinary Classroom
class AdminApp {
  constructor() {
    this.currentSection = 'dashboard';
    this.users = [];
    this.payments = [];
    this.settings = {};
    this.currentUser = null;
    
    this.init();
  }

  async init() {
    // Check admin authentication
    await this.checkAdminAuth();
    
    // Load initial data
    await this.loadDashboardData();
    await this.loadUsers();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  async checkAdminAuth() {
    try {
      const response = await fetch('/api/admin/auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (!response.ok) {
        // Redirect to admin login
        window.location.href = '/admin-login';
        return;
      }
      
      const result = await response.json();
      this.currentUser = result.user;
      document.getElementById('admin-user-name').textContent = result.user.name || result.user.email;
    } catch (error) {
      console.error('Admin auth error:', error);
      window.location.href = '/admin-login';
    }
  }

  setupEventListeners() {
    // User search
    document.getElementById('user-search').addEventListener('input', () => {
      this.filterUsers();
    });

    // Status filter
    document.getElementById('status-filter').addEventListener('change', () => {
      this.filterUsers();
    });

    // Forms
    document.getElementById('edit-user-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveUser();
    });

    document.getElementById('reset-password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendPasswordReset();
    });

    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  showSection(section) {
    // Update navigation
    document.querySelectorAll('.admin-nav button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`nav-${section}`).classList.add('active');

    // Show section
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.style.display = 'none';
    });
    document.getElementById(`section-${section}`).style.display = 'block';

    this.currentSection = section;

    // Load section data
    switch (section) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'users':
        this.loadUsers();
        break;
      case 'payments':
        this.loadPayments();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }

  async loadDashboardData() {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update stats
        document.getElementById('total-users').textContent = data.stats.totalUsers || '0';
        document.getElementById('active-users').textContent = data.stats.activeUsers || '0';
        document.getElementById('total-revenue').textContent = '$' + (data.stats.totalRevenue || '0');
        document.getElementById('trial-users').textContent = data.stats.trialUsers || '0';
        
        // Update recent activity
        this.renderRecentActivity(data.recentActivity || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  renderRecentActivity(activities) {
    const container = document.getElementById('recent-activity');
    
    if (activities.length === 0) {
      container.innerHTML = '<p>No recent activity</p>';
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="activity-item" style="padding: 0.75rem; border-bottom: 1px solid #dee2e6;">
        <strong>${activity.user}</strong> ${activity.action}
        <small style="color: #6c757d; float: right;">${new Date(activity.timestamp).toLocaleDateString()}</small>
      </div>
    `).join('');
  }

  async loadUsers() {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.users = data.users || [];
        this.renderUsers();
      }
    } catch (error) {
      console.error('Error loading users:', error);
      document.getElementById('users-table-body').innerHTML = 
        '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading users</td></tr>';
    }
  }

  renderUsers() {
    const tbody = document.getElementById('users-table-body');
    
    if (this.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = this.users.map(user => `
      <tr>
        <td>
          <strong>${user.name || 'No name'}</strong>
        </td>
        <td>${user.email}</td>
        <td>
          <span class="status-badge status-${user.status || 'inactive'}">
            ${(user.status || 'inactive').toUpperCase()}
          </span>
        </td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
        <td>
          <div class="action-buttons">
            <button onclick="adminApp.editUser('${user.id}')" class="btn btn-primary btn-sm">✏️ Edit</button>
            <button onclick="adminApp.resetPassword('${user.id}')" class="btn btn-secondary btn-sm">🔑 Reset</button>
            <button onclick="adminApp.deleteUser('${user.id}')" class="btn btn-danger btn-sm">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    const filtered = this.users.filter(user => {
      const matchesSearch = !search || 
        user.name?.toLowerCase().includes(search) || 
        user.email.toLowerCase().includes(search);
      
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    this.renderFilteredUsers(filtered);
  }

  renderFilteredUsers(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users match your filters</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td><strong>${user.name || 'No name'}</strong></td>
        <td>${user.email}</td>
        <td>
          <span class="status-badge status-${user.status || 'inactive'}">
            ${(user.status || 'inactive').toUpperCase()}
          </span>
        </td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
        <td>
          <div class="action-buttons">
            <button onclick="adminApp.editUser('${user.id}')" class="btn btn-primary btn-sm">✏️ Edit</button>
            <button onclick="adminApp.resetPassword('${user.id}')" class="btn btn-secondary btn-sm">🔑 Reset</button>
            <button onclick="adminApp.deleteUser('${user.id}')" class="btn btn-danger btn-sm">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  editUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    // Populate form
    document.getElementById('edit-user-name').value = user.name || '';
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-status').value = user.status || 'inactive';
    document.getElementById('edit-user-password').value = '';

    // Store user ID for saving
    document.getElementById('edit-user-form').dataset.userId = userId;

    // Show modal
    document.getElementById('user-modal').classList.add('show');
  }

  async saveUser() {
    const form = document.getElementById('edit-user-form');
    const userId = form.dataset.userId;

    const userData = {
      name: document.getElementById('edit-user-name').value,
      email: document.getElementById('edit-user-email').value,
      status: document.getElementById('edit-user-status').value,
      password: document.getElementById('edit-user-password').value
    };

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        alert('User updated successfully');
        this.closeModal();
        this.loadUsers();
      } else {
        const error = await response.json();
        alert('Error updating user: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  }

  resetPassword(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('reset-email').textContent = user.email;
    document.getElementById('reset-password-form').dataset.userId = userId;
    document.getElementById('reset-password-modal').classList.add('show');
  }

  async sendPasswordReset() {
    const userId = document.getElementById('reset-password-form').dataset.userId;

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        alert('Password reset email sent successfully');
        this.closeModal();
      } else {
        const error = await response.json();
        alert('Error sending reset email: ' + error.message);
      }
    } catch (error) {
      console.error('Error sending reset:', error);
      alert('Error sending password reset');
    }
  }

  async deleteUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        alert('User deleted successfully');
        this.loadUsers();
      } else {
        const error = await response.json();
        alert('Error deleting user: ' + error.message);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  }

  async loadPayments() {
    try {
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.payments = data.payments || [];
        this.renderPayments();
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      document.getElementById('payments-content').innerHTML = 
        '<p style="color: #dc3545;">Error loading payment information</p>';
    }
  }

  renderPayments() {
    const container = document.getElementById('payments-content');
    
    if (this.payments.length === 0) {
      container.innerHTML = '<p>No payment records found</p>';
      return;
    }

    container.innerHTML = `
      <table class="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Payment Method</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.payments.map(payment => `
            <tr>
              <td>${payment.user_email}</td>
              <td>$${payment.amount}</td>
              <td>
                <span class="status-badge status-${payment.status}">
                  ${payment.status.toUpperCase()}
                </span>
              </td>
              <td>${new Date(payment.created_at).toLocaleDateString()}</td>
              <td>${payment.payment_method || 'N/A'}</td>
              <td>
                <button onclick="adminApp.viewPayment('${payment.id}')" class="btn btn-primary btn-sm">👁️ View</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async loadSettings() {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings || {};
        
        // Populate form
        document.getElementById('trial-days').value = this.settings.trialDays || 14;
        document.getElementById('monthly-price').value = this.settings.monthlyPrice || 9.99;
        document.getElementById('annual-price').value = this.settings.annualPrice || 99.99;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    const settings = {
      trialDays: parseInt(document.getElementById('trial-days').value),
      monthlyPrice: parseFloat(document.getElementById('monthly-price').value),
      annualPrice: parseFloat(document.getElementById('annual-price').value)
    };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Settings saved successfully');
        this.settings = settings;
      } else {
        const error = await response.json();
        alert('Error saving settings: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  }

  closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('show');
    });
  }

  async exportUsers() {
    try {
      const response = await fetch('/api/admin/export/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Error exporting users');
    }
  }

  async exportPayments() {
    try {
      const response = await fetch('/api/admin/export/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting payments:', error);
      alert('Error exporting payments');
    }
  }

  async sendBulkEmail() {
    const subject = prompt('Email subject:');
    if (!subject) return;

    const message = prompt('Email message:');
    if (!message) return;

    try {
      const response = await fetch('/api/admin/bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ subject, message })
      });

      if (response.ok) {
        alert('Bulk email sent successfully');
      } else {
        const error = await response.json();
        alert('Error sending bulk email: ' + error.message);
      }
    } catch (error) {
      console.error('Error sending bulk email:', error);
      alert('Error sending bulk email');
    }
  }

  logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin-login';
  }
}

// Initialize admin app
window.adminApp = new AdminApp();