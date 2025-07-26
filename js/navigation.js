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

    // If there's an active page, fade it out
    if (currentActivePage) {
        currentActivePage.classList.add('fade-out');
        setTimeout(() => {
            pages.forEach(p => p.classList.remove('active', 'fade-out', 'fade-in'));
            newPage.classList.add('active', 'fade-in');
        }, 300); // Match the CSS transition duration
    } else {
        // If no active page, directly fade in the new page
        pages.forEach(p => p.classList.remove('active', 'fade-in'));
        newPage.classList.add('active', 'fade-in');
    }

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}