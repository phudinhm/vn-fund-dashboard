"""
Update ETF prices, market indices and BTC.
Handles:
  1. ETFs (E1VFVN30, FUEVFVND, FUEDCMID...) via the VCI chart API (same source
     the vnstock library used; called directly since vnstock is no longer on PyPI)
  2. Mutual funds with different names on fmarket (DFVNCAF→DCAF, SSIVLGF→VLGF, MBBMFF→BMFF)
  3. Funds not on fmarket at all (PRULINK, VSF, TCFIN, TCSME) — skipped with warning

Usage:  python -X utf8 scripts/update_vnstock.py
"""

import json
import os
import sys
import time
import urllib.request
import pandas as pd
from datetime import datetime, timedelta, timezone

# ─── Config ────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# ETFs — lấy giá chứng khoán qua API biểu đồ VCI
ETF_FUNDS = ['E1VFVN30', 'FUEVFVND', 'FUEDCMID', 'FUESSVFL', 'FUEVN100', 'FUESSV50']

# Chỉ số thị trường — dùng làm benchmark so sánh với quỹ. Cùng nguồn VCI
# như ETF, nhưng KHÔNG nhân 1000: giá ETF trả về đơn vị nghìn đồng, còn điểm chỉ
# số đã là con số thật (vd VNINDEX ~1.200), nhân lên sẽ sai một bậc.
INDEX_SYMBOLS = ['VNINDEX', 'VN30', 'VN100']



# ─── Helpers ───────────────────────────────────────────────

def get_last_date(csv_path):
    """Read the last date from a CSV file."""
    if not os.path.exists(csv_path):
        return None
    df = pd.read_csv(csv_path)
    if df.empty:
        return None
    return str(df['date'].iloc[-1])


def append_to_csv(csv_path, new_df):
    """Append new rows to existing CSV (date,price format)."""
    if new_df.empty:
        return 0
    existing = pd.read_csv(csv_path)
    last_date = str(existing['date'].iloc[-1]) if not existing.empty else ''

    # Only keep rows strictly after last_date
    new_df = new_df[new_df['date'] > last_date].copy()
    if new_df.empty:
        return 0

    # Ensure file ends with newline before appending
    with open(csv_path, 'rb') as f:
        f.seek(-1, 2)
        needs_newline = f.read(1) != b'\n'

    with open(csv_path, 'a', newline='') as f:
        if needs_newline:
            f.write('\n')
        new_df.to_csv(f, header=False, index=False, lineterminator='\n')

    return len(new_df)


# ─── VCI price history (direct HTTP, replaces vnstock Quote) ───

VCI_CHART_URL = 'https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart'
VN_UTC_OFFSET_SECONDS = 7 * 3600


def parse_vci_bars(payload):
    """Turn a gap-chart response into a DataFrame with `time` (date) and `close`.

    The API returns one object per symbol holding parallel arrays
    (o/h/l/c/v/t), with `t` as epoch seconds. Adding the +7h Vietnam offset
    before taking the date gives the trading day whether the bar is stamped at
    local or UTC midnight.
    """
    if not payload:
        return pd.DataFrame(columns=['time', 'close'])
    bars = payload[0]
    closes = bars.get('c') or []
    stamps = bars.get('t') or []
    if not closes or len(closes) != len(stamps):
        return pd.DataFrame(columns=['time', 'close'])
    dates = [
        datetime.fromtimestamp(int(t) + VN_UTC_OFFSET_SECONDS, tz=timezone.utc).strftime('%Y-%m-%d')
        for t in stamps
    ]
    return pd.DataFrame({'time': dates, 'close': [float(c) for c in closes]})


