const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let currentPage = 'search';

// Функція для оновлення стилів на основі теми
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

    webApp.setHeaderColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#ffffff'), 'bg_color');
    webApp.setBackgroundColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#f5f5f5'));
}

document.addEventListener('DOMContentLoaded', () => {
    webApp.ready();
    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    try {
        const fp = flatpickr("#date", {
            dateFormat: "d-m-Y",
            minDate: "today",
            locale: "uk",
            onReady: () => {
                const dateInput = document.getElementById('date');
                dateInput.placeholder = "Дата (ДД-ММ-РРРР)";
                console.log('flatpickr ініціалізовано успішно');
                if (webApp.requestFullscreen && window.innerWidth <= 600) {
                    webApp.requestFullscreen()
                        .then(() => {
                            console.log('Повноекранний режим активовано');
                        })
                        .catch(err => {
                            console.warn('Повноекранний режим не підтримується:', err);
                        });
                }
            },
            onChange: (selectedDates, dateStr, instance) => {
                console.log('Дата змінена:', dateStr);
            },
            onOpen: () => {
                console.log('Календар відкрито');
            },
            onClose: () => {
                console.log('Календар закрито');
            }
        });
        if (!fp) {
            console.error('flatpickr не ініціалізовано');
        }
    } catch (err) {
        console.error('Помилка ініціалізації flatpickr:', err);
    }

    Telegram.WebApp.BackButton.hide();

    function updateSwapButtonVisibility() {
        const departure = document.getElementById('departure').value.trim();
        const arrival = document.getElementById('arrival').value.trim();
        const swapButton = document.querySelector('.swap-button');
        if (departure.length > 0 || arrival.length > 0) {
            swapButton.classList.add('visible');
        } else {
            swapButton.classList.remove('visible');
        }
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
            navigate('search'); // Повернення до сторінки пошуку за замовчуванням
        }
    });

    window.history.replaceState({ page: 'search' }, document.title);

    // Завантаження поїздок при першому відкритті сторінки "Мої поїздки"
    if (currentPage === 'my-rides') {
        loadMyRides();
    }
});

async function fetchCities(query) {
    if (query.length < 2) return [];
    const response = await fetch(`https://027f-194-44-220-198.ngrok-free.app/api/cities?query=${encodeURIComponent(query)}`, {
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
        suggestions.innerHTML = cities.map(city => `
            <div class="suggestion-item" data-name="${city.name}">
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

setupSuggestions('departure', 'departure-suggestions');
setupSuggestions('arrival', 'arrival-suggestions');

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

async function submitSearch() {
    const departure = document.getElementById('departure').value.trim();
    const arrival = document.getElementById('arrival').value.trim();
    const date = document.getElementById('date').value.trim();
    const seats = document.getElementById('seats').value.trim();

    if (!departure || !arrival || !date || !seats) return alert('Заповніть усі поля!');
    if (departure.length > 255 || arrival.length > 255) return alert('Назви місць мають бути до 255 символів!');

    try {
        const res = await fetch(`https://027f-194-44-220-198.ngrok-free.app/api/search-rides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ departure, arrival, date, seats })
        });
        if (!res.ok) throw new Error('Не вдалося отримати поїздки');
        const rides = await res.json();
        const modalResults = document.getElementById('modal-results');
        modalResults.innerHTML = rides.length === 0
            ? '<div class="no-rides">Поїздок не знайдено.</div>'
            : rides.map(ride => {
                const dt = new Date(ride.departure_time);
                const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                return `
                    <div class="ride-item">
                        <div class="ride-top">
                            <div class="ride-route">
                                <p class="route">${ride.departure} → ${ride.arrival}</p>
                                <p>${timeStr}, ${dateStr}</p>
                                <p>Місць: ${ride.seats_available}/${ride.seats_total}</p>
                                ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                                <p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>
                            </div>
                            <div class="price-tag">${ride.price} ₴</div>
                        </div>
                        <button class="book-button" onclick="bookRide(${ride.id}, ${seats})">Забронювати</button>
                    </div>`;
            }).join('');
        document.getElementById('modal-title').textContent = `${departure} → ${arrival}`;

        const modalTitleBox = document.querySelector('.modal-title-box');
        const oldSubtitle = modalTitleBox.querySelector('p');
        if (oldSubtitle) oldSubtitle.remove();

        const subtitle = document.createElement('p');
        subtitle.style.margin = '4px 0 0';
        subtitle.style.fontSize = '14px';
        subtitle.style.color = 'var(--text-color, #555)';

        const seatsNumber = parseInt(seats);
        const seatWord = seatsNumber === 1 ? 'пасажир' : (seatsNumber >= 2 && seatsNumber <= 4 ? 'пасажири' : 'пасажирів');

        subtitle.textContent = `${formatShortDate(date)}, ${seatsNumber} ${seatWord}`;
        modalTitleBox.appendChild(subtitle);
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        modal.classList.remove('closing');

        Telegram.WebApp.BackButton.show();
        Telegram.WebApp.BackButton.onClick(() => {
            closeModal();
        });

        isModalOpen = true;
        setTimeout(() => {
            window.history.pushState({ modalOpen: true }, '');
        }, 100);
    } catch (err) {
        console.error(err);
        alert('Помилка при пошуку поїздок: ' + err.message);
    }
}

