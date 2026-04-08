from fastapi import APIRouter, Depends, HTTPException, Request

from ..geoboard_service import fetch_gdelt_events, fetch_macro_events
from ..schemas import GeoboardGeoEvent, GeoboardMacroEvent
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
	return fetch_gdelt_events()


@router.get('/macro-events', response_model=list[GeoboardMacroEvent])
def macro_events_route(user=Depends(current_user)):
	return fetch_macro_events()
