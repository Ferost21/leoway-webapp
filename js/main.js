const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let isDriverRideModalOpen = false;
let currentPage = 'search';
let isNavigating = false;
let lastNavigationTime = 0;
const NAVIGATION_DEBOUNCE_MS = 500; // Debounce navigation by 500ms

const API_BASE_URL = 'https://d6585ffde7de.ngrok-free.app';

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

    // Ініціалізація користувача
    const user = webApp.initDataUnsafe.user;
    const initData = webApp.initData || '';
    if (user && user.id && initData) {
        const isInitialized = localStorage.getItem(`userInitialized_${user.id}`);
        if (!isInitialized) {
            fetch(`${API_BASE_URL}/api/init-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    tgId: user.id,
                    firstName: user.first_name || 'Невідомий користувач',
                    photoUrl: user.photo_url || null,
                    initData: initData
                })
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error initializing user:', data.error);
                    if (data.error.includes('initData')) {
                        webApp.showAlert('Помилка автентифікації. Будь ласка, відкрийте додаток через Telegram.');
                        webApp.close();
                    }
                } else {
                    localStorage.setItem(`userInitialized_${user.id}`, 'true');
                    console.log('User initialized successfully:', data.message);
                }
            })
            .catch(err => {
                console.error('Network error initializing user:', err);
                webApp.showAlert('Помилка мережі. Будь ласка, перевірте підключення та спробуйте ще раз.');
            });
        }

        // Перевизначити fetch для додавання initData
        const originalFetch = window.fetch;
        window.fetch = async function (url, options = {}) {
            const urlObj = new URL(url, API_BASE_URL);
            // Додавати initData лише для захищених ендпоінтів
            if (urlObj.pathname.startsWith('/api/') && !urlObj.pathname.includes('/api/cities')) {
                urlObj.searchParams.set('initData', initData); // Без encodeURIComponent
            }
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            };
            console.log(`Sending request to ${urlObj.toString()} with initData: ${initData}`);
            const response = await originalFetch(urlObj.toString(), options);
            if (response.status === 401 || response.status === 422) {
                console.error(`Error ${response.status} for ${urlObj.pathname}: ${await response.text()}`);
                webApp.showAlert('Помилка автентифікації. Відкрийте додаток через Telegram.');
                webApp.close();
            }
            return response;
        };
    } else {
        console.error('No user or initData available');
        webApp.showAlert('Не вдалося отримати дані користувача. Будь ласка, відкрийте додаток через Telegram.');
        webApp.close();
    }

    // Ініціалізація сторінки через navigate
    navigate('search');
    loadProfile();
});

const pages = ['search', 'create', 'my-rides', 'profile', 'inbox', 'chat', 'search-results', 'driver-ride-details', 'passenger-info'];

function navigate(page, params = {}) {
    const now = Date.now();
    if (isNavigating || now - lastNavigationTime < NAVIGATION_DEBOUNCE_MS) {
        console.info(`Navigation to ${page} skipped due to ongoing navigation or debounce`);
        return;
    }
    isNavigating = true;
    lastNavigationTime = now;

    if (!pages.includes(page)) {
        console.error(`Page ${page} not found`);
        navigate('search');
        return;
    }

    const currentActivePage = document.querySelector('.page.active');
    const newPage = document.getElementById(`${page}-page`);

    if (!newPage) {
        console.error(`Page element #${page}-page not found`);
        navigate('search');
        isNavigating = false;
        lastNavigationTime = 0;
        return;
    }

    if (['search', 'create', 'my-rides', 'profile', 'inbox'].includes(page)) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[onclick="navigate('${page}')"]`);
        if (navItem) navItem.classList.add('active');
    }

    if (currentActivePage) {
        currentActivePage.classList.add('fade-out');
        setTimeout(() => {
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active', 'fade-out', 'fade-in');
                p.style.display = 'none';
            });
            newPage.style.display = 'block';
            newPage.classList.add('active', 'fade-in');
            isNavigating = false;
        }, 300);
    } else {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active', 'fade-in');
            p.style.display = 'none';
        });
        newPage.style.display = 'block';
        newPage.classList.add('active', 'fade-in');
        isNavigating = false;
    }

    let hash = `#${page}`;
    if (page === 'driver-ride-details' && params.rideId) {
        hash = `#my-rides/${params.rideId}`;
    } else if (page === 'search-results' && params.departure && params.arrival && params.date && params.seats) {
        hash = `#search-results/${encodeURIComponent(params.departure)}/${encodeURIComponent(params.arrival)}/${params.date}/${params.seats}`;
    } else if (page === 'passenger-info' && params.rideId && params.bookingId) {
        hash = `#my-rides/${params.rideId}/${params.bookingId}`;
    } else if (page === 'chat' && params.chatId) {
        hash = `#chat/${params.chatId}`;
    }
    history.pushState({ page, ...params }, '', hash);

    if (['search-results', 'driver-ride-details', 'passenger-info', 'chat'].includes(page)) {
        Telegram.WebApp.BackButton.show();
    } else {
        Telegram.WebApp.BackButton.hide();
    }

    if (page === 'my-rides') {
        loadMyRides();
    } else if (page === 'profile') {
        loadProfile();
    } else if (page === 'inbox') {
        loadInbox();
    } else if (page === 'chat' && params.chatId) {
        loadChat(params);
    } else if (page === 'driver-ride-details' && params.rideId) {
        loadDriverRideDetails(params.rideId); // Call load function instead of simulating click
    }

    console.log(`Navigation completed to page: ${page}, params:`, params);
}

window.addEventListener('load', () => {
    const hash = location.hash.replace('#', '');
    if (!hash) {
        navigate('search');
        return;
    }

    const [page, param1, param2] = hash.split('/');
    if (pages.includes(page)) {
        if (page === 'chat' && param1) {
            navigate('chat', { chatId: param1 });
        } else if (page === 'inbox') {
            navigate('inbox');
        } else if (page === 'my-rides' && param1) {
            if (param2) {
                navigate('passenger-info', { rideId: param1, bookingId: param2 });
            } else {
                navigate('driver-ride-details', { rideId: param1 });
            }
        } else {
            navigate(page);
        }
    } else {
        navigate('search');
    }
});

window.addEventListener('popstate', (event) => {
    const now = Date.now();
    if (now - lastNavigationTime < NAVIGATION_DEBOUNCE_MS) {
        console.info('Popstate event ignored due to debounce');
        return;
    }

    const hash = location.hash.replace('#', '');
    if (!hash) {
        navigate('search');
        return;
    }

    const [page, param1, param2] = hash.split('/');
    if (pages.includes(page)) {
        if (page === 'chat' && param1) {
            navigate('chat', { chatId: param1 });
        } else if (page === 'inbox') {
            navigate('inbox');
        } else if (page === 'my-rides' && param1) {
            if (param2) {
                navigate('passenger-info', { rideId: param1, bookingId: param2 });
            } else {
                navigate('driver-ride-details', { rideId: param1 });
            }
        } else {
            navigate(page);
        }
    } else {
        navigate('search');
    }
});

Telegram.WebApp.BackButton.onClick(() => {
    const hash = location.hash.replace('#', '');
    const [page, param1, param2] = hash.split('/');
    if (page === 'chat' && param1) {
        navigate('inbox');
    } else if (page === 'inbox') {
        navigate('search');
    } else if (page === 'my-rides' && param1) {
        if (param2) {
            navigate('driver-ride-details', { rideId: param1 }); // Go to driver-ride-details
        } else {
            navigate('my-rides'); // Go to my-rides
        }
    } else if (page === 'search-results' || page === 'passenger-info') {
        navigate('my-rides');
    } else {
        navigate('search');
    }
});

// Placeholder for loadDriverRideDetails (implement based on your actual logic)
function loadDriverRideDetails(rideId) {
    console.log(`Loading driver ride details for rideId: ${rideId}`);
    // Implement the logic to load ride details, e.g., fetch from /api/ride-passengers
    fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${rideId}&tgId=${webApp.initDataUnsafe.user.id}`)
        .then(res => res.json())
        .then(data => {
            // Update the DOM with ride details and passengers
            const page = document.getElementById('driver-ride-details-page');
            // Example: Update page content (adjust based on your HTML structure)
            page.innerHTML = `<h2>Ride ${rideId}</h2><pre>${JSON.stringify(data, null, 2)}</pre>`;
        })
        .catch(err => {
            console.error('Error loading driver ride details:', err);
            webApp.showAlert('Помилка завантаження деталей поїздки.');
        });
}