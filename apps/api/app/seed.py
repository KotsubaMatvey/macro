import json

from .cache import get_redis
from .db import apply_migrations, get_connection
from .security import hash_password
from .services import reset_demo_jobs

def seed_demo_database():
    client = get_redis()
    if client:
        client.flushdb()
    apply_migrations()
    with get_connection() as conn:
        with conn.cursor() as cur:
            for table in ['post_likes', 'comments', 'posts', 'alert_deliveries', 'alerts', 'watchlist_items', 'watchlists', 'news_items', 'briefings', 'market_bias_rationales', 'market_bias_snapshots', 'regime_components', 'regime_snapshots', 'event_reaction_windows', 'event_release_assets', 'events', 'event_families', 'assets', 'sessions', 'password_reset_tokens', 'email_verification_tokens', 'profiles', 'feature_flags', 'audit_logs', 'ingestion_jobs', 'users']:
                cur.execute(f'delete from {table}')

            users = [
                ('user-demo', 'demo@northstarmacro.local', hash_password('demo12345'), 'user', 'Mara Levin', '2026-03-01T08:00:00+00:00', True),
                ('user-analyst', 'analyst@northstarmacro.local', hash_password('analyst12345'), 'analyst', 'Elena Park', '2026-03-01T08:00:00+00:00', True),
                ('user-admin', 'admin@northstarmacro.local', hash_password('admin12345'), 'admin', 'Ibrahim Shah', '2026-03-01T08:00:00+00:00', True),
            ]
            for row in users:
                cur.execute('insert into users (id, email, password_hash, role, name, email_verified_at, onboarding_completed) values (%s, %s, %s, %s, %s, %s, %s)', row)
            profiles = [
                ('user-demo', 'macro', 'Europe/Moscow', 'Global', 'dense', 'Event driven macro trader.', 'pro'),
                ('user-analyst', 'research', 'America/New_York', 'US', 'dense', 'Cross asset analyst.', 'team'),
                ('user-admin', 'ops', 'Europe/London', 'Global', 'dense', 'Platform operator.', 'team'),
            ]
            for row in profiles:
                cur.execute('insert into profiles (user_id, desk, timezone, region, density, bio, subscription_plan) values (%s, %s, %s, %s, %s, %s, %s)', row)
            assets = [
                ('asset-spx', 'SPX', 'SPX Index', 'Equity Index', 'US', 'US large cap risk benchmark'),
                ('asset-dxy', 'DXY', 'US Dollar Index', 'FX', 'US', 'Broad USD strength'),
                ('asset-btc', 'BTC', 'Bitcoin', 'Crypto', 'Global', 'High beta liquidity proxy'),
                ('asset-xau', 'XAU', 'Gold Spot', 'Commodity', 'Global', 'Real yield hedge'),
                ('asset-us2y', 'US2Y', 'US 2Y Yield', 'Rates', 'US', 'Front end rates proxy'),
                ('asset-us10y', 'US10Y', 'US 10Y Yield', 'Rates', 'US', 'Duration benchmark'),
                ('asset-eurusd', 'EURUSD', 'Euro Dollar', 'FX', 'Europe', 'Major FX cross'),
                ('asset-dax', 'DAX', 'DAX Index', 'Equity Index', 'Europe', 'Euro area risk barometer'),
            ]
            for row in assets:
                cur.execute('insert into assets (id, symbol, name, class_name, region, description) values (%s, %s, %s, %s, %s, %s)', row)

            families = [
                ('family-cpi', 'us-cpi', 'US CPI', 'Inflation', 'United States', 'USD', 'High', 'Consumer price inflation release.', 'Inflation surprise reprices rates, dollar, and risk assets.'),
                ('family-nfp', 'us-payrolls', 'US Payrolls', 'Growth', 'United States', 'USD', 'High', 'Labor market release.', 'Payrolls shape growth and rates expectations.'),
                ('family-ecb', 'ecb-rate', 'ECB Rate Decision', 'Rates', 'Euro Area', 'EUR', 'High', 'Policy rate decision.', 'Guidance reprices Europe rates and euro crosses.'),
                ('family-pmi', 'us-ism', 'US ISM Manufacturing', 'Growth', 'United States', 'USD', 'Medium', 'Survey growth indicator.', 'Broad demand pulse and cyclicals check.'),
            ]
            for row in families:
                cur.execute('insert into event_families (id, slug, name, category, country, currency, importance, description, why_it_matters) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)', row)
            events = [
                ('event-cpi-mar', 'family-cpi', 'us-cpi-mar', 'US CPI March', 'Released', '2026-04-10T12:30:00+00:00', 3.1, 2.9, 2.8, -3.4, 'Cooler CPI extends soft landing pricing.', 'Front end yields eased and growth assets caught a bid.'),
                ('event-nfp-apr', 'family-nfp', 'us-payrolls-apr', 'US Payrolls April', 'Released', '2026-04-03T12:30:00+00:00', 210, 182, 195, 7.1, 'Payrolls still argue for resilient growth.', 'Cyclicals remain supported but rates stay two way.'),
                ('event-ecb-apr', 'family-ecb', 'ecb-rate-apr', 'ECB Rate Decision April', 'Upcoming', '2026-04-11T11:15:00+00:00', 3.5, 3.5, None, None, 'The next Europe catalyst for FX and duration.', 'Forward guidance remains the market driver.'),
                ('event-ism-apr', 'family-pmi', 'us-ism-apr', 'US ISM Manufacturing April', 'Upcoming', '2026-04-01T14:00:00+00:00', 50.3, 50.1, None, None, 'Survey growth tone shapes broad risk breadth.', 'Used as a secondary growth dimension input.'),
            ]
            for row in events:
                cur.execute('insert into events (id, family_id, slug, title, status, scheduled_at, previous_value, forecast_value, actual_value, surprise_pct, why_it_matters, narrative) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)', row)
            event_assets = [
                ('event-cpi-mar', 'asset-spx'), ('event-cpi-mar', 'asset-dxy'), ('event-cpi-mar', 'asset-xau'), ('event-cpi-mar', 'asset-btc'),
                ('event-nfp-apr', 'asset-spx'), ('event-nfp-apr', 'asset-us2y'), ('event-nfp-apr', 'asset-dxy'),
                ('event-ecb-apr', 'asset-eurusd'), ('event-ecb-apr', 'asset-dax'), ('event-ism-apr', 'asset-spx'),
            ]
            for row in event_assets:
                cur.execute('insert into event_release_assets (event_id, asset_id) values (%s, %s)', row)
            windows = [
                ('react-cpi-5m', 'event-cpi-mar', '5m', 0.18, 0.64, 'Rates and dollar lead the first move.'),
                ('react-cpi-1h', 'event-cpi-mar', '1h', 0.36, 0.69, 'Follow through appears when services cool.'),
                ('react-cpi-24h', 'event-cpi-mar', '24h', 0.88, 0.73, 'Risk tends to hold if real yields stay soft.'),
                ('react-nfp-5m', 'event-nfp-apr', '5m', 0.14, 0.58, 'Front end rates reset first.'),
                ('react-nfp-24h', 'event-nfp-apr', '24h', 0.44, 0.62, 'Equities keep strength if wage pressure does not accelerate.'),
            ]
            for row in windows:
                cur.execute('insert into event_reaction_windows (id, event_id, reaction_window, avg_move_pct, consistency, narrative) values (%s, %s, %s, %s, %s, %s)', row)

            cur.execute('insert into regime_snapshots (id, label, score, confidence, trend, interpretation, methodology, created_at) values (%s, %s, %s, %s, %s, %s, %s, %s)', ('regime-current', 'Expansionary', 0.42, 0.74, 'Improving', 'Growth stays resilient, inflation is cooling unevenly, and liquidity remains supportive.', 'Deterministic blend of growth, inflation, liquidity, rates, volatility, and dollar dimensions.', '2026-03-29T07:00:00+00:00'))
            regime_components = [('rc-growth', 'growth', 'Growth', 0.60), ('rc-inflation', 'inflation', 'Inflation', -0.10), ('rc-liquidity', 'liquidity', 'Liquidity', 0.30), ('rc-rates', 'rates', 'Rates', -0.20), ('rc-vol', 'volatility', 'Volatility', 0.10), ('rc-usd', 'usd', 'US Dollar', -0.05)]
            for component_id, key, label, value in regime_components:
                cur.execute('insert into regime_components (id, snapshot_id, key, label, value) values (%s, %s, %s, %s, %s)', (component_id, 'regime-current', key, label, value))
            bias_rows = [('bias-spx', 'asset-spx', 'Bullish', 68, 0.70, 4, 9), ('bias-dxy', 'asset-dxy', 'Neutral', 51, 0.58, -1, -3), ('bias-btc', 'asset-btc', 'Bullish', 63, 0.65, 5, 12), ('bias-xau', 'asset-xau', 'Bearish', 41, 0.61, -3, -7)]
            for row in bias_rows:
                cur.execute('insert into market_bias_snapshots (id, asset_id, direction, score, confidence, change_1d, change_5d) values (%s, %s, %s, %s, %s, %s, %s)', row)
            rationales = [('rat-spx-1', 'bias-spx', 'Soft landing breadth'), ('rat-spx-2', 'bias-spx', 'Liquidity impulse'), ('rat-dxy-1', 'bias-dxy', 'Rates divergence muted'), ('rat-btc-1', 'bias-btc', 'Liquidity beta'), ('rat-btc-2', 'bias-btc', 'ETF flow support'), ('rat-xau-1', 'bias-xau', 'Real yield pressure')]
            for row in rationales:
                cur.execute('insert into market_bias_rationales (id, snapshot_id, rationale) values (%s, %s, %s)', row)
            briefings = [
                ('brief-morning', 'morning-disinflation', 'Morning Briefing', 'Disinflation holds but rates remain two way', 'US data is soft enough to steady duration but not weak enough to break cyclical risk.', 'Morning desk note.', 'user-analyst', '2026-03-29T05:45:00+00:00', 'event-cpi-mar', json.dumps(['SPX', 'US10Y', 'BTC', 'XAU']), json.dumps(['SPX breadth remains constructive', 'Gold needs lower real yields', 'BTC still trades as liquidity beta'])),
                ('brief-post-cpi', 'post-cpi-soft-landing', 'Post Event Briefing', 'Cooler CPI extends the soft landing trade', 'Front end yields eased, the dollar softened, and growth assets regained momentum.', 'Post event note.', 'user-analyst', '2026-04-10T13:20:00+00:00', 'event-cpi-mar', json.dumps(['SPX', 'EURUSD', 'XAU']), json.dumps(['EURUSD tends to outperform after softer CPI', 'Equity impulse is strongest when services cool', 'Gold responds if real yields break trend'])),
            ]
            for row in briefings:
                cur.execute('insert into briefings (id, slug, kind, title, summary, body, analyst_user_id, published_at, event_id, asset_symbols, takeaways) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)', row)
            news_rows = [
                ('news-fed', 'fed-patient', 'Fed speakers stay patient as inflation normalizes', 'Northstar Wire', 'Officials continue to argue for data dependence while labor stays firm.', 'Central Banks', 'Neutral', '2026-03-29T06:00:00+00:00', 'event-cpi-mar'),
                ('news-china', 'china-credit-pulse', 'China credit pulse improves in March release', 'Northstar Wire', 'Incremental stabilization supports industrial cyclicals but the impulse remains narrow.', 'Growth', 'Bullish', '2026-03-29T07:15:00+00:00', None),
            ]
            for row in news_rows:
                cur.execute('insert into news_items (id, slug, title, source, summary, category, sentiment, published_at, event_id) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)', row)

            watchlists = [('watch-rates', 'user-demo', 'Rates Desk', 'Rates and dollar focus'), ('watch-crypto', 'user-demo', 'Crypto Macro', 'Liquidity and event basket')]
            for row in watchlists:
                cur.execute('insert into watchlists (id, user_id, name, description) values (%s, %s, %s, %s)', row)
            watchlist_items = [('watch-item-1', 'watch-rates', 'asset', 'US2Y', 'Front end rates check'), ('watch-item-2', 'watch-rates', 'asset', 'DXY', 'Dollar reaction check'), ('watch-item-3', 'watch-crypto', 'asset', 'BTC', 'High beta liquidity proxy'), ('watch-item-4', 'watch-crypto', 'event', 'US CPI', 'Top macro event')]
            for row in watchlist_items:
                cur.execute('insert into watchlist_items (id, watchlist_id, item_type, symbol, note) values (%s, %s, %s, %s, %s)', row)
            alerts = [('alert-cpi', 'user-demo', 'US CPI release reminder', 'event_reminder', 'event-cpi-mar', '15m', 'In-app', 'Scheduled', None), ('alert-btc', 'user-demo', 'BTC above 90k', 'asset_threshold', 'BTC', '90000', 'Email', 'Triggered', '2026-03-28T10:00:00+00:00'), ('alert-regime', 'user-demo', 'Regime confidence below 0.60', 'regime_threshold', 'regime-current', '0.60', 'In-app', 'Active', None)]
            for row in alerts:
                cur.execute('insert into alerts (id, user_id, name, trigger_type, target_ref, threshold_value, delivery_channel, status, last_triggered_at) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)', row)
            cur.execute('insert into alert_deliveries (id, alert_id, status, payload) values (%s, %s, %s, %s::jsonb)', ('delivery-btc', 'alert-btc', 'delivered', json.dumps({'price': 90125})))
            posts = [('post-cpi', 'user-analyst', 'Why the next CPI matters more for rates than equities', 'The market already leans soft landing. The bigger swing factor is how far front end pricing can compress.'), ('post-btc', 'user-admin', 'Tracking dollar liquidity spillover into BTC beta', 'Crypto still reacts best when dollar pressure and real yield pressure both ease into the event window.')]
            for row in posts:
                cur.execute('insert into posts (id, user_id, title, body) values (%s, %s, %s, %s)', row)
            comments = [('comment-cpi', 'post-cpi', 'user-demo', 'Rates lead first, equities confirm later.'), ('comment-btc', 'post-btc', 'user-demo', 'Watching dollar and front end together still works well.')]
            for row in comments:
                cur.execute('insert into comments (id, post_id, user_id, body) values (%s, %s, %s, %s)', row)
            likes = [('post-cpi', 'user-demo'), ('post-btc', 'user-analyst')]
            for row in likes:
                cur.execute('insert into post_likes (post_id, user_id) values (%s, %s)', row)
            flags = [('demo_mode', 'Platform runs on deterministic seeded data.', True), ('community_enabled', 'Community layer is available.', True), ('admin_console', 'Admin surfaces are available.', True)]
            for key, description, enabled in flags:
                cur.execute('insert into feature_flags (key, description, enabled) values (%s, %s, %s)', (key, description, enabled))
    reset_demo_jobs()
    return {'status': 'ok'}

