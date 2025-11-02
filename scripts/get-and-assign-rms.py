#!/usr/bin/env python3
"""
Get RM User IDs and Assign Applications
Creates a summary with all RM IDs for testing
"""

import json
import subprocess
import sys

KEYCLOAK_URL = "http://localhost:8080"
REALM = "los"

def get_token():
    """Get Keycloak admin token"""
    cmd = [
        "curl", "-s", "-X", "POST",
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "-d", "username=admin",
        "-d", "password=admin",
        "-d", "grant_type=password",
        "-d", "client_id=admin-cli"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        return data.get("access_token")
    except:
        return None

def get_user_id(token, username):
    """Get user ID by username"""
    cmd = [
        "curl", "-s", "-X", "GET",
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={username}",
        "-H", f"Authorization: Bearer {token}"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        users = json.loads(result.stdout)
        if users and len(users) > 0:
            return users[0].get("id")
    except:
        pass
    return None

def assign_role(token, user_id, role_name):
    """Assign role to user"""
    # Get role ID
    cmd = [
        "curl", "-s", "-X", "GET",
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role_name}",
        "-H", f"Authorization: Bearer {token}"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        role_data = json.loads(result.stdout)
        role_id = role_data.get("id")
        if not role_id:
            return False
    except:
        return False
    
    # Assign role
    role_payload = json.dumps([{"id": role_id, "name": role_name}])
    cmd = [
        "curl", "-s", "-X", "POST",
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm",
        "-H", f"Authorization: Bearer {token}",
        "-H", "Content-Type: application/json",
        "-d", role_payload
    ]
    subprocess.run(cmd, capture_output=True)
    return True

def main():
    print("🔐 Getting Keycloak admin token...")
    token = get_token()
    if not token:
        print("❌ Failed to get admin token")
        sys.exit(1)
    
    print("✅ Got token\n")
    
    # Ensure rm role exists
    print("📋 Checking roles...")
    for role in ["rm", "relationship_manager"]:
        cmd = [
            "curl", "-s", "-X", "POST",
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"name": role, "description": role})
        ]
        subprocess.run(cmd, capture_output=True)  # May fail if exists, that's OK
    
    print("✅ Roles ready\n")
    
    # Get or create RM users
    print("👥 Getting RM user IDs...\n")
    rm_users = {}
    
    for username in ["rm1", "rm2", "rm3"]:
        user_id = get_user_id(token, username)
        if user_id:
            print(f"✅ {username}: {user_id}")
            rm_users[username] = user_id
            
            # Assign roles
            assign_role(token, user_id, "rm")
            assign_role(token, user_id, "relationship_manager")
        else:
            print(f"⚠️  {username} not found")
    
    if not rm_users:
        print("\n❌ No RM users found. Create them first:")
        print("   Run: ./scripts/create-users-simple.sh")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("📋 RM USER IDs FOR TESTING")
    print("="*60)
    print()
    for username, user_id in rm_users.items():
        print(f"{username:6} | {user_id}")
    print()
    
    # Assign applications
    print("📝 Assigning applications to RMs...")
    
    # Clear existing assignments
    subprocess.run([
        "docker", "exec", "los-postgres", "psql", "-U", "los", "-d", "los",
        "-c", "UPDATE applications SET assigned_to = NULL;"
    ], capture_output=True)
    
    # Assign to each RM
    rms = list(rm_users.items())
    apps_per_rm = 10
    
    for i, (username, user_id) in enumerate(rms):
        limit = apps_per_rm
        offset = i * apps_per_rm
        
        sql = f"""
        UPDATE applications 
        SET assigned_to = '{user_id}'
        WHERE application_id IN (
          SELECT application_id FROM applications 
          WHERE assigned_to IS NULL
          ORDER BY created_at 
          LIMIT {limit}
        );
        """
        
        result = subprocess.run([
            "docker", "exec", "los-postgres", "psql", "-U", "los", "-d", "los",
            "-c", sql
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ {username}: Assigned {apps_per_rm} applications")
        else:
            print(f"⚠️  {username}: Assignment may have failed")
    
    print()
    
    # Show summary
    print("📊 Assignment Summary:")
    subprocess.run([
        "docker", "exec", "los-postgres", "psql", "-U", "los", "-d", "los",
        "-c", f"""
        SELECT 
          CASE 
            WHEN assigned_to = '{rm_users.get('rm1', '')}' THEN 'RM1 (rm1)'
            WHEN assigned_to = '{rm_users.get('rm2', '')}' THEN 'RM2 (rm2)'
            WHEN assigned_to = '{rm_users.get('rm3', '')}' THEN 'RM3 (rm3)'
            ELSE 'Unassigned'
          END as assigned_to,
          COUNT(*) as count
        FROM applications
        GROUP BY assigned_to
        ORDER BY assigned_to;
        """
    ])
    
    print("\n" + "="*60)
    print("✅ SETUP COMPLETE!")
    print("="*60)
    print()
    print("🧪 Test Data Isolation:")
    print()
    print("1. Login as rm1 → Should see 10 applications only")
    print("2. Login as rm2 → Should see 10 DIFFERENT applications")
    print("3. Login as rm3 → Should see 10 DIFFERENT applications")
    print("4. Login as admin1 → Should see ALL applications")
    print()
    print("🌐 Access: http://localhost:5173")
    print()

if __name__ == "__main__":
    main()

