function formatShortDate(dateStr) {
    const dt = new Date(dateStr);
    if (isNaN(dt)) {
        return dateStr; // Якщо дата невалідна, повернути оригінал
    }
    const day = dt.toLocaleDateString('uk-UA', { day: 'numeric' }); // "17"
    const month = dt.toLocaleDateString('uk-UA', { month: 'long' }); // "серпень"
    const monthGenitive = {
        'січень': 'січня',
        'лютий': 'лютого',
        'березень': 'березня',
        'квітень': 'квітня',
        'травень': 'травня',
        'червень': 'червня',
        'липень': 'липня',
        'серпень': 'серпня',
        'вересень': 'вересня',
        'жовтень': 'жовтня',
        'листопад': 'листопада',
        'грудень': 'грудня'
    }[month];
    return `${day} ${monthGenitive}`;
}

function getStatusText(status) {
    switch (status) {
        case 'approved':
            return 'Підтверджено';
        case 'pending':
            return 'Очікує';
        case 'cancelled':
            return 'Скасовано';
        default:
            return 'Невідомо';
    }
}