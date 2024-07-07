const axios = require('axios');
//axios puppeteer

const API_URL = 'https://api.binance.com/api/v3'; //binance apisi buraya

let prevVolumes = {};
let isFirstCheck = true; // ilk kontrolun saglanmasi

// Telegram bot token ve chat id buradan ayarlanacak
const TELEGRAM_BOT_TOKEN = '7492705293:AAEHO0Mnw9M85dEKfsJjKeta7AMN230LFvs';
const TELEGRAM_CHAT_ID = '-1002181900472';


// mesaj yapisi
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

// Binance API ile volume hesaplama
async function binanceRequest(endpoint, params = {}) {
    try {
        const response = await axios.get(`${API_URL}${endpoint}`, { params });
        return response.data;
    } catch (error) {
        console.error('Binance API hatası:', error.response.data);
        return null;
    }
}

// Binance uzerinde bulunan coinlerin taramasi
async function getAllCoins() {
    const exchangeInfo = await binanceRequest('/exchangeInfo');
    if (exchangeInfo && exchangeInfo.symbols) {
        // Sadece USDT parametresi ile işlem gören coinleri filtrele
        return exchangeInfo.symbols
            .filter(symbol => symbol.quoteAsset === 'USDT')
            .map(symbol => symbol.symbol);
    }
    return null;
}

// Coinlerin 24 saatlik hacmini almak icin fonksiyon
async function get24hrVolume(symbol) {
    const ticker = await binanceRequest('/ticker/24hr', { symbol });
    if (ticker) {
        return {
            volume: parseFloat(ticker.volume),
            price: parseFloat(ticker.lastPrice),
            timestamp: new Date(ticker.closeTime).toLocaleTimeString(),
        };
    }
    return null;
}

// Her 20 saniyede bir kontrol
// İslem suresi fonksiyonun sonunda belirleniyor
async function checkVolumeChanges() {
    const symbols = await getAllCoins();
    if (symbols === null) {
        console.error('Coinler alınamadı.');
        return;
    } //olasi hata blogu

    // İlk kontrolde "İslem aranıyor..." mesajını yazdır (Su anlık gerek kaldımadı)
    if (isFirstCheck) {
        console.log('İşlem aranıyor...');
        isFirstCheck = false;
    }

    let foundSignal = false; // Alıs veya satıs sinyali bulundu mu kontrolu

    for (const symbol of symbols) {
        const volumeData = await get24hrVolume(symbol);
        if (volumeData === null) {
            console.error(`Hata: ${symbol} için hacim alınamadı`); // hata satiri (Coguna su anda gerek yok sanırım ayıklicaz)
            continue;
        }
        const currentVolume = volumeData.volume;
        const currentPrice = volumeData.price;
        const currentTime = volumeData.timestamp;

        const prevVolume = prevVolumes[symbol];
        if (prevVolume !== undefined) {
            const volumeChange = Math.abs(currentVolume - prevVolume.volume) / prevVolume.volume * 100; // Volume değişikligininin hesaplanması
            if (volumeChange >= 0.2) { // buradaki deger yuzdelik sapmayı belirtiyor
                foundSignal = true;
                const message = currentVolume > prevVolume.volume ?
                    `🚀 **${symbol}** 
                    🟢Aşırı Alım uyarısı: %${volumeChange.toFixed(2)} 
                    💥 artış - Fiyat: $${currentPrice.toFixed(2)} 
                    ⏰Saat: ${currentTime}` :
                    `🚀**${symbol}**
                    🔴Aşırı Satış uyarısı: %${volumeChange.toFixed(2)} 
                    💥azalış - Fiyat: $${currentPrice.toFixed(2)} 
                    ⏰Saat: ${currentTime}`;

                console.log(message);
                await sendMessageToTelegram(message);
            }
        }
        prevVolumes[symbol] = { volume: currentVolume, price: currentPrice, timestamp: currentTime };
    }

    // Alış veya satış sinyali bulunamazsa "İşlem aranıyor..." mesajını yazdır (Su anlık gereksiz)
    if (!foundSignal) {
        console.log('İşlem aranıyor...');
    }
}

// Onceki hacim değerlerini baslatma ve mesaj gönderme
async function initializePrevVolumes() {
    const symbols = await getAllCoins();
    if (symbols === null) {
        console.error('Coinler alınamadı.');
        return;
    }

    for (const symbol of symbols) {
        const volumeData = await get24hrVolume(symbol);
        if (volumeData !== null) {
            prevVolumes[symbol] = volumeData;
        }
    }

    // İlk yukleme tamamlandıktan sonra mesaj gönder
    await sendMessageToTelegram('Başlangıç hacimleri alındı ve izlemeye başlandı.');
}

// Sembollerin işlem hacimlerini al
initializePrevVolumes();

// Her 20 saniyede bir kontrolü gerçekleştiirir. Fonksiyon aralıgı burada gelirlenir
setInterval(checkVolumeChanges, 20000);
