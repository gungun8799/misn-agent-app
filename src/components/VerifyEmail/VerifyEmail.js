import React, { useEffect } from 'react';
import { auth } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkEmailVerified = async () => {
      const user = auth.currentUser;
      await user.reload();
      if (user.emailVerified) {
        navigate('/home');
      }
    };

    const interval = setInterval(checkEmailVerified, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="verify-email-container">
      <h1>Verify your Email</h1>
      <p>
        A verification email has been sent to your email address. Please verify your email
        to proceed. This page will automatically redirect you to the home page once your email is verified.
      </p>
    </div>
  );
};

export default VerifyEmail;
