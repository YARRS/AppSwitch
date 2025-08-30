import asyncio
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Minimal mock of Motor collection with async methods
class MockCollection:
    def __init__(self):
        self.store = {}
        self._next_id = 1

    async def delete_many(self, query):
        phone = query.get('phone_number')
        if phone:
            keys = [k for k,v in list(self.store.items()) if v.get('phone_number')==phone]
            for k in keys:
                del self.store[k]

    async def insert_one(self, doc):
        _id = str(self._next_id)
        self._next_id += 1
        doc_copy = dict(doc)
        doc_copy['_id'] = _id
        self.store[_id] = doc_copy
        return type('R', (), {'inserted_id': _id})()

    async def find_one(self, query):
        phone = query.get('phone_number')
        is_verified = query.get('is_verified')
        for v in self.store.values():
            if v.get('phone_number')==phone and v.get('is_verified')==is_verified:
                return v
        return None

    async def update_one(self, query, update):
        _id = query.get('_id')
        if _id in self.store:
            # handle $set and $inc
            if '$set' in update:
                self.store[_id].update(update['$set'])
            if '$inc' in update:
                for k, val in update['$inc'].items():
                    self.store[_id][k] = int(self.store[_id].get(k, 0)) + int(val)
            return type('R', (), {'modified_count': 1})()
        return type('R', (), {'modified_count': 0})()

    async def delete_one(self, query):
        _id = query.get('_id')
        if _id in self.store:
            del self.store[_id]


class MockDB:
    def __init__(self):
        self.otp_sessions = MockCollection()


async def run_test():
    # Import here so it picks up project modules
    # Add backend root to sys.path so `routes` package can be imported
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))
    from routes.otp import OTPService

    db = MockDB()
    svc = OTPService(db)

    phone = '9876543210'

    print('Sending OTP...')
    res = await svc.send_otp(phone)
    print('send_otp result:', res)

    print('Stored session:', db.otp_sessions.store)

    print('Verifying with correct OTP...')
    ok = await svc.verify_otp(phone, '123456')
    print('verify result (should be True):', ok)

    # Try verifying again (should fail because marked verified)
    ok2 = await svc.verify_otp(phone, '123456')
    print('verify again (should be False):', ok2)

    # Test wrong OTP
    await svc.send_otp(phone)
    print('Verifying with wrong OTP...')
    ok3 = await svc.verify_otp(phone, '000000')
    print('verify wrong (should be False):', ok3)


if __name__ == '__main__':
    asyncio.run(run_test())
