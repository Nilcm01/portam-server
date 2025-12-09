import express from 'express';
import supabase from '../config/supabase.js';
import { getMessage, getMessageWithData } from '../messages/auth.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/*
    Sessions:
    - user (PK, FK, UQ) - int8
    - device (PK, UQ)   - text
    - token             - text
    - created           - timestampt
    - last_use          - timestamp
    - expiration        - timestamp
    > Only one active session per [user, device] pair. If a new session is being created for the same pair, the old one is deleted first.

    Users:
    - id (PK, UQ)   - int8
    - name          - varchar
    - surname       - varchar
    - gov_id        - varchar
    - email (UQ)    - varchar
    - phone         - varchar
    - birthdate     - date
    - password      - varchar (hashed)
*/


//// AUTH CONTROLLERS


/* Create a new user > POST: /auth/register

    Input:
    body: {
        "name": "Nom",
        "surname": "Cognoms",
        "govId": "12345678X",
        "email": "usuari@example.com",
        "phone": "123456789",
        "birthdate": "1990-01-01",
        "password": "contrassenyaSuperSecreta",
        "deviceId": "ID_DISPOSITIU_X"
    }

    Output:
    - Success:
    body: {
        "success": true,
        "code": 201,
        "status": "USER_REGISTERED",
        "msg": { result_messages },
        "userId": 1,
        "token": "abc123def456ghi789jkl012",
        "expiration": "2024-07-01T12:00:00.000Z"
        "user": { userData.!password }
    }
    - Error:
    body: {
        "success": false,
        "code": 400,
        "status": "USER_REGISTRATION_FAILED",
        "msg": { result_messages }
    }

    Sequence:
    1. Validate input
        - if missing, return error REGISTER_MISSING_PARAMETERS
        - if invalid, return error REGISTER_INVALID_PARAMETERS
    2. Check if email or govId already exists
        - if exists, return error REGISTER_USER_EXISTS
    3. Hash password
    4. Insert new user in DB
    5. Create new session
    6. Return success response with user data and token (REGISTER_SUCCESS)
*/
const register = async (req, res) => {
    try {
        const { name, surname, govId, email, phone, birthdate, password, deviceId } = req.body;

        //// 1. Validate input

        // Check for missing parameters
        if (!name || !surname || !govId || !email || !phone || !birthdate || !password || !deviceId) {
            const message = getMessage('REGISTER_MISSING_PARAMETERS');
            return res.status(message.code).json(message);
        }

        // Check for valid email and birthdate format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
        if (!emailRegex.test(email) || !birthdateRegex.test(birthdate)) {
            const message = getMessage('');
            return res.status(message.code).json(message);
        }

        //// 2. Check if email or govId already exists (check separately to provide accurate error messages)

        const { data: emailData, error: emailError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (emailError && emailError.code !== 'PGRST116') throw emailError;

        if (emailData) {
            const message = getMessage('REGISTER_USER_EXISTS_EMAIL');
            return res.status(message.code).json(message);
        }

        const { data: govIdData, error: govIdError } = await supabase
            .from('users')
            .select('id')
            .eq('gov_id', govId)
            .single();

        if (govIdError && govIdError.code !== 'PGRST116') throw govIdError;

        if (govIdData) {
            const message = getMessage('REGISTER_USER_EXISTS_GOVID');
            return res.status(message.code).json(message);
        }
        
        //// 3. Hash password

        const passwordHash = await bcrypt.hash(password, 12);

        //// 4. Insert new user in DB

        // Generate user ID
        // 12 digit random number
        let userId = '';
        do {
            userId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
            // Check if userId already exists
            const { data: existingUser, error: existingError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();
            if (existingError && existingError.code !== 'PGRST116') {
                throw existingError;
            }
            if (!existingUser) break; // Unique ID found
        } while (true);

        // Insert new user

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                id: userId,
                name,
                surname,
                gov_id: govId,
                email,
                phone,
                birthdate,
                password: passwordHash
            })
            .select('*')
            .single();

        if (insertError) throw insertError;

        //// 5. Create new session

        // If a session for this [user, device] already exists, delete it first
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('user', newUser.id)
            .eq('device', deviceId);

        if (deleteError) throw deleteError;

        // Create new session
        const token = crypto.randomBytes(24).toString('hex');
        const tokenHash = await bcrypt.hash(token, 12);
        const createdAt = getTimestampFromDate(new Date());
        const expiration = getTimestampFromDate(new Date(new Date(createdAt) + 7 * 24 * 60 * 60 * 1000)); // 7 days

        const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
                user: newUser.id,
                device: deviceId,
                token: tokenHash,
                created: createdAt,
                last_use: createdAt,
                expiration: expiration
            })
            .select('*')
            .single();

        if (sessionError) throw sessionError;

        //// 6. Return success response with user data and token

        const message = getMessageWithData('REGISTER_SUCCESS', {
            userId: newUser.id,
            token: token,
            expiration: newSession.expiration,
            user: {
                id: newUser.id,
                name: newUser.name,
                surname: newUser.surname,
                govId: newUser.gov_id,
                email: newUser.email,
                phone: newUser.phone,
                birthdate: newUser.birthdate
            }
        });

        return res.status(message.code).json(message);
    } catch (error) {
        console.error('Register error:', error);
        const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
            internal: `Unexpected error during registration: ${error.message}`
        });
        return res.status(message.code).json(message);
    }
};

