# SmartSwitch E-commerce - User Role Access Guide

## 🎉 Database Successfully Seeded!

Your SmartSwitch e-commerce system now has users for all different roles. You can login and access different dashboards based on the role permissions.

## 🔑 Login Credentials

### Super Admin Access (Highest Permissions)
- **Email:** `superadmin@smartswitch.com`
- **Username:** `superadmin`
- **Password:** `SuperAdmin123!`
- **Permissions:** Full system access, can manage all users and settings

### Admin Access
- **Email:** `admin@smartswitch.com`
- **Username:** `admin`
- **Password:** `Admin123!`
- **Permissions:** Most system functions except super admin exclusive features

### Store Owner Access
- **Email:** `storeowner@smartswitch.com`
- **Username:** `storeowner`
- **Password:** `StoreOwner123!`
- **Permissions:** Business oversight, financial reports, store management

### Store Manager/Admin Access
- **Email:** `storemanager@smartswitch.com`
- **Username:** `storemanager`
- **Password:** `StoreManager123!`
- **Permissions:** Inventory management, staff oversight, operations

### Salesperson Access
- **Email:** `salesperson@smartswitch.com`
- **Username:** `salesperson`
- **Password:** `Salesperson123!`
- **Permissions:** Sales tracking, commission viewing, customer management

### Sales Manager Access
- **Email:** `salesmanager@smartswitch.com`
- **Username:** `salesmanager`
- **Password:** `SalesManager123!`
- **Permissions:** Sales team management, performance analytics, campaigns

### Support Executive Access
- **Email:** `support@smartswitch.com`
- **Username:** `support`
- **Password:** `Support123!`
- **Permissions:** Customer support, inquiry management, ticket handling

### Marketing Manager Access
- **Email:** `marketing@smartswitch.com`
- **Username:** `marketing`
- **Password:** `Marketing123!`
- **Permissions:** Campaign management, marketing analytics, customer insights

### Customer Access (Regular User)
- **Email:** `customer@smartswitch.com`
- **Username:** `customer`
- **Password:** `Customer123!`
- **Permissions:** Shopping, order tracking, profile management

## 🌐 How to Access Different Dashboards

### Step 1: Open the Application
1. Go to: `http://localhost:3000`
2. Click on "Sign In" in the top right corner

### Step 2: Login with Desired Role
1. Enter the email/username and password from the credentials above
2. Click "Sign In"
3. You'll be logged in with the appropriate role permissions

### Step 3: Access Role-Specific Features

#### Super Admin / Admin Users:
- After login, navigate to: `http://localhost:3000/admin`
- You'll see the Admin Dashboard with:
  - Products management
  - Customer management  
  - Orders overview
  - System settings
  - User management (can promote/demote other users)

#### Store Owner Users:
- Access business analytics and financial reports
- Manage store operations and inventory
- View comprehensive business metrics

#### Salesperson Users:
- View commission earnings and sales performance
- Access customer data and sales tracking
- Manage assigned products and territories

#### Other Roles:
Each role has specific permissions and dashboard access based on their responsibilities in the e-commerce system.

## 🔧 Managing User Roles

### As Super Admin or Admin:
1. Login with super admin or admin credentials
2. Access the admin dashboard
3. Navigate to user management section
4. You can:
   - View all users
   - Change user roles
   - Activate/deactivate users
   - Manage permissions

### API Endpoints for User Management:
- **Get all users:** `GET /api/auth/users` (Admin only)
- **Update user role:** `PUT /api/auth/users/{user_id}/role` (Admin only)
- **Get current user:** `GET /api/auth/me`

## 🛡️ Role-Based Access Control

The system implements comprehensive role-based access control:

1. **Route Protection:** Different routes require different role permissions
2. **API Endpoints:** Backend APIs check user roles before allowing access
3. **UI Elements:** Interface elements show/hide based on user permissions
4. **Data Filtering:** Users only see data relevant to their role

## 📝 Next Steps

1. **Test Different Roles:** Login with different credentials to see how the interface changes
2. **Customize Dashboards:** Modify role-specific dashboards based on your needs
3. **Add More Users:** Use the admin interface to create additional users
4. **Configure Permissions:** Adjust role permissions as needed for your business

## 🆘 Troubleshooting

### Login Issues:
- Ensure you're using the exact credentials listed above
- Check that the backend service is running
- Verify database connection is working

### Access Denied:
- Confirm you're logged in with the appropriate role
- Some features require specific role permissions
- Super Admin has access to all features

### Need to Reset:
If you need to reset the database or create new seed data:
```bash
cd /app/backend
python3 seed_database.py
```

## 🎯 Summary

Your SmartSwitch e-commerce system now has:
✅ 9 different user roles with appropriate permissions
✅ Secure authentication and authorization system  
✅ Role-based dashboard access
✅ User management capabilities for admins
✅ Complete e-commerce functionality with role separation

You can now fully explore and test all the different user roles and their respective access levels!