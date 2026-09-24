import hmac
import hashlib
import json
import base64
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.geography import State, District, Taluka, Village
from app.models.field import Field
from app.models.farmer import Farmer
from app.schemas.auth import (
    GatLoginRequest,
    AuthResponse,
    FarmerSessionBrief,
    FieldSessionBrief,
    LocationSessionBrief,
    SessionUserResponse,
)


class AuthService:
    """Service handling Gat-based farmer access, hierarchy validation, and session management."""

    TOKEN_EXPIRY_SECONDS: int = 7 * 24 * 3600  # 7 days session lifetime

    def _generate_signature(self, message: str) -> str:
        """Generate HMAC-SHA256 hex signature using application SECRET_KEY."""
        key = settings.SECRET_KEY.encode("utf-8")
        return hmac.new(key, message.encode("utf-8"), hashlib.sha256).hexdigest()

    def create_session_token(self, payload: Dict[str, Any]) -> str:
        """Create a secure URL-safe base64 signed token with expiry timestamp."""
        payload_with_exp = {
            **payload,
            "exp": int(time.time()) + self.TOKEN_EXPIRY_SECONDS,
            "iat": int(time.time()),
        }
        json_bytes = json.dumps(payload_with_exp, separators=(",", ":")).encode("utf-8")
        encoded_data = base64.urlsafe_b64encode(json_bytes).decode("utf-8").rstrip("=")
        signature = self._generate_signature(encoded_data)
        return f"{encoded_data}.{signature}"

    def verify_session_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify signature and expiration of a session token."""
        if not token or "." not in token:
            return None

        parts = token.split(".", 1)
        if len(parts) != 2:
            return None

        encoded_data, signature = parts
        expected_sig = self._generate_signature(encoded_data)
        if not hmac.compare_digest(expected_sig, signature):
            return None

        try:
            # Restore padding
            pad_len = 4 - (len(encoded_data) % 4)
            if pad_len != 4:
                encoded_data += "=" * pad_len
            raw_json = base64.urlsafe_b64decode(encoded_data.encode("utf-8")).decode("utf-8")
            payload = json.loads(raw_json)

            # Check expiration
            if payload.get("exp", 0) < time.time():
                return None

            return payload
        except Exception:
            return None

    def gat_login(self, db: Session, req: GatLoginRequest) -> AuthResponse:
        """
        Authenticate farmer via administrative hierarchy and Gat Number.
        Validates:
          1. State exists
          2. District belongs to State
          3. Taluka belongs to District
          4. Village belongs to Taluka
          5. Field belongs to Village and Gat Number matches (case-insensitive string match)
        """
        # 1. Validate State
        state = db.query(State).filter(State.id == req.state_id, State.is_active == True).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid State with ID {req.state_id}.",
            )

        # 2. Validate District belongs to State
        district = db.query(District).filter(
            District.id == req.district_id,
            District.state_id == state.id,
            District.is_active == True,
        ).first()
        if not district:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"District does not belong to {state.name}.",
            )

        # 3. Validate Taluka belongs to District
        taluka = db.query(Taluka).filter(
            Taluka.id == req.taluka_id,
            Taluka.district_id == district.id,
            Taluka.is_active == True,
        ).first()
        if not taluka:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Taluka does not belong to {district.name} district.",
            )

        # 4. Validate Village belongs to Taluka
        village = db.query(Village).filter(
            Village.id == req.village_id,
            Village.taluka_id == taluka.id,
            Village.is_active == True,
        ).first()
        if not village:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Village does not belong to {taluka.name} taluka.",
            )

        # 5. Normalize and search Field by Village + Gat Number
        from app.services.field_service import normalize_gat_number
        clean_gat = normalize_gat_number(req.gat_no)
        if not clean_gat:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail="Gat number cannot be empty.",
            )

        field = db.query(Field).filter(
            Field.village_id == village.id,
            Field.gat_no.ilike(clean_gat),
            Field.is_active == True,
        ).first()

        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="We couldn't find a farm with these details. Please check your village and Gat number.",
            )

        farmer = field.farmer

        # 6. Issue signed session token
        token_payload = {
            "field_id": field.id,
            "village_id": village.id,
            "farmer_id": farmer.id if farmer else None,
            "gat_no": field.gat_no,
        }
        token = self.create_session_token(token_payload)

        farmer_brief = None
        if farmer:
            farmer_brief = FarmerSessionBrief(
                id=farmer.id,
                name=farmer.full_name,
                farmer_code=farmer.farmer_code,
            )

        return AuthResponse(
            success=True,
            message="Farm verified successfully",
            token=token,
            field=FieldSessionBrief(
                id=field.id,
                gat_no=field.gat_no,
                area=field.area,
                area_unit=field.area_unit,
                is_demo=field.is_demo,
            ),
            farmer=farmer_brief,
            location=LocationSessionBrief(
                state=state.name,
                district=district.name,
                taluka=taluka.name,
                village=village.name,
            ),
        )

    def get_session_profile(self, db: Session, token: str) -> SessionUserResponse:
        """Validate token and fetch active session data for /api/v1/auth/me."""
        payload = self.verify_session_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has expired. Please enter your farm details again.",
            )

        field_id = payload.get("field_id")
        field = db.query(Field).filter(Field.id == field_id, Field.is_active == True).first()
        if not field:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Farm record associated with this session is no longer active.",
            )

        village = field.village
        taluka = village.taluka if village else None
        district = taluka.district if taluka else None
        state = district.state if district else None

        farmer = field.farmer
        farmer_brief = None
        if farmer:
            farmer_brief = FarmerSessionBrief(
                id=farmer.id,
                name=farmer.full_name,
                farmer_code=farmer.farmer_code,
            )

        return SessionUserResponse(
            authenticated=True,
            field=FieldSessionBrief(
                id=field.id,
                gat_no=field.gat_no,
                area=field.area,
                area_unit=field.area_unit,
                is_demo=field.is_demo,
            ),
            farmer=farmer_brief,
            location=LocationSessionBrief(
                state=state.name if state else "Maharashtra",
                district=district.name if district else "Pune",
                taluka=taluka.name if taluka else "",
                village=village.name if village else "",
            ),
        )


auth_service = AuthService()
