const STORAGE_KEY = "ipt_demo_v1";
let currentUser = null;
window.db = { accounts: [], departments: [], requests: [] };

/* ================= ROUTING ================= */
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const route = hash.replace("#/", "") || "home";
    const protectedRoutes = ["profile", "my-requests"];
    const adminRoutes = ["accounts", "employees", "departments"];

    if (protectedRoutes.includes(route) && !currentUser) return navigateTo("#/login");
    if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== "Admin")) return navigateTo("#/");

    const page = document.getElementById(route + "-page");
    if (page) page.classList.add("active");

    if (route === "profile") renderProfile();
    if (route === "accounts") renderAccounts();
    if (route === "my-requests") renderRequests();
    if (route === "verify-email") showVerifyEmail();
    if (route === "login") showVerifiedMessage();
    if (route === "employees") renderEmployees();
    if (route === "departments") renderDepartments();

    
}

/* ================= AUTH ================= */
function setAuthState(isAuth, user = null) {
    if (isAuth) {
        currentUser = user;
        document.body.classList.remove("not-authenticated");
        document.body.classList.add("authenticated");

        const navUsername = document.getElementById("navUsername");
        if (navUsername) navUsername.textContent = user.firstName;

        if (user.role === "Admin") {
            document.body.classList.add("is-admin");
        }
    } else {
        currentUser = null;
        document.body.classList.add("not-authenticated");
        document.body.classList.remove("authenticated", "is-admin");

        const navUsername = document.getElementById("navUsername");
        if (navUsername) navUsername.textContent = "User";
    }
}

function logout() {
    localStorage.removeItem("auth_token");
    setAuthState(false);
    navigateTo("#/");
}

function checkExistingAuth() {
    const token = localStorage.getItem("auth_token");
    if (token) {
        const user = window.db.accounts.find(a => a.email === token);
        if (user) setAuthState(true, user);
    }
}

/* ================= VERIFY ================= */
function showVerifyEmail() {
    const email = localStorage.getItem("unverified_email");
    const display = document.getElementById("verifyEmailDisplay");
    if (display && email) display.textContent = email;
}

function simulateVerification() {
    const email = localStorage.getItem("unverified_email");
    const acc = window.db.accounts.find(a => a.email === email);
    if (acc) {
        acc.verified = true;
        saveToStorage();
        localStorage.setItem("just_verified", "true");
        navigateTo("#/login");
    }
}

function showVerifiedMessage() {
    if (localStorage.getItem("just_verified") === "true") {
        localStorage.removeItem("just_verified");
        setTimeout(() => {
            const existing = document.getElementById("verifiedMsg");
            if (existing) existing.remove();
            const msg = document.createElement("div");
            msg.id = "verifiedMsg";
            msg.className = "alert alert-success mt-3";
            msg.textContent = "✅ Email verified! You may now log in.";
            const form = document.getElementById("loginForm");
            if (form) form.parentNode.insertBefore(msg, form);
        }, 50);
    }
}

/* ================= PROFILE ================= */
function renderProfile() {
    document.getElementById("profileContent").innerHTML = `
        <div class="card shadow-sm p-3" style="max-width: 500px;">
            <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Role:</strong> ${currentUser.role}</p>
            <button class="btn btn-primary btn-sm" onclick="alert('Edit not implemented')">Edit Profile</button>
        </div>
    `;
}

