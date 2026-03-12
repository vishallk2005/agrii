// ================= API CONFIG =================
const API_URL = 'http://localhost:3000/api';

// ================= RAZORPAY CONFIG =================
const RAZORPAY_KEY_ID = 'rzp_test_YourKeyHere'; // Replace with your actual Razorpay test key

// ================= UPI CONFIGURATION =================
const UPI_CONFIG = {
  // Your personal/business UPI ID
  upi_id: 'your-upi-id@paytm', // Replace with your actual UPI ID
  
  // Business details for payment
  merchant_name: 'AgriDirect',
  merchant_description: 'Agricultural Products Marketplace',
  
  // Contact information
  support_email: 'support@agridirect.com',
  support_phone: '+919876543210', // Replace with your actual phone
};

// ================= RAZORPAY PAYMENT =================
async function initiateRazorpayPayment(amount, orderData) {
  try {
    // Create order on backend
    const orderResponse = await fetch(`${API_URL}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount * 100, currency: 'INR' })
    });
    
    const order = await orderResponse.json();
    
    if (!order.id) {
      throw new Error('Failed to create payment order');
    }

    // Razorpay options
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: UPI_CONFIG.merchant_name,
      description: UPI_CONFIG.merchant_description,
      order_id: order.id,
      handler: function (response) {
        // Payment successful
        handlePaymentSuccess(response, orderData);
      },
      prefill: {
        name: orderData.username || 'Customer',
        email: orderData.email || UPI_CONFIG.support_email,
        contact: orderData.phone || UPI_CONFIG.support_phone
      },
      notes: {
        address: orderData.address || 'Default Address',
        order_type: 'agri_products',
        merchant_upi: UPI_CONFIG.upi_id,
        merchant_name: UPI_CONFIG.merchant_name
      },
      theme: {
        color: '#1a5f3f' // AgriDirect green theme
      },
      modal: {
        ondismiss: function() {
          console.log('Payment modal dismissed');
        },
        escape: true,
        handleback: true,
        confirm_close: true,
        animation: 'fade'
      },
      // UPI specific configuration
      config: {
        display: {
          blocks: {
            banks: {
              name: 'Pay via UPI',
              instruments: [
                {
                  method: 'upi',
                  flows: ['qr', 'intent', 'collect'],
                  apps: ['gpay', 'phonepe', 'paytm', 'upi']
                }
              ]
            }
          },
          sequence: ['block.banks'],
          preferences: {
            show_default_blocks: true
          }
        }
      }
    };

    // Open Razorpay checkout
    const rzp = new Razorpay(options);
    rzp.open();
    
  } catch (error) {
    console.error('Payment initiation failed:', error);
    alert('Payment failed. Please try again.');
  }
}

// Handle successful payment
async function handlePaymentSuccess(paymentResponse, orderData) {
  try {
    // Verify payment on backend
    const verifyResponse = await fetch(`${API_URL}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature
      })
    });
    
    const verification = await verifyResponse.json();
    
    if (verification.success) {
      // Save order with payment details
      orderData.payment_id = paymentResponse.razorpay_payment_id;
      orderData.payment_status = 'paid';
      orderData.payment_method = 'razorpay_upi';
      orderData.order_id = paymentResponse.razorpay_order_id;
      
      await saveOrderWithPayment(orderData);
      
      // Show success message
      showPaymentSuccess();
    } else {
      alert('Payment verification failed. Please contact support.');
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    alert('Payment verification failed. Please try again.');
  }
}

// Save order after successful payment
async function saveOrderWithPayment(orderData) {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Clear cart
      localStorage.removeItem("cart");
      updateCartUI();
      
      // Redirect to success page
      window.location.href = 'payment-success.html';
    } else {
      throw new Error('Failed to save order');
    }
  } catch (error) {
    console.error('Order save failed:', error);
    alert('Order could not be saved. Please contact support.');
  }
}

// Show payment success message
function showPaymentSuccess() {
  const successModal = document.createElement('div');
  successModal.className = 'payment-success-modal';
  successModal.innerHTML = `
    <div class="success-content">
      <h2>🎉 Payment Successful!</h2>
      <p>Your order has been placed successfully.</p>
      <p>You will receive a confirmation email shortly.</p>
      <button onclick="this.parentElement.parentElement.remove()">Continue Shopping</button>
    </div>
  `;
  document.body.appendChild(successModal);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (successModal.parentElement) {
      successModal.remove();
    }
  }, 5000);
}

