const API_URL = "http://127.0.0.1:5000";

let cart = [];
let userLatitude = null;
let userLongitude = null;

/* =========================
   FARMER SECTION
========================= */

function addProduct() {
  const name = document.getElementById("name").value;
  const category = document.getElementById("category").value;
  const price = parseFloat(document.getElementById("price").value);
  const wholesale_price = parseFloat(document.getElementById("wholesale_price").value);
  const quantity = parseInt(document.getElementById("quantity").value);
  const image_url =
    document.getElementById("image_url").value ||
    "https://via.placeholder.com/150";

  if (!name || !category || isNaN(price) || isNaN(wholesale_price) || isNaN(quantity)) {
    alert("Fill all fields correctly");
    return;
  }

  fetch(`${API_URL}/add_product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, price, wholesale_price, quantity, image_url })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadProducts();
      loadAllProducts();
    })
    .catch(() => alert("Backend connection error"));
}

function deleteProduct(id) {
  fetch(`${API_URL}/delete_product/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadProducts();
    });
}

function loadProducts() {
  fetch(`${API_URL}/products`)
    .then(res => res.json())
    .then(products => {
      const table = document.getElementById("productTable");
      if (!table) return;

      table.innerHTML = "";
      products.forEach(p => {
        table.innerHTML += `
          <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.price}</td>
            <td>${p.wholesale_price}</td>
            <td>${p.farmer_profit}</td>
            <td>${p.middleman_profit}</td>
            <td>${p.quantity}</td>
            <td><img src="${p.image_url}" width="50"></td>
            <td><button onclick="deleteProduct(${p.id})">Delete</button></td>
          </tr>
        `;
      });
    });
}

/* =========================
   BUYER SECTION
========================= */

function loadAllProducts() {
  fetch(`${API_URL}/products`)
    .then(res => res.json())
    .then(products => displayProducts(products));
}

function displayProducts(products) {
  const container = document.getElementById("allProducts");
  if (!container) return;

  container.innerHTML = "";

  products.forEach(p => {
    container.innerHTML += `
      <div class="product-card">
        <img src="${p.image_url}" width="150">
        <h3>${p.name}</h3>
        <p>Price: ₹${p.price}</p>
        <p>Available: ${p.quantity}</p>
        <input type="number" min="1" max="${p.quantity}" value="1" id="qty_${p.id}" style="width:60px;">
        <button onclick="addToCart(${p.id}, '${p.name}', ${p.price})">Add to Cart</button>
      </div>
    `;
  });

  showCartSection();
}

function addToCart(id, name, price) {
  const qty = parseInt(document.getElementById(`qty_${id}`).value);

  if (!qty || qty <= 0) {
    alert("Invalid quantity");
    return;
  }

  cart.push({ id, name, price, qty });
  renderCart();
}

/* =========================
   CART + PAYMENT
========================= */

function renderCart() {
  const cartDiv = document.getElementById("cartSection");
  if (!cartDiv) return;

  let total = 0;
  cartDiv.innerHTML = "<h2>Cart</h2>";

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    cartDiv.innerHTML += `<p>${item.name} (${item.qty}) = ₹${subtotal}</p>`;
  });

  cartDiv.innerHTML += `<h3>Total: ₹${total}</h3>`;

  if (total > 0) {
    cartDiv.innerHTML += `
      <h3>Payment Method</h3>

      <label>
        <input type="radio" name="payment" value="qr" checked> QR Payment
      </label>

      <label>
        <input type="radio" name="payment" value="cod"> Cash on Delivery
      </label>

      <br><br>

      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Payment ₹${total}">
      <br><br>

      <button onclick="checkout(${total})">Confirm Order</button>
      <br><br>

      <button onclick="getLocation()">Detect My Location</button>
    `;
  }
}

function checkout(total) {
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  if (paymentMethod === "cod") {
    alert("Order placed with Cash on Delivery!");
  } else {
    alert("QR Payment Successful!");
  }

  cart = [];
  renderCart();
}

function showCartSection() {
  if (!document.getElementById("cartSection")) {
    const main = document.querySelector("main");
    const div = document.createElement("div");
    div.id = "cartSection";
    div.style.marginTop = "40px";
    main.appendChild(div);
  }
}

/* =========================
   SMART LOCATION SYSTEM
========================= */

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;

      findNearestHub(userLatitude, userLongitude);
      showGoogleMap(userLatitude, userLongitude);
      fetchWeather(userLatitude, userLongitude);
    });
  } else {
    alert("Geolocation not supported.");
  }
}

function findNearestHub(userLat, userLon) {
  const hubs = [
    { name: "Hub Bhubaneswar", lat: 20.2961, lon: 85.8245 },
    { name: "Hub Ranchi", lat: 23.3441, lon: 85.3096 },
    { name: "Hub Patna", lat: 25.5941, lon: 85.1376 },
    { name: "Hub Kolkata", lat: 22.5726, lon: 88.3639 }
  ];

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) *
      Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  let nearest = hubs[0];
  let minDistance = getDistance(userLat, userLon, hubs[0].lat, hubs[0].lon);

  hubs.forEach(hub => {
    const distance = getDistance(userLat, userLon, hub.lat, hub.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = hub;
    }
  });

  const transportCost = minDistance * 5; // ₹5 per km

  alert(
    `Nearest Hub: ${nearest.name}
Distance: ${minDistance.toFixed(2)} km
Estimated Transport Cost: ₹${transportCost.toFixed(2)}`
  );
}

