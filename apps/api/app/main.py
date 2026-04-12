import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .db import apply_migrations
from .schemas import AlertInput, CommentInput, CommunityPostInput, DashboardPayload, OnboardingRequest, ResetCompleteRequest, ResetRequest, SignInRequest, SignUpRequest, SimpleResponse, VerifyEmailRequest, WatchlistInput, WatchlistItemInput, WorkstationPayload, NewsFeedPayload
from .dashboard_service import dashboard_payload
from .seed import seed_demo_database
from .services import add_watchlist_item, admin_summary, complete_password_reset, create_alert, create_comment, create_post, create_watchlist, current_user_from_token, event_detail, latest_regime, like_post, list_alerts, list_biases, list_briefings, list_events, list_feature_flags, list_jobs, list_news, list_posts, list_watchlists, request_password_reset, sign_in, sign_out, sign_up, update_onboarding, verify_email, workstation_payload, create_job
from .settings import settings
from .routers.geoboard import router as geoboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    apply_migrations()
    yield

app = FastAPI(title='Macro Access API', version='0.8.0', lifespan=lifespan)
app.include_router(geoboard_router)

app.add_middleware(CORSMiddleware, allow_origins=[settings.api_origin, 'http://localhost:3000'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.middleware('http')
async def add_request_context(request: Request, call_next):
    request_id = request.headers.get('x-request-id', str(uuid.uuid4()))
    started = time.perf_counter()
    response = await call_next(request)
    response.headers['x-request-id'] = request_id
    response.headers['x-response-time-ms'] = str(round((time.perf_counter() - started) * 1000, 2))
    return response

def current_user(request: Request):
    user = current_user_from_token(request.cookies.get(settings.session_cookie))
    if not user:
        raise HTTPException(status_code=401, detail='Authentication required')
    return user

def admin_user(user = Depends(current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return user

def apply_session_cookie(response: Response, token: str):
    response.set_cookie(settings.session_cookie, token, httponly=True, secure=settings.secure_cookies, samesite='lax', max_age=settings.session_ttl_hours * 3600, path='/')

@app.get('/health')
def health():
    return {'status': 'ok', 'mode': settings.app_mode}

@app.post('/api/v1/auth/sign-up', response_model=SimpleResponse)
def auth_sign_up(payload: SignUpRequest):
    try:
        return sign_up(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post('/api/v1/auth/verify-email', response_model=SimpleResponse)
def auth_verify_email(payload: VerifyEmailRequest):
    try:
        return verify_email(payload.token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post('/api/v1/auth/sign-in')
def auth_sign_in(payload: SignInRequest, request: Request, response: Response):
    try:
        token, user = sign_in(payload, request.client.host if request.client else '', request.headers.get('user-agent', ''))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    apply_session_cookie(response, token)
    return user

@app.post('/api/v1/auth/sign-out', response_model=SimpleResponse)
def auth_sign_out(request: Request, response: Response):
    sign_out(request.cookies.get(settings.session_cookie))
    response.delete_cookie(settings.session_cookie, path='/')
    return {'status': 'ok', 'detail': 'Signed out'}

@app.get('/api/v1/auth/session')
def auth_session(user = Depends(current_user)):
    return user

@app.post('/api/v1/auth/request-password-reset', response_model=SimpleResponse)
def auth_request_reset(payload: ResetRequest):
    return request_password_reset(payload)

@app.post('/api/v1/auth/reset-password', response_model=SimpleResponse)
def auth_reset_password(payload: ResetCompleteRequest):
    try:
        return complete_password_reset(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post('/api/v1/onboarding', response_model=SimpleResponse)
def onboarding(payload: OnboardingRequest, user = Depends(current_user)):
    update_onboarding(user['id'], payload)
    return {'status': 'ok', 'detail': 'Onboarding updated'}

@app.get('/api/v1/workstation', response_model=WorkstationPayload)
def workstation(refresh: bool = False, user = Depends(current_user)):
    return workstation_payload(user, prefer_cache=not refresh, force_refresh=refresh)

@app.get('/api/v1/dashboard', response_model=DashboardPayload)
def dashboard(refresh: bool = False, user = Depends(current_user)):
 return dashboard_payload(user, prefer_cache=not refresh, force_refresh=refresh)

@app.get('/api/dashboard', response_model=DashboardPayload)
def dashboard_compat(refresh: bool = False, user = Depends(current_user)):
 return dashboard_payload(user, prefer_cache=not refresh, force_refresh=refresh)

@app.get('/api/v1/regime')
def regime(user = Depends(current_user)):
    return latest_regime()

@app.get('/api/v1/market-bias')
def market_bias(user = Depends(current_user)):
    try:
        return list_biases()
    except Exception:
        return []

@app.get('/api/v1/events')
def events(search: str = '', user = Depends(current_user)):
    return list_events(search or None)

@app.get('/api/v1/events/{event_id}')
def events_detail(event_id: str, user = Depends(current_user)):
    item = event_detail(event_id)
    if not item:
        raise HTTPException(status_code=404, detail='Event not found')
    return item

@app.get('/api/v1/briefings')
def briefings(user = Depends(current_user)):
    return list_briefings()

@app.get('/api/v1/news', response_model=NewsFeedPayload)
def news(
    mode: str = 'wire',
    limit: int = 80,
    search: str = '',
    source_type: str = '',
    region: str = '',
    topic: str = '',
    category: str = '',
    currency: str = '',
    asset: str = '',
    event_family: str = '',
    min_urgency: float = 0.0,
    official_only: bool = False,
    watchlist_only: bool = False,
    user = Depends(current_user),
):
    normalized_mode = mode if mode in {'wire', 'macro', 'watchlist'} else 'wire'
    return list_news(
        user['id'],
        mode=normalized_mode,
        limit=max(1, min(limit, 200)),
        search=search,
        source_type=source_type,
        region=region,
        topic=topic,
        category=category,
        currency=currency,
        asset=asset,
        event_family=event_family,
        min_urgency=max(0.0, min(min_urgency, 1.0)),
        official_only=official_only,
        watchlist_only=watchlist_only,
    )

@app.get('/api/v1/watchlists')
def watchlists(user = Depends(current_user)):
    return list_watchlists(user['id'])

@app.post('/api/v1/watchlists', response_model=SimpleResponse)
def watchlists_create(payload: WatchlistInput, user = Depends(current_user)):
    watchlist_id = create_watchlist(user['id'], payload)
    return {'status': 'ok', 'detail': watchlist_id}

@app.post('/api/v1/watchlists/{watchlist_id}/items', response_model=SimpleResponse)
def watchlists_add_item(watchlist_id: str, payload: WatchlistItemInput, user = Depends(current_user)):
    item_id = add_watchlist_item(user['id'], watchlist_id, payload)
    return {'status': 'ok', 'detail': item_id}

@app.get('/api/v1/alerts')
def alerts(user = Depends(current_user)):
    return list_alerts(user['id'])

@app.post('/api/v1/alerts', response_model=SimpleResponse)
def alerts_create(payload: AlertInput, user = Depends(current_user)):
    alert_id = create_alert(user['id'], payload)
    return {'status': 'ok', 'detail': alert_id}

@app.get('/api/v1/community/posts')
def posts(user = Depends(current_user)):
    return list_posts()

@app.post('/api/v1/community/posts', response_model=SimpleResponse)
def posts_create(payload: CommunityPostInput, user = Depends(current_user)):
    post_id = create_post(user['id'], payload)
    return {'status': 'ok', 'detail': post_id}

@app.post('/api/v1/community/posts/{post_id}/comments', response_model=SimpleResponse)
def posts_comment(post_id: str, payload: CommentInput, user = Depends(current_user)):
    comment_id = create_comment(user['id'], post_id, payload)
    return {'status': 'ok', 'detail': comment_id}

@app.post('/api/v1/community/posts/{post_id}/like', response_model=SimpleResponse)
def posts_like(post_id: str, user = Depends(current_user)):
    like_post(user['id'], post_id)
    return {'status': 'ok', 'detail': 'liked'}

@app.get('/api/v1/settings/profile')
def settings_profile(user = Depends(current_user)):
    return user

@app.get('/api/v1/billing')
def billing(user = Depends(current_user)):
    return workstation_payload(user)['billing']

@app.get('/api/v1/admin/summary')
def admin_summary_route(user = Depends(admin_user)):
    return admin_summary()

@app.get('/api/v1/admin/jobs')
def admin_jobs_route(user = Depends(admin_user)):
    return list_jobs()

@app.get('/api/v1/admin/feature-flags')
def admin_flags_route(user = Depends(admin_user)):
    return list_feature_flags()

@app.post('/api/v1/admin/jobs/{job_type}', response_model=SimpleResponse)
def admin_enqueue_job(job_type: str, user = Depends(admin_user)):
    try:
        job_id = create_job(job_type, {'source': 'admin'})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {'status': 'ok', 'detail': job_id}

@app.post('/api/v1/admin/reset-demo', response_model=SimpleResponse)
def admin_reset_demo(user = Depends(admin_user)):
    seed_demo_database()
    return {'status': 'ok', 'detail': 'Demo dataset rebuilt'}








 
@app.get('/api/v1/market-bias/insights') 
def market_bias_insights(user = Depends(current_user)): 
    from .services import market_bias_payload 
    return market_bias_payload() 
 
@app.get('/api/v1/reactions') 
def reactions(family: str = '', asset: str = 'SPX', country: str = '', currency: str = '', user = Depends(current_user)): 
    from .services import reactions_payload 
    return reactions_payload(family or None, asset, country or None, currency or None) 
 
@app.get('/api/v1/track-record') 
def track_record(user = Depends(current_user)): 
    from .services import track_record_payload 
    return track_record_payload() 
 
@app.get('/api/v1/reports') 
def reports(limit: int = 12, user = Depends(current_user)): 
    from .services import reports_payload 
    return reports_payload(limit=limit) 
 
@app.post('/api/v1/admin/reports/generate', response_model=SimpleResponse) 
def admin_generate_report(user = Depends(admin_user)): 
    from .services import generate_report_now 
    report = generate_report_now() 
    return {'status': 'ok', 'detail': report['slug']}


