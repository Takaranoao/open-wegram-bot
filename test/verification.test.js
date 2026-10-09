import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerification} from '../src/verification.js';
import {handleWebhook, handleInstall} from '../src/core.js';

const botToken = '123:TestBotToken';
const secretToken = 'TestSecretToken123456';
const ownerUid = '999';

function fixture(time = 1800000000) {
    let pinned;
    let challenge;
    const calls = [];
    const api = async (method, body) => {
        calls.push({method, body});
        if (method === 'getChat') return {id: body.chat_id, type: 'private', pinned_message: pinned};
        if (method === 'sendMessage') {
            challenge = {message_id: 42, date: time, from: {id: 123, is_bot: true},
                chat: {id: body.chat_id, type: 'private'}, ...body};
            return challenge;
        }
        if (method === 'editMessageText') challenge = {...challenge, ...body};
        if (method === 'pinChatMessage') pinned = {...challenge};
        return true;
    };
    const options = {botToken, ownerUid, secretToken, api, now: () => time};
    const gate = createVerification(options);
    const query = (correct = true) => {
        const expected = challenge.text.match(/请点击 (.+) 完成/)[1];
        const button = challenge.reply_markup.inline_keyboard.flat().find(b => (b.text === expected) === correct);
        return {id: 'query', from: {id: challenge.chat.id}, message: structuredClone(challenge), data: button.callback_data};
    };
    return {gate, options, calls, query, setPinned: value => pinned = value,
        pinned: () => pinned, advance: seconds => time += seconds};
}

test('Telegram receipt survives a fresh application instance and expires', async () => {
    const f = fixture();
    assert.equal(await f.gate.verified(777), false);
    await f.gate.challenge(777);
    const q = f.query();
    assert.ok(q.data.length <= 64);
    await f.gate.callback(q);
    assert.equal(await createVerification(f.options).verified(777), true);
    f.advance(31 * 86400);
    assert.equal(await f.gate.verified(777), false);
});

test('wrong, expired, cross-user and tampered challenges never create receipts', async () => {
    const f = fixture();
    await f.gate.challenge(777);
    await f.gate.callback(f.query(false));
    const q = f.query();
    await f.gate.callback({...q, from: {id: 888}});
    await f.gate.callback({...q, data: q.data.slice(0, -1) + (q.data.endsWith('0') ? '1' : '0')});
    f.advance(301);
    await f.gate.callback(q);
    assert.equal(f.calls.filter(c => c.method === 'pinChatMessage').length, 0);
});

test('receipt cannot be forged, copied to another user or used by another bot or owner', async () => {
    const f = fixture();
    await f.gate.challenge(777);
    await f.gate.callback(f.query());
    assert.equal(await f.gate.verified(888), false);
    assert.equal(await createVerification({...f.options, ownerUid: '998'}).verified(777), false);
    assert.equal(await createVerification({...f.options, botToken: '124:OtherToken'}).verified(777), false);
    const pinned = f.pinned();
    f.setPinned({...pinned, text: pinned.text.replace('OWB1:777:', 'OWB1:888:')});
    assert.equal(await f.gate.verified(888), false);
    f.setPinned({...pinned, from: {id: 777}});
    assert.equal(await f.gate.verified(777), false);
    f.setPinned(undefined);
    assert.equal(await f.gate.verified(777), false);
});

function webhook(message, secret = secretToken) {
    return new Request('https://example.test/public/webhook/999/123:TestBotToken', {
        method: 'POST', headers: {'X-Telegram-Bot-Api-Secret-Token': secret},
        body: JSON.stringify({message})
    });
}

test('unverified messages are withheld; API failure does not bypass gate; groups ignored', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    let fail = false;
    globalThis.fetch = async (url, options) => {
        const method = url.split('/').at(-1);
        calls.push(method);
        if (method === 'getChat') return Response.json(fail ? {ok: false, error_code: 429} :
            {ok: true, result: {id: 777, type: 'private'}});
        return Response.json({ok: true, result: true});
    };
    try {
        const message = {message_id: 1, from: {id: 777}, chat: {id: 777, type: 'private'}, text: 'advert'};
        assert.equal((await handleWebhook(webhook(message), ownerUid, botToken, secretToken)).status, 200);
        assert.deepEqual(calls, ['getChat', 'sendMessage']);
        fail = true;
        assert.equal((await handleWebhook(webhook(message), ownerUid, botToken, secretToken)).status, 500);
        assert.equal(calls.includes('copyMessage'), false);
        calls.length = 0;
        await handleWebhook(webhook({...message, chat: {id: -1, type: 'supergroup'}}), ownerUid, botToken, secretToken);
        assert.deepEqual(calls, []);
        assert.equal((await handleWebhook(webhook(message, ''), ownerUid, botToken, secretToken)).status, 401);
    } finally { globalThis.fetch = originalFetch; }
});

test('verified messages and owner replies retain original routing', async () => {
    const f = fixture(Math.floor(Date.now() / 1000));
    await f.gate.challenge(777);
    await f.gate.callback(f.query());
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        const method = url.split('/').at(-1), body = JSON.parse(options.body);
        calls.push({method, body});
        return Response.json({ok: true, result: method === 'getChat' ?
            {id: 777, type: 'private', pinned_message: f.pinned()} : true});
    };
    try {
        await handleWebhook(webhook({message_id: 5, from: {id: 777}, chat: {id: 777, type: 'private'}, text: 'hello'}), ownerUid, botToken, secretToken);
        assert.equal(calls.find(c => c.method === 'copyMessage').body.chat_id, 999);
        calls.length = 0;
        await handleWebhook(webhook({message_id: 6, from: {id: 999}, chat: {id: 999, type: 'private'}, text: 'reply',
            reply_to_message: {from: {id: 123}, reply_markup: {inline_keyboard: [[{callback_data: '777'}]]}}}), ownerUid, botToken, secretToken);
        assert.deepEqual(calls.map(c => c.method), ['copyMessage']);
        assert.equal(calls[0].body.chat_id, 777);
    } finally { globalThis.fetch = originalFetch; }
});

