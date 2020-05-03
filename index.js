const SocksAgent = require('socks5-https-client/lib/Agent');

const socksAgent = new SocksAgent({
    socksHost: '148.251.234.93',
    socksPort: 1080,
    // socksUsername: ,
    // socksPassword: ,
});
require('dotenv').config();
const Telegraf = require('telegraf');

// const Extra = require('telegraf/extra');

const Markup = require('telegraf/markup');

const bot = new Telegraf(
    process.env.BOT_TOKEN, { telegram: { agent: socksAgent } }
);

async function ATIparse(cityLoad, radLoad) {
    try {
        let request = {};
        const puppeteer = require('puppeteer');
        async function parse() {
            try {
                const browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();
                await page.goto('https://loads.ati.su/');
                await page.type('#weightTo', '11', { delay: 0 });
                await page.type('#volumeTo', '45', { delay: 0 });
                await page.click('.extra-params-payment .toggle');
                await page.waitForSelector(".search-load-params-row");
                await page.evaluate(() => {
                    document.querySelector("#extraParam2").parentElement.click();
                    document.querySelector("#extraParam10").parentElement.click();
                    document.querySelector("#extraParam4").parentElement.click();
                    document.querySelector("#extraParam12").parentElement.click();
                    document.querySelector("#loadingTypeFav1").click();
                    document.querySelector("#truckTypeFav0").parentElement.click();
                    document.querySelector("#truckTypeFav1").parentElement.click();
                    document.querySelector("#truckTypeFav3").parentElement.click();
                });
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
                }).catch(function (error) {
                    console.error('Search failed:', error);
                });
                await page.click(`#${id}`);
                await page.type('#fromRadius', radLoad, { delay: 0 });
                await page.click(`.search-form-button`);
                await page.waitForSelector('.grid-row');
                let result = {};
                await page.evaluate(() => { time = document.querySelector('.grid-row').querySelector('.load-date-cell span b').innerText; return time })
                    .then((time => { result.time = time; console.log(time) }))
                    .catch(() => { result.time = 'не указано' });
                await page.evaluate(() => { noNds = document.querySelector('.grid-row').querySelector('div[data-bo-if="e.rate.priceNoNds > 0"] span').innerText; return noNds })
                    .then((noNds => { result.noNds = noNds; console.log(noNds) }))
                    .catch(() => { result.noNds = 'не указано' });
                await page.evaluate(() => { cash = document.querySelector('.grid-row').querySelector('div[data-bo-if="e.rate.price > 0"] .rate-bold').innerText; return cash })
                    .then((cash => { result.cash = cash; console.log(cash) }))
                    .catch(() => { result.cash = 'не указано' });
                await page.evaluate(() => { unloadCity = document.querySelector('.grid-row').querySelector('span[data-bo-text="e.unloading.location.city"]').innerText; return unloadCity })
                    .then((unloadCity => { result.unloadCity = unloadCity }))
                    .catch(() => { result.unloadCity = 'не указано'; console.log(unloadCity) });
                await page.evaluate(() => { loadCity = document.querySelector('.grid-row').querySelector('span[data-bo-text="e.loading.location.city"]').innerText; return loadCity })
                    .then((loadCity => { result.loadCity = loadCity; console.log(loadCity) }))
                    .catch(() => { result.loadCity = 'не указано' });
                await page.evaluate(() => { distance = document.querySelector('.grid-row').querySelector('a[data-bo-href="e.route.distanceLink"]').innerText; return distance })
                    .then((distance => { result.distance = distance; console.log(distance) }))
                    .catch(() => { result.distance = 'не указано' });
                await page.evaluate(() => { loadDate = document.querySelector('.grid-row').querySelector('.loading-dates').innerText; return loadDate })
                    .then((loadDate => { result.loadDate = loadDate; console.log(loadDate) }))
                    .catch(() => { result.loadDate = 'не указано' });
                await browser.close();
                return result
            } catch (error) {
                console.error(error);
                throw error;
            }
        };
        request = await parse();
        return request;
    } catch (e) {
        console.log(e);
    }
}

let unloadCity;
let pars;
let time;

bot.hears('Закончить поиск', (ctx) => {
    clearInterval(pars);
    ctx.reply('Поиск завершен. Для дальнешего использования введи: "[ГОРОД] [РАССТОЯНИЕ]"');
});

bot
    .start((ctx) =>
        ctx.reply(
            `Привет, ${ctx.message.from.first_name}! Для начала поиска груза напиши: "[ГОРОД] [РАССТОЯНИЕ]"`
        )
    )
    .on('text', (ctx) => {
        // pars = setInterval(() => {
        (async () => {
            try {
                const data = ctx.message.text.split(' ');
                let newReq = {};
                unloadCity = 'начало';
                time = 'начало';
                newReq = await ATIparse(data[0], data[1]);
                ctx.reply(
                    `Город загрузки: ${newReq.loadCity}\nГород выгрузки: ${newReq.unloadCity}\nРасстояние: ${newReq.distance}\nДата загрузки: ${newReq.loadDate}\nНал: ${newReq.cash}\nБез НДС: ${newReq.noNds}`,
                    Markup.keyboard(['Закончить поиск']).oneTime().resize().extra()
                );
            } catch (e) { console.log(e) }
        })()
        // }, 30000)
    });


bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.launch();

