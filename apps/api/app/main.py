import time
import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .db import apply_migrations
from .schemas import AlertInput, CommentInput, CommunityPostInput, OnboardingRequest, ResetCompleteRequest, ResetRequest, SignInRequest, SignUpRequest, SimpleResponse, VerifyEmailRequest, WatchlistInput, WatchlistItemInput, WorkstationPayload
from .seed import seed_demo_database
from .services import add_watchlist_item, admin_summary, complete_password_reset, create_alert, create_comment, create_post, create_watchlist, current_user_from_token, event_detail, latest_regime, like_post, list_alerts, list_biases, list_briefings, list_events, list_feature_flags, list_jobs, list_news, list_posts, list_watchlists, request_password_reset, sign_in, sign_out, sign_up, update_onboarding, verify_email, workstation_payload, create_job
from .settings import settings

app = FastAPI(title='Northstar Macro API', version='0.8.0')

app.add_middleware(CORSMiddleware, allow_origins=[settings.api_origin, 'http://localhost:3000'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def startup_event():
    apply_migrations()

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

@app.get('/api/v1/dashboard')
def dashboard(user = Depends(current_user)):
    payload = workstation_payload(user)
    return {'metrics': payload['metrics'], 'regime': payload['regime'], 'biases': payload['biases'], 'events': payload['nextEvents']}

@app.get('/api/v1/regime')
def regime(user = Depends(current_user)):
    return latest_regime()

@app.get('/api/v1/market-bias')
def market_bias(user = Depends(current_user)):
    return list_biases()

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

@app.get('/api/v1/news')
def news(user = Depends(current_user)):
    return list_news()

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








