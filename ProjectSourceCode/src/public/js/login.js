/**
 * Login form handler
 * Intercepts form submission, sends AJAX request, and redirects on success
 */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const errorElement = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Helper function to hide error message
  function hideError() {
    if (errorElement) {
      errorElement.classList.add("d-none");
      errorElement.textContent = "";
    }
  }

  // Helper function to show error message
  function showError(message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove("d-none");
    }
  }

  // Clear error when user starts typing
  if (emailInput) {
    emailInput.addEventListener("input", hideError);
  }
  if (passwordInput) {
    passwordInput.addEventListener("input", hideError);
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide any previous error
    hideError();

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent;

    // Disable submit button and show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Logging in...";
    }

    // Get form data
    const formData = new FormData(loginForm);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Log actual error for debugging
        console.error(
          "Login failed:",
          errorData.error?.message || response.statusText,
        );
        // Show user-friendly message
        const userMessage =
          response.status === 401
            ? "Invalid email or password."
            : "Login failed. Please try again later.";
        throw new Error(userMessage);
      }

      // Hide error on successful login (before redirect)
      hideError();

      // Redirect to home page on success
      window.location.href = "/";
    } catch (error) {
      // Show error message inline
      showError(error.message || "Login failed. Please try again.");

      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText || "Login";
      }
    }
  });
});
