function formatShortDate(dateStr) {
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[0]}.${parts[1]}` : dateStr;
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