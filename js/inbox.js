// Функція для збереження чатів у localStorage
function saveChatsLocally(tgId, conversations) {
    try {
        localStorage.setItem(`chats_${tgId}`, JSON.stringify(conversations));
        console.log('Chats saved to localStorage:', conversations);
    } catch (err) {
        console.error('Error saving chats to localStorage:', err.message);
    }
}

// Функція для отримання чатів з localStorage
function getLocalChats(tgId) {
    try {
        const chats = localStorage.getItem(`chats_${tgId}`);
        return chats ? JSON.parse(chats) : [];
    } catch (err) {
        console.error('Error retrieving chats from localStorage:', err.message);
        return [];
    }
}

// Функція для синхронізації локальних чатів із сервером
async function syncLocalChats(tgId) {
    const localChats = getLocalChats(tgId);
    if (localChats.length === 0) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/chats?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (res.ok) {
            const serverChats = await res.json();
            // Оновлюємо локальні чати даними з сервера
            saveChatsLocally(tgId, serverChats);
            console.log('Local chats synchronized with server');
            return serverChats;
        } else {
            console.warn('Failed to sync chats with server, using local chats');
            return localChats;
        }
    } catch (err) {
        console.warn('Network error during chat sync, using local chats:', err.message);
        return localChats;
    }
}

