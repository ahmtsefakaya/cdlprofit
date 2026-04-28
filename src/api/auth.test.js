import { describe, it, expect } from 'vitest';
import { authService } from './auth';

describe('authService', () => {
    it('exports all required methods', () => {
        expect(typeof authService.login).toBe('function');
        expect(typeof authService.register).toBe('function');
        expect(typeof authService.logout).toBe('function');
        expect(typeof authService.me).toBe('function');
        expect(typeof authService.resetPassword).toBe('function');
    });

    it('has exactly 5 methods', () => {
        const methods = Object.keys(authService);
        expect(methods).toHaveLength(5);
        expect(methods).toContain('login');
        expect(methods).toContain('register');
        expect(methods).toContain('logout');
        expect(methods).toContain('me');
        expect(methods).toContain('resetPassword');
    });
});
