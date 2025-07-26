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
    const newPage = document.getElementById(`${page}-page`);
    const current = document.querySelector('.page.showing');

    if (current && current !== newPage) {
        current.classList.remove('showing');
        setTimeout(() => {
            pages.forEach(p => p.style.display = 'none'); // ховаємо всі
            newPage.style.display = 'block';
            requestAnimationFrame(() => {
                newPage.classList.add('showing');
            });
        }, 300); // час анімації
    } else if (!current) {
        pages.forEach(p => p.style.display = 'none');
        newPage.style.display = 'block';
        requestAnimationFrame(() => {
            newPage.classList.add('showing');
        });
    }

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}
