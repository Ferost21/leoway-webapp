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
    const currentActivePage = document.querySelector('.page.active');
    const newPage = document.getElementById(`${page}-page`);

    // If there's an active page, start fade-out
    if (currentActivePage) {
        currentActivePage.classList.add('page-exit');
        currentActivePage.addEventListener('animationend', () => {
            pages.forEach(p => p.classList.remove('active', 'page-exit', 'page-enter'));
            newPage.classList.add('active', 'page-enter');
            currentPage = page;
            window.history.pushState({ page }, document.title);

            // Trigger reflow to restart animation
            newPage.offsetHeight;
            newPage.classList.add('page-enter-active');

            if (page === 'my-rides') {
                loadMyRides();
            }
        }, { once: true });
    } else {
        // Initial page load
        pages.forEach(p => p.classList.remove('active', 'page-exit', 'page-enter'));
        newPage.classList.add('active', 'page-enter');
        newPage.classList.add('page-enter-active');
        currentPage = page;
        window.history.pushState({ page }, document.title);

        if (page === 'my-rides') {
            loadMyRides();
        }
    }
}