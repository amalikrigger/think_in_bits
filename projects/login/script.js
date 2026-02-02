// Utilities
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password) {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
}

function showToast(message) {
  // Simple alert for now
  alert(message);
}

document.addEventListener('DOMContentLoaded', () => {
  // --- Login Page Logic ---
  const loginForm = document.querySelector('form');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.querySelector('.toggle-password');
  const toggleIcon = document.getElementById('toggleIcon');
  const errorMessage = document.getElementById('error-message');
  const rememberCheckbox = document.querySelector('.remember-forget input[type="checkbox"]');
  const emailInput = document.querySelector('input[name="email"]');
  
  // 1. Password Visibility
  if (togglePasswordBtn && passwordInput && toggleIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      toggleIcon.setAttribute('name', type === 'password' ? 'eye-off' : 'eye');
    });
  }

  // 2. Login Form Submission
  if (loginForm) {
    // Check for saved email
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      // Reset error
      if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
      }

      // Validate Email
      if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
      }
      
      // Validate Password (client-side check)
      if (!isStrongPassword(password)) {
        showError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
        return;
      }
      
      // Authenticate (Mock)
      const validEmail = 'example@gmail.com';
      const validPassword = 'Example123!';
      
      if (email === validEmail && password === validPassword) {
        // Handle "Remember Me"
        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        // Login Success
        sessionStorage.setItem('loggedIn', 'true');
        window.location.href = 'page.html';
      } else {
        showError('Invalid email or password. Hint: example@gmail.com / Example123!');
      }
    });
  }

  function showError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
      // Shake animation
      const loginBox = document.querySelector('.login-box');
      if (loginBox) {
        loginBox.style.animation = 'none';
        void loginBox.offsetHeight; /* trigger reflow */
        loginBox.style.animation = 'shake 0.5s';
      }
    } else {
      alert(msg);
    }
  }

  // 3. Mock Links
  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Password reset feature coming soon!');
    });
  }

  const registerLink = document.querySelector('.register-link-btn');
  if (registerLink) {
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Registration is currently closed.');
    });
  }

  // --- Welcome Page Logic ---
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('loggedIn');
      window.location.href = 'index.html';
    });
  }
});
