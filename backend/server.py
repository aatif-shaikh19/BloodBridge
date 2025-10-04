"""
Blood Donation Management System - FastAPI Backend
Complete system with OTP, Email/SMS alerts, Blockchain, Gamification
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, Header
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import random
import string
import hashlib
import aiosmtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 7

# Email configuration
MAIL_SERVER = os.environ['MAIL_SERVER']
MAIL_PORT = int(os.environ['MAIL_PORT'])
MAIL_USERNAME = os.environ['MAIL_USERNAME']
MAIL_PASSWORD = os.environ['MAIL_PASSWORD']
MAIL_DEFAULT_SENDER = os.environ['MAIL_DEFAULT_SENDER']

# Twilio configuration
TWILIO_ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
TWILIO_AUTH_TOKEN = os.environ['TWILIO_AUTH_TOKEN']
TWILIO_PHONE_NUMBER = os.environ['TWILIO_PHONE_NUMBER']

# File upload configuration
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads/documents')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# FastAPI app
app = FastAPI(title="Blood Donation Management System")
api_router = APIRouter(prefix="/api")

# Helper functions (using simple SHA256 instead of bcrypt due to compatibility)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def create_jwt_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token missing")
    
    try:
        token = authorization.split()[1] if ' ' in authorization else authorization
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def send_email(to_email: str, subject: str, body: str):
    try:
        message = EmailMessage()
        message["From"] = MAIL_DEFAULT_SENDER
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)
        message.add_alternative(f"<html><body><div style='padding:20px;font-family:Arial,sans-serif;'><h2>{subject}</h2><p>{body}</p></div></body></html>", subtype='html')
        
        await aiosmtplib.send(
            message,
            hostname=MAIL_SERVER,
            port=MAIL_PORT,
            username=MAIL_USERNAME,
            password=MAIL_PASSWORD,
            start_tls=True
        )
        logger.info(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Email error: {e}")
        return False

async def send_sms(to_phone: str, message: str):
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        message = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )
        logger.info(f"✅ SMS sent to {to_phone}")
        return True
    except Exception as e:
        logger.error(f"❌ SMS error: {e}")
        return False

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

# Pydantic models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    blood_type: str
    role: str = "donor"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerify(BaseModel):
    user_id: str
    otp: str

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class BloodRequestCreate(BaseModel):
    hospital_name: str
    blood_type: str
    units_needed: int
    urgency: str
    patient_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: float
    longitude: float

class DonationResponseCreate(BaseModel):
    request_id: str
    units_donated: int = 1

class InventoryUpdate(BaseModel):
    blood_type: str
    units_available: int
    temperature: float = 4.0
    location: str = "Central Blood Bank"

# AUTH ROUTES
@api_router.post("/register")
async def register(user_data: UserRegister):
    try:
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        otp = generate_otp()
        user_id = str(uuid.uuid4())
        
        user = {
            "id": user_id,
            "email": user_data.email,
            "password": hash_password(user_data.password),
            "role": user_data.role,
            "phone": user_data.phone,
            "is_approved": False,
            "is_verified": False,
            "otp": otp,
            "otp_expiry": datetime.utcnow() + timedelta(minutes=10),
            "created_at": datetime.utcnow()
        }
        
        await db.users.insert_one(user)
        
        donor = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": user_data.name,
            "blood_type": user_data.blood_type,
            "phone": user_data.phone,
            "address": "",
            "city": "",
            "state": "",
            "pincode": "",
            "latitude": 0.0,
            "longitude": 0.0,
            "aadhaar_number": "",
            "aadhaar_file": "",
            "last_donation": None,
            "total_donations": 0,
            "points": 0,
            "badges": [],
            "availability_status": "available",
            "created_at": datetime.utcnow()
        }
        
        await db.donors.insert_one(donor)
        
        await send_email(
            user_data.email,
            "Blood Donation - Email Verification OTP",
            f"Your OTP for email verification is: {otp}. Valid for 10 minutes."
        )
        
        await send_sms(
            user_data.phone,
            f"Your Blood Donation OTP is: {otp}. Valid for 10 minutes."
        )
        
        return {
            "message": "Registration successful! Check your email/SMS for OTP.",
            "user_id": user_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    try:
        user = await db.users.find_one({"id": data.user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Already verified")
        
        if user.get("otp") != data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        if datetime.utcnow() > user.get("otp_expiry"):
            raise HTTPException(status_code=400, detail="OTP expired")
        
        await db.users.update_one(
            {"id": data.user_id},
            {"$set": {"is_verified": True, "otp": None, "otp_expiry": None}}
        )
        
        return {"message": "OTP verified successfully!", "verified": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/resend-otp")
async def resend_otp(data: dict):
    try:
        user = await db.users.find_one({"id": data["user_id"]})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        otp = generate_otp()
        
        await db.users.update_one(
            {"id": data["user_id"]},
            {"$set": {
                "otp": otp,
                "otp_expiry": datetime.utcnow() + timedelta(minutes=10)
            }}
        )
        
        await send_email(user["email"], "New OTP", f"Your new OTP is: {otp}")
        
        if user.get("phone"):
            await send_sms(user["phone"], f"New OTP: {otp}")
        
        return {"message": "New OTP sent"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/complete-registration")
async def complete_registration(
    user_id: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    pincode: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    aadhaar_number: str = Form(...),
    aadhaar_file: UploadFile = File(...)
):
    try:
        user = await db.users.find_one({"id": user_id})
        
        if not user or not user.get("is_verified"):
            raise HTTPException(status_code=400, detail="User not verified")
        
        file_extension = aadhaar_file.filename.split(".")[-1]
        filename = f"{user_id}_{int(datetime.now().timestamp())}.{file_extension}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(filepath, "wb") as f:
            content = await aadhaar_file.read()
            f.write(content)
        
        await db.donors.update_one(
            {"user_id": user_id},
            {"$set": {
                "address": address,
                "city": city,
                "state": state,
                "pincode": pincode,
                "latitude": latitude,
                "longitude": longitude,
                "aadhaar_number": aadhaar_number,
                "aadhaar_file": filename
            }}
        )
        
        donor = await db.donors.find_one({"user_id": user_id})
        
        await send_email(
            user["email"],
            "Registration Complete",
            f"Dear {donor['name']}, Your registration is complete. Awaiting admin approval."
        )
        
        return {"message": "Registration complete. Awaiting admin approval."}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complete registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/login")
async def login(user_data: UserLogin):
    try:
        user = await db.users.find_one({"email": user_data.email})
        
        if not user or not verify_password(user_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if user["role"] == "admin":
            token = create_jwt_token({
                "user_id": user["id"],
                "role": user["role"]
            })
            
            return {
                "token": token,
                "user_id": user["id"],
                "role": user["role"],
                "email": user["email"]
            }
        
        if not user.get("is_verified"):
            raise HTTPException(status_code=403, detail="Please verify your email first")
        
        if not user.get("is_approved"):
            raise HTTPException(status_code=403, detail="Account pending admin approval")
        
        token = create_jwt_token({
            "user_id": user["id"],
            "role": user["role"]
        })
        
        return {
            "token": token,
            "user_id": user["id"],
            "role": user["role"],
            "email": user["email"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# DONOR ROUTES
@api_router.get("/donor/profile")
async def get_donor_profile(current_user: dict = Depends(get_current_user)):
    try:
        donor = await db.donors.find_one({"user_id": current_user["id"]})
        
        if not donor:
            raise HTTPException(status_code=404, detail="Donor profile not found")
        
        return {
            "id": donor["id"],
            "name": donor["name"],
            "blood_type": donor["blood_type"],
            "phone": donor["phone"],
            "address": donor["address"],
            "city": donor["city"],
            "state": donor["state"],
            "latitude": donor.get("latitude", 0),
            "longitude": donor.get("longitude", 0),
            "total_donations": donor.get("total_donations", 0),
            "points": donor.get("points", 0),
            "badges": donor.get("badges", []),
            "availability_status": donor.get("availability_status", "available"),
            "last_donation": donor.get("last_donation").isoformat() if donor.get("last_donation") else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/donor/update-location")
async def update_donor_location(
    data: LocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        await db.donors.update_one(
            {"user_id": current_user["id"]},
            {"$set": {
                "latitude": data.latitude,
                "longitude": data.longitude
            }}
        )
        
        return {"message": "Location updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/donor/toggle-availability")
async def toggle_availability(current_user: dict = Depends(get_current_user)):
    try:
        donor = await db.donors.find_one({"user_id": current_user["id"]})
        
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        
        new_status = "unavailable" if donor.get("availability_status") == "available" else "available"
        
        await db.donors.update_one(
            {"user_id": current_user["id"]},
            {"$set": {"availability_status": new_status}}
        )
        
        return {
            "message": "Availability updated",
            "status": new_status
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DONATION ROUTES
@api_router.post("/donations/respond")
async def respond_to_request(
    data: DonationResponseCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        donor = await db.donors.find_one({"user_id": current_user["id"]})
        
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        
        blood_request = await db.blood_requests.find_one({"id": data.request_id})
        
        if not blood_request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        response_id = str(uuid.uuid4())
        donation = {
            "id": response_id,
            "request_id": data.request_id,
            "donor_id": donor["id"],
            "units_donated": data.units_donated,
            "status": "confirmed",
            "donation_date": datetime.utcnow(),
            "certificate_issued": False,
            "created_at": datetime.utcnow()
        }
        
        await db.donation_responses.insert_one(donation)
        
        new_fulfilled = blood_request.get("units_fulfilled", 0) + data.units_donated
        
        update_data = {"units_fulfilled": new_fulfilled}
        if new_fulfilled >= blood_request["units_needed"]:
            update_data["status"] = "fulfilled"
            update_data["fulfilled_at"] = datetime.utcnow()
        
        await db.blood_requests.update_one(
            {"id": data.request_id},
            {"$set": update_data}
        )
        
        new_donations = donor.get("total_donations", 0) + 1
        new_points = donor.get("points", 0) + 100
        
        await db.donors.update_one(
            {"id": donor["id"]},
            {"$set": {
                "last_donation": datetime.utcnow(),
                "total_donations": new_donations,
                "points": new_points
            }}
        )
        
        inventory = await db.blood_inventory.find_one({"blood_type": donor["blood_type"]})
        if inventory:
            await db.blood_inventory.update_one(
                {"blood_type": donor["blood_type"]},
                {"$inc": {"units_available": data.units_donated},
                 "$set": {"last_updated": datetime.utcnow()}}
            )
        
        badges = donor.get("badges", [])
        if new_donations == 1 and "first_hero" not in badges:
            badges.append("first_hero")
        if new_donations == 5 and "bronze_saver" not in badges:
            badges.append("bronze_saver")
        if new_donations == 10 and "silver_guardian" not in badges:
            badges.append("silver_guardian")
        if new_donations == 25 and "gold_champion" not in badges:
            badges.append("gold_champion")
        if new_donations == 50 and "platinum_legend" not in badges:
            badges.append("platinum_legend")
        
        await db.donors.update_one(
            {"id": donor["id"]},
            {"$set": {"badges": badges}}
        )
        
        await send_email(
            current_user["email"],
            "Thank You for Your Donation!",
            f"Dear {donor['name']}, Thank you for donating {data.units_donated} unit(s). You've earned 100 points!"
        )
        
        if donor.get("phone"):
            await send_sms(
                donor["phone"],
                f"Thank you! You now have {new_donations} donations and {new_points} points."
            )
        
        return {
            "message": "Donation recorded successfully",
            "total_donations": new_donations,
            "points": new_points,
            "new_badges": badges
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Donation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/donations/my-donations")
async def get_my_donations(current_user: dict = Depends(get_current_user)):
    try:
        donor = await db.donors.find_one({"user_id": current_user["id"]})
        
        if not donor:
            return []
        
        donations = await db.donation_responses.find(
            {"donor_id": donor["id"]}
        ).sort("created_at", -1).to_list(100)
        
        result = []
        for d in donations:
            request = await db.blood_requests.find_one({"id": d["request_id"]})
            result.append({
                "id": d["id"],
                "hospital": request["hospital_name"] if request else "Unknown",
                "units": d["units_donated"],
                "date": d["created_at"].isoformat(),
                "status": d["status"]
            })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/leaderboard")
async def get_leaderboard():
    try:
        donors = await db.donors.find().sort("points", -1).limit(10).to_list(10)
        
        return [{
            "rank": idx + 1,
            "name": d["name"],
            "blood_type": d["blood_type"],
            "total_donations": d.get("total_donations", 0),
            "points": d.get("points", 0),
            "badges": d.get("badges", [])
        } for idx, d in enumerate(donors)]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NOTIFICATION ROUTES
@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    try:
        notifications = await db.notifications.find(
            {"user_id": current_user["id"]}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        return [{
            "id": n["id"],
            "title": n["title"],
            "message": n["message"],
            "type": n["type"],
            "is_read": n.get("is_read", False),
            "created_at": n["created_at"].isoformat()
        } for n in notifications]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        await db.notifications.update_one(
            {"id": notification_id, "user_id": current_user["id"]},
            {"$set": {"is_read": True}}
        )
        
        return {"message": "Marked as read"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# BLOOD REQUEST ROUTES
@api_router.post("/requests/create")
async def create_blood_request(
    data: BloodRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        request_id = str(uuid.uuid4())
        
        request_obj = {
            "id": request_id,
            "hospital_name": data.hospital_name,
            "blood_type": data.blood_type,
            "units_needed": data.units_needed,
            "units_fulfilled": 0,
            "urgency": data.urgency,
            "patient_name": data.patient_name,
            "contact_person": data.contact_person,
            "contact_phone": data.contact_phone,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "status": "pending",
            "created_by": current_user["id"],
            "created_at": datetime.utcnow(),
            "fulfilled_at": None
        }
        
        await db.blood_requests.insert_one(request_obj)
        
        matching_donors = await db.donors.find({
            "blood_type": data.blood_type,
            "availability_status": "available"
        }).to_list(100)
        
        notified = 0
        
        for donor in matching_donors:
            user = await db.users.find_one({"id": donor["user_id"]})
            
            if user and user.get("is_approved"):
                notification_id = str(uuid.uuid4())
                notification = {
                    "id": notification_id,
                    "user_id": user["id"],
                    "title": f"Urgent: {data.blood_type} Blood Needed",
                    "message": f"{data.hospital_name} needs {data.units_needed} units. Urgency: {data.urgency.upper()}",
                    "type": "blood_request",
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                
                await db.notifications.insert_one(notification)
                
                await send_email(
                    user["email"],
                    "Urgent Blood Request",
                    f"Dear {donor['name']}, {data.hospital_name} urgently needs {data.blood_type} blood. Login to respond."
                )
                
                if donor.get("phone"):
                    await send_sms(
                        donor["phone"],
                        f"Urgent: {data.blood_type} needed at {data.hospital_name}. Login to help!"
                    )
                
                notified += 1
        
        return {
            "message": "Request created",
            "request_id": request_id,
            "donors_notified": notified
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Request creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/requests/active")
async def get_active_requests():
    try:
        requests = await db.blood_requests.find(
            {"status": "pending"}
        ).sort("created_at", -1).to_list(100)
        
        return [{
            "id": r["id"],
            "hospital_name": r["hospital_name"],
            "blood_type": r["blood_type"],
            "units_needed": r["units_needed"],
            "units_fulfilled": r.get("units_fulfilled", 0),
            "urgency": r["urgency"],
            "patient_name": r.get("patient_name"),
            "contact_phone": r.get("contact_phone"),
            "latitude": r.get("latitude", 0),
            "longitude": r.get("longitude", 0),
            "created_at": r["created_at"].isoformat()
        } for r in requests]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/requests/nearby")
async def get_nearby_requests(current_user: dict = Depends(get_current_user)):
    try:
        donor = await db.donors.find_one({"user_id": current_user["id"]})
        
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        
        requests = await db.blood_requests.find({
            "status": "pending",
            "blood_type": donor["blood_type"]
        }).sort("created_at", -1).to_list(100)
        
        result = []
        for r in requests:
            distance = calculate_distance(
                donor.get("latitude", 0),
                donor.get("longitude", 0),
                r.get("latitude", 0),
                r.get("longitude", 0)
            )
            
            if distance <= 50:
                result.append({
                    "id": r["id"],
                    "hospital_name": r["hospital_name"],
                    "blood_type": r["blood_type"],
                    "units_needed": r["units_needed"],
                    "units_fulfilled": r.get("units_fulfilled", 0),
                    "urgency": r["urgency"],
                    "patient_name": r.get("patient_name"),
                    "contact_phone": r.get("contact_phone"),
                    "distance": round(distance, 2),
                    "created_at": r["created_at"].isoformat()
                })
        
        return sorted(result, key=lambda x: x["distance"])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ADMIN ROUTES
@api_router.get("/admin/statistics")
async def get_admin_statistics(current_user: dict = Depends(require_admin)):
    try:
        total_donors = await db.donors.count_documents({})
        approved_donors = await db.users.count_documents({"is_approved": True, "role": "donor"})
        total_requests = await db.blood_requests.count_documents({})
        active_requests = await db.blood_requests.count_documents({"status": "pending"})
        total_donations = await db.donation_responses.count_documents({"status": "confirmed"})
        pending_approvals = await db.users.count_documents({"is_approved": False, "is_verified": True})
        
        pipeline = [
            {"$group": {"_id": "$blood_type", "count": {"$sum": 1}}}
        ]
        blood_types = await db.donors.aggregate(pipeline).to_list(10)
        
        recent_donations = await db.donation_responses.find().sort("created_at", -1).limit(10).to_list(10)
        
        recent_activity = []
        for d in recent_donations:
            donor = await db.donors.find_one({"id": d["donor_id"]})
            request = await db.blood_requests.find_one({"id": d["request_id"]})
            
            if donor and request:
                recent_activity.append({
                    "donor": donor["name"],
                    "hospital": request["hospital_name"],
                    "units": d["units_donated"],
                    "date": d["created_at"].isoformat()
                })
        
        return {
            "total_donors": total_donors,
            "approved_donors": approved_donors,
            "total_requests": total_requests,
            "active_requests": active_requests,
            "total_donations": total_donations,
            "pending_approvals": pending_approvals,
            "blood_type_distribution": [{"blood_type": bt["_id"], "count": bt["count"]} for bt in blood_types],
            "recent_activity": recent_activity
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pending-users")
async def get_pending_users(current_user: dict = Depends(require_admin)):
    try:
        users = await db.users.find({
            "is_approved": False,
            "is_verified": True
        }).to_list(100)
        
        result = []
        
        for u in users:
            donor = await db.donors.find_one({"user_id": u["id"]})
            
            result.append({
                "id": u["id"],
                "email": u["email"],
                "role": u["role"],
                "phone": u.get("phone"),
                "created_at": u["created_at"].isoformat(),
                "donor_info": {
                    "name": donor["name"] if donor else None,
                    "blood_type": donor["blood_type"] if donor else None,
                    "address": donor.get("address") if donor else None,
                    "city": donor.get("city") if donor else None,
                    "state": donor.get("state") if donor else None,
                    "latitude": donor.get("latitude") if donor else None,
                    "longitude": donor.get("longitude") if donor else None,
                    "aadhaar_number": donor.get("aadhaar_number") if donor else None,
                    "aadhaar_file": donor.get("aadhaar_file") if donor else None
                } if donor else None
            })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/donors")
async def get_all_donors(current_user: dict = Depends(require_admin)):
    try:
        donors = await db.donors.find().to_list(1000)
        
        result = []
        for d in donors:
            user = await db.users.find_one({"id": d["user_id"]})
            
            if user and user.get("is_approved"):
                result.append({
                    "id": d["id"],
                    "name": d["name"],
                    "blood_type": d["blood_type"],
                    "phone": d.get("phone"),
                    "email": user["email"],
                    "address": d.get("address"),
                    "city": d.get("city"),
                    "state": d.get("state"),
                    "latitude": d.get("latitude", 0),
                    "longitude": d.get("longitude", 0),
                    "total_donations": d.get("total_donations", 0),
                    "points": d.get("points", 0),
                    "availability_status": d.get("availability_status", "available"),
                    "last_donation": d.get("last_donation").isoformat() if d.get("last_donation") else None,
                    "registration_date": user["created_at"].isoformat()
                })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/approve-user/{user_id}")
async def approve_user(user_id: str, current_user: dict = Depends(require_admin)):
    try:
        user = await db.users.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_approved": True}}
        )
        
        donor = await db.donors.find_one({"user_id": user_id})
        
        await send_email(
            user["email"],
            "Account Approved!",
            f"Dear {donor['name'] if donor else 'User'}, Your account has been approved. You can now login and start donating blood!"
        )
        
        if user.get("phone"):
            await send_sms(
                user["phone"],
                "Your Blood Donation account has been approved! Login now."
            )
        
        return {"message": "User approved successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/reject-user/{user_id}")
async def reject_user(user_id: str, current_user: dict = Depends(require_admin)):
    try:
        user = await db.users.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.donors.delete_one({"user_id": user_id})
        await db.users.delete_one({"id": user_id})
        
        return {"message": "User rejected"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/inventory/update")
async def update_inventory(
    data: InventoryUpdate,
    current_user: dict = Depends(require_admin)
):
    try:
        inventory = await db.blood_inventory.find_one({"blood_type": data.blood_type})
        
        if not inventory:
            inventory_id = str(uuid.uuid4())
            new_inventory = {
                "id": inventory_id,
                "blood_type": data.blood_type,
                "units_available": data.units_available,
                "temperature": data.temperature,
                "location": data.location,
                "last_updated": datetime.utcnow()
            }
            await db.blood_inventory.insert_one(new_inventory)
        else:
            await db.blood_inventory.update_one(
                {"blood_type": data.blood_type},
                {"$set": {
                    "units_available": data.units_available,
                    "temperature": data.temperature,
                    "location": data.location,
                    "last_updated": datetime.utcnow()
                }}
            )
        
        return {"message": "Inventory updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/inventory/all")
async def get_inventory():
    try:
        inventory = await db.blood_inventory.find().to_list(10)
        
        return [{
            "id": i["id"],
            "blood_type": i["blood_type"],
            "units_available": i["units_available"],
            "temperature": i.get("temperature", 4.0),
            "location": i.get("location", ""),
            "last_updated": i["last_updated"].isoformat()
        } for i in inventory]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/uploads/documents/{filename}")
async def get_uploaded_file(filename: str):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(filepath)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# INITIALIZATION
@api_router.get("/init-db")
async def init_database():
    try:
        admin = await db.users.find_one({"email": "admin@bloodbank.com"})
        
        if not admin:
            admin_id = str(uuid.uuid4())
            admin = {
                "id": admin_id,
                "email": "admin@bloodbank.com",
                "password": hash_password("admin123"),
                "role": "admin",
                "is_approved": True,
                "is_verified": True,
                "created_at": datetime.utcnow()
            }
            await db.users.insert_one(admin)
        
        blood_types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        
        for bt in blood_types:
            existing = await db.blood_inventory.find_one({"blood_type": bt})
            
            if not existing:
                inventory_id = str(uuid.uuid4())
                inv = {
                    "id": inventory_id,
                    "blood_type": bt,
                    "units_available": random.randint(20, 100),
                    "temperature": 4.0,
                    "location": "Central Blood Bank",
                    "last_updated": datetime.utcnow()
                }
                await db.blood_inventory.insert_one(inv)
        
        return {"message": "Database initialized successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Server is running",
        "timestamp": datetime.utcnow().isoformat()
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