test('games, stories, checklists and rich messages preserve verification and both routing directions', async t => {
    const f = fixture(Math.floor(Date.now() / 1000));
    await f.gate.challenge(777);
    await f.gate.callback(f.query());
    const originalFetch = globalThis.fetch;
    const calls = [];
    let verified = true;
    globalThis.fetch = async (url, options) => {
        const method = url.split('/').at(-1), body = JSON.parse(options.body);
        calls.push({method, body});
        return Response.json({ok: true, result: method === 'getChat' ?
            {id: 777, type: 'private', pinned_message: verified ? f.pinned() : undefined} : true});
    };
    try {
        const content = {
            game: {title: 'Game', description: 'Shared game', photo: []},
            story: {id: 42, chat: {id: 888, type: 'private'}},
            checklist: {title: 'Tasks', tasks: [{id: 1, text: 'Example'}]},
            rich_message: {blocks: []}
        };
        for (const [field, value] of Object.entries(content)) {
            await t.test(field, async () => {
                const message = {message_id: 5, from: {id: 777}, chat: {id: 777, type: 'private'}, [field]: value};
                calls.length = 0;
                verified = true;
                assert.equal((await handleWebhook(webhook(message), ownerUid, botToken, secretToken)).status, 200);
                assert.deepEqual(calls.map(c => c.method), ['getChat', 'copyMessage']);
                assert.equal(calls[1].body.chat_id, 999);
                assert.equal(calls[1].body.message_id, message.message_id);

                calls.length = 0;
                verified = false;
                await handleWebhook(webhook(message), ownerUid, botToken, secretToken);
                assert.deepEqual(calls.map(c => c.method), ['getChat', 'sendMessage']);
                assert.equal(calls[1].body.chat_id, 777);

                calls.length = 0;
                const reply = {...message, from: {id: 999}, chat: {id: 999, type: 'private'},
                    reply_to_message: {from: {id: 123}, reply_markup: {inline_keyboard: [[{callback_data: '777'}]]}}};
                assert.equal((await handleWebhook(webhook(reply), ownerUid, botToken, secretToken)).status, 200);
                assert.deepEqual(calls.map(c => c.method), ['copyMessage']);
                assert.equal(calls[0].body.chat_id, 777);
            });
        }
    } finally { globalThis.fetch = originalFetch; }
});

test('service messages and bot messages do not trigger challenges or forwarding', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (...args) => {
        calls.push(args);
        return Response.json({ok: true, result: true});
    };
    try {
        const base = {message_id: 1, from: {id: 777}, chat: {id: 777, type: 'private'}};
        for (const message of [
            {...base, pinned_message: {message_id: 42}},
            {...base, successful_payment: {currency: 'XTR', total_amount: 1}},
            {...base, from: {id: 123, is_bot: true}, text: 'bot message'}
        ]) {
            assert.equal((await handleWebhook(webhook(message), ownerUid, botToken, secretToken)).status, 200);
        }
        assert.deepEqual(calls, []);
    } finally { globalThis.fetch = originalFetch; }
});

test('callback retry recovers a failed pin without extending or changing the receipt', async () => {
    const f = fixture(Math.floor(Date.now() / 1000));
    await f.gate.challenge(777);
    const query = f.query();
    const originalFetch = globalThis.fetch;
    const edits = [];
    const answers = [];
    let pins = 0;
    globalThis.fetch = async (url, options) => {
        const method = url.split('/').at(-1), body = JSON.parse(options.body);
        if (method === 'editMessageText') {
            edits.push(body);
            if (edits.length > 1) return Response.json({ok: false, error_code: 400,
                description: 'Bad Request: message is not modified'}, {status: 400});
        }
        if (method === 'pinChatMessage' && ++pins === 1) {
            return Response.json({ok: false, error_code: 429}, {status: 429});
        }
        if (method === 'answerCallbackQuery') answers.push(body);
        return Response.json({ok: true, result: await f.options.api(method, body)});
    };
    const request = () => new Request('https://example.test/public/webhook/999/123:TestBotToken', {
        method: 'POST', headers: {'X-Telegram-Bot-Api-Secret-Token': secretToken},
        body: JSON.stringify({callback_query: query})
    });
    try {
        assert.equal((await handleWebhook(request(), ownerUid, botToken, secretToken)).status, 500);
        assert.equal(f.pinned(), undefined);
        assert.deepEqual(answers, []);
        assert.equal((await handleWebhook(request(), ownerUid, botToken, secretToken)).status, 200);
        assert.equal(await f.gate.verified(777), true);
        const receipt = f.pinned().text;
        assert.equal((await handleWebhook(request(), ownerUid, botToken, secretToken)).status, 200);
        assert.equal(f.pinned().text, receipt);
        assert.equal(pins, 3);
        assert.equal(answers.length, 2);
        assert.deepEqual(edits, [edits[0], edits[0], edits[0]]);
    } finally { globalThis.fetch = originalFetch; }
});

test('install subscribes to captcha callbacks', async () => {
    const originalFetch = globalThis.fetch;
    let body;
    globalThis.fetch = async (url, options) => {
        body = JSON.parse(options.body);
        return Response.json({ok: true});
    };
    try {
        await handleInstall(new Request('https://example.test/public/install/999/token'), ownerUid, botToken, 'public', secretToken);
        assert.deepEqual(body.allowed_updates, ['message', 'callback_query']);
    } finally { globalThis.fetch = originalFetch; }
});
