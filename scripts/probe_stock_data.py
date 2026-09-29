"""Temporary probe: are VCI daily closes raw or adjusted, and what does the TCBS dividend feed look like?"""
import json, time, urllib.request

def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={
        'Content-Type': 'application/json', 'Origin': 'https://trading.vietcap.com.vn',
        'Referer': 'https://trading.vietcap.com.vn/', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def closes(sym, count=4000):
    d = post('https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart', {
        'timeFrame': 'ONE_DAY', 'symbols': [sym], 'countBack': count, 'to': int(time.time()) + 86400})
    b = d[0]
    from datetime import datetime, timezone
    return {datetime.fromtimestamp(int(t) + 7 * 3600, tz=timezone.utc).strftime('%Y-%m-%d'): c for t, c in zip(b['t'], b['c'])}, list(b.keys())

for sym in ['HPG', 'VNM']:
    print('=====', sym)
    try:
        px, keys = closes(sym)
        dates = sorted(px)
        print('bars', len(dates), dates[0], dates[-1], 'keys', keys, 'last', px[dates[-1]])
    except Exception as e:
        print('VCI failed', e); continue
    for url in [
        f'https://apipubaws.tcbs.com.vn/tcanalysis/v1/company/{sym}/dividend-payment-histories?page=0&size=100',
        f'https://apipubaws.tcbs.com.vn/tcanalysis/v1/company/{sym}/events-news?page=0&size=50',
    ]:
        try:
            ev = get(url)
            print('EVENTS OK', url.split('/')[-1][:40], json.dumps(ev, ensure_ascii=False)[:1500])
            rows = ev.get('listDividendPaymentHis') or ev.get('data') or []
            for r in rows:
                if str(r.get('issueMethod', '')).lower() in ('share', 'stock', 'bonus') or 'share' in json.dumps(r).lower():
                    print('  stock-like event', json.dumps(r, ensure_ascii=False))
                    ex = r.get('exerciseDate') or r.get('exDate')
                    print('  ex-date field', ex)
                    break
        except Exception as e:
            print('EVENTS FAIL', url.split('/')[-1][:40], e)
