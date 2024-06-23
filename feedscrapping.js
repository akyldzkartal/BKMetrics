const puppeteer = require('puppeteer');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7492705293:AAEHO0Mnw9M85dEKfsJjKeta7AMN230LFvs';
const TELEGRAM_CHAT_ID = '-1002181900472';

// Telegram mesaj gonderme fonksiyonu
async function sendMessageToTelegram(message) {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message
            }
        );
        console.log('Telegram mesajı gönderildi:', response.data);
    } catch (error) {
        console.error('Telegram mesajı gönderme hatası:', error.message);
    }
}

//  Siteden veri cekme 
const scrape = async () => {
    const url = 'https://news.treeofalpha.com';
    const cssSelector = '#twitterFeed > div > div > div > div:nth-child(1) > div > div > div:nth-child(2) > h2 > a'; // twitter kismi
    // const cssSelector = '#wrapperSplitter > div > div:nth-child(2) > div > div > div:nth-child(1) > div > div > div:nth-child(2) > h2 > a'; (nEWS kismi)

    try {
        const browser = await puppeteer.launch({ 
            headless: false,
        });
        const page = await browser.newPage();
        await page.goto(url);
        
        // css ile path bulma ve timeout suresi
        await page.waitForSelector(cssSelector, { visible: false, timeout: 60000 });

        // text contenti alma
        const text = await page.evaluate(() => {
            const element = document.querySelector('#twitterFeed > div > div > div > div:nth-child(1) > div > div > div:nth-child(2) > h2 > a');
            return element ? element.textContent.trim() : null;
        });

        if (text) {
            console.log('🚨⏰:', text);
            await sendMessageToTelegram(`🚨⏰: ${text}`); // telegrama mesaj gönder
        } else {
            console.log('Element bulunamadı');
        }
        
    } catch (error) {
        console.error('Scraping sırasında hata oluştu:', error);
    }
}

scrape();
