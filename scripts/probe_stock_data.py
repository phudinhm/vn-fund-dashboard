"""Temporary probe #3: CafeF raw vs adjusted closes and event lists."""
import json, urllib.request, urllib.error

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

def call(url, extra=None):
    h = {'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://s.cafef.vn/', 'X-Requested-With': 'XMLHttpRequest'}
    h.update(extra or {})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')[:300]
    except Exception as e:
        return 0, str(e)

base = 'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx'
for q in [
    'Symbol=HPG&StartDate=01/11/2021&EndDate=15/11/2021&PageIndex=1&PageSize=5',
    'symbol=HPG&StartDate=01/11/2021&EndDate=15/11/2021&PageIndex=1&PageSize=5',
    'Symbol=HPG&StartDate=2021-11-01&EndDate=2021-11-15&PageIndex=1&PageSize=5',
]:
    st, txt = call(f'{base}?{q}')
    print('CAFEF', q[:40], st, txt[:900].replace('\n', ' '))

for name, url in [
    ('cafef-events', 'https://s.cafef.vn/Ajax/PageNew/EventCalendar.ashx?Symbol=HPG'),
    ('cafef-div', 'https://s.cafef.vn/Ajax/Events_RelateNews.aspx?Symbol=HPG&PageIndex=1&PageSize=20&Type=1'),
    ('cafef-lich-su-su-kien', 'https://s.cafef.vn/Ajax/PageNew/DataHistory/EventHistory.ashx?Symbol=HPG&PageIndex=1&PageSize=20'),
    ('vnd-dividend', 'https://finfo-api.vndirect.com.vn/v4/events?q=code:HPG&size=20&sort=effectiveDate:desc'),
    ('vnd-events2', 'https://finfo-api.vndirect.com.vn/v4/events?q=locale:VN~code:HPG&size=20&sort=effectiveDate:desc'),
    ('vnd-prices', 'https://finfo-api.vndirect.com.vn/v4/stock_prices?q=code:HPG~date:gte:2021-11-01~date:lte:2021-11-15&size=5&sort=date'),
]:
    st, txt = call(url, {'Referer': 'https://dstock.vndirect.com.vn/', 'Origin': 'https://dstock.vndirect.com.vn'})
    print(name, st, txt[:900].replace('\n', ' '))
