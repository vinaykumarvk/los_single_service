#!/usr/bin/env node

/**
 * Create Test Users in Keycloak
 * Creates RM, Admin, and Operations users with appropriate roles
 */

const http = require('http');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const REALM = 'los';
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function getAdminToken() {
  const url = new URL(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`);
  const params = new URLSearchParams({
    username: ADMIN_USER,
    password: ADMIN_PASSWORD,
    grant_type: 'password',
    client_id: 'admin-cli'
  });

  const response = await makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (response.status === 200 && response.data.access_token) {
    return response.data.access_token;
  }
  throw new Error('Failed to get admin token');
}

async function getRoleId(token, roleName) {
  const url = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${roleName}`);
  const response = await makeRequest(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 200) {
    return response.data.id;
  }
  return null;
}

async function createUser(token, userData) {
  const url = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`);
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      enabled: true,
      credentials: [{
        type: 'password',
        value: userData.password,
        temporary: false
      }]
    }
  });

  if (response.status === 201 || response.status === 409) {
    // Get user ID
    const getUrl = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`);
    getUrl.searchParams.append('username', userData.username);
    
    const getResponse = await makeRequest(getUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (getResponse.status === 200 && getResponse.data.length > 0) {
      return getResponse.data[0].id;
    }
  }
  
  throw new Error(`Failed to create user: ${userData.username}`);
}

async function assignRoles(token, userId, roleNames) {
  const roleIds = [];
  for (const roleName of roleNames) {
    const roleId = await getRoleId(token, roleName);
    if (roleId) {
      roleIds.push({ id: roleId, name: roleName });
    }
  }

  if (roleIds.length > 0) {
    const url = new URL(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`);
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: roleIds
    });

    return response.status === 204;
  }
  return false;
}

async function main() {
  console.log('🔐 Getting Keycloak admin token...');
  
  let token;
  try {
    token = await getAdminToken();
    console.log('✅ Got admin token\n');
  } catch (error) {
    console.error('❌ Failed to get admin token:', error.message);
    console.log('\n⚠️  Make sure Keycloak is running:');
    console.log('   docker ps | grep keycloak');
    console.log('   Or: cd infra && docker compose up -d keycloak\n');
    process.exit(1);
  }

  const users = [
    {
      username: 'rm1',
      password: 'rm1',
      email: 'rm1@los.test',
      firstName: 'Relationship',
      lastName: 'Manager',
      roles: ['rm', 'relationship_manager']
    },
    {
      username: 'admin1',
      password: 'admin1',
      email: 'admin1@los.test',
      firstName: 'System',
      lastName: 'Administrator',
      roles: ['admin', 'pii:read']
    },
    {
      username: 'ops1',
      password: 'ops1',
      email: 'ops1@los.test',
      firstName: 'Operations',
      lastName: 'Officer',
      roles: ['ops', 'checker']
    }
  ];

  console.log('👥 Creating users...\n');

  for (const userData of users) {
    try {
      console.log(`Creating user: ${userData.username}...`);
      const userId = await createUser(token, userData);
      console.log(`  ✅ User created (ID: ${userId})`);
      
      console.log(`  Assigning roles: ${userData.roles.join(', ')}...`);
      const assigned = await assignRoles(token, userId, userData.roles);
      if (assigned) {
        console.log(`  ✅ Roles assigned\n`);
      } else {
        console.log(`  ⚠️  Some roles may not exist (this is OK)\n`);
      }
    } catch (error) {
      if (error.message.includes('409') || error.message.includes('already exists')) {
        console.log(`  ⚠️  User already exists, skipping...\n`);
      } else {
        console.error(`  ❌ Error: ${error.message}\n`);
      }
    }
  }

  console.log('✅ User creation complete!\n');
  console.log('📋 Test Users:');
  console.log('   RM:      rm1 / rm1');
  console.log('   Admin:   admin1 / admin1');
  console.log('   Ops:     ops1 / ops1\n');
  console.log('🚀 Next: Run ./scripts/setup-rm-assignments.sh to assign applications');
}

main().catch(console.error);

