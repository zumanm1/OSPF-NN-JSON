/**
 * Unified Authentication Module for OSPF-NN-JSON
 * Supports both legacy JWT mode and Auth-Vault (Keycloak) mode
 */

import jwt from 'jsonwebtoken';
import { initKeycloakVerifier } from './keycloak-verifier.js';
import { initVaultClient } from './vault-client.js';

let authMode = 'legacy';
let keycloakInitialized = false;
let vaultInitialized = false;
let vaultJwtSecret = null;

export async function initAuthVault() {
  try {
    console.log('[Auth] Checking Auth-Vault availability...');

    const keycloak = initKeycloakVerifier();
    const keycloakAvailable = await keycloak.isAvailable();

    if (keycloakAvailable) {
      console.log('[Auth] Keycloak is available at', process.env.KEYCLOAK_URL || 'http://localhost:9120');
      keycloakInitialized = true;
    } else {
      console.log('[Auth] Keycloak not available, will use legacy mode');
    }

    if (process.env.VAULT_ROLE_ID && process.env.VAULT_SECRET_ID) {
      try {
        const vault = initVaultClient();
        await vault.authenticate();
        const vaultConfig = await vault.getConfig();
        vaultJwtSecret = vaultConfig.jwt_secret;
        vaultInitialized = true;
        console.log('[Auth] Vault is available, secrets loaded');
      } catch (e) {
        console.log('[Auth] Vault not available:', e.message);
      }
    } else if (process.env.VAULT_TOKEN) {
      try {
        const vault = initVaultClient();
        const vaultConfig = await vault.getConfig();
        vaultJwtSecret = vaultConfig.jwt_secret;
        vaultInitialized = true;
        console.log('[Auth] Vault is available (token mode), secrets loaded');
      } catch (e) {
        console.log('[Auth] Vault not available:', e.message);
      }
    }

    if (keycloakInitialized) {
      authMode = 'keycloak';
      console.log('[Auth] Mode: Keycloak (Auth-Vault)');
    } else {
      authMode = 'legacy';
      console.log('[Auth] Mode: Legacy JWT');
    }

    return keycloakInitialized || vaultInitialized;
  } catch (error) {
    console.error('[Auth] Failed to initialize Auth-Vault:', error);
    return false;
  }
}

export function getJwtSecret(fallbackSecret) {
  return vaultJwtSecret || fallbackSecret;
}

export function getAuthMode() {
  return authMode;
}

export function isAuthVaultActive() {
  return keycloakInitialized || vaultInitialized;
}

export async function verifyToken(token, legacySecret) {
  if (authMode === 'keycloak' && keycloakInitialized) {
    try {
      const keycloak = initKeycloakVerifier();
      const user = await keycloak.verifyToken(token);
      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.roles[0] || 'user',
        authSource: 'keycloak',
      };
    } catch (keycloakError) {
      console.log('[Auth] Keycloak verification failed, trying legacy:', keycloakError.message);
    }
  }

  try {
    const secret = getJwtSecret(legacySecret);
    const payload = jwt.verify(token, secret);
    return {
      userId: payload.userId || payload.id,
      username: payload.username,
      role: payload.role,
      authSource: 'legacy',
    };
  } catch {
    return null;
  }
}

export function getAuthConfig() {
  return {
    authMode,
    keycloak: authMode === 'keycloak' ? {
      url: process.env.KEYCLOAK_URL || 'http://localhost:9120',
      realm: process.env.KEYCLOAK_REALM || 'ospf-nn-json',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'nn-json-frontend',
    } : null,
  };
}