async function loadInbox(params = {}) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('conversation-list').innerHTML = '<div class="no-messages">Не вдалося отримати ваш Telegram ID!</div>';
        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
        scrollableContent.classList.add('no-messages-container');
        console.error('Не вдалося отримати Telegram ID');
        return;
    }

    const conversationList = document.getElementById('conversation-list');

    try {
        const res = await fetch(`${API_BASE_URL}/api/chats?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) throw new Error('Не вдалося отримати ваші розмови');

        const conversations = await res.json();
        // Зберігаємо чати локально після успішного отримання з сервера
        saveChatsLocally(tgId, conversations);

        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');

        const conversationsWithPhotos = await Promise.all(conversations.map(async (conversation) => {
            try {
                const resPassengers = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${conversation.ride_id}&tgId=${tgId}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (resPassengers.ok) {
                    const passengers = await resPassengers.json();
                    const passenger = passengers.find(p => p.booking_id === conversation.booking_id);
                    return {
                        ...conversation,
                        photo_url: passenger?.photo_url || 'https://t.me/i/userpic/320/default.svg'
                    };
                } else {
                    console.warn(`Failed to fetch passenger photo for bookingId: ${conversation.booking_id}`);
                    return { ...conversation, photo_url: 'https://t.me/i/userpic/320/default.svg' };
                }
            } catch (err) {
                console.error(`Error fetching photo for bookingId: ${conversation.booking_id}`, err.message);
                return { ...conversation, photo_url: 'https://t.me/i/userpic/320/default.svg' };
            }
        }));

        conversationList.innerHTML = conversationsWithPhotos.length === 0
            ? '<div class="no-messages">Розмови відсутні.</div>'
            : renderConversations(conversationsWithPhotos);

        if (conversationsWithPhotos.length === 0) {
            scrollableContent.classList.add('no-messages-container');
        } else {
            scrollableContent.classList.remove('no-messages-container');
        }

        scrollableContent.scrollTop = 0;
    } catch (err) {
        console.error('Помилка при завантаженні розмов:', err.message);
        const errorMessage = err.message === 'Failed to fetch'
            ? 'Немає з\'єднання з сервером. Перевірте інтернет і спробуйте знову.'
            : err.message;

        // Якщо немає підключення, використовуємо локально збережені чати
        const localChats = getLocalChats(tgId);
        if (localChats.length > 0) {
            const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
            conversationList.innerHTML = renderConversations(localChats);
            scrollableContent.classList.remove('no-messages-container');
            scrollableContent.scrollTop = 0;
            console.log('Loaded chats from localStorage:', localChats);
        } else {
            conversationList.innerHTML = `<div class="no-messages">Помилка при завантаженні розмов: ${errorMessage}</div>`;
            const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
            scrollableContent.classList.add('no-messages-container');
        }
    }
}

function renderConversations(conversations) {
    console.log('Rendering conversations:', conversations);
    return conversations.map(conversation => {
        const lastMessage = conversation.last_message || 'Немає повідомлень';
        const lastMessageTime = conversation.last_message_time
            ? new Date(conversation.last_message_time)
            : null;
        let formattedTime = '';

        if (lastMessageTime) {
            const now = new Date();
            const diffDays = Math.floor((now - lastMessageTime) / (1000 * 60 * 60 * 24));
            const weekday = lastMessageTime.toLocaleString('uk-UA', { weekday: 'short' }).slice(0, 2);

            if (diffDays === 0) {
                formattedTime = lastMessageTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                formattedTime = 'Вчора';
            } else if (diffDays > 1 && diffDays <= 7) {
                formattedTime = weekday;
            } else {
                formattedTime = lastMessageTime.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
            }
        }

        const isUnread = conversation.unread_count > 0;

        return `
            <div class="conversation-item${isUnread ? ' unread' : ''}" onclick="navigate('chat', { chatId: ${conversation.chat_id}, contactName: '${conversation.contact_name}', bookingId: ${conversation.booking_id}, rideId: ${conversation.ride_id} })">
                <img src="${conversation.photo_url || 'https://t.me/i/userpic/320/default.svg'}" alt="Contact Photo" class="conversation-photo">
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.contact_name}</h3>
                        <p class="booking-id">Бронювання №${conversation.booking_id}</p>
                    </div>
                    <div class="conversation-last-message">
                        <p class="last-message">${lastMessage}</p>
                        <p class="last-message-time">${formattedTime}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadChat(params) {
    const { chatId, contactName, bookingId, rideId } = params;
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('chat-messages').innerHTML = '<div class="no-messages">Не вдалося отримати ваш Telegram ID!</div>';
        console.error('Не вдалося отримати Telegram ID');
        return;
    }

    document.getElementById('chat-contact-name').textContent = contactName || 'Контакт';
    document.getElementById('chat-booking-id').textContent = `Бронювання №${bookingId}`;
    const chatRideDetails = document.getElementById('chat-ride-details');
    chatRideDetails.textContent = `Поїздка №${rideId}`;

    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const chatPage = document.getElementById('chat-page');

    try {
        const res = await fetch(`${API_BASE_URL}/api/messages?chatId=${chatId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) throw new Error('Не вдалося отримати повідомлення');

        const messages = await res.json();
        chatMessages.innerHTML = messages.length === 0
            ? '<div class="no-messages">Повідомлення відсутні.</div>'
            : renderMessages(messages);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        sendButton.onclick = () => sendMessage(chatId, bookingId, rideId);
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage(chatId, bookingId, rideId);
        };

        messageInput.onfocus = () => {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 300);
        };

        const handleResize = () => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        window.addEventListener('resize', handleResize);

        chatPage.addEventListener('remove', () => {
            window.removeEventListener('resize', handleResize);
        }, { once: true });
    } catch (err) {
        console.error('Помилка при завантаженні чату:', err.message);
        chatMessages.innerHTML = `<div class="no-messages">Помилка при завантаженні чату: ${err.message}</div>`;
    }
}

function renderMessages(messages) {
    const tgId = webApp.initDataUnsafe.user?.id;
    // Group messages by date
    const messagesByDate = messages.reduce((acc, message) => {
        const messageDate = new Date(message.sent_at).toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: 'long'
        });
        if (!acc[messageDate]) {
            acc[messageDate] = [];
        }
        acc[messageDate].push(message);
        return acc;
    }, {});

    // Render messages grouped by date
    return Object.entries(messagesByDate).map(([date, dateMessages]) => {
        const messageHtml = dateMessages.map(message => {
            const isSentByUser = message.sender_id === tgId;
            // Fallback to current time if sent_at is invalid
            const sentTime = message.sent_at
                ? new Date(message.sent_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
                : 'Невідомий час';
            // Add read indicator for sent messages
            const readIndicator = isSentByUser
                ? `
                    <span class="message-read-indicator">
                        ${message.is_read
                            ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 8.5L5.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M9 12L14.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>` // Double checkmark for read
                            : `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                 <path d="M2 8.5L5.5 12L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                               </svg>` // Single checkmark for sent (unread)
                        }
                    </span>`
                : '';
            return `
                <div class="message ${isSentByUser ? 'sent' : 'received'}">
                    <p>${message.content}</p>
                    <span class="message-time">${sentTime}${readIndicator}</span>
                </div>
            `;
        }).join('');
        return `
            <div class="message-date-header">${date}</div>
            ${messageHtml}
        `;
    }).join('');
}

async function sendMessage(chatId, bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    const initData = webApp.initData || '';
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const content = messageInput.value.trim();

    if (!tgId) {
        alert('Не вдалося отримати ваш Telegram ID!');
        return;
    }
    if (!content) {
        alert('Введіть повідомлення!');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ chatId, senderId: tgId, bookingId, rideId, content, initData })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка при надсиланні повідомлення');
        }

        messageInput.value = '';
        const resMessages = await fetch(`${API_BASE_URL}/api/messages?chatId=${chatId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resMessages.ok) throw new Error('Не вдалося оновити повідомлення');

        const messages = await resMessages.json();
        chatMessages.innerHTML = messages.length === 0
            ? '<div class="no-messages">Повідомлення відсутні.</div>'
            : renderMessages(messages);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Оновлюємо локальні чати після надсилання повідомлення
        const updatedChats = await syncLocalChats(tgId);
        const conversationList = document.getElementById('conversation-list');
        if (conversationList) {
            conversationList.innerHTML = updatedChats.length === 0
                ? '<div class="no-messages">Розмови відсутні.</div>'
                : renderConversations(updatedChats);
        }
    } catch (err) {
        alert('Помилка при надсиланні повідомлення: ' + err.message);
    }
}