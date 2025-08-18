// Mock для локального тестування (file:// протокол)
if (location.protocol === 'file:') {
    console.warn('Running in local test mode with mocked Telegram WebApp');

    // Використовуйте згенероване initData
    const mockedInitData = 'auth_date=1755519038&user=%7B%22id%22%3A674387089%2C%22first_name%22%3A%22%5Cu041e%5Cu043b%5Cu0435%5Cu043a%5Cu0441%5Cu0456%5Cu0439%22%2C%22last_name%22%3A%22Tester%22%2C%22username%22%3A%22testuser%22%2C%22photo_url%22%3A%22https%3A%2F%2Fexample.com%2Fphoto.jpg%22%7D&hash=7ade17db3b3e6118a9ceb90854b668d2acab7b61c62e81c8ba3619208c942e91';
    // Використовуйте user_data для initDataUnsafe
    const mockedUser = {
        id: 674387089,
        first_name: 'Олексій',
        last_name: 'Tester',
        username: 'testuser',
        photo_url: 'https://example.com/photo.jpg'
    };

    window.Telegram = {
        WebApp: {
            initData: mockedInitData,
            initDataUnsafe: {
                user: mockedUser,
                start_param: '',  // Якщо потрібен deep linking, наприклад, 'chat_123'
            },
            themeParams: {
                bg_color: '#ffffff',
                text_color: '#000000',
                button_color: '#27ae60',
                button_text_color: '#ffffff',
                section_bg_color: '#ffffff',
                border_color: '#ccc',
                link_color: '#2980b9',
                destructive_text_color: '#e74c3c'
            },
            colorScheme: 'light',  // Або 'dark' для темної теми
            ready: () => console.log('Mock WebApp ready'),
            showAlert: (msg) => alert(msg),
            close: () => console.log('Mock close app'),
            setHeaderColor: () => console.log('Mock setHeaderColor'),
            setBackgroundColor: () => console.log('Mock setBackgroundColor'),
            requestFullscreen: () => Promise.resolve(),
            BackButton: {
                show: () => console.log('Mock BackButton show'),
                hide: () => console.log('Mock BackButton hide'),
                onClick: (cb) => console.log('Mock BackButton onClick', cb)
            }
        }
    };
}

// Продовжуємо з оригінальним кодом
const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let isDriverRideModalOpen = false;
let currentPage = 'search';

const API_BASE_URL = 'https://e3a9fd0f120c.ngrok-free.app';

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
            if (urlObj.pathname.includes('/api/user-rating') || 
                urlObj.pathname.includes('/api/chats') || 
                urlObj.pathname.includes('/api/my-rides') || 
                urlObj.pathname.includes('/api/ride-passengers') ||
                urlObj.pathname.includes('/api/book-ride') ||
                urlObj.pathname.includes('/api/create-ride') ||
                urlObj.pathname.includes('/api/cancel-ride') ||
                urlObj.pathname.includes('/api/delete-ride') ||
                urlObj.pathname.includes('/api/start-chat') ||
                urlObj.pathname.includes('/api/send-message') ||
                urlObj.pathname.includes('/api/update-booking-status') ||
                urlObj.pathname.includes('/api/messages') ||
                urlObj.pathname.includes('/api/chat-info')) {
                urlObj.searchParams.set('initData', initData);
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

        // Обробка tgWebAppStartParam для deep linking
        const startParam = webApp.initDataUnsafe.start_param || new URLSearchParams(window.location.search).get('tgWebAppStartParam');
        if (startParam && startParam.startsWith('chat_')) {
            const chatId = parseInt(startParam.substring(5));
            fetch(`${API_BASE_URL}/api/chat-info?chatId=${chatId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            })
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch chat info: ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                navigate('chat', {
                    chatId: data.chat_id,
                    contactName: data.contact_name,
                    bookingId: data.booking_id,
                    rideId: data.ride_id
                });
            })
            .catch(err => {
                console.error('Error loading chat from start_param:', err);
                webApp.showAlert('Помилка відкриття чату. Спробуйте ще раз.');
                navigate('search');
            });
        } else {
            // Ініціалізація сторінки через navigate
            navigate('search');
            loadProfile();
        }
    } else {
        console.error('No user or initData available');
        webApp.showAlert('Не вдалося отримати дані користувача. Будь ласка, відкрийте додаток через Telegram.');
        webApp.close();
    }
});