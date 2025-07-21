import { updateTheme } from './theme.js';
import { fetchRating, loadMyRides, submitSearch, bookRide, cancelRide, contactDriver, approveBooking, cancelBooking, deleteRide } from './api.js';
import { setupSuggestions, swapLocations, navigate, loadProfile, closeModal, closeDriverRideModal, isModalOpen, isDriverRideModalOpen, currentPage } from './ui.js';
import { showDriverRideDetails } from './rides.js';

const webApp = window.Telegram.WebApp;
webApp.ready();

document.addEventListener('DOMContentLoaded', () => {
    webApp.ready();
    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    // Явно приховуємо модальні вікна при завантаженні
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

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.driverRideModalOpen && isDriverRideModalOpen) {
            closeDriverRideModal();
        } else if (event.state && event.state.modalOpen && isModalOpen) {
            closeModal();
        } else {
            navigate(event.state?.page || 'search');
        }
    });

    // Ініціалізуємо історію зі сторінкою search
    window.history.replaceState({ page: 'search' }, document.title);

    // Ініціалізація користувача
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

    // Встановлюємо сторінку пошуку за замовчуванням
    navigate('search');

    loadProfile();

    if (currentPage === 'my-rides') {
        loadMyRides();
    }

    // Додаємо функції до window для викликів із HTML
    window.navigate = navigate;
    window.submitSearch = submitSearch;
    window.swapLocations = swapLocations;
    window.submitCreateRide = submitCreateRide;
    window.bookRide = bookRide;
    window.cancelRide = cancelRide;
    window.contactDriver = contactDriver;
    window.approveBooking = approveBooking;
    window.cancelBooking = cancelBooking;
    window.deleteRide = deleteRide;
    window.showDriverRideDetails = showDriverRideDetails;
});

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

    fetch(`${API_BASE_URL}/api/create-ride`, {
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