// ================= ORDERS =================
async function saveOrder() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("⚠️ Please login to place order!");
    return;
  }

  if (cart.length === 0) {
    alert("⚠️ Cart is empty!");
    return;
  }

  const orderData = {
    username: user.username,
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const result = await response.json();

    if (result.success) {
      alert("✅ Order placed successfully!");
      localStorage.setItem("cart", JSON.stringify([]));
      updateCartUI();
      updateHomeCartCount();
      loadFarmerProducts(); // Refresh stock
    } else {
      alert("❌ Failed to place order: " + result.error);
    }
  } catch (error) {
    console.error("Error placing order:", error);
    alert("❌ Error placing order");
  }
}

// ================= CART HANDLING =================
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(name, price, image, farmerUsername, stockAvailable) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Find existing product from same farmer
  const existing = cart.find(item => item.name === name && item.farmer === farmerUsername);

  if (existing) {
    // Stock check
    if (existing.quantity + 1 > stockAvailable) {
      alert("⚠️ Not enough stock available!");
      return;
    }
    existing.quantity += 1;
  } else {
    // Stock check for new product
    if (stockAvailable <= 0) {
      alert("⚠️ This product is out of stock!");
      return;
    }

    cart.push({
      name,
      price,
      image,
      img: image,
      farmer: farmerUsername,
      quantity: 1
    });
  }

  // Save cart and update UI
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  updateHomeCartCount();
  showToast("✔ Item added to cart");
}


function increaseQuantity(index) {
  cart[index].quantity++;
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  updateHomeCartCount();
}

function decreaseQuantity(index) {
  if (cart[index].quantity > 1) cart[index].quantity--;
  else cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  updateHomeCartCount();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  updateHomeCartCount();
}

function updateCartUI() {
  const cartItems = document.getElementById("cartItems");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cartTotal");
  if (!cartItems) return;

  cartItems.innerHTML = "";
  let total = 0;
  let count = 0;

  cart.forEach((item, i) => {
    total += item.price * item.quantity;
    count += item.quantity;

    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-left">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>₹${item.price} per unit</p>
        </div>
      </div>
      <div class="cart-item-right">
        <div class="quantity-controls">
          <button onclick="decreaseQuantity(${i})" class="qty-btn">−</button>
          <span>${item.quantity}</span>
          <button onclick="increaseQuantity(${i})" class="qty-btn">+</button>
        </div>
        <button onclick="removeFromCart(${i})">Remove</button>
        <p class="item-total">₹${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    `;
    cartItems.appendChild(li);
  });

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="empty-cart">🛒 Your cart is empty</p>`;
  }

  cartCount.textContent = count;
  cartTotal.textContent = total.toFixed(2);
}

function checkoutCart() {
  if (!cart.length) {
    alert("Cart is empty");
    return;
  }
  
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("⚠️ Please login to place order!");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Prepare order data
  const orderData = {
    username: user.username,
    items: cart,
    total: total,
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || ''
  };

  // Initiate Razorpay payment
  initiateRazorpayPayment(total, orderData);
}

function toggleCart() {
  window.location.href = "cart.html";
}

function goHome() {
  document.getElementById("cartSidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHomeCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const icon = document.getElementById("cart-count");
  if (icon) icon.textContent = count;
}

// ================= LOGIN HANDLING =================
function resetLoginForm() {
  document.getElementById("loginForm").reset();
  ["mobile", "email", "password", "address"].forEach(id =>
    document.getElementById(id).style.display = "none"
  );
  document.getElementById("roleSpecificInputs").innerHTML = "";
}

function openLogin(role) {
  resetLoginForm();
  document.getElementById("loginTitle").textContent = `${role} Login`;
  document.getElementById("loginForm").setAttribute("data-role", role); // Keep case sensitive for display but handle logic carefully
  const modal = document.getElementById("loginModal");
  modal.style.display = "flex";
  modal.classList.add("show");

  if (role === "Admin") {
    document.getElementById("roleSpecificInputs").innerHTML = "🔑 Admin Access";
    document.getElementById("password").style.display = "block";
  }

  if (role === "Farmer") {
    document.getElementById("roleSpecificInputs").innerHTML = "🌾 Farmer Access";
    ["mobile", "email", "password", "address"].forEach(id => document.getElementById(id).style.display = "block");
  }

  if (role === "Customer") {
    document.getElementById("roleSpecificInputs").innerHTML = "🛍️ Customer Access";
    ["mobile", "email", "address"].forEach(id => document.getElementById(id).style.display = "block");
  }
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  modal.style.display = "none";
  modal.classList.remove("show");
  resetLoginForm();
}

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const role = this.getAttribute("data-role");
  const username = document.getElementById("username").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const address = document.getElementById("address").value.trim();

  // Try login first
  try {
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const loginData = await loginRes.json();

    if (loginRes.ok) {
      alert("Logged in successfully");
      localStorage.setItem("loggedInRole", role);
      localStorage.setItem("loggedInUser", JSON.stringify(loginData));
      if (role === 'Admin') window.location.href = "admin.html";
      else showAccountMenu();
      closeLoginModal();
      return;
    }

    // If login failed, try register (only for Farmer/Customer if not found)
    if (loginData.error === "User not found" && role !== 'Admin') {
      const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, mobile, email, address })
      });
      const regData = await regRes.json();

      if (regRes.ok) {
        alert("Registered and logged in");
        localStorage.setItem("loggedInRole", role);
        localStorage.setItem("loggedInUser", JSON.stringify({ username, role, mobile, email, address }));
        showAccountMenu();
        closeLoginModal();
      } else {
        alert("Registration failed: " + regData.error);
      }
    } else {
      alert("Login failed: " + loginData.error);
    }

  } catch (error) {
    console.error("Auth error:", error);
    alert("Authentication error");
  }
});

