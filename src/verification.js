/** Stateless, basic anti-spam gate. Telegram holds a signed pinned receipt. */
const encoder = new TextEncoder();
const symbols = ['🍎', '🐱', '🚗', '🌻', '⚽', '🎸'];
const CHALLENGE_SECONDS = 300;
const RECEIPT_SECONDS = 30 * 86400;

async function mac(secret, value) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
        {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
    return Array.from(bytes.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
}

function equal(a, b) {
    if (typeof a !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export function createVerification({botToken, ownerUid, secretToken, api, now = () => Math.floor(Date.now() / 1000)}) {
    const botId = botToken.split(':')[0];
    const scope = `${botToken}|${ownerUid}`;
    const sign = value => mac(secretToken, `${scope}|${value}`);
    const answer = async (uid, expiry, nonce) => parseInt((await sign(`answer|${uid}|${expiry}|${nonce}`)).slice(0, 8), 16) % symbols.length;

    async function verified(uid) {
        const chat = await api('getChat', {chat_id: uid});
        const pinned = chat.pinned_message;
        if (String(chat.id) !== String(uid) || chat.type !== 'private' ||
            String(pinned?.from?.id) !== botId) return false;
        const match = /\nOWB1:(\d+):(\d+):([a-f0-9]{32})$/.exec(pinned.text || '');
        if (!match || match[1] !== String(uid)) return false;
        const expiry = Number(match[2]);
        if (expiry <= now() || expiry > now() + RECEIPT_SECONDS + CHALLENGE_SECONDS) return false;
        return equal(match[3], await sign(`receipt|${uid}|${expiry}`));
    }

    async function challenge(uid) {
        const expiry = now() + CHALLENGE_SECONDS;
        const nonceBytes = crypto.getRandomValues(new Uint8Array(4));
        const nonce = Array.from(nonceBytes, b => b.toString(16).padStart(2, '0')).join('');
        const correct = await answer(uid, expiry, nonce);
        const buttons = await Promise.all(symbols.map(async (symbol, index) => ({
            text: symbol,
            callback_data: `c1:${expiry}:${nonce}:${index}:${await sign(`choice|${uid}|${expiry}|${nonce}|${index}`)}`
        })));
        await api('sendMessage', {
            chat_id: uid,
            text: `请点击 ${symbols[correct]} 完成基础验证（5 分钟内有效）。\n验证前消息不会转发；通过后请重新发送。`,
            reply_markup: {inline_keyboard: [buttons.slice(0, 3), buttons.slice(3)]}
        });
    }

    async function callback(query) {
        const uid = query.from?.id;
        const msg = query.message;
        const match = /^c1:(\d{1,12}):([a-f0-9]{8}):([0-5]):([a-f0-9]{32})$/.exec(query.data || '');
        const reject = text => api('answerCallbackQuery', {callback_query_id: query.id, text, show_alert: true});
        if (!match || !uid || msg?.chat?.type !== 'private' || msg.chat.id !== uid ||
            String(msg.from?.id) !== botId || !msg.date) {
            await reject('验证无效，请重新发送 /start。');
            return;
        }
        const [, rawExpiry, nonce, rawChoice, signature] = match;
        const expiry = Number(rawExpiry);
        if (expiry <= now() || expiry > now() + CHALLENGE_SECONDS ||
            !equal(signature, await sign(`choice|${uid}|${expiry}|${nonce}|${rawChoice}`))) {
            await reject('验证已过期或无效，请重新发送 /start。');
            return;
        }
        if (Number(rawChoice) !== await answer(uid, expiry, nonce)) {
            await reject('选错了，请按提示选择。');
            return;
        }
        // Stable expiry makes retries idempotent; never grants an indefinite receipt.
        const receiptExpiry = expiry + RECEIPT_SECONDS;
        const receipt = `OWB1:${uid}:${receiptExpiry}:${await sign(`receipt|${uid}|${receiptExpiry}`)}`;
        const body = {
            chat_id: uid, message_id: msg.message_id,
            text: `✅ 已通过基础验证，有效期 30 天。请重新发送需要转发的消息。\n请保留这条置顶消息；取消置顶或删除后需要重新验证。\n${receipt}`,
            reply_markup: {inline_keyboard: []}
        };
        await api('editMessageText', body);
        await api('pinChatMessage', {chat_id: uid, message_id: msg.message_id, disable_notification: true});
        await api('answerCallbackQuery', {callback_query_id: query.id, text: '验证通过，请重新发送消息。'});
    }

    return {verified, challenge, callback};
}
