const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let currentPage = 'search';
let currentRideId = null; // Track selected ride ID

// Функція для оновлення стилів на основі теми (unchanged)
function updateTheme() {
    const themeParams = webApp.themeParams || {};
    const isDark = webApp.colorScheme === 'dark';

    const root = document.documentElement;
    root.style.setProperty('--bg-color', themeParams.bg_color || (isDark ? '#1f2a2d' : '#f5f5f5'));
    root.style.setProperty('--text-color', themeParams.text_color || (isDark ? '#e0e0e0' : '#222'));
    root.style.setProperty('--border-color', themeParams.border_color || (isDark ? '#555' : '#ccc'));
    root.style.setProperty('--input-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : 'white'));
    root.style.setProperty('--button-bg-color', themeParams.button_color || (isDark ? '#2ecc71' : '#27ae60'));
    root.style.setProperty('--button-text-color', themeParams.button_text_color || 'white');
    root.style.setProperty('--button-hover-bg-color', themeParams.button_color || (isDark ? '#27ae60' : '#219653'));
    root.style.setProperty('--hover-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#f0f0f0'));
    root.style.setProperty('--modal-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#eee'));
    root.style.setProperty('--ride-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : 'white'));
    root.style.setProperty('--nav-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#fff'));
    root.style.setProperty('--cancel-button-bg-color', themeParams.destructive_text_color || (isDark ? '#e74c3c' : '#e74c3c'));
    root.style.setProperty('--cancel-button-hover-bg-color', themeParams.destructive_text_color || (isDark ? '#c0392b' : '#c0392b'));
    root.style.setProperty('--status-approved-color', isDark ? '#2ecc71' : '#27ae60');
    root.style.setProperty('--status-pending-color', isDark ? '#f1c40f' : '#f39c12');
    root.style.setProperty('--status-cancelled-color', isDark ? '#e74c3c' : '#e74c3c');
    root.style.setProperty('--contact-button-bg-color', themeParams.link_color || (isDark ? '#3498db' : '#2980b9'));
    root.style.setProperty('--contact-button-hover-bg-color', themeParams.link_color || (isDark ? '#2980b9' : '#2471a3'));

    webApp.setHeaderColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#ffffff'), 'bg_color');
    webApp.setBackgroundColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#f5f5f5'));
}

document.addEventListener('DOMContentLoaded', () => {
    webApp.ready();
    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    try {
        flatpickr("#date", {
            dateFormat: "d-m-Y",
            minDate: "today",
            locale: "uk",
            onReady: () => {
                const dateInput = document.getElementById('date');
                dateInput.placeholder = "Дата (ДД-ММ-РРРР)";
                if (webApp.requestFullscreen && window.innerWidth <= 600) {
                    webApp.requestFullscreen().catch(() => {});
                }
            }
        });
    } catch (err) {}

    flatpickr("#create-date", {
        dateFormat: "d-m-Y",
        minDate: "today",
        locale: "uk"
    });

    flatpickr("#create-time", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        locale: "uk"
    });

    setupSuggestions('departure', 'departure-suggestions');
    setupSuggestions('arrival', 'arrival-suggestions');
    setupSuggestions('create-departure', 'create-departure-suggestions');
    setupSuggestions('create-arrival', 'create-arrival-suggestions');

    Telegram.WebApp.BackButton.hide();

    function updateSwapButtonVisibility() {
        const departure = document.getElementById('departure').value.trim();
        const arrival = document.getElementById('arrival').value.trim();
        const swapButton = document.querySelector('.swap-button');
        swapButton.classList.toggle('visible', departure.length > 0 || arrival.length > 0);
    }

    ['departure', 'arrival'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSwapButtonVisibility);
    });

    updateSwapButtonVisibility();

    window.addEventListener('popstate', (event) => {
        const modal = document.getElementById('modal');
        if (isModalOpen) {
            closeModal();
        } else {
            navigate('search');
        }
    });

    window.history.replaceState({ page: 'search' }, document.title);

    // Initialize user only if not already initialized
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const isInitialized = localStorage.getItem(`userInitialized_${user.id}`);
        if (!isInitialized) {
            fetch('https://2326-194-44-220-198.ngrok-free.app/api/init-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    tgId: user.id,
                    firstName: user.first_name || 'Невідомий користувач',
                    photoUrl: user.photo_url || null
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error('Error initializing user:', data.error);
                } else {
                    localStorage.setItem(`userInitialized_${user.id}`, 'true');
                    console.log('User initialized successfully:', data.message);
                }
            })
            .catch(err => {
                console.error('Network error initializing user:', err);
            });
        }
    }

    // Set default page to 'search' on load
    currentPage = 'search';
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="navigate('search')"]`).classList.add('active');

    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('search-page').classList.add('active');

    loadProfile();

    if (currentPage === 'my-rides') {
        loadMyRides();
    }
});

function loadProfile() {
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        const profileRating = document.getElementById('profile-rating');

        profileName.textContent = user.first_name || 'Невідомий користувач';

        fetchRating(user.id).then(rating => {
            profileRating.textContent = `Рейтинг: ${rating || 'N/A'}`;
        });

        if (user.photo_url) {
            profilePhoto.src = user.photo_url;
        } else {
            profilePhoto.src = 'https://via.placeholder.com/100';
        }
    }
}

function fetchRating(tgId) {
    return fetch(`https://2326-194-44-220-198.ngrok-free.app/api/user-rating?tgId=${tgId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        return data.rating ? data.rating.toFixed(1) : null;
    })
    .catch(err => {
        console.error('Error fetching rating:', err);
        return null;
    });
}

