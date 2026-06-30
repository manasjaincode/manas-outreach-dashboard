// AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // State variables for authentication
    const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
    const [authToken, setAuthToken] = useState(null); // This will hold the MAIN user token
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // NEW: State to indicate if initial auth check is in progress

    // Helper to check auth status from sessionStorage, handles cleanup for main token
    const checkAuthStatus = useCallback(() => {
        const storedAuthToken = sessionStorage.getItem('userAuthToken'); // Use specific key for MAIN token
        const storedExpiry = sessionStorage.getItem('tokenExpiry');
        const storedUserInfoString = sessionStorage.getItem('userInfo');

        let isAuth = false;
        let token = null;
        let userData = null;
        let tokenExpiryTime = null;

        if (storedAuthToken && storedExpiry && storedUserInfoString) {
            const currentTime = Date.now();
            tokenExpiryTime = parseInt(storedExpiry, 10);

            if (currentTime < tokenExpiryTime) {
                // Token exists and is not expired
                try {
                    userData = JSON.parse(storedUserInfoString);
                    isAuth = true;
                    token = storedAuthToken;
                } catch (e) {
                    console.error("AuthContext: Failed to parse userInfo from sessionStorage. Treat as unauthenticated.", e);
                    // If userInfo is corrupted, isAuth remains false
                }
            } 
        } else {
            // console.log("AuthContext: Missing token, expiry, or userInfo for main auth. User is unauthenticated.");
        }

        // CRITICAL: If not authenticated by the end of the check, ensure main auth items are cleared
        if (!isAuth) {
            // console.log("AuthContext: Not authenticated. Clearing main auth sessionStorage items.");
            sessionStorage.removeItem('userAuthToken'); // Ensure MAIN token is cleared
            sessionStorage.removeItem('tokenExpiry');
            sessionStorage.removeItem('userInfo');
        }

        return {
            isAuthenticated: isAuth,
            authToken: token, // This will be the main token
            userInfo: userData,
            tokenExpiry: tokenExpiryTime
        };
    }, []); // No external dependencies, so an empty array is fine

    // Initial authentication check on component mount
    useEffect(() => {
        const { isAuthenticated, authToken, userInfo } = checkAuthStatus();
        setIsAuthenticatedState(isAuthenticated);
        setAuthToken(authToken);
        setUserInfo(userInfo);
        setIsLoading(false); // Set isLoading to false after the initial check is complete
    }, [checkAuthStatus]); // Dependency on checkAuthStatus ensures it's stable

    // Login function: stores the MAIN user token and sets state
    const login = useCallback((token, user, expiresInSeconds = 86400) => {
        const expiryTime = Date.now() + (expiresInSeconds * 1000); // expiresInSeconds to milliseconds

        // Store the MAIN user authentication token
        sessionStorage.setItem('userAuthToken', token);
        sessionStorage.setItem('tokenExpiry', expiryTime.toString());
        sessionStorage.setItem('userInfo', JSON.stringify(user || {})); // Ensure userInfo is always stringified object

        // CRITICAL: Clear temporary OTP-related tokens after a successful main login
        sessionStorage.removeItem('currentClientCodeForOtp');
        sessionStorage.removeItem('temporaryOtpToken'); // Ensure temporary OTP token is removed

        setIsAuthenticatedState(true);
        setAuthToken(token);
        setUserInfo(user);
        // If you were using `Maps('/dashboard', { replace: true });` here, you'd need the `useNavigate` hook.
        // For now, consistent with your `logout`'s `window.location.href`, we'll assume routing is handled by other components.
    }, []);

    // Logout function: Clears all auth-related storage and state, performs hard reload
    const logout = useCallback(() => {
        // Clear all relevant sessionStorage items
        sessionStorage.removeItem('userAuthToken'); // Clear the MAIN user token
        sessionStorage.removeItem('tokenExpiry');
        sessionStorage.removeItem('userInfo');
        sessionStorage.removeItem('currentClientCodeForOtp'); // Clear OTP specific data
        sessionStorage.removeItem('temporaryOtpToken'); // Ensure temporary OTP token is also cleared

        // Reset React state immediately for fast UI feedback
        setIsAuthenticatedState(false);
        setAuthToken(null);
        setUserInfo(null);

        // Crucial for full state reset in browser environment
        window.location.href = '/'; // Performs a hard reload and navigates to the root
    }, []); // No external dependencies

    // Auto-logout if token expires while app is running
    useEffect(() => {
        // Only check if not loading (initial check done) and user is currently authenticated
        if (!isLoading && isAuthenticatedState && authToken) {
            const expiryTime = sessionStorage.getItem('tokenExpiry');
            if (expiryTime && Date.now() > parseInt(expiryTime, 10)) {
                logout(); // Triggers logout, which hard reloads
            }
        }
    }, [authToken, isLoading, isAuthenticatedState, logout]); // Depend on relevant states/functions

    const value = {
        isAuthenticated: isAuthenticatedState,
        authToken, // This is the MAIN user token
        userInfo,
        login,
        logout,
        isLoading, // Expose isLoading state
    };

    // Render a global loading indicator from AuthProvider while the initial authentication check is in progress
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70">
                <div className="spinner">
                    <div className="ball ball-1"></div>
                    <div className="ball ball-2"></div>
                    <div className="ball ball-3"></div>
                    <div className="ball ball-4"></div>
                    <div className="loading-text text-white mt-4">Loading...</div>
                </div>
                {/* Basic CSS for spinner. You might have this in your global CSS. */}
                <style>{`
                    .spinner {
                        --size: 60px;
                        width: var(--size);
                        height: var(--size);
                        position: relative;
                    }
                    .ball {
                        width: 15px;
                        height: 15px;
                        background-color: #34ab50; /* Green */
                        border-radius: 50%;
                        position: absolute;
                        animation: bounce 1.5s infinite ease-in-out;
                    }
                    .ball-1 { left: 0%; animation-delay: 0s; }
                    .ball-2 { left: 25%; animation-delay: 0.15s; }
                    .ball-3 { left: 50%; animation-delay: 0.3s; }
                    .ball-4 { left: 75%; animation-delay: 0.45s; }

                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-30px); }
                    }
                    .loading-text {
                        position: absolute;
                        top: calc(var(--size) + 10px); /* Position below spinner */
                        left: 50%;
                        transform: translateX(-50%);
                        color: white;
                        font-size: 16px;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);