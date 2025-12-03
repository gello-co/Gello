/**
 * Register form handler
 * Intercepts form submission, validates password confirmation, sends AJAX request, and redirects on success
 */

/**
 * Parse validation error response and return user-friendly message.
 */
function parseValidationError(errorData) {
  if (!errorData.details) {
    return errorData.message || 'Please check your input and try again.';
  }

  const passwordMismatch = errorData.details.find(
    (detail) => detail.path?.includes('passwordConfirm') || detail.message?.includes('match')
  );

  if (passwordMismatch) {
    return 'Passwords do not match.';
  }

  return (
    errorData.details?.map((d) => d.message).join(', ') || 'Please check your input and try again.'
  );
}

/**
 * Get user-friendly error message based on response status and error data.
 */
function getUserErrorMessage(status, errorData) {
  if (status === 400) {
    return parseValidationError(errorData);
  }
  if (status === 409) {
    return 'An account with this email already exists.';
  }
  return 'Registration failed. Please try again later.';
}

/**
 * Handle registration form submission.
 */
async function handleRegistrationSubmit(e, formElements) {
  e.preventDefault();

  const { registerForm, errorElement, passwordInput, passwordConfirmInput, submitButton } =
    formElements;

  // Hide any previous error
  hideError(errorElement);

  // Client-side password confirmation validation
  const password = passwordInput?.value;
  const passwordConfirm = passwordConfirmInput?.value;

  if (password !== passwordConfirm) {
    showError(errorElement, 'Passwords do not match');
    passwordConfirmInput?.focus();
    return;
  }

  const originalText = submitButton?.textContent;

  // Disable submit button and show loading state
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
  }

  // Get form data
  const formData = new FormData(registerForm);

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: formData.get('email'),
        password,
        passwordConfirm,
        display_name: formData.get('display_name'),
        role: formData.get('role'),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Registration failed:', errorData.error?.message || response.statusText);
      throw new Error(getUserErrorMessage(response.status, errorData));
    }

    hideError(errorElement);
    window.location.href = '/';
  } catch (error) {
    showError(errorElement, error.message || 'Registration failed. Please try again.');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText || 'Register';
    }
  }
}

function hideError(errorElement) {
  if (errorElement) {
    errorElement.classList.add('d-none');
    errorElement.textContent = '';
  }
}

function showError(errorElement, message) {
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  const errorElement = document.getElementById('registerError');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('passwordConfirm');
  const submitButton = registerForm.querySelector('button[type="submit"]');

  // Clear error when user starts typing
  const clearError = () => hideError(errorElement);
  if (emailInput) emailInput.addEventListener('input', clearError);
  if (passwordInput) passwordInput.addEventListener('input', clearError);
  if (passwordConfirmInput) passwordConfirmInput.addEventListener('input', clearError);

  const formElements = {
    registerForm,
    errorElement,
    passwordInput,
    passwordConfirmInput,
    submitButton,
  };
  registerForm.addEventListener('submit', (e) => handleRegistrationSubmit(e, formElements));
});
