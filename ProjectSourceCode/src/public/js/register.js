/**
 * Register form handler
 * Intercepts form submission, validates password confirmation, sends AJAX request, and redirects on success
 */

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;

  const errorElement = document.getElementById("registerError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordConfirmInput = document.getElementById("passwordConfirm");

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
  if (passwordConfirmInput) {
    passwordConfirmInput.addEventListener("input", hideError);
  }

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide any previous error
    hideError();

    // Client-side password confirmation validation
    const password = passwordInput?.value;
    const passwordConfirm = passwordConfirmInput?.value;

    if (password !== passwordConfirm) {
      showError("Passwords do not match");
      passwordConfirmInput?.focus();
      return;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent;

    // Disable submit button and show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Registering...";
    }

    // Get form data
    const formData = new FormData(registerForm);
    const email = formData.get("email");
    const displayName = formData.get("display_name");
    const role = formData.get("role");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          passwordConfirm,
          display_name: displayName,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Log actual error for debugging
        console.error(
          "Registration failed:",
          errorData.error?.message || response.statusText,
        );
        // Show user-friendly message
        let userMessage = "Registration failed. Please try again later.";
        if (response.status === 400) {
          // Validation errors
          if (errorData.details) {
            const passwordMismatch = errorData.details.find(
              (detail) =>
                detail.path?.includes("passwordConfirm") ||
                detail.message?.includes("match"),
            );
            if (passwordMismatch) {
              userMessage = "Passwords do not match.";
            } else {
              userMessage =
                errorData.details?.map((d) => d.message).join(", ") ||
                "Please check your input and try again.";
            }
          } else {
            userMessage =
              errorData.message || "Please check your input and try again.";
          }
        } else if (response.status === 409) {
          userMessage = "An account with this email already exists.";
        }
        throw new Error(userMessage);
      }

      // Hide error on successful registration (before redirect)
      hideError();

      // Redirect to home page on success
      window.location.href = "/";
    } catch (error) {
      // Show error message inline
      showError(error.message || "Registration failed. Please try again.");

      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText || "Register";
      }
    }
  });
});
