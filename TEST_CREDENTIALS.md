# Test Credentials

For local development testing, the following test accounts are available:

## Admin Account
- **Email**: `admin@matterflow.local`
- **Password**: `password123`
- **Role**: Admin
- **User ID**: `00000000-0000-0000-0000-000000000001`

## Client Account
- **Email**: `client@matterflow.local`
- **Password**: `password123`
- **Role**: Client
- **User ID**: `00000000-0000-0000-0000-000000000002`

## Additional Existing Accounts
The database may also contain:
- `bpdoud@gmail.com`
- `bdoud@develotype.com`

## Usage
1. Navigate to http://localhost:3001/auth/sign-in
2. Enter one of the test emails and password
3. Click "Sign In"

## Notes
- These credentials are for **local development only**
- Password hash: bcrypt with cost factor 10
- All test users have confirmed emails
- Profiles are seeded in the `profiles` table matching these user IDs
