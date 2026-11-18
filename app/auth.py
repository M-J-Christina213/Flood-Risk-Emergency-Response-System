"""Local password authentication; opaque expiring sessions, hashed at rest."""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, WorkflowRecord

router = APIRouter()


def password_hash(password):
    salt = secrets.token_hex(16)
    value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 310000).hex()
    return f'pbkdf2_sha256$310000${salt}${value}'


def verify_password(password, encoded):
    _, rounds, salt, expected = encoded.split('$')
    actual = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(rounds)).hex()
    return hmac.compare_digest(actual, expected)


def current_user(authorization: str = Header(default=''), db: Session = Depends(get_db)):
    if not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Sign in required', headers={'WWW-Authenticate':'Bearer'})
    token = authorization[7:]
    session = db.get(WorkflowRecord, 'session:' + hashlib.sha256(token.encode()).hexdigest())
    if session is None:
        raise HTTPException(401, 'Invalid session')
    data = json.loads(session.payload)
    user = db.get(User, data['username'])
    if datetime.fromisoformat(data['expires_at']) <= datetime.now(timezone.utc) or not user or not user.active:
        raise HTTPException(401, 'Expired or disabled session')
    return user


def staff(user=Depends(current_user)):
    if user.role not in ['admin','coordinator']:
        raise HTTPException(403, 'Coordinator or administrator required')
    return user


def admin(user=Depends(current_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Administrator required')
    return user


class Credentials(BaseModel):
    username: str = Field(min_length=3,max_length=80,pattern=r'^[A-Za-z0-9_.-]+$')
    password: str = Field(min_length=10,max_length=200)


@router.post('/auth/register')
def register(body: Credentials, db: Session = Depends(get_db)):
    if db.get(User,body.username):
        raise HTTPException(409,'Username unavailable')
    db.add(User(username=body.username,password_hash=password_hash(body.password),role='public'))
    db.commit()
    return {'username':body.username,'role':'public'}


@router.post('/auth/login')
def login(body: Credentials, db: Session = Depends(get_db)):
    user = db.get(User,body.username)
    if not user or not user.active or not verify_password(body.password,user.password_hash):
        raise HTTPException(401,'Invalid credentials')
    token = secrets.token_urlsafe(32)
    expiry = (datetime.now(timezone.utc)+timedelta(hours=8)).isoformat()
    db.add(WorkflowRecord(id='session:'+hashlib.sha256(token.encode()).hexdigest(),kind='session',
                          payload=json.dumps({'username':user.username,'expires_at':expiry})))
    db.commit()
    return {'access_token':token,'token_type':'bearer','expires_at':expiry,'username':user.username,'role':user.role}


@router.get('/auth/me')
def me(user=Depends(current_user)):
    return {'username':user.username,'role':user.role}


@router.post('/auth/logout')
def logout(authorization: str = Header(default=''), user=Depends(current_user),db: Session=Depends(get_db)):
    key = 'session:'+hashlib.sha256(authorization[7:].encode()).hexdigest()
    session = db.get(WorkflowRecord,key)
    if session:
        db.delete(session)
    db.commit()
    return {'success':True}
