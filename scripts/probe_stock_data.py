"""Temporary probe #2: raw vs adjusted closes, and candidate corporate-action feeds."""
import json, time, urllib.request, urllib.error
from datetime import datetime, timezone

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

def call(url, body=None, extra=None):
    h = {'User-Agent': UA, 'Accept': 'application/json, text/plain, */*'}
    if body is not None:
        h['Content-Type'] = 'application/json'
    h.update(extra or {})
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')[:200]
    except Exception as e:
        return 0, str(e)

VCI = {'Origin': 'https://trading.vietcap.com.vn', 'Referer': 'https://trading.vietcap.com.vn/'}
for sym, probe_dates in [('HPG', ['2021-11-11', '2021-11-12', '2020-06-30', '2015-06-30']),
                         ('VNM', ['2018-06-29', '2020-01-02', '2015-06-30']),
                         ('FPT', ['2021-06-30', '2019-06-28'])]:
    st, txt = call('https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart',
                   {'timeFrame': 'ONE_DAY', 'symbols': [sym], 'countBack': 4200, 'to': int(time.time()) + 86400}, VCI)
    b = json.loads(txt)[0]
    px = {datetime.fromtimestamp(int(t) + 7 * 3600, tz=timezone.utc).strftime('%Y-%m-%d'): c for t, c in zip(b['t'], b['c'])}
    print(sym, {d: px.get(d) for d in probe_dates})

sym = 'HPG'
cands = [
    ('tcbs-div', f'https://apipubaws.tcbs.com.vn/tcanalysis/v1/company/{sym}/dividend-payment-histories?page=0&size=100', {'Origin': 'https://tcinvest.tcbs.com.vn', 'Referer': 'https://tcinvest.tcbs.com.vn/'}),
    ('tcbs-events', f'https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/{sym}/events-news?page=0&size=50', {'Origin': 'https://tcinvest.tcbs.com.vn'}),
    ('vci-iq-events', f'https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{sym}/events?page=0&size=20', VCI),
    ('vci-iq-dividend', f'https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/{sym}/dividend', VCI),
    ('ssi-dividend', f'https://iboard-api.ssi.com.vn/statistics/company/dividend?symbol={sym}&page=1&pageSize=50', {'Origin': 'https://iboard.ssi.com.vn', 'Referer': 'https://iboard.ssi.com.vn/'}),
    ('ssi-events', f'https://iboard-api.ssi.com.vn/statistics/company/corporate-actions?symbol={sym}&page=1&pageSize=50', {'Origin': 'https://iboard.ssi.com.vn', 'Referer': 'https://iboard.ssi.com.vn/'}),
    ('cafef', f'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx?Symbol={sym}&StartDate=&EndDate=&PageIndex=1&PageSize=5', {}),
]
for name, url, extra in cands:
    st, txt = call(url, None, extra)
    print(name, st, txt[:700].replace('\n', ' '))