async function bookRide(rideId, seats) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch(`https://027f-194-44-220-198.ngrok-free.app/api/book-ride`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ rideId, tgId, seats })
        });
        if (!res.ok) throw new Error('Помилка бронювання');
        const result = await res.json();
        alert(`Бронювання створено! Номер: ${result.bookingId}`);
        // Оновити список поїздок після бронювання
        if (currentPage === 'my-rides') {
            loadMyRides();
        }
    } catch (err) {
        alert('Помилка при бронюванні: ' + err.message);
    }
}

async function cancelRide(bookingId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch(`https://027f-194-44-220-198.ngrok-free.app/api/cancel-ride`, {
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
        // Оновити список поїздок після скасування
        loadMyRides();
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

async function loadMyRides() {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Не вдалося отримати ваш Telegram ID!</div>';
        return;
    }
    try {
        const res = await fetch(`https://027f-194-44-220-198.ngrok-free.app/api/my-rides?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) throw new Error('Не вдалося отримати ваші поїздки');
        const rides = await res.json();
        const myRidesResults = document.getElementById('my-rides-results');
        myRidesResults.innerHTML = rides.length === 0
            ? '<div class="no-rides">У вас немає заброньованих поїздок.</div>'
            : rides.map(ride => {
                const dt = new Date(ride.departure_time);
                const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                const statusText = ride.status ? `Статус: ${ride.status}` : 'Статус: невідомо';
                return `
                    <div class="ride-item">
                        <div class="ride-top">
                            <div class="ride-route">
                                <p class="route">${ride.departure} → ${ride.arrival}</p>
                                <p>${timeStr}, ${dateStr}</p>
                                <p>Місць: ${ride.seats_booked}</p>
                                ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                                <p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>
                                <p>Номер бронювання: ${ride.booking_id}</p>
                                <p class="status">${statusText}</p>
                            </div>
                            <div class="price-tag">${ride.price} ₴</div>
                        </div>
                        <button class="cancel-button" onclick="cancelRide(${ride.booking_id})">Скасувати</button>
                    </div>`;
            }).join('');
    } catch (err) {
        console.error(err);
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Помилка при завантаженні поїздок: ' + err.message + '</div>';
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('closing');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
        isModalOpen = false;
        Telegram.WebApp.BackButton.hide();
        window.history.pushState({ page: currentPage }, document.title);
    }, 300);
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
    } else if (page === 'create' || page === 'profile') {
        alert(`Перехід до ${page} ще не реалізовано!`);
    }
}