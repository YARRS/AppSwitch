# Auto-Seeding Guide - SmartSwitch IoT Backend

## 🚀 Overview

The SmartSwitch IoT backend now supports **automatic user seeding** for development convenience while maintaining production safety.

## 📋 How It Works

### Development Mode (Auto-Seeding Enabled)
```bash
# In /app/backend/.env
AUTO_SEED_USERS=true
```

**Behavior:**
- ✅ Automatically seeds 9 test users when backend starts
- ✅ Only seeds if database is completely empty  
- ✅ Skips seeding if users already exist
- ✅ Logs seeding activity clearly

### Production Mode (Auto-Seeding Disabled)
```bash
# In /app/backend/.env.production
AUTO_SEED_USERS=false
```

**Behavior:**
- ✅ No automatic seeding (production-safe)
- ✅ Logs "Auto-seeding disabled (production mode)"
- ✅ Manual seeding still available if needed

## 🔧 Configuration

### Environment Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `AUTO_SEED_USERS` | `true` | `false` | Enable/disable auto-seeding |

### Files Created/Modified

1. **`/app/backend/.env`** - Added `AUTO_SEED_USERS=true`
2. **`/app/backend/.env.production`** - Example production config
3. **`/app/backend/startup_tasks.py`** - New startup task handler
4. **`/app/backend/server.py`** - Added startup event handler
5. **`/app/backend/seed_database.py`** - Enhanced for auto-seeding

## 👥 Auto-Seeded Users

When auto-seeding is enabled, these 9 users are automatically created:

| Role | Email | Username | Password |
|------|-------|----------|----------|
| Super Admin | `superadmin@smartswitch.com` | `superadmin` | `SuperAdmin123!` |
| Admin | `admin@smartswitch.com` | `admin` | `Admin123!` |
| Store Owner | `storeowner@smartswitch.com` | `storeowner` | `StoreOwner123!` |
| Store Manager | `storemanager@smartswitch.com` | `storemanager` | `StoreManager123!` |
| Salesperson | `salesperson@smartswitch.com` | `salesperson` | `Salesperson123!` |
| Sales Manager | `salesmanager@smartswitch.com` | `salesmanager` | `SalesManager123!` |
| Support Executive | `support@smartswitch.com` | `support` | `Support123!` |
| Marketing Manager | `marketing@smartswitch.com` | `marketing` | `Marketing123!` |
| Customer | `customer@smartswitch.com` | `customer` | `Customer123!` |

## 📊 Startup Logs

### Development Mode (Auto-Seeding Enabled)
```log
INFO:server:🚀 SmartSwitch IoT Backend starting up...
INFO:startup_tasks:🚀 Running startup tasks...
INFO:startup_tasks:🌱 Database is empty, starting auto-seeding...
INFO:startup_tasks:🎉 Database seeding completed via startup task
INFO:startup_tasks:✅ Auto-seeding completed successfully
INFO:startup_tasks:✅ Startup tasks completed successfully
INFO:server:✅ Backend startup completed successfully
```

### Production Mode (Auto-Seeding Disabled)
```log
INFO:server:🚀 SmartSwitch IoT Backend starting up...
INFO:startup_tasks:🚀 Running startup tasks...
INFO:startup_tasks:ℹ️  Auto-seeding disabled (production mode)
INFO:startup_tasks:✅ Startup tasks completed successfully
INFO:server:✅ Backend startup completed successfully
```

### Already Seeded (Skip Mode)
```log
INFO:server:🚀 SmartSwitch IoT Backend starting up...
INFO:startup_tasks:🚀 Running startup tasks...
INFO:startup_tasks:ℹ️  Database already has 9 users, skipping auto-seeding
INFO:startup_tasks:✅ Startup tasks completed successfully
INFO:server:✅ Backend startup completed successfully
```

## 🔒 Production Safety Features

1. **Default Disabled**: Auto-seeding is disabled by default
2. **Environment Control**: Only enabled when explicitly set to `true`
3. **Empty Database Check**: Only seeds if users collection is empty
4. **Graceful Failure**: Seeding failures don't crash the application
5. **Clear Logging**: Always logs seeding status

## 🛠️ Manual Seeding (Still Available)

If you need to manually seed the database:

```bash
# Option 1: Direct Python script
cd /app && python backend/seed_database.py

# Option 2: Shell script wrapper
bash scripts/seed_database.sh
```

## 🔧 Troubleshooting

### Issue: Auto-seeding not working
**Solution:** Check environment variable
```bash
# In /app/backend/.env
AUTO_SEED_USERS=true  # Must be exactly 'true'
```

### Issue: Users not being created
**Solution:** Check database connection and logs
```bash
# Check backend logs
tail -f /var/log/supervisor/backend.*.log

# Check database connection
curl http://localhost:8001/api/health
```

### Issue: Seeding in production
**Solution:** Ensure production config disables seeding
```bash
# In production .env
AUTO_SEED_USERS=false
```

## 📈 Benefits

### For Developers
- ✅ No manual seeding needed
- ✅ Instant access to all user roles
- ✅ Consistent development environment
- ✅ Faster development workflow

### For Production
- ✅ No accidental test data creation
- ✅ Secure by default
- ✅ Manual control when needed
- ✅ Clear audit trail

## 🔄 Migration from Manual Seeding

If you were previously using manual seeding:

1. **No Changes Required**: Manual seeding still works
2. **Automatic Benefit**: Just restart your backend
3. **Environment Control**: Set `AUTO_SEED_USERS=true` in development
4. **Production Safety**: Set `AUTO_SEED_USERS=false` in production

Your existing user accounts remain untouched!