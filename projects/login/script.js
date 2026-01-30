// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength validation function
function isStrongPassword(password) {
  // Check minimum length
  if (password.length < 8) {
    return false;
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }
  
  return true;
}

// Password visibility toggle
document.addEventListener('DOMContentLoaded', function() {
  const togglePassword = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('toggleIcon');
  
  if (togglePassword && passwordInput && toggleIcon) {
    togglePassword.addEventListener('click', function() {
      // Toggle password visibility
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Toggle icon
      const iconName = type === 'password' ? 'eye-off' : 'eye';
      toggleIcon.setAttribute('name', iconName);
    });
  }
});

// Login validation
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.querySelector('form');
  const errorMessage = document.getElementById('error-message');
  
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.querySelector('input[name="email"]').value;
      const password = document.querySelector('input[name="password"]').value;
      
      // Validate email format
      if (!isValidEmail(email)) {
        if (errorMessage) {
          errorMessage.textContent = 'Please enter a valid email address.';
          errorMessage.style.display = 'block';
        }
        return;
      }
      
      // Validate password strength
      if (!isStrongPassword(password)) {
        if (errorMessage) {
          errorMessage.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
          errorMessage.style.display = 'block';
        }
        return;
      }
      
      // Hardcoded credentials
      const validEmail = 'example@gmail.com';
      const validPassword = 'Example123!';
      
      if (email === validEmail && password === validPassword) {
        // Store login state
        sessionStorage.setItem('loggedIn', 'true');
        // Redirect to welcome page
        window.location.href = 'page.html';
      } else {
        // Show error message
        if (errorMessage) {
          errorMessage.textContent = 'Invalid email or password. Please try again.';
          errorMessage.style.display = 'block';
        }
      }
    });
  }
});