/* Attempt new login > POST: /auth/login

    Input:
    body: {
        "email": "usuari@example.com",
        "password": "contrassenyaSuperSecreta",
        "deviceId": "ID_DISPOSITIU_X"
    }

    Output:
    - Success:
    body: {
        "success": true,
        "code": 200,
        "status": "USER_LOGGED_IN",
        "msg": { result_messages },
        "userId": 1,
        "token": "abc123def456ghi789jkl012",
        "expiration": "2024-07-01T12:00:00.000Z"
        "user": { userData.!password }
    }
    - Error:
    body: {
        "success": false,
        "code": 400,
        "status": "USER_LOGIN_FAILED",
        "msg": { result_messages }
    }

    Sequence:
    1. Validate input
        - if missing/invalid, return error LOGIN_MISSING_PARAMETERS
    2. Retrieve user by email
        - if not found, return error LOGIN_INVALID_CREDENTIALS
    3. Compare password hashes
        - if not match, return error LOGIN_INVALID_CREDENTIALS
    4. Create new session
    5. Return success response with user data and token
*/
const login = async (req, res) => {
    try {
        const { email, password, deviceId } = req.body;

        //// 1. Validate input

        // Check for missing parameters
        if (!email || !password || !deviceId) {
            const message = getMessage('LOGIN_MISSING_PARAMETERS');
            return res.status(message.code).json(message);
        }

        //// 2. Retrieve user by email

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError) {
            if (userError.code === 'PGRST116') {
                // User not found
                const message = getMessage('LOGIN_INVALID_CREDENTIALS');
                return res.status(message.code).json(message);
            } else {
                throw userError;
            }
        }

        //// 3. Compare password hashes

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            const message = getMessage('LOGIN_INVALID_CREDENTIALS');
            return res.status(message.code).json(message);
        }

        //// 4. Create new session

        // If a session for this [user, device] already exists, delete it first
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('user', user.id)
            .eq('device', deviceId);

        if (deleteError) throw deleteError;

        // Create new session
        const token = crypto.randomBytes(24).toString('hex');
        const tokenHash = await bcrypt.hash(token, 12);
        const createdAt = getTimestampFromDate(new Date());
        const expiration = getTimestampFromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

        const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
                user: user.id,
                device: deviceId,
                token: tokenHash,
                created: createdAt,
                last_use: createdAt,
                expiration: expiration
            })
            .select('*')
            .single();

        if (sessionError) throw sessionError;

        //// 5. Return success response with user data and token

        const message = getMessageWithData('LOGIN_SUCCESS', {
            userId: user.id,
            token: token,
            expiration: newSession.expiration,
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                govId: user.gov_id,
                email: user.email,
                phone: user.phone,
                birthdate: user.birthdate
            }
        });

        return res.status(message.code).json(message);
    } catch (error) {
        console.error('Login error:', error);
        const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
            internal: `Unexpected error during login: ${error.message}`
        });
        return res.status(message.code).json(message);
    }
};


