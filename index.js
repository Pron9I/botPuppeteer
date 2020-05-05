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
    process.env.BOT_TOKEN
    // , { telegram: { agent: socksAgent } }
);

async function ATIparse(cityLoad, radLoad, rate) {
    try {
        let request = {};
        const puppeteer = require('puppeteer');
        async function parse() {
            try {
                const browser = await puppeteer.launch({ 'args': ['--no-sandbox', '--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.setDefaultNavigationTimeout(0);
                await page.goto('https://loads.ati.su/');
                await page.type('#weightTo', '11', { delay: 0 });
                await page.type('#volumeTo', '45', { delay: 0 });
                await page.click('.extra-params-payment .toggle');
                await page.waitForSelector(".search-load-params-row");
                await page.evaluate(() => {
                    document.querySelector("#extraParam10").parentElement.click();
                    document.querySelector("#extraParam4").parentElement.click();
                    document.querySelector("#extraParam12").parentElement.click();
                    document.querySelector("#loadingTypeFav1").click();
                    document.querySelector("#truckTypeFav0").parentElement.click();
                    document.querySelector("#truckTypeFav1").parentElement.click();
                    document.querySelector("#truckTypeFav3").parentElement.click();
                });
                await page.type('#from', `${cityLoad} `, { delay: 500 });
                await page.waitForSelector('.dropdown-menu');
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
                await page.type('#fromRadius', radLoad, { delay: 500 });
                await page.click(`.search-form-button`);
                await page.waitForSelector('.grid-row');
                let row = await page.evaluate((rating) => {
                    let requests = document.querySelectorAll(".grid-body .grid-row");
                    let i = 0;
                    for (let request of requests) {
                        if (request.querySelector('div[data-bo-if="e.rate.price > 0"] .rate-bold') != null) {
                            let cash = request.querySelector('div[data-bo-if="e.rate.price > 0"] .rate-bold').innerText
                            cash = cash.split(' ').slice(0, -1).join('')
                            let dist = request.querySelector('a[data-bo-href="e.route.distanceLink"]').innerText
                            dist = dist.split(' ').slice(0, -1).join('')
                            if ((cash / dist) >= rating) break
                            i++;
                        } else if (request.querySelector('div[data-bo-if="e.rate.priceNoNds > 0"] span') != null) {
                            let noNds = request.querySelector('div[data-bo-if="e.rate.priceNoNds > 0"] span span').innerText
                            noNds = noNds.split(' ').slice(0, -1).join('')
                            let dist = request.querySelector('a[data-bo-href="e.route.distanceLink"]').innerText
                            dist = dist.split(' ').slice(0, -1).join('')
                            if ((noNds / dist) >= rating) break
                            i++;
                        }
                    }
                    return Promise.resolve(i);
                }, rate);
                console.log(row);
                let result = {};
                await page.evaluate((row) => { time = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('.load-date-cell span b').innerText; return time }, row)
                    .then((time => { result.time = time; console.log(time) }))
                    .catch(() => { result.time = 'не указано' });
                await page.evaluate((row) => { noNds = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('div[data-bo-if="e.rate.priceNoNds > 0"] span').innerText; return noNds }, row)
                    .then((noNds => { result.noNds = noNds; console.log(noNds) }))
                    .catch(() => { result.noNds = 'не указано' });
                await page.evaluate((row) => { cash = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('div[data-bo-if="e.rate.price > 0"] .rate-bold').innerText; return cash }, row)
                    .then((cash => { result.cash = cash; console.log(cash) }))
                    .catch(() => { result.cash = 'не указано' });
                await page.evaluate((row) => { unloadCity = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('span[data-bo-text="e.unloading.location.city"]').innerText; return unloadCity }, row)
                    .then((unloadCity => { result.unloadCity = unloadCity }))
                    .catch(() => { result.unloadCity = 'не указано'; console.log(unloadCity) });
                await page.evaluate((row) => { loadCity = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('span[data-bo-text="e.loading.location.city"]').innerText; return loadCity }, row)
                    .then((loadCity => { result.loadCity = loadCity; console.log(loadCity) }))
                    .catch(() => { result.loadCity = 'не указано' });
                await page.evaluate((row) => { distance = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('a[data-bo-href="e.route.distanceLink"]').innerText; return distance }, row)
                    .then((distance => { result.distance = distance; console.log(distance) }))
                    .catch(() => { result.distance = 'не указано' });
                await page.evaluate((row) => { loadDate = document.querySelectorAll('.grid-body .grid-row')[row].querySelector('.loading-dates').innerText; return loadDate }, row)
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

let pars;
let unloadCity = 'начало';
let time = 'начало';

bot.hears('Закончить поиск', (ctx) => {
    clearInterval(pars);
    ctx.reply('Поиск завершен. Для дальнешего использования введи: "[ГОРОД] [РАДИУС ПОИСКА] [СТАВКА(руб/км)]"');
});

bot
    .start((ctx) =>
        ctx.reply(
            `Привет, ${ctx.message.from.first_name}! Для начала поиска груза напиши: "[ГОРОД] [РАДИУС ПОИСКА] [СТАВКА(руб/км)]"`
        )
    )
    .on('text', (ctx) => {
        pars = setInterval(() => {
            (async () => {
                try {
                    const data = ctx.message.text.split(' ');
                    let newReq = {};
                    newReq = await ATIparse(data[0], data[1], data[2]);
                    if (newReq.unloadCity != unloadCity || newReq.time != time || unloadCity === 'начало') {
                        ctx.reply(
                            `Город загрузки: ${newReq.loadCity}\nГород выгрузки: ${newReq.unloadCity}\nРасстояние: ${newReq.distance}\nДата загрузки: ${newReq.loadDate}\nНал: ${newReq.cash}\nБез НДС: ${newReq.noNds}`,
                            Markup.keyboard(['Закончить поиск']).oneTime().resize().extra()
                        )
                    };
                    if (newReq.unloadCity != undefined) { unloadCity = newReq.unloadCity; time = newReq.time };
                } catch (e) { console.log(e) }
            })()
        }, 45000)
    });


bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.launch();