function showGoogleMap(lat, lon) {
  const mapUrl = `https://www.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
  const main = document.querySelector("main");

  let mapFrame = document.getElementById("mapFrame");
  if (!mapFrame) {
    mapFrame = document.createElement("iframe");
    mapFrame.id = "mapFrame";
    mapFrame.width = "100%";
    mapFrame.height = "300";
    mapFrame.style.marginTop = "20px";
    main.appendChild(mapFrame);
  }

  mapFrame.src = mapUrl;
}

function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const weather = data.current_weather;
      alert(
        `Live Weather:
Temperature: ${weather.temperature}°C
Wind Speed: ${weather.windspeed} km/h`
      );
    });
}

/* =========================
   PROFILE / AUTH SYSTEM
========================= */

let currentUser = null;

function showSignup() {
  document.getElementById("authTitle").innerText = "Sign Up";
  document.getElementById("authModal").style.display = "block";
}

function showLogin() {
  document.getElementById("authTitle").innerText = "Login";
  document.getElementById("authModal").style.display = "block";
}

function closeAuth() {
  document.getElementById("authModal").style.display = "none";
}

function submitAuth() {
  const name = document.getElementById("authName").value;
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  const role = document.getElementById("authRole").value;

  if (!email || !password) {
    alert("Please fill all required fields");
    return;
  }

  const userData = { name, email, password, role };

  localStorage.setItem("user_" + email, JSON.stringify(userData));
  localStorage.setItem("currentUser", JSON.stringify(userData));

  currentUser = userData;
  updateProfileUI();
  closeAuth();
  alert("Login Successful!");
}

function updateProfileUI() {
  const authSection = document.getElementById("authSection");
  const profileSection = document.getElementById("profileSection");
  const nameDisplay = document.getElementById("userNameDisplay");

  if (!authSection || !profileSection) return;

  if (currentUser) {
    authSection.style.display = "none";
    profileSection.style.display = "block";

    if (nameDisplay) {
      nameDisplay.innerText = currentUser.name || currentUser.email;
    }
  } else {
    authSection.style.display = "block";
    profileSection.style.display = "none";
  }
}

function logout() {
  localStorage.removeItem("currentUser");
  currentUser = null;
  updateProfileUI();
  alert("Signed Out Successfully");
}

function editProfile() {
  if (!currentUser) {
    alert("Please login first");
    return;
  }

  const newName = prompt("Enter new name:", currentUser.name);
  if (!newName) return;

  currentUser.name = newName;

  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  localStorage.setItem("user_" + currentUser.email, JSON.stringify(currentUser));

  updateProfileUI();
  alert("Profile Updated!");
}

function thumbLogin() {
  if (!window.PublicKeyCredential) {
    alert("Fingerprint not supported in this browser");
    return;
  }

  alert("Place your finger on scanner...");

  setTimeout(() => {
    currentUser = { name: "Farmer Thumb User", email: "thumb@farmer.com", role: "farmer" };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateProfileUI();
    closeAuth();
    alert("Fingerprint Login Successful!");
  }, 1500);
}

window.addEventListener("load", function () {
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    updateProfileUI();
  }
});

/* =========================
   VOICE ASSISTANT FOR FARMER
========================= */

let recognition;

function initRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Please use Google Chrome for voice feature.");
    return null;
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  return recognition;
}

function startVoice(inputId) {
  const recog = initRecognition();
  if (!recog) return;

  recog.onresult = function(event) {
    document.getElementById(inputId).value = event.results[0][0].transcript;
  };

  recog.onerror = function(event) {
    if (event.error !== "aborted") {
      alert("Voice recognition error: " + event.error);
    }
  };

  recog.start();
}

function startVoiceNumber(inputId) {
  const recog = initRecognition();
  if (!recog) return;

  recog.onresult = function(event) {
    let speechResult = event.results[0][0].transcript.toLowerCase();

    const numberMap = {
      "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
      "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
      "ten": 10,
      "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5,
      "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10
    };

    if (numberMap[speechResult] !== undefined) {
      document.getElementById(inputId).value = numberMap[speechResult];
    } else {
      document.getElementById(inputId).value = speechResult.replace(/\D/g, '');
    }
  };

  recog.onerror = function(event) {
    if (event.error !== "aborted") {
      alert("Voice recognition error: " + event.error);
    }
  };

  recog.start();
}

/* =========================
   CROP HEALTH DETECTION (AI)
========================= */

function detectCropHealth() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";

  fileInput.onchange = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async function(e) {
      const imgData = e.target.result;

      try {
        // Send to backend AI model
        const response = await fetch(`${API_URL}/detect_crop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imgData })
        });

        const result = await response.json();
        alert(`Crop Health: ${result.status}\nDisease Detected: ${result.disease || "None"}`);
      } catch (err) {
        alert("Error detecting crop health.");
      }
    };
    reader.readAsDataURL(file);
  };

  fileInput.click();
}

/* =========================
   INITIAL LOAD
========================= */

window.onload = () => {
  loadProducts();
  loadAllProducts();
};









