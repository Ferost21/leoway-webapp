import { fetchCities, fetchRating, loadMyRides } from './api.js';

const webApp = window.Telegram.WebApp;

let isModalOpen = false;
let isDriverRideModalOpen = false;
let currentPage = 'search';

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

function closeDriverRideModal() {
    const modal = document.getElementById('driver-ride-modal');
    modal.classList.add('closing');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
        isDriverRideModalOpen = false;
        Telegram.WebApp.BackButton.hide();
        window.history.pushState({ page: currentPage }, document.title);
        if (currentPage === 'my-rides') {
            loadMyRides();
        }
    }, 300);
}

function navigate(page) {
    if (isModalOpen) {
        closeModal();
    } else if (isDriverRideModalOpen) {
        closeDriverRideModal();
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

function loadProfile() {
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        const profileRating = document.getElementById('profile-rating');

        profileName.textContent = user.first_name || 'Невідомий користувач';

        fetchRating(user.id).then(rating => {
            profileRating.textContent = `Рейтинг: ★${rating || 'N/A'}`;
        });

        if (user.photo_url) {
            profilePhoto.src = user.photo_url;
        } else {
            profilePhoto.src = 'https://via.placeholder.com/100';
        }
    }
}

export { setupSuggestions, formatShortDate, swapLocations, closeModal, closeDriverRideModal, navigate, loadProfile, isModalOpen, isDriverRideModalOpen, currentPage };