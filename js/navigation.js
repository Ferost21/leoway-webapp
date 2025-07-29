const pages = ['search', 'create', 'my-rides', 'profile', 'inbox', 'chat', 'search-results', 'driver-ride-details', 'passenger-info'];
let isNavigating = false;

function navigate(page, params = {}) {
    if (isNavigating) {
        console.info(`Navigation to ${page} skipped due to ongoing navigation`);
        return;
    }
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
    const [page, param1] = hash.split('/');
    if (page === 'chat' && param1) {
        navigate('inbox');
    } else if (page === 'inbox') {
        navigate('search');
    } else {
        history.back();
    }
});