// ==========================================
// DOM Elements Selection
// ==========================================

// Main Views
const authView = document.getElementById('auth-view');
const vaultView = document.getElementById('vault-view');
const currentUserSpan = document.getElementById('current-user');

// Login Form Elements
const loginForm = document.getElementById('login-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

// Register Form Elements
const registerForm = document.getElementById('register-form');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const registerMessage = document.getElementById('register-message');

// Vault Elements
const logoutBtn = document.getElementById('logout-btn');
const websitName = document.getElementById('websitename');
const userName = document.getElementById('vault-username');
const password = document.getElementById('vault-password');
const tableBody = document.getElementById('password-list');
const buttonClick = document.getElementById('create');

// ==========================================
// Application Initialization
// ==========================================

/**
 * Check if the user is already logged in when the page loads.
 * This calls the /api/status endpoint which checks the secure session cookie.
 */
async function checkStatus() {
    try {
        const res = await fetch('/status');
        const data = await res.json();
        
        // If logged in, show the vault and pass the username for display
        if (data.loggedIn) {
            showVault(data.username);
        } else {
            showAuth();
        }
    } catch (error) {
        console.error("Error checking auth status:", error);
        showAuth();
    }
}

// ==========================================
// UI State Management
// ==========================================

/**
 * Switch the UI to show the Main Vault view
 * @param {string} username - The logged in user's username
 */
function showVault(username) {
    authView.style.display = 'none';
    vaultView.style.display = 'block';
    currentUserSpan.innerText = username;
    
    // Automatically load passwords when vault is shown
    loadPasswords();
}

/**
 * Switch the UI to show the Login/Register view
 */
function showAuth() {
    authView.style.display = 'block';
    vaultView.style.display = 'none';
    tableBody.innerHTML = ''; // Clear passwords from UI for security
}

// ==========================================
// Authentication Event Handlers
// ==========================================

// Handle Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page refresh
    loginError.innerText = ''; // Clear previous errors
    
    try {
        // Send login credentials to backend
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: loginUsername.value, 
                password: loginPassword.value 
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Clear form and check status (which will redirect to vault)
            loginUsername.value = '';
            loginPassword.value = '';
            checkStatus();
        } else {
            loginError.innerText = data.error || 'Login failed';
        }
    } catch (error) {
        loginError.innerText = 'Network error. Please try again.';
    }
});

// Handle Register Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page refresh
    registerMessage.innerText = ''; // Clear previous messages
    
    try {
        // Send registration data to backend
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: registerUsername.value, 
                password: registerPassword.value 
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Show success message and clear form
            registerMessage.style.color = '#00c6ff'; // Using our secondary color for success
            registerMessage.innerText = 'Registered successfully! You can now login.';
            registerUsername.value = '';
            registerPassword.value = '';
        } else {
            registerMessage.style.color = '#ff416c'; // Danger color for error
            registerMessage.innerText = data.error || 'Registration failed';
        }
    } catch (error) {
        registerMessage.style.color = '#ff416c';
        registerMessage.innerText = 'Network error. Please try again.';
    }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/logout', { method: 'POST' });
        showAuth(); // Return to login screen
    } catch (error) {
        console.error("Error logging out:", error);
    }
});

// ==========================================
// Vault Data Handlers (Passwords)
// ==========================================

/**
 * Fetch decrypted passwords from the server and render them in the table
 */
async function loadPasswords() {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const res = await fetch('/get-passwords');
        
        if (res.ok) {
            const passwords = await res.json();
            tableBody.innerHTML = '';
            
            if (passwords.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No passwords saved yet. Add one below!</td></tr>';
                return;
            }

            // Iterate over passwords and append to table
            passwords.forEach(p => {
                appendPasswordToTable(p.id, p.website, p.username, p.password);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ff6b81;">Error loading data.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ff6b81;">Network Error.</td></tr>';
    }
}

/**
 * Helper function to create a new table row for a password entry
 */
function appendPasswordToTable(id, website, user, pass) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${website}</td>
        <td>${user}</td>
        <td>
            <!-- We could mask this later with a toggle button, keeping it simple for now -->
            ${pass} 
        </td>
        <td>
            <button data-id="${id}" class="delete-btn">
                <i class="fa-solid fa-trash"></i> Delete
            </button>
        </td>
    `;
    tableBody.appendChild(tr);
}

// Handle Adding a New Password
buttonClick.onclick = async () => {
    // Basic validation
    if (userName.value !== '' && password.value !== '' && websitName.value !== '') {
        
        const payload = {
            website: websitName.value,
            username: userName.value,
            password: password.value
        };

        try {
            // Send new password to backend for encryption and storage
            const res = await fetch('/add-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                
                // If table is currently showing "No passwords", clear it first
                if (tableBody.innerText.includes('No passwords')) {
                    tableBody.innerHTML = '';
                }
                
                // Add the newly created password to the UI instantly
                appendPasswordToTable(data.id, websitName.value, userName.value, password.value);
                
                // Clear input fields for next entry
                websitName.value = '';
                password.value = '';
                userName.value = '';
            } else {
                alert('Error saving password!');
            }
        } catch (error) {
            alert('Network error while saving password.');
        }
    } else {
        alert('Please fill in all the fields before saving!');
    }
};

// Handle Deleting a Password (Event Delegation on the table body)
tableBody.addEventListener('click', async function (e) {
    // Check if the clicked element or its parent has the 'delete-btn' class
    const target = e.target.closest('.delete-btn');
    
    if (target) {
        const id = target.getAttribute('data-id');
        
        try {
            // Send delete request to backend
            const res = await fetch(`/delete-password/${id}`, { method: 'DELETE' });
            
            if (res.ok) {
                // Remove the row from the table UI
                target.closest('tr').remove();
                
                // Check if table is empty after deletion
                if (tableBody.children.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No passwords saved yet. Add one below!</td></tr>';
                }
            } else {
                alert('Error deleting password');
            }
        } catch (error) {
            alert('Network error while deleting password.');
        }
    }
});

// ==========================================
// Start Application
// ==========================================
checkStatus();