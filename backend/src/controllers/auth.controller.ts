import type { CookieOptions, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { CSRF_COOKIE, createSecret, SESSION_COOKIE } from '../utils/auth.js';
import { body, forgotSchema, loginSchema, registerSchema, resetSchema, tokenSchema, updateMeSchema } from '../validators/auth.validator.js';

const auth = new AuthService();
// Customer APIs beyond /auth use the same server-side session cookie.
const baseCookie: CookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
const csrfCookie: CookieOptions = { httpOnly: false, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
function establishSession(res: Parameters<RequestHandler>[1], token: string): string { const csrfToken = createSecret(); res.cookie(SESSION_COOKIE, token, { ...baseCookie, maxAge: 30 * 24 * 60 * 60 * 1000 }); res.cookie(CSRF_COOKIE, csrfToken, { ...csrfCookie, maxAge: 30 * 24 * 60 * 60 * 1000 }); return csrfToken; }

export const register: RequestHandler = async (req, res, next) => { try { const input = body(registerSchema, req.body); const result = await auth.register(input); const csrfToken = establishSession(res, await auth.createSession(result.user.id)); res.status(201).json({ success: true, data: { user: result.user, emailSent: result.emailSent, csrfToken } }); } catch (error) { next(error); } };
export const login: RequestHandler = async (req, res, next) => { try { const result = await auth.login(body(loginSchema, req.body)); const csrfToken = establishSession(res, result.sessionToken); res.json({ success: true, data: { user: result.user, csrfToken } }); } catch (error) { next(error); } };
export const me: RequestHandler = async (req, res, next) => { try { const csrfToken = req.cookies?.[CSRF_COOKIE] ?? ''; res.json({ success: true, data: { user: await auth.me(req.auth!.userId), csrfToken } }); } catch (error) { next(error); } };
export const logout: RequestHandler = async (req, res, next) => { try { await auth.logout(req.cookies?.[SESSION_COOKIE]); res.clearCookie(SESSION_COOKIE, baseCookie).clearCookie(CSRF_COOKIE, csrfCookie).json({ success: true, data: {} }); } catch (error) { next(error); } };
export const csrf: RequestHandler = (_req, res) => { const token = createSecret(); res.cookie(CSRF_COOKIE, token, csrfCookie).json({ success: true, data: { csrfToken: token } }); };
export const verifyEmail: RequestHandler = async (req, res, next) => { try { await auth.verify(body(tokenSchema, req.body).token); res.json({ success: true, data: {} }); } catch (error) { next(error); } };
export const forgotPassword: RequestHandler = async (req, res, next) => { try { await auth.forgot(body(forgotSchema, req.body).email); res.json({ success: true, data: { message: 'If an account exists, a reset email will be sent.' } }); } catch (error) { next(error); } };
export const resendVerification: RequestHandler = async (req, res, next) => { try { await auth.resendVerification(body(forgotSchema, req.body).email); res.json({ success: true, data: { message: 'If an account exists, a verification email will be sent.' } }); } catch (error) { next(error); } };
export const resetPassword: RequestHandler = async (req, res, next) => { try { const input = body(resetSchema, req.body); await auth.reset(input.token, input.password); res.json({ success: true, data: {} }); } catch (error) { next(error); } };
export const updateMe: RequestHandler = async (req, res, next) => { try { res.json({ success: true, data: { user: await auth.update(req.auth!.userId, body(updateMeSchema, req.body)) } }); } catch (error) { next(error); } };
