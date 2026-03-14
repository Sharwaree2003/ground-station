#!/usr/bin/env python3
"""
Reset Admin User Script
Creates or resets the admin user for Ground Station Management System
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin():
    """Reset or create admin user"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔄 Resetting admin user...")
    
    # Delete existing admin user
    result = await db.users.delete_many({"username": "admin"})
    if result.deleted_count > 0:
        print(f"✅ Deleted {result.deleted_count} existing admin user(s)")
    
    # Create new admin user
    hashed_password = pwd_context.hash("admin123")
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "password": hashed_password,
        "email": "admin@groundstation.local",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    print("✅ Admin user created successfully")
    print("")
    print("Login credentials:")
    print("  Username: admin")
    print("  Password: admin123")
    print("")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin())