/* Check session validity > POST: /auth/check-session

    Input:
    body: {
        "userId": 1,
        "deviceId": "ID_DISPOSITIU_X",
        "token": "abc123def456ghi789jkl012"
    }

    Output:
    - Valid session:
    body: {
        "success": true,
        "code": 200,
        "status": "SESSION_VALID",
        "msg": { result_messages },
        "userId": 1,
        "token": "abc123def456ghi789jkl012",
        "expiration": "2024-07-01T12:00:00.000Z",
        "user": { userData.!password }
    }
    - Invalid session:
    body: {
        "success": false,
        "code": 401,
        "status": "SESSION_INVALID",
        "msg": { result_messages }
    }

    Sequence:
    1. Validate input
        - if missing/invalid, return error SESSION_MISSING_PARAMETERS
    2. Retrieve session by [userId, deviceId]
        - if not found, return invalid response SESSION_NOT_FOUND
    3. Verify token matches
        - if not match, return invalid response SESSION_INVALID_TOKEN
    4. Check expiration
        - If valid, update last_use and return success response (SESSION_VALID)
        - If expired, delete session and return invalid response (SESSION_EXPIRED)
    5. Return response (SESSION_VALID / SESSION_INVALID)
*/
const checkSession = async (req, res) => {
    try {
        const { userId, deviceId, token } = req.body;

        //// 1. Validate input

        if (!userId || !deviceId || !token) {
            const message = getMessage('SESSION_MISSING_PARAMETERS');
            return res.status(message.code).json(message);
        }

        //// 2. Retrieve session by [userId, deviceId]

        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('user', userId)
            .eq('device', deviceId)
            .single();

        if (sessionError) {
            if (sessionError.code === 'PGRST116') {
                // Session not found
                const message = getMessage('SESSION_NOT_FOUND');
                return res.status(message.code).json(message);
            } else {
                throw sessionError;
            }
        }

        //// 3. Verify token matches

        const tokenMatch = await bcrypt.compare(token, session.token);
        if (!tokenMatch) {
            const message = getMessage('SESSION_INVALID_TOKEN');
            return res.status(message.code).json(message);
        }

        //// 4. Check expiration

        const now = new Date();
        const expirationDate = new Date(session.expiration);

        if (now > expirationDate) {
            // Session expired - delete it
            const { error: deleteError } = await supabase
                .from('sessions')
                .delete()
                .eq('user', userId)
                .eq('device', deviceId);

            if (deleteError) throw deleteError;

            const message = getMessage('SESSION_EXPIRED');
            return res.status(message.code).json(message);
        }

        // Session valid - update last_use and extend expiration for 7 more days
        const { error: updateError } = await supabase
            .from('sessions')
            .update({ 
                last_use: getTimestampFromDate(now), 
                expiration: getTimestampFromDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) })
            .eq('user', userId)
            .eq('device', deviceId);

        if (updateError) throw updateError;

        //// 5. Return response (SESSION_VALID)

        // Retrieve user data
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        const message = getMessageWithData('SESSION_VALID', {
            userId: user.id,
            token: token,
            expiration: session.expiration,
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                govId: user.gov_id,
                email: user.email,
                phone: user.phone,
                birthdate: user.birthdate
            }
        });

        return res.status(message.code).json(message);
    } catch (error) {
        console.error('Check session error:', error);
        const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
            internal: `Unexpected error during session check: ${error.message}`
        });
        return res.status(message.code).json(message);
    }
};

function getTimestampFromDate(date) {
    return date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + 'T' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0') + ':' +
                String(date.getSeconds()).padStart(2, '0');
}

export {
    register,
    login,
    checkSession
};