async function fetchCities(query) {
    if (query.length < 2) return [];
    const response = await fetch(`https://2326-194-44-220-198.ngrok-free.app/api/cities?query=${encodeURIComponent(query)}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const uniqueCities = [];
    const seenNames = new Set();
    data.forEach(city => {
        if (!seenNames.has(city.name)) {
            seenNames.add(city.name);
            uniqueCities.push(city.name);
        }
    });
    return uniqueCities.map(name => ({ name }));
}

function setupSuggestions(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', async (e) => {
        const query = e.target.value;
        const cities = await fetchCities(query);
        suggestions.style.display = cities.length > 0 ? 'block' : 'none';
        suggestions.innerHTML = cities.map(city =>
            `<div class="suggestion-item" data-name="${city.name}">
                ${city.name}
            </div>`).join('');
    });

    suggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            input.value = item.dataset.name;
            suggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

function formatShortDate(dateStr) {
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[0]}.${parts[1]}` : dateStr;
}

function swapLocations() {
    const departure = document.getElementById('departure').value;
    const arrival = document.getElementById('arrival').value;
    document.getElementById('departure').value = arrival;
    document.getElementById('arrival').value = departure;
}

function searchRides() {
    const departure = document.getElementById('departure').value.trim();
    const arrival = document.getElementById('arrival').value.trim();
    const date = document.getElementById('date').value;
    const seats = parseInt(document.getElementById('seats').value);

    if (!departure || !arrival || !date || !seats) {
        alert('Будь ласка, заповніть усі поля.');
        return;
    }

    fetch('https://2326-194-44-220-198.ngrok-free.app/api/search-rides', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ departure, arrival, date, seats })
    })
    .then(res => res.json())
    .then(rides => {
        const rideResults = document.getElementById('ride-results');
        rideResults.innerHTML = '';

        if (!rides.length) {
            rideResults.innerHTML = '<p>Поїздок не знайдено.</p>';
            return;
        }

        rides.forEach(ride => {
            const dt = new Date(ride.departure_time);
            const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            const tile = document.createElement('div');
            tile.className = 'ride-tile';
            tile.onclick = () => openModal(ride);
            tile.innerHTML = `
                <div class="ride-time">${timeStr}</div>
                <div class="ride-time secondary">${ride.seats_available} хв</div>
                <div class="ride-route">${ride.departure} - ${ride.arrival}</div>
                <div class="ride-price">${ride.price}₴</div>
                <div class="ride-driver">
                    <div class="initial">${ride.driver_name.charAt(0)}</div>
                    <div class="name">${ride.driver_name}</div>
                    <div class="rating">★${ride.driver_rating.toFixed(1)}</div>
                </div>
            `;
            rideResults.appendChild(tile);
        });
    })
    .catch(err => {
        console.error('Error searching rides:', err);
        alert('Помилка при пошуку поїздок.');
    });
}

