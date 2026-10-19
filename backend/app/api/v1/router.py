from fastapi import APIRouter

from app.api.v1 import admin, auth, leaves

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(leaves.router)
api_router.include_router(admin.router)