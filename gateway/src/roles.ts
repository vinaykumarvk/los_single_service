/**
 * Role-based UI Views and Permissions
 * Provides role-specific UI configurations and permissions
 */

import express from 'express';

export interface RolePermissions {
  canViewApplications: boolean;
  canCreateApplications: boolean;
  canEditApplications: boolean;
  canDeleteApplications: boolean;
  canApproveApplications: boolean;
  canRejectApplications: boolean;
  canViewPII: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageRules: boolean;
  canViewAuditLogs: boolean;
  canExportData: boolean;
}

export interface UIRoleConfig {
  role: string;
  permissions: RolePermissions;
  uiFeatures: string[]; // List of UI feature flags for this role
  menuItems: string[]; // Menu items visible to this role
}

/**
 * Get role permissions for a user
 */
export function getUserRolePermissions(user: any): RolePermissions {
  const roles: string[] = user?.realm_access?.roles || [];
  
  // Define role-based permissions
  const permissions: RolePermissions = {
    canViewApplications: roles.includes('maker') || roles.includes('checker') || roles.includes('admin'),
    canCreateApplications: roles.includes('maker') || roles.includes('admin'),
    canEditApplications: roles.includes('maker') || roles.includes('admin'),
    canDeleteApplications: roles.includes('admin'),
    canApproveApplications: roles.includes('checker') || roles.includes('admin'),
    canRejectApplications: roles.includes('checker') || roles.includes('admin'),
    canViewPII: roles.includes('pii:read') || roles.includes('checker') || roles.includes('admin'),
    canViewReports: roles.includes('checker') || roles.includes('admin'),
    canManageUsers: roles.includes('admin'),
    canManageRules: roles.includes('admin'),
    canViewAuditLogs: roles.includes('checker') || roles.includes('admin'),
    canExportData: roles.includes('checker') || roles.includes('admin')
  };
  
  return permissions;
}

/**
 * Get UI configuration for a user's roles
 */
export function getUserUIConfig(user: any): UIRoleConfig {
  const roles: string[] = user?.realm_access?.roles || [];
  const permissions = getUserRolePermissions(user);
  
  // Determine UI features based on roles
  const uiFeatures: string[] = [];
  const menuItems: string[] = [];
  
  if (permissions.canViewApplications) {
    menuItems.push('applications', 'dashboard');
    uiFeatures.push('viewApplications');
  }
  
  if (permissions.canCreateApplications) {
    uiFeatures.push('createApplications');
    menuItems.push('newApplication');
  }
  
  if (permissions.canApproveApplications) {
    uiFeatures.push('approveApplications', 'rejectApplications');
    menuItems.push('pendingApprovals');
  }
  
  if (permissions.canViewReports) {
    uiFeatures.push('viewReports', 'viewAnalytics');
    menuItems.push('reports', 'analytics');
  }
  
  if (permissions.canManageUsers) {
    uiFeatures.push('manageUsers');
    menuItems.push('users', 'roles');
  }
  
  if (permissions.canManageRules) {
    uiFeatures.push('manageRules');
    menuItems.push('rules');
  }
  
  if (permissions.canViewAuditLogs) {
    uiFeatures.push('viewAuditLogs');
    menuItems.push('audit');
  }
  
  // Primary role (first role or 'user' as default)
  const primaryRole = roles.length > 0 ? roles[0] : 'user';
  
  return {
    role: primaryRole,
    permissions,
    uiFeatures,
    menuItems
  };
}

/**
 * Express endpoint handler for GET /api/user/roles
 */
export function getUserRolesHandler(req: express.Request, res: express.Response) {
  const user: any = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const config = getUserUIConfig(user);
  
  return res.status(200).json({
    userId: user.sub || user.id,
    email: user.email,
    roles: user.realm_access?.roles || [],
    primaryRole: config.role,
    permissions: config.permissions,
    uiFeatures: config.uiFeatures,
    menuItems: config.menuItems
  });
}

