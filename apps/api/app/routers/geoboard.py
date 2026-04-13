from fastapi import APIRouter, Depends, HTTPException, Request

from ..geoboard_service import fetch_gdelt_events, fetch_macro_events, geoboard_payload
from ..schemas import GeoboardGeoEvent, GeoboardMacroEvent, GeoboardPayload
from ..services import current_user_from_token
from ..settings import settings

router = APIRouter(prefix='/api/geoboard', tags=['geoboard'])


def current_user(request: Request):
 user = current_user_from_token(request.cookies.get(settings.session_cookie))
 if not user:
  raise HTTPException(status_code=401, detail='Authentication required')
 return user


@router.get('/gdelt-events', response_model=list[GeoboardGeoEvent])
def gdelt_events_route(user=Depends(current_user)):
 return fetch_gdelt_events(user.get('id'))


@router.get('/macro-events', response_model=list[GeoboardMacroEvent])
def macro_events_route(user=Depends(current_user)):
 return fetch_macro_events(user.get('id'))


@router.get('/feed', response_model=GeoboardPayload)
def geoboard_feed_route(mode: str = 'STANDARD', user=Depends(current_user)):
 normalized_mode = mode if mode in {'STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'} else 'STANDARD'
 return geoboard_payload(user, normalized_mode)
