// ---------------------------------------------------------------------------
// LoginPage — email/password + Google OAuth Sign-In
// ---------------------------------------------------------------------------

import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import LoadingButton from '@mui/lab/LoadingButton';
import LoginIcon from '@mui/icons-material/Login';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';
import type { LoginRequest } from '@/types/auth';
import { extractApiError } from '@/utils/errors';

export default function LoginPage() {
    const { login, googleLogin } = useAuth();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginRequest>({
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = (data: LoginRequest) => {
        login.mutate(data);
    };

    const handleGoogleSuccess = (response: CredentialResponse) => {
        if (response.credential) {
            googleLogin.mutate({ credential: response.credential });
        }
    };

    const error = login.isError ? login.error : googleLogin.isError ? googleLogin.error : null;

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 0.5 }}>
                Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
                Sign in to access your account
            </Typography>

            {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {extractApiError(error, 'Login failed. Please try again.')}
                </Alert>
            )}

            {/* Google Sign-In */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => console.error('Google Login Failed')}
                    size="large"
                    width="350"
                    text="signin_with"
                    shape="rectangular"
                    theme="outline"
                />
            </Box>

            <Divider sx={{ my: 0.5 }}>or</Divider>

            {/* Email / Password */}
            <Controller
                name="email"
                control={control}
                rules={{
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                }}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Email"
                        type="email"
                        autoComplete="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        fullWidth
                    />
                )}
            />

            <Controller
                name="password"
                control={control}
                rules={{ required: 'Password is required' }}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        fullWidth
                    />
                )}
            />

            <LoadingButton
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                loading={login.isPending || googleLogin.isPending}
                startIcon={<LoginIcon />}
                sx={{
                    py: 1.4,
                    mt: 0.5,
                    fontSize: '0.9375rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                    },
                }}
            >
                Sign In
            </LoadingButton>

            <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                Don&apos;t have an account?{' '}
                <Link
                    component={RouterLink}
                    to="/register"
                    sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                    Create account
                </Link>
            </Typography>
        </Box>
    );
}