def fetch_vci_history(symbol, start, max_retries=3):
    """Daily closes for `symbol` from `start` (YYYY-MM-DD) up to today."""
    days_back = (datetime.now() - datetime.strptime(start, '%Y-%m-%d')).days + 5
    body = json.dumps({
        'timeFrame': 'ONE_DAY',
        'symbols': [symbol],
        'countBack': max(days_back, 5),
        'to': int(time.time()) + 86400,
    }).encode()
    req = urllib.request.Request(VCI_CHART_URL, data=body, headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://trading.vietcap.com.vn',
        'Referer': 'https://trading.vietcap.com.vn/',
        'User-Agent': 'Mozilla/5.0 (VN-Funds-Dashboard updater)',
    })
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode())
            df = parse_vci_bars(payload)
            return df[df['time'] >= start].reset_index(drop=True)
        except Exception:
            if attempt == max_retries:
                raise
            time.sleep(2 ** attempt)


# ─── ETF update via VCI ───────────────────────────────────

def update_etf(symbol):
    """Update ETF price data via the VCI chart API."""
    csv_path = os.path.join(DATA_DIR, f'{symbol}.csv')
    last_date = get_last_date(csv_path)

    if last_date:
        start = (datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
    else:
        start = '2014-01-01'
    end = datetime.now().strftime('%Y-%m-%d')

    if start > end:
        print(f'  ✅ {symbol}: already up to date (last: {last_date})')
        return True

    try:
        df = fetch_vci_history(symbol, start)

        if df is None or df.empty:
            print(f'  ✅ {symbol}: no new data available (last: {last_date})')
            return True

        # fetch_vci_history returns: time, close
        df_filtered = df[['time', 'close']].copy()
        df_filtered = df_filtered.rename(columns={'time': 'date', 'close': 'price'})
        df_filtered['date'] = pd.to_datetime(df_filtered['date']).dt.strftime('%Y-%m-%d')

        # VCI price is in 1000 VND → multiply by 1000
        df_filtered['price'] = (df_filtered['price'] * 1000).astype(int)

        df_filtered = df_filtered.sort_values('date').reset_index(drop=True)

        count = append_to_csv(csv_path, df_filtered)
        if count > 0:
            new_last = df_filtered['date'].iloc[-1]
            print(f'  📈 {symbol}: +{count} rows ({last_date or "start"} → {new_last})')
        else:
            print(f'  ✅ {symbol}: already up to date (last: {last_date})')

        return True

    except Exception as e:
        print(f'  ❌ {symbol}: {e}')
        return False


# ─── Index update via VCI (benchmark: VNINDEX, VN30, VN100) ───

def update_index(symbol):
    """Update market index point data via the VCI chart API.

    Same fetch path as update_etf(), except index points are NOT multiplied
    by 1000 — VCI returns them as the real point value already, unlike stock/
    ETF closes which come in thousands of VND.
    """
    csv_path = os.path.join(DATA_DIR, f'{symbol}.csv')
    last_date = get_last_date(csv_path)

    if last_date:
        start = (datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
    else:
        start = '2014-01-01'
    end = datetime.now().strftime('%Y-%m-%d')

    if start > end:
        print(f'  ✅ {symbol}: already up to date (last: {last_date})')
        return True

    try:
        df = fetch_vci_history(symbol, start)

        if df is None or df.empty:
            print(f'  ✅ {symbol}: no new data available (last: {last_date})')
            return True

        df_filtered = df[['time', 'close']].copy()
        df_filtered = df_filtered.rename(columns={'time': 'date', 'close': 'price'})
        df_filtered['date'] = pd.to_datetime(df_filtered['date']).dt.strftime('%Y-%m-%d')
        df_filtered['price'] = df_filtered['price'].round(2)

        df_filtered = df_filtered.sort_values('date').reset_index(drop=True)

        count = append_to_csv(csv_path, df_filtered)
        if count > 0:
            new_last = df_filtered['date'].iloc[-1]
            print(f'  📈 {symbol}: +{count} rows ({last_date or "start"} → {new_last})')
        else:
            print(f'  ✅ {symbol}: already up to date (last: {last_date})')

        return True

    except Exception as e:
        print(f'  ❌ {symbol}: {e}')
        return False


# ─── BTC/VND via CoinGecko ───────────────────────────────

def update_btc_vnd():
    """Update BTC/VND price data using CoinGecko free API (direct BTC→VND).

    Returns True on success or already-up-to-date, False on failure.
    Retries up to 3 times with exponential backoff to handle transient
    rate limits or network errors from GitHub Actions shared IPs.
    """
    import urllib.request
    import json
    import time

    csv_path = os.path.join(DATA_DIR, 'BTC.csv')
    last_date = get_last_date(csv_path)

    if not last_date:
        print(f'  ❌ BTC: CSV file not found, need initial data file')
        return False

    # Calculate days since last update
    last_dt = datetime.strptime(last_date, '%Y-%m-%d')
    days_diff = (datetime.now() - last_dt).days

    if days_diff <= 0:
        print(f'  ✅ BTC: already up to date (last: {last_date})')
        return True

    # CoinGecko free API: market_chart returns daily prices for last N days.
    # Use days_diff + 2 to ensure overlap, then filter by date.
    # Note: for days <= 90 the API returns hourly granularity regardless of
    # interval param. We dedup by date (keep last) to get one price per day.
    days_to_fetch = min(days_diff + 2, 365)

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            url = (
                f'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart'
                f'?vs_currency=vnd&days={days_to_fetch}'
            )
            req = urllib.request.Request(url, headers={
                'Accept': 'application/json',
                'User-Agent': 'VN-Funds-Dashboard/1.0',
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())

            prices = data.get('prices', [])
            if not prices:
                print(f'  ⚠️  BTC: CoinGecko returned empty prices list')
                return True

            # CoinGecko returns [[timestamp_ms, price], ...]
            rows = []
            for ts_ms, price in prices:
                date_str = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime('%Y-%m-%d')
                rows.append({'date': date_str, 'price': int(round(price))})

            df = (pd.DataFrame(rows)
                    .drop_duplicates(subset='date', keep='last')
                    .sort_values('date')
                    .reset_index(drop=True))

            count = append_to_csv(csv_path, df)
            if count > 0:
                new_last = df['date'].iloc[-1]
                print(f'  📈 BTC: +{count} rows ({last_date} → {new_last})')
            else:
                print(f'  ✅ BTC: already up to date (last: {last_date})')
            return True

        except Exception as e:
            wait = 2 ** attempt  # 2s, 4s, 8s
            if attempt < max_retries:
                print(f'  ⚠️  BTC attempt {attempt}/{max_retries} failed: {e}. Retrying in {wait}s...')
                time.sleep(wait)
            else:
                print(f'  ❌ BTC: all {max_retries} attempts failed. Last error: {e}')
                return False


# ─── Main ─────────────────────────────────────────────────

def main():
    print(f'\n🚀 Price Updater — {datetime.now().strftime("%Y-%m-%d %H:%M")}\n')

    # ── 1. ETFs ──
    print('📊 Updating ETFs via VCI...')
    etf_failures = []
    for symbol in ETF_FUNDS:
        if not update_etf(symbol):
            etf_failures.append(symbol)
    print()

    # ── 2. Market indices (benchmark) ──
    print('📈 Updating market indices via VCI...')
    index_failures = []
    for symbol in INDEX_SYMBOLS:
        if not update_index(symbol):
            index_failures.append(symbol)
    print()

    # ── 3. BTC/VND ──
    print('₿  Updating Bitcoin (BTC/VND) via CoinGecko...')
    btc_ok = update_btc_vnd()
    print()

    if etf_failures or index_failures or not btc_ok:
        if etf_failures:
            print(f'❌ ETF update failed for: {", ".join(etf_failures)}')
        if index_failures:
            print(f'❌ Index update failed for: {", ".join(index_failures)}')
        if not btc_ok:
            print('❌ BTC update failed.')
        print('Exiting with error so GitHub Actions alerts.\n')
        sys.exit(1)

    print('✅ Done!\n')


if __name__ == '__main__':
    main()
