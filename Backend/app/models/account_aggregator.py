import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class AAConsent(Base):
    """
    RBI Account Aggregator (AA) Ecosystem Consent Architecture
    Compliant with ReBIT Technical Specifications for FIU/AA interaction.
    """
    __tablename__ = "aa_consents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    consent_handle = Column(String(100), unique=True, index=True, nullable=False)
    aa_provider = Column(String(100), default="Setu AA / OneMoney / Anumati")
    fip_id = Column(String(100), default="HDFC-FIP")  # Financial Information Provider
    status = Column(String(50), default="PENDING")    # PENDING, ACTIVE, REJECTED, REVOKED, EXPIRED
    
    data_range_from = Column(DateTime, nullable=True)
    data_range_to = Column(DateTime, nullable=True)
    consent_expiry = Column(DateTime, nullable=True)
    
    fi_types = Column(String(100), default="DEPOSIT,CREDIT_CARD")
    consent_artefact = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="aa_consents")
