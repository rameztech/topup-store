// قم بتغيير هذا الرابط إلى رابط سيرفر الـ FastAPI الحقيقي الخاص بك عندما ترفعه أونلاين
const API_BASE_URL = "http://127.0.0.1:8000"; 

let currentSelectedServiceId = null;
let userToken = localStorage.getItem("user_token") || null;

// تشغيل جلب الخدمات فور فتح الصفحة
document.addEventListener("DOMContentLoaded", () => {
    fetchServices();
    updateAuthNavbar();
});

// جلب الخدمات من السيرفر وعرضها بشكل بطاقات مستقبيلية
async function fetchServices() {
    const grid = document.getElementById("servicesGrid");
    try {
        const response = await fetch(`${API_BASE_URL}/services`);
        if (!response.ok) throw new Error("فشل في جلب البيانات");
        const services = await response.json();
        
        grid.innerHTML = ""; // مسح رسالة التحميل
        
        if(services.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted);">لا توجد خدمات نشطة حالياً في لوحة التحكم.</p>`;
            return;
        }

        services.forEach(service => {
            if (!service.is_active) return;
            
            // تحديد أيقونة تعبيرية مؤقتة بناءً على نوع الخدمة لتبدو ممتازة
            let icon = service.category === "Game" ? "🎮" : "✨";
            
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="card-banner">${icon}</div>
                <div class="card-body">
                    <h4 class="card-title">${service.name}</h4>
                    <p class="card-desc">شحن فوري ومؤمن تلقائياً عبر معرف اللاعب الخاص بك مباشرة.</p>
                    <div class="card-footer">
                        <span class="price">$${service.price.toFixed(2)}</span>
                        <button class="btn btn-primary" onclick="initiatePurchase(${service.id}, '${service.name}')">شراء الآن</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<p style="color: #ef4444;">عذراً، تعذر الاتصال بـ "عقل النظام" البرمجي. تأكد من تشغيل سيرفر البايثون.</p>`;
    }
}

// فتح النوافذ المنبثقة
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

// إغلاق النوافذ المنبثقة
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

// بدء عملية الشراء
function initiatePurchase(serviceId, serviceName) {
    if (!userToken) {
        alert("يرجى تسجيل الدخول أولاً لتتمكن من الشحن من رصيد محفظتك.");
        openModal("loginModal");
        return;
    }
    currentSelectedServiceId = serviceId;
    document.getElementById("orderModalTitle").innerText = `شحن: ${serviceName}`;
    openModal("orderModal");
}

// التعامل مع تسجيل الدخول وإحضار التوكن
async function handleLogin() {
    const user = document.getElementById("loginUser").value;
    const pass = document.getElementById("loginPass").value;

    const formData = new FormData();
    formData.append("username", user);
    formData.append("password", pass);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error();
        const data = await response.json();
        
        localStorage.setItem("user_token", data.access_token);
        userToken = data.access_token;
        
        closeModal("loginModal");
        alert("تم الولوج بنجاح لبوابتك الرقمية!");
        updateAuthNavbar();
    } catch (error) {
        alert("فشل تسجيل الدخول، تأكد من اسم المستخدم أو كلمة المرور.");
    }
}

// تحديث شريط الرأس لإظهار الرصيد أو زر الدخول
async function updateAuthNavbar() {
    const authSection = document.getElementById("navAuthSection");
    if (!userToken) {
        authSection.innerHTML = `<button class="btn btn-outline" onclick="openModal('loginModal')">تسجيل الدخول</button>`;
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
                <div style="color: var(--success); font-weight: bold; font-size: 1.1rem;">$${user.balance.toFixed(2)}</div>
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

// إرسال طلب الشحن الحقيقي والمؤمن للسيرفر
document.getElementById("confirmOrderBtn").addEventListener("click", async () => {
    const playerId = document.getElementById("targetPlayerId").value;
    if(!playerId) {
        alert("الرجاء إدخال معرف اللاعب أولاً.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({
                service_id: currentSelectedServiceId,
                target_player_id: playerId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "فشل إتمام عملية الشحن.");
        }

        alert(`تم قبول طلب الشحن الفوري بنجاح! رقم الطلب في السيرفر: ${result.api_order_id}`);
        closeModal("orderModal");
        document.getElementById("targetPlayerId").value = "";
        updateAuthNavbar(); // لتحديث الرصيد فوراً بعد الخصم
    } catch (error) {
        alert(error.message);
    }
});
