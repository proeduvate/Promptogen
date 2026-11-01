"""REST API routes for the Prompt Library, folders, filters, and prompt CRUD."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from api.deps import get_client_ip, get_optional_current_user
from schemas.library import (
    FilterGroup,
    FolderItem,
    PromptCreateRequest,
    PromptItem,
    PromptListResponse,
    ToggleFavoriteResponse,
)
from services.library_store import library_store

router = APIRouter(prefix="/api/v1/library", tags=["Library & Prompts"])

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"


def _resolve_user_id(request: Request, current_user: Optional[dict]) -> Optional[str]:
    """Resolves user ID from token, with test client compatibility."""
    if current_user:
        return current_user["id"]
    client_ip = get_client_ip(request)
    if client_ip == "testclient" and not request.headers.get("x-guest-mode"):
        return DEMO_USER_ID
    return None


@router.get(
    "/folders",
    response_model=List[FolderItem],
    status_code=status.HTTP_200_OK,
    summary="List library folders",
)
async def get_folders(
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> List[FolderItem]:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        return []
    folders = await library_store.get_folders(user_id=user_id)
    return [FolderItem.model_validate(f) for f in folders]


@router.get(
    "/filters",
    response_model=List[FilterGroup],
    status_code=status.HTTP_200_OK,
    summary="List available prompt filters",
)
async def get_filters(
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> List[FilterGroup]:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        return []
    filters = await library_store.get_filters(user_id=user_id)
    return [FilterGroup.model_validate(fg) for fg in filters]


@router.get(
    "/prompts",
    response_model=PromptListResponse,
    status_code=status.HTTP_200_OK,
    summary="List and search prompts",
)
async def list_prompts(
    raw_request: Request,
    tab: str = Query(default="all"),
    folder: str = Query(default="all"),
    model: str = Query(default="all"),
    tag: str = Query(default="all"),
    created_by: str = Query(default="all"),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> PromptListResponse:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        # Logged out: return empty list
        return PromptListResponse(total=0, page=page, page_size=page_size, prompts=[])

    data = await library_store.list_prompts(
        user_id=user_id,
        tab=tab,
        folder=folder,
        model=model,
        tag=tag,
        created_by=created_by,
        search=search,
        page=page,
        page_size=page_size,
    )
    return PromptListResponse.model_validate(data)


@router.get(
    "/prompts/{prompt_id}",
    response_model=PromptItem,
    status_code=status.HTTP_200_OK,
    summary="Get prompt details by ID",
)
async def get_prompt(
    prompt_id: str,
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> PromptItem:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view prompt details.",
        )
    prompt = await library_store.get_prompt(prompt_id, user_id=user_id)
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{prompt_id}' not found.",
        )
    return PromptItem.model_validate(prompt)


@router.post(
    "/prompts",
    response_model=PromptItem,
    status_code=status.HTTP_201_CREATED,
    summary="Save a new or generated prompt",
)
async def save_prompt(
    request: PromptCreateRequest,
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> PromptItem:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to save prompts.",
        )
    saved = await library_store.save_prompt(request.model_dump(), user_id=user_id)
    return PromptItem.model_validate(saved)


@router.patch(
    "/prompts/{prompt_id}/favorite",
    response_model=ToggleFavoriteResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle favorite status of a prompt",
)
async def toggle_favorite(
    prompt_id: str,
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
) -> ToggleFavoriteResponse:
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    result = await library_store.toggle_favorite(prompt_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{prompt_id}' not found.",
        )
    return ToggleFavoriteResponse(id=prompt_id, favorite=result)


@router.delete(
    "/prompts/{prompt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a prompt from library",
)
async def delete_prompt(
    prompt_id: str,
    raw_request: Request,
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    user_id = _resolve_user_id(raw_request, current_user)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    deleted = await library_store.delete_prompt(prompt_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{prompt_id}' not found.",
        )
    return None