function openModal(ride) {
    currentRideId = ride.id;
    const dt = new Date(ride.departure_time);
    const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-departure-time').textContent = timeStr;
    document.getElementById('modal-departure').textContent = ride.departure;
    document.getElementById('modal-arrival').textContent = ride.arrival;
    document.getElementById('modal-seats-available').textContent = ride.seats_available;
    document.getElementById('modal-price').textContent = ride.price;
    document.getElementById('modal-driver-name').textContent = ride.driver_name;
    document.getElementById('modal-driver-rating').textContent = `★${ride.driver_rating.toFixed(1)}`;
    document.getElementById('modal').style.display = 'block';
    isModalOpen = true;
    Telegram.WebApp.BackButton.show();
    Telegram.WebApp.BackButton.onClick(closeModal);
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    isModalOpen = false;
    currentRideId = null;
    Telegram.WebApp.BackButton.hide();
    Telegram.WebApp.BackButton.offClick(closeModal);
}

function bookRideFromModal() {
    if (!currentRideId) return alert('No ride selected');
    const user = webApp.initDataUnsafe.user;
    if (!user || !user.id) return alert('Не вдалося отримати ваш Telegram ID!');
    bookRide(currentRideId, 1); // Default to 1 seat
}

async function bookRide(rideId, seats) {
    const user = webApp.initDataUnsafe.user;
    if (!user || !user.id) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch('https://2326-194-44-220-198.ngrok-free.app/api/book-ride', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                rideId,
                tgId: user.id,
                firstName: user.first_name || 'Невідомий користувач',
                photoUrl: user.photo_url || null,
                seats
            })
        });
        if (!res.ok) throw new Error('Помилка бронювання');
        const result = await res.json();
        alert(`Бронювання створено! Номер: ${result.bookingId}`);
        closeModal();
        if (currentPage === 'my-rides') loadMyRides();
    } catch (err) {
        alert('Помилка при бронюванні: ' + err.message);
    }
}

async function cancelRide(bookingId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch('https://2326-194-44-220-198.ngrok-free.app/api/cancel-ride', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ bookingId, tgId })
        });
        if (!res.ok) throw new Error('Помилка скасування бронювання');
        const result = await res.json();
        alert(`Бронювання ${bookingId} скасовано!`);
        loadMyRides();
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

async function contactDriver(driverTelegramId, bookingId) {
    const userTgId = webApp.initDataUnsafe.user?.id;
    if (!userTgId) {
        alert('Не вдалося отримати ваш Telegram ID!');
        return;
    }
    if (!driverTelegramId || !/^\d+$/.test(driverTelegramId)) {
        alert('Не вдалося відкрити чат: водій не вказав дійсний Telegram ID');
        return;
    }
    if (driverTelegramId === String(userTgId)) {
        alert('Ви не можете відкрити чат із собою!');
        return;
    }
    try {
        await fetch('https://2326-194-44-220-198.ngrok-free.app/api/log-contact-attempt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userTgId, bookingId, driverTelegramId })
        });
        webApp.openTelegramLink(`https://t.me/pdsdk_bot?start=contact_${driverTelegramId}_${bookingId}`);
    } catch (err) {
        alert(`Не вдалося відкрити чат з водієм: ${err.message}. Спробуйте ще раз або зв’яжіться з підтримкою.`);
    }
}

function getStatusText(status) {
    switch (status) {
        case 'approved':
            return 'Підтверджено';
        case 'pending':
            return 'Очікує';
        case 'cancelled':
            return 'Скасовано';
        default:
            return 'Невідомо';
    }
}

