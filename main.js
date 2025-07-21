const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let isDriverRideModalOpen = false;
let currentPage = 'search';

const API_BASE_URL = 'https://49c939404297.ngrok-free.app';

document.addEventListener('DOMContentLoaded', () => {
    webApp.ready();
    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    document.getElementById('modal').style.display = 'none';
    document.getElementById('driver-ride-modal').style.display = 'none';

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