const SocksAgent = require('C:/Users/GOD/bot/node_modules/socks5-https-client/lib/Agent');

const socksAgent = new SocksAgent({
    socksHost: '188.241.45.61',
    socksPort: 4145,
    //   // socksUsername: ,
    //   // socksPassword: ,
});
require('dotenv').config();
const HttpsProxyAgent = require('https-proxy-agent');
const Telegraf = require('telegraf');
var tunnel = require('tunnel');

// const Extra = require('telegraf/extra');

const Markup = require('telegraf/markup');

const bot = new Telegraf(
    process.env.BOT_TOKEN
    , { telegram: { agent: socksAgent } }
);

function ATIparse(cityLoad, radLoad) {
    let request = {};
    const puppeteer = require('puppeteer');
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://loads.ati.su/');
        await page.type('#weightTo', 11, { delay: 0 });
        await page.type('#volumeTo', 11, { delay: 0 });
        await page.click('#extraParam2');
        await page.click('#extraParam10');
        await page.click('#extraParam4');
        await page.click('#extraParam12');
        await page.click('#loadingTypeFav1');
        await page.click('#truckTypeFav0');
        await page.click('#truckTypeFav1');
        await page.click('#truckTypeFav3');
        await page.click('#truckTypeFav4');
        await page.click('#truckTypeFav0');
        await page.type('#from', cityLoad, { delay: 500 });
        const id = await page.evaluate(() => {
            let city = document.querySelectorAll('.dropdown-menu li')[0].querySelector('.ng-binding').innerText
            if (!city.includes('регион') && !city.includes('край')) {
                return Promise.resolve(document.querySelectorAll('.dropdown-menu li')[0].id);
            }
            city = document.querySelectorAll('.dropdown-menu li')[1].querySelector('.ng-binding').innerText
            if (!city.includes('регион') && !city.includes('край')) {
                return Promise.resolve(document.querySelectorAll('.dropdown-menu li')[1].id);
            } else {
                return Promise.resolve(document.querySelectorAll('.dropdown-menu li')[2].id);
            }
        })
        await page.click(id);
        await page.type('#fromRadius', radLoad, { delay: 0 });
        await page.click(`.search-form-button`);
        await page.evaluate(() => { setTimeout(() => { }, 5000) });
        request = await page.evaluate(() => {
            let result = {};
            result.time = document.querySelector('.grid-row').querySelector('.load-date-cell span b').innerText;
            result.noNds = document.querySelector('.grid-row').querySelector('div[data-bo-if="e.rate.priceNoNds > 0"] span').innerText;
            result.cash = document.querySelector('.grid-row').querySelector('div[data-bo-if="e.rate.price > 0"] .rate-bold').innerText;
            result.unloadCity = document.querySelector('.grid-row').querySelector('span[data-bo-text="e.unloading.location.city"]').innerText;
            result.loadCity = document.querySelector('.grid-row').querySelector('span[data-bo-text="e.loading.location.city"]').innerText;
            result.distance = document.querySelector('.grid-row').querySelector('a[data-bo-href="e.route.distanceLink"]').innerText;
            result.loadDate = document.querySelector('.grid-row').querySelector('.loading-dates').innerText;
            return Promise.resolve(result)
        })
        await browser.close();
    })();
    return request;
}

let unloadCity;
let parsing;
let message;
let time;

bot.hears('Закончить поиск', (ctx) => {
    // clearInterval(parsing); clearInterval(message);
    ctx.reply('Поиск завершен. Для дальнешего использования введи: "[ГОРОД] [РАССТОЯНИЕ]"');
});

bot
    .start((ctx) =>
        ctx.reply(
            `Привет, ${ctx.message.from.first_name}! Для начала поиска груза напиши: "[ГОРОД] [РАССТОЯНИЕ]"`
        )
    )
    .on('text', (ctx) => {
        const data = ctx.message.text.split(' ');
        let newReq = {};
        unloadCity = 'начало';
        time = 'начало';
        newReq = ATIparse(data[0], data[1])
        setTimeout(() => {
            ctx.reply(
                `Город загрузки: ${newReq.loadCity}\nГород выгрузки: ${newReq.unloadCity}\nРасстояние: ${newReq.distance}\nДата загрузки: ${newReq.loadDate}\nНал: ${newReq.cash}\nБез НДС: ${newReq.noNds}`,
                Markup.keyboard(['Закончить поиск']).oneTime().resize().extra()
            );
        }, 25000);
    });


bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.launch();