async function loadMyRides() {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Не вдалося отримати ваш Telegram ID!</div>';
        return;
    }

    try {
        const res = await fetch(`https://2326-194-44-220-198.ngrok-free.app/api/my-rides?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) throw new Error('Не вдалося отримати ваші поїздки');

        const rides = await res.json();

        const bookings = rides.filter(r => r.role === 'passenger');
        const driverRides = rides.filter(r => r.role === 'driver');

        document.getElementById('my-rides-results').innerHTML = bookings.length === 0
            ? '<div class="no-rides">У вас немає заброньованих поїздок.</div>'
            : renderRides(bookings, true);

        document.getElementById('my-driver-results').innerHTML = driverRides.length === 0
            ? '<div class="no-rides">У вас немає створених поїздок.</div>'
            : renderRides(driverRides, false);

    } catch (err) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Помилка при завантаженні поїздок: ' + err.message + '</div>';
    }
}

function renderRides(rides, isBooking) {
    return rides.map(ride => {
        const dt = new Date(ride.departure_time);
        const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
        const statusText = getStatusText(ride.status || '');
        const statusClass = ride.status ? `status-${ride.status}` : '';
        return `
            <div class="ride-item">
                <div class="ride-top">
                    <div class="ride-route">
                        <p class="route">${ride.departure} → ${ride.arrival}</p>
                        <p>${timeStr}, ${dateStr}</p>
                        <p>Місць: ${isBooking ? ride.seats_booked : ride.seats_available}/${ride.seats_total}</p>
                        ${ride.status ? `<p class="status ${statusClass}">Статус: ${statusText}</p>` : ''}
                        ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                        ${isBooking ? `
                            <p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>
                            <p>Номер бронювання: ${ride.booking_id}</p>` : ''}
                    </div>
                    <div class="price-tag">${ride.price} ₴</div>
                </div>
                ${isBooking && ride.status !== 'cancelled' ? `
                    <div class="ride-actions">
                        <button class="cancel-button" onclick="cancelRide(${ride.booking_id})">Скасувати</button>
                        ${ride.driver_telegram_id ? `<button class="contact-button" onclick="contactDriver('${ride.driver_telegram_id}', ${ride.booking_id})">Зв’язатися з водієм</button>` : ''}
                    </div>` : ''}
            </div>`;
    }).join('');
}

function navigate(page) {
    if (isModalOpen) {
        closeModal();
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="navigate('${page}')"]`).classList.add('active');

    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}

setupSuggestions('create-departure', 'create-departure-suggestions');
setupSuggestions('create-arrival', 'create-arrival-suggestions');

function submitCreateRide() {
    const user = webApp.initDataUnsafe.user;
    if (!user || !user.id) {
        alert("Не вдалося отримати ваш Telegram ID!");
        return;
    }

    const data = {
        tgId: user.id,
        firstName: user.first_name || "Невідомий користувач",
        photoUrl: user.photo_url || null,
        departure: document.getElementById("create-departure").value.trim(),
        arrival: document.getElementById("create-arrival").value.trim(),
        date: document.getElementById("create-date").value,
        time: document.getElementById("create-time").value,
        description: document.getElementById("create-description").value.trim(),
        seats: parseInt(document.getElementById("create-seats").value),
        price: parseFloat(document.getElementById("create-price").value)
    };

    if (!data.departure || !data.arrival || !data.date || !data.time || !data.seats || !data.price) {
        alert("Будь ласка, заповніть усі обов'язкові поля.");
        return;
    }

    fetch("https://2326-194-44-220-198.ngrok-free.app/api/create-ride", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.error) {
            alert("Помилка: " + response.error);
        } else {
            alert("Поїздка створена успішно!");
            navigate("search");
        }
    })
    .catch(err => {
        alert("Помилка при з'єднанні з сервером.");
        console.error(err);
    });
}

function switchRidesTab(tab) {
    const bookingsTab = document.getElementById('tab-bookings');
    const driverTab = document.getElementById('tab-driver');
    const bookingsContent = document.getElementById('my-rides-results');
    const driverContent = document.getElementById('my-driver-results');

    if (tab === 'bookings') {
        bookingsTab.classList.add('active');
        driverTab.classList.remove('active');
        bookingsContent.classList.add('active');
        driverContent.classList.remove('active');
    } else {
        bookingsTab.classList.remove('active');
        driverTab.classList.add('active');
        bookingsContent.classList.remove('active');
        driverContent.classList.add('active');
    }
}