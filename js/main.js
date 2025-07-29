const webApp = window.Telegram.WebApp;
webApp.ready();

let API_BASE_URL = '';
let isModalOpen = false;
let isDriverRideModalOpen = false;
let currentPage = 'search';

fetch('/api/config')
    .then(res => res.json())
    .then(config => {
        API_BASE_URL = config.apiBaseUrl;
        initializeApp();
    })
    .catch(err => {
        console.error("Не вдалося завантажити конфіг:", err);
    });

function initializeApp() {
    updateTheme();

    document.addEventListener('DOMContentLoaded', () => {
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

        const user = webApp.initDataUnsafe.user;
        if (user && user.id) {
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

        navigate('search');
        loadProfile();
    });
}

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