// LOGIN FORM
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    // Simulated check
    alert("Login successful (dummy check). Redirecting...");
    // window.location.href = "dashboard.html";
  });
}

// REGISTER FORM
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirmPassword").value;

    if (!name || !email || !pass || !confirm) {
      alert("All fields are required.");
      return;
    }

    if (pass !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    // Simulated registration
    alert("Registration successful (dummy logic).");
    // window.location.href = "login.html";
  });
}