// ================= ACCOUNT =================
function showAccountMenu() {
  const role = localStorage.getItem("loggedInRole");
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const accountMenu = document.getElementById("accountMenu");
  if (!role || !user) accountMenu.style.display = "none";
  else accountMenu.style.display = "block";
}

function openProfile() {
  const role = (localStorage.getItem("loggedInRole") || "").toLowerCase();
  if (role === "admin") window.location.href = "admin.html";
  else if (role === "farmer") window.location.href = "farmer.html";
  else if (role === "customer") window.location.href = "customer-dashboard.html";
  else {
    localStorage.removeItem("loggedInRole");
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  }
}

function logout() {
  localStorage.removeItem("loggedInRole");
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

// ================= SEARCH =================
function saveRecentSearch(query) {
  let recent = JSON.parse(localStorage.getItem("recentSearches")) || [];
  if (query && !recent.includes(query)) {
    recent.unshift(query);
    if (recent.length > 5) recent.pop();
    localStorage.setItem("recentSearches", JSON.stringify(recent));
  }
}

function showSuggestions() {
  const input = document.getElementById("combinedSearchInput");
  const dropdown = document.getElementById("recentSearches");
  const query = input.value.toLowerCase();
  dropdown.innerHTML = "";

  const recent = JSON.parse(localStorage.getItem("recentSearches")) || [];
  const allProducts = ["Tomatoes", "Apples", "Roses", "Carrots", "Potatoes", "Bananas", "Mangoes", "Marigold", "Sunflowers"];
  const suggestions = allProducts.filter(p => p.toLowerCase().includes(query));

  if (query && suggestions.length) {
    dropdown.innerHTML = `<div class="dropdown-header">Suggestions</div>`;
    suggestions.forEach(s => {
      const item = document.createElement("div");
      item.className = "recent-item";
      item.textContent = s;
      item.onclick = () => selectSuggestion(s);
      dropdown.appendChild(item);
    });
  }

  if (recent.length) {
    const header = document.createElement("div");
    header.className = "dropdown-header";
    header.textContent = "Recent Searches";
    dropdown.appendChild(header);
    recent.forEach(r => {
      const item = document.createElement("div");
      item.className = "recent-item";
      item.textContent = r;
      item.onclick = () => selectSuggestion(r);
      dropdown.appendChild(item);
    });
  }

  dropdown.style.display = "block";
}

function selectSuggestion(value) {
  document.getElementById("combinedSearchInput").value = value;
  document.getElementById("recentSearches").style.display = "none";
  handleSearch(new Event("submit"));
}

function handleSearch(e) {
  e.preventDefault();
  const query = document.getElementById("combinedSearchInput").value.trim();
  if (!query) return;
  saveRecentSearch(query);
  localStorage.setItem("searchQuery", query);
  window.location.href = "search.html";
}

document.getElementById("combinedSearchInput").addEventListener("input", showSuggestions);
document.addEventListener("click", e => {
  const dropdown = document.getElementById("recentSearches");
  if (!dropdown.contains(e.target) && e.target.id !== "combinedSearchInput") dropdown.style.display = "none";
});

// ================= LOAD PRODUCTS =================
async function loadFarmerProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();

    // Clear existing static products if we have DB products
    // But for now, let's append or replace. The original HTML has static products.
    // If we want to be fully dynamic, we should clear the grid.
    // However, the user might want to keep the static ones for demo if DB is empty.
    // Let's clear it to show real data.
    // Do NOT clear grid to keep static products
    // if (products.length > 0) {
    //   grid.innerHTML = "";
    // }

    products.filter(p => p.approved === 1).forEach(p => {
      const category = (p.category || "other").toLowerCase();
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-category", category);

      const stockText = p.stock > 0 ? `${p.stock} available` : "Out of stock";
      const disabledBtn = p.stock > 0 ? "" : "disabled";

      card.innerHTML = `
          <img src="${p.image}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.description || ""}</p>
          <p>₹${p.price}</p>
          <p>${stockText}</p>
          <button ${disabledBtn} onclick="addToCart('${p.name}', ${p.price}, '${p.image}', '${p.farmer_username}', ${p.stock})">
            ${p.stock > 0 ? "Add to Cart" : "Out of Stock"}
          </button>
        `;

      grid.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading products:", error);
  }
}



// ================= CATEGORY FILTER =================
function filterProducts(category) {
  const buttons = document.querySelectorAll(".categories button");
  buttons.forEach(btn => btn.classList.remove("active"));
  const clicked = Array.from(buttons).find(b => b.textContent.toLowerCase().includes(category));
  if (clicked) clicked.classList.add("active");

  document.querySelectorAll(".card").forEach(card => {
    card.style.display = (category === "all" || card.getAttribute("data-category") === category) ? "block" : "none";
  });
}

// ================= TOAST =================
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ================= ON LOAD =================
window.onload = function () {
  updateCartUI();
  showAccountMenu();
  loadFarmerProducts(); // Disabled as per user request to keep only static products
  updateHomeCartCount();
};
document.addEventListener("DOMContentLoaded", updateHomeCartCount);

function toggleCategoryDropdown() {
  const list = document.getElementById("categoryList");
  list.style.display = list.style.display === "block" ? "none" : "block";
}

function selectCategory(category) {
  document.getElementById("categoryList").style.display = "none";
  filterProducts(category);
}

// ================= ANIMATION TRIGGERS =================
// Intersection Observer for scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      
      // Trigger product card animations
      if (entry.target.classList.contains('product-grid')) {
        const productCards = entry.target.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('visible');
          }, index * 100);
        });
      }
      
      // Trigger feature card animations
      if (entry.target.classList.contains('feature-cards')) {
        const featureCards = entry.target.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('visible');
          }, index * 150);
        });
      }
    }
  });
}, observerOptions);