/* ================= ADMIN ACCOUNTS ================= */
function renderAccounts() {
    document.getElementById("accountsList").innerHTML = `
        <table class="table table-bordered">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th></tr></thead>
            <tbody>
                ${window.db.accounts.map(a => `
                    <tr>
                        <td>${a.firstName} ${a.lastName}</td>
                        <td>${a.email}</td>
                        <td>${a.role}</td>
                        <td>${a.verified ? "✔" : "—"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

/* ================= REQUESTS ================= */
function renderRequests() {
    if (!window.db.requests) window.db.requests = [];
    const userReq = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    const container = document.getElementById("requestsList");

    if (userReq.length === 0) {
        container.innerHTML = `
            <p>You have no requests yet.</p>
            <button class="btn btn-success btn-sm" onclick="showRequestModal()">Create One</button>
        `;
        return;
    }

    container.innerHTML = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${userReq.map(r => `
                    <tr>
                        <td>${r.type}</td>
                        <td>${r.items.map(i => `${i.name} (x${i.qty})`).join(", ")}</td>
                        <td>${r.date}</td>
                        <td>
                            <span class="badge ${
                                r.status === 'Pending' ? 'bg-warning text-dark' :
                                r.status === 'Approved' ? 'bg-success' : 'bg-danger'
                            }">${r.status}</span>
                        </td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
}
/* ================= ADMIN ACCOUNTS ================= */
function renderAccounts() {
    if (!window.db.accounts) window.db.accounts = [];
    const tbody = document.getElementById("accountsList");

    if (window.db.accounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No accounts.</td></tr>`;
        return;
    }

    tbody.innerHTML = window.db.accounts.map((a, i) => `
        <tr>
            <td>${a.firstName} ${a.lastName}</td>
            <td>${a.email}</td>
            <td>${a.role}</td>
            <td>${a.verified ? "✅" : "—"}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="editAccount(${i})">Edit</button>
                <button class="btn btn-outline-warning btn-sm" onclick="resetPassword(${i})">Reset Password</button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteAccount(${i})">Delete</button>
            </td>
        </tr>`).join("");
}

function showAccountForm(i = null) {
    document.getElementById("accountForm").style.display = "block";

    if (i !== null) {
        const acc = window.db.accounts[i];
        document.getElementById("accIndex").value = i;
        document.getElementById("accFirstName").value = acc.firstName;
        document.getElementById("accLastName").value = acc.lastName;
        document.getElementById("accEmail").value = acc.email;
        document.getElementById("accPassword").value = acc.password;
        document.getElementById("accRole").value = acc.role;
        document.getElementById("accVerified").checked = acc.verified;
    } else {
        document.getElementById("accIndex").value = "";
        document.getElementById("accFirstName").value = "";
        document.getElementById("accLastName").value = "";
        document.getElementById("accEmail").value = "";
        document.getElementById("accPassword").value = "";
        document.getElementById("accRole").value = "User";
        document.getElementById("accVerified").checked = false;
    }
}

function hideAccountForm() {
    document.getElementById("accountForm").style.display = "none";
}

function saveAccount() {
    const firstName = document.getElementById("accFirstName").value.trim();
    const lastName = document.getElementById("accLastName").value.trim();
    const email = document.getElementById("accEmail").value.trim();
    const password = document.getElementById("accPassword").value.trim();
    const role = document.getElementById("accRole").value;
    const verified = document.getElementById("accVerified").checked;

    if (!firstName || !lastName || !email || !password) {
        return alert("Please fill in all fields.");
    }

    if (password.length < 6) return alert("Password must be at least 6 characters.");

    const index = document.getElementById("accIndex").value;

    if (index === "") {
        const exists = window.db.accounts.find(a => a.email === email);
        if (exists) return alert("Email already exists.");
    }

    const accData = { firstName, lastName, email, password, role, verified };

    if (index !== "") {
        window.db.accounts[parseInt(index)] = accData;
    } else {
        window.db.accounts.push(accData);
    }

    saveToStorage();
    hideAccountForm();
    renderAccounts();
}

function editAccount(i) {
    showAccountForm(i);
}

function resetPassword(i) {
    const newPassword = prompt("Enter new password (min 6 characters):");
    if (!newPassword) return;
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    window.db.accounts[i].password = newPassword;
    saveToStorage();
    alert("Password reset successfully!");
}

function deleteAccount(i) {
    if (window.db.accounts[i].email === currentUser.email) {
        return alert("You cannot delete your own account!");
    }
    if (confirm("Are you sure you want to delete this account?")) {
        window.db.accounts.splice(i, 1);
        saveToStorage();
        renderAccounts();
    }

    /* ================= REQUESTS ================= */
function renderRequests() {
    if (!window.db.requests) window.db.requests = [];
    const userReq = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    const container = document.getElementById("requestsList");

    if (userReq.length === 0) {
        container.innerHTML = `
            <p>You have no requests yet.</p>
            <button class="btn btn-success btn-sm" onclick="showRequestModal()">Create One</button>
        `;
        return;
    }

    container.innerHTML = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${userReq.map(r => `
                    <tr>
                        <td>${r.type}</td>
                        <td>${r.items.map(i => `${i.name} (x${i.qty})`).join(", ")}</td>
                        <td>${r.date}</td>
                        <td>
                            <span class="badge ${
                                r.status === 'Pending' ? 'bg-warning text-dark' :
                                r.status === 'Approved' ? 'bg-success' : 'bg-danger'
                            }">${r.status}</span>
                        </td>
                    </tr>`).join("")}
            </tbody>
        </table>`;
}

function showRequestModal() {
    // Reset modal
    document.getElementById("reqType").value = "Equipment";
    document.getElementById("reqItems").innerHTML = `
        <div class="d-flex gap-2 mb-2 item-row">
            <input class="form-control" placeholder="Item name">
            <input class="form-control" type="number" value="1" style="width:80px">
            <button class="btn btn-success btn-sm" onclick="addItemRow()">+</button>
        </div>`;

    const modal = new bootstrap.Modal(document.getElementById("requestModal"));
    modal.show();
}

function addItemRow() {
    const container = document.getElementById("reqItems");
    const row = document.createElement("div");
    row.className = "d-flex gap-2 mb-2 item-row";
    row.innerHTML = `
        <input class="form-control" placeholder="Item name">
        <input class="form-control" type="number" value="1" style="width:80px">
        <button class="btn btn-danger btn-sm" onclick="removeItemRow(this)">x</button>`;
    container.appendChild(row);
}

function removeItemRow(btn) {
    btn.parentElement.remove();
}

function submitRequest() {
    const type = document.getElementById("reqType").value;
    const rows = document.querySelectorAll(".item-row");
    const items = [];

    rows.forEach(row => {
        const inputs = row.querySelectorAll("input");
        const name = inputs[0].value.trim();
        const qty = inputs[1].value;
        if (name) items.push({ name, qty });
    });

    if (items.length === 0) return alert("Please add at least one item.");

    if (!window.db.requests) window.db.requests = [];

    window.db.requests.push({
        type,
        items,
        status: "Pending",
        date: new Date().toLocaleDateString(),
        employeeEmail: currentUser.email
    });

    saveToStorage();

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("requestModal")).hide();
    renderRequests();
}
    
}
/* ================= STORAGE ================= */
function loadFromStorage() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (data) window.db = data;
        else seedData();
    } catch {
        seedData();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function seedData() {
    window.db = {
        accounts: [{
            firstName: "Admin",
            lastName: "User",
            email: "admin@example.com",
            password: "Password123!",
            role: "Admin",
            verified: true
        }],
        departments: [{ name: "Engineering" }, { name: "HR" }],
        employees: [],
        requests: []
    };
    saveToStorage();
}

/* ================= INIT ================= */
window.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();

    window.addEventListener("hashchange", handleRouting);

    if (!window.location.hash || window.location.hash === "#/") {
        window.location.hash = "#/";
        handleRouting();
    } else {
        handleRouting();
    }

    checkExistingAuth();

    document.getElementById("registerForm").addEventListener("submit", e => {
        e.preventDefault();
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        if (password.length < 6) return alert("Password too short");
        if (window.db.accounts.find(a => a.email === email)) return alert("Email already exists");

        window.db.accounts.push({
            firstName: document.getElementById("firstName").value,
            lastName: document.getElementById("lastName").value,
            email,
            password,
            role: "User",
            verified: false
        });

        localStorage.setItem("unverified_email", email);
        saveToStorage();
        navigateTo("#/verify-email");
    });

    document.getElementById("loginForm").addEventListener("submit", e => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const user = window.db.accounts.find(a =>
            a.email === email &&
            a.password === password &&
            a.verified
        );

        if (!user) {
            document.getElementById("loginError").textContent = "Invalid credentials or not verified.";
            return;
        }

        localStorage.setItem("auth_token", user.email);
        setAuthState(true, user);
        navigateTo("#/profile");
    });
});
/* ================= EMPLOYEES ================= */
function renderEmployees() {
    const tbody = document.getElementById("employeesList");
    if (!window.db.employees || window.db.employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No employees.</td></tr>`;
        return;
    }
    tbody.innerHTML = window.db.employees.map((emp, i) => {
        const dept = window.db.departments.find(d => d.name === emp.dept) || {};
        return `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.email}</td>
                <td>${emp.position}</td>
                <td>${emp.dept}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editEmployee(${i})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${i})">Delete</button>
                </td>
            </tr>`;
    }).join("");
}

function showEmployeeForm(i = null) {
    document.getElementById("employeeForm").style.display = "block";

    // Populate department dropdown
    const deptSelect = document.getElementById("empDept");
    deptSelect.innerHTML = window.db.departments.map(d =>
        `<option value="${d.name}">${d.name}</option>`
    ).join("");

    if (i !== null) {
        const emp = window.db.employees[i];
        document.getElementById("empIndex").value = i;
        document.getElementById("empId").value = emp.id;
        document.getElementById("empEmail").value = emp.email;
        document.getElementById("empPosition").value = emp.position;
        document.getElementById("empDept").value = emp.dept;
        document.getElementById("empHireDate").value = emp.hireDate;
    } else {
        document.getElementById("empIndex").value = "";
        document.getElementById("empId").value = "";
        document.getElementById("empEmail").value = "";
        document.getElementById("empPosition").value = "";
        document.getElementById("empHireDate").value = "";
    }
}

function hideEmployeeForm() {
    document.getElementById("employeeForm").style.display = "none";
}

function saveEmployee() {
    const id = document.getElementById("empId").value.trim();
    const email = document.getElementById("empEmail").value.trim();
    const position = document.getElementById("empPosition").value.trim();
    const dept = document.getElementById("empDept").value;
    const hireDate = document.getElementById("empHireDate").value;

    if (!id || !email || !position || !dept || !hireDate) {
        return alert("Please fill in all fields.");
    }

    // Check if email matches an existing account
    const accountExists = window.db.accounts.find(a => a.email === email);
    if (!accountExists) {
        return alert("User email must match an existing account.");
    }

    if (!window.db.employees) window.db.employees = [];

    const index = document.getElementById("empIndex").value;
    const empData = { id, email, position, dept, hireDate };

    if (index !== "") {
        window.db.employees[index] = empData;
    } else {
        window.db.employees.push(empData);
    }

    saveToStorage();
    hideEmployeeForm();
    renderEmployees();
}

function editEmployee(i) {
    showEmployeeForm(i);
}

function deleteEmployee(i) {
    if (confirm("Are you sure you want to delete this employee?")) {
        window.db.employees.splice(i, 1);
        saveToStorage();
        renderEmployees();
    }
}
/* ================= DEPARTMENTS ================= */
function renderDepartments() {
    if (!window.db.departments) window.db.departments = [];
    const tbody = document.getElementById("departmentsList");

    if (window.db.departments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No departments.</td></tr>`;
        return;
    }

    tbody.innerHTML = window.db.departments.map((d, i) => `
        <tr>
            <td>${d.name}</td>
            <td>${d.description || "—"}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="editDepartment(${i})">Edit</button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteDepartment(${i})">Delete</button>
            </td>
        </tr>`).join("");
}

function showDepartmentForm(i = null) {
    document.getElementById("departmentForm").style.display = "block";

    if (i !== null) {
        const dept = window.db.departments[i];
        document.getElementById("deptIndex").value = i;
        document.getElementById("deptName").value = dept.name;
        document.getElementById("deptDescription").value = dept.description || "";
    } else {
        document.getElementById("deptIndex").value = "";
        document.getElementById("deptName").value = "";
        document.getElementById("deptDescription").value = "";
    }
}

function hideDepartmentForm() {
    document.getElementById("departmentForm").style.display = "none";
}

function saveDepartment() {
    const name = document.getElementById("deptName").value.trim();
    const description = document.getElementById("deptDescription").value.trim();

    if (!name) return alert("Department name is required.");

    if (!window.db.departments) window.db.departments = [];

    const index = document.getElementById("deptIndex").value;
    const deptData = { name, description };

    if (index !== "") {
        window.db.departments[parseInt(index)] = deptData;
    } else {
        window.db.departments.push(deptData);
    }

    saveToStorage();
    hideDepartmentForm();
    renderDepartments();
}

function editDepartment(i) {
    showDepartmentForm(i);
}

function deleteDepartment(i) {
    if (confirm("Are you sure you want to delete this department?")) {
        window.db.departments.splice(i, 1);
        saveToStorage();
        renderDepartments();
    }
}