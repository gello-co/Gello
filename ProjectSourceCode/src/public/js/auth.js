/**
 * Authentication JavaScript
 * Handles login and register form submissions with proper redirects
 */

// Handle login form submission
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const email = formData.get("email");
      const password = formData.get("password");

      try {
        // Get CSRF token from endpoint
        const tokenResponse = await fetch("/api/csrf-token", {
          credentials: "include",
        });
        const tokenData = await tokenResponse.json();
        const csrfToken = tokenData.csrfToken;

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          credentials: "include", // Important: include cookies
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          // Login successful - redirect to boards page
          window.location.href = "/boards";
        } else {
          // Show error message
          const data = await response.json();
          alert(data.message || "Login failed. Please check your credentials.");
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login. Please try again.");
      }
    });
  }

  // Handle register form submission
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(registerForm);
      const email = formData.get("email");
      const password = formData.get("password");
      const displayName = formData.get("display_name");

      try {
        // Get CSRF token from endpoint
        const tokenResponse = await fetch("/api/csrf-token", {
          credentials: "include",
        });
        const tokenData = await tokenResponse.json();
        const csrfToken = tokenData.csrfToken;

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          credentials: "include", // Important: include cookies
          body: JSON.stringify({ email, password, display_name: displayName }),
        });

        if (response.ok) {
          // Registration successful - redirect to boards page
          window.location.href = "/boards";
        } else {
          // Show error message
          const data = await response.json();
          alert(data.message || "Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("Registration error:", error);
        alert("An error occurred during registration. Please try again.");
      }
    });
  }
});
