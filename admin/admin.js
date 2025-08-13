// Admin Portal JavaScript
class AdminPortal {
    constructor() {
        this.currentTab = 'dashboard';
        this.apiBase = window.location.origin.replace('admin.', '');
        this.init();
    }

    async init() {
        // Check if user is logged in
        const token = localStorage.getItem('adminToken');
        if (!token) {
            console.log('No admin token found, redirecting to login');
            window.location.href = '/admin/login.html';
            return;
        }
        
        await this.loadDashboardData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('user-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchUsers();
            }
        });
    }

    // API Helper
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.log('No admin token found, redirecting to login');
                window.location.href = '/admin/login.html';
                return null;
            }

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`Making API call to: ${this.apiBase}/api/admin${endpoint}`);
            const response = await fetch(`${this.apiBase}/api/admin${endpoint}`, options);
            
            if (response.status === 401) {
                console.log('Admin authentication failed, redirecting to login');
                localStorage.removeItem('adminToken');
                this.showNotification('Session expired. Please log in again.', 'error');
                setTimeout(() => {
                    window.location.href = '/admin/login.html';
                }, 2000);
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`API call successful:`, result);
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification('API call failed: ' + error.message, 'error');
            return null;
        }
    }

    // Dashboard Functions
    async loadDashboardData() {
        try {
            const stats = await this.apiCall('/stats');
            if (stats) {
                document.getElementById('total-users').textContent = stats.totalUsers || 0;
                document.getElementById('active-subs').textContent = stats.activeSubscriptions || 0;
                document.getElementById('monthly-revenue').textContent = `$${(stats.monthlyRevenue || 0).toFixed(2)}`;
                document.getElementById('failed-payments').textContent = stats.failedPayments || 0;
            }

            const activity = await this.apiCall('/activity');
            if (activity) {
                this.renderRecentActivity(activity);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="flex items-center space-x-4 p-3 border rounded-lg">
                <div class="flex-shrink-0">
                    <i class="fas ${this.getActivityIcon(activity.type)} text-${this.getActivityColor(activity.type)}-500"></i>
                </div>
                <div class="flex-grow">
                    <p class="text-sm text-gray-800">${activity.description}</p>
                    <p class="text-xs text-gray-500">${new Date(activity.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            user_signup: 'fa-user-plus',
            payment_success: 'fa-check-circle',
            payment_failed: 'fa-exclamation-triangle',
            subscription_created: 'fa-credit-card',
            subscription_cancelled: 'fa-times-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    getActivityColor(type) {
        const colors = {
            user_signup: 'blue',
            payment_success: 'green',
            payment_failed: 'red',
            subscription_created: 'green',
            subscription_cancelled: 'yellow'
        };
        return colors[type] || 'gray';
    }

    // User Management Functions
    async loadUsers() {
        const users = await this.apiCall('/users');
        if (users) {
            this.renderUsersTable(users);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${this.getPlanColor(user.plan)}-100 text-${this.getPlanColor(user.plan)}-800">
                        ${user.plan || 'Free'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${user.subscriptionStatus === 'active' ? 'green' : 'red'}-100 text-${user.subscriptionStatus === 'active' ? 'green' : 'red'}-800">
                        ${user.subscriptionStatus || 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="adminPortal.viewUser('${user.id}')" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <button onclick="adminPortal.resetPassword('${user.id}')" class="text-yellow-600 hover:text-yellow-900 mr-3">Reset Password</button>
                    <button onclick="adminPortal.suspendUser('${user.id}')" class="text-red-600 hover:text-red-900">Suspend</button>
                </td>
            </tr>
        `).join('');
    }

    getPlanColor(plan) {
        const colors = {
            free: 'gray',
            premium: 'blue',
            family: 'purple'
        };
        return colors[plan] || 'gray';
    }

    async searchUsers() {
        const query = document.getElementById('user-search').value;
        const users = await this.apiCall(`/users?search=${encodeURIComponent(query)}`);
        if (users) {
            this.renderUsersTable(users);
        }
    }

    async viewUser(userId) {
        const user = await this.apiCall(`/users/${userId}`);
        if (user) {
            this.showUserModal(user);
        }
    }

    showUserModal(user) {
        document.getElementById('modal-user-name').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('modal-user-content').innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" id="edit-firstName" value="${user.firstName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" id="edit-lastName" value="${user.lastName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="edit-email" value="${user.email || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Plan</label>
                    <select id="edit-plan" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Free</option>
                        <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                        <option value="family" ${user.plan === 'family' ? 'selected' : ''}>Family</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Subscription Status</label>
                    <span class="text-sm text-gray-900">${user.subscriptionStatus || 'None'}</span>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Stripe Customer ID</label>
                    <span class="text-sm text-gray-900 font-mono">${user.stripeCustomerId || 'None'}</span>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Created</label>
                    <span class="text-sm text-gray-900">${new Date(user.createdAt).toLocaleString()}</span>
                </div>
            </div>
        `;
        document.getElementById('userModal').classList.remove('hidden');
        this.currentEditingUser = user.id;
    }

    // Subscription Management
    async loadSubscriptions() {
        const subscriptions = await this.apiCall('/subscriptions');
        if (subscriptions) {
            this.renderSubscriptionsTable(subscriptions);
        }
    }

    renderSubscriptionsTable(subscriptions) {
        const tbody = document.getElementById('subscriptions-table');
        tbody.innerHTML = subscriptions.map(sub => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${sub.userEmail}</div>
                    <div class="text-sm text-gray-500">${sub.userName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${sub.plan}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${sub.status === 'active' ? 'green' : 'red'}-100 text-${sub.status === 'active' ? 'green' : 'red'}-800">
                        ${sub.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${sub.nextPayment ? new Date(sub.nextPayment).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="adminPortal.cancelSubscription('${sub.id}')" class="text-red-600 hover:text-red-900">Cancel</button>
                </td>
            </tr>
        `).join('');
    }

    // Payment Management
    async loadPayments() {
        const payments = await this.apiCall('/payments');
        if (payments) {
            this.renderPaymentsTable(payments);
        }
    }

    renderPaymentsTable(payments) {
        const tbody = document.getElementById('payments-table');
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(payment.date).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${payment.userEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${(payment.amount / 100).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${payment.status === 'succeeded' ? 'green' : 'red'}-100 text-${payment.status === 'succeeded' ? 'green' : 'red'}-800">
                        ${payment.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    ${payment.stripeId}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="adminPortal.refundPayment('${payment.stripeId}')" class="text-blue-600 hover:text-blue-900">Refund</button>
                </td>
            </tr>
        `).join('');
    }

    // Admin Actions
    async resetPassword(userId) {
        if (confirm('Send password reset email to this user?')) {
            const result = await this.apiCall(`/users/${userId}/reset-password`, 'POST');
            if (result) {
                this.showNotification('Password reset email sent', 'success');
            }
        }
    }

    async suspendUser(userId) {
        if (confirm('Are you sure you want to suspend this user?')) {
            const result = await this.apiCall(`/users/${userId}/suspend`, 'POST');
            if (result) {
                this.showNotification('User suspended', 'success');
                this.loadUsers();
            }
        }
    }

    async cancelSubscription(subscriptionId) {
        if (confirm('Are you sure you want to cancel this subscription?')) {
            const result = await this.apiCall(`/subscriptions/${subscriptionId}/cancel`, 'POST');
            if (result) {
                this.showNotification('Subscription cancelled', 'success');
                this.loadSubscriptions();
            }
        }
    }

    async refundPayment(paymentId) {
        if (confirm('Are you sure you want to refund this payment?')) {
            const result = await this.apiCall(`/payments/${paymentId}/refund`, 'POST');
            if (result) {
                this.showNotification('Payment refunded', 'success');
                this.loadPayments();
            }
        }
    }

    // Modal Functions
    closeModal() {
        document.getElementById('userModal').classList.add('hidden');
    }

    async saveUserChanges() {
        const userId = this.currentEditingUser;
        const data = {
            firstName: document.getElementById('edit-firstName').value,
            lastName: document.getElementById('edit-lastName').value,
            email: document.getElementById('edit-email').value,
            plan: document.getElementById('edit-plan').value
        };

        const result = await this.apiCall(`/users/${userId}`, 'PUT', data);
        if (result) {
            this.showNotification('User updated successfully', 'success');
            this.closeModal();
            this.loadUsers();
        }
    }

    // System Functions
    async sendPasswordReset() {
        const email = prompt('Enter user email for password reset:');
        if (email) {
            const result = await this.apiCall('/send-password-reset', 'POST', { email });
            if (result) {
                this.showNotification('Password reset email sent', 'success');
            }
        }
    }

    async exportData() {
        const result = await this.apiCall('/export-data', 'POST');
        if (result && result.downloadUrl) {
            window.open(result.downloadUrl, '_blank');
        }
    }

    async clearCache() {
        if (confirm('Clear system cache?')) {
            const result = await this.apiCall('/clear-cache', 'POST');
            if (result) {
                this.showNotification('Cache cleared', 'success');
            }
        }
    }

    async syncStripe() {
        if (confirm('Sync all Stripe data? This may take a few minutes.')) {
            const result = await this.apiCall('/sync-stripe', 'POST');
            if (result) {
                this.showNotification('Stripe sync completed', 'success');
                this.loadDashboardData();
            }
        }
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Tab Management
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('text-gray-600');
    });
    
    document.getElementById(`tab-${tabName}`).classList.add('active', 'border-blue-500', 'text-blue-600');
    document.getElementById(`tab-${tabName}`).classList.remove('text-gray-600');
    
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show selected content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Load data for the selected tab
    switch(tabName) {
        case 'dashboard':
            adminPortal.loadDashboardData();
            break;
        case 'users':
            adminPortal.loadUsers();
            break;
        case 'subscriptions':
            adminPortal.loadSubscriptions();
            break;
        case 'payments':
            adminPortal.loadPayments();
            break;
    }
    
    adminPortal.currentTab = tabName;
}

async function logout() {
    if (confirm('Are you sure you want to log out?')) {
        try {
            // Call logout API to invalidate token on server
            const token = localStorage.getItem('adminToken');
            if (token) {
                await fetch('/api/admin/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
            }
        } catch (error) {
            console.log('Logout API call failed, but proceeding with local logout');
        }
        
        localStorage.removeItem('adminToken');
        adminPortal.showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/admin/login.html';
        }, 1000);
    }
}

// Initialize admin portal
let adminPortal;
document.addEventListener('DOMContentLoaded', () => {
    adminPortal = new AdminPortal();
});