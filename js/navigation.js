const pages = [
    'search', 'create', 'my-rides', 'profile', 'inbox',
    'chat', 'search-results', 'driver-ride-details',
    'passenger-info', 'archived-rides'
];
let isNavigating = false;

function navigate(page, params = {}) {
    if (isNavigating) return;
    isNavigating = true;

    if (!pages.includes(page)) {
        console.error(`Page ${page} not found`);
        navigate('search');
        isNavigating = false;
        return;
    }

    const currentActivePage = document.querySelector('.page.active');
    const newPage = document.getElementById(`${page}-page`);

    if (!newPage) {
        console.error(`Page element #${page}-page not found`);
        navigate('search');
        isNavigating = false;
        return;
    }

    // оновлення стану нижнього меню
    if (['search', 'create', 'my-rides', 'profile', 'inbox'].includes(page)) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[onclick="navigate('${page}')"]`);
        if (navItem) navItem.classList.add('active');
    }

    // анімація переходу
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

    // формування hash та state
    let hash = `#${page}`;
    let state = { page, ...params };

    if (page === 'driver-ride-details' && params.rideId) {
    hash = `#my-rides/${params.rideId}`;

    // Зберігаємо, з якої сторінки зайшли
    const lastPage = history.state?.page;
    if (lastPage === 'archived-rides') {
        params.previousPage = 'archived-rides';
    } else {
        params.previousPage = 'my-rides';
    }
    } else if (page === 'search-results' && params.departure && params.arrival && params.date && params.seats) {
        hash = `#search-results/${encodeURIComponent(params.departure)}/${encodeURIComponent(params.arrival)}/${params.date}/${params.seats}`;
    } else if (page === 'passenger-info' && params.rideId && params.bookingId) {
        hash = `#my-rides/${params.rideId}/${params.bookingId}`;
    } else if (page === 'chat' && params.chatId) {
        hash = `#chat/${params.chatId}`;
    } else if (page === 'archived-rides') {
        hash = '#archived-rides';
    }

    history.pushState(state, '', hash);

    // показ кнопки "назад"
    if (['search-results', 'driver-ride-details', 'passenger-info', 'chat', 'archived-rides'].includes(page)) {
        Telegram.WebApp.BackButton.show();
    } else {
        Telegram.WebApp.BackButton.hide();
    }

    // завантаження даних
    if (page === 'my-rides') loadMyRides();
    else if (page === 'profile') loadProfile();
    else if (page === 'inbox') loadInbox();
    else if (page === 'chat' && params.chatId) loadChat(params);
    else if (page === 'archived-rides') loadArchivedRides();
    else if (page === 'search') loadSearchHistory(); // Додаємо завантаження історії пошуку

    console.log(`Navigation completed to page: ${page}, params:`, params);
}

// завантаження з hash при reload
window.addEventListener('load', () => {
    const hash = location.hash.replace('#', '');
    if (!hash) {
        navigate('search');
        return;
    }
    const [page, param1, param2] = hash.split('/');
    if (pages.includes(page)) {
        if (page === 'chat' && param1) navigate('chat', { chatId: param1 });
        else if (page === 'inbox') navigate('inbox');
        else if (page === 'my-rides') {
            if (param2) navigate('passenger-info', { rideId: param1, bookingId: param2 });
            else if (param1) navigate('driver-ride-details', { rideId: param1 });
            else navigate('my-rides');
        } else if (page === 'archived-rides') navigate('archived-rides');
        else navigate(page);
    } else {
        navigate('search');
    }
});

window.addEventListener('popstate', () => {
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
        } else if (page === 'my-rides') {
            if (param2) {
                navigate('passenger-info', { rideId: param1, bookingId: param2 });
            } else if (param1) {
                navigate('driver-ride-details', { rideId: param1 });
            } else {
                navigate('my-rides');
            }
        } else if (page === 'archived-rides') {
            navigate('archived-rides');
        } else {
            navigate(page);
        }
    } else {
        navigate('search');
    }
});

Telegram.WebApp.BackButton.onClick(() => {
    const state = history.state || {};
    const currentPage = state.page;  // Use state.page instead of hash for accuracy

    if (currentPage === 'driver-ride-details') {
        // Always go directly to 'my-rides', ignoring previousPage if it's 'archived-rides'
        navigate('my-rides');
    } else if (currentPage === 'archived-rides') {
        navigate('my-rides');
    } else if (currentPage === 'chat') {
        navigate('inbox');
    } else if (currentPage === 'inbox') {
        navigate('search');
    } else if (currentPage === 'passenger-info') {
        navigate('driver-ride-details', { rideId: state.rideId });
    } else if (currentPage === 'search-results') {
        navigate('search');
    } else {
        navigate('search');
    }
});