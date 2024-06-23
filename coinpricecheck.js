const axios = require('axios');

const API_URL = 'https://api.binance.com/api/v3';

const TELEGRAM_BOT_TOKEN = '7492705293:AAEHO0Mnw9M85dEKfsJjKeta7AMN230LFvs';
const TELEGRAM_CHAT_ID = '-1002181900472';

// Mesaj fonksiyonu
async function sendMessageToTelegram(message) {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message
            }
        );
        console.log('Telegram mesaj gönderildi:', response.data);
    } catch (error) {
        console.error('Telegram mesaj gönderme hatası:', error.message);
    }
}

// Binance API
async function binanceRequest(endpoint, params = {}) {
    try {
        const response = await axios.get(`${API_URL}${endpoint}`, { params });
        return response.data;
    } catch (error) {
        console.error('Binance API hatası:', error.response.data);
        return null;
    }
}

async function getCurrentPrice(symbol) {
    const ticker = await binanceRequest('/ticker/price', { symbol });
    if (ticker) {
        return parseFloat(ticker.price);
    }
    return null;
}

// Coinin anlik fiyati
const symbol = 'ADAUSDT'; // Ornek olarak DOTUSDT sembolunu kullaniyoruz

async function main() {
    try {
        const price = await getCurrentPrice(symbol);
        if (price !== null) {
            const message = `Anlık ${symbol} fiyatı: $${price.toFixed(2)}`;
            console.log(message);
            await sendMessageToTelegram(message);
        } else {
            console.log(`Hata: ${symbol} sembolü için fiyat alınamadı.`);
        }
    } catch (error) {
        console.error(`Hata oluştu: ${error}`);
    }
}

setInterval(main,10000);