// Observe elements for animations
document.addEventListener('DOMContentLoaded', () => {
  // Observe scroll-animate elements
  const animateElements = document.querySelectorAll('.scroll-animate, .product-grid, .feature-cards');
  animateElements.forEach(el => observer.observe(el));
  
  // Trigger initial animations
  setTimeout(() => {
    // Trigger product card animations on load
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('visible');
      }, 500 + index * 100);
    });
    
    // Trigger about section animations
    const aboutSection = document.querySelector('.about-section');
    if (aboutSection) {
      aboutSection.classList.add('animate-fade-in-up');
    }
    
    // Trigger feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('visible');
      }, 1000 + index * 150);
    });
  }, 100);
});

// Enhanced hover effects for interactive elements
document.addEventListener('DOMContentLoaded', () => {
  // Add hover animation to buttons
  const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-secondary');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.transition = 'all 0.3s ease';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });
  });
  
  // Add floating animation to cart icon
  const floatingCart = document.querySelector('.floating-cart');
  if (floatingCart) {
    floatingCart.addEventListener('mouseenter', () => {
      floatingCart.classList.add('animate-pulse');
    });
    
    floatingCart.addEventListener('mouseleave', () => {
      floatingCart.classList.remove('animate-pulse');
    });
  }
  
  // Add glow effect to search input on focus
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      searchInput.classList.add('animate-glow');
    });
    
    searchInput.addEventListener('blur', () => {
      searchInput.classList.remove('animate-glow');
    });
  }
});

// Smooth scroll for navigation links
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Loading animation for dynamic content
function showLoadingAnimation(element) {
  element.classList.add('loading-shimmer');
}

function hideLoadingAnimation(element) {
  element.classList.remove('loading-shimmer');
}

// Apply loading animation to product grid during fetch
const originalLoadFarmerProducts = window.loadFarmerProducts;
if (typeof originalLoadFarmerProducts === 'function') {
  window.loadFarmerProducts = function() {
    const productGrid = document.querySelector('.product-grid');
    if (productGrid) {
      showLoadingAnimation(productGrid);
    }
    
    originalLoadFarmerProducts().then(() => {
      if (productGrid) {
        hideLoadingAnimation(productGrid);
        
        // Re-trigger animations for new products
        const productCards = productGrid.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('visible');
          }, index * 100);
        });
      }
    });
  };
}

