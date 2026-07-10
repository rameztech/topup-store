const API_BASE_URL = "";

let currentSelectedService = null;
let userToken = localStorage.getItem("user_token") || null;
let allServices = [];
let allCategories = [];
let currentCategory = "all";

document.addEventListener("DOMContentLoaded", () => {
    fetchCategoriesAndServices();
    updateAuthNavbar();

    document.getElementById("confirmOrderBtn").addEventListener("click", handleOrder);
});

// Helpers
function getCategoryIcon(categoryName) {
    const name = (categoryName || "").toLowerCase();
    if (name.includes("game") || name.includes("ألعاب") || name.includes("ببجي") || name.includes("pubg")) return "🎮";
    if (name.includes("social") || name.includes("سوشيال") || name.includes("media")) return "📱";
    if (name.includes("music") || name.includes("موسيقى")) return "🎵";
    if (name.includes("video") || name.includes("فيديو")) return "🎬";
    if (name.includes("gift") || name.includes("بطاقة")) return "🎁";
    return "✨";
}

function formatMoney(value) {
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toFixed(2);
}

function getImageUrl(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl.startsWith("/")) return `${API_BASE_URL}${imageUrl}`;
    return `${API_BASE_URL}/${imageUrl}`;
}

// Fetch categories and services
async function fetchCategoriesAndServices() {
    try {
        const [catRes, svcRes] = await Promise.all([
            fetch(`${API_BASE_URL}/categories`),
            fetch(`${API_BASE_URL}/services?active_only=true`),
        ]);

        if (!catRes.ok || !svcRes.ok) throw new Error("فشل في جلب البيانات");

        allCategories = await catRes.json();
        allServices = await svcRes.json();

        renderCategoryTabs();
        renderServices();
    } catch (error) {
        document.getElementById("servicesGrid").innerHTML = `<p style="color: #ef4444;">عذراً، تعذر الاتصال بالسيرفر. تأكد من تشغيل سيرفر البايثون.</p>`;
    }
}

function renderCategoryTabs() {
    const tabsContainer = document.getElementById("categoryTabs");
    tabsContainer.innerHTML = `<button class="category-tab active" data-category="all">الكل</button>`;

    allCategories.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "category-tab";
        btn.dataset.category = cat.name;
        btn.textContent = cat.name;
        btn.onclick = () => setCategory(cat.name);
        tabsContainer.appendChild(btn);
    });

    Array.from(tabsContainer.children).forEach(btn => {
        btn.onclick = () => setCategory(btn.dataset.category);
    });
}

function setCategory(category) {
    currentCategory = category;
    document.querySelectorAll(".category-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.category === category);
    });
    renderServices();
}

function renderServices() {
    const grid = document.getElementById("servicesGrid");
    grid.innerHTML = "";

    const services = currentCategory === "all"
        ? allServices
        : allServices.filter(s => (s.category_name || "General") === currentCategory);

    if (services.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted);">لا توجد خدمات نشطة في هذه الفئة.</p>`;
        return;
    }

    services.forEach(service => {
        const icon = getCategoryIcon(service.category_name);
        const imageUrl = getImageUrl(service.image_url);
        const banner = imageUrl
            ? `<img src="${imageUrl}" alt="${service.name}" class="card-banner-img" loading="lazy">`
            : `<div class="card-banner-icon">${icon}</div>`;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-banner">${banner}</div>
            <div class="card-body">
                <div class="card-category">${service.category_name || "عام"}</div>
                <h4 class="card-title">${service.name}</h4>
                <p class="card-desc">شحن فوري ومؤمن تلقائياً عبر معرف اللاعب الخاص بك.</p>
                <div class="card-footer">
                    <span class="price">$${formatMoney(service.price)}</span>
                    <button class="btn btn-primary" onclick="initiatePurchase(${service.id}, '${service.name.replace(/'/g, "\\'")}', '${service.price}')">شراء الآن</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Modals
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

function initiatePurchase(serviceId, serviceName, price) {
    if (!userToken) {
        alert("يرجى تسجيل الدخول أولاً لتتمكن من الشحن من رصيد محفظتك.");
        openModal("loginModal");
        return;
    }

    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;

    currentSelectedService = service;
    document.getElementById("orderModalTitle").innerText = `شحن: ${service.name}`;
    document.getElementById("orderQuantity").value = 1;
    document.getElementById("targetPlayerId").value = "";
    updateOrderTotal();
    openModal("orderModal");
}

function updateOrderTotal() {
    if (!currentSelectedService) return;
    const quantity = Math.max(1, parseInt(document.getElementById("orderQuantity").value) || 1);
    const unitPrice = Number(currentSelectedService.price) || 0;
    const total = unitPrice * quantity;
    document.getElementById("orderTotal").innerText = `المجموع: $${total.toFixed(2)} (${quantity} × $${unitPrice.toFixed(2)})`;
}

// Auth
async function handleLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    const formData = new FormData();
    formData.append("username", user);
    formData.append("password", pass);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error();
        const data = await response.json();

        localStorage.setItem("user_token", data.access_token);
        userToken = data.access_token;

        closeModal("loginModal");
        alert("تم الولوج بنجاح!");
        updateAuthNavbar();
    } catch (error) {
        alert("فشل تسجيل الدخول، تأكد من اسم المستخدم أو كلمة المرور.");
    }
}

async function handleRegister() {
    const username = document.getElementById("registerUser").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPass").value;

    if (!username || !email || !password) {
        alert("يرجى ملء جميع الحقول.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "فشل التسجيل");
        }

        alert("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.");
        closeModal("registerModal");
        openModal("loginModal");
    } catch (error) {
        alert(error.message || "فشل التسجيل.");
    }
}

async function updateAuthNavbar() {
    const authSection = document.getElementById("navAuthSection");
    if (!userToken) {
        authSection.innerHTML = `
            <button class="btn btn-outline" onclick="openModal('loginModal')">تسجيل الدخول</button>
            <button class="btn btn-primary" onclick="openModal('registerModal')">إنشاء حساب</button>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${userToken}` }
        });
        if (!response.ok) throw new Error();
        const user = await response.json();

        authSection.innerHTML = `
            <div style="text-align: left;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">المحفظة الرقمية</div>
                <div style="color: var(--success); font-weight: bold; font-size: 1.1rem;">$${formatMoney(user.balance)}</div>
            </div>
            <button class="btn btn-outline" style="padding: 0.4rem 1rem; font-size: 0.8rem;" onclick="handleLogout()">خروج</button>
        `;
    } catch (error) {
        handleLogout();
    }
}

function handleLogout() {
    localStorage.removeItem("user_token");
    userToken = null;
    updateAuthNavbar();
}

// Order
async function handleOrder() {
    const playerId = document.getElementById("targetPlayerId").value.trim();
    const quantity = Math.max(1, parseInt(document.getElementById("orderQuantity").value) || 1);

    if (!playerId) {
        alert("الرجاء إدخال معرف اللاعب أولاً.");
        return;
    }

    if (!currentSelectedService) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({
                service_id: currentSelectedService.id,
                target_player_id: playerId,
                quantity: quantity,
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "فشل إتمام عملية الشحن.");
        }

        alert(`تم قبول طلب الشحن بنجاح! رقم الطلب: ${result.id}`);
        closeModal("orderModal");
        document.getElementById("targetPlayerId").value = "";
        updateAuthNavbar();
    } catch (error) {
        alert(error.message);
    }
